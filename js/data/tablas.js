// Convierte tablas { cabecera, filas } (de un CSV o del script) en los objetos que usa la app.
// Es común a todas las fuentes: una fuente nueva solo tiene que entregar tablas con este formato.

// Las notas se leen tal cual (sin recortar): el script las compara letra por letra para detectar cambios ajenos.
const SIN_RECORTAR = new Set(['notasEntrevista']);

// Devuelve objetos con las claves internas. Avisa si falta alguna columna.
export function aObjetos(nombre, { cabecera, filas }, esquema) {
  const faltan = Object.keys(esquema).filter(c => !cabecera.includes(c));
  if (faltan.length) throw new Error(`En la hoja ${nombre} falta la columna: ${faltan.join(', ')}`);
  return filas.map(f => {
    const o = {};
    for (const [col, clave] of Object.entries(esquema)) { const v = f[cabecera.indexOf(col)] ?? ''; o[clave] = SIN_RECORTAR.has(clave) ? v : v.trim(); }
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
