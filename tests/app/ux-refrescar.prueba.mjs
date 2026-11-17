// v28, parte 1: botón «Actualizar datos». Pequeño, arriba a la derecha, vuelve a leer el Sheet sin cerrar la app.
// Gira mientras carga, dice con claridad si falla (y deja los datos anteriores), no pisa lo que se está escribiendo,
// no guarda nada en el móvil y no se ve en la demo. Sin recarga automática.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async ({ script = true, ancho = 390, alto = 800 } = {}) => {
  const t = await nuevo();
  await t.ctx.clock.setFixedTime('2026-11-12T12:00:00');
  await t.pg.addInitScript(([s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    sessionStorage.setItem('ini', '1');
  }, [script, URL_OK, CLAVE_PRUEBA]);
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); await pg.waitForTimeout(500); };
const visible = pg => pg.evaluate(() => { const b = document.getElementById('refrescar'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none'; });
const POST = log => log.peticiones.filter(p => p.metodo === 'POST').length;
const contraste = (pg, sel) => pg.evaluate(s => {
  const e = document.querySelector(s);
  const rgb = t => (t.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let f = e, bg = [0, 0, 0, 0];
  while (f) { bg = rgb(getComputedStyle(f).backgroundColor); if (bg.length < 4 || bg[3] > 0) break; f = f.parentElement; }
  const t = lum(rgb(getComputedStyle(e).color)), b = lum(bg);
  return (Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05);
}, sel);
const cambiarNombre = (mundo, id, nuevoNombre) => {
  const m = mundo.hojas.Alumnos.m, c = m[0].indexOf('Nombre');
  const f = m.find(x => x[0] === id); f[c] = nuevoNombre;
};

console.log('1. Dónde se ve y dónde no');
{
  const { pg, log } = await entrar();
  for (const [hash, sel, donde] of [['#/', '#v-inicio .card, #v-inicio details', 'Inicio'], ['#/buscar', '#v-buscar input', 'Buscar'], ['#/ofertas', '#v-ofertas .card, #v-ofertas li', 'Ofertas'], ['#/alumno/A002', '#en-titulo', 'ficha del alumno'], ['#/oferta/O005', '#match-alumnos', 'ficha de la oferta'], ['#/ajustes', '#v-ajustes .card', 'Ajustes']]) {
    await ir(pg, hash, sel);
    chk(await visible(pg), `se ve en ${donde}`);
  }
  const b = await pg.evaluate(() => { const r = document.getElementById('refrescar').getBoundingClientRect(); return { x: r.right, y: r.top, w: r.width, h: r.height, ancho: innerWidth, nombre: document.getElementById('refrescar').getAttribute('aria-label'), svg: !!document.querySelector('#refrescar svg'), texto: document.getElementById('refrescar').textContent.trim() }; });
  chk(b.w >= 44 && b.h >= 44, `zona táctil de al menos 44 px (${b.w} × ${b.h})`);
  chk(b.ancho - b.x <= 24 && b.y < 80, `arriba a la derecha de la cabecera (a ${Math.round(b.ancho - b.x)} px del borde, a ${Math.round(b.y)} px de arriba)`);
  chk(b.svg && b.texto === '' && /Actualizar/.test(b.nombre), `solo el icono, con nombre para lectores de pantalla: «${b.nombre}»`);
  const icono = await pg.evaluate(() => { const r = document.querySelector('#refrescar svg').getBoundingClientRect(); return r.width; });
  chk(icono <= 24, `el icono es pequeño y discreto (${icono} px)`);
  chk((await contraste(pg, '#refrescar')) >= 4.5, 'el icono tiene contraste de al menos 4,5:1');
  chk(await pg.evaluate(() => getComputedStyle(document.querySelector('#refrescar')).touchAction === 'manipulation'), 'sin zoom por doble toque');
  chk(await pg.evaluate(() => document.querySelectorAll('#refrescar path').length === 4), 'icono de dos flechas circulares (4 trazos)');

  for (const [hash, sel, donde] of [['#/acceso', '#v-acceso', 'Acceso'], ['#/oferta/nueva', '#v-oferta-form form', 'nueva oferta'], ['#/oferta/O005/editar', '#v-oferta-form form', 'editar oferta'], ['#/oferta/O002/ronda/nueva', '#v-ronda-form', 'nueva ronda'], ['#/oferta/O002/ronda/R001/aplicar', '#v-aplicacion-form', 'añadir solicitud'], ['#/aplicacion/AP001/estado', '#v-estado-form', 'cambiar estado']]) {
    await ir(pg, hash, sel);
    chk(!(await visible(pg)), `NO se ve en ${donde}`);
  }
  chk(log.consola.length === 0, 'sin errores en la consola' + log.consola.join(' | '));
}

console.log('2. Con las notas de entrevista abiertas no se ve');
{
  const { pg } = await entrar();
  await ir(pg, '#/alumno/A002', '#en-editar');
  chk(await visible(pg), 'con la ficha cerrada se ve');
  await pg.click('#en-editar'); await pg.fill('#en-notas', 'Algo que no quiero perder');
  chk(!(await visible(pg)), 'con las notas abiertas NO se ve');
  chk(await pg.inputValue('#en-notas') === 'Algo que no quiero perder', 'lo escrito sigue ahí');
  await pg.evaluate(() => document.getElementById('refrescar').click());   // aunque algo lo pulse a la fuerza
  await pg.waitForTimeout(300);
  chk(await pg.inputValue('#en-notas') === 'Algo que no quiero perder', 'un clic forzado tampoco borra lo escrito');
}

console.log('3. Modo demo: no se ve');
{
  const { pg } = await entrar({ script: false });
  for (const h of ['#/', '#/buscar', '#/ofertas']) { await ir(pg, h, '#main'); chk(!(await visible(pg)), `en la demo no se ve (${h})`); }
}

console.log('4. Un cambio en el Sheet aparece sin cerrar la app');
{
  const { pg, mundo, log } = await entrar();
  await ir(pg, '#/alumno/A001', '#v-alumno h2, #v-alumno .card');
  const antes = await pg.innerText('#v-alumno');
  chk(!/Zacarías Prueba/.test(antes), 'al principio no está el nombre nuevo');
  cambiarNombre(mundo, 'A001', 'Zacarías Prueba');
  const n = POST(log);
  await pg.click('#refrescar');
  await pg.waitForFunction(() => /Zacarías Prueba/.test(document.querySelector('#v-alumno').innerText));
  chk(true, 'tras tocar el botón, la ficha enseña el dato nuevo del Sheet');
  chk(POST(log) > n, 'hubo una petición nueva al script');
  chk((await pg.innerText('#refrescar-aviso')).includes('Datos actualizados'), 'avisa «Datos actualizados»');
  chk(await pg.evaluate(() => !document.getElementById('refrescar').classList.contains('girando') && !document.getElementById('refrescar').hasAttribute('aria-busy')), 'al acabar deja de girar');
  // En Inicio y en Buscar también
  cambiarNombre(mundo, 'A001', 'Yolanda Segunda');
  await pg.evaluate(() => { location.hash = '#/buscar'; }); await pg.waitForSelector('#q');
  await pg.click('#refrescar'); await pg.waitForFunction(() => /Yolanda Segunda/.test(document.querySelector('#v-buscar').innerText));
  chk(true, 'en Buscar también se ve el cambio');
  chk(log.consola.length === 0, 'sin errores en la consola ' + log.consola.join(' | '));
}

console.log('5. Giro mientras carga, y un solo toque a la vez');
{
  const { pg, log } = await entrar();
  await ir(pg, '#/ofertas', '#v-ofertas li, #v-ofertas .card');
  let liberar; const puerta = new Promise(r => { liberar = r; });
  await pg.route('https://script.google.com/**', async r => { await puerta; await r.fallback(); });
  const n = POST(log);
  await pg.click('#refrescar');
  await pg.waitForTimeout(200);
  const e = await pg.evaluate(() => { const b = document.getElementById('refrescar'); return { gira: b.classList.contains('girando'), busy: b.getAttribute('aria-busy'), dis: b.getAttribute('aria-disabled'), anim: getComputedStyle(b.querySelector('svg')).animationName, aviso: document.getElementById('refrescar-aviso').textContent }; });
  chk(e.gira && e.busy === 'true' && e.dis === 'true', 'mientras carga: gira, aria-busy y aria-disabled');
  chk(e.anim === 'girar', 'el giro es una animación (si el sistema no pide menos movimiento)');
  chk(/Actualizando/.test(e.aviso), 'dice «Actualizando…»');
  await pg.evaluate(() => { const b = document.getElementById('refrescar'); b.click(); b.click(); });
  await pg.waitForTimeout(200);
  liberar();
  await pg.waitForFunction(() => !document.getElementById('refrescar').classList.contains('girando'));
  await pg.waitForTimeout(300);
  chk(POST(log) - n === 1, `varios toques seguidos hacen UNA sola petición (${POST(log) - n})`);
}

console.log('6. Si falla: motivo claro y los datos anteriores se quedan');
{
  const { pg, ctrl, log } = await entrar();
  await ir(pg, '#/buscar', '#q');
  const filas = await pg.$$eval('#v-buscar ul.alumnos li', l => l.length);
  chk(filas > 20, `la búsqueda tiene ${filas} alumnos antes`);
  ctrl.fallarTodo = 5;
  await pg.click('#refrescar');
  await pg.waitForFunction(() => /Sin conexión/.test(document.getElementById('refrescar-aviso').textContent));
  const av = await pg.evaluate(() => { const a = document.getElementById('refrescar-aviso'); return { t: a.textContent, rol: a.getAttribute('role'), oculto: a.hidden }; });
  chk(!av.oculto && av.rol === 'alert', 'el error se anuncia (role=alert)');
  chk(/datos anteriores/.test(av.t) && /conexi|red|internet/i.test(av.t), 'dice qué pasó y que se siguen viendo los datos anteriores: ' + av.t);
  chk(!/undefined|null|\[object/.test(av.t), 'el texto no tiene basura');
  chk(await pg.$$eval('#v-buscar ul.alumnos li', l => l.length) === filas, 'la lista sigue con los mismos alumnos');
  chk(await pg.evaluate(() => !document.getElementById('refrescar').classList.contains('girando')), 'deja de girar');
  // Los datos anteriores siguen en memoria: otra pantalla los lee sin pedir nada al Sheet (aunque este siga caído).
  ctrl.fallarTodo = 50;
  chk(await pg.evaluate(async () => (await (await import('./js/data/index.js')).getAlumnos()).length) > 20, 'tras el fallo, los alumnos anteriores siguen en memoria (no se borran antes de cargar)');
  ctrl.fallarTodo = 0;
  await pg.click('#refrescar'); await pg.waitForFunction(() => /Datos actualizados/.test(document.getElementById('refrescar-aviso').textContent));
  chk(true, 'se puede volver a intentar y funciona');
  // Una pantalla sin datos nuevos tampoco se queda vacía si falla (Inicio)
  await pg.evaluate(() => { location.hash = '#/'; }); await pg.waitForTimeout(500);
  ctrl.fallarTodo = 5; await pg.click('#refrescar');
  await pg.waitForFunction(() => /Sin conexión/.test(document.getElementById('refrescar-aviso').textContent));
  chk(await pg.$$eval('#v-inicio details, #v-inicio .card', l => l.length) > 0, 'Inicio sigue con sus programas tras un fallo');
  chk(log.consola.every(c => /Failed to load resource|net::ERR/.test(c)), 'solo los errores de red esperados en la consola: ' + log.consola.join(' | '));
}

console.log('7. Una clave que ya no vale lleva a Acceso (como en el resto de la app)');
{
  const { pg, ctrl } = await entrar();
  await ir(pg, '#/ofertas', '#v-ofertas li, #v-ofertas .card');
  ctrl.alResponder = () => ({ ok: false, error: 'clave' });
  await pg.click('#refrescar');
  await pg.waitForSelector('#v-acceso.on', { timeout: 5000 });
  chk(true, 'con clave incorrecta se vuelve a pedir');
  chk(!(await pg.evaluate(() => localStorage.getItem('gad.clave'))), 'la clave guardada se borra');
}

console.log('8. Nada se guarda en el móvil');
{
  const { pg } = await entrar();
  await pg.addInitScript(() => { window.__cache = []; const f = window.fetch; window.fetch = (u, o) => { if (/script\.google\.com/.test(String(u))) window.__cache.push(o && o.cache); return f(u, o); }; });
  await ir(pg, '#/ofertas', '#v-ofertas li, #v-ofertas .card');
  const foto = () => pg.evaluate(async () => JSON.stringify({ l: Object.entries(localStorage).sort(), s: Object.entries(sessionStorage).sort(), c: (await caches.keys()).sort(), d: (await indexedDB.databases?.() || []).map(x => x.name) }));
  const a = await foto();
  for (let i = 0; i < 3; i++) { await pg.click('#refrescar'); await pg.waitForFunction(() => !document.getElementById('refrescar').classList.contains('girando')); await pg.waitForTimeout(150); }
  chk(a === await foto(), 'localStorage, sessionStorage, caché e IndexedDB iguales tras 3 actualizaciones');
  const modos = await pg.evaluate(() => window.__cache);
  chk(modos.length >= 4 && modos.every(m => m === 'no-store'), `todas las lecturas del Sheet van con no-store (${modos.length} peticiones)`);
}

console.log('9. Se conserva el punto de scroll y la búsqueda');
{
  const { pg } = await entrar();
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  await pg.evaluate(() => { document.querySelectorAll('#match-alumnos details').forEach(d => { d.open = true; }); document.querySelector('#main').scrollTop = 500; });
  await pg.waitForTimeout(200);
  const y0 = await pg.evaluate(() => document.querySelector('#main').scrollTop);
  chk(y0 > 100, `la ficha se puede desplazar (${y0})`);
  await pg.click('#refrescar'); await pg.waitForFunction(() => /Datos actualizados/.test(document.getElementById('refrescar-aviso').textContent));
  chk(Math.abs(await pg.evaluate(() => document.querySelector('#main').scrollTop) - Math.min(y0, await pg.evaluate(() => { const m = document.querySelector('#main'); return m.scrollHeight - m.clientHeight; }))) <= 40, 'el scroll queda en el mismo punto');

  await ir(pg, '#/buscar', '#q');
  await pg.fill('#q', 'Lucía');
  const n1 = await pg.$$eval('#v-buscar ul.alumnos li', l => l.length);
  await pg.click('#refrescar'); await pg.waitForFunction(() => /Datos actualizados/.test(document.getElementById('refrescar-aviso').textContent));
  chk(await pg.inputValue('#q') === 'Lucía', 'el texto de la búsqueda sigue ahí');
  chk(await pg.$$eval('#v-buscar ul.alumnos li', l => l.length) === n1 && n1 < 30, `y el resultado es el mismo (${n1} alumnos)`);
}

console.log('10. A 320 px y en horizontal sigue cabiendo');
for (const [ancho, alto] of [[320, 640], [844, 390]]) {
  const { pg } = await entrar({ ancho, alto });
  await ir(pg, '#/ofertas', '#v-ofertas li, #v-ofertas .card');
  const r = await pg.evaluate(() => { const b = document.getElementById('refrescar').getBoundingClientRect(); return { dentro: b.left >= 0 && b.right <= innerWidth + 1 && b.top >= 0, lateral: document.documentElement.scrollWidth > innerWidth }; });
  chk(r.dentro && !r.lateral, `${ancho} × ${alto}: el botón cabe y no hay scroll lateral`);
}

console.log('11. v29: el error, en dos frases cortas y con «Cerrar»');
{
  const { pg, ctrl, log } = await entrar({ ancho: 390 });
  await ir(pg, '#/ofertas', '#v-ofertas li, #v-ofertas .card');
  ctrl.fallarTodo = 5;
  await pg.click('#refrescar');
  await pg.waitForFunction(() => !document.getElementById('refrescar-aviso').hidden && /conexión/.test(document.getElementById('refrescar-texto').textContent));
  const t = await pg.innerText('#refrescar-texto');
  chk(t === 'Sin conexión: se siguen viendo los datos anteriores. Vuelve a intentarlo cuando tengas internet.', 'sin conexión: la frase exacta («' + t + '»)');
  chk((t.match(/no se h/gi) || []).length === 0, 'sin «No se han podido… No se ha podido…»');
  const c = await pg.evaluate(() => { const b = document.getElementById('refrescar-cerrar'), r = b.getBoundingClientRect(), a = document.getElementById('refrescar-aviso').getBoundingClientRect(); return { visible: !b.hidden, w: r.width, h: r.height, dentro: r.left >= a.left && r.right <= a.right + 1, texto: b.textContent, rol: document.getElementById('refrescar-aviso').getAttribute('role'), lateral: document.documentElement.scrollWidth > innerWidth }; });
  chk(c.visible && c.texto === 'Cerrar' && c.w >= 44 && c.h >= 44 && c.dentro, `hay un botón «Cerrar» de ${Math.round(c.w)} × ${Math.round(c.h)} px dentro del aviso`);
  chk(c.rol === 'alert' && !c.lateral, 'el aviso se anuncia (alert) y no hay scroll lateral');
  chk((await contraste(pg, '#refrescar-cerrar')) >= 4.5 && (await contraste(pg, '#refrescar-texto')) >= 4.5, 'texto y «Cerrar» con contraste de al menos 4,5:1');
  await pg.click('#refrescar-cerrar');
  chk(await pg.evaluate(() => document.getElementById('refrescar-aviso').hidden && document.activeElement === document.getElementById('refrescar')), '«Cerrar» quita el aviso y devuelve el foco al botón de actualizar');
  ctrl.fallarTodo = 5; await pg.click('#refrescar');
  await pg.waitForFunction(() => /conexión/.test(document.getElementById('refrescar-texto').textContent));
  ctrl.fallarTodo = 0; await pg.click('#refrescar');
  await pg.waitForFunction(() => /Datos actualizados/.test(document.getElementById('refrescar-texto').textContent));
  chk(await pg.evaluate(() => document.getElementById('refrescar-cerrar').hidden), 'al volver a intentarlo, el error se va y «Cerrar» no se ve en el aviso de éxito');
  chk(log.consola.every(x => /Failed to load resource|net::ERR/.test(x)), 'solo errores de red esperados en la consola');

  // Otros errores: el mismo formato de dos frases y con «Cerrar»
  for (const [codigo, esperado] of [['servidor', /^No se han podido actualizar los datos\. Ha fallado algo en el servidor.* Se siguen viendo los datos anteriores\.$/], ['version', /^No se han podido actualizar los datos\. La app y los datos no son compatibles.* Se siguen viendo los datos anteriores\.$/]]) {
    ctrl.alResponder = () => ({ ok: false, error: codigo });
    await pg.click('#refrescar');
    await pg.waitForFunction(() => /No se han podido/.test(document.getElementById('refrescar-texto').textContent));
    const x = await pg.innerText('#refrescar-texto');
    chk(esperado.test(x) && (x.match(/No se h/g) || []).length === 1, `error «${codigo}»: ${x.slice(0, 90)}…`);
    chk(await pg.evaluate(() => !document.getElementById('refrescar-cerrar').hidden), `error «${codigo}»: con «Cerrar»`);
    await pg.click('#refrescar-cerrar');
  }
  ctrl.alResponder = null;
  // Todos los textos posibles, sin repetir ni dejar basura
  const todos = await pg.evaluate(async () => {
    const { textoError } = await import('./js/vistas/refrescar.js');
    const msg = { hoja: 'Falta la hoja «Alumnos» en el Sheet.', ocupado: 'Google está ocupado y no se ha guardado nada.', config: 'El script no tiene la clave bien configurada.' };
    return ['red', 'tiempo', 'respuesta', 'servidor', 'version', 'hoja', 'columna', 'html', 'ocupado', 'config', 'bloqueado'].map(codigo => ({ codigo, t: textoError({ codigo, message: msg[codigo] || 'Mensaje de ' + codigo + ' sin punto' }) })).concat([{ codigo: '(sin mensaje)', t: textoError({}) }, { codigo: '(nada)', t: textoError(undefined) }]);
  });
  chk(todos.every(x => /se siguen viendo los datos anteriores\./i.test(x.t)), 'todos los textos dicen que se siguen viendo los datos anteriores');
  chk(todos.every(x => (x.t.match(/no se h(a|an) podido/gi) || []).length <= 1), 'ninguno repite «no se ha(n) podido»');
  chk(todos.every(x => !/undefined|null|\[object|\.\./.test(x.t) && /[.]$/.test(x.t)), 'ninguno con basura y todos acaban en punto');
  chk(todos.find(x => x.codigo === 'red').t.length < 110 && todos.find(x => x.codigo === 'tiempo').t.startsWith('Google tarda demasiado en responder: se siguen viendo'), 'las de conexión y tiempo son frases cortas');
  await pg.setViewportSize({ width: 320, height: 640 });
  ctrl.fallarTodo = 5; await pg.click('#refrescar');
  await pg.waitForFunction(() => /conexión/.test(document.getElementById('refrescar-texto').textContent));
  chk(await pg.evaluate(() => { const b = document.getElementById('refrescar-cerrar').getBoundingClientRect(); return b.right <= innerWidth && b.left >= 0 && document.documentElement.scrollWidth <= innerWidth; }), 'a 320 px el aviso y «Cerrar» caben');
}

await terminar();
