// Búsqueda y filtros sobre la lista de alumnos (funciones puras: no tocan la pantalla).
import { norm } from './texto.js';

export const estadoVacio = () => ({ texto: '', area: '', areaEn: 'ambas', nacionalidad: '', situacion: '', disponibilidad: '' });

// Cuántos filtros hay activos (sin contar el texto libre).
export const filtrosActivos = e => [e.area, e.nacionalidad, e.situacion, e.disponibilidad].filter(Boolean).length;
export const hayAlgo = e => !!e.texto.trim() || filtrosActivos(e) > 0;

// Texto en el que busca el cuadro de búsqueda. NO incluye las notas de entrevista (datos delicados).
const pajar = new WeakMap();
function textoDe(a) {
  if (!pajar.has(a)) {
    pajar.set(a, norm([a.nombre, a.apellidos, a.id, a.master, a.promocion, a.areaExperiencia, a.areaDestino,
      a.resumenExperiencia, a.porQue, a.nacionalidadPrincipal, a.nacionalidadSecundaria, a.situacionTrabajo,
      a.disponibilidad].join(' ')));
  }
  return pajar.get(a);
}

const porArea = (a, area, en) =>
  (en !== 'destino' && a.areaExperiencia === area) || (en !== 'experiencia' && a.areaDestino === area);

export function filtrar(alumnos, e) {
  const palabras = norm(e.texto).split(/\s+/).filter(Boolean);   // todas deben aparecer
  return alumnos
    .filter(a => palabras.every(p => textoDe(a).includes(p)))
    .filter(a => !e.area || porArea(a, e.area, e.areaEn))
    .filter(a => !e.nacionalidad || a.nacionalidadPrincipal === e.nacionalidad || a.nacionalidadSecundaria === e.nacionalidad)
    .filter(a => !e.situacion || a.situacionTrabajo === e.situacion)
    .filter(a => !e.disponibilidad || a.disponibilidad === e.disponibilidad)   // valor exacto: Prácticas, Empleo o Ambas
    .sort((x, y) => `${x.apellidos} ${x.nombre}`.localeCompare(`${y.apellidos} ${y.nombre}`, 'es'));
}
