// Fuente de datos del MODO DEMO: los archivos CSV de datos-mock/ (datos ficticios que vienen con la app).
import { leerCSV } from '../util/csv.js';
import { CONFIG } from './config.js';
import { aObjetos, aListas, aReglasMatch } from './tablas.js';

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
  if (!filas.length) throw new Error(`Faltan datos de ejemplo: ${nombre} está vacío`);
  return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) };
}

// Una hoja OPCIONAL: si no se puede leer, es null (la app sigue con las reglas de respaldo).
async function hojaOpcional(nombre) {
  try { return await hoja(nombre); } catch { return null; }
}

export function crearFuenteCSV(esquemas) {
  return {
    async cargar() {
      const claves = Object.keys(esquemas.HOJAS_MATCH);
      const [a, o, l, r, ap, h, ...extra] = await Promise.all([hoja('Alumnos'), hoja('Ofertas'), hoja('Listas'), hoja('Rondas'), hoja('Aplicaciones'), hoja('Historial'), ...claves.map(hojaOpcional)]);
      return {
        alumnos: aObjetos('Alumnos', a, esquemas.ALUMNO, esquemas.ALUMNO_OPC),
        ofertas: aObjetos('Ofertas', o, esquemas.OFERTA, esquemas.OFERTA_OPC),
        listas: { ...aListas(l, esquemas.LISTAS, esquemas.ALIAS_LISTAS), match: aReglasMatch(Object.fromEntries(claves.map((k, i) => [k, extra[i]])), esquemas.HOJAS_MATCH) },
        rondas: aObjetos('Rondas', r, esquemas.RONDA),
        aplicaciones: aObjetos('Aplicaciones', ap, esquemas.APLICACION),
        historial: aObjetos('Historial', h, esquemas.HISTORIAL),
        conRondas: true,
        puedeEscribir: false,
      };
    },
  };
}
