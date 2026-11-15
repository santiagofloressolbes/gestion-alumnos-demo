// Pruebas de que ninguna pantalla enseña «false», «true», «null», «undefined» ni «NaN» como texto (v24).
// Causa del fallo que hubo: replaceChildren, a pelo, escribe un `false` como la palabra «false». La app usa siempre reemplazar() (js/util/dom.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const hay = d => fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? hay(d + '/' + e.name) : [d + '/' + e.name]));

console.log('1. El código: nadie usa replaceChildren a pelo');
{
  const fuera = hay('js').filter(f => f.endsWith('.js') && f !== 'js/util/dom.js').filter(f => /\.replaceChildren\(/.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
  chk(fuera.length === 0, 'ningún archivo de js/ (salvo dom.js) llama a .replaceChildren( → ' + fuera.join(', '));
  chk(/export function reemplazar\(/.test(fs.readFileSync(path.join(RAIZ, 'js/util/dom.js'), 'utf8')), 'dom.js ofrece reemplazar()');
}

const PALABRAS = ['false', 'true', 'null', 'undefined', 'nan', '[object object]'];
// Los textos sueltos de #main (visibles o dentro de un desplegable cerrado) que son una de esas palabras, y lo que hay junto a «volver».
const basura = pg => pg.evaluate(p => {
  const out = [];
  const w = document.createTreeWalker(document.querySelector('#main'), NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.textContent.trim().toLowerCase();
    if (p.includes(t)) out.push(`«${n.textContent.trim()}» dentro de <${n.parentElement.tagName.toLowerCase()}>`);
  }
  for (const l of document.querySelectorAll('#main .volver')) {
    let s = l.nextSibling;
    while (s && s.nodeType === 3) { if (s.textContent.trim()) out.push('texto suelto junto a «volver»: ' + s.textContent.trim()); s = s.nextSibling; }
  }
  return out;
}, PALABRAS);
const listo = async pg => { await pg.waitForFunction(() => document.querySelector('#main') && !/Cargando/.test(document.querySelector('#main').innerText) && document.querySelector('#main').innerText.trim().length > 0, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(250); };

const programas = ['Transformación Digital e IA en el Deporte', 'Marketing Deportivo / Global Sports Marketing', 'Derecho especializado en Sports & Entertainment', 'Dirección, Metodología y Análisis en el Fútbol', 'Organización de Eventos Deportivos', 'MBA en español', 'MBA en inglés',
  'IA Aplicada a la Industria Deportiva', 'IA Aplicada a la Industria Deportiva – LALIGA & Grupo Baskonia-Alavés', 'Gestión Integral de la Seguridad en Estadios y Grandes Eventos', 'Venta y Activación de Patrocinios en el Deporte', 'Liderazgo Ejecutivo en la Industria del Deporte', 'MBA Sports Management', 'Global Players Program'];
const RUTAS = [
  '#/', ...programas.map(p => '#/master/' + encodeURIComponent(p)), '#/master/Inventado',
  '#/alumno/A001', '#/alumno/A017', '#/alumno/ZZZ', '#/cv/A001', '#/alumno/A001/compartir', '#/oferta/O002/compartir',
  '#/buscar', '#/ofertas', '#/oferta/O002', '#/oferta/ZZZ', '#/oferta/nueva', '#/oferta/O002/editar',
  '#/oferta/O002/ronda/nueva', '#/oferta/O002/ronda/1/aplicar', '#/aplicacion/AP001', '#/aplicacion/AP001/correo', '#/aplicacion/AP001/estado', '#/aplicacion/ZZZ/correo',
  '#/avisos/sin-solicitudes', '#/avisos/aplica-a-todo', '#/ajustes',
];

console.log('2. Las pantallas (conectado al script de prueba)');
{
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); localStorage.setItem('gad.firma', 'Ana Pérez'); localStorage.setItem('gad.ajustes', '["conexion","avisos","firma","version"]'); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  const { pg, ctx, log } = t;
  await pg.goto(BASE + '#/'); await listo(pg);
  let n = 0;
  for (const r of RUTAS) {
    await pg.goto(BASE + r); await listo(pg);
    const b = await basura(pg);
    n++;
    chk(b.length === 0, `${decodeURIComponent(r)}: sin palabras sueltas` + (b.length ? ' → ' + b.join(' | ') : ''));
  }
  chk(n === RUTAS.length, `se miraron ${n} pantallas`);
  chk(log.consola.length === 0, 'sin errores en la consola' + (log.consola.length ? ' → ' + log.consola.join(' | ') : ''));
  await ctx.close();
}

console.log('3. Sin conexión guardada (Acceso) y con un programa que no está en la lista');
{
  const t = await nuevo();
  const { pg, ctx } = t;
  await pg.goto(BASE + '#/acceso'); await listo(pg);
  const b = await basura(pg);
  chk(b.length === 0, 'Acceso: sin palabras sueltas' + (b.length ? ' → ' + b.join(' | ') : ''));
  await ctx.close();
}
{
  const t = await nuevo();
  await t.pg.addInitScript(() => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.modo', 'demo'); sessionStorage.setItem('ini', '1'); } });
  await t.pg.route('**/datos-mock/Alumnos.csv*', async r => { const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replaceAll('MBA en español', 'Programa que ya no existe') }); });
  for (const r of ['#/', '#/master/' + encodeURIComponent('Programa que ya no existe'), '#/alumno/A009']) {
    await t.pg.goto(BASE + r); await listo(t.pg);
    const b = await basura(t.pg);
    chk(b.length === 0, `${decodeURIComponent(r)} (con un programa desconocido): sin palabras sueltas` + (b.length ? ' → ' + b.join(' | ') : ''));
  }
  await t.ctx.close();
}

console.log('4. reemplazar() ignora lo que no es contenido');
{
  const t = await nuevo();
  await t.pg.addInitScript(() => { localStorage.setItem('gad.modo', 'demo'); });
  await t.pg.goto(BASE); await t.pg.waitForSelector('#main');
  const r = await t.pg.evaluate(async () => {
    const { el, reemplazar } = await import('/js/util/dom.js');
    const c = document.createElement('div');
    reemplazar(c, false, null, undefined, true, '', [false, [el('b', {}, 'uno')]], 'texto', 0, el('i', {}, 'dos'));
    return { html: c.innerHTML, texto: c.textContent };
  });
  chk(r.texto === 'uno' + 'texto' + '0' + 'dos', 'solo quedan los hijos de verdad (también un 0): ' + JSON.stringify(r.texto));
  chk(!/false|null|undefined|true/.test(r.html), 'ni «false», ni «null», ni «undefined», ni «true» en el HTML');
  await t.ctx.close();
}

await terminar();
