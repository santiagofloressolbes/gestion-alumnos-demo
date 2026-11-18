// Pruebas de la lectura de las hojas y columnas nuevas del match (3E-1): funciones puras, sin navegador.
// Todo es opcional: lo que falta o está vacío no rompe nada y se queda como «sin datos».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos, aReglasMatch } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const tabla = f => { const filas = leerCSV(fs.readFileSync(path.join(RAIZ, f), 'utf8')); return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) }; };

console.log('1. Columnas nuevas de Alumnos y Ofertas (opcionales)');
{
  const t = { cabecera: ['ID alumno', 'Foto', 'Nombre', 'Apellidos', 'Máster', 'Promoción', 'Nacionalidad principal', 'Nacionalidad secundaria', 'Situación de trabajo en España', 'Área de experiencia', 'Resumen de experiencia', 'Área a la que quiere ir', 'Por qué', 'Enlace al CV', 'Notas de entrevista', 'Fecha última entrevista', 'Disponibilidad'], filas: [['A1', '', 'Ana', 'X', 'M', '', '', '', '', '', '', '', '', '', '', '', '']] };
  const sin = aObjetos('Alumnos', t, E.ALUMNO, E.ALUMNO_OPC);
  igual([sin[0].etiquetas, sin[0].idiomas, sin[0].formacionPrevia, sin[0].subareasExperiencia], ['', '', '', ''], 'sin las columnas nuevas: quedan vacías, sin error');
  const con = aObjetos('Alumnos', { cabecera: [...t.cabecera, 'Etiquetas', 'Idiomas'], filas: [[...t.filas[0], ' SQL; Excel ', 'Inglés C1']] }, E.ALUMNO, E.ALUMNO_OPC);
  igual([con[0].etiquetas, con[0].idiomas, con[0].formacionPrevia], ['SQL; Excel', 'Inglés C1', ''], 'con solo algunas columnas: se leen (recortadas) y el resto queda vacío');
  let fallo = '';
  try { aObjetos('Alumnos', { cabecera: ['ID alumno'], filas: [] }, E.ALUMNO, E.ALUMNO_OPC); } catch (e) { fallo = e.message; }
  chk(/falta la columna/.test(fallo), 'las columnas de siempre siguen siendo obligatorias');
}
{
  const al = aObjetos('Alumnos', tabla('datos-mock/Alumnos.csv'), E.ALUMNO, E.ALUMNO_OPC), of = aObjetos('Ofertas', tabla('datos-mock/Ofertas.csv'), E.OFERTA, E.OFERTA_OPC);
  igual([al.length, of.length], [30, 10], 'los datos mock: 30 alumnos y 10 ofertas');
  chk(al.every(a => 'etiquetas' in a && 'idiomas' in a && 'formacionPrevia' in a && 'subareasExperiencia' in a), 'todos los alumnos tienen las 4 columnas nuevas (aunque vacías)');
  chk(of.every(o => 'paisOferta' in o && 'subarea' in o && 'etiquetas' in o && 'idiomas' in o && 'nivelFormacion' in o), 'todas las ofertas tienen las 5 columnas nuevas');
  chk(al.some(a => !a.etiquetas) && al.some(a => !a.idiomas) && al.some(a => !a.formacionPrevia) && al.some(a => !a.subareasExperiencia), 'hay alumnos con datos sin rellenar a propósito (para ver "datos incompletos")');
}

console.log('2. Hojas de reglas (opcionales)');
{
  const hojas = Object.fromEntries(Object.entries({ paises: 'Paises', areas: 'Areas', afinidad: 'Afinidad', reglas: 'ReglasMigratorias', etiquetas: 'Etiquetas' }).map(([k, f]) => [k, tabla(`datos-mock/${f}.csv`)]));
  const m = aReglasMatch(hojas, E.HOJAS_MATCH);
  chk(m.paises.length >= 80 && m.paises.every(p => p.pais && p.grupo), 'Países: todos con su grupo (' + m.paises.length + ')');
  igual([...new Set(m.paises.map(p => p.grupo))].sort(), ['EEE', 'Grupo de países', 'Resto', 'Suiza', 'UE'], 'grupos de Países');
  igual(m.areas.length, 30, 'Áreas: 30 subáreas');
  chk(m.areas.every(f => f.areaEn) && new Set(m.areas.map(f => f.area)).size === new Set(m.areas.map(f => f.areaEn)).size, 'Áreas: cada área trae su nombre en inglés, uno distinto por área');
  {
    const cab = ['Área', 'Subárea'], f = [['Finanzas', 'Contabilidad']];
    igual(aReglasMatch({ areas: { cabecera: cab, filas: f } }, E.HOJAS_MATCH).areas, [{ area: 'Finanzas', subarea: 'Contabilidad', areaEn: '' }], 'sin la columna «Área (inglés)»: se lee igual, con el nombre en inglés vacío');
    for (const nombre of ['Área (inglés)', 'Area (ingles)', 'ÁREA (INGLÉS)', ' area (INGLÉS) ']) igual(aReglasMatch({ areas: { cabecera: [...cab, nombre], filas: [['Finanzas', 'Contabilidad', 'Finance']] } }, E.HOJAS_MATCH).areas[0].areaEn, 'Finance', 'la columna se reconoce como «' + nombre + '» (tilde y mayúsculas no importan)');
    igual(aReglasMatch({ areas: { cabecera: [...cab, 'Area ingles 2'], filas: [['Finanzas', 'Contabilidad', 'x']] } }, E.HOJAS_MATCH).areas[0].areaEn, '', 'una columna con otro nombre no se toma por la del inglés');
    igual(aReglasMatch({ areas: { cabecera: ['area', 'subarea'], filas: [['Finanzas', 'x']] } }, E.HOJAS_MATCH).areas, [], 'las columnas de siempre siguen siendo exactas (solo la del inglés es flexible)');
  }
  igual(m.afinidad.length, 45, 'Afinidad: las 45 parejas de 10 áreas');
  igual(m.reglas.length, 20, 'Reglas migratorias: 20 filas');
  chk(m.reglas.every(r => r.situacion && r.resultado && r.fecha), 'cada regla trae su resultado y su fecha de validación');
  chk(m.etiquetas.length >= 25 && m.etiquetas.every(e => e.etiqueta && !/[;,]/.test(e.etiqueta)), 'Etiquetas: sin comas ni punto y coma dentro (separan varias etiquetas)');
  igual(m.etiquetas.length, new Set(m.etiquetas.map(e => e.etiqueta)).size, 'Etiquetas sin repetir');
}
{
  const vacio = aReglasMatch({}, E.HOJAS_MATCH);
  igual(Object.keys(vacio), ['paises', 'areas', 'afinidad', 'reglas', 'etiquetas'], 'sin ninguna hoja: las cinco listas, vacías');
  chk(Object.values(vacio).every(l => l.length === 0), 'todas vacías, sin error');
  igual(aReglasMatch(undefined, E.HOJAS_MATCH).paises, [], 'sin nada de nada (script antiguo): lista vacía');
  igual(aReglasMatch({ paises: { cabecera: ['Otra'], filas: [['x']] } }, E.HOJAS_MATCH).paises, [], 'una hoja sin la columna principal: vacía, sin error');
  igual(aReglasMatch({ paises: { cabecera: ['País'], filas: [['Chile'], ['']] } }, E.HOJAS_MATCH).paises, [{ pais: 'Chile', grupo: '' }], 'falta la columna Grupo: queda vacío; las filas vacías se ignoran');
  igual(aReglasMatch({ paises: 'basura', areas: { cabecera: 5, filas: 6 } }, E.HOJAS_MATCH).areas, [], 'un valor raro no rompe nada');
}

console.log('3. Las reglas migratorias mock siguen vigentes (las pruebas de pantalla lo necesitan)');
{
  const t = tabla('datos-mock/ReglasMigratorias.csv'), i = t.cabecera.indexOf('Fecha de validación');
  const masVieja = t.filas.map(f => f[i]).filter(Boolean).sort()[0];
  const meses = (Date.now() - Date.parse(masVieja)) / (30.44 * 24 * 3600 * 1000);
  chk(meses <= 12, `las reglas de datos-mock/ReglasMigratorias.csv se validaron el ${masVieja}, hace más de 12 meses: pon una fecha nueva ahí y en docs/importar-sheet/Reglas migratorias.csv (no es un fallo de la app: las pruebas de pantalla esperan reglas vigentes)`);
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
