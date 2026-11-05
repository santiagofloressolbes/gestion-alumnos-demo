// Pruebas de los textos: la palabra "solicitud" en toda la app (nunca "aplicación"), los botones del aviso de conflicto
// y que ningún texto largo rompa botones ni pantalla a 320 px (el móvil más estrecho que se admite).
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async () => {
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  await t.pg.setViewportSize({ width: 320, height: 640 });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };

// Botones y enlaces cuyo texto no cabe, o pantalla con scroll horizontal.
const desbordes = pg => pg.evaluate(() => {
  const mal = [];
  if (document.documentElement.scrollWidth > window.innerWidth) mal.push('la página se desplaza en horizontal');
  for (const e of document.querySelectorAll('#app button, #app a, #app summary, #app .insignia, #app .chip')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (e.scrollWidth > e.clientWidth + 1 || r.right > window.innerWidth + 1 || r.left < -1) mal.push(`"${(e.textContent || '').trim().slice(0, 50)}" no cabe (${e.scrollWidth} > ${e.clientWidth})`);
  }
  return mal;
});

/* 1. A 320 px nada se sale, en las pantallas con los textos más largos */
{
  console.log('1. Ancho de 320 px');
  const { pg, ctx, mundo } = await entrar();
  const RUTAS = [
    ['#/', '.masters .master'], ['#/buscar', '#q'], ['#/ofertas', '#of-q'], ['#/oferta/O002', '#v-oferta .ronda'],
    ['#/oferta/O004/ronda/nueva', '#ro-fecha'], ['#/oferta/O002/ronda/2/aplicar', '#ap-q'], ['#/aplicacion/AP001', '#v-aplicacion .cabecera'],
    ['#/aplicacion/AP001/estado', '#es-estado'], ['#/alumno/A028', '#v-alumno .cabecera'], ['#/oferta/nueva', '#of-f-empresa'], ['#/ajustes', '#aj-buscar'],
  ];
  for (const [hash, sel] of RUTAS) {
    await ir(pg, hash, sel);
    const mal = await desbordes(pg);
    chk(mal.length === 0, `${hash}: nada se sale a 320 px ${mal.join(' | ')}`);
  }
  // el filtro de área de Buscar conserva sus botones cortos
  await ir(pg, '#/buscar', '#q'); await pg.click('#v-buscar summary');
  chk((await pg.$$eval('#v-buscar .opciones button', b => b.map(x => x.textContent))).join() === 'Cualquiera,Quiere ir,Experiencia', 'filtro de área: botones cortos (Cualquiera / Quiere ir / Experiencia)');
  chk(/Mirar el área…/.test(await pg.innerText('#v-buscar .filtros')) && (await pg.$$eval('#f-disp option', o => o.map(x => x.textContent))).includes('Todas'), 'filtros: "Mirar el área…" y Disponibilidad "Todas"');
  chk((await pg.$$eval('#f-disp option', o => o.map(x => x.textContent))).some(t => /Prácticas \(y quien busca ambas\)/.test(t)), 'Disponibilidad: "Prácticas (y quien busca ambas)"');
  // las pestañas siguen siendo cómodas
  const altos = await pg.$$eval('#tabs a', a => a.map(x => Math.round(x.getBoundingClientRect().height)));
  chk(altos.length === 4 && altos.every(h => h >= 44), 'las 4 pestañas miden 44 px o más: ' + altos);
  await ctx.close();
}

/* 2. El aviso de conflicto: botones nuevos, que caben y se ven enteros */
{
  console.log('2. Aviso de conflicto a 320 px');
  const t = await entrar();
  await ir(t.pg, '#/aplicacion/AP001/estado', '#es-estado');
  await t.pg.selectOption('#es-estado', 'Contratado');
  t.mundo.llamar({ key: t.mundo.clave, action: 'cambiarEstado', id: 'AP001', estado: 'Descartado', motivo: 'Otro', fecha: '2026-10-30', nota: 'otra persona', anterior: { estado: 'Entrevista', motivo: '' } });
  await t.pg.click('#v-estado-form form button[type=submit]'); await t.pg.waitForSelector('#v-estado-form .conflicto:not([hidden])');
  const textos = await t.pg.$$eval('#v-estado-form .conflicto button', b => b.map(x => x.textContent));
  chk(textos.join('|') === 'Guardar mi versión|Quedarme con la del Sheet', 'botones del conflicto: ' + textos);
  chk(/Esta solicitud ha cambiado mientras la editabas/.test(await t.pg.innerText('#v-estado-form .conflicto')), 'título del conflicto de la solicitud');
  const alturas = await t.pg.$$eval('#v-estado-form .conflicto button', b => b.map(x => Math.round(x.getBoundingClientRect().height)));
  chk(alturas.every(h => h >= 44), 'los botones del conflicto miden 44 px o más: ' + alturas);
  const mal = await desbordes(t.pg);
  chk(mal.length === 0, 'con el aviso de conflicto abierto nada se sale: ' + mal.join(' | '));
  await t.ctx.close();
}

/* 3. "Solicitud" en toda la app: no queda "aplicación" ni los textos retirados */
{
  console.log('3. Vocabulario');
  const { pg, ctx } = await entrar();
  const PROHIBIDO = /aplicaci[oó]n|aplicaciones|aplic[oó]\b|apuntad|difusi[oó]n|el m[ií]o|Alguien|figura como|Será la ronda/i;
  const RUTAS = [
    ['#/', '.masters .master'], ['#/ofertas', '#of-q'], ['#/oferta/O002', '#v-oferta .ronda'], ['#/oferta/O004/ronda/nueva', '#ro-fecha'],
    ['#/oferta/O002/ronda/2/aplicar', '#ap-q'], ['#/aplicacion/AP001', '#v-aplicacion .cabecera'], ['#/aplicacion/AP001/estado', '#es-estado'],
    ['#/alumno/A028', '#v-alumno .cabecera'], ['#/ajustes', '#aj-buscar'], ['#/oferta/O004/editar', '#of-f-empresa'],
  ];
  for (const [hash, sel] of RUTAS) {
    await ir(pg, hash, sel);
    const texto = await pg.innerText('#app');
    const m = PROHIBIDO.exec(texto);
    chk(!m, `${hash}: sin textos retirados${m ? ' → "' + m[0] + '"' : ''}`);
  }
  await ir(pg, '#/oferta/O002', '#v-oferta .ronda');
  chk(/solicitudes/.test(await pg.innerText('#v-oferta .ronda')) && /Añadir solicitud/.test(await pg.innerText('#v-oferta')) && /Registrar nueva ronda/.test(await pg.innerText('#v-oferta')), 'ficha de la oferta: "solicitudes", "Añadir solicitud", "Registrar nueva ronda"');
  await ir(pg, '#/oferta/O004/ronda/nueva', '#ro-fecha');
  chk(await pg.innerText('#ro-numero') === 'Vas a registrar la ronda 1 (el primer envío de esta oferta a los alumnos).', 'ronda 1: texto aprobado: ' + await pg.innerText('#ro-numero'));
  await ir(pg, '#/oferta/O002/ronda/2/aplicar', '#ap-q');
  chk(/Fecha de la solicitud/.test(await pg.innerText('#v-aplicacion-form')), 'formulario de solicitud: "Fecha de la solicitud"');
  await ir(pg, '#/aplicacion/AP001', '#v-aplicacion .cabecera');
  chk(/La solicitud/.test(await pg.innerText('#v-aplicacion')) && /Solicitada el/.test(await pg.innerText('#v-aplicacion')) && /Número de solicitud/.test(await pg.innerText('#v-aplicacion')), 'detalle: "La solicitud", "Solicitada el", "Número de solicitud"');
  await ctx.close();
}

/* 4. Avisos de la demo y legal */
{
  console.log('4. Aviso de demostración');
  const t = await nuevo();
  await t.pg.addInitScript(() => localStorage.setItem('gad.modo', 'demo'));
  await t.pg.setViewportSize({ width: 320, height: 640 });
  await ir(t.pg, '#/', '.masters .master');
  chk(/Son datos de ejemplo y no se guarda nada\. Conectar con el Sheet/.test(await t.pg.innerText('#demo')), 'franja de la demo: ' + await t.pg.innerText('#demo'));
  chk(await t.pg.innerText('#legal') === 'Proyecto personal de demostración. Todos los datos son ficticios. No afiliado a LaLiga ni a LaLiga Business School.', 'aviso legal con "Todos los datos son ficticios" y "No afiliado"');
  const mal = await desbordes(t.pg);
  chk(mal.length === 0, 'la franja de la demo cabe a 320 px: ' + mal.join(' | '));
  await t.ctx.close();
}

await terminar();
