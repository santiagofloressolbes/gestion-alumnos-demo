// Página "CV de ejemplo": documento ficticio construido con los datos de prueba del alumno.
import { getAlumnos } from '../data/index.js';
import { el } from '../util/dom.js';

export async function pintarCV(raiz, id) {
  let a = null;
  try { a = (await getAlumnos()).find(x => x.id === id) || null; } catch { /* se muestra "no encontrado" */ }
  if (!a) {
    raiz.replaceChildren(el('a', { class: 'volver', href: '#/' }, 'Inicio'),
      el('div', { class: 'card' }, el('h2', {}, 'CV no encontrado')));
    return;
  }
  const bloque = (titulo, texto) => texto && el('section', { class: 'cv-bloque' }, el('h3', {}, titulo), el('p', {}, texto));
  raiz.replaceChildren(
    el('a', { class: 'volver', href: '#/alumno/' + encodeURIComponent(a.id) }, 'Ficha de ' + a.nombre),
    el('p', { class: 'aviso', role: 'note' }, 'CV de ejemplo: documento ficticio de la versión de prueba. Aquí se abriría el CV real del alumno.'),
    el('article', { class: 'card cv', 'aria-label': 'CV de ejemplo' },
      el('h2', {}, `${a.nombre} ${a.apellidos}`.trim()),
      el('p', { class: 'sub' }, [a.master, a.promocion && 'Promoción ' + a.promocion].filter(Boolean).join(' · ')),
      bloque('Perfil', a.resumenExperiencia),
      bloque('Área de experiencia', a.areaExperiencia),
      bloque('Objetivo profesional', [a.areaDestino, a.porQue].filter(Boolean).join('. ')),
      bloque('Nacionalidad', [a.nacionalidadPrincipal, a.nacionalidadSecundaria].filter(Boolean).join(' · ')),
      bloque('Disponibilidad', a.disponibilidad)));
}
