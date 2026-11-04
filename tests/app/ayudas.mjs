// Ayudas comunes de las pruebas de la app: servidor local, navegador y un "Google" simulado.
// La app se prueba de verdad en un navegador, contra el MISMO Code.gs que se pega en Apps Script
// (ejecutado por tests/apps-script/simulador.mjs). No hay claves ni direcciones reales: todo es de mentira.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { crearMundo, CLAVE_PRUEBA } from '../apps-script/simulador.mjs';

export { CLAVE_PRUEBA };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.csv': 'text/csv; charset=utf-8' };

const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.resolve(path.join(RAIZ, p));
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  s.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(0, r));
export const BASE = `http://localhost:${srv.address().port}/`;

// Dirección inventada con la forma válida. No es de ningún script real.
export const URL_OK = 'https://script.google.com/macros/s/AKfycbTESTTESTTESTTESTTEST12345/exec';

let ok = 0, mal = 0;
export const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };

// NAVEGADOR=chromium usa el Chromium de Playwright; por defecto, Microsoft Edge (ya instalado en Windows).
const canal = process.env.NAVEGADOR === 'chromium' ? undefined : (process.env.NAVEGADOR || 'msedge');
export const b = await chromium.launch(canal ? { channel: canal } : {});

export async function terminar() {
  await b.close(); srv.close();
  console.log(`\n${ok} bien, ${mal} mal`);
  process.exit(mal ? 1 : 0);
}

// Un "móvil" nuevo con su Google simulado.
//   modo: 'normal' | 'caido' (sin conexión con Google) | 'html' (Google responde una página en vez del script)
//   ctrl.abortar / ctrl.perderRespuesta: fallan las siguientes peticiones de guardar. true = 2 (la app reintenta una vez sola, así que
//     true equivale a "falla también el reintento"); un número N = fallan solo N seguidas (1 = el reintento automático lo arregla).
//   ctrl.ocupado = N: el script responde "ocupado" (sin escribir nada) a las N siguientes peticiones de guardar.
//   ctrl.lento = ms: las peticiones de guardar tardan ese tiempo en responder (para ver "Guardando…" y probar la doble pulsación).
//   ctrl.fallarTodo = N: las N siguientes peticiones, sean de lo que sean, se cortan (incluidas las de leer datos).
//   ctrl.alResponder(j, accion): cambia la respuesta del script antes de entregarla (devuelve el nuevo objeto).
export async function nuevo({ modo = 'normal' } = {}) {
  const mundo = crearMundo();
  mundo.reloj.t = Date.now();
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const log = { peticiones: [], consola: [], externas: [] };
  const ctrl = { abortar: 0, perderRespuesta: 0, ocupado: 0, lento: 0, fallarTodo: 0 };
  const cuenta = v => (v === true ? 2 : Number(v) || 0);
  pg.on('console', m => { if (m.type() === 'error' || /Content Security/i.test(m.text())) log.consola.push(m.text()); });
  pg.on('pageerror', e => log.consola.push('pageerror ' + e.message));
  pg.on('request', r => { if (!r.url().startsWith(BASE)) log.externas.push(r.method() + ' ' + r.url()); });
  await pg.route('https://script.google.com/**', async r => {
    const req = r.request();
    log.peticiones.push({ url: req.url(), metodo: req.method(), cuerpo: req.postData(), tipo: req.headers()['content-type'] });
    const cors = { 'access-control-allow-origin': '*' };
    const accion = req.postData() ? JSON.parse(req.postData()).action : '';
    const guarda = /^(guardar|registrar|crear|cambiar)/.test(accion);
    if (ctrl.fallarTodo > 0) { ctrl.fallarTodo--; return r.abort('failed'); }
    if (guarda && ctrl.lento) await new Promise(res => setTimeout(res, ctrl.lento));
    if (guarda && cuenta(ctrl.abortar) > 0) { ctrl.abortar = cuenta(ctrl.abortar) - 1; return r.abort('failed'); }
    if (guarda && ctrl.ocupado > 0) { ctrl.ocupado--; return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'ocupado' }) }); }
    if (modo === 'caido') return r.abort('failed');
    if (modo === 'html') return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/html' }, body: '<html>Inicia sesión</html>' });
    if (req.method() !== 'POST') return r.fulfill({ status: 200, headers: cors, body: 'x' });
    let j = mundo.llamar(req.postData());
    if (guarda && cuenta(ctrl.perderRespuesta) > 0) { ctrl.perderRespuesta = cuenta(ctrl.perderRespuesta) - 1; return r.abort('failed'); }
    if (ctrl.alResponder) j = ctrl.alResponder(j, accion) ?? j;   // para simular un script antiguo o una respuesta rara
    r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(j) });
  });
  await pg.route('https://script.googleusercontent.com/**', r => r.abort());
  return { mundo, ctx, pg, log, ctrl };
}

export const almacen = pg => pg.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
export const conectar = async (pg, url, clave) => {
  await pg.fill('#ac-url', url); await pg.fill('#ac-clave', clave);
  await pg.click('form button[type=submit]');
};
