// Fuente de datos del MODO DEMO: los archivos CSV de datos-mock/ (datos ficticios que vienen con la app).
import { leerCSV } from '../util/csv.js';
import { CONFIG } from './config.js';
import { aObjetos, aListas } from './tablas.js';

async function descargar(url) {
  const ctl = new AbortController();
  const reloj = setTimeout(() => ctl.abort(), CONFIG.esperaLocalMs);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-cache', referrerPolicy: 'no-referrer' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(reloj); }
}

// Devuelve { cabecera: [...], filas: [[...], ...] } de una hoja.
async function hoja(nombre) {
  const filas = leerCSV(await descargar(CONFIG.local[nombre]));
  if (!filas.length) throw new Error(`La hoja ${nombre} está vacía`);
  return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) };
}

export function crearFuenteCSV(esquemas) {
  return {
    async cargar() {
      const [a, o, l] = await Promise.all([hoja('Alumnos'), hoja('Ofertas'), hoja('Listas')]);
      return {
        alumnos: aObjetos('Alumnos', a, esquemas.ALUMNO),
        ofertas: aObjetos('Ofertas', o, esquemas.OFERTA),
        listas: aListas(l, esquemas.LISTAS),
        puedeEscribir: false,
      };
    },
  };
}
