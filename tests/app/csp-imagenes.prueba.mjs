// La política de seguridad solo admite imágenes de esta web o incrustadas (img-src 'self' data:), y nada de lo que la app muestra hoy se pierde.
// Se prueba en un navegador real, en la demo (datos de datos-mock/). Una foto por https de otro sitio no se carga: se ven las iniciales.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));

// «script»: conectado al Google simulado (hace falta para ver los formularios); si no, la demo (datos de datos-mock/).
const entrar = async ({ script = false } = {}) => {
  const t = await nuevo();
  await t.ctx.clock.setFixedTime('2026-11-12T12:00:00');
  await t.pg.addInitScript(
    ([s, u, c]) => {
      if (sessionStorage.getItem('ini')) return;
      if (s) {
        localStorage.setItem('gad.url', u);
        localStorage.setItem('gad.clave', c);
      } else localStorage.setItem('gad.modo', 'demo');
      sessionStorage.setItem('ini', '1');
    },
    [script, URL_OK, CLAVE_PRUEBA]
  );
  return t;
};
const ir = async (pg, hash, sel) => {
  await pg.goto(BASE + hash);
  await pg.waitForSelector(sel, { state: 'attached' });
  await pg.waitForTimeout(500);
};

console.log('1. La política: img-src es exactamente «self» y «data:»');
{
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  const img = (csp.match(/img-src ([^;]+)/) || [])[1] || '';
  igual(img.split(/\s+/).sort(), ["'self'", 'data:'], 'img-src: solo la propia web y data:');
  chk(!/https?:/.test(img), 'img-src no admite ningún dominio ni «https:» en general');
}

console.log('2. Todo lo que se ve hoy sigue viéndose (demo): sin errores de política, sin peticiones externas, sin recursos que fallen');
{
  const { pg, log, ctx } = await entrar();
  const fallos = [];
  pg.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) fallos.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  // Pantallas con iconos, flecha del desplegable (data:), casillas marcadas (data:) y avatares.
  const RUTAS = [
    ['#/', '.masters .master'],
    ['#/buscar', '#q'],
    ['#/ofertas', '#of-q'],
    ['#/oferta/O002', '#v-oferta .ronda'],
    ['#/alumno/A001/compartir', '#cp-vista'],
    ['#/alumno/A001', '#v-alumno .cabecera'],
    ['#/ajustes', '#aj-buscar']
  ];
  for (const [hash, sel] of RUTAS) {
    await ir(pg, hash, sel);
    chk(log.consola.length === 0, `${hash}: sin errores de consola ni de política de seguridad ${log.consola.join(' | ')}`);
  }
  // La marca de las casillas es una imagen incrustada (data:).
  await ir(pg, '#/alumno/A001/compartir', '#cp-vista');
  const marca = await pg.evaluate(() => getComputedStyle(document.querySelector('#cp-c-nombre')).backgroundImage);
  chk(/^url\("data:image\/svg\+xml/.test(marca), 'la marca de las casillas es una imagen data:');
  // Los iconos de la app (los pide el navegador con la política puesta) se sirven bien.
  for (const f of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']) {
    const ok = await pg.evaluate(async u => (await fetch(u)).ok, BASE + f);
    chk(ok, `${f} se sirve`);
  }
  igual(log.externas, [], 'ninguna petición a otro sitio');
  igual(fallos, [], 'ningún recurso de la propia web falla');
  await ctx.close();
}

console.log('2b. Conectado: el formulario de ofertas (flecha de los desplegables, data:) sin errores de política');
{
  const { pg, log, ctx } = await entrar({ script: true });
  await ir(pg, '#/oferta/nueva', '#of-f-empresa');
  const flecha = await pg.evaluate(() => getComputedStyle(document.querySelector('.campo-form select')).backgroundImage);
  chk(/^url\("data:image\/svg\+xml/.test(flecha), 'la flecha de los desplegables es una imagen data:');
  chk(log.consola.length === 0, 'sin errores de consola ni de política de seguridad ' + log.consola.join(' | '));
  await ctx.close();
}

console.log('3. Una foto por https de otro sitio NO se carga: se ven las iniciales');
{
  const { pg, log, ctx } = await entrar();
  const FOTO = 'https://fotos.ejemplo.invalid/a001.jpg';
  // Playwright cuenta como «petición» también la que el navegador bloquea antes de enviarla: se separan las que llegaron a salir de las bloqueadas por la política.
  const salieron = [], bloqueadas = [];
  pg.on('response', r => { if (!r.url().startsWith(BASE)) salieron.push(r.url()); });
  pg.on('requestfailed', r => { if (/csp/i.test(r.failure()?.errorText || '')) bloqueadas.push(r.url()); });
  await pg.route('**/datos-mock/Alumnos.csv', async r => {
    const res = await r.fetch();
    const cuerpo = (await res.text()).split('\n').map(l => (l.startsWith('A001,') ? l.replace(',iniciales,', `,${FOTO},`) : l)).join('\n');
    await r.fulfill({ response: res, body: cuerpo });
  });
  await ir(pg, '#/alumno/A001', '#v-alumno .cabecera');
  const csv = await pg.evaluate(async () => (await (await fetch('datos-mock/Alumnos.csv')).text()).split('\n').find(l => l.startsWith('A001,')));
  chk(csv.includes('fotos.ejemplo.invalid'), 'el alumno A001 tiene una foto https en los datos de esta prueba');
  const imagenes = await pg.evaluate(() => document.querySelectorAll('img').length);
  igual(imagenes, 0, 'no queda ningún <img> en la pantalla (la foto bloqueada se sustituye por las iniciales)');
  chk(await pg.evaluate(() => !!document.querySelector('#v-alumno .avatar')?.textContent.trim()), 'el avatar enseña las iniciales');
  igual(salieron, [], 'ninguna petición ha llegado a salir hacia otro sitio');
  igual([...new Set(bloqueadas)], [FOTO], 'la foto la ha bloqueado la política de seguridad (error «csp»), antes de enviar nada');
  chk(log.consola.some(m => /Content Security Policy|Refused to load the image/i.test(m)), 'la política de seguridad es quien la ha bloqueado');
  await ctx.close();
}

await terminar();
