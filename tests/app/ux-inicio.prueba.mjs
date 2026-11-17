// v27, parte A: estructura. Inicio (programas arriba, MBA primero, Avisos debajo), aviso de programa no reconocido (no se silencia, sale aunque no haya rondas),
// avisos de DATOS y de SEGUIMIENTO bien distintos (forma, palabra y color; contraste ≥ 4,5) y flecha de volver fija al hacer scroll.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const HOY = '2026-11-12T12:00:00';
const entrar = async ({ alumnos, script = false, alResponder, ancho = 390, alto = 800 } = {}) => {
  const t = await nuevo();
  await t.ctx.clock.setFixedTime(HOY);
  await t.pg.addInitScript(([s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    sessionStorage.setItem('ini', '1');
  }, [script, URL_OK, CLAVE_PRUEBA]);
  if (alumnos) await t.pg.route('**/datos-mock/Alumnos.csv*', async r => { const res = await r.fetch(); await r.fulfill({ response: res, body: alumnos(await res.text()) }); });
  if (alResponder) t.ctrl.alResponder = alResponder;
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); };
const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);
// Contraste real entre el color del texto de un elemento y el fondo que tenga (o el de su primer antepasado con fondo).
const contraste = (pg, sel) => pg.evaluate(s => {
  const e = document.querySelector(s);
  const rgb = t => (t.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let f = e; let bg = [0, 0, 0, 0];
  while (f) { bg = rgb(getComputedStyle(f).backgroundColor); if (bg.length < 4 || bg[3] > 0) break; f = f.parentElement; }
  const t = lum(rgb(getComputedStyle(e).color)), b = lum(bg);
  return (Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05);
}, sel);
const sinErrores = (log, t) => chk(log.consola.length === 0, t + (log.consola.length ? ' → ' + log.consola.join(' | ') : ''));
const RARO = t => t.replaceAll('MBA en español', 'Programa que ya no existe');
// Script sin hojas de rondas, y (si raro) con un alumno en un programa que no está en Listas.
const sinRondas = (raro = true) => j => {
  if (!j.alumnos) return j;
  const { rondas, aplicaciones, historial, ...resto } = j;
  if (raro) {
    const i = resto.alumnos.cabecera.findIndex(h => /^(Programa|Máster)$/i.test(h));
    resto.alumnos = { ...resto.alumnos, filas: resto.alumnos.filas.map((f, k) => (k === 0 ? f.map((x, c) => (c === i ? 'Programa que ya no existe' : x)) : f)) };
  }
  return resto;
};

console.log('1. Inicio: programas arriba, MBA primero, Avisos debajo');
{
  const { pg, ctx, log } = await entrar();
  await ir(pg, '#/', '.masters .master'); await pg.waitForSelector('#in-avisos:not([hidden])');
  const o = await pg.evaluate(() => {
    const g = document.querySelector('#grupos'), a = document.querySelector('#in-avisos');
    return { avisosDespues: !!(g.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING), primera: document.querySelector('details.grupo-programas').dataset.categoria, abierta: document.querySelector('details.grupo-programas').open,
      yGrupos: g.getBoundingClientRect().top, yAvisos: a.getBoundingClientRect().top, cats: [...document.querySelectorAll('details.grupo-programas')].map(d => d.dataset.categoria) };
  });
  chk(o.avisosDespues && o.yGrupos < o.yAvisos, 'la tarjeta de Avisos va DEBAJO de los programas');
  chk(o.primera === 'MBA' && o.abierta, 'MBA es la primera sección y está abierta');
  chk(JSON.stringify(o.cats) === JSON.stringify(['MBA', 'Másteres', 'LaLiga Executive Education', 'Formación para Jugadores']), 'el resto, en el orden de Listas: ' + o.cats.join(' · '));
  chk(await pg.$$eval('details.grupo-programas', d => d.every(x => x.classList.contains('desplegable'))), 'siguen siendo secciones colapsables');
  chk(!(await visible(pg, '#in-av-datos')), 'sin programa raro no hay aviso de datos');
  chk(await visible(pg, '#in-av-seguimiento'), 'el bloque de seguimiento está');
  sinErrores(log, 'sin errores en la consola');
  await ctx.close();
}

console.log('2. Programa no reconocido: aviso de datos, no se silencia, el alumno sigue en «Otros programas»');
{
  const { pg, ctx, log } = await entrar({ alumnos: RARO });
  await ir(pg, '#/', '.masters .master'); await pg.waitForSelector('#in-av-datos');
  const txt = await pg.textContent('#in-av-datos');   // textContent: la etiqueta se ve en mayúsculas por el CSS
  chk(/Datos/.test(txt) && /Programa «Programa que ya no existe» \(8 alumnos\) fuera de la lista de programas/.test(txt), 'el aviso dice qué programa y cuántos alumnos: ' + txt.replace(/\n/g, ' ').slice(0, 120));
  chk(await pg.$$eval('#in-av-datos button, #in-av-datos [data-aviso]', e => e.length) === 0 && !/Silenciar/.test(txt), 'no hay botón de silenciar');
  chk(/no se puede silenciar/i.test(txt), 'y lo dice');
  await pg.evaluate(() => localStorage.setItem('gad.silencios', JSON.stringify(Object.fromEntries(['A001', 'A002', 'A003', 'A004', 'A005', 'A006', 'A007', 'A008', 'A009', 'A010'].flatMap(id => [[id + '|sin-solicitudes', '2099-01-01'], [id + '|aplica-a-todo', '2099-01-01']])))));
  await ir(pg, '#/ajustes', '#v-ajustes'); await ir(pg, '#/', '#in-av-datos');
  chk(await visible(pg, '#in-av-datos'), 'aunque se silencien avisos de seguimiento, el de datos sigue');
  const otros = await pg.$$eval('details[data-categoria="Otros programas"] .master b', b => b.map(x => x.textContent));
  chk(otros.join() === 'Programa que ya no existe', 'el alumno sigue encontrándose en «Otros programas»');
  await pg.evaluate(() => { document.querySelector('details[data-categoria="Otros programas"]').open = false; });
  await pg.click('#in-av-datos-ver');
  chk(await pg.evaluate(() => document.querySelector('details[data-categoria="Otros programas"]').open), 'el enlace del aviso abre «Otros programas»');
  chk(await pg.evaluate(() => { const r = document.querySelector('details[data-categoria="Otros programas"]').getBoundingClientRect(), m = document.querySelector('#main').getBoundingClientRect(); return r.top >= m.top - 1 && r.top < m.bottom; }), 'y lo deja a la vista');
  chk(['', '#/'].includes(await pg.evaluate(() => location.hash)), 'sin cambiar de pantalla');
  await pg.click('details[data-categoria="Otros programas"] .master'); await pg.waitForSelector('#ma-fuera-de-lista');
  chk(/Datos:/.test(await pg.textContent('#ma-fuera-de-lista')) && await pg.$('#ma-fuera-de-lista svg.icono-aviso.datos') !== null, 'la lista del programa lleva la misma señal de «datos» (palabra e icono)');
  sinErrores(log, 'sin errores en la consola');
  await ctx.close();
}

console.log('3. El aviso de datos sale aunque no haya rondas; sin nada que avisar, la tarjeta no sale');
{
  const { pg, ctx } = await entrar({ script: true, alResponder: sinRondas(true) });
  await ir(pg, '#/', '.masters .master'); await pg.waitForSelector('#in-av-datos');
  chk(await visible(pg, '#in-avisos') && await visible(pg, '#in-av-datos'), 'sin rondas y con programa raro: la tarjeta sale con el aviso de datos');
  chk(!(await visible(pg, '#in-av-seguimiento')), 'pero sin el bloque de seguimiento (no hay rondas)');
  await ctx.close();
}
{
  const { pg, ctx } = await entrar({ script: true, alResponder: sinRondas(false) });
  await ir(pg, '#/', '.masters .master'); await pg.waitForTimeout(500);
  chk(!(await visible(pg, '#in-avisos')), 'sin rondas y sin programa raro: no hay tarjeta de avisos');
  await ctx.close();
}

console.log('4. Datos y seguimiento se distinguen: forma, palabra y color; contraste ≥ 4,5');
{
  const { pg, ctx } = await entrar({ alumnos: RARO });
  await ir(pg, '#/', '#in-av-datos'); await pg.waitForSelector('#in-av-seguimiento');
  const x = await pg.evaluate(() => {
    const d = document.querySelector('#in-av-datos'), s = document.querySelector('#in-av-seguimiento'), c = document.querySelector('#in-avisos');
    const id = d.querySelector('svg.icono-aviso'), is = s.querySelector('svg.icono-aviso');
    const root = getComputedStyle(document.documentElement);
    return { palabraD: d.querySelector('.etiqueta-tipo').textContent.trim(), palabraS: s.querySelector('.etiqueta-tipo').textContent.trim(),
      claseD: id.getAttribute('class'), claseS: is.getAttribute('class'), pathD: id.querySelector('path').getAttribute('d'), pathS: is.querySelector('path').getAttribute('d'),
      fondoD: getComputedStyle(d).backgroundColor, fondoS: getComputedStyle(s).backgroundColor, bordeCard: getComputedStyle(c).borderTopColor, seg: root.getPropertyValue('--seg').trim(), bordeS: getComputedStyle(s).borderLeftColor };
  });
  chk(x.palabraD === 'Datos' && x.palabraS === 'Seguimiento', 'cada tipo lleva su palabra: ' + x.palabraD + ' / ' + x.palabraS);
  chk(x.claseD !== x.claseS && x.pathD !== x.pathS, 'y su icono, de otra forma (triángulo / reloj)');
  chk(x.fondoD !== x.fondoS, 'datos va relleno de color y seguimiento no: ' + x.fondoD + ' / ' + x.fondoS);
  chk(x.bordeS === 'rgb(255, 159, 67)' && x.bordeCard === 'rgb(255, 159, 67)' && x.seg.toUpperCase() === '#FF9F43', 'seguimiento usa la variable --seg (naranja)');
  chk(x.fondoD === 'rgb(214, 59, 69)', 'datos usa el rojo de acento --act-bg');
  const c1 = await contraste(pg, '#in-av-datos'), c2 = await contraste(pg, '#in-av-seguimiento .etiqueta-tipo'), c3 = await contraste(pg, '#in-av-datos-ver'), c4 = await contraste(pg, '#in-av-datos .aviso-datos-nota');
  chk(c1 >= 4.5 && c3 >= 4.5 && c4 >= 4.5, `datos: texto blanco sobre rojo ${c1.toFixed(2)}:1, enlace ${c3.toFixed(2)}:1, nota ${c4.toFixed(2)}:1`);
  chk(c2 >= 4.5, `seguimiento: naranja sobre la tarjeta ${c2.toFixed(2)}:1`);
  // Para quien no distingue bien los colores: el naranja y el rojo también difieren en luminosidad, no solo en el tono.
  const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const a = L([255, 159, 67]), b = L([214, 59, 69]);
  chk((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 1.8, 'naranja y rojo difieren también en luminosidad, no solo en el tono');
  await ctx.close();
}

console.log('5. La flecha de volver queda fija al hacer scroll');
{
  const { pg, ctx, log } = await entrar();
  const rutas = [
    ['#/master/' + encodeURIComponent('MBA en inglés'), '#v-master .alumno'],
    ['#/alumno/A001', '#v-alumno .cabecera'],
    ['#/avisos/sin-solicitudes', '#v-avisos .aviso-item'],
    ['#/alumno/A001/compartir', '#v-compartir .vista-previa'],
    ['#/cv/A001', '#v-cv .cv-bloque'],
    ['#/oferta/O001', '#v-oferta .cabecera-oferta'],
    ['#/oferta/nueva', '#v-oferta-form .volver'],
    ['#/oferta/O001/editar', '#v-oferta-form .volver'],
    ['#/oferta/O001/ronda/nueva', '#v-ronda-form .volver'],
  ];
  for (const [hash, sel] of rutas) {
    await ir(pg, hash, sel); await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => {
      const v = document.querySelector('.view.on .volver'), m = document.querySelector('#main');
      if (!v) return null;
      m.scrollTop = m.scrollHeight;
      const rv = v.getBoundingClientRect(), rm = m.getBoundingClientRect();
      const e = document.elementFromPoint(rv.left + 20, rv.top + rv.height / 2);
      return { pos: getComputedStyle(v).position, z: +getComputedStyle(v).zIndex || 0, scroll: m.scrollTop, arriba: Math.abs(rv.top - rm.top) <= 1, alto: rv.height, encima: e === v || v.contains(e), opaco: getComputedStyle(v).backgroundColor !== 'rgba(0, 0, 0, 0)' };
    });
    chk(r && r.pos === 'sticky' && r.opaco && r.alto >= 44 && r.z >= 1, `${hash}: la flecha es fija, con fondo, por encima del contenido y de ≥ 44 px`);
    if (r && r.scroll > 50) chk(r.arriba && r.encima, `${hash}: tras bajar ${r.scroll} px la flecha sigue arriba y se puede tocar`);
  }
  chk(await pg.evaluate(() => document.querySelector('header').getBoundingClientRect().height <= 56), 'la cabecera es compacta (≤ 56 px)');
  await ir(pg, '#/alumno/A001', '#v-alumno .cabecera'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const m = document.querySelector('#main'); m.scrollTop = m.scrollHeight; });
  await pg.click('#v-alumno .volver'); await pg.waitForSelector('#v-master .alumno');
  chk(/#\/master\//.test(await pg.evaluate(() => location.hash)), 'tocar la flecha desde abajo del todo vuelve a la lista del programa');
  sinErrores(log, 'sin errores en la consola');
  await ctx.close();
}
{
  const { pg, ctx } = await entrar({ ancho: 320, alto: 640 });
  await ir(pg, '#/alumno/A001', '#v-alumno .cabecera'); await pg.waitForTimeout(300);
  chk(await pg.evaluate(() => { const m = document.querySelector('#main'); m.scrollTop = 400; const v = document.querySelector('#v-alumno .volver').getBoundingClientRect(), r = m.getBoundingClientRect(); return Math.abs(v.top - r.top) <= 1 && document.documentElement.scrollWidth <= innerWidth && m.scrollWidth <= m.clientWidth; }), 'a 320 px: la flecha fija y sin scroll lateral');
  await ctx.close();
}

await terminar();
