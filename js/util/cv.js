// Decide a dónde lleva el botón del CV.
// - Enlaces de ejemplo (example.com/.org/.net, los de los datos de prueba): a la página interna "CV de ejemplo".
// - Enlaces http(s) reales: se abren en otra pestaña, sin enviar de dónde vienes.
// - Vacío o con otro formato (javascript:, data:...): no hay botón.
export function enlaceCV(alumno) {
  let url;
  try { url = new URL(alumno.enlaceCV); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (/(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return { href: '#/cv/' + encodeURIComponent(alumno.id), externo: false };
  return { href: url.href, externo: true };
}
