// ÚNICO punto de acceso a los datos. El resto de la app solo usa estas funciones.
// Modos: 'demo' (archivos de datos-mock/) o 'script' (Google Apps Script con clave).
// No hay vuelta automática a la demo: si el script falla, se dice con claridad (no se mezclan datos de prueba con la demo).
// Si se cambia de fuente (p. ej. Microsoft Graph), solo se toca esta carpeta.
import * as esquemas from './esquema.js';
import { crearFuenteCSV } from './fuente-csv.js';
import { crearFuenteAppsScript, probarConexion, llamarScript, errorDatos } from './fuente-apps-script.js';
import { getModo, accesoGuardado, urlGuardada, urlValida, guardarAcceso, guardarDemo, borrarClave, olvidarTodo } from './acceso.js';

export { getModo, urlGuardada, urlValida };

let carga = null;
let enMemoria = null;   // los datos ya cargados (solo en memoria; nunca se guardan en el móvil)
let estado = { modo: '', puedeEscribir: false };

async function cargarTodo() {
  const modo = getModo();
  if (!modo) throw errorDatos('sin-acceso');
  const fuente = modo === 'demo' ? crearFuenteCSV(esquemas) : crearFuenteAppsScript(accesoGuardado(), esquemas);
  try {
    const { puedeEscribir, ...datos } = await fuente.cargar();
    estado = { modo, puedeEscribir };
    enMemoria = datos;
    return datos;
  } catch (e) {
    if (e.codigo === 'clave') borrarClave();   // una clave que ya no vale no se queda guardada
    throw e;
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
export function recargar() { carga = null; enMemoria = null; return datos(); }

/* ---- Acceso ---- */

// Comprueba la dirección y la clave con el script y, solo si valen, las guarda en este móvil.
export async function conectar(url, clave) {
  url = String(url).trim();
  if (!urlValida(url)) throw errorDatos('direccion');
  if (!clave) throw errorDatos('sin-clave');
  await probarConexion({ url, clave });
  if (!guardarAcceso(url, clave)) throw errorDatos('almacenamiento');
}
export function usarDemo() { if (!guardarDemo()) throw errorDatos('almacenamiento'); }
export function olvidarAcceso() { olvidarTodo(); carga = null; enMemoria = null; estado = { modo: '', puedeEscribir: false }; }

/* ---- Escritura: solo la entrevista (notas y fecha) ---- */

// Guarda las notas y la fecha de la última entrevista de un alumno.
// "base" = lo que se cree que hay ahora en el Sheet; el script lo compara y, si alguien lo cambió, devuelve 'conflicto'.
export async function guardarEntrevista(id, notas, fecha, base) {
  const { alumnos } = await datos();
  const a = alumnos.find(x => x.id === id);
  if (!a) throw errorDatos('no-encontrado');
  if (estado.modo !== 'script' || !estado.puedeEscribir) throw errorDatos('solo-lectura');
  const ant = base || { notas: a.notasEntrevista, fecha: a.fechaUltimaEntrevista };
  let r;
  try {
    r = await llamarScript(accesoGuardado(), 'guardarEntrevista',
      { id, notas, fecha, notasAnteriores: ant.notas, fechaAnterior: ant.fecha });
  } catch (e) {
    if (e.codigo === 'clave') borrarClave();
    throw e;
  }
  aplicarEntrevista(id, r.notas, r.fecha);
  return { notas: r.notas, fecha: r.fecha };
}

// Pone en memoria lo que hay ahora en el Sheet (tras guardar, o al descartar un cambio propio por un conflicto).
export function aplicarEntrevista(id, notas, fecha) {
  const a = enMemoria?.alumnos.find(x => x.id === id);
  if (a) { a.notasEntrevista = notas; a.fechaUltimaEntrevista = fecha; }
}
export const puedeEscribir = () => estado.modo === 'script' && estado.puedeEscribir;
