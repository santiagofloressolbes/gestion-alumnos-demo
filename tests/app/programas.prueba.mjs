// Pruebas de los programas reales en Inicio (modo demo): cada programa de la hoja Listas aparece, también con 0 alumnos;
// las 4 secciones usan el desplegable común y recuerdan su estado; un programa desconocido o una hoja sin categorías no rompen la app.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const PROGRAMAS = {
  'MBA': ['MBA en español', 'MBA en inglés'],
  'Másteres': ['Transformación Digital e IA en el Deporte', 'Marketing Deportivo / Global Sports Marketing', 'Derecho especializado en Sports & Entertainment', 'Dirección, Metodología y Análisis en el Fútbol', 'Organización de Eventos Deportivos'],
  'LaLiga Executive Education': ['IA Aplicada a la Industria Deportiva', 'IA Aplicada a la Industria Deportiva – LALIGA & Grupo Baskonia-Alavés', 'Gestión Integral de la Seguridad en Estadios y Grandes Eventos', 'Venta y Activación de Patrocinios en el Deporte', 'Liderazgo Ejecutivo en la Industria del Deporte'],
  'Formación para Jugadores': ['MBA Sports Management', 'Global Players Program'],
};
const TODOS = Object.values(PROGRAMAS).flat();

const entrar = async ({ alumnos, listas, almacenInicial = '', script = false } = {}) => {
  const t = await nuevo();
  await t.pg.addInitScript(([a, s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    if (a) localStorage.setItem('gad.inicio', a);
    sessionStorage.setItem('ini', '1');
  }, [almacenInicial, script, URL_OK, CLAVE_PRUEBA]);
  const cambiar = (patron, f) => t.pg.route(patron, async r => { const res = await r.fetch(); await r.fulfill({ response: res, body: f(await res.text()) }); });
  if (alumnos) await cambiar('**/datos-mock/Alumnos.csv*', alumnos);
  if (listas) await cambiar('**/datos-mock/Listas.csv*', listas);
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); };
const abrirTodo = pg => pg.evaluate(() => document.querySelectorAll('details.grupo-programas').forEach(d => { d.open = true; }));
const secciones = pg => pg.$$eval('details.grupo-programas', ds => ds.map(d => ({ cat: d.dataset.categoria, abierta: d.open, aria: d.querySelector('summary').getAttribute('aria-expanded'), nombres: [...d.querySelectorAll('.master b')].map(b => b.textContent), subs: [...d.querySelectorAll('.master .sub')].map(b => b.textContent) })));
const sinErrores = (log, t) => chk(log.consola.length === 0, t + (log.consola.length ? ' → ' + log.consola.join(' | ') : ''));
// Color real del aviso en pantalla: contraste entre su texto y su fondo, y que el fondo es el rojo de acento del tema (--act-bg).
const colorAviso = (pg, sel) => pg.evaluate(s => {
  const e = document.querySelector(s), c = getComputedStyle(e);
  const rgb = t => t.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const t = lum(rgb(c.color)), f = lum(rgb(c.backgroundColor));
  const rojo = rgb(getComputedStyle(document.documentElement).getPropertyValue('--act-bg').trim().replace(/^#(..)(..)(..)$/, (m, a, b, d) => `rgb(${parseInt(a, 16)},${parseInt(b, 16)},${parseInt(d, 16)})`));
  return { ratio: (Math.max(t, f) + 0.05) / (Math.min(t, f) + 0.05), fondoRojo: rgb(c.backgroundColor).join() === rojo.join(), peso: c.fontWeight };
}, sel);
const nAlumnos = async pg => { await pg.waitForTimeout(400); return pg.$$eval('#v-master .alumnos .alumno', a => a.length); };   // la lista se pinta tras esperar los avisos

console.log('1. Todos los programas de la lista aparecen, también con 0 alumnos');
{
  const { pg, ctx, log } = await entrar();
  await ir(pg, '#/', '.masters .master');
  await abrirTodo(pg);
  const s = await secciones(pg);
  chk(JSON.stringify(s.map(x => x.cat)) === JSON.stringify(Object.keys(PROGRAMAS)), 'las 4 secciones, en el orden de la hoja: ' + s.map(x => x.cat).join(' · '));
  for (const [cat, lista] of Object.entries(PROGRAMAS)) {
    const x = s.find(y => y.cat === cat);
    chk(JSON.stringify(x?.nombres) === JSON.stringify(lista), `${cat}: sus ${lista.length} programas, en su orden`);
  }
  for (const p of TODOS) chk(s.flatMap(x => x.nombres).includes(p), `aparece «${p}»`);
  chk(s.flatMap(x => x.nombres).length === 14, 'son 14 programas, ni más ni menos');
  const ceros = s.flatMap(x => x.subs).filter(t => t === '0 alumnos').length;
  chk(ceros === 10, `los 10 programas sin alumnos salen con «0 alumnos» (${ceros})`);
  chk(await pg.$$eval('.estado', e => e.some(x => x.textContent.startsWith('14 programas · 30 alumnos'))), 'el pie dice 14 programas · 30 alumnos');
  chk(await pg.$$eval('details.grupo-programas', ds => ds.every(d => d.classList.contains('desplegable') && getComputedStyle(d.querySelector('summary'), '::after').content !== 'none')), 'las 4 secciones usan el desplegable común (clase desplegable y flecha)');
  chk(await pg.$$eval('details.grupo-programas>summary', ss => ss.every(x => x.getBoundingClientRect().height >= 44)), 'la zona táctil de cada cabecera es de al menos 44 px');
  chk(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll lateral a 390 px');
  sinErrores(log, 'sin errores en la consola');
  await ctx.close();
}

console.log('2. Abiertas y cerradas: la primera empieza abierta y la elección se recuerda');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/', '.masters .master');
  const s = await secciones(pg);
  chk(s[0].abierta && s[0].aria === 'true', 'la primera sección (MBA) empieza abierta (aria-expanded=true)');
  chk(s.slice(1).every(x => !x.abierta && x.aria === 'false'), 'las demás, cerradas (aria-expanded=false)');
  await pg.click('details.grupo-programas[data-categoria="Másteres"]>summary');
  await pg.click('details.grupo-programas[data-categoria="MBA"]>summary');
  chk((await secciones(pg)).map(x => x.abierta).join() === 'false,true,false,false', 'tocar la cabecera abre y cierra');
  // El guardado va en el evento «toggle», que el navegador entrega un instante después del clic: se espera en vez de leer al momento (fallaba 2 de cada 8 veces, también en la v27).
  const guardado = await pg.waitForFunction(() => localStorage.getItem('gad.inicio') === '["Másteres"]', null, { timeout: 3000 }).then(() => true, () => false);
  chk(guardado, 'se guarda solo el nombre de las abiertas: ["Másteres"] (' + await pg.evaluate(() => localStorage.getItem('gad.inicio')) + ')');
  await pg.goto(BASE + '#/ajustes'); await pg.goto(BASE + '#/'); await pg.waitForSelector('.masters .master', { state: 'attached' });
  chk((await secciones(pg)).map(x => x.abierta).join() === 'false,true,false,false', 'al volver a Inicio siguen igual');
  await pg.click('details.grupo-programas[data-categoria="MBA"]>summary');
  await pg.click('details.grupo-programas[data-categoria="MBA"] .master >> nth=1');
  await pg.waitForSelector('.alumnos .alumno');
  chk(await nAlumnos(pg) === 8, 'entrar en «MBA en inglés»: 8 alumnos');
  await ctx.close();
}
{
  const { pg, ctx } = await entrar({ almacenInicial: '[' });
  await ir(pg, '#/', '.masters .master');
  chk((await secciones(pg))[0].abierta, 'si lo guardado está roto, vale lo de por defecto (primera abierta)');
  await ctx.close();
}
{
  const { pg, ctx } = await entrar({ almacenInicial: '[]' });
  await ir(pg, '#/', 'details.grupo-programas');
  chk((await secciones(pg)).every(x => !x.abierta), 'si la persona lo dejó todo cerrado, sigue todo cerrado');
  await ctx.close();
}

console.log('3. Un programa con «/» y con «&» se abre y se vuelve a encontrar');
{
  const { pg, ctx, log } = await entrar();
  await ir(pg, '#/', '.masters .master');
  await pg.click('details.grupo-programas[data-categoria="Másteres"]>summary');   // v27: MBA va primera y abierta; Másteres empieza cerrada
  await pg.click('details.grupo-programas[data-categoria="Másteres"] .master >> nth=1');
  await pg.waitForSelector('.alumnos .alumno');
  chk(await nAlumnos(pg) === 7, '«Marketing Deportivo / Global Sports Marketing»: 7 alumnos');
  await pg.click('.alumnos .alumno >> nth=0'); await pg.waitForSelector('a.volver[href^="#/master/"]');
  chk((await pg.$eval('a.volver[href^="#/master/"]', e => e.textContent)) === 'Marketing Deportivo / Global Sports Marketing', 'la ficha vuelve al programa por su nombre');
  await pg.click('a.volver[href^="#/master/"]'); await pg.waitForSelector('.alumnos .alumno');
  { const n = await nAlumnos(pg); chk(n === 7, 'y volver deja la misma lista (' + n + ' ' + pg.url() + ')'); }
  await pg.goto(BASE + '#/master/' + encodeURIComponent('Derecho especializado en Sports & Entertainment')); await pg.waitForSelector('.alumnos .alumno');
  { const n = await nAlumnos(pg); chk(n === 7, '«…Sports & Entertainment»: 7 alumnos (' + n + ' ' + pg.url() + ')'); }
  await pg.goto(BASE + '#/master/' + encodeURIComponent('Global Players Program')); await pg.waitForSelector('#v-master .card .sub');
  chk(/todavía no tiene alumnos/.test(await pg.innerText('#v-master')), 'un programa con 0 alumnos dice que todavía no tiene alumnos');
  sinErrores(log, 'sin errores en la consola');
  await ctx.close();
}

console.log('4. Un programa desconocido (que un alumno tiene y no está en Listas) no rompe la app y se avisa');
{
  const { pg, ctx, log } = await entrar({ alumnos: t => t.replaceAll('MBA en español', 'Programa que ya no existe') });
  await ir(pg, '#/', '.masters .master');
  const s = await secciones(pg);
  chk(s.length === 5 && s[4].cat === 'Otros programas', 'aparece una 5.ª sección «Otros programas» al final');
  chk(s[4].abierta && JSON.stringify(s[4].nombres) === JSON.stringify(['Programa que ya no existe']), 'está abierta y trae el programa desconocido');
  chk(/no están en la lista de programas/.test(await pg.innerText('details[data-categoria="Otros programas"]')), 'dice que no están en la lista de programas');
  chk(await pg.evaluate(() => { const d = document.querySelector('details[data-categoria="Otros programas"]'), a = d.querySelector('.aviso-alerta'), n = d.querySelector('nav.masters'); return !!a && !!(n.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'el aviso de «Otros programas» va DEBAJO de los programas');
  { const a = await colorAviso(pg, 'details[data-categoria="Otros programas"] .aviso-alerta'); chk(a.ratio >= 4.5 && a.fondoRojo, `Inicio: el aviso es rojo de acento con contraste ${a.ratio.toFixed(2)}:1 (mínimo 4,5)`); }
  chk(s[0].nombres.join() === 'MBA en español,MBA en inglés', '«MBA en español» sigue en su sitio (con 0 alumnos)');
  chk(await pg.$$eval('.estado', e => e.some(x => x.textContent.startsWith('15 programas · 30 alumnos'))), 'el pie cuenta 15 programas');
  await pg.click('details[data-categoria="Otros programas"] .master'); await pg.waitForSelector('.alumnos .alumno');
  chk(await nAlumnos(pg) === 8, 'su lista abre con sus 8 alumnos');
  chk(/no está en la lista de programas/.test(await pg.innerText('#v-master')), 'la lista del programa también lo avisa');
  chk(await pg.evaluate(() => { const a = document.querySelector('#ma-fuera-de-lista'), l = document.querySelector('#v-master .alumnos'); return !!a && !!l && !!(l.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'el aviso de la lista del programa va DEBAJO de los alumnos');
  { const a = await colorAviso(pg, '#ma-fuera-de-lista'); chk(a.ratio >= 4.5 && a.fondoRojo, `lista del programa: el aviso es rojo de acento con contraste ${a.ratio.toFixed(2)}:1 (mínimo 4,5)`); }
  await pg.click('.alumnos .alumno >> nth=0'); await pg.waitForSelector('#v-alumno .volver');
  chk(/Programa que ya no existe/.test(await pg.innerText('#v-alumno')), 'la ficha enseña el programa tal cual');
  chk(/no está en la lista de programas/.test(await pg.innerText('#v-alumno')), 'y la ficha avisa de que no está en la lista');
  { const a = await colorAviso(pg, '#al-programa-fuera'); chk(a.ratio >= 4.5 && a.fondoRojo, `ficha: el aviso es rojo de acento con contraste ${a.ratio.toFixed(2)}:1 (mínimo 4,5)`); }
  await pg.goto(BASE + '#/master/Inventado'); await pg.waitForSelector('#v-master .card');
  chk(/no encontrado/i.test(await pg.innerText('#v-master')), 'una dirección con un programa que no existe: «no encontrado», sin fallar');
  sinErrores(log, 'sin errores en la consola');
  await ctx.close();
}

console.log('5. Hoja Listas con la cabecera antigua «Máster», o sin categorías');
{
  const { pg, ctx, log } = await entrar({ listas: t => t.replace(/^(﻿?)Programa,/, '$1Máster,') });
  await ir(pg, '#/', '.masters .master'); await abrirTodo(pg);
  const s = await secciones(pg);
  chk(s.length === 4 && s.flatMap(x => x.nombres).length === 14, 'con la cabecera «Máster»: las mismas 4 secciones y 14 programas');
  sinErrores(log, 'sin errores');
  await ctx.close();
}
{
  const quitar = t => t.split(/\r?\n/).map(l => l && l.split(',').slice(0, 11).join(',')).join('\n');   // sin las columnas de categoría ni idioma
  const { pg, ctx, log } = await entrar({ listas: quitar });
  await ir(pg, '#/', '.masters .master'); await abrirTodo(pg);
  const s = await secciones(pg);
  chk(s.length === 1 && s[0].cat === 'Otros programas' && s[0].nombres.length === 14, 'sin columna de categoría: todos en «Otros programas» (14), sin fallar');
  sinErrores(log, 'sin errores');
  await ctx.close();
}

console.log('6. Modo script (Apps Script simulado): lo mismo');
{
  const { pg, ctx, log } = await entrar({ script: true });
  await ir(pg, '#/', '.masters .master'); await abrirTodo(pg);
  const s = await secciones(pg);
  chk(s.length === 4 && s.flatMap(x => x.nombres).length === 14, 'desde el script: 4 secciones y 14 programas');
  sinErrores(log, 'sin errores');
  await ctx.close();
}

await terminar();
