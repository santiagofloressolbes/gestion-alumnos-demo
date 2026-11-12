// Pruebas de las secciones plegables de Ajustes: solo «Conexión» abierta por defecto, el estado dicho con texto,
// lo abierto se recuerda en el móvil, teclado, datos guardados rotos y 320 px.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const SECCIONES = [['aj-conexion', 'Conexión'], ['aj-avisos', 'Avisos de alumnos'], ['aj-firma-tarjeta', 'Firma de los correos'], ['aj-version-tarjeta', 'Versión de la app'], ['aj-diagnostico', 'Diagnóstico (temporal)']];
const entrar = async (guardado) => {
  const t = await nuevo();
  await t.pg.addInitScript(([u, c, g]) => {
    if (sessionStorage.getItem('ini')) return;
    localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c);
    if (g !== null) localStorage.setItem('gad.ajustes', g);
    sessionStorage.setItem('ini', '1');
  }, [URL_OK, CLAVE_PRUEBA, guardado ?? null]);
  return t;
};
const ir = async pg => { await pg.goto(BASE + '#/ajustes'); await pg.waitForSelector('#aj-conexion summary'); };
const estados = pg => pg.evaluate(ids => Object.fromEntries(ids.map(id => { const d = document.querySelector(`#${id} details`); return [id, [d.open, d.querySelector('.plegable-estado').textContent]]; })), SECCIONES.map(s => s[0]));
const guardado = pg => pg.evaluate(() => localStorage.getItem('gad.ajustes'));
const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const d = e.closest('details'); if (d && !d.open) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);
// «toggle» es asíncrono: tras pulsar se espera un instante a que el texto y lo guardado se pongan al día
const pulsa = async (pg, sel) => { await pg.click(sel); await pg.waitForTimeout(120); };
const sinScrollLateral = pg => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth);

console.log('1. Por defecto: solo «Conexión» abierta');
{
  const { pg, ctx, log } = await entrar();
  await ir(pg);
  const e = await estados(pg);
  chk(e['aj-conexion'][0] === true && e['aj-conexion'][1] === 'Abierto', 'Conexión: abierta y dice «Abierto»');
  for (const id of ['aj-avisos', 'aj-firma-tarjeta', 'aj-version-tarjeta', 'aj-diagnostico']) chk(e[id][0] === false && e[id][1] === 'Cerrado', `${id}: cerrada y dice «Cerrado»`);
  chk(await pg.$$eval('#v-ajustes details', d => d.length) === 5, 'son 5 secciones plegables');
  const titulos = await pg.$$eval('#v-ajustes summary h2', h => h.map(x => x.textContent));
  chk(JSON.stringify(titulos) === JSON.stringify(SECCIONES.map(s => s[1])), 'los títulos, en este orden: ' + titulos.join(' · '));
  chk(await visible(pg, '#aj-olvidar') && !(await visible(pg, '#aj-av-dias')) && !(await visible(pg, '#aj-firma')) && !(await visible(pg, '#aj-buscar')) && !(await visible(pg, '#dg-lista')), 'se ve el contenido de Conexión y no el de las cerradas');
  chk(await visible(pg, '#aj-aviso') && await pg.$('#v-ajustes #aj-aviso') !== null && await pg.$eval('#aj-aviso', e => !e.closest('details')), 'el aviso de demostración sigue visible y fuera de las secciones plegables');
  chk(await guardado(pg) === null, 'sin tocar nada no se guarda nada');
  chk(await pg.$$eval('#v-ajustes summary', s => s.every(x => x.getBoundingClientRect().height >= 44)), 'cada cabecera mide al menos 44 px');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));

  console.log('2. Abrir, cerrar y recordar');
  await pulsa(pg, '#aj-avisos summary');
  chk((await estados(pg))['aj-avisos'].join() === 'true,Abierto' && await visible(pg, '#aj-av-dias'), 'al tocar «Avisos» se abre, dice «Abierto» y se ve su contenido');
  chk(await guardado(pg) === '["conexion","avisos"]', 'se guarda lo abierto: ' + await guardado(pg));
  await pulsa(pg, '#aj-conexion summary');
  chk((await estados(pg))['aj-conexion'].join() === 'false,Cerrado' && !(await visible(pg, '#aj-olvidar')), '«Conexión» se cierra y dice «Cerrado»');
  chk(await guardado(pg) === '["avisos"]', 'cerrar también se recuerda: ' + await guardado(pg));
  await pg.reload(); await pg.waitForSelector('#aj-conexion summary');
  const r = await estados(pg);
  chk(r['aj-conexion'][0] === false && r['aj-avisos'][0] === true && r['aj-avisos'][1] === 'Abierto' && r['aj-conexion'][1] === 'Cerrado', 'al cerrar y abrir la app queda como se dejó (Conexión cerrada, Avisos abierta)');
  await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('.masters .master');
  await pg.click('#tabs a[data-tab=ajustes]'); await pg.waitForSelector('#aj-avisos summary');
  chk((await estados(pg))['aj-avisos'][0] === true, 'y al cambiar de pestaña y volver');
  await pulsa(pg, '#aj-avisos summary'); await pulsa(pg, '#aj-avisos summary');
  chk(await guardado(pg) === '["avisos"]', 'abrir y cerrar y abrir deja una sola entrada, sin repetir');
  await pulsa(pg, '#aj-avisos summary');
  chk(await guardado(pg) === '[]', 'todo cerrado se recuerda como lista vacía (no vuelve a los valores por defecto)');
  await pg.reload(); await pg.waitForSelector('#aj-conexion summary');
  chk(Object.values(await estados(pg)).every(([abierta, t]) => abierta === false && t === 'Cerrado'), 'tras recargar sigue todo cerrado');

  console.log('3. Teclado');
  await pg.focus('#aj-firma-tarjeta summary'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(120);
  chk((await estados(pg))['aj-firma-tarjeta'].join() === 'true,Abierto', 'Enter abre la sección');
  await pg.keyboard.press('Space'); await pg.waitForTimeout(120);
  chk((await estados(pg))['aj-firma-tarjeta'].join() === 'false,Cerrado', 'Espacio la cierra');
  await ctx.close();
}

console.log('4. Lo guardado, roto o raro');
for (const [guardadoRaro, esperado, que] of [
  ['{no es json', ['aj-conexion'], 'JSON roto → por defecto'],
  ['"texto"', ['aj-conexion'], 'un texto en vez de una lista → por defecto'],
  ['["<script>","avisos",5,"conexion;DROP"]', ['aj-avisos'], 'nombres raros se descartan, el válido se respeta'],
  ['[]', [], 'lista vacía → todo cerrado'],
  ['["conexion","avisos","firma","version","diagnostico"]', SECCIONES.map(s => s[0]), 'todo abierto'],
]) {
  const { pg, ctx } = await entrar(guardadoRaro);
  await ir(pg);
  const e = await estados(pg);
  chk(JSON.stringify(Object.entries(e).filter(([, v]) => v[0]).map(([k]) => k)) === JSON.stringify(esperado), `${que}: ` + JSON.stringify(Object.entries(e).filter(([, v]) => v[0]).map(([k]) => k)));
  chk(Object.values(e).every(([abierta, t]) => t === (abierta ? 'Abierto' : 'Cerrado')), `${que}: el texto siempre dice lo que se ve`);
  await ctx.close();
}

console.log('5. Sin almacenamiento');
{
  const { pg, ctx } = await entrar();
  await ir(pg);
  await pg.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('lleno'); }; });
  await pulsa(pg, '#aj-avisos summary');
  chk((await estados(pg))['aj-avisos'].join() === 'true,Abierto' && await visible(pg, '#aj-av-dias'), 'sin poder guardar, la sección se abre igualmente');
  await ctx.close();
}

console.log('6. A 320 px');
{
  for (const [nombre, g] of [['todo cerrado', '[]'], ['todo abierto', '["conexion","avisos","firma","version","diagnostico"]']]) {
    const { pg, ctx } = await entrar(g);
    await pg.setViewportSize({ width: 320, height: 640 });
    await ir(pg);
    chk(await sinScrollLateral(pg), `${nombre}: sin scroll lateral`);
    chk(await pg.$$eval('#v-ajustes summary', s => s.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth + 0.5 && x.scrollWidth <= x.clientWidth + 1)), `${nombre}: las cabeceras caben y miden 44 px`);
    chk(await pg.$$eval('#v-ajustes .plegable-estado', s => s.every(x => x.getBoundingClientRect().left >= 0 && x.getBoundingClientRect().right <= innerWidth && x.getBoundingClientRect().height < 30)), `${nombre}: el texto «Abierto/Cerrado» no se corta`);
    if (g !== '[]') chk(await pg.$$eval('#aj-avisos input, #aj-avisos button, #aj-firma, #aj-fi-guardar, #aj-buscar, #dg-copiar', e => e.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth)), `${nombre}: campos y botones de dentro: 44 px y dentro de la pantalla`);
    await ctx.close();
  }
}
await terminar();
