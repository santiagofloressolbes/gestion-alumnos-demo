// El validador único de enlaces (js/util/enlaces.js) y los tres sitios que lo usan: el CV, las ofertas y compartir perfiles.
// Regla: solo https, y sin usuario ni contraseña dentro de la dirección. Funciones puras sobre texto: sin navegador.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enlaceHttps, esDeEjemplo } from '../../js/util/enlaces.js';
import { enlaceCV } from '../../js/util/cv.js';
import { enlaceOferta } from '../../js/util/ofertas.js';
import { cvSinHttps, textoPerfiles } from '../../js/util/compartir.js';

let ok = 0,
  mal = 0;
const chk = (c, t) => {
  if (c) ok++;
  else {
    mal++;
    console.log('  ✗ FALLA:', t);
  }
};
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

console.log('1. enlaceHttps: solo https y sin usuario ni contraseña');
{
  const CASOS = [
    ['https://x.org/cv', 'https://x.org/cv'],
    ['HTTPS://X.ORG/cv', 'https://x.org/cv'],
    ['  https://x.org/a b  ', 'https://x.org/a%20b'],
    ['https://x.org:8443/cv?a=1#b', 'https://x.org:8443/cv?a=1#b'],
    ['http://x.org/cv', ''],
    ['HTTP://x.org/cv', ''],
    ['javascript:alert(1)', ''],
    ['JavaScript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['vbscript:x', ''],
    ['file:///etc/passwd', ''],
    ['ftp://x.org', ''],
    ['//x.org/cv', ''],
    ['x.org/cv', ''],
    ['https://', ''],
    ['https:///', ''],
    ['https://usuario@x.org/cv', ''],
    ['https://usuario:clave@x.org/cv', ''],
    ['https://google.com@malo.example/cv', ''],
    ['', ''],
    ['no es un enlace', ''],
    [null, ''],
    [undefined, '']
  ];
  for (const [entrada, esperado] of CASOS) igual(enlaceHttps(entrada), esperado, `«${entrada}» → «${esperado}»`);
}

console.log('2. esDeEjemplo: solo example.com, .org y .net (y sus subdominios)');
{
  for (const h of ['https://example.com/cv/A001', 'https://example.org/', 'https://www.example.net/x']) chk(esDeEjemplo(h), `${h} es de ejemplo`);
  for (const h of ['https://example.com.malo.es/', 'https://miexample.com/', 'https://example.es/']) chk(!esDeEjemplo(h), `${h} NO es de ejemplo`);
}

console.log('3. El botón del CV (enlaceCV)');
{
  igual(enlaceCV({ id: 'A001', enlaceCV: 'https://example.com/cv/A001' }), { href: '#/cv/A001', externo: false }, 'un CV de ejemplo lleva a la página interna');
  igual(enlaceCV({ id: 'A001', enlaceCV: 'https://x.org/cv' }), { href: 'https://x.org/cv', externo: true }, 'un https real se abre fuera');
  for (const u of ['http://x.org/cv', 'javascript:alert(1)', 'data:text/html,x', 'https://usuario:clave@x.org/cv', '', 'no es un enlace', undefined])
    chk(enlaceCV({ id: 'A001', enlaceCV: u }) === null, `sin botón para «${u}»`);
}

console.log('4. El enlace de una oferta (enlaceOferta)');
{
  igual(enlaceOferta('').tipo, 'nada', 'vacío: nada');
  igual(enlaceOferta('https://example.com/oferta/O001').tipo, 'ejemplo', 'de ejemplo: solo texto, no se abre');
  igual(enlaceOferta('https://empresa.es/trabaja').tipo, 'enlace', 'https real: enlace');
  igual(enlaceOferta('https://empresa.es/trabaja').href, 'https://empresa.es/trabaja', '... con su dirección');
  for (const t of ['http://empresa.es/trabaja', 'javascript:alert(1)', 'https://usuario@empresa.es/x', 'Preguntar en recepción']) igual(enlaceOferta(t).tipo, 'texto', `«${t}»: solo texto, nunca enlace`);
}

console.log('5. Compartir perfiles: el CV solo sale si es https limpio');
{
  const alumno = (nombre, cv) => ({ id: 'A1', nombre, apellidos: 'Prueba', master: 'MBA', enlaceCV: cv });
  const bueno = alumno('Ana', 'https://x.org/cv');
  chk(textoPerfiles({ alumnos: [bueno], campos: ['cv'] }).includes('CV: https://x.org/cv'), 'un CV https sale en el texto');
  for (const u of ['http://x.org/cv', 'https://usuario:clave@x.org/cv', 'javascript:alert(1)']) {
    chk(!textoPerfiles({ alumnos: [alumno('Berta', u)], campos: ['cv'] }).includes('CV:'), `«${u}» no sale en el texto`);
    igual(cvSinHttps([alumno('Berta', u)], ['cv']), ['Berta Prueba'], `«${u}»: se avisa de a quién se deja fuera`);
  }
}

console.log('6. Hay un solo validador: cv, ofertas y compartir lo importan y ninguno vuelve a analizar direcciones');
{
  for (const f of ['js/util/cv.js', 'js/util/ofertas.js', 'js/util/compartir.js']) {
    const t = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    chk(/from '\.\/enlaces\.js'/.test(t), `${f} importa util/enlaces.js`);
    chk(!/new URL\(/.test(t) && !/\.protocol/.test(t), `${f} no vuelve a analizar direcciones por su cuenta`);
  }
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  chk(sw.includes("'./js/util/enlaces.js'"), 'sw.js guarda enlaces.js para el modo sin conexión');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
