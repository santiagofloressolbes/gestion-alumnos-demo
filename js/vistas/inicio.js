// Inicio: los programas agrupados en secciones desplegables (Másteres, MBA…). La lista y la categoría de cada programa vienen de la hoja Listas.
// Se ven TODOS los programas de la lista, aunque tengan 0 alumnos. Un programa que un alumno tiene pero no está en la lista sale en «Otros programas».
import { getMasters, recargar } from '../data/index.js';
import { el, svgFlecha, plural, reemplazar } from '../util/dom.js';
import { agruparProgramas } from '../util/programas.js';
import { tarjetaError } from './error-datos.js';
import { desplegable } from './desplegable.js';
import { cajaAvisosInicio, pintarAvisosInicio, notaDatos } from './avisos.js';

// Qué secciones están abiertas se recuerda en ESTE móvil (clave gad.inicio: solo los nombres de las categorías abiertas).
// Sin nada guardado: la primera sección y «Otros programas» (si existe) empiezan abiertas.
const K = 'gad.inicio';
function abiertasGuardadas() {
  try {
    const j = JSON.parse(localStorage.getItem(K));
    if (Array.isArray(j)) return j.filter(x => typeof x === 'string' && x.length <= 120);
  } catch {
    /* nada guardado, o roto: valores por defecto */
  }
  return null;
}
function guardarAbiertas(raiz) {
  const nombres = [...raiz.querySelectorAll('details.grupo-programas')].filter(d => d.open).map(d => d.dataset.categoria);
  try {
    localStorage.setItem(K, JSON.stringify(nombres));
  } catch {
    /* sin almacenamiento: se queda como está hasta cerrar la app */
  }
}

const botonPrograma = m =>
  el(
    'a',
    { class: 'master', href: '#/master/' + encodeURIComponent(m.nombre) },
    el('span', { class: 'master-texto' }, el('b', {}, m.nombre), el('span', { class: 'sub' }, plural(m.alumnos, 'alumno', 'alumnos'))),
    svgFlecha()
  );

function seccion(g, i, guardadas, raiz) {
  let abierta = guardadas ? guardadas.includes(g.categoria) : i === 0 || g.otros;
  const d = desplegable(
    { class: 'grupo-programas', open: abierta, 'data-categoria': g.categoria },
    el(
      'summary',
      {},
      el(
        'span',
        { class: 'grupo-texto' },
        el('h2', { class: 'grupo-titulo' }, g.categoria),
        el('span', { class: 'sub' }, `${plural(g.programas.length, 'programa', 'programas')} · ${plural(g.alumnos, 'alumno', 'alumnos')}`)
      )
    ),
    el(
      'div',
      { class: 'grupo-cuerpo' },
      el('nav', { class: 'masters', 'aria-label': g.categoria }, g.programas.map(botonPrograma)),
      g.otros && notaDatos('Estos programas no están en la lista de programas (o no tienen categoría). Avisa a quien administra la app.')
    )
  );
  d.addEventListener('toggle', () => {
    if (d.open === abierta) return; // el aviso inicial del navegador no es una elección de la persona
    abierta = d.open;
    guardarAbiertas(raiz);
  });
  return d;
}

export async function pintarInicio(raiz) {
  reemplazar(raiz, el('p', { class: 'estado', role: 'status' }, 'Cargando datos…'));
  let masters;
  try {
    masters = await getMasters();
  } catch (e) {
    reemplazar(
      raiz,
      tarjetaError(e, () => {
        recargar().catch(() => {});
        pintarInicio(raiz);
      })
    );
    return;
  }

  const total = masters.reduce((s, m) => s + m.alumnos, 0);
  const grupos = agruparProgramas(masters);
  const guardadas = abiertasGuardadas();

  const cajaAvisos = cajaAvisosInicio();
  // Primero los programas (MBA, el primero) y debajo la tarjeta de Avisos.
  reemplazar(
    raiz,
    el('h2', { class: 'seccion' }, 'Elige un programa'),
    el(
      'div',
      { class: 'grupos', id: 'grupos' },
      grupos.length
        ? grupos.map((g, i) => seccion(g, i, guardadas, raiz))
        : el('div', { class: 'card' }, el('p', { class: 'sub' }, 'Todavía no hay programas.'))
    ),
    cajaAvisos,
    el(
      'p',
      { class: 'estado' },
      `${plural(masters.length, 'programa', 'programas')} · ${plural(total, 'alumno', 'alumnos')} · datos ficticios`
    )
  );
  await pintarAvisosInicio(cajaAvisos); // si no hay rondas o algo falla, la tarjeta no se enseña y Inicio sigue igual
}
