// Pruebas de los CSV para importar al Sheet (docs/importar-hoja): son los mismos datos que usa la demo y encajan con las hojas y columnas que lee la app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos, aReglasMatch } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';
import { lista } from '../../js/util/match.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const leer = f => fs.readFileSync(path.join(RAIZ, f));
const tabla = f => { const filas = leerCSV(leer(f).toString('utf8')); return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) }; };
// Los archivos van sin tildes ni espacios (paises.csv); la hoja del Sheet se llama con tilde y se renombra al importar (lo dice PASOS.md).
const archivo = hoja => hoja.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
const DEMO = { paises: 'Paises', areas: 'Areas', afinidad: 'Afinidad', reglas: 'ReglasMigratorias', etiquetas: 'Etiquetas' };

console.log('1. Cada hoja nueva: tiene su archivo (sin tildes ni espacios) y es igual que el de la demo');
for (const [clave, { hoja }] of Object.entries(E.HOJAS_MATCH)) {
  const f = `docs/importar-hoja/${archivo(hoja)}.csv`;
  chk(fs.existsSync(path.join(RAIZ, f)), `existe ${f} (la hoja se llama «${hoja}»)`);
  chk(Buffer.compare(leer(f), leer(`datos-mock/${DEMO[clave]}.csv`)) === 0, `${hoja}: idéntico a datos-mock/${DEMO[clave]}.csv`);
  const t = tabla(f);
  igual(t.cabecera, Object.values(E.HOJAS_MATCH[clave].columnas), `${hoja}: las columnas se llaman justo como las lee la app`);
}

console.log('2. Columnas nuevas de Alumnos y Ofertas');
for (const [hoja, opc, esquema, nuevas] of [['Alumnos', E.ALUMNO_OPC, E.ALUMNO, 'alumnos-columnas-nuevas'], ['Ofertas', E.OFERTA_OPC, E.OFERTA, 'ofertas-columnas-nuevas']]) {
  const demo = tabla(`datos-mock/${hoja}.csv`), imp = tabla(`docs/importar-hoja/${nuevas}.csv`);
  igual(imp.cabecera, [Object.keys(esquema)[0], ...Object.keys(opc)], `${nuevas}: el ID y las columnas nuevas, con el nombre exacto que lee la app`);
  igual(imp.filas.length, demo.filas.length, `${nuevas}: una fila por ${hoja.toLowerCase().slice(0, -1)}`);
  const idx = demo.cabecera.indexOf(Object.keys(opc)[0]);
  igual(demo.cabecera.slice(idx), Object.keys(opc), `${hoja}: en datos-mock las columnas nuevas van al FINAL, en ese orden`);
  igual(imp.filas.every((f, i) => f[0] === demo.filas[i][0] && f.slice(1).every((v, j) => v === demo.filas[i][idx + j])), true, `${nuevas}: cada fila coincide con datos-mock (mismo orden de IDs)`);
}

console.log('3. Todo lo que usan los alumnos y las ofertas mock está en las hojas de listas');
{
  const m = aReglasMatch(Object.fromEntries(Object.entries(DEMO).map(([k, f]) => [k, tabla(`datos-mock/${f}.csv`)])), E.HOJAS_MATCH);
  const al = aObjetos('Alumnos', tabla('datos-mock/Alumnos.csv'), E.ALUMNO, E.ALUMNO_OPC), of = aObjetos('Ofertas', tabla('datos-mock/Ofertas.csv'), E.OFERTA, E.OFERTA_OPC);
  const etiq = new Set(m.etiquetas.map(e => e.etiqueta)), subs = new Set(m.areas.map(a => a.subarea)), areas = new Set(m.areas.map(a => a.area));
  igual([...new Set([...al, ...of].flatMap(x => lista(x.etiquetas)))].filter(e => !etiq.has(e)), [], 'todas las etiquetas usadas están en la hoja Etiquetas (escritas igual)');
  igual([...new Set([...al.flatMap(a => lista(a.subareasExperiencia)), ...of.map(o => o.subarea).filter(Boolean)])].filter(s => !subs.has(s)), [], 'todas las subáreas usadas están en la hoja Áreas');
  igual([...new Set([...al.flatMap(a => [a.areaDestino, a.areaExperiencia]), ...of.map(o => o.area)])].filter(a => !areas.has(a)), [], 'todas las áreas de alumnos y ofertas tienen subáreas en la hoja Áreas');
  const necesarias = []; const nombres = [...areas];
  for (let i = 0; i < nombres.length; i++) for (let j = i + 1; j < nombres.length; j++) necesarias.push([nombres[i], nombres[j]].sort().join('|'));
  const hay = new Set(m.afinidad.map(f => [f.a, f.b].sort().join('|')));
  igual(necesarias.filter(k => !hay.has(k)), [], `la hoja Afinidad tiene las ${necesarias.length} parejas de áreas (ninguna sin decir)`);
  igual([...new Set(m.reglas.map(r => r.situacion))].sort(), ['Ciudadano UE o español', 'Necesita permiso de trabajo', 'Permiso de estudiante', 'Residente con permiso de trabajo'], 'las reglas cubren las 4 situaciones de la lista «Situación de trabajo en España»');
}

console.log('4. Los pasos para el Sheet');
{
  const t = leer('docs/importar-hoja/PASOS.md').toString('utf8');
  for (const hoja of Object.values(E.HOJAS_MATCH).map(h => h.hoja)) chk(t.includes(`${archivo(hoja)}.csv`) && t.includes(`hoja **${hoja}**`), `PASOS.md nombra ${archivo(hoja)}.csv y dice que la hoja se llama «${hoja}»`);
  chk(t.includes('alumnos-columnas-nuevas.csv') && t.includes('ofertas-columnas-nuevas.csv'), 'PASOS.md nombra los dos archivos de columnas nuevas');
  chk(t.includes('No hace falta tocar la hoja Listas'), 'PASOS.md deja claro que Listas no se toca');
}

console.log('5. Sin conexión: todos los archivos de datos-mock están en la lista del service worker');
{
  const sw = leer('sw.js').toString('utf8');
  igual(fs.readdirSync(path.join(RAIZ, 'datos-mock')).filter(f => f.endsWith('.csv')).filter(f => !sw.includes(`'./datos-mock/${f}'`)), [], 'ningún CSV de datos-mock falta en sw.js (si falta uno, la demo no abre sin conexión)');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
