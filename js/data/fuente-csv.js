// Fuente de datos basada en CSV (Google Sheet publicado, o los archivos de datos-mock/).
import { leerCSV } from '../util/csv.js';
import { CONFIG } from './config.js';

async function descargar(url) {
  const ctl = new AbortController();
  const reloj = setTimeout(() => ctl.abort(), CONFIG.esperaMs);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-cache', referrerPolicy: 'no-referrer' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(reloj); }
}

// Devuelve { cabecera: [...], filas: [[...], ...] } de una hoja.
async function hoja(origen, nombre) {
  const filas = leerCSV(await descargar(CONFIG[origen][nombre]));
  if (!filas.length) throw new Error(`La hoja ${nombre} está vacía`);
  return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) };
}

// Convierte filas en objetos con las claves internas. Avisa si falta alguna columna.
function aObjetos(nombre, { cabecera, filas }, esquema) {
  const faltan = Object.keys(esquema).filter(c => !cabecera.includes(c));
  if (faltan.length) throw new Error(`En la hoja ${nombre} falta la columna: ${faltan.join(', ')}`);
  return filas.map(f => {
    const o = {};
    for (const [col, clave] of Object.entries(esquema)) o[clave] = (f[cabecera.indexOf(col)] ?? '').trim();
    return o;
  }).filter(o => o.id);
}

function aListas({ cabecera, filas }, esquema) {
  const out = {};
  for (const [col, clave] of Object.entries(esquema)) {
    const i = cabecera.indexOf(col);
    out[clave] = i < 0 ? [] : [...new Set(filas.map(f => (f[i] ?? '').trim()).filter(Boolean))];
  }
  return out;
}

export function crearFuenteCSV(origen, esquemas) {
  return {
    origen,
    alumnos: async () => aObjetos('Alumnos', await hoja(origen, 'Alumnos'), esquemas.ALUMNO),
    ofertas: async () => aObjetos('Ofertas', await hoja(origen, 'Ofertas'), esquemas.OFERTA),
    listas: async () => aListas(await hoja(origen, 'Listas'), esquemas.LISTAS),
  };
}
