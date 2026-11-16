// Pruebas de la lectura de programas y su agrupación (funciones puras: sin navegador).
import { aListas } from '../../js/data/tablas.js';
import { LISTAS, ALIAS_LISTAS } from '../../js/data/esquema.js';
import { agruparProgramas } from '../../js/util/programas.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const leer = (cabecera, filas) => aListas({ cabecera, filas }, LISTAS, ALIAS_LISTAS);

console.log('1. Cabecera «Programa» o «Máster» (el Sheet se puede cambiar antes o después de subir la versión)');
const filas = [['MBA en inglés', 'MBA', 'en', 'Finanzas'], ['Máster A', 'Másteres', '', 'Datos'], ['', '', '', 'Otra']];
for (const cab of ['Programa', 'Máster']) {
  const l = leer([cab, 'Categoría del programa', 'Idioma del programa', 'Área'], filas);
  igual(l.masters, ['MBA en inglés', 'Máster A'], `cabecera «${cab}»: los nombres`);
  igual(l.programas, [{ nombre: 'MBA en inglés', categoria: 'MBA', idioma: 'en' }, { nombre: 'Máster A', categoria: 'Másteres', idioma: '' }], `cabecera «${cab}»: programas con su categoría e idioma`);
  igual(l.areas, ['Finanzas', 'Datos', 'Otra'], `cabecera «${cab}»: el resto de listas sigue igual`);
}
igual(leer(['Máster', 'Programa', 'Área'], [['Viejo', 'Nuevo', 'X']]).masters, ['Nuevo'], 'si están las dos, manda «Programa»');
igual(leer(['Área'], [['X']]).programas, [], 'sin columna de programas: lista vacía, sin fallar');
igual(leer(['Programa'], [['Solo nombre']]).programas, [{ nombre: 'Solo nombre', categoria: '', idioma: '' }], 'sin columnas de categoría ni idioma: vacías');
igual(leer(['Programa', 'Categoría del programa'], [['A', 'X'], ['A', 'Y']]).programas.length, 1, 'un programa repetido cuenta una vez');
igual(leer(['Programa', 'Categoría del programa'], [['  A  ', '  X  ']]).programas, [{ nombre: 'A', categoria: 'X', idioma: '' }], 'se recortan los espacios');

console.log('2. Agrupar por categoría');
const P = (nombre, categoria, alumnos = 0, enLista = true) => ({ nombre, categoria, idioma: '', enLista, alumnos });
const g = agruparProgramas([P('a', 'Másteres', 2), P('b', 'Ejecutiva'), P('c', 'Másteres', 1), P('d', 'Jugadores')]);
igual(g.map(x => x.categoria), ['Másteres', 'Ejecutiva', 'Jugadores'], 'las categorías, en el orden de Listas');
igual(g[0].programas.map(p => p.nombre), ['a', 'c'], 'los programas de una categoría, en su orden');
igual(g.map(x => x.alumnos), [3, 0, 0], 'alumnos por categoría (los programas con 0 alumnos salen igual)');
// v27: la categoría MBA va la primera; el resto conserva el orden de Listas; «Otros programas» sigue al final.
const gm = agruparProgramas([P('a', 'Másteres', 2), P('b', 'Jugadores'), P('c', 'MBA', 1), P('d', 'Suelto', 0, false)]);
igual(gm.map(x => x.categoria), ['MBA', 'Másteres', 'Jugadores', 'Otros programas'], 'MBA va la primera, el resto en el orden de Listas y «Otros programas» al final');
igual(agruparProgramas([P('c', 'mba ', 1), P('a', 'Másteres')]).map(x => x.categoria), ['mba ', 'Másteres'], 'MBA se reconoce sin fijarse en mayúsculas ni espacios');
igual(agruparProgramas([P('a', 'Másteres'), P('b', 'Jugadores')]).map(x => x.categoria), ['Másteres', 'Jugadores'], 'sin categoría MBA no cambia nada');
chk(g.every(x => x.otros === false), 'ninguno es «otros»');
const h = agruparProgramas([P('a', 'MBA', 1), P('x', '', 0), P('y', '', 4, false), P('z', 'MBA', 1, false)]);
igual(h.map(x => x.categoria), ['MBA', 'Otros programas'], 'sin categoría o fuera de Listas: grupo «Otros programas» al final');
igual(h[1].programas.map(p => p.nombre), ['x', 'y', 'z'], 'y ahí están los tres');
chk(h[1].otros === true && h[1].alumnos === 5, '«otros» está marcado y cuenta sus alumnos');
igual(agruparProgramas([]), [], 'sin programas: sin grupos');

console.log('3. Todos los módulos de js/ están en la lista de archivos de sw.js (si falta uno, la app no funciona sin conexión)');
{
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  const hay = d => fs.readdirSync(path.join(raiz, d), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? hay(d + '/' + e.name) : [d + '/' + e.name]));
  igual(hay('js').filter(f => f.endsWith('.js')).filter(f => !sw.includes(`'./${f}'`)), [], 'ningún módulo de js/ falta en sw.js');
  igual([...sw.matchAll(/'\.\/(js\/[^']+)'/g)].map(m => m[1]).filter(f => !fs.existsSync(path.join(raiz, f))), [], 'sw.js no nombra archivos que ya no existen');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
