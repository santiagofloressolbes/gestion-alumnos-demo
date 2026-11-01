// Arranque de la app: rutas por "#", barra inferior, sin zoom y service worker.
import { pintarInicio } from './vistas/inicio.js';
import { pintarMaster } from './vistas/master.js';
import { pintarAlumno } from './vistas/alumno.js';
import { pintarCV } from './vistas/cv.js';
import { pintarBuscar } from './vistas/buscar.js';
import { pintarAcceso } from './vistas/acceso.js';
import { getModo } from './data/index.js';

const $ = s => document.querySelector(s);
let inicioPintado = false;
let vistaPrevia = null, scrollBuscar = 0;   // para volver a la búsqueda en el mismo punto

function rutaActual() {
  const h = location.hash.replace(/^#\/?/, '');
  let m;
  try {
    if ((m = h.match(/^master\/(.+)$/))) return { vista: 'master', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: decodeURIComponent(m[1]) };
    if ((m = h.match(/^cv\/(.+)$/))) return { vista: 'cv', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: 'CV de ejemplo' };
    if ((m = h.match(/^alumno\/(.+)$/))) return { vista: 'alumno', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: 'Ficha' };
  } catch { /* dirección mal escrita: se vuelve al inicio */ }
  if (h === 'buscar') return { vista: 'buscar', pestana: 'buscar', titulo: 'Buscar' };
  if (h === 'acceso') return { vista: 'acceso', pestana: '', titulo: 'Acceso' };
  return { vista: 'inicio', pestana: 'inicio', titulo: 'Gestión de alumnos (demo)' };
}

async function pintar() {
  // Sin acceso elegido (ni clave ni demo) solo se ve la pantalla de Acceso.
  const modo = getModo();
  const r = modo ? rutaActual() : { vista: 'acceso', pestana: '', titulo: 'Acceso' };
  $('#app').classList.toggle('acceso', r.vista === 'acceso');
  $('#demo').hidden = modo !== 'demo';
  // Antes de ocultar la búsqueda (al ocultarla el scroll vuelve a 0), se apunta en qué punto estaba.
  if (vistaPrevia === 'buscar' && r.vista !== 'buscar') scrollBuscar = $('#main').scrollTop;
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('on', v.id === 'v-' + r.vista);
  for (const a of document.querySelectorAll('#tabs a')) {
    if (a.dataset.tab === r.pestana) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#titulo').textContent = r.titulo;
  $('#main').scrollTop = 0;

  if (r.vista === 'acceso') pintarAcceso($('#v-acceso'));
  if (r.vista === 'inicio' && !inicioPintado) { inicioPintado = true; await pintarInicio($('#v-inicio')); }
  if (r.vista === 'master') await pintarMaster($('#v-master'), r.valor);
  if (r.vista === 'alumno') await pintarAlumno($('#v-alumno'), r.valor);
  if (r.vista === 'cv') await pintarCV($('#v-cv'), r.valor);
  if (r.vista === 'buscar') { await pintarBuscar($('#v-buscar')); if (vistaPrevia === 'alumno') $('#main').scrollTop = scrollBuscar; }
  vistaPrevia = r.vista;
}

window.addEventListener('hashchange', pintar);
pintar();

// Sin pellizco para ampliar (el iPhone ignora user-scalable=no): se cancelan los gestos de zoom.
for (const g of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(g, e => e.preventDefault(), { passive: false });
}

// Service worker: deja la app disponible sin conexión y avisa si hay versión nueva.
if ('serviceWorker' in navigator) {
  const habiaSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaSW) $('#upd').hidden = false;
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
$('#updBtn').addEventListener('click', () => location.reload());
