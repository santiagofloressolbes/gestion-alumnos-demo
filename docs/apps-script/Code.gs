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
 *   - Hojas Rondas, Aplicaciones e Historial (si existen): registra una ronda de difusión de una oferta, crea la aplicación
 *     de un alumno a una ronda y cambia su estado. Solo AÑADE filas (a Historial, siempre) y, en una aplicación, cambia las
 *     2 celdas de estado y motivo. Nunca borra filas. Los ID los pone este script (R001, AP001, H001...).
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

// Rondas de difusión, aplicaciones e historial. Sus funciones solo se anuncian si existen las 3 hojas.
const HOJA_RONDAS = 'Rondas';
const HOJA_APLICACIONES = 'Aplicaciones';
const HOJA_HISTORIAL = 'Historial';
const SOPORTA_RONDAS = ['registrarRonda', 'crearAplicacion', 'cambiarEstado'];
// clave interna -> nombre de la columna en el Sheet
const COLS_RONDA = { id: 'ID ronda', idOferta: 'ID oferta', numero: 'Número de ronda', fecha: 'Fecha de envío a los alumnos' };
const COLS_APLICACION = { id: 'ID aplicación', idAlumno: 'ID alumno', idOferta: 'ID oferta', numeroRonda: 'Número de ronda',
  fecha: 'Fecha de aplicación', estado: 'Estado', motivo: 'Motivo de descarte', notas: 'Notas' };
const COLS_HISTORIAL = { id: 'ID cambio', idAplicacion: 'ID aplicación', estadoAnterior: 'Estado anterior', estadoNuevo: 'Estado nuevo',
  motivo: 'Motivo de descarte', fecha: 'Fecha', nota: 'Nota' };
const LISTA_ESTADOS = 'Estado de la aplicación';
const LISTA_MOTIVOS = 'Motivo de descarte';
const ESTADO_INICIAL = 'Recibida';       // estado con el que nace una aplicación (tiene que estar en la lista)
const ESTADO_DESCARTE = 'Descartado';    // el único estado que lleva motivo (tiene que estar en la lista)

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
      case 'ping': return salida({ ok: true, version: VERSION, soporta: funcionesSoportadas() });
      case 'data': return salida(Object.assign({ ok: true, version: VERSION, soporta: funcionesSoportadas(), puedeEscribir: true }, leerTodo()));
      case 'guardarEntrevista': return salida(guardarEntrevista(c));
      case 'guardarOferta': return salida(guardarOferta(c));
      case 'registrarRonda': return salida(registrarRonda(c));
      case 'crearAplicacion': return salida(crearAplicacion(c));
      case 'cambiarEstado': return salida(cambiarEstado(c));
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
  const datos = { alumnos: leerTabla('Alumnos'), ofertas: leerTabla('Ofertas'), listas: leerTabla('Listas') };
  // Si todavía no se han creado las hojas de rondas, no se envían (y la app sigue funcionando como antes).
  if (rondasDisponibles()) {
    datos.rondas = leerTabla(HOJA_RONDAS);
    datos.aplicaciones = leerTabla(HOJA_APLICACIONES);
    datos.historial = leerTabla(HOJA_HISTORIAL);
  }
  return datos;
}

function rondasDisponibles() {
  return [HOJA_RONDAS, HOJA_APLICACIONES, HOJA_HISTORIAL].every(function (n) { return !!SpreadsheetApp.getActive().getSheetByName(n); });
}

function funcionesSoportadas() { return rondasDisponibles() ? SOPORTA.concat(SOPORTA_RONDAS) : SOPORTA.slice(); }

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

function leerListasSiExisten() { return SpreadsheetApp.getActive().getSheetByName('Listas') ? leerListas() : {}; }

// O001, O002... -> el siguiente número libre (con al menos 3 cifras).
function siguienteIdOferta(valores, cId) {
  const ids = [];
  for (let i = 1; i < valores.length; i++) ids.push(valorTexto(valores[i][cId]));
  return siguienteId('O', ids);
}

// Con un prefijo ("O", "R", "AP", "H") y los ID que ya hay: el siguiente número libre, con al menos 3 cifras.
function siguienteId(prefijo, ids) {
  const patron = new RegExp('^' + prefijo + '(\\d+)$', 'i');
  const formato = function (n) { return prefijo + ('000' + n).slice(-Math.max(3, String(n).length)); };
  let max = 0;
  const usados = {};
  ids.forEach(function (x) {
    const v = String(x).trim();
    usados[v.toUpperCase()] = true;
    const m = patron.exec(v);
    if (m && +m[1] > max) max = +m[1];
  });
  let n = max + 1, id = formato(n);
  while (usados[id]) { n++; id = formato(n); }
  return id;
}

/* ------------------------------------------ escritura: rondas, aplicaciones e historial */

// Una ronda de difusión = cada vez que se reenvía una oferta a los alumnos. La petición lleva:
//   idOferta, numero (la ronda que la app propone: la siguiente a la última de esa oferta) y fecha (AAAA-MM-DD, de envío).
// Si "numero" ya no es la siguiente (otra persona registró una ronda, o esta misma petición ya se guardó y se perdió
// la respuesta), no se crea nada y se responde 'conflicto' con la última ronda y, si existe, la que tiene ese número.
function registrarRonda(c) {
  const idOferta = idPeticion(c.idOferta);
  const numero = numeroPeticion(c.numero);
  if (typeof c.fecha !== 'string') throw fallo('peticion');
  const fecha = fechaPeticion(c.fecha, 'fecha');

  const oferta = unica(abrirTabla(HOJA_OFERTAS, { id: COL_ID_OFERTA, fecha: 'Fecha de recepción' }), function (f) { return f.v.id === idOferta; }, 'oferta');
  const rondas = abrirTabla(HOJA_RONDAS, COLS_RONDA);
  const propias = rondas.filas.filter(function (f) { return f.v.idOferta === idOferta; });
  let ultima = 0, fechaUltima = '';
  propias.forEach(function (f) {
    const n = Number(f.v.numero) || 0;
    if (n >= ultima) { ultima = n; fechaUltima = f.v.fecha; }
  });
  if (numero !== ultima + 1) {
    const existente = propias.filter(function (f) { return Number(f.v.numero) === numero; })[0];
    throw fallo('conflicto', { ultima: String(ultima), ronda: existente ? existente.v : undefined });
  }
  comprobarNoAnterior(fecha, [oferta.v.fecha, fechaUltima]);   // no antes de que se recibiera la oferta ni de la ronda anterior

  const nueva = { id: siguienteId('R', rondas.filas.map(function (f) { return f.v.id; })), idOferta: idOferta, numero: String(numero), fecha: fecha };
  escribirTodo([filaNueva(rondas, COLS_RONDA, nueva)]);
  return { ok: true, ronda: nueva };
}

// Un alumno aplica a una ronda de una oferta. La petición lleva: idAlumno, idOferta, numeroRonda, fecha y notas.
// Nace con el estado inicial y su primera línea de Historial. Una misma pareja alumno + oferta + ronda no se repite
// ('duplicado', con la que ya existe). Una oferta cerrada se admite (la app avisa).
function crearAplicacion(c) {
  const idAlumno = idPeticion(c.idAlumno), idOferta = idPeticion(c.idOferta);
  const numero = numeroPeticion(c.numeroRonda);
  if (typeof c.fecha !== 'string' || typeof c.notas !== 'string') throw fallo('peticion');
  const fecha = fechaPeticion(c.fecha, 'fecha');
  const notas = validarNota(c.notas, 'notas');
  if (listaDe(LISTA_ESTADOS).indexOf(ESTADO_INICIAL) < 0) throw fallo('lista', { campo: 'estado' });

  unica(abrirTabla(HOJA_ALUMNOS, { id: COL_ID }), function (f) { return f.v.id === idAlumno; }, 'alumno');
  unica(abrirTabla(HOJA_OFERTAS, { id: COL_ID_OFERTA }), function (f) { return f.v.id === idOferta; }, 'oferta');
  const ronda = unica(abrirTabla(HOJA_RONDAS, COLS_RONDA), function (f) { return f.v.idOferta === idOferta && Number(f.v.numero) === numero; }, 'ronda');
  comprobarNoAnterior(fecha, [ronda.v.fecha]);

  const apps = abrirTabla(HOJA_APLICACIONES, COLS_APLICACION);
  const repetida = apps.filas.filter(function (f) {
    return f.v.idAlumno === idAlumno && f.v.idOferta === idOferta && Number(f.v.numeroRonda) === numero;
  })[0];
  if (repetida) throw fallo('duplicado', { aplicacion: repetida.v });

  const hist = abrirTabla(HOJA_HISTORIAL, COLS_HISTORIAL);
  const aplicacion = { id: siguienteId('AP', apps.filas.map(function (f) { return f.v.id; })), idAlumno: idAlumno, idOferta: idOferta,
    numeroRonda: String(numero), fecha: fecha, estado: ESTADO_INICIAL, motivo: '', notas: notas };
  const cambio = { id: siguienteId('H', hist.filas.map(function (f) { return f.v.id; })), idAplicacion: aplicacion.id, estadoAnterior: '',
    estadoNuevo: ESTADO_INICIAL, motivo: '', fecha: fecha, nota: '' };
  escribirTodo([filaNueva(apps, COLS_APLICACION, aplicacion), filaNueva(hist, COLS_HISTORIAL, cambio)]);
  return { ok: true, aplicacion: aplicacion, historial: cambio };
}

// Cambia el estado de una aplicación (hacia delante o hacia atrás) y lo apunta en Historial. La petición lleva:
//   id (de la aplicación), estado, motivo (solo con "Descartado"), fecha, nota, y anterior: { estado, motivo } = lo que la app creía que había.
// Si el Sheet ya no coincide con "anterior": 'conflicto' con la aplicación tal como está. Sin cambios reales: no escribe nada.
function cambiarEstado(c) {
  const id = idPeticion(c.id);
  ['estado', 'motivo', 'fecha', 'nota'].forEach(function (k) { if (typeof c[k] !== 'string') throw fallo('peticion'); });
  if (!objetoPlano(c.anterior) || typeof c.anterior.estado !== 'string' || typeof c.anterior.motivo !== 'string') throw fallo('peticion');
  const estado = c.estado.trim(), motivo = c.motivo.trim();
  const fecha = fechaPeticion(c.fecha, 'fecha');
  const nota = validarNota(c.nota, 'nota');
  if (!estado) throw fallo('requerido', { campo: 'estado' });
  if (listaDe(LISTA_ESTADOS).indexOf(estado) < 0) throw fallo('lista', { campo: 'estado' });
  if (estado === ESTADO_DESCARTE) {
    if (!motivo) throw fallo('requerido', { campo: 'motivo' });
    if (listaDe(LISTA_MOTIVOS).indexOf(motivo) < 0) throw fallo('lista', { campo: 'motivo' });
  } else if (motivo) {
    throw fallo('motivo-sobra', { campo: 'motivo' });
  }

  const apps = abrirTabla(HOJA_APLICACIONES, COLS_APLICACION);
  const fila = unica(apps, function (f) { return f.v.id === id; }, 'aplicacion');
  const actual = fila.v;
  if (actual.estado !== c.anterior.estado.trim() || actual.motivo !== c.anterior.motivo.trim()) throw fallo('conflicto', { aplicacion: actual });
  if (estado === actual.estado && motivo === actual.motivo) return { ok: true, aplicacion: actual, historial: null, sinCambios: true };

  const hist = abrirTabla(HOJA_HISTORIAL, COLS_HISTORIAL);
  const suyas = hist.filas.filter(function (f) { return f.v.idAplicacion === id; }).map(function (f) { return f.v.fecha; });
  comprobarNoAnterior(fecha, [actual.fecha].concat(suyas));   // no antes de su último movimiento

  const nueva = Object.assign({}, actual, { estado: estado, motivo: motivo });
  const cambio = { id: siguienteId('H', hist.filas.map(function (f) { return f.v.id; })), idAplicacion: id, estadoAnterior: actual.estado,
    estadoNuevo: estado, motivo: motivo, fecha: fecha, nota: nota };
  const celdas = [];
  ['estado', 'motivo'].forEach(function (k) {
    if (nueva[k] !== actual[k]) celdas.push({ col: apps.cols[k], valor: nueva[k], antes: valorTexto(apps.valores[fila.fila - 1][apps.cols[k]]) });
  });
  escribirTodo([{ h: apps.h, fila: fila.fila, celdas: celdas }, filaNueva(hist, COLS_HISTORIAL, cambio)]);
  return { ok: true, aplicacion: nueva, historial: cambio, sinCambios: false };
}

// Lee una hoja y localiza sus columnas por su nombre. Devuelve:
//   { h, valores, cols: { clave: nº de columna }, filas: [{ fila: nº de fila en la hoja, v: { clave: texto } }] } (sin las filas vacías).
function abrirTabla(nombre, columnas) {
  const h = hoja(nombre);
  const valores = h.getDataRange().getValues();
  const cab = (valores[0] || []).map(function (x) { return valorTexto(x).trim(); });
  const cols = {};
  Object.keys(columnas).forEach(function (k) {
    cols[k] = cab.indexOf(columnas[k]);
    if (cols[k] < 0) throw fallo('columna', { columna: columnas[k] });
  });
  const filas = [];
  for (let i = 1; i < valores.length; i++) {
    const v = {};
    Object.keys(cols).forEach(function (k) { v[k] = valorTexto(valores[i][cols[k]]).trim(); });
    if (Object.keys(v).some(function (k) { return v[k] !== ''; })) filas.push({ fila: i + 1, v: v });
  }
  return { h: h, valores: valores, cols: cols, filas: filas };
}

// La única fila que cumple la condición; si no hay ninguna o hay varias, falla diciendo de qué se trata.
function unica(tabla, cumple, campo) {
  const f = tabla.filas.filter(cumple);
  if (!f.length) throw fallo('no-encontrado', { campo: campo });
  if (f.length > 1) throw fallo('id-duplicado', { campo: campo });
  return f[0];
}

function listaDe(nombre) {
  const l = leerListas()[nombre];
  if (!l) throw fallo('columna', { columna: nombre });
  return l;
}

// Una fila nueva al final: la primera fila libre tras el último dato (así una fila que se dejó en blanco se reutiliza).
function filaNueva(t, columnas, v) {
  let fila = 2;
  for (let i = t.valores.length - 1; i >= 1; i--) {
    if (t.valores[i].some(function (x) { return valorTexto(x).trim() !== ''; })) { fila = i + 2; break; }
  }
  return { h: t.h, fila: fila, celdas: Object.keys(columnas).map(function (k) { return { col: t.cols[k], valor: v[k], antes: '' }; }) };
}

// Escribe varias cosas (cada una: { h, fila, celdas: [{ col, valor, antes }] }) como texto plano. Si una falla, deja todo como estaba:
// así nunca queda una aplicación sin su línea de Historial, ni al revés.
function escribirTodo(escrituras) {
  const hechas = [];
  try {
    escrituras.forEach(function (e) { hechas.push(e); poner(e, false); });
    SpreadsheetApp.flush();
  } catch (x) {
    hechas.reverse().forEach(function (e) {
      try { poner(e, true); } catch (y) { console.error('No se pudo deshacer: ' + String(y)); }
    });
    throw x;
  }
}

function poner(e, deshacer) {
  e.celdas.forEach(function (c) {
    const celda = e.h.getRange(e.fila, c.col + 1);
    celda.setNumberFormat('@');
    celda.setValue(deshacer ? c.antes : c.valor);
  });
}

function idPeticion(x) {
  if (typeof x !== 'string' || !x.trim() || x.length > 40) throw fallo('peticion');
  return x.trim();
}

// Un número de ronda: entero de 1 a 999, como número o como texto ("2").
function numeroPeticion(x) {
  const n = typeof x === 'number' ? x : (typeof x === 'string' && /^\d{1,3}$/.test(x.trim()) ? Number(x) : NaN);
  if (!Number.isInteger(n) || n < 1 || n > 999) throw fallo('peticion');
  return n;
}

function fechaPeticion(bruto, campo) {
  const f = bruto.trim();
  if (!f) throw fallo('requerido', { campo: campo });
  if (!fechaValida(f)) throw fallo('fecha', { campo: campo });
  if (f > hoyTexto()) throw fallo('fecha-futura', { campo: campo });
  return f;
}

// La fecha no puede ser anterior a la más reciente de "referencias" (las vacías o raras se ignoran).
function comprobarNoAnterior(fecha, referencias) {
  const desde = referencias.filter(fechaValida).sort().pop();
  if (desde && fecha < desde) throw fallo('fecha-anterior', { campo: 'fecha', desde: desde });
}

// Texto libre de varias líneas (notas): sin HTML ni caracteres raros, y que nunca se interprete como fórmula.
function validarNota(bruto, campo) {
  const v = normalizarTexto(bruto).trim();
  if (v.length > MAX_NOTAS) throw fallo('largo', { campo: campo });
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v)) throw fallo('caracteres', { campo: campo });
  if (/<[\/!?a-zA-Z]/.test(v)) throw fallo('html', { campo: campo });
  return /^[=+\-@]/.test(v) ? ' ' + v : v;
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
  ['Alumnos', 'Ofertas', 'Listas', HOJA_RONDAS, HOJA_APLICACIONES, HOJA_HISTORIAL].forEach(function (n) {
    const h = SpreadsheetApp.getActive().getSheetByName(n);
    informe.hojas[n] = h ? (h.getLastRow() - 1) + ' filas' : 'FALTA LA HOJA';
  });
  informe.rondas = rondasDisponibles() ? 'listas (se anuncian a la app)' : 'FALTAN HOJAS: crea Rondas, Aplicaciones e Historial';
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
  [LISTA_ESTADOS, LISTA_MOTIVOS].forEach(function (n) { informe.listas[n] = cabL.indexOf(n) >= 0 ? 'ok' : 'FALTA LA COLUMNA EN LISTAS'; });
  const l = leerListasSiExisten();
  informe.estados = {};
  informe.estados[ESTADO_INICIAL] = l[LISTA_ESTADOS] && l[LISTA_ESTADOS].indexOf(ESTADO_INICIAL) >= 0 ? 'ok' : 'FALTA EN LA LISTA';
  informe.estados[ESTADO_DESCARTE] = l[LISTA_ESTADOS] && l[LISTA_ESTADOS].indexOf(ESTADO_DESCARTE) >= 0 ? 'ok' : 'FALTA EN LA LISTA';
  informe.columnasRondas = {};
  [[HOJA_RONDAS, COLS_RONDA], [HOJA_APLICACIONES, COLS_APLICACION], [HOJA_HISTORIAL, COLS_HISTORIAL]].forEach(function (p) {
    const hh = SpreadsheetApp.getActive().getSheetByName(p[0]);
    const cabH = hh ? hh.getDataRange().getValues()[0].map(function (x) { return valorTexto(x).trim(); }) : [];
    Object.keys(p[1]).forEach(function (k) { informe.columnasRondas[p[0] + ' > ' + p[1][k]] = cabH.indexOf(p[1][k]) >= 0 ? 'ok' : 'FALTA'; });
  });
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
  ['segundos', 'hoja', 'columna', 'notas', 'fecha', 'campo', 'id', 'oferta', 'ultima', 'ronda', 'aplicacion', 'desde'].forEach(function (k) { if (err.detalle[k] !== undefined) r[k] = err.detalle[k]; });
  return r;
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
