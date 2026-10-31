// Arranque de la app: rutas por "#", barra inferior, sin zoom y service worker.
import { pintarInicio } from './vistas/inicio.js';
import { pintarMaster } from './vistas/master.js';
import { pintarAlumno } from './vistas/alumno.js';

const $ = s => document.querySelector(s);
let inicioPintado = false;

function rutaActual() {
  const h = location.hash.replace(/^#\/?/, '');
  let m;
  try {
    if ((m = h.match(/^master\/(.+)$/))) return { vista: 'master', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: decodeURIComponent(m[1]) };
    if ((m = h.match(/^alumno\/(.+)$/))) return { vista: 'alumno', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: 'Ficha' };
  } catch { /* dirección mal escrita: se vuelve al inicio */ }
  if (h === 'buscar') return { vista: 'buscar', pestana: 'buscar', titulo: 'Buscar' };
  return { vista: 'inicio', pestana: 'inicio', titulo: 'Alumnos LBS' };
}

async function pintar() {
  const r = rutaActual();
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('on', v.id === 'v-' + r.vista);
  for (const a of document.querySelectorAll('#tabs a')) {
    if (a.dataset.tab === r.pestana) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#titulo').textContent = r.titulo;
  $('#main').scrollTop = 0;

  if (r.vista === 'inicio' && !inicioPintado) { inicioPintado = true; await pintarInicio($('#v-inicio')); }
  if (r.vista === 'master') await pintarMaster($('#v-master'), r.valor);
  if (r.vista === 'alumno') await pintarAlumno($('#v-alumno'), r.valor);
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
