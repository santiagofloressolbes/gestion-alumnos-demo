// v27, parte C (13): sin zoom, zonas seguras del iPhone (muesca, barra de inicio y laterales), errores y estados vacíos con texto claro.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async ({ ancho = 390, alto = 800, script = false, modo = 'normal' } = {}) => {
  const t = await nuevo({ modo });
  await t.ctx.clock.setFixedTime('2026-11-12T12:00:00');
  await t.pg.addInitScript(([s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    sessionStorage.setItem('ini', '1');
  }, [script, URL_OK, CLAVE_PRUEBA]);
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); await pg.waitForTimeout(600); };
const sinErrores = (log, t) => chk(log.consola.length === 0, t + (log.consola.length ? ' → ' + log.consola.join(' | ') : ''));


console.log('13b. Sin zoom');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/buscar', '#v-buscar input');
  const z = await pg.evaluate(() => {
    const meta = document.querySelector('meta[name=viewport]').content;
    const evs = ['gesturestart', 'gesturechange', 'gestureend'].map(t => { const e = new Event(t, { cancelable: true, bubbles: true }); document.dispatchEvent(e); return e.defaultPrevented; });
    return { meta, evs, touch: getComputedStyle(document.body).touchAction, boton: getComputedStyle(document.querySelector('#tabs a')).touchAction, campo: parseFloat(getComputedStyle(document.querySelector('#v-buscar input')).fontSize), texto: getComputedStyle(document.documentElement).webkitTextSizeAdjust || getComputedStyle(document.body).getPropertyValue('-webkit-text-size-adjust') };
  });
  chk(/width=device-width/.test(z.meta) && /initial-scale=1/.test(z.meta) && /viewport-fit=cover/.test(z.meta), 'viewport: ancho del dispositivo, escala 1 y viewport-fit=cover: ' + z.meta);
  chk(z.evs.every(Boolean), 'los gestos de pellizco (gesturestart/change/end) se cancelan');
  chk(z.touch === 'manipulation' && z.boton === 'manipulation', 'touch-action: manipulation (sin zoom por doble toque)');
  chk(z.campo >= 16, 'el campo de búsqueda es de ' + z.campo + ' px (≥ 16)');
  await ctx.close();
}

console.log('13c. Zonas seguras del iPhone (se simulan: muesca 47 px, barra de inicio 34 px, laterales 44 px)');
{
  const { pg, ctx } = await entrar({ ancho: 390, alto: 844 });
  await ir(pg, '#/alumno/A001', '#v-alumno .cabecera');
  await pg.evaluate(() => { const s = document.documentElement.style; s.setProperty('--sat', '47px'); s.setProperty('--sab', '34px'); s.setProperty('--sal', '44px'); s.setProperty('--sar', '44px'); });
  await pg.waitForTimeout(200);
  const x = await pg.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect(), cs = s => getComputedStyle(document.querySelector(s));
    const m = document.querySelector('#main'); m.scrollTop = m.scrollHeight;
    const pie = r('#legal'), tabs = r('#tabs'), main = r('#main'), h1 = r('#titulo'), app = r('#app'), ultimoTab = r('#tabs a:last-child'), volver = r('#v-alumno .volver');
    const centro = document.elementFromPoint(pie.left + pie.width / 2, pie.top + pie.height / 2);
    return { h1Top: h1.top, tabsH: tabs.height, tabsPad: parseFloat(cs('#tabs').paddingBottom), tabsBottom: tabs.bottom, alto: innerHeight, appIzq: parseFloat(cs('#app').paddingLeft), appDer: parseFloat(cs('#app').paddingRight), pieBottom: pie.bottom, mainBottom: main.bottom, tabsTop: tabs.top,
      pieVisible: centro === document.querySelector('#legal') || document.querySelector('#legal').contains(centro), ultimoBottom: ultimoTab.bottom, h1Izq: h1.left, volverTop: volver.top - main.top, tabsIzq: tabs.left };
  });
  chk(x.h1Top >= 47, `la cabecera empieza por debajo de la muesca (título a ${Math.round(x.h1Top)} px ≥ 47)`);
  chk(x.tabsPad >= 34 && x.tabsBottom === x.alto, `la barra inferior llega al borde y deja ${x.tabsPad} px bajo los iconos (≥ 34, la barra de inicio)`);
  chk(x.ultimoBottom <= x.alto - 34 + 1, `el último icono de la barra queda por encima de la barra de inicio (${Math.round(x.ultimoBottom)} ≤ ${x.alto - 34})`);
  chk(x.appIzq === 44 && x.appDer === 44 && x.h1Izq >= 44, 'los laterales respetan 44 px (modo horizontal)');
  chk(x.pieVisible && x.pieBottom <= x.tabsTop + 1, 'al bajar del todo, el aviso legal se ve entero y queda por encima de la barra inferior');
  chk(Math.abs(x.mainBottom - x.tabsTop) <= 1, 'el contenido termina justo donde empieza la barra (nada queda debajo)');
  chk(x.volverTop <= 1, 'la flecha de volver sigue pegada arriba también con la muesca');
  // «Hay una versión nueva»: sobre la barra, no debajo
  await pg.evaluate(() => { document.querySelector('#upd').hidden = false; });
  const u = await pg.evaluate(() => { const u = document.querySelector('#upd').getBoundingClientRect(), t = document.querySelector('#tabs').getBoundingClientRect(); return { abajo: u.bottom, tabs: t.top }; });
  chk(u.abajo <= u.tabs + 1, `el aviso de versión nueva queda encima de la barra (${Math.round(u.abajo)} ≤ ${Math.round(u.tabs)})`);
  // aviso flotante: bajo la muesca
  await pg.evaluate(() => { const p = document.createElement('p'); p.className = 'flotante'; p.id = 'prueba-flot'; p.textContent = 'Copiado.'; document.querySelector('#app').append(p); });
  chk((await pg.evaluate(() => document.querySelector('#prueba-flot').getBoundingClientRect().top)) >= 47, 'el aviso flotante sale por debajo de la muesca');
  await ctx.close();
}

console.log('13d. Errores con texto claro (sin conexión con Google)');
{
  const { pg, ctx } = await entrar({ script: true, modo: 'caido' });
  const rutas = [['#/', '#v-inicio'], ['#/master/MBA%20en%20ingl%C3%A9s', '#v-master'], ['#/alumno/A001', '#v-alumno'], ['#/ofertas', '#v-ofertas'], ['#/oferta/O001', '#v-oferta'], ['#/avisos/sin-solicitudes', '#v-avisos'], ['#/alumno/A001/compartir', '#v-compartir'], ['#/aplicacion/AP001', '#v-aplicacion']];
  for (const [r, v] of rutas) {
    await pg.goto(BASE + r); await pg.waitForSelector(v + ' .card h2', { timeout: 20000 }); await pg.waitForTimeout(300);
    const e = await pg.evaluate(vista => {
      const raiz = document.querySelector(vista), h = raiz.querySelector('.card h2'), b = [...raiz.querySelectorAll('button.primary')].find(x => /Reintentar/.test(x.textContent));
      return { titulo: h.textContent, texto: raiz.innerText, reintentar: !!b, alto: b ? b.getBoundingClientRect().height : 0, cambiar: !!raiz.querySelector('a[href="#/acceso"]'), volver: !!raiz.querySelector('.volver') };
    }, v);
    chk(/No se han podido cargar los datos|La clave guardada ya no vale/.test(e.titulo), `${r}: el error tiene título claro («${e.titulo}»)`);
    chk(!/undefined|\[object|null|NaN|TypeError|Failed to fetch/.test(e.texto), `${r}: el error no enseña palabras técnicas`);
    chk(e.reintentar && e.alto >= 44 && e.cambiar, `${r}: hay «Reintentar» (≥ 44 px) y «Cambiar el acceso»`);
    if (r !== '#/' && r !== '#/ofertas') chk(e.volver, `${r}: y se puede volver`);
  }
  await ctx.close();
}

console.log('13e. Estados vacíos con texto claro');
{
  const { pg, ctx } = await entrar();
  const texto = async sel => (await pg.innerText(sel)).replace(/\s+/g, ' ');
  await ir(pg, '#/buscar', '#v-buscar input');
  await pg.fill('#v-buscar input[type=search], #v-buscar input[type=text]', 'zzzzzzzz'); await pg.waitForTimeout(400);
  chk(/Ningún alumno coincide/.test(await texto('#v-buscar')) && /Prueba con menos palabras o quita algún filtro/.test(await texto('#v-buscar')), 'Buscar sin resultados: dice qué hacer');
  chk(await pg.isVisible('#v-buscar button:has-text("Quitar búsqueda y filtros")'), 'y ofrece «Quitar búsqueda y filtros»');
  await pg.goto(BASE + '#/master/Global%20Players%20Program'); await pg.waitForSelector('#v-master .card .sub');
  chk(/Este programa todavía no tiene alumnos\./.test(await texto('#v-master')), 'Programa sin alumnos: lo dice');
  await pg.goto(BASE + '#/alumno/A001/compartir'); await pg.waitForSelector('#v-compartir .vista-previa');
  await pg.evaluate(() => document.querySelectorAll('#v-compartir .elegir-cp input').forEach(i => { if (i.id.startsWith('cp-al-')) { i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); } }));
  chk(/\(No hay ningún alumno marcado\.\)/.test(await texto('#cp-vista')) && await pg.isDisabled('#cp-copiar'), 'Compartir sin nadie marcado: lo dice y «Copiar» queda desactivado');
  await pg.goto(BASE + '#/oferta/O005/compartir'); await pg.waitForSelector('#cp-nadie');
  chk(/No hay alumnos elegidos/.test(await texto('#cp-nadie')) && await pg.isVisible('#cp-nadie a.secondary'), 'Compartir desde la oferta sin elegir: dice cómo hacerlo y ofrece volver');
  await pg.goto(BASE + '#/oferta/O005'); await pg.waitForSelector('#match-alumnos .grupo-match');
  await pg.evaluate(() => document.querySelectorAll('#match-alumnos .grupo-match').forEach(d => { d.open = true; }));
  chk(/Ningún alumno en este grupo\./.test(await texto('#match-alumnos .grupo-match[data-grupo=encaja]')), 'Match: un grupo vacío dice «Ningún alumno en este grupo.»');
  await pg.goto(BASE + '#/avisos/aplica-a-todo'); await pg.waitForSelector('#av-nadie');
  chk(/Ningún alumno tiene este aviso ahora mismo\./.test(await texto('#av-nadie')), 'Avisos: sin alumnos, lo dice');
  await pg.goto(BASE + '#/alumno/NOEXISTE'); await pg.waitForSelector('#v-alumno .card h2');
  chk(/Alumno no encontrado/.test(await texto('#v-alumno')) && await pg.isVisible('#v-alumno .volver'), 'Un alumno que no existe: lo dice y se puede volver');
  await pg.goto(BASE + '#/oferta/NOEXISTE'); await pg.waitForSelector('#v-oferta .card h2');
  chk(/no encontrada/i.test(await texto('#v-oferta')) && await pg.isVisible('#v-oferta .volver'), 'Una oferta que no existe: lo dice y se puede volver');
  await ctx.close();
}

await terminar();
