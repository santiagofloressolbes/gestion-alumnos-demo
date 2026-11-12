// Tarjeta plegable de Ajustes (<details>): el estado se dice con TEXTO («Abierto» / «Cerrado»), no solo con un icono.
// Lo que la persona deja abierto se recuerda en ESTE móvil (localStorage, clave gad.ajustes: solo los nombres de las secciones abiertas).
// Sin ninguna elección guardada, solo «Conexión» empieza abierta.
import { el } from '../util/dom.js';

const K = 'gad.ajustes';
export const ABIERTAS_POR_DEFECTO = Object.freeze(['conexion']);
const CLAVE_VALIDA = /^[a-z-]{1,20}$/;

export function abiertas() {
  try {
    const j = JSON.parse(localStorage.getItem(K));
    if (Array.isArray(j)) return j.filter(x => typeof x === 'string' && CLAVE_VALIDA.test(x));
  } catch { /* nada guardado, o roto: valores por defecto */ }
  return [...ABIERTAS_POR_DEFECTO];
}

function guardar(clave, abierta) {
  const s = new Set(abiertas());
  if (abierta) s.add(clave); else s.delete(clave);
  try { localStorage.setItem(K, JSON.stringify([...s])); } catch { /* sin almacenamiento: se queda como está hasta cerrar la app */ }
}

// { id, clave, idTitulo, titulo, clase } y el contenido. Devuelve la tarjeta (section) con su <details>.
export function plegable({ id, clave, idTitulo, titulo, clase = '' }, ...contenido) {
  let abierta = abiertas().includes(clave);
  const estado = el('span', { class: 'plegable-estado' }, abierta ? 'Abierto' : 'Cerrado');
  const d = el('details', { class: 'plegable', open: abierta, 'data-clave': clave },
    el('summary', {}, el('h2', { id: idTitulo }, titulo), estado),
    el('div', { class: 'plegable-cuerpo' }, contenido));
  d.addEventListener('toggle', () => {
    estado.textContent = d.open ? 'Abierto' : 'Cerrado';
    if (d.open === abierta) return;   // el aviso inicial del navegador no es una elección de la persona
    abierta = d.open;
    guardar(clave, abierta);
  });
  return el('section', { class: ('card plegable-tarjeta ' + clase).trim(), id }, d);
}
