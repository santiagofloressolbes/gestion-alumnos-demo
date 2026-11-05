// Tarjeta que se enseña cuando no se pueden cargar los datos. Una sola, para todas las pantallas.
import { el } from '../util/dom.js';

export function tarjetaError(e, reintentar) {
  const claveMal = e.codigo === 'clave';   // el almacén ya ha borrado la clave guardada
  return el('div', { class: 'card' },
    el('h2', {}, claveMal ? 'La clave guardada ya no vale' : 'No se han podido cargar los datos'),
    el('p', { class: 'sub' }, e.message),
    claveMal
      ? el('a', { class: 'primary', href: '#/acceso' }, 'Escribir la clave de nuevo')
      : [reintentar && el('button', { class: 'primary', type: 'button', onclick: reintentar }, 'Reintentar'),
         el('a', { class: 'enlace', href: '#/acceso' }, 'Cambiar el acceso')]);
}
