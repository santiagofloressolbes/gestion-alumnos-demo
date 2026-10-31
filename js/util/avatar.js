// Avatares: foto si hay un enlace https; si no, círculo con iniciales y un color según el ID.
import { el } from './dom.js';

// Todos pasan 4,5:1 con texto blanco.
const COLORES = ['#D63B45', '#7C3AED', '#0F766E', '#B45309', '#1D4ED8', '#BE185D', '#4D7C0F', '#0E7490'];

export function iniciales(nombre, apellidos) {
  const letra = t => (Array.from((t || '').trim())[0] || '').toLocaleUpperCase('es');
  return letra(nombre) + letra((apellidos || '').trim().split(/\s+/)[0]);
}

function colorDe(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES[h % COLORES.length];
}

export function avatar(alumno, grande = false) {
  const clase = 'avatar' + (grande ? ' grande' : '');
  const texto = el('span', { class: clase, style: `--av:${colorDe(alumno.id)}`, 'aria-hidden': 'true' },
    iniciales(alumno.nombre, alumno.apellidos));
  // Solo se admiten fotos por https. Cualquier otra cosa ("iniciales", vacío...) deja las iniciales.
  if (!/^https:\/\//i.test(alumno.foto)) return texto;
  const img = el('img', { class: clase, src: alumno.foto, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', 'aria-hidden': 'true' });
  img.addEventListener('error', () => img.replaceWith(texto));
  return img;
}
