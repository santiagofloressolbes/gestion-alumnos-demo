import { enlaceHttps, esDeEjemplo } from './enlaces.js';

// Decide a dónde lleva el botón del CV.
// - Enlaces de ejemplo (example.com/.org/.net, los de los datos de prueba): a la página interna "CV de ejemplo".
// - Enlaces https reales: se abren en otra pestaña, sin enviar de dónde vienes.
// - Vacío o con otro formato (http:, javascript:, data:...): no hay botón.
export function enlaceCV(alumno) {
  const href = enlaceHttps(alumno.enlaceCV);
  if (!href) return null;
  if (esDeEjemplo(href)) return { href: '#/cv/' + encodeURIComponent(alumno.id), externo: false };
  return { href, externo: true };
}
