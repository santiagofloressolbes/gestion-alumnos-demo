// Inicio: un botón por máster.
import { getMasters, getEstadoFuente, recargar, olvidarAcceso } from '../data/index.js';
import { el, svgFlecha, plural } from '../util/dom.js';
import { tarjetaError } from './error-datos.js';

export async function pintarInicio(raiz) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando datos…'));
  let masters;
  try {
    masters = await getMasters();
  } catch (e) {
    raiz.replaceChildren(tarjetaError(e, () => { recargar().catch(() => {}); pintarInicio(raiz); }));
    return;
  }

  const demo = getEstadoFuente().modo === 'demo';
  const total = masters.reduce((s, m) => s + m.alumnos, 0);
  const botones = masters.map(m => el('a', { class: 'master', href: '#/master/' + encodeURIComponent(m.nombre) },
    el('span', { class: 'master-texto' },
      el('b', {}, m.nombre),
      el('span', { class: 'sub' }, plural(m.alumnos, 'alumno', 'alumnos'))),
    svgFlecha()));

  raiz.replaceChildren(
    el('h2', { class: 'seccion' }, 'Elige un máster'),
    el('nav', { class: 'masters', 'aria-label': 'Másteres' }, botones),
    el('p', { class: 'estado' }, `${plural(masters.length, 'máster', 'másteres')} · ${plural(total, 'alumno', 'alumnos')} · datos ficticios`),
    el('section', { class: 'card conexion', 'aria-labelledby': 'cx-titulo' },
      el('h2', { id: 'cx-titulo' }, 'Conexión'),
      el('p', { class: 'sub' }, demo
        ? 'Estás viendo la demo, con datos de ejemplo de la app. No se puede guardar nada.'
        : 'Conectado al Sheet de prueba. La dirección y la clave están guardadas solo en este móvil.'),
      demo
        ? el('a', { class: 'secondary', href: '#/acceso' }, 'Conectar con el Sheet de prueba')
        : el('button', { class: 'secondary', type: 'button', onclick: () => {
            if (!confirm('¿Olvidar el acceso en este móvil? Tendrás que volver a escribir la dirección y la clave.')) return;
            olvidarAcceso();
            location.replace(location.pathname);
          } }, 'Olvidar acceso')));
}
