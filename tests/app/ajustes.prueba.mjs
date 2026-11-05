// Pruebas de la pestaña Ajustes: 4 pestañas, conexión, versión, "Buscar actualización" y aviso de demostración.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { b, nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const entrar = async (modo = 'script') => {
  const t = await nuevo();
  await t.pg.addInitScript(([m, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (m === 'demo') localStorage.setItem('gad.modo', 'demo'); else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
    sessionStorage.setItem('ini', '1');
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const LEGAL = 'Proyecto personal de demostración. Todos los datos son ficticios. No afiliado a LaLiga ni a LaLiga Business School.';
const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);

/* 1. La versión y la lista de archivos del service worker (sin navegador) */
{
  console.log('1. Versión y lista de archivos del service worker');
  const sw = leer('sw.js'), ver = /export const VERSION = '(\d+)'/.exec(leer('js/version.js'))[1];
  const cache = /const CACHE = 'gestion-alumnos-demo-v(\d+)'/.exec(sw)[1];
  chk(ver === cache, `version.js (${ver}) y CACHE de sw.js (${cache}) son el mismo número`);
  const files = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  const reales = [];
  const rec = d => { for (const e of fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })) { const r = d + '/' + e.name; e.isDirectory() ? rec(r) : reales.push(r); } };
  for (const d of ['js', 'css', 'datos-mock', 'icons', 'fonts']) rec(d);
  const faltan = reales.filter(f => !files.includes(f) && !/LICENSE/.test(f)), sobran = files.filter(f => !['index.html', 'manifest.webmanifest', ...reales].includes(f));
  chk(!faltan.length, 'todos los archivos de la app están en la lista del service worker' + (faltan.length ? ': faltan ' + faltan : ''));
  chk(!sobran.length, 'la lista no tiene archivos que no existen' + (sobran.length ? ': ' + sobran : ''));
  chk(/cache: 'reload'/.test(sw), 'al instalar, los archivos se piden a la red sin usar copias viejas');
  chk(/endsWith\('\/sw\.js'\)\) return/.test(sw), 'sw.js nunca se sirve de la copia guardada (para poder comprobar la versión publicada)');
}

/* 2. Las 4 pestañas */
{
  console.log('2. Barra inferior con 4 pestañas');
  const { pg, ctx, log } = await entrar();
  await ir(pg, '#/', '.masters .master');
  chk(await pg.$$eval('#tabs a', a => a.map(x => x.textContent.trim()).join()) === 'Inicio,Buscar,Ofertas,Ajustes', 'Inicio, Buscar, Ofertas y Ajustes');
  chk(await pg.$$eval('#tabs a', a => Math.min(...a.map(x => Math.min(x.getBoundingClientRect().height, x.getBoundingClientRect().width)))) >= 44, 'cada pestaña mide al menos 44 px');
  chk(await pg.$$eval('#tabs a', a => new Set(a.map(x => Math.round(x.getBoundingClientRect().top))).size) === 1, 'las 4 pestañas están en una sola fila');
  await pg.setViewportSize({ width: 320, height: 640 });
  chk(await pg.$$eval('#tabs a', a => a.every(x => x.getBoundingClientRect().right <= innerWidth + 0.5 && x.getBoundingClientRect().width >= 44)) && await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'en 320 px de ancho caben las 4 y no hay scroll lateral');
  await pg.setViewportSize({ width: 390, height: 800 });
  await pg.click('#tabs a[data-tab=ajustes]'); await pg.waitForSelector('#v-ajustes .card');
  chk(await pg.innerText('#titulo') === 'Ajustes' && await pg.getAttribute('#tabs a[data-tab=ajustes]', 'aria-current') === 'page' && (await pg.$$('#tabs a[aria-current=page]')).length === 1, 'título "Ajustes" y solo esa pestaña marcada');
  chk(await pg.evaluate(() => location.hash) === '#/ajustes', 'la dirección es #/ajustes');
  await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('.masters .master');
  chk(await pg.getAttribute('#tabs a[data-tab=inicio]', 'aria-current') === 'page', 'se puede volver a Inicio');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 3. Qué hay en Ajustes */
{
  console.log('3. Contenido de Ajustes');
  let { pg, ctx } = await entrar('script');
  await ir(pg, '#/ajustes', '#v-ajustes .card');
  const t = await pg.innerText('#v-ajustes');
  chk(/Conectado al Sheet de prueba/.test(t) && await visible(pg, '#aj-olvidar') && /Olvidar acceso/.test(t), 'conexión: estado y "Olvidar acceso"');
  chk(await pg.innerText('#aj-version') === 'Versión ' + /VERSION = '(\d+)'/.exec(leer('js/version.js'))[1], 'enseña la versión de la app: ' + await pg.innerText('#aj-version'));
  chk(await visible(pg, '#aj-buscar') && await pg.innerText('#aj-buscar') === 'Buscar actualización', 'botón "Buscar actualización"');
  chk(await pg.innerText('#aj-aviso') === LEGAL, 'aviso de demostración completo en Ajustes');
  chk(await pg.evaluate(() => getComputedStyle(document.querySelector('#aj-buscar')).minHeight) !== '0px' && (await pg.$eval('#aj-buscar', e => e.getBoundingClientRect().height)) >= 44, 'el botón mide al menos 44 px de alto');
  chk(!(await visible(pg, '#legal')), 'en Ajustes no se repite el pie con el aviso');
  await ctx.close();
  ({ pg, ctx } = await entrar('demo'));
  await ir(pg, '#/ajustes', '#v-ajustes .card');
  chk(/Estás viendo la demo/.test(await pg.innerText('#v-ajustes')) && (await pg.$$('#aj-olvidar')).length === 0 && /Conectar con el Sheet de prueba/.test(await pg.innerText('#v-ajustes')), 'demo: lo explica y ofrece conectar (sin "Olvidar acceso")');
  await ctx.close();
  // olvidar acceso desde Ajustes
  ({ pg, ctx } = await entrar('script'));
  pg.on('dialog', d => d.accept());
  await ir(pg, '#/ajustes', '#aj-olvidar');
  await pg.click('#aj-olvidar'); await pg.waitForSelector('#ac-url');
  chk(await pg.evaluate(() => Object.keys(localStorage).length) === 0, 'Olvidar acceso (desde Ajustes) borra lo guardado');
  await ctx.close();
}

/* 4. El aviso de demostración: completo en Inicio, corto en el resto */
{
  console.log('4. Aviso de demostración');
  const { pg, ctx } = await entrar('demo');
  await ir(pg, '#/', '.masters .master');
  chk(await pg.innerText('#legal') === LEGAL && await visible(pg, '#legal'), 'Inicio: aviso completo');
  chk(/MODO DEMO/.test(await pg.innerText('#demo')), 'el banner de modo demo sigue arriba');
  await pg.click('.master >> nth=0'); await pg.waitForSelector('.alumno');
  chk(await pg.innerText('#legal') === 'Demo · datos ficticios.', 'otras pantallas: aviso corto');
  await ir(pg, '#/buscar', '#v-buscar .buscador');
  chk(await pg.innerText('#legal') === 'Demo · datos ficticios.', 'Buscar: aviso corto');
  await ir(pg, '#/ajustes', '#v-ajustes .card');
  chk(!(await visible(pg, '#legal')) && await pg.innerText('#aj-aviso') === LEGAL, 'Ajustes: aviso completo en su tarjeta');
  await ctx.close();
}

/* 5. Buscar actualización (sin service worker: la comprobación lee sw.js de la red) */
{
  console.log('5. Buscar actualización');
  const ACTUAL = /VERSION = '(\d+)'/.exec(leer('js/version.js'))[1];
  const falso = v => `const CACHE = 'gestion-alumnos-demo-v${v}';`;
  // a) ya tiene la última
  let { pg, ctx } = await entrar();
  let n = 0;
  await pg.route('**/sw.js*', async r => { n++; await new Promise(x => setTimeout(x, 500)); r.fallback(); });
  await ir(pg, '#/ajustes', '#aj-buscar');
  await pg.evaluate(() => { const bt = document.querySelector('#aj-buscar'); bt.click(); bt.click(); });
  await pg.waitForTimeout(150);
  chk(await pg.isDisabled('#aj-buscar') && await pg.innerText('#aj-buscar') === 'Buscando…', 'mientras busca: botón desactivado y "Buscando…"');
  await pg.waitForFunction(() => /Ya tienes/.test(document.querySelector('#aj-resultado').textContent));
  chk(await pg.innerText('#aj-resultado') === `Ya tienes la última versión (${ACTUAL}).` && !(await pg.isDisabled('#aj-buscar')) && await pg.innerText('#aj-buscar') === 'Buscar actualización', 'al día: lo dice y el botón vuelve');
  chk(n === 1, 'dos pulsaciones = una sola comprobación');
  await ctx.close();
  // b) hay una versión nueva: lo dice y recarga la app
  ({ pg, ctx } = await entrar());
  await pg.route('**/sw.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: falso(Number(ACTUAL) + 1) }));
  await ir(pg, '#/ajustes', '#aj-buscar');
  await pg.evaluate(() => window.addEventListener('beforeunload', () => sessionStorage.setItem('visto', document.querySelector('#aj-resultado').textContent + ' | ' + document.querySelector('#aj-buscar').textContent)));   // lo que se veía justo antes de recargar
  const recarga = pg.waitForEvent('framenavigated', { timeout: 10000 });
  await pg.click('#aj-buscar');
  await recarga;
  await pg.waitForSelector('#aj-version');
  chk(await pg.evaluate(() => sessionStorage.getItem('visto')) === `Hay una versión nueva (${Number(ACTUAL) + 1}). Cargándola… | Actualizando…`, 'antes de recargar avisa: "Hay una versión nueva (N). Cargándola…" y el botón dice "Actualizando…": ' + await pg.evaluate(() => sessionStorage.getItem('visto')));
  chk(await pg.evaluate(() => location.hash) === '#/ajustes', 'hay versión nueva: la app se recarga y sigue en Ajustes');
  await ctx.close();
  // c) no se puede comprobar
  ({ pg, ctx } = await entrar());
  await pg.route('**/sw.js*', r => r.abort('failed'));
  await ir(pg, '#/ajustes', '#aj-buscar');
  await pg.click('#aj-buscar');
  await pg.waitForFunction(() => /No se ha podido comprobar/.test(document.querySelector('#aj-resultado').textContent));
  chk(!(await pg.isDisabled('#aj-buscar')) && await pg.evaluate(() => location.hash) === '#/ajustes', 'sin respuesta: lo dice, el botón vuelve y no se recarga');
  await pg.unroute('**/sw.js*');
  await pg.route('**/sw.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'nada que ver' }));
  await pg.click('#aj-buscar');
  await pg.waitForFunction(() => /No se ha podido comprobar/.test(document.querySelector('#aj-resultado').textContent));
  chk(true, 'respuesta rara: se trata como "no se ha podido comprobar"');
  await ctx.close();
}

/* 6. Con service worker de verdad: la copia guardada lleva la versión y sw.js se lee siempre de la red */
{
  console.log('6. Con service worker');
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => localStorage.setItem('gad.modo', 'demo'));
  await pg.goto(BASE + '#/ajustes');
  await pg.waitForSelector('#aj-version');
  await pg.evaluate(() => navigator.serviceWorker.ready);
  const ACTUAL = /VERSION = '(\d+)'/.exec(leer('js/version.js'))[1];
  chk((await pg.evaluate(() => caches.keys())).includes('gestion-alumnos-demo-v' + ACTUAL), 'la copia guardada en el móvil lleva el mismo número que la versión enseñada');
  await pg.reload(); await pg.waitForSelector('#aj-version');
  chk(await pg.evaluate(() => !!navigator.serviceWorker.controller), 'el service worker controla la página');
  await pg.click('#aj-buscar');
  await pg.waitForFunction(() => /Ya tienes/.test(document.querySelector('#aj-resultado').textContent));
  chk(true, 'con service worker: "ya tienes la última"');
  // se publica una versión nueva: aunque haya copia guardada, la ve (sw.js no sale de la copia)
  await ctx.route('**/sw.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: `const CACHE = 'gestion-alumnos-demo-v${Number(ACTUAL) + 1}';\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', e => e.waitUntil(self.clients.claim()));` }));
  const recarga = pg.waitForEvent('framenavigated', { timeout: 30000 });
  await pg.click('#aj-buscar');
  await recarga;
  chk(true, 'con una versión nueva publicada, la app se recarga sola (sin cerrar la app)');
  await ctx.close();
}

await terminar();
