// Ejecuta TODAS las pruebas, una detrás de otra, y al final da un resumen. No se detiene en la primera que falla.
//   node tests/ejecutar-pruebas.mjs            todas
//   node tests/ejecutar-pruebas.mjs ofertas    solo las que lleven «ofertas» en la ruta
// Sale con código 1 si alguna falla (o si no encuentra ninguna). Las pruebas van en serie a propósito: cada una abre su navegador
// y su servidor, y en paralelo algunas dependen del tiempo y se vuelven inestables.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filtro = process.argv[2] || '';
const LINEAS_DE_FALLO = 40;   // cuántas líneas del final de la salida se enseñan cuando una prueba falla

const rutas = [
  ...fs.readdirSync(path.join(RAIZ, 'tests/app')).filter(f => f.endsWith('.prueba.mjs')).sort().map(f => `tests/app/${f}`),
  'tests/apps-script/pruebas.mjs'
].filter(r => r.includes(filtro));

if (!rutas.length) {
  console.error(`No hay ninguna prueba que coincida con «${filtro}».`);
  process.exit(1);
}

const ejecutar = ruta =>
  new Promise(resolver => {
    const inicio = Date.now();
    const hijo = spawn(process.execPath, [ruta], { cwd: RAIZ, env: process.env });
    let salida = '';
    hijo.stdout.on('data', d => (salida += d));
    hijo.stderr.on('data', d => (salida += d));
    hijo.on('error', e => resolver({ ruta, ok: false, salida: String(e), ms: Date.now() - inicio }));
    hijo.on('close', codigo => resolver({ ruta, ok: codigo === 0, codigo, salida, ms: Date.now() - inicio }));
  });

const segundos = ms => (ms / 1000).toFixed(1) + ' s';
const resultados = [];
const inicio = Date.now();

for (const ruta of rutas) {
  const r = await ejecutar(ruta);
  resultados.push(r);
  console.log(`${r.ok ? '✔' : '✖'} ${ruta} (${segundos(r.ms)})`);
  if (!r.ok) console.log(r.salida.trimEnd().split('\n').slice(-LINEAS_DE_FALLO).map(l => '    ' + l).join('\n'));
}

const falladas = resultados.filter(r => !r.ok);
console.log('\n──────── Resumen ────────');
console.log(`Pruebas: ${resultados.length} · bien: ${resultados.length - falladas.length} · mal: ${falladas.length} · tiempo: ${segundos(Date.now() - inicio)}`);
if (falladas.length) {
  console.log('Fallan:');
  for (const r of falladas) console.log('  ✖ ' + r.ruta);
}
process.exit(falladas.length ? 1 : 0);
