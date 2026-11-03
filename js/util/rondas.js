// Rondas de difusión, aplicaciones e historial: orden, resúmenes y avisos (funciones puras: no tocan la pantalla).
// "Ronda" = cada vez que una oferta se reenvía a los alumnos. "Aplicación" = un alumno que responde a una ronda de una oferta.

import { fechaValida } from './ofertas.js';

export const ESTADO_INICIAL = 'Recibida';
export const ESTADO_DESCARTE = 'Descartado';   // el único estado que lleva motivo

export const nombreAlumno = a => `${a.nombre} ${a.apellidos}`.trim();
const num = x => Number(x) || 0;

// Las rondas de una oferta, de la más reciente a la más antigua.
export const rondasDeOferta = (rondas, idOferta) =>
  rondas.filter(r => r.idOferta === idOferta).sort((x, y) => num(y.numero) - num(x.numero));

// Las aplicaciones de una ronda, por orden de llegada (fecha y, a igual fecha, ID).
export const aplicacionesDeRonda = (apps, idOferta, numero) =>
  apps.filter(a => a.idOferta === idOferta && num(a.numeroRonda) === num(numero))
    .sort((x, y) => (x.fecha || '').localeCompare(y.fecha || '') || x.id.localeCompare(y.id));

// Las aplicaciones de un alumno, las más recientes primero.
export const aplicacionesDeAlumno = (apps, idAlumno) =>
  apps.filter(a => a.idAlumno === idAlumno).sort((x, y) => (y.fecha || '').localeCompare(x.fecha || '') || y.id.localeCompare(x.id));

// Cuántas aplicaciones hay en cada estado, en el orden de la lista de estados (los que no estén en la lista, al final).
export function resumenEstados(apps, orden = []) {
  const cuenta = new Map();
  for (const a of apps) cuenta.set(a.estado || 'Sin estado', (cuenta.get(a.estado || 'Sin estado') || 0) + 1);
  const claves = [...orden.filter(e => cuenta.has(e)), ...[...cuenta.keys()].filter(e => !orden.includes(e)).sort()];
  return claves.map(estado => ({ estado, n: cuenta.get(estado) }));
}

// Las líneas del historial de una aplicación, en el orden en que se apuntaron.
export const historialDe = (historial, idAplicacion) =>
  historial.filter(h => h.idAplicacion === idAplicacion).sort((x, y) => (x.fecha || '').localeCompare(y.fecha || '') || x.id.localeCompare(y.id));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const masReciente = fechas => fechas.filter(f => ISO.test(f)).sort().pop() || '';

// La fecha de su último movimiento: no se puede apuntar un cambio anterior a ella.
export const ultimoMovimiento = (app, historial) => masReciente([app.fecha, ...historialDe(historial, app.id).map(h => h.fecha)]);

// La ronda siguiente de una oferta: su número y la fecha de la última (o de la recepción de la oferta, si aún no hay).
export function siguienteRonda(rondas, oferta) {
  const propias = rondasDeOferta(rondas, oferta.id);
  const ultima = propias[0];
  return { numero: ultima ? num(ultima.numero) + 1 : 1, desde: masReciente([oferta.fechaRecepcion, ...propias.map(r => r.fecha)]) };
}

// Alumnos que todavía no han aplicado a esta ronda (por nombre).
export function alumnosSinAplicar(alumnos, apps, idOferta, numero) {
  const ya = new Set(aplicacionesDeRonda(apps, idOferta, numero).map(a => a.idAlumno));
  return alumnos.filter(a => !ya.has(a.id)).sort((x, y) => nombreAlumno(x).localeCompare(nombreAlumno(y), 'es'));
}

// Avisos (solo informativos) cuando hay un choque CLARO entre lo que pide la oferta y la situación del alumno.
// En la duda, no se avisa: un aviso de más es peor que ninguno.
const SIN_PERMISO = ['Necesita permiso de trabajo', 'Permiso de estudiante'];
export function avisosRequisitos(alumno, oferta) {
  const avisos = [];
  if (oferta.requisitoPermiso === 'Permiso de trabajo en vigor' && SIN_PERMISO.includes(alumno.situacionTrabajo)) {
    avisos.push(`La oferta pide permiso de trabajo en vigor y ${nombreAlumno(alumno)} figura como «${alumno.situacionTrabajo}».`);
  }
  const nacionalidades = [alumno.nacionalidadPrincipal, alumno.nacionalidadSecundaria].filter(Boolean);
  if (oferta.requisitoNacionalidad && nacionalidades.length && !nacionalidades.includes(oferta.requisitoNacionalidad)) {
    avisos.push(`La oferta pide nacionalidad «${oferta.requisitoNacionalidad}» y ${nombreAlumno(alumno)} tiene «${nacionalidades.join(' · ')}».`);
  }
  return avisos;
}

// Una clase de color para la insignia del estado (el texto siempre dice el estado: el color solo ayuda).
export const claseEstado = estado => (estado === 'Contratado' ? ' contratado' : estado === ESTADO_DESCARTE ? ' descartada' : '');

/* ---- Validación de los formularios (las mismas reglas que aplica el script; así los errores se ven antes de enviar) ---- */

export const MAX_NOTAS = 2000;
export const normalizarTexto = t => String(t ?? '').replace(/\r\n?/g, '\n').trim();

// Un texto libre de varias líneas (notas): '' si vale, o el código del problema.
export function problemaNota(t) {
  if (t.length > MAX_NOTAS) return 'largo';
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(t)) return 'caracteres';
  if (/<[\/!?a-zA-Z]/.test(t)) return 'html';
  return '';
}

// Cada validador devuelve el primer problema { campo, codigo, desde? } o null.
// Los códigos son los mismos que usa el script: requerido, fecha, fecha-futura, fecha-anterior, largo, caracteres, html, lista.
function problemaFecha(fecha, { hoy, desde }) {
  if (!fecha) return { campo: 'fecha', codigo: 'requerido' };
  if (!fechaValida(fecha)) return { campo: 'fecha', codigo: 'fecha' };
  if (fecha > hoy) return { campo: 'fecha', codigo: 'fecha-futura' };
  if (desde && fecha < desde) return { campo: 'fecha', codigo: 'fecha-anterior', desde };
  return null;
}

// "desde" = la fecha más reciente de las que la anteceden (la oferta o la ronda anterior).
export const validarRonda = (fecha, contexto) => problemaFecha(fecha, contexto);

export function validarAplicacion({ idAlumno, fecha, notas }, contexto) {
  if (!idAlumno) return { campo: 'alumno', codigo: 'requerido' };
  const f = problemaFecha(fecha, contexto);
  if (f) return f;
  const n = problemaNota(notas);
  return n ? { campo: 'notas', codigo: n } : null;
}

// "actual" = { estado, motivo } tal como está ahora; "listas" = { estadosAplicacion, motivosDescarte }.
export function validarCambio({ estado, motivo, fecha, nota }, { actual, listas, ...contexto }) {
  if (!estado) return { campo: 'estado', codigo: 'requerido' };
  if (estado !== actual.estado && !(listas.estadosAplicacion || []).includes(estado)) return { campo: 'estado', codigo: 'lista' };
  if (estado === ESTADO_DESCARTE) {
    if (!motivo) return { campo: 'motivo', codigo: 'requerido' };
    if (motivo !== actual.motivo && !(listas.motivosDescarte || []).includes(motivo)) return { campo: 'motivo', codigo: 'lista' };
  } else if (motivo) return { campo: 'motivo', codigo: 'motivo-sobra' };
  if (estado === actual.estado && motivo === actual.motivo) return { campo: 'estado', codigo: 'sin-cambios' };
  const f = problemaFecha(fecha, contexto);
  if (f) return f;
  const n = problemaNota(nota);
  return n ? { campo: 'nota', codigo: n } : null;
}
