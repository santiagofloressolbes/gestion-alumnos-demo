// v29, parte 5: ni claves, ni direcciones reales, ni datos personales en el repositorio.
// Recorre TODOS los archivos de texto del repositorio (los de Git y los nuevos aún sin subir; no los ignorados) y comprueba:
//   · ninguna dirección de script de Google que no sea de prueba (la de las pruebas lleva «TEST» dentro), ni enlace a un Sheet o a un archivo de Drive;
//   · ninguna clave, token o clave privada con la forma de las conocidas, ni una clave escrita a mano en el código;
//   · en el código solo se nombran los dominios que la app necesita (los mismos que su política de seguridad);
//   · en los documentos y en los CSV de datos, solo dominios permitidos (documentación de GitHub, example.com);
//   · ningún correo fuera de las pruebas, ni la dirección de GitHub Pages del proyecto, ni el nombre del responsable
//     (en los documentos se le llama «el responsable del proyecto»).
// Y que los detectores funcionan: se les pasan muestras inventadas con trampa y tienen que saltar.
// Funciones puras sobre texto: sin navegador.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const YO = 'tests/app/sin-secretos.prueba.mjs';   // este archivo nombra los patrones prohibidos: no se mira a sí mismo

/* ---------- Los detectores (funciones puras: reciben el texto y la ruta, devuelven los problemas) ---------- */

const BINARIOS = /\.(png|jpe?g|gif|ico|woff2?|ttf|pdf|zip)$/i;
const esPrueba = f => f.startsWith('tests/');
const esCodigo = f => /^(js|css)\//.test(f) || ['index.html', 'sw.js', 'manifest.webmanifest', 'docs/apps-script/Code.gs'].includes(f);
const esDocumento = f => /\.md$/i.test(f);
const esDatos = f => /^(datos-mock|docs\/importar-sheet)\/.*\.csv$/i.test(f);

const DOMINIOS_CODIGO = ['script.google.com', 'script.googleusercontent.com', 'www.w3.org', 'example.com'];
const DOMINIOS_DOCUMENTOS = ['docs.github.com', 'example.com', 'script.google.com'];
const DOMINIOS_DATOS = ['example.com'];

const dominiosDe = texto => [...texto.matchAll(/https?:\/\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)].map(m => m[1].toLowerCase());

// ¿La palabra está dentro de un texto entre comillas de su línea («? 'Ocultar la clave' : 'Mostrar la clave'»)? Entonces no es un nombre de campo.
const dentroDeTexto = (texto, indice) => { const antes = texto.slice(texto.lastIndexOf('\n', indice) + 1, indice); return ["'", '"', '`'].some(q => (antes.split(q).length - 1) % 2 === 1); };

export function problemas(ruta, texto) {
  const p = [];
  const hay = (re, msg) => { const m = texto.match(re); if (m) p.push(`${msg}: «${m[0].slice(0, 60)}»`); };

  // Direcciones de script de Google: solo las de prueba (con «TEST»), y nunca fuera de las pruebas.
  for (const m of texto.matchAll(/AKfycb[A-Za-z0-9_-]+/g)) if (!(esPrueba(ruta) && /TEST/.test(m[0]))) p.push(`identificador de script de Google que no es de prueba: «${m[0].slice(0, 40)}»`);
  for (const m of texto.matchAll(/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]{20,})/g)) if (!(esPrueba(ruta) && /TEST/.test(m[1]))) p.push(`dirección de script de Google con identificador real: «${m[0].slice(0, 60)}»`);
  // Sheets y archivos de Drive
  hay(/docs\.google\.com\/(spreadsheets|document|forms|presentation)\/d\/[A-Za-z0-9_-]{15,}/, 'enlace a un documento de Google');
  hay(/drive\.google\.com\/(file\/d|open\?id=|drive\/folders)\/?[A-Za-z0-9_=-]{15,}/, 'enlace a un archivo de Drive');
  hay(/(?:1[A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/, 'identificador con la forma de un Sheet de Google (44 caracteres)');
  // Claves y tokens con formas conocidas
  hay(/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY/, 'clave privada');
  hay(/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'token de GitHub');
  hay(/\bgithub_pat_[A-Za-z0-9_]{30,}/, 'token de GitHub');
  hay(/\bAIza[0-9A-Za-z_-]{30,}/, 'clave de API de Google');
  hay(/\bya29\.[0-9A-Za-z_-]{20,}/, 'token de acceso de Google');
  hay(/\bsk-[A-Za-z0-9]{20,}/, 'clave de API');
  hay(/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'token de Slack');
  hay(/\bAKIA[0-9A-Z]{16}\b/, 'clave de acceso de AWS');
  // Una clave escrita a mano en el código (en las pruebas hay claves de mentira a propósito)
  if (!esPrueba(ruta)) {
    // Un nombre de campo («clave: 'tipoOrganizacion'») no es una clave: se exige que el valor parezca una (con cifras, espacios o varias mayúsculas).
    for (const m of texto.matchAll(/\b(?:clave|key|secret|token|password|contrase[ñn]a)\b['"`]?\s*[:=]\s*['"`]([^'"`\n]{12,})['"`]/gi)) if ((/\d|\s/.test(m[1]) || (m[1].match(/[A-Z]/g) || []).length >= 2) && !dentroDeTexto(texto, m.index)) p.push(`una clave escrita a mano: «${m[0].slice(0, 60)}»`);
    hay(/frase larga de prueba solo para el simulador/, 'la clave de las pruebas fuera de tests/');
  }
  // Correos: solo dentro de las pruebas (con direcciones inventadas)
  if (!esPrueba(ruta)) hay(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/, 'una dirección de correo');
  // La dirección de GitHub Pages del proyecto y el nombre real del responsable
  hay(/[a-z0-9-]+\.github\.io\b/i, 'una dirección de GitHub Pages (usa «<usuario>.github.io» como marcador)');
  hay(/santiago|floressolbes|flores solbes/i, 'el nombre del responsable (en los documentos es «el responsable del proyecto»)');
  // Dominios: cada tipo de archivo, los suyos
  const permitidos = esCodigo(ruta) ? DOMINIOS_CODIGO : esDocumento(ruta) ? DOMINIOS_DOCUMENTOS : esDatos(ruta) ? DOMINIOS_DATOS : null;
  if (permitidos) for (const d of new Set(dominiosDe(texto))) if (!permitidos.includes(d)) p.push(`dominio no permitido en ${esCodigo(ruta) ? 'el código' : esDocumento(ruta) ? 'un documento' : 'un CSV de datos'}: «${d}»`);
  return p;
}

/* ---------- Los archivos ---------- */

const lista = () => {
  try {
    const sal = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return sal.split('\0').filter(Boolean);
  } catch { return null; }
};
const archivos = (lista() || []).filter(f => !BINARIOS.test(f) && fs.existsSync(path.join(RAIZ, f)) && f !== YO && !/package-lock\.json$/.test(f));

console.log('1. Los detectores saltan con muestras inventadas (si no saltaran, la prueba no serviría)');
{
  const falso = 'AKfycb' + 'X'.repeat(30), hoja = '1' + 'a'.repeat(43);
  chk(problemas('js/x.js', `const u = 'https://script.google.com/macros/s/${falso}/exec'`).length >= 2, 'una dirección de script con identificador real salta (dos veces: identificador y dirección)');
  chk(problemas('docs/x.md', `https://script.google.com/macros/s/${falso}/exec`).length >= 1, '... también en un documento');
  chk(problemas('tests/x.mjs', 'https://script.google.com/macros/s/AKfycbTESTTESTTESTTESTTEST12345/exec').length === 0, 'la dirección de prueba («TEST») es válida en las pruebas');
  chk(problemas('js/x.js', 'https://script.google.com/macros/s/AKfycbTESTTESTTESTTESTTEST12345/exec').length >= 1, '... pero no en el código');
  chk(problemas('docs/x.md', `mira https://docs.google.com/spreadsheets/d/${hoja}/edit`).length >= 1, 'un enlace a un Sheet salta');
  chk(problemas('docs/x.md', `id ${hoja} en un párrafo`).length >= 1, 'un identificador con forma de Sheet suelto salta');
  chk(problemas('docs/x.md', 'https://drive.google.com/file/d/' + 'b'.repeat(25) + '/view').length >= 1, 'un enlace a Drive salta');
  chk(problemas('js/x.js', 'const clave = "unaClaveMuyLargaDeVerdad99";').length >= 1, 'una clave escrita a mano en el código salta');
  chk(problemas('js/x.js', "const CLAVE: 'frase larga de prueba solo para el simulador 4821'").length >= 1, 'la clave de las pruebas escrita en el código salta');
  chk(problemas('tests/x.mjs', 'const clave = "unaClaveMuyLargaDeVerdad99";').length === 0, '... pero en las pruebas hay claves de mentira a propósito');
  chk(problemas('js/x.js', "clave: ''").length === 0 && problemas('js/x.js', 'const clave = campo.value;').length === 0, 'un campo vacío o una variable no son claves');
  chk(problemas('README.md', 'escribe a ana@dominio.es').length >= 1 && problemas('tests/x.mjs', 'ana@dominio.es').length === 0, 'un correo salta fuera de las pruebas y se admite dentro');
  chk(problemas('README.md', 'https://alguien.github.io/repo/').length >= 1, 'una dirección de GitHub Pages salta');
  chk(problemas('docs/x.md', 'sube a <usuario>.github.io/<repositorio>').length === 0, '... pero el marcador «<usuario>.github.io» es válido');
  chk(problemas('DECISIONES.md', 'Decisión de Santiago').length >= 1 && problemas('DECISIONES.md', 'Decisión del responsable del proyecto').length === 0, 'el nombre del responsable salta');
  chk(problemas('docs/x.md', 'https://mi-sitio-interno.empresa.local/wiki').length >= 1, 'un dominio que no está permitido en un documento salta');
  chk(problemas('js/x.js', "fetch('https://api.otro-servicio.com/datos')").length >= 1, 'un dominio nuevo en el código salta');
  chk(problemas('datos-mock/Alumnos.csv', 'https://linkedin.com/in/alguien').length >= 1 && problemas('datos-mock/Alumnos.csv', 'https://example.com/cv/A001').length === 0, 'un CSV de datos solo admite example.com');
  chk(problemas('js/x.js', '-----BEGIN PRIVATE KEY-----').length >= 1 && problemas('js/x.js', 'ghp_' + 'a'.repeat(36)).length >= 1 && problemas('js/x.js', 'AIza' + 'b'.repeat(35)).length >= 1, 'claves privadas y tokens conocidos saltan');
  chk(problemas('docs/x.md', 'Más en https://docs.github.com/en/pages').length === 0 && problemas('js/x.js', "xmlns 'http://www.w3.org/2000/svg'").length === 0, 'los dominios permitidos no saltan');
}

console.log('2. Todos los archivos del repositorio');
{
  chk(archivos.length > 100, `se miran ${archivos.length} archivos de texto (los de Git y los nuevos, sin los ignorados ni los binarios)`);
  const todos = {};
  for (const f of archivos) { const t = fs.readFileSync(path.join(RAIZ, f), 'utf8'); const p = problemas(f, t); if (p.length) todos[f] = p; }
  igual(todos, {}, 'ningún archivo tiene claves, direcciones reales, correos, la URL de GitHub Pages ni el nombre del responsable');
  igual(archivos.filter(f => /(^|\/)\.env|\.(pem|key|p12|pfx|keystore)$|(^|\/)id_(rsa|ed25519)/i.test(f)), [], 'ningún archivo de claves (.env, .pem, .key…)');
  const ign = fs.existsSync(path.join(RAIZ, '.gitignore')) ? fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8') : '';
  igual(['.env', '*.pem', '*.key', 'datos-reales/'].filter(x => !ign.split('\n').map(l => l.trim()).includes(x)), [], '.gitignore deja fuera los archivos de claves (.env, .pem, .key) y la carpeta de datos reales');
}

console.log('3. El código solo habla con quien la política de seguridad permite');
{
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  const connect = (csp.match(/connect-src ([^;]+)/) || [])[1] || '';
  igual(connect.split(/\s+/).sort(), ["'self'", 'https://script.google.com', 'https://script.googleusercontent.com'], 'connect-src: solo la propia web y los dos dominios del script de Google');
  chk(/default-src 'none'/.test(csp) && /script-src 'self'/.test(csp), "la política parte de default-src 'none' y solo permite scripts propios");
  const dominiosJs = new Set(archivos.filter(f => /^js\//.test(f)).flatMap(f => dominiosDe(fs.readFileSync(path.join(RAIZ, f), 'utf8'))));
  igual([...dominiosJs].filter(d => !DOMINIOS_CODIGO.includes(d)).sort(), [], 'ningún archivo de js/ nombra otro dominio');
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  chk(!/https?:\/\//.test(sw), 'el service worker no nombra ninguna dirección externa');
  const man = fs.readFileSync(path.join(RAIZ, 'manifest.webmanifest'), 'utf8');
  chk(!/https?:\/\//.test(man), 'el manifest no nombra ninguna dirección externa');
}

console.log('4. Los datos de ejemplo y los documentos');
{
  const datos = archivos.filter(esDatos), docs = archivos.filter(esDocumento);
  chk(datos.length >= 15 && docs.length >= 8, `se han mirado ${datos.length} CSV de datos y ${docs.length} documentos`);
  const enlacesDatos = datos.flatMap(f => (fs.readFileSync(path.join(RAIZ, f), 'utf8').match(/https?:\/\/[^\s,"]+/g) || []));
  chk(enlacesDatos.length >= 100 && enlacesDatos.every(u => /^https:\/\/example\.com\//.test(u)), `los ${enlacesDatos.length} enlaces de los CSV de datos son todos de example.com`);
  const publicos = ['README.md', 'DECISIONES.md', 'docs/TECNICO.md', 'docs/apps-script/GUIA.md', 'docs/importar-sheet/PASOS.md', 'docs/PREGUNTAS-TI.md', 'docs/PREPARAR-LALIGA.md', 'docs/VISIBILIDAD-REPO.md', 'docs/REGLAS-MATCH.md', 'docs/FUNCIONAMIENTO.md'];
  igual(publicos.filter(f => !fs.existsSync(path.join(RAIZ, f))), [], 'existen los diez documentos públicos');
  const sinAviso = publicos.filter(f => !/No afiliado a LaLiga/i.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')) && f !== 'docs/importar-sheet/PASOS.md' && f !== 'docs/REGLAS-MATCH.md' && f !== 'docs/apps-script/GUIA.md');
  igual(sinAviso, [], 'los documentos principales llevan el aviso «No afiliado a LaLiga»');
  const readme = fs.readFileSync(path.join(RAIZ, 'README.md'), 'utf8');
  chk(!/https?:\/\//.test(readme), 'el README no lleva ninguna dirección web (ni la de GitHub Pages)');
  chk(/responsable del proyecto/.test(fs.readFileSync(path.join(RAIZ, 'DECISIONES.md'), 'utf8')), 'DECISIONES.md habla de «el responsable del proyecto»');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
