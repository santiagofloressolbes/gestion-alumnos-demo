import { norm } from '../util/texto.js';
// Convierte tablas { cabecera, filas } (de un CSV o del script) en los objetos que usa la app.
// Es común a todas las fuentes: una fuente nueva solo tiene que entregar tablas con este formato.

// Las notas se leen tal cual (sin recortar): el script las compara letra por letra para detectar cambios ajenos.
const SIN_RECORTAR = new Set(['notasEntrevista']);

// Devuelve objetos con las claves internas. Avisa si falta alguna columna.
// "opcionales": columnas que pueden faltar en la hoja (entonces quedan vacías, sin avisar).
export function aObjetos(nombre, { cabecera, filas }, esquema, opcionales = {}) {
  const faltan = Object.keys(esquema).filter(c => !cabecera.includes(c));
  if (faltan.length) throw new Error(`En la hoja ${nombre} falta la columna: ${faltan.join(', ')}`);
  return filas.map(f => {
    const o = {};
    for (const [col, clave] of Object.entries(esquema)) { const v = f[cabecera.indexOf(col)] ?? ''; o[clave] = SIN_RECORTAR.has(clave) ? v : v.trim(); }
    for (const [col, clave] of Object.entries(opcionales)) { const i = cabecera.indexOf(col); o[clave] = i < 0 ? '' : (f[i] ?? '').trim(); }
    return o;
  }).filter(o => o.id);
}

// Hoja Listas: cada columna es una lista de valores (las celdas vacías se ignoran).
// Cada columna puede tener nombres alternativos (alias): se usa el primero que exista en la hoja.
// Además devuelve "programas": [{ nombre, categoria, idioma }] (cada programa con lo que hay en SU fila; sin repetir nombres).
export function aListas({ cabecera, filas }, esquema, alias = {}) {
  const out = {};
  const indice = col => [col, ...(alias[col] || [])].map(c => cabecera.indexOf(c)).find(i => i >= 0) ?? -1;
  for (const [col, clave] of Object.entries(esquema)) {
    const i = indice(col);
    out[clave] = i < 0 ? [] : [...new Set(filas.map(f => (f[i] ?? '').trim()).filter(Boolean))];
  }
  const ip = indice('Programa'), ic = cabecera.indexOf('Categoría del programa'), ii = cabecera.indexOf('Idioma del programa');
  const vistos = new Set();
  out.programas = [];
  if (ip >= 0) for (const f of filas) {
    const nombre = (f[ip] ?? '').trim();
    if (!nombre || vistos.has(nombre)) continue;
    vistos.add(nombre);
    out.programas.push({ nombre, categoria: ic < 0 ? '' : (f[ic] ?? '').trim(), idioma: ii < 0 ? '' : (f[ii] ?? '').trim() });
  }
  return out;
}

// Hojas de reglas del match (todas opcionales): cada una es una tabla { cabecera, filas } o null si no existe.
// Devuelve listas de objetos con las claves internas. Una hoja que falta, o una columna que falta, da una lista vacía (nunca un error).
// «areaEn» (nombre del área en inglés) se encuentra aunque falte la tilde o cambien las mayúsculas: un descuido al escribir la cabecera no lo desactiva.
const COLUMNAS_FLEXIBLES = new Set(['areaEn']);
export function aReglasMatch(tablas, hojas) {
  const out = {};
  for (const [clave, { columnas }] of Object.entries(hojas)) {
    const t = tablas?.[clave];
    out[clave] = [];
    if (!t || !Array.isArray(t.cabecera) || !Array.isArray(t.filas)) continue;
    const cab = t.cabecera.map(h => String(h).trim());
    const idx = Object.fromEntries(Object.entries(columnas).map(([k, nombre]) => [k, cab.indexOf(nombre) >= 0 || !COLUMNAS_FLEXIBLES.has(k) ? cab.indexOf(nombre) : cab.findIndex(h => norm(h) === norm(nombre))]));
    const [primera] = Object.keys(columnas);
    if (idx[primera] < 0) continue;
    for (const f of t.filas) {
      const o = {};
      for (const k of Object.keys(columnas)) o[k] = idx[k] < 0 ? '' : String(f[idx[k]] ?? '').trim();
      if (o[primera]) out[clave].push(o);
    }
  }
  return out;
}
