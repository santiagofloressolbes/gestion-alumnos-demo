// Lista de alumnos de un máster: avatar, nombre y un dato breve.
import { getAlumnos, getMasters } from '../data/index.js';
import { el, svgFlecha, plural } from '../util/dom.js';
import { avatar } from '../util/avatar.js';
import { navegacion } from '../util/navegacion.js';

export const volver = () => el('a', { class: 'volver', href: '#/' }, 'Inicio');

export async function pintarMaster(raiz, nombre) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando alumnos…'));
  let masters, alumnos;
  try {
    [masters, alumnos] = await Promise.all([getMasters(), getAlumnos()]);
  } catch (e) {
    raiz.replaceChildren(volver(), el('div', { class: 'card' },
      el('h2', {}, 'No se han podido cargar los datos'), el('p', { class: 'sub' }, e.message)));
    return;
  }
  if (!masters.some(m => m.nombre === nombre)) {
    raiz.replaceChildren(volver(), el('div', { class: 'card' },
      el('h2', {}, 'Máster no encontrado'),
      el('p', { class: 'sub' }, 'Vuelve al inicio y elige uno de la lista.')));
    return;
  }

  const lista = alumnos.filter(a => a.master === nombre)
    .sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es'));

  raiz.replaceChildren(
    volver(),
    el('h2', { class: 'seccion' }, plural(lista.length, 'alumno', 'alumnos')),
    lista.length
      ? el('ul', { class: 'alumnos', 'aria-label': 'Alumnos de ' + nombre }, lista.map(a => fila(a, 'master')))
      : el('div', { class: 'card' }, el('p', { class: 'sub' }, 'Este máster todavía no tiene alumnos.')));
}

// Dato breve: a qué área quiere ir y si busca prácticas o empleo. En la búsqueda se añade el máster.
export function fila(a, origen, conMaster = false) {
  const breve = [a.areaDestino, a.disponibilidad].filter(Boolean).join(' · ');
  return el('li', {}, el('a', { class: 'alumno', href: '#/alumno/' + encodeURIComponent(a.id), onclick: () => { navegacion.origen = origen; } },
    avatar(a),
    el('span', { class: 'alumno-texto' },
      el('b', {}, `${a.nombre} ${a.apellidos}`.trim()),
      breve && el('span', { class: 'sub' }, breve),
      conMaster && el('span', { class: 'sub' }, a.master)),
    svgFlecha()));
}
