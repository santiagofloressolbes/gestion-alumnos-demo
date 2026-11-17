// v30: el vocabulario aprobado. Ningún texto que ve la persona usa las palabras viejas (Sheet, Code.gs, hoja Listas, «aplica»,
// «difundir», «salta», «No indicado», «No encaja»…). Dos partes:
//   1. Estática: todas las cadenas con texto de js/ e index.html (sin comentarios).
//   2. En el navegador: el texto de las pantallas de verdad (con los datos de ejemplo), también lo que está dentro de los «Por qué».
// Excepciones (justificadas, ver EXCEPCIONES): identificadores y valores de datos que NO son texto para la persona.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Palabras viejas. Se comparan sin mayúsculas ni tildes.
// «No aplica» (rótulo del criterio del match: la oferta no pide eso) es el único «aplica» que se queda.
const sin = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/no aplica\b/g, 'no corresponde');
const PROHIBIDAS = [
  ['Sheet', /\bsheets?\b/],
  ['Code.gs', /code\.gs/],
  ['«hoja Listas / Alumnos / Países…»', /\bhoja (listas|alumnos|paises|areas|afinidad|etiquetas|reglas|rondas|aplicaciones|historial)\b/],
  ['«el script»', /\bel script\b/],
  ['«aplica / aplicar / aplicado» (usa solicitar)', /\baplic(a|an|ar|ado|ada|ados|adas|o)\b/],
  ['«difundir / difundidas» (usa enviar)', /difund/],
  ['«salta» (usa «se avisa»)', /\bsalt(a|an|e)\b/],
  ['«No indicado» (usa «Sin dato»)', /no indicado/],
  ['«No encaja» (usa «Encaja poco»)', /\bno encaja(n)?\b/],
  ['«No cumple» (usa «No coincide»)', /\bno cumple\b/],
  ['«Sin datos» (usa «Sin dato»)', /\bsin datos\b/],
  ['«Etiquetas» (usa «Habilidades»)', /\betiquetas?\b/],
  ['«historia» (usa «resumen del perfil»)', /\bhistoria\b/],
  ['«Aplica a todo»', /aplica a todo/],
  ['«acércate» (usa «escríbeme y lo hablamos»)', /\bacercate\b/],
  ['«Si te gustaría»', /si te gustaria/],
  ['«come and see me»', /come and see me/],
  ['«(sin título)» / «Sin estado»', /\(sin titulo\)|\bsin estado\b/],
  ['«Te escribo para decirte»', /te escribo para decirte/],
];

// Cadenas que pueden contener una palabra de la lista y NO son texto para la persona o son datos de su hoja.
// [archivo (o parte), fragmento de la cadena (sin tildes y en minúsculas), por qué]
const EXCEPCIONES = [
  ['util/match.js', 'no cumple', 'valor de la columna «Resultado» de la hoja de reglas migratorias (dato de la hoja, no texto de la app)'],
  ['util/match.js', 'usa cumple, revisar o no cumple', 'dice a quien mantiene la hoja qué valores existen (son los de la hoja)'],
  ['data/esquema.js', 'etiquetas', 'nombre de la hoja y de la columna en los datos'],
  ['data/config.js', 'etiquetas', 'nombre de la hoja en los datos'],
  ['data/tablas.js', 'etiquetas', 'nombre de la hoja y de la columna en los datos'],
  ['data/index.js', 'etiquetas', 'nombre de la hoja y de la columna en los datos'],
  ['data/fuente-apps-script.js', 'hoja', 'error técnico: nombra la hoja que falta para quien administra la app'],
];

/* ---- 1. Estática ---- */

// Lee un archivo y devuelve las cadenas de texto (sin comentarios). Las expresiones de dentro de `${}` se recorren también.
function cadenas(src) {
  const salida = [];
  let i = 0;
  const n = src.length;
  function plantilla() {   // tras el ` de apertura; termina en el ` de cierre
    let buf = '';
    while (i < n) {
      const c = src[i];
      if (c === '\\') { buf += src[i + 1] ?? ''; i += 2; continue; }
      if (c === '`') { i++; salida.push(buf); return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; codigo(true); continue; }
      buf += c; i++;
    }
  }
  function codigo(dentro) {   // hasta el } que cierra la expresión (si dentro) o el final
    let llaves = 0;
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (c === "'" || c === '"') {
        let buf = ''; i++;
        while (i < n && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') { buf += src[i + 1] ?? ''; i += 2; } else buf += src[i++]; }
        i++; salida.push(buf); continue;
      }
      if (c === '`') { i++; plantilla(); continue; }
      if (c === '/' && /[=(,:;!&|?{}\[]\s*$/.test(src.slice(Math.max(0, i - 40), i))) {   // expresión regular: se salta entera
        i++;
        while (i < n && src[i] !== '/' && src[i] !== '\n') { if (src[i] === '\\') i++; else if (src[i] === '[') { while (i < n && src[i] !== ']') { if (src[i] === '\\') i++; i++; } } i++; }
        i++; continue;
      }
      if (c === '{') llaves++;
      if (c === '}') { if (dentro && llaves === 0) { i++; return; } llaves--; }
      i++;
    }
  }
  codigo(false);
  return salida;
}

function archivos(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? archivos(path.join(dir, e.name), ext) : e.name.endsWith(ext) ? [path.join(dir, e.name)] : []);
}

console.log('1. Estática: ningún texto de js/ ni de index.html usa las palabras viejas');
{
  const hallazgos = [];
  let total = 0, conTexto = 0;
  for (const f of archivos(path.join(RAIZ, 'js'), '.js')) {
    const rel = path.relative(path.join(RAIZ, 'js'), f).replace(/\\/g, '/');
    const lista = cadenas(fs.readFileSync(f, 'utf8'));
    total += lista.length;
    for (const c of lista) {
      if (!/\s/.test(c.trim())) continue;   // «texto» = lleva espacios; los identificadores y rutas no (p. ej. 'aplica-a-todo', 'v-aplicacion')
      conTexto++;
      const t = sin(c);
      for (const [nombre, re] of PROHIBIDAS) {
        if (!re.test(t)) continue;
        if (EXCEPCIONES.some(([a, frag]) => rel.includes(a) && t.includes(frag))) continue;
        hallazgos.push(`${rel}: ${nombre} en «${c.slice(0, 70)}»`);
      }
    }
  }
  // index.html: el texto entre etiquetas y los atributos de texto
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const visiblesHtml = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1]).concat([...html.matchAll(/(?:aria-label|title|alt|placeholder)="([^"]+)"/g)].map(m => m[1])).concat([...html.matchAll(/<title>([^<]+)<\/title>/g)].map(m => m[1]));
  for (const c of visiblesHtml) for (const [nombre, re] of PROHIBIDAS) if (re.test(sin(c))) hallazgos.push(`index.html: ${nombre} en «${c.slice(0, 70)}»`);
  chk(total > 800 && conTexto > 400, `se han leído ${total} cadenas, ${conTexto} con texto (si fueran pocas, el lector estaría roto)`);
  chk(hallazgos.length === 0, `sin palabras viejas en el código${hallazgos.length ? ': ' + hallazgos.slice(0, 8).join(' | ') : ''}`);
  // El detector funciona: una muestra con cada palabra vieja salta.
  const muestra = ['Conectar con el Sheet', 'Actualiza Code.gs', 'en la hoja Listas', 'el script de Google', 'Aplica a todo', 'ofertas difundidas', 'Salta si', 'No indicado', 'No encaja', 'No cumple', 'Sin datos', 'Etiquetas del puesto', 'Incluir historia', 'acércate y lo hablamos', 'Si te gustaría', 'come and see me', '(sin título)', 'Sin estado', 'Te escribo para decirte'];
  chk(muestra.every(m => PROHIBIDAS.some(([, re]) => re.test(sin(m)))), 'el detector reconoce una muestra de cada palabra vieja');
  const lectura = cadenas("const a = 'Hola mundo'; // 'comentario con Sheet'\nconst b = `uno ${x ? 'dos tres' : 'cuatro cinco'} seis`; const r = /'x'/.test(a);");
  chk(lectura.includes('Hola mundo') && lectura.includes('dos tres') && lectura.includes('cuatro cinco') && !lectura.some(c => /comentario/.test(c)), 'el lector de cadenas ignora comentarios y entra en las plantillas');
}

/* ---- 2. En el navegador ---- */

console.log('2. En pantalla: el texto que se ve, también el de dentro de «Por qué»');
{
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }, [URL_OK, CLAVE_PRUEBA]);
  const RUTAS = ['#/', '#/master/' + encodeURIComponent('MBA en inglés'), '#/alumno/A001', '#/alumno/A028', '#/buscar', '#/ofertas', '#/oferta/O002', '#/oferta/O004', '#/oferta/O004/compartir',
    '#/oferta/nueva', '#/oferta/O002/editar', '#/oferta/O004/ronda/nueva', '#/oferta/O002/ronda/2/aplicar', '#/aplicacion/AP001', '#/aplicacion/AP001/estado', '#/aplicacion/AP001/correo',
    '#/avisos/sin-solicitudes', '#/avisos/aplica-a-todo', '#/ajustes'];
  const malas = [];
  for (const hash of RUTAS) {
    await t.pg.goto(BASE + hash);
    await t.pg.waitForTimeout(700);
    const textos = [await t.pg.evaluate(() => document.querySelector('#main').textContent.replace(/\s+/g, ' '))];
    if (hash.endsWith('/correo')) {   // el borrador en español y en inglés
      for (const idioma of ['en', 'es']) { await t.pg.check('#co-idioma-' + idioma).catch(() => {}); textos.push(await t.pg.evaluate(() => document.querySelector('#co-vista')?.textContent || '')); }
    }
    // «IA Aplicada a la Industria Deportiva» es el nombre de un programa (un dato), no un texto de la app.
    for (const texto of textos) for (const [nombre, re] of PROHIBIDAS) if (re.test(sin(texto).replace(/ia aplicada a la industria deportiva/g, ''))) malas.push(`${hash}: ${nombre}`);
  }
  chk(malas.length === 0, `ninguna pantalla enseña palabras viejas (${RUTAS.length} pantallas)${malas.length ? ': ' + malas.slice(0, 6).join(' | ') : ''}`);
  await t.ctx.close();
}

await terminar();
