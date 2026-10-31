// Provisional: la ficha completa llega en el paso 5.
import { getAlumnos } from '../data/index.js';
import { el } from '../util/dom.js';
import { avatar } from '../util/avatar.js';

export async function pintarAlumno(raiz, id) {
  let a = null;
  try { a = (await getAlumnos()).find(x => x.id === id) || null; } catch { /* se muestra "no encontrado" */ }
  const atras = a ? '#/master/' + encodeURIComponent(a.master) : '#/';
  raiz.replaceChildren(
    el('a', { class: 'volver', href: atras }, a ? a.master : 'Inicio'),
    el('div', { class: 'card' },
      a && avatar(a, true),
      el('h2', {}, a ? `${a.nombre} ${a.apellidos}` : 'Alumno no encontrado'),
      el('p', { class: 'sub' }, a ? 'La ficha completa llega en el paso 5.' : 'Vuelve al inicio y elige un máster.')));
}
