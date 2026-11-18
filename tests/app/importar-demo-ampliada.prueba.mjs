// v29, parte 2: los CSV ampliados de docs/importar-hoja (alumnos-demo-ampliada.csv y ofertas-demo-ampliada.csv).
// Son los 30 alumnos y 10 ofertas de siempre (sin tocar) más 20 alumnos (2 por cada programa que no tenía) y 8 ofertas nuevas, todos ficticios.
// Integridad: mismas columnas que lee la app, valores que existen en las hojas Listas, Países, Áreas y Etiquetas, y el match corre sobre todo.
// Funciones puras: sin navegador.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos, aReglasMatch, aListas } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';
import * as M from '../../js/util/match.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const crudo = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const tabla = f => { const filas = leerCSV(crudo(f)); return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) }; };
const DEMO = { paises: 'Paises', areas: 'Areas', afinidad: 'Afinidad', reglas: 'ReglasMigratorias', etiquetas: 'Etiquetas' };

const F_AL = 'docs/importar-hoja/alumnos-demo-ampliada.csv', F_OF = 'docs/importar-hoja/ofertas-demo-ampliada.csv';
const demoAl = tabla('datos-mock/Alumnos.csv'), demoOf = tabla('datos-mock/Ofertas.csv');
const tAl = tabla(F_AL), tOf = tabla(F_OF);
const listas = aListas(tabla('datos-mock/Listas.csv'), E.LISTAS, E.ALIAS_LISTAS);
const m = aReglasMatch(Object.fromEntries(Object.entries(DEMO).map(([k, f]) => [k, tabla(`datos-mock/${f}.csv`)])), E.HOJAS_MATCH);
const ctx = M.contextoDe({ match: m });
const al = aObjetos('Alumnos', tAl, E.ALUMNO, E.ALUMNO_OPC), of = aObjetos('Ofertas', tOf, E.OFERTA, E.OFERTA_OPC);
const paises = new Set(m.paises.map(p => p.pais)), etiq = new Set(m.etiquetas.map(e => e.etiqueta));
const subareasDe = {}; for (const f of m.areas) (subareasDe[f.area] ||= new Set()).add(f.subarea);
const NIVEL = /^(A1|A2|B1|B2|C1|C2|nativo)$/i;

console.log('1. Los archivos: mismas columnas que la app y los 30 alumnos y 10 ofertas de siempre sin tocar');
{
  igual(tAl.cabecera, demoAl.cabecera, 'Alumnos - demo ampliada: las 21 columnas, con el nombre y el orden de datos-mock');
  igual(tOf.cabecera, demoOf.cabecera, 'Ofertas - demo ampliada: las 17 columnas, con el nombre y el orden de datos-mock');
  igual([tAl.filas.length, tOf.filas.length], [50, 18], '50 alumnos y 18 ofertas');
  chk(tAl.filas.slice(0, 30).every((f, i) => JSON.stringify(f) === JSON.stringify(demoAl.filas[i])), 'los 30 primeros alumnos son idénticos a datos-mock/Alumnos.csv');
  chk(tOf.filas.slice(0, 10).every((f, i) => JSON.stringify(f) === JSON.stringify(demoOf.filas[i])), 'las 10 primeras ofertas son idénticas a datos-mock/Ofertas.csv');
  igual(tAl.filas.map(f => f[0]), Array.from({ length: 50 }, (_, i) => `A${String(i + 1).padStart(3, '0')}`), 'IDs de alumno A001 a A050, sin repetir ni saltarse ninguno');
  igual(tOf.filas.map(f => f[0]), Array.from({ length: 18 }, (_, i) => `O${String(i + 1).padStart(3, '0')}`), 'IDs de oferta O001 a O018, sin repetir ni saltarse ninguno');
  chk(tAl.filas.every(f => f.length === tAl.cabecera.length) && tOf.filas.every(f => f.length === tOf.cabecera.length), 'todas las filas tienen tantas columnas como la cabecera');
  chk(crudo(F_AL).charCodeAt(0) === 0xFEFF && crudo(F_OF).charCodeAt(0) === 0xFEFF, 'UTF-8 con BOM, como los demás (Google lo lee bien con tildes)');
  chk(al.length === 50 && of.length === 18, 'la app los lee sin error (aObjetos)');
}

console.log('2. Alumnos: repartidos por los 14 programas reales y con los campos nuevos');
{
  const programas = listas.masters;
  igual(programas.length, 14, 'la hoja Listas tiene 14 programas');
  igual(al.map(a => a.master).filter(p => !programas.includes(p)), [], 'todo alumno está en un programa que existe en Listas (escrito igual)');
  const cuenta = Object.fromEntries(programas.map(p => [p, al.filter(a => a.master === p).length]));
  chk(programas.every(p => cuenta[p] >= 2), 'los 14 programas tienen al menos 2 alumnos: ' + JSON.stringify(Object.values(cuenta)));
  igual(al.slice(30).map(a => a.master).filter(p => !programas.slice(0, 14).includes(p)), [], 'los 20 nuevos están en programas de la lista');
  chk(programas.filter(p => al.slice(30).some(a => a.master === p)).length === 10, 'los 20 nuevos cubren los 10 programas que no tenían alumnos (2 por cada uno)');
  igual(al.map(a => a.promocion).filter(p => !/^\d{4}-\d{4}$/.test(p)), [], 'la promoción tiene la forma 2025-2026');
  igual([...new Set(al.flatMap(a => [a.nacionalidadPrincipal, a.nacionalidadSecundaria]).filter(Boolean))].filter(p => !paises.has(p)), [], 'todas las nacionalidades están en la hoja Países');
  igual(al.map(a => a.situacionTrabajo).filter(s => !listas.situaciones.includes(s)), [], 'todas las situaciones de trabajo están en Listas');
  igual(al.map(a => a.disponibilidad).filter(s => !listas.disponibilidades.includes(s)), [], 'toda disponibilidad está en Listas');
  igual([...new Set(al.flatMap(a => [a.areaExperiencia, a.areaDestino]))].filter(a => !listas.areas.includes(a)), [], 'todas las áreas están en Listas y en la hoja Áreas');
  igual([...new Set(al.flatMap(a => M.lista(a.etiquetas)))].filter(e => !etiq.has(e)), [], 'todas las etiquetas están en la hoja Etiquetas (escritas igual)');
  igual(al.flatMap(a => M.lista(a.subareasExperiencia).filter(s => !Object.values(subareasDe).some(v => v.has(s)))), [], 'todas las subáreas están en la hoja Áreas');
  igual(al.flatMap(a => M.lista(a.idiomas).filter(x => !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñç]+( (A1|A2|B1|B2|C1|C2|nativo))?$/.test(x))), [], 'los idiomas son «Nombre» o «Nombre nivel» (A1–C2 o nativo)');
  const nuevos = al.slice(30);
  chk(nuevos.filter(a => a.etiquetas && a.idiomas && a.formacionPrevia && a.subareasExperiencia).length >= 14, 'la mayoría de los nuevos tiene los 4 campos nuevos rellenos');
  chk(nuevos.some(a => !a.etiquetas) && nuevos.some(a => !a.idiomas) && nuevos.some(a => !a.formacionPrevia) && nuevos.some(a => !a.subareasExperiencia), 'y hay alguno sin cada uno de ellos a propósito (para ver «datos incompletos»)');
  chk(new Set(nuevos.map(a => a.situacionTrabajo)).size === 4 && new Set(nuevos.map(a => a.disponibilidad)).size === 3, 'los nuevos cubren las 4 situaciones de trabajo y las 3 disponibilidades');
  chk(nuevos.some(a => a.nacionalidadSecundaria) && nuevos.some(a => /M[aá]ster/.test(a.formacionPrevia)), 'hay con segunda nacionalidad y con máster');
}

console.log('3. Ofertas: variadas y con perfil del puesto completo');
{
  igual(of.map(o => o.tipoOrganizacion).filter(t => !listas.tiposOrganizacion.includes(t)), [], 'el tipo de organización está en Listas');
  igual(of.map(o => o.tipo).filter(t => !listas.tiposOferta.includes(t)), [], 'el tipo (prácticas o empleo) está en Listas');
  igual(of.map(o => o.estado).filter(t => !listas.estadosOferta.includes(t)), [], 'el estado está en Listas');
  igual(of.map(o => o.requisitoPermiso).filter(t => t && !listas.requisitosPermiso.includes(t)), [], 'el requisito de permiso está en Listas');
  igual(of.map(o => o.requisitoNacionalidad).filter(t => t && t !== M.UE_EEE && !paises.has(t)), [], 'el requisito de nacionalidad es vacío, la UE/EEE o un país de la hoja Países');
  igual(of.map(o => o.paisOferta).filter(p => !paises.has(p)), [], 'el país de la oferta está en Países');
  igual(of.map(o => o.area).filter(a => !listas.areas.includes(a)), [], 'el área está en Listas');
  igual(of.filter(o => !subareasDe[o.area]?.has(o.subarea)).map(o => o.id), [], 'la subárea es de su área en la hoja Áreas');
  igual([...new Set(of.flatMap(o => M.lista(o.etiquetas)))].filter(e => !etiq.has(e)), [], 'las etiquetas están en la hoja Etiquetas');
  igual(of.flatMap(o => M.lista(o.idiomas).filter(x => !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñç]+( (A1|A2|B1|B2|C1|C2|nativo))?$/.test(x))), [], 'los idiomas tienen el formato de siempre');
  igual(of.map(o => o.nivelFormacion).filter(n => !['Grado', 'Máster', 'Doctorado', 'Sin requisito'].includes(n)), [], 'el nivel de formación es Grado, Máster, Doctorado o Sin requisito');
  chk(of.every(o => /^\d{4}-\d{2}-\d{2}$/.test(o.fechaRecepcion)), 'fechas con forma AAAA-MM-DD');
  chk(of.every(o => o.paisOferta && o.subarea && o.etiquetas && o.idiomas && o.nivelFormacion), 'las 18 ofertas tienen el perfil del puesto completo (país, subárea, etiquetas, idiomas y nivel)');
  const nuevas = of.slice(10);
  chk(new Set(nuevas.map(o => o.area)).size >= 6 && new Set(nuevas.map(o => o.tipo)).size === 2 && new Set(nuevas.map(o => o.estado)).size === 2, 'las 8 nuevas son variadas: 6 áreas o más, prácticas y empleo, abiertas y cerradas');
  chk(nuevas.some(o => o.requisitoNacionalidad === M.UE_EEE) && nuevas.some(o => o.requisitoNacionalidad && o.requisitoNacionalidad !== M.UE_EEE) && nuevas.some(o => o.paisOferta !== 'España'), 'con requisito de UE/EEE, con un país concreto y con país de la oferta distinto de España');
  chk(new Set(nuevas.map(o => o.nivelFormacion)).size >= 3, 'con distintos niveles de formación');
}

console.log('4. El match corre sobre los 50 × 18 pares sin romper nada');
{
  let raros = [], grupos = new Set(), incompletos = 0, n = 0;
  for (const a of al) for (const o of of) {
    const r = M.evaluar(a, o, ctx); n++;
    grupos.add(r.categoria);
    if (r.puntuacion.incompleto) incompletos++;
    if (r.criterios.length !== 8 || r.criterios.some(c => !c.texto || /undefined|NaN|\[object|null/.test(c.texto))) raros.push(`${a.id}|${o.id}`);
    const p = r.puntuacion.porcentaje; if (p !== null && !(p >= 0 && p <= 100)) raros.push(`%${a.id}|${o.id}`);
  }
  igual(raros, [], `900 pares: ocho criterios con texto, sin «undefined» ni «NaN» y % entre 0 y 100`);
  igual(n, 900, '50 alumnos × 18 ofertas = 900 pares');
  igual([...grupos].sort(), ['encaja', 'no', 'reservas'], 'salen los tres grupos');
  chk(incompletos >= 50, `hay muchos pares con «datos incompletos» (${incompletos})`);
  const porOferta = of.map(o => ({ o: o.id, encaja: al.filter(a => M.evaluar(a, o, ctx).categoria === 'encaja').length }));
  chk(porOferta.filter(x => x.encaja > 0).length >= 8, 'al menos 8 de las 18 ofertas tienen algún alumno que encaja: ' + porOferta.filter(x => x.encaja > 0).length);
}

console.log('5. Todo ficticio, sin datos reales');
{
  const todo = crudo(F_AL) + crudo(F_OF);
  chk(!/@/.test(todo), 'ningún correo electrónico');
  chk(!/(\+?\d[\s.-]?){9,}/.test(todo.replace(/\d{4}-\d{2}-\d{2}/g, '').replace(/\d{4}-\d{4}/g, '')), 'ningún teléfono ni número largo');
  const enlaces = todo.match(/https?:\/\/[^\s,"]+/g) || [];
  chk(enlaces.length >= 68 && enlaces.every(u => /^https:\/\/example\.com\/(cv|oferta)\/[AO]\d{3}$/.test(u)), `los ${enlaces.length} enlaces son todos https://example.com/cv/… o /oferta/…`);
  chk(al.every(a => a.foto === 'iniciales' && a.notasEntrevista === '' && a.fechaUltimaEntrevista === ''), 'sin foto real, sin notas de entrevista ni fecha de entrevista');
  chk(of.every(o => /mock/.test(o.empresa)), 'todas las empresas son «… mock …»');
  const nombres = al.map(a => `${a.nombre} ${a.apellidos}`);
  igual(nombres.filter((n, i) => nombres.indexOf(n) !== i), [], 'ningún nombre completo repetido');
  chk(al.every(a => a.enlaceCV === `https://example.com/cv/${a.id}`), 'el enlace del CV es el de ejemplo de cada alumno');
}

console.log('6. PASOS.md dice cuándo usarlos');
{
  const t = crudo('docs/importar-hoja/PASOS.md');
  chk(t.includes('alumnos-demo-ampliada.csv') && t.includes('ofertas-demo-ampliada.csv'), 'PASOS.md nombra los dos archivos nuevos');
  chk(/50 alumnos/.test(t) && /18 ofertas/.test(t), 'y dice cuántos alumnos y ofertas traen');
  chk(/No hace falta\*\* hacer nada en `datos-mock\/` ni en la app/.test(t) && /Solo en un Sheet de prueba/i.test(t), 'y que es solo para un Sheet de prueba y que la demo de la app no cambia');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
