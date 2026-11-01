/**
 * Puente entre la app "Gestión de alumnos (demo)" y esta hoja de cálculo.
 *
 * SOLO PARA DATOS DE PRUEBA. Con alumnos reales NO se usa (ver DECISIONES.md).
 *
 * Qué hace:
 *   - Lee las hojas Alumnos, Ofertas y Listas y las devuelve a la app.
 *   - Hoja Alumnos: escribe SOLO 2 columnas ("Notas de entrevista" y "Fecha última entrevista"),
 *     y solo en la fila del alumno indicado. No crea ni borra filas de alumnos.
 *   - Hoja Ofertas: da de alta una oferta (añade una fila al final) o edita las 11 columnas de una oferta.
 *     Nunca borra filas. El ID de una oferta nueva lo pone este script (O011, O012...).
 *   - No toca ninguna otra hoja ni columna (la hoja Listas solo se lee).
 *
 * La CLAVE no está en este archivo: se guarda en Configuración del proyecto > Propiedades del script
 * (nombre: CLAVE). Este archivo es público y no debe contener nunca ninguna clave.
 *
 * @OnlyCurrentDoc
 */

const VERSION = 1;
const HOJA_ALUMNOS = 'Alumnos';
const COL_ID = 'ID alumno';
const COL_NOTAS = 'Notas de entrevista';
const COL_FECHA = 'Fecha última entrevista';

const HOJA_OFERTAS = 'Ofertas';
const COL_ID_OFERTA = 'ID oferta';
// Funciones de escritura que ofrece este script (la app las consulta para saber qué puede hacer).
const SOPORTA = ['guardarEntrevista', 'guardarOferta'];

// Columnas de una oferta que la app puede escribir. "lista" = el valor debe existir en esa columna de la hoja Listas.
const CAMPOS_OFERTA = [
  { col: 'Empresa', clave: 'empresa', max: 100, obligatorio: true },
  { col: 'Tipo de organización', clave: 'tipoOrganizacion', lista: 'Tipo de organización', obligatorio: true },
  { col: 'Área', clave: 'area', lista: 'Área', obligatorio: true },
  { col: 'Título del puesto', clave: 'titulo', max: 120, obligatorio: true },
  { col: 'Tipo', clave: 'tipo', lista: 'Tipo de oferta', obligatorio: true },
  { col: 'Ubicación', clave: 'ubicacion', max: 100, obligatorio: true },
  { col: 'Requisito de nacionalidad', clave: 'requisitoNacionalidad', lista: 'Nacionalidad', obligatorio: false },
  { col: 'Requisito de permiso de trabajo', clave: 'requisitoPermiso', lista: 'Requisito de permiso', obligatorio: true },
  { col: 'Fecha de recepción', clave: 'fechaRecepcion', fecha: true, obligatorio: true },
  { col: 'Estado de la oferta', clave: 'estado', lista: 'Estado de la oferta', obligatorio: true },
  { col: 'Enlace o descripción', clave: 'enlace', max: 500, enlace: true, obligatorio: false },
];

const MAX_NOTAS = 2000;                 // caracteres
const MAX_CUERPO = 10000;               // tamaño máximo de una petición
const CLAVE_MIN = 16;                   // una clave más corta se considera "sin configurar"
const MAX_FALLOS = 5;                   // intentos fallidos seguidos antes de bloquear
const BLOQUEO_MS = 15 * 60 * 1000;      // 15 minutos
const P_CLAVE = 'CLAVE';
const P_FALLOS = '_FALLOS';
const P_BLOQUEO = '_BLOQUEO_HASTA';

/* ---------------------------------------------------------------- entrada web */

function doGet() {
  return ContentService.createTextOutput('Puente de datos de prueba. Usa la app para conectarte.');
}

function doPost(e) {
  let candado = null;
  try {
    const c = leerCuerpo(e);
    candado = LockService.getScriptLock();
    try { candado.waitLock(20000); } catch (x) { throw fallo('ocupado'); }
    comprobarAcceso(c.key);
    switch (c.action) {
      case 'ping': return salida({ ok: true, version: VERSION, soporta: SOPORTA });
      case 'data': return salida(Object.assign({ ok: true, version: VERSION, soporta: SOPORTA, puedeEscribir: true }, leerTodo()));
      case 'guardarEntrevista': return salida(guardarEntrevista(c));
      case 'guardarOferta': return salida(guardarOferta(c));
      default: throw fallo('accion');
    }
  } catch (err) {
    if (err && err.codigo) return salida(respuestaError(err));
    console.error('Error interno: ' + String(err));       // el detalle queda en el registro, nunca se envía a la app
    return salida({ ok: false, error: 'servidor' });
  } finally {
    if (candado) { try { candado.releaseLock(); } catch (x) { /* no estaba cogido */ } }
  }
}

/* ------------------------------------------------------------------- acceso */

// Comprueba la clave. Tras MAX_FALLOS fallos seguidos bloquea BLOQUEO_MS (también para la clave buena).
function comprobarAcceso(clave) {
  const props = PropertiesService.getScriptProperties();
  const real = props.getProperty(P_CLAVE);
  if (!real || real.length < CLAVE_MIN) throw fallo('config');
  const t = ahora().getTime();
  const hasta = Number(props.getProperty(P_BLOQUEO)) || 0;
  if (t < hasta) throw fallo('bloqueado', { segundos: Math.ceil((hasta - t) / 1000) });

  if (typeof clave === 'string' && iguales(clave, real)) {
    props.deleteProperty(P_FALLOS);
    return;
  }
  const n = (Number(props.getProperty(P_FALLOS)) || 0) + 1;
  if (n >= MAX_FALLOS) {
    props.setProperty(P_BLOQUEO, String(t + BLOQUEO_MS));
    props.setProperty(P_FALLOS, '0');
    throw fallo('bloqueado', { segundos: BLOQUEO_MS / 1000 });
  }
  props.setProperty(P_FALLOS, String(n));
  throw fallo('clave');
}

// Comparación que tarda lo mismo aunque la clave falle antes o después.
function iguales(a, b) {
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

/* ------------------------------------------------------------------ lectura */

function leerTodo() {
  return { alumnos: leerTabla('Alumnos'), ofertas: leerTabla('Ofertas'), listas: leerTabla('Listas') };
}

// { cabecera: [...], filas: [[...], ...] } con todo convertido a texto (las fechas como AAAA-MM-DD).
function leerTabla(nombre) {
  const valores = hoja(nombre).getDataRange().getValues();
  if (!valores.length) throw fallo('hoja', { hoja: nombre });
  const cabecera = valores[0].map(c => valorTexto(c).trim());
  const filas = valores.slice(1).map(f => f.map(valorTexto)).filter(f => f.some(c => c.trim() !== ''));
  return { cabecera: cabecera, filas: filas };
}

/* ---------------------------------------------------------------- escritura */

function guardarEntrevista(c) {
  // 1) Forma de la petición
  if (typeof c.id !== 'string' || !c.id.trim() || c.id.length > 40) throw fallo('peticion');
  if (typeof c.notas !== 'string' || typeof c.fecha !== 'string') throw fallo('peticion');
  if (typeof c.notasAnteriores !== 'string' || typeof c.fechaAnterior !== 'string') throw fallo('peticion');

  // 2) Validación del contenido
  let notas = normalizarTexto(c.notas).trim();
  const fecha = c.fecha.trim();
  if (notas.length > MAX_NOTAS) throw fallo('largo');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(notas)) throw fallo('caracteres');
  if (/<[\/!?a-zA-Z]/.test(notas)) throw fallo('html');            // etiquetas HTML ("<b>", "</p>", "<!--"...)
  if (notas || fecha) {                                            // notas y fecha vacías = borrar la entrevista
    if (!fechaValida(fecha)) throw fallo('fecha');
    if (fecha > hoyTexto()) throw fallo('fecha-futura');
  }

  // 3) Localizar la fila y las columnas por su nombre
  const h = hoja(HOJA_ALUMNOS);
  const valores = h.getDataRange().getValues();
  const cab = (valores[0] || []).map(x => valorTexto(x).trim());
  const cId = cab.indexOf(COL_ID), cNotas = cab.indexOf(COL_NOTAS), cFecha = cab.indexOf(COL_FECHA);
  if (cId < 0) throw fallo('columna', { columna: COL_ID });
  if (cNotas < 0) throw fallo('columna', { columna: COL_NOTAS });
  if (cFecha < 0) throw fallo('columna', { columna: COL_FECHA });
  const filas = [];
  for (let i = 1; i < valores.length; i++) if (valorTexto(valores[i][cId]).trim() === c.id.trim()) filas.push(i);
  if (!filas.length) throw fallo('no-encontrado');
  if (filas.length > 1) throw fallo('id-duplicado');
  const i = filas[0];

  // 4) Si alguien cambió la entrevista mientras tanto, no se pisa
  const actualNotas = normalizarTexto(valorTexto(valores[i][cNotas]));
  const actualFecha = valorTexto(valores[i][cFecha]);
  if (actualNotas !== normalizarTexto(c.notasAnteriores) || actualFecha !== c.fechaAnterior) {
    throw fallo('conflicto', { notas: actualNotas, fecha: actualFecha });
  }

  // 5) Un texto que empieza por = + - @ se podría interpretar como fórmula al abrir el Sheet o un CSV: se le antepone un espacio
  if (/^[=+\-@]/.test(notas)) notas = ' ' + notas;

  // 6) Escribir SOLO esas 2 celdas, como texto plano
  const celdaNotas = h.getRange(i + 1, cNotas + 1);
  const celdaFecha = h.getRange(i + 1, cFecha + 1);
  celdaNotas.setNumberFormat('@');
  celdaNotas.setValue(notas);
  celdaFecha.setNumberFormat('@');
  celdaFecha.setValue(fecha);
  SpreadsheetApp.flush();
  return { ok: true, notas: notas, fecha: fecha };
}

/* ------------------------------------------------------------ escritura: ofertas */

// Alta (sin "id") o edición (con "id") de una oferta. La petición lleva:
//   oferta: { empresa, tipoOrganizacion, area, titulo, tipo, ubicacion, requisitoNacionalidad, requisitoPermiso, fechaRecepcion, estado, enlace }
//   anteriores (solo al editar): los mismos campos tal como la app los conocía, para detectar cambios ajenos.
function guardarOferta(c) {
  const crear = c.id === undefined || c.id === null || c.id === '';
  // 1) Forma de la petición
  if (!crear && (typeof c.id !== 'string' || !c.id.trim() || c.id.length > 40)) throw fallo('peticion');
  if (!objetoPlano(c.oferta)) throw fallo('peticion');
  if (!crear && !objetoPlano(c.anteriores)) throw fallo('peticion');
  CAMPOS_OFERTA.forEach(function (f) {
    if (typeof c.oferta[f.clave] !== 'string') throw fallo('peticion');
    if (!crear && typeof c.anteriores[f.clave] !== 'string') throw fallo('peticion');
  });

  // 2) Validación del contenido (las listas se leen de la hoja Listas)
  const listas = leerListas();
  const nuevo = {};
  CAMPOS_OFERTA.forEach(function (f) { nuevo[f.clave] = validarCampoOferta(f, c.oferta[f.clave], listas); });

  // 3) Localizar la hoja y las columnas por su nombre
  const h = hoja(HOJA_OFERTAS);
  const valores = h.getDataRange().getValues();
  const cab = (valores[0] || []).map(function (x) { return valorTexto(x).trim(); });
  const cId = cab.indexOf(COL_ID_OFERTA);
  if (cId < 0) throw fallo('columna', { columna: COL_ID_OFERTA });
  const cols = {};
  CAMPOS_OFERTA.forEach(function (f) {
    cols[f.clave] = cab.indexOf(f.col);
    if (cols[f.clave] < 0) throw fallo('columna', { columna: f.col });
  });

  let id, fila, escribir;
  if (crear) {
    // 4a) Alta: ID nuevo (el siguiente libre) y una fila al final
    id = siguienteIdOferta(valores, cId);
    fila = valores.length + 1;
    escribir = CAMPOS_OFERTA.map(function (f) { return f.clave; });
  } else {
    // 4b) Edición: la fila tiene que existir una sola vez y no haber cambiado desde que la app la leyó
    id = c.id.trim();
    const filas = [];
    for (let i = 1; i < valores.length; i++) if (valorTexto(valores[i][cId]).trim() === id) filas.push(i);
    if (!filas.length) throw fallo('no-encontrado');
    if (filas.length > 1) throw fallo('id-duplicado');
    const i = filas[0];
    const actual = {};
    CAMPOS_OFERTA.forEach(function (f) { actual[f.clave] = valorTexto(valores[i][cols[f.clave]]).trim(); });
    const cambioAjeno = CAMPOS_OFERTA.some(function (f) { return actual[f.clave] !== c.anteriores[f.clave].trim(); });
    if (cambioAjeno) throw fallo('conflicto', { id: id, oferta: actual });
    fila = i + 1;
    escribir = CAMPOS_OFERTA.filter(function (f) { return actual[f.clave] !== nuevo[f.clave].trim(); }).map(function (f) { return f.clave; });
  }

  // 5) Escribir SOLO las celdas necesarias de esa fila, como texto plano (sin fórmulas)
  if (crear) {
    const celdaId = h.getRange(fila, cId + 1);
    celdaId.setNumberFormat('@');
    celdaId.setValue(id);
  }
  escribir.forEach(function (clave) {
    const celda = h.getRange(fila, cols[clave] + 1);
    celda.setNumberFormat('@');
    celda.setValue(nuevo[clave]);
  });
  SpreadsheetApp.flush();
  return { ok: true, id: id, creada: crear, oferta: nuevo };
}

function objetoPlano(o) { return Object.prototype.toString.call(o) === '[object Object]'; }

// Valida un campo y devuelve el texto que se guardará (sin espacios sobrantes, y sin poder ser una fórmula).
function validarCampoOferta(f, bruto, listas) {
  const v = normalizarTexto(bruto).trim();
  if (!v) {
    if (f.obligatorio) throw fallo('requerido', { campo: f.clave });
    return '';
  }
  if (/[\u0000-\u001F\u007F]/.test(v)) throw fallo('caracteres', { campo: f.clave });   // también rechaza saltos de línea: son campos de una línea
  if (/<[\/!?a-zA-Z]/.test(v)) throw fallo('html', { campo: f.clave });
  if (f.max && v.length > f.max) throw fallo('largo', { campo: f.clave });
  if (f.lista) {
    if (!listas[f.lista]) throw fallo('columna', { columna: f.lista });
    if (listas[f.lista].indexOf(v) < 0) throw fallo('lista', { campo: f.clave });
    return v;
  }
  if (f.fecha) {
    if (!fechaValida(v)) throw fallo('fecha', { campo: f.clave });
    if (v > hoyTexto()) throw fallo('fecha-futura', { campo: f.clave });
    return v;
  }
  if (f.enlace && /^(javascript|data|vbscript|file|http):/i.test(v)) throw fallo('enlace', { campo: f.clave });
  return /^[=+\-@]/.test(v) ? ' ' + v : v;
}

// { "Nombre de la columna": [valores sin repetir] } de la hoja Listas. Solo lectura.
function leerListas() {
  const t = leerTabla('Listas');
  const out = {};
  t.cabecera.forEach(function (nombre, i) {
    if (!nombre) return;
    const vals = [];
    t.filas.forEach(function (f) { const x = (f[i] || '').trim(); if (x && vals.indexOf(x) < 0) vals.push(x); });
    out[nombre] = vals;
  });
  return out;
}

// O001, O002... -> el siguiente número libre (con al menos 3 cifras).
function siguienteIdOferta(valores, cId) {
  let max = 0;
  const usados = {};
  for (let i = 1; i < valores.length; i++) {
    const v = valorTexto(valores[i][cId]).trim();
    usados[v.toUpperCase()] = true;
    const m = /^O(\d+)$/i.exec(v);
    if (m && +m[1] > max) max = +m[1];
  }
  let n = max + 1, id = 'O' + ('000' + n).slice(-Math.max(3, String(n).length));
  while (usados[id]) { n++; id = 'O' + ('000' + n).slice(-Math.max(3, String(n).length)); }
  return id;
}

/* ------------------------------------------------- funciones solo para el editor */
// Se ejecutan a mano desde el editor de Apps Script (botón "Ejecutar"). La app no puede llamarlas.

// Quita el bloqueo sin esperar los 15 minutos.
function desbloquear() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(P_BLOQUEO);
  props.deleteProperty(P_FALLOS);
  console.log('Bloqueo quitado.');
}

// Revisa que todo esté listo, sin mostrar la clave.
function comprobarConfiguracion() {
  const props = PropertiesService.getScriptProperties();
  const clave = props.getProperty(P_CLAVE);
  const informe = { clave: !clave ? 'FALTA' : clave.length < CLAVE_MIN ? 'DEMASIADO CORTA (mínimo ' + CLAVE_MIN + ')' : 'ok (' + clave.length + ' caracteres)', hojas: {} };
  ['Alumnos', 'Ofertas', 'Listas'].forEach(function (n) {
    const h = SpreadsheetApp.getActive().getSheetByName(n);
    informe.hojas[n] = h ? (h.getLastRow() - 1) + ' filas' : 'FALTA LA HOJA';
  });
  const h = SpreadsheetApp.getActive().getSheetByName(HOJA_ALUMNOS);
  const cab = h ? h.getDataRange().getValues()[0].map(function (x) { return valorTexto(x).trim(); }) : [];
  informe.columnas = {};
  [COL_ID, COL_NOTAS, COL_FECHA].forEach(function (n) { informe.columnas[n] = cab.indexOf(n) >= 0 ? 'ok' : 'FALTA'; });
  const ho = SpreadsheetApp.getActive().getSheetByName(HOJA_OFERTAS);
  const cabO = ho ? ho.getDataRange().getValues()[0].map(function (x) { return valorTexto(x).trim(); }) : [];
  informe.columnasOfertas = {};
  [COL_ID_OFERTA].concat(CAMPOS_OFERTA.map(function (f) { return f.col; })).forEach(function (n) { informe.columnasOfertas[n] = cabO.indexOf(n) >= 0 ? 'ok' : 'FALTA'; });
  const hl = SpreadsheetApp.getActive().getSheetByName('Listas');
  const cabL = hl ? hl.getDataRange().getValues()[0].map(function (x) { return valorTexto(x).trim(); }) : [];
  informe.listas = {};
  CAMPOS_OFERTA.filter(function (f) { return f.lista; }).forEach(function (f) { informe.listas[f.lista] = cabL.indexOf(f.lista) >= 0 ? 'ok' : 'FALTA LA COLUMNA EN LISTAS'; });
  const hasta = Number(props.getProperty(P_BLOQUEO)) || 0;
  informe.bloqueado = ahora().getTime() < hasta;
  console.log(JSON.stringify(informe, null, 2));
  return informe;
}

/* ------------------------------------------------------------------ ayudas */

function ahora() { return new Date(); }

function hoyTexto() { return Utilities.formatDate(ahora(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

function hoja(nombre) {
  const h = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!h) throw fallo('hoja', { hoja: nombre });
  return h;
}

function valorTexto(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

function normalizarTexto(t) { return String(t).replace(/\r\n?/g, '\n'); }

function fechaValida(f) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f);
  if (!m) return false;
  const a = +m[1], mes = +m[2], d = +m[3];
  if (a < 2000) return false;
  const dt = new Date(Date.UTC(a, mes - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === d;
}

function leerCuerpo(e) {
  const txt = e && e.postData && e.postData.contents;
  if (typeof txt !== 'string' || !txt || txt.length > MAX_CUERPO) throw fallo('peticion');
  let c;
  try { c = JSON.parse(txt); } catch (x) { throw fallo('peticion'); }
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw fallo('peticion');
  return c;
}

function fallo(codigo, detalle) {
  const err = new Error(codigo);
  err.codigo = codigo;
  err.detalle = detalle || {};
  return err;
}

// Solo salen códigos cortos y estos datos concretos; nunca el texto de un error interno.
function respuestaError(err) {
  const r = { ok: false, error: err.codigo };
  ['segundos', 'hoja', 'columna', 'notas', 'fecha', 'campo', 'id', 'oferta'].forEach(function (k) { if (err.detalle[k] !== undefined) r[k] = err.detalle[k]; });
  return r;
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
