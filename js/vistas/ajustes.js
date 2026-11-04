// Ajustes: la conexión con el Sheet, la versión de la app (con "Buscar actualización") y el aviso de demostración.
import { getModo, olvidarAcceso } from '../data/index.js';
import { el } from '../util/dom.js';
import { ocupar } from '../util/trabajo.js';
import { buscarActualizacion } from '../util/actualizar.js';
import { VERSION } from '../version.js';

export const AVISO_LEGAL = 'Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.';

export function pintarAjustes(raiz) {
  const demo = getModo() === 'demo';
  const resultado = el('p', { class: 'sub', role: 'status', id: 'aj-resultado' });
  const buscar = el('button', { class: 'secondary', type: 'button', id: 'aj-buscar', onclick: async () => {
    resultado.textContent = '';
    const liberar = ocupar([buscar], buscar, 'Buscando…');
    const r = await buscarActualizacion({ alEncontrar: v => { buscar.textContent = 'Actualizando…'; resultado.textContent = `Hay una versión nueva (${v}). Cargándola…`; } });
    if (r.estado === 'nueva') return;   // la app se recarga sola
    liberar();
    resultado.textContent = r.estado === 'al-dia' ? `Ya tienes la última versión (${r.version}).`
      : 'No se ha podido comprobar si hay versión nueva. Inténtalo de nuevo en un momento.';
  } }, 'Buscar actualización');

  raiz.replaceChildren(
    el('section', { class: 'card conexion', 'aria-labelledby': 'cx-titulo' },
      el('h2', { id: 'cx-titulo' }, 'Conexión'),
      el('p', { class: 'sub' }, demo
        ? 'Estás viendo la demo, con datos de ejemplo de la app. No se puede guardar nada.'
        : 'Conectado al Sheet de prueba. La dirección y la clave están guardadas solo en este móvil.'),
      demo
        ? el('a', { class: 'secondary', href: '#/acceso' }, 'Conectar con el Sheet de prueba')
        : el('button', { class: 'secondary', type: 'button', id: 'aj-olvidar', onclick: () => {
            if (!confirm('¿Olvidar el acceso en este móvil? Tendrás que volver a escribir la dirección y la clave.')) return;
            olvidarAcceso();
            location.replace(location.pathname);
          } }, 'Olvidar acceso')),
    el('section', { class: 'card', 'aria-labelledby': 'ver-titulo' },
      el('h2', { id: 'ver-titulo' }, 'Versión de la app'),
      el('p', { class: 'version', id: 'aj-version' }, 'Versión ' + VERSION),
      el('p', { class: 'sub' }, 'Si has publicado cambios y no los ves, busca la actualización aquí: no hace falta cerrar la app.'),
      buscar, resultado),
    el('section', { class: 'card', 'aria-labelledby': 'av-titulo' },
      el('h2', { id: 'av-titulo' }, 'Aviso'),
      el('p', { class: 'sub', id: 'aj-aviso' }, AVISO_LEGAL)));
}
