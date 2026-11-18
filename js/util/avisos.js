// Avisos sobre alumnos (funciones puras: solo leen y calculan, no tocan la pantalla ni los datos).
// Un aviso NUNCA bloquea ni oculta nada: es una ayuda para mirar, y siempre dice por qué ha saltado.
//
//   sin-solicitudes  → en los últimos N días se enviaron al menos M ofertas y el alumno no ha hecho ninguna solicitud.
//   aplica-a-todo    → en los últimos N días ha hecho al menos S solicitudes y a un P % o más de las ofertas enviadas.
//
// Reglas que valen para los dos:
//  · El periodo cuenta desde la primera ronda registrada, si es más reciente que "hoy − N días" (así nadie salta el primer día).
//  · "Ofertas enviadas" = ofertas distintas con alguna ronda en el periodo.
//  · Quien ya está Contratado no recibe "sin solicitudes".
//  · Una solicitud sin fecha válida no se puede situar en el tiempo: evita "sin solicitudes" (por si acaso) y no cuenta para "aplica a todo".
//  · Sin rondas registradas no hay avisos.

import { evaluar } from './match.js';
import { fechaValida } from './ofertas.js';

export const UMBRALES_POR_DEFECTO = Object.freeze({ dias: 30, ofertas: 3, solicitudes: 5, porcentaje: 80 });
export const LIMITES = Object.freeze({ dias: [1, 365], ofertas: [1, 50], solicitudes: [1, 50], porcentaje: [1, 100] });
export const TIPOS = Object.freeze({ sinSolicitudes: 'sin-solicitudes', aplicaTodo: 'aplica-a-todo' });
export const TITULO_TIPO = Object.freeze({ 'sin-solicitudes': 'Sin solicitudes', 'aplica-a-todo': 'Ha solicitado casi todas las ofertas' });
// Nombre corto para la marca de la lista de alumnos (cabe en 320 px).
export const ETIQUETA_CORTA = Object.freeze({ 'sin-solicitudes': 'sin solicitudes', 'aplica-a-todo': 'ha solicitado casi todo' });
const DIAS_SILENCIO = 30;
const ESTADO_CONTRATADO = 'Contratado';

/* ---- Fechas (texto AAAA-MM-DD; sin horas, para que no importen las zonas horarias) ---- */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const hoyISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export const fechaCorta = iso => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}`;
};
const valida = f => typeof f === 'string' && fechaValida(f);

/* ---- Umbrales ---- */

// "valores" = lo que escribe la persona (texto o número). Devuelve { umbrales, errores }: errores[campo] = 'vacio' | 'entero' | 'rango'.
// Si hay algún error, no hay umbrales nuevos que guardar.
export function validarUmbrales(valores) {
  const umbrales = {},
    errores = {};
  for (const k of Object.keys(UMBRALES_POR_DEFECTO)) {
    const t = String(valores?.[k] ?? '').trim();
    if (!t) {
      errores[k] = 'vacio';
      continue;
    }
    if (!/^\d+$/.test(t)) {
      errores[k] = 'entero';
      continue;
    }
    const n = Number(t),
      [min, max] = LIMITES[k];
    if (n < min || n > max) {
      errores[k] = 'rango';
      continue;
    }
    umbrales[k] = n;
  }
  return { umbrales: Object.keys(errores).length ? null : umbrales, errores };
}

// Lo que se leyó del móvil (puede ser basura): solo se aceptan valores válidos; el resto vuelve al valor por defecto.
export function umbralesSaneados(crudo) {
  const salida = { ...UMBRALES_POR_DEFECTO };
  if (!crudo || typeof crudo !== 'object') return salida;
  for (const k of Object.keys(salida)) {
    const v = crudo[k];
    if (Number.isInteger(v) && v >= LIMITES[k][0] && v <= LIMITES[k][1]) salida[k] = v;
  }
  return salida;
}

/* ---- Cálculo ---- */

// Devuelve { periodo, avisos }. Cada aviso: { id: 'A001|sin-solicitudes', tipo, idAlumno, motivo }.
// "hoy" y "umbrales" se pasan siempre (así el resultado no depende del reloj del móvil dentro de las funciones).
export function calcularAvisos({
  alumnos = [],
  ofertas = [],
  rondas = [],
  aplicaciones = [],
  hoy,
  umbrales = UMBRALES_POR_DEFECTO,
  contextoMatch
}) {
  const vacio = { periodo: null, avisos: [] };
  if (!valida(hoy)) return vacio;
  const fechasRondas = rondas
    .map(r => r.fecha)
    .filter(valida)
    .sort();
  if (!fechasRondas.length) return vacio;

  const desdeNormal = sumarDias(hoy, -umbrales.dias);
  const primera = fechasRondas[0];
  const recortado = primera > desdeNormal;
  const desde = recortado ? primera : desdeNormal;
  const dentro = f => valida(f) && f >= desde && f <= hoy;
  const difundidas = new Set(rondas.filter(r => dentro(r.fecha)).map(r => r.idOferta));
  const periodo = { desde, hasta: hoy, ofertas: difundidas.size, recortado };
  const cuando = recortado ? `desde la primera ronda (${fechaCorta(primera)})` : `en ${umbrales.dias} días`;
  const ofertaPorId = new Map(ofertas.map(o => [o.id, o]));
  const avisos = [];

  for (const alumno of alumnos) {
    const suyas = aplicaciones.filter(a => a.idAlumno === alumno.id);
    const enPeriodo = suyas.filter(a => dentro(a.fecha));
    const sinFecha = suyas.filter(a => !valida(a.fecha));

    // 1. Sin solicitudes
    if (difundidas.size >= umbrales.ofertas && !enPeriodo.length && !sinFecha.length && !suyas.some(a => a.estado === ESTADO_CONTRATADO)) {
      avisos.push({
        id: `${alumno.id}|${TIPOS.sinSolicitudes}`,
        tipo: TIPOS.sinSolicitudes,
        idAlumno: alumno.id,
        motivo: `Ninguna solicitud ${cuando}. En ese tiempo se ${difundidas.size === 1 ? 'envió 1 oferta' : `enviaron ${difundidas.size} ofertas`}. Se avisa si se envían ${umbrales.ofertas} o más.`
      });
    }

    // 2. Aplica a todo
    const aplicadas = new Set(enPeriodo.map(a => a.idOferta).filter(id => difundidas.has(id)));
    if (enPeriodo.length >= umbrales.solicitudes && difundidas.size && aplicadas.size * 100 >= umbrales.porcentaje * difundidas.size) {
      const pct = Math.round((aplicadas.size * 100) / difundidas.size);
      // Dato extra (no decide nada): de esas ofertas, a cuántas el match dice "no encaja".
      const noEncajan = [...aplicadas].filter(
        id => ofertaPorId.has(id) && evaluar(alumno, ofertaPorId.get(id), contextoMatch).categoria === 'no'
      ).length;
      avisos.push({
        id: `${alumno.id}|${TIPOS.aplicaTodo}`,
        tipo: TIPOS.aplicaTodo,
        idAlumno: alumno.id,
        motivo:
          `${enPeriodo.length === 1 ? '1 solicitud' : `${enPeriodo.length} solicitudes`} ${cuando}, a ${aplicadas.size} de las ${difundidas.size} ofertas enviadas (${pct} %).` +
          (noEncajan ? ` De esas, ${noEncajan} ${noEncajan === 1 ? 'encaja poco' : 'encajan poco'}.` : '') +
          ` Se avisa con ${umbrales.solicitudes} solicitudes o más y un ${umbrales.porcentaje} % o más de las ofertas enviadas.`
      });
    }
  }
  return { periodo, avisos };
}

export const avisosDe = (avisos, idAlumno) => avisos.filter(a => a.idAlumno === idAlumno);
export const contar = (avisos, tipo) => avisos.filter(a => a.tipo === tipo).length;

/* ---- Silenciar ---- */

// "silencios" = { 'A001|sin-solicitudes': '2026-12-12' } (hasta qué día se silencia). Un aviso está silenciado hasta ese día, sin incluirlo.
export const silenciadoHasta = hoy => sumarDias(hoy, DIAS_SILENCIO);
export const estaSilenciado = (silencios, id, hoy) => valida(silencios?.[id]) && hoy < silencios[id];
export function repartir(avisos, silencios, hoy) {
  return {
    activos: avisos.filter(a => !estaSilenciado(silencios, a.id, hoy)),
    silenciados: avisos.filter(a => estaSilenciado(silencios, a.id, hoy))
  };
}
