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
let estado = { modo: '', puedeEscribir: false, soporta: [], conRondas: false };

async function cargarTodo() {
  const modo = getModo();
  if (!modo) throw errorDatos('sin-acceso');
  const fuente = modo === 'demo' ? crearFuenteCSV(esquemas) : crearFuenteAppsScript(accesoGuardado(), esquemas);
  try {
    const { puedeEscribir, soporta = [], ...datos } = await fuente.cargar();
    estado = { modo, puedeEscribir, soporta, conRondas: datos.conRondas === true };
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
export const getRondas = async () => (await datos()).rondas;
export const getAplicaciones = async () => (await datos()).aplicaciones;
export const getHistorial = async () => (await datos()).historial;
// ¿El Sheet (o la demo) tiene las hojas de rondas? Si no, la app no enseña nada de rondas.
export const hayRondas = async () => (await datos()).conRondas === true;
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
export function olvidarAcceso() { olvidarTodo(); carga = null; enMemoria = null; estado = { modo: '', puedeEscribir: false, soporta: [], conRondas: false }; }

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

/* ---- Escritura: ofertas (alta y edición; nunca se borran: se cierran cambiando el estado) ---- */

const CAMPOS_OFERTA = Object.values(esquemas.OFERTA).filter(k => k !== 'id');
// ¿Esta conexión sabe guardar ofertas? Un script antiguo no lo anuncia: entonces no se enseñan los botones.
export const puedeEscribirOfertas = () => puedeEscribir() && estado.soporta.includes('guardarOferta');
// 'conectado' | 'script-antiguo' | 'solo-lectura' (demo): para explicar por qué no hay botones.
export const estadoEscrituraOfertas = () => (puedeEscribirOfertas() ? 'conectado' : estado.modo === 'script' && estado.puedeEscribir ? 'script-antiguo' : 'solo-lectura');

// Crea (id vacío) o edita una oferta. "anteriores" = lo que se cree que hay ahora en el Sheet (al editar);
// el script lo compara y, si alguien lo cambió, devuelve 'conflicto' con lo que hay.
export async function guardarOferta(id, oferta, anteriores) {
  const { ofertas } = await datos();
  if (!puedeEscribirOfertas()) throw errorDatos('solo-lectura');
  const peticion = { oferta };
  if (id) {
    if (!ofertas.some(x => x.id === id)) throw errorDatos('no-encontrado');
    peticion.id = id;
    peticion.anteriores = anteriores;
  }
  let r;
  try {
    r = await llamarScript(accesoGuardado(), 'guardarOferta', peticion, { reintentarRed: !!id });   // un alta no se repite sola: podría duplicarse
  } catch (e) {
    if (e.codigo === 'clave') borrarClave();
    throw e;
  }
  if (typeof r.id !== 'string' || !r.id || !r.oferta || typeof r.oferta !== 'object') throw errorDatos('respuesta');
  aplicarOferta(r.id, r.oferta);
  return { id: r.id, creada: r.creada === true };
}

/* ---- Rondas y aplicaciones: ¿esta conexión sabe guardarlas? ---- */

const FUNCIONES_RONDAS = ['registrarRonda', 'crearAplicacion', 'cambiarEstado'];
// Hacen falta las 3 hojas en el Sheet Y un script que anuncie las 3 funciones; si no, no se enseñan los botones.
export const puedeEscribirRondas = () => puedeEscribir() && estado.conRondas && FUNCIONES_RONDAS.every(f => estado.soporta.includes(f));
// 'conectado' | 'script-antiguo' (script o Sheet sin las rondas) | 'solo-lectura' (demo): para explicar por qué no hay botones.
export const estadoEscrituraRondas = () => (puedeEscribirRondas() ? 'conectado' : estado.modo === 'script' && estado.puedeEscribir ? 'script-antiguo' : 'solo-lectura');

// Pone en memoria lo que hay ahora en el Sheet (tras guardar, o al descartar un cambio propio por un conflicto).
export function aplicarOferta(id, oferta) {
  if (!enMemoria) return;
  const limpio = { id };
  for (const k of CAMPOS_OFERTA) limpio[k] = String(oferta[k] ?? '').trim();
  const i = enMemoria.ofertas.findIndex(x => x.id === id);
  if (i >= 0) Object.assign(enMemoria.ofertas[i], limpio);
  else enMemoria.ofertas.push(limpio);
}

/* ---- Escritura: rondas, aplicaciones y cambios de estado (nunca se borra nada) ---- */

const CAMPOS_RONDA = Object.values(esquemas.RONDA);
const CAMPOS_APLICACION = Object.values(esquemas.APLICACION);
const CAMPOS_HISTORIAL = Object.values(esquemas.HISTORIAL);

// Una respuesta del script solo se acepta si trae el objeto con todos sus campos como texto.
function objetoDe(x, campos) {
  if (!x || typeof x !== 'object') throw errorDatos('respuesta');
  const o = {};
  for (const k of campos) {
    if (x[k] !== undefined && typeof x[k] !== 'string') throw errorDatos('respuesta');
    o[k] = String(x[k] ?? '').trim();
  }
  if (!o.id) throw errorDatos('respuesta');
  return o;
}

// Pone o cambia una fila en memoria (por su ID).
function poner(lista, fila) {
  const i = lista.findIndex(x => x.id === fila.id);
  if (i >= 0) Object.assign(lista[i], fila); else lista.push(fila);
}
export function aplicarRonda(r) { if (enMemoria) poner(enMemoria.rondas, objetoDe(r, CAMPOS_RONDA)); }
export function aplicarAplicacion(a) { if (enMemoria) poner(enMemoria.aplicaciones, objetoDe(a, CAMPOS_APLICACION)); }
function aplicarHistorial(h) { if (enMemoria && h) poner(enMemoria.historial, objetoDe(h, CAMPOS_HISTORIAL)); }

async function pedirRondas(accion, peticion) {
  await datos();
  if (!puedeEscribirRondas()) throw errorDatos('solo-lectura');
  try {
    return await llamarScript(accesoGuardado(), accion, peticion);
  } catch (e) {
    if (e.codigo === 'clave') borrarClave();
    throw e;
  }
}

// Registra una ronda de difusión de una oferta. "numero" es el que la app propone (la siguiente a la última):
// si ya no lo es, el script responde 'conflicto' (con la última y, si existe, la ronda que tiene ese número).
export async function registrarRonda(idOferta, numero, fecha) {
  const r = await pedirRondas('registrarRonda', { idOferta, numero, fecha });
  const ronda = objetoDe(r.ronda, CAMPOS_RONDA);
  aplicarRonda(ronda);
  return ronda;
}

// Un alumno aplica a una ronda de una oferta. Nace "Recibida" con su primera línea de historial.
export async function crearAplicacion({ idAlumno, idOferta, numeroRonda, fecha, notas }) {
  const r = await pedirRondas('crearAplicacion', { idAlumno, idOferta, numeroRonda, fecha, notas });
  const aplicacion = objetoDe(r.aplicacion, CAMPOS_APLICACION), historial = objetoDe(r.historial, CAMPOS_HISTORIAL);
  aplicarAplicacion(aplicacion); aplicarHistorial(historial);
  return { aplicacion, historial };
}

// Cambia el estado de una aplicación. "anterior" = { estado, motivo } tal como se cree que está en el Sheet;
// si otra persona la cambió, el script responde 'conflicto' con la aplicación como está ahora.
export async function cambiarEstado(id, { estado, motivo, fecha, nota }, anterior) {
  const r = await pedirRondas('cambiarEstado', { id, estado, motivo, fecha, nota, anterior });
  const aplicacion = objetoDe(r.aplicacion, CAMPOS_APLICACION);
  const historial = r.historial ? objetoDe(r.historial, CAMPOS_HISTORIAL) : null;
  aplicarAplicacion(aplicacion); aplicarHistorial(historial);
  return { aplicacion, historial, sinCambios: r.sinCambios === true };
}
