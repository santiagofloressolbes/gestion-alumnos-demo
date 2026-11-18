// Desplegable común: un <details> con una flecha estándar que gira (la pone el CSS en .desplegable>summary::after).
// El estado NO se dice con texto visible: lo dice la flecha y, para quien usa lector de pantalla, aria-expanded en el summary.
// Zona táctil de al menos 44 px (la fija el CSS). Se usa en Ajustes, en los grupos del match, en «Por qué» y en los filtros.
import { el } from '../util/dom.js';

// props: atributos del <details> (class se suma a "desplegable", open, data-…). cabecera: el <summary> ya hecho. cuerpo: el contenido.
export function desplegable({ class: clase = '', ...props } = {}, cabecera, ...cuerpo) {
  const d = el('details', { ...props, class: ('desplegable ' + clase).trim() }, cabecera, ...cuerpo);
  const sincronizar = () => cabecera.setAttribute('aria-expanded', d.open ? 'true' : 'false');
  sincronizar();
  d.addEventListener('toggle', sincronizar);
  return d;
}
