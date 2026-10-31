// ÚNICO punto de acceso a los datos. El resto de la app solo usa estas funciones.
// Solo lectura. Si se cambia de fuente (p. ej. Microsoft Graph), solo se toca esta carpeta.
import { CONFIG } from './config.js';
import * as esquemas from './esquema.js';
import { crearFuenteCSV } from './fuente-csv.js';

let carga = null;
let estado = { origen: null, respaldo: false, motivo: '' };

async function cargarDe(fuente) {
  const [alumnos, ofertas, listas] = await Promise.all([fuente.alumnos(), fuente.ofertas(), fuente.listas()]);
  return { alumnos, ofertas, listas };
}

async function cargarTodo() {
  if (CONFIG.fuente === 'local') {
    const datos = await cargarDe(crearFuenteCSV('local', esquemas));
    estado = { origen: 'local', respaldo: false, motivo: '' };
    return datos;
  }
  try {
    const datos = await cargarDe(crearFuenteCSV('google', esquemas));
    estado = { origen: 'google', respaldo: false, motivo: '' };
    return datos;
  } catch (e) {
    // Sin Google (sin conexión, hoja despublicada, columna borrada...): se usan los archivos de respaldo.
    const datos = await cargarDe(crearFuenteCSV('local', esquemas));
    estado = { origen: 'local', respaldo: true, motivo: e.message };
    return datos;
  }
}

function datos() {
  if (!carga) carga = cargarTodo().catch(e => { carga = null; throw e; });   // si falla, se puede reintentar
  return carga;
}

export const getAlumnos = async () => (await datos()).alumnos;
export const getOfertas = async () => (await datos()).ofertas;
export const getListas = async () => (await datos()).listas;
export const getEstadoFuente = () => estado;

// Másteres en el orden de la hoja Listas, con su número de alumnos.
export async function getMasters() {
  const { alumnos, listas } = await datos();
  const nombres = [...listas.masters];
  for (const a of alumnos) if (a.master && !nombres.includes(a.master)) nombres.push(a.master);
  return nombres.map(nombre => ({ nombre, alumnos: alumnos.filter(a => a.master === nombre).length }));
}

// Vuelve a pedir los datos (botón "Reintentar").
export function recargar() { carga = null; return datos(); }
