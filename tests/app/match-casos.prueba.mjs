// Casos de prueba del match con los DATOS MOCK (los mismos que se importan al Sheet para probar en el iPhone):
// para cada oferta, quién debería salir arriba, en qué grupo y con qué semáforo. Funciones puras: sin navegador.
// La tabla se explica en docs/REGLAS-MATCH.md (sección «Casos de prueba»). Si cambias los datos mock en el cierre, hay que rehacer esta tabla.
//
// El semáforo de cada alumno son 8 letras, una por criterio y en este orden:
//   Área · Subárea · Habilidades · Idiomas · Formación · Prácticas/empleo · Nacionalidad · Permiso
//   V = verde (cumple)  A = amarillo (afín o a revisar)  R = rojo (no coincide)  ? = sin datos (no suma)  - = la oferta no lo pide
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos, aReglasMatch } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';
import * as M from '../../js/util/match.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const tabla = f => { const filas = leerCSV(fs.readFileSync(path.join(RAIZ, f), 'utf8')); return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) }; };
const alumnos = aObjetos('Alumnos', tabla('datos-mock/Alumnos.csv'), E.ALUMNO, E.ALUMNO_OPC);
const ofertas = aObjetos('Ofertas', tabla('datos-mock/Ofertas.csv'), E.OFERTA, E.OFERTA_OPC);
const match = aReglasMatch(Object.fromEntries(Object.entries({ paises: 'Paises', areas: 'Areas', afinidad: 'Afinidad', reglas: 'ReglasMigratorias', etiquetas: 'Etiquetas' }).map(([k, f]) => [k, tabla(`datos-mock/${f}.csv`)])), E.HOJAS_MATCH);
const ctx = M.crearContexto(match, { hoy: '2026-11-16' });   // fecha fija: las reglas mock se validaron el 2026-11-01

const LETRA = { ok: 'V', revisar: 'A', no: 'R' };
const semaforo = r => r.criterios.map(c => (c.noAplica ? '-' : c.sinDatos ? '?' : LETRA[c.estado])).join('');
const por = {};
for (const o of ofertas) por[o.id] = M.emparejar(alumnos, o, ctx);
const de = (idO, idA) => por[idO].find(r => r.alumno.id === idA);

console.log('1. Los grupos de cada oferta (cuántos encajan, con reservas y no encajan)');
const GRUPOS = {
  O001: [0, 6, 24], O002: [0, 12, 18], O003: [0, 7, 23], O004: [1, 7, 22], O005: [0, 3, 27],
  O006: [1, 8, 21], O007: [0, 0, 30], O008: [0, 8, 22], O009: [0, 7, 23], O010: [1, 9, 20],
};
for (const [id, esperado] of Object.entries(GRUPOS)) {
  igual(['encaja', 'reservas', 'no'].map(g => por[id].filter(r => r.categoria === g).length), esperado, `${id}: encajan / con reservas / no encajan`);
  igual(por[id].length, 30, `${id}: salen los 30 alumnos (nadie se oculta)`);
}

console.log('2. Quién sale primero en cada oferta');
const PRIMEROS = { O001: 'A027', O002: 'A008', O003: 'A004', O004: 'A025', O005: 'A023', O006: 'A011', O007: 'A014', O008: 'A009', O009: 'A015', O010: 'A007' };
for (const [id, a] of Object.entries(PRIMEROS)) igual(por[id][0].alumno.id, a, `${id}: el primero es ${a}`);
igual(por.O010.slice(0, 3).map(r => r.alumno.id), ['A007', 'A012', 'A027'], 'O010 (derecho deportivo): Sofía (todo verde), Rafael (le falta una habilidad) y Julia');
igual(por.O004.slice(0, 2).map(r => [r.alumno.id, r.categoria]), [['A025', 'encaja'], ['A029', 'reservas']], 'O004 (eventos): Clara encaja del todo; Laura (tiene experiencia en eventos, aunque quiere otra área) con reservas');

console.log('3. El semáforo de casos concretos, con su porqué');
// [oferta, alumno, grupo, semáforo, %, por qué]
const CASOS = [
  ['O004', 'A025', 'encaja', 'VVVVVV--', 100, 'Clara: quiere eventos, su subárea es esa, tiene las 2 habilidades, Inglés B2 ≥ B1, Grado y busca prácticas. La oferta no pide nacionalidad ni permiso.'],
  ['O010', 'A007', 'encaja', 'VVVVVV-V', 100, 'Sofía: derecho deportivo, contratos y negociación, inglés nativo ≥ C1, Máster, empleo y residente con permiso en España.'],
  ['O010', 'A012', 'reservas', 'VVAVVV-V', 89, 'Rafael: todo bien salvo que solo tiene 1 de las 2 habilidades (amarillo, 50 % de ese peso).'],
  ['O001', 'A027', 'reservas', 'VRAVVV-V', 79, 'Julia: quiere antipiratería (V); sus subáreas son de otra área (R, no baja de grupo); 1 de 2 habilidades (A).'],
  ['O001', 'A026', 'reservas', 'V?RVVV-V', 76, 'Hugo: su subárea está SIN rellenar (?, no suma ni resta); ninguna habilidad coincide (R).'],
  ['O002', 'A008', 'reservas', 'VR?VVV--', 86, 'Javier: quiere Marketing, que es DIRECTA con Comercial (V); sin habilidades escritas (?).'],
  ['O003', 'A001', 'no', 'VVAVVR-V', 82, 'Lucía: casi todo verde, pero busca prácticas y la oferta es de empleo (R en un criterio básico → «No encaja»).'],
  ['O005', 'A023', 'reservas', 'AVVAVVVV', 81, 'Ana: experiencia en Marketing pero quiere Dirección deportiva (A); español B2 frente a C1 (A); ciudadana UE.'],
  ['O005', 'A011', 'no', 'VVVVVRRR', 80, 'Paula (Chile, necesita permiso): perfil perfecto, pero la oferta pide nacionalidad UE/EEE (R) y permiso (R).'],
  ['O006', 'A011', 'encaja', 'VVVVVV--', 100, 'Paula en una oferta cerrada: se enseña igualmente (nunca se esconde).'],
  ['O007', 'A014', 'no', 'VVV?AVR-', 91, 'Tomás (Canadá): perfil excelente; sin idiomas escritos (?); Grado frente a Máster (A); la oferta pide nacionalidad estadounidense (R).'],
  ['O009', 'A015', 'reservas', 'VVAAVV--', 81, 'Marta: selección de personal; 1 de 2 habilidades y inglés B1 frente a B2.'],
  ['O009', 'A005', 'no', 'VVAVVR--', 78, 'Camila: perfil de RR. HH., pero busca empleo y la oferta es de prácticas.'],
];
for (const [o, a, grupo, sem, pct, porque] of CASOS) {
  const r = de(o, a);
  igual([r.categoria, semaforo(r), r.puntuacion.porcentaje], [grupo, sem, pct], `${o} · ${a}: ${porque}`);
}

console.log('4. Datos sin rellenar a propósito: «sin datos», nunca «no cumple»');
{
  const huecos = [['A008', 'etiquetas', 2], ['A014', 'idiomas', 3], ['A020', 'nivel', 4], ['A026', 'subarea', 1]];
  for (const [a, id, pos] of huecos) {
    let n = 0, malos = 0, incompletos = 0;
    for (const o of ofertas) {
      const c = de(o.id, a).criterios[pos];
      if (c.id !== id) { malos++; continue; }
      if (c.noAplica) continue;
      n++;
      if (c.estado === 'no' || !c.sinDatos || c.factor !== null) malos++;
      if (de(o.id, a).puntuacion.incompleto) incompletos++;
    }
    chk(n > 0 && malos === 0 && incompletos === n, `${a}: «${id}» sin rellenar → en las ${n} ofertas que lo piden sale «sin datos» (sin puntos, nunca rojo) y la fila dice «datos incompletos»`);
  }
}

console.log('5. Ninguna fila rompe las reglas generales');
{
  let filas = 0, fallos = [];
  for (const o of ofertas) for (const r of por[o.id]) {
    filas++;
    if (r.criterios.length !== 8 || r.criterios.some(c => !c.texto || c.texto.length < 10)) fallos.push(`${o.id}/${r.alumno.id}: criterios`);
    const p = r.puntuacion;
    if (p.porcentaje != null && (p.porcentaje < 0 || p.porcentaje > 100)) fallos.push(`${o.id}/${r.alumno.id}: puntuación fuera de 0–100`);
    if (r.criterios.filter(c => c.sinDatos).some(c => c.estado === 'no' || c.factor !== null)) fallos.push(`${o.id}/${r.alumno.id}: un «sin datos» suma o es rojo`);
    if (r.categoria === 'encaja' && r.criterios.some(c => c.estado !== 'ok')) fallos.push(`${o.id}/${r.alumno.id}: encaja con algo que no es verde`);
    if (r.categoria === 'no' && !r.criterios.some(c => M.NUCLEO.includes(c.id) && c.estado === 'no')) fallos.push(`${o.id}/${r.alumno.id}: «No encaja» sin un rojo en un criterio básico`);
  }
  igual([filas, fallos], [300, []], '10 ofertas × 30 alumnos: ocho criterios con motivo, puntuación entre 0 y 100, «sin datos» no suma, solo se encaja con todo verde y solo se «no encaja» por un criterio básico en rojo');
  const orden = por.O005.map(r => r.categoria);
  chk(orden.every((c, i) => i === 0 || ['encaja', 'reservas', 'no'].indexOf(c) >= ['encaja', 'reservas', 'no'].indexOf(orden[i - 1])), 'el orden respeta los grupos');
}

console.log('6. Desde el alumno: sus ofertas');
{
  const o = M.ofertasParaAlumno(ofertas, alumnos.find(a => a.id === 'A025'), ctx);
  igual(o.length, 10, 'Clara: salen las 10 ofertas (también la cerrada)');
  igual([o[0].oferta.id, o[0].categoria, o[0].puntuacion.porcentaje], ['O004', 'encaja', 100], 'y la primera es la de eventos, que encaja del todo');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
