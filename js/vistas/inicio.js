// Inicio: un botón por máster.
import { getMasters, getEstadoFuente, recargar } from '../data/index.js';
import { el, svgFlecha, plural } from '../util/dom.js';

export async function pintarInicio(raiz) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando datos…'));
  let masters;
  try {
    masters = await getMasters();
  } catch (e) {
    raiz.replaceChildren(el('div', { class: 'card' },
      el('h2', {}, 'No se han podido cargar los datos'),
      el('p', { class: 'sub' }, e.message),
      el('button', { class: 'primary', type: 'button', onclick: () => { recargar().catch(() => {}); pintarInicio(raiz); } }, 'Reintentar')));
    return;
  }

  const estado = getEstadoFuente();
  const total = masters.reduce((s, m) => s + m.alumnos, 0);
  const botones = masters.map(m => el('a', { class: 'master', href: '#/master/' + encodeURIComponent(m.nombre) },
    el('span', { class: 'master-texto' },
      el('b', {}, m.nombre),
      el('span', { class: 'sub' }, plural(m.alumnos, 'alumno', 'alumnos'))),
    svgFlecha()));

  raiz.replaceChildren(...[
    el('h2', { class: 'seccion' }, 'Elige un máster'),
    el('nav', { class: 'masters', 'aria-label': 'Másteres' }, botones),
    el('p', { class: 'estado' }, `${plural(masters.length, 'máster', 'másteres')} · ${plural(total, 'alumno', 'alumnos')} · datos ficticios`),
    estado.respaldo && el('p', { class: 'aviso', role: 'status' },
      'No se ha podido leer el Google Sheet; se muestran los datos de respaldo de la app. ',
      el('small', {}, 'Motivo: ' + (estado.motivo === 'Failed to fetch' || /abort/i.test(estado.motivo) ? 'sin conexión o Google no responde.' : estado.motivo) + ' '),
      el('button', { class: 'enlace', type: 'button', onclick: () => { recargar().catch(() => {}); pintarInicio(raiz); } }, 'Reintentar')),
  ].filter(Boolean));
}
