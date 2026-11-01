// Ficha completa de un alumno, con el botón al CV.
import { getAlumnos, recargar } from '../data/index.js';
import { tarjetaError } from './error-datos.js';
import { el } from '../util/dom.js';
import { avatar } from '../util/avatar.js';
import { enlaceCV } from '../util/cv.js';
import { navegacion } from '../util/navegacion.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-10-05" -> "5 de octubre de 2026". Si el formato es otro, se muestra tal cual.
function fecha(t) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  return m && MESES[m[2] - 1] ? `${+m[3]} de ${MESES[m[2] - 1]} de ${m[1]}` : t;
}

// Una línea "etiqueta / valor". Sin valor: se omite (opcional) o se muestra "No indicado".
function campo(etiqueta, valor, { opcional = false, texto = false } = {}) {
  if (!valor && opcional) return null;
  return el('div', { class: 'campo' },
    el('dt', {}, etiqueta),
    el('dd', { class: (valor ? '' : 'vacio ') + (texto ? 'largo' : '') }, valor || 'No indicado'));
}

const tarjeta = (titulo, ...campos) =>
  el('section', { class: 'card', 'aria-label': titulo },
    el('h2', {}, titulo),
    el('dl', { class: 'campos' }, campos.filter(Boolean)));

export async function pintarAlumno(raiz, id) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando ficha…'));
  let a = null;
  try { a = (await getAlumnos()).find(x => x.id === id) || null; }
  catch (e) {
    raiz.replaceChildren(el('a', { class: 'volver', href: '#/' }, 'Inicio'),
      tarjetaError(e, () => { recargar().catch(() => {}); pintarAlumno(raiz, id); }));
    return;
  }
  if (!a) {
    raiz.replaceChildren(el('a', { class: 'volver', href: '#/' }, 'Inicio'),
      el('div', { class: 'card' }, el('h2', {}, 'Alumno no encontrado'),
        el('p', { class: 'sub' }, 'Vuelve al inicio y elige un máster.')));
    return;
  }

  const nacionalidades = [a.nacionalidadPrincipal, a.nacionalidadSecundaria].filter(Boolean).join(' · ');
  const cv = enlaceCV(a);

  raiz.replaceChildren(
    navegacion.origen === 'buscar'
      ? el('a', { class: 'volver', href: '#/buscar' }, 'Buscar')
      : el('a', { class: 'volver', href: '#/master/' + encodeURIComponent(a.master) }, a.master),

    el('section', { class: 'card cabecera', 'aria-label': 'Alumno' },
      avatar(a, true),
      el('h2', { class: 'nombre' }, `${a.nombre} ${a.apellidos}`.trim()),
      el('p', { class: 'sub' }, [a.master, a.promocion && 'Promoción ' + a.promocion].filter(Boolean).join(' · ')),
      a.disponibilidad && el('div', { class: 'chips' }, el('span', { class: 'chip on' }, 'Busca: ' + a.disponibilidad)),
      cv
        ? el('a', { class: 'primary', href: cv.href, target: cv.externo ? '_blank' : null, rel: cv.externo ? 'noopener noreferrer' : null },
            cv.externo ? 'Ver CV' : 'Ver CV (ejemplo)')
        : el('span', { class: 'primary desactivado', role: 'link', 'aria-disabled': 'true' }, 'Sin CV')),

    tarjeta('Situación',
      campo('Nacionalidad', nacionalidades),
      campo('Trabajo en España', a.situacionTrabajo)),

    tarjeta('Experiencia',
      campo('Área de experiencia', a.areaExperiencia),
      campo('Resumen', a.resumenExperiencia, { texto: true })),

    tarjeta('Hacia dónde quiere ir',
      campo('Área', a.areaDestino),
      campo('Por qué', a.porQue, { texto: true })),

    tarjeta('Entrevista',
      campo('Última entrevista', fecha(a.fechaUltimaEntrevista) || 'Sin entrevista registrada'),
      campo('Notas', a.notasEntrevista || 'Sin notas', { texto: true })));
}
