// Pruebas del desplegable común (v22): TODAS las zonas desplegables de la app usan el mismo componente y el mismo estilo:
// flecha estándar que gira (sin texto «Abierto/Cerrado»), zona táctil de al menos 44 px y estado en aria-expanded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

console.log('1. El código: un solo componente');
{
  const archivos = ['js/vistas', 'js/util', 'js'].flatMap(d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f));
  const conDetails = archivos.filter(f => /el\('details'|createElement\('details'/.test(leer(f)));
  chk(JSON.stringify(conDetails) === JSON.stringify(['js/vistas/desplegable.js']), 'solo desplegable.js crea <details>: ' + conDetails.join(', '));
  chk(!archivos.some(f => /plegable-estado|'Abierto'|'Cerrado'|«Abierto»/.test(leer(f))), 'ningún texto Abierto/Cerrado en el código');
  chk(!/plegable-estado/.test(leer('css/app.css')), 'ni en el CSS');
  const css = leer('css/app.css');
  chk(/\.desplegable>summary::after\{[^}]*rotate\(45deg\)/.test(css) && /\.desplegable\[open\]>summary::after\{[^}]*rotate\(-135deg\)/.test(css), 'una sola flecha en el CSS, que gira al abrir');
  chk(/\.desplegable>summary::-webkit-details-marker\{display:none\}/.test(css), 'el triángulo propio de Safari/iOS está oculto (solo se ve la flecha común)');
  chk(!/\.(filtros|grupo-match|plegable|porque)[^{]*summary::after/.test(css), 'ninguna zona define su propia flecha');
}

const entrar = async (ancho = 390) => {
  const t = await nuevo();
  await t.pg.setViewportSize({ width: ancho, height: 800 });
  await t.pg.addInitScript(([u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c);
    localStorage.setItem('gad.ajustes', '["conexion","avisos","firma","version","diagnostico"]');
    sessionStorage.setItem('ini', '1');
  }, [URL_OK, CLAVE_PRUEBA]);
  return t;
};
// Mira todos los desplegables que hay dentro de "raiz": clase común, flecha, 44 px, aria-expanded, sin texto de estado.
const medir = (pg, raiz) => pg.evaluate(r => [...document.querySelectorAll(r + ' details')].map(d => {
  const s = d.querySelector(':scope > summary');
  const rs = s.getBoundingClientRect();
  return { comun: d.classList.contains('desplegable'), flecha: getComputedStyle(s, '::after').content !== 'none', alto: rs.height, ancho: rs.width, dentro: rs.right <= innerWidth + 0.5 && rs.left >= 0,
    aria: s.getAttribute('aria-expanded'), abierto: d.open, texto: s.textContent, giro: getComputedStyle(s, '::after').transform, marcador: getComputedStyle(s).listStyleType };
}), raiz);
const verificar = async (pg, raiz, nombre, minimo) => {
  const m = await medir(pg, raiz);
  chk(m.length >= minimo, `${nombre}: hay ${m.length} desplegables`);
  chk(m.every(x => x.comun), `${nombre}: todos usan la clase común «desplegable»`);
  chk(m.every(x => x.flecha && x.marcador === 'none'), `${nombre}: todos llevan la flecha estándar y no el triángulo del navegador`);
  chk(m.every(x => x.alto >= 44), `${nombre}: zona táctil de al menos 44 px: ` + m.map(x => Math.round(x.alto)).join(','));
  chk(m.every(x => x.dentro && x.ancho > 100), `${nombre}: la cabecera cabe en la pantalla`);
  chk(m.every(x => x.aria === String(x.abierto)), `${nombre}: aria-expanded dice lo que se ve`);
  chk(m.every(x => !/Abierto|Cerrado/.test(x.texto)), `${nombre}: sin texto Abierto/Cerrado`);
  return m;
};
const alternar = async (pg, sel) => { await pg.click(sel); await pg.waitForTimeout(150); };

for (const ancho of [390, 320]) {
  console.log(`2. Las zonas desplegables a ${ancho} px`);
  const { pg, ctx, log } = await entrar(ancho);

  await pg.goto(BASE + '#/ajustes'); await pg.waitForSelector('#aj-conexion summary');
  await verificar(pg, '#v-ajustes', 'Ajustes', 5);
  await pg.goto(BASE + '#/oferta/O005'); await pg.waitForSelector('#match-alumnos .grupo-match');
  const g = await verificar(pg, '#match-alumnos', 'Grupos del match (ficha de la oferta)', 3);
  chk(g.some(x => x.abierto) && g.some(x => !x.abierto), 'unos grupos empiezan abiertos y otros cerrados, y aria-expanded lo refleja');
  await pg.goto(BASE + '#/alumno/A001'); await pg.waitForSelector('#match-ofertas .grupo-match');
  await verificar(pg, '#match-ofertas', 'Grupos del match (ficha del alumno)', 3);
  await pg.goto(BASE + '#/buscar'); await pg.waitForSelector('#v-buscar details.filtros');
  await verificar(pg, '#v-buscar', 'Filtros de Buscar', 1);
  await pg.goto(BASE + '#/ofertas'); await pg.waitForSelector('#v-ofertas details.filtros');
  await verificar(pg, '#v-ofertas', 'Filtros de Ofertas', 1);

  // «Por qué» dentro de las filas del match
  await pg.goto(BASE + '#/oferta/O005'); await pg.waitForSelector('#match-alumnos .grupo-match');
  await pg.evaluate(() => { for (const d of document.querySelectorAll('#match-alumnos .grupo-match')) d.open = true; });
  await pg.waitForSelector('#match-alumnos details.porque');
  await verificar(pg, '#match-alumnos .fila-match', '«Por qué»', 1);

  console.log(`3. La flecha gira al abrir y se mueve con el teclado (${ancho} px)`);
  await pg.goto(BASE + '#/ajustes'); await pg.waitForSelector('#aj-avisos summary');
  const antes = (await medir(pg, '#aj-avisos'))[0];   // la prueba arranca con todo abierto: se cierra y se vuelve a abrir
  await alternar(pg, '#aj-avisos summary'); await pg.waitForTimeout(250);
  const cerrado = (await medir(pg, '#aj-avisos'))[0];
  await alternar(pg, '#aj-avisos summary'); await pg.waitForTimeout(250);
  const abierto = (await medir(pg, '#aj-avisos'))[0];
  chk(antes.aria === 'true' && cerrado.aria === 'false' && abierto.aria === 'true', 'aria-expanded: true → false → true');
  chk(cerrado.giro !== abierto.giro && antes.giro === abierto.giro, `la flecha gira al abrir y vuelve al cerrar (${cerrado.giro} ↔ ${abierto.giro})`);
  await pg.focus('#aj-firma-tarjeta summary'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
  chk((await medir(pg, '#aj-firma-tarjeta'))[0].aria === 'false', 'Enter cierra y aria-expanded se pone al día');
  await pg.keyboard.press('Space'); await pg.waitForTimeout(150);
  chk((await medir(pg, '#aj-firma-tarjeta'))[0].aria === 'true', 'Espacio abre y aria-expanded se pone al día');
  chk(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll lateral');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}
await terminar();
