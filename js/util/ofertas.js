// Búsqueda, filtros y orden sobre la lista de ofertas (funciones puras: no tocan la pantalla).
import { norm } from './texto.js';

export const estadoVacio = () => ({ texto: '', estado: '', tipo: '', area: '' });

// Cuántos filtros hay activos (sin contar el texto libre).
export const filtrosActivos = e => [e.estado, e.tipo, e.area].filter(Boolean).length;
export const hayAlgo = e => !!e.texto.trim() || filtrosActivos(e) > 0;

const pajar = new WeakMap();
function textoDe(o) {
  if (!pajar.has(o)) {
    pajar.set(o, norm([o.id, o.empresa, o.titulo, o.ubicacion, o.area, o.tipoOrganizacion, o.tipo].join(' ')));
  }
  return pajar.get(o);
}

// Más recientes primero; a igual fecha, el ID más alto primero (la última que se dio de alta).
const masReciente = (x, y) => (y.fechaRecepcion || '').localeCompare(x.fechaRecepcion || '') || y.id.localeCompare(x.id);

export function filtrar(ofertas, e) {
  const palabras = norm(e.texto).split(/\s+/).filter(Boolean);   // todas deben aparecer
  return ofertas
    .filter(o => palabras.every(p => textoDe(o).includes(p)))
    .filter(o => !e.estado || o.estado === e.estado)
    .filter(o => !e.tipo || o.tipo === e.tipo)
    .filter(o => !e.area || o.area === e.area)
    .sort(masReciente);
}

// Cómo se enseña el enlace de una oferta:
// - https:// de ejemplo (example.com/.org/.net, los de los datos de prueba): solo texto, no se abre.
// - https:// real: botón que se abre en otra pestaña, sin enviar de dónde vienes.
// - Cualquier otro texto (una descripción, o un enlace http:, javascript:...): solo texto, nunca un enlace.
export function enlaceOferta(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { tipo: 'nada' };
  let url;
  try { url = new URL(t); } catch { return { tipo: 'texto', texto: t }; }
  if (url.protocol !== 'https:') return { tipo: 'texto', texto: t };
  if (/(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return { tipo: 'ejemplo', texto: t };
  return { tipo: 'enlace', href: url.href, texto: t };
}
