// Arranque de la app: rutas por "#", barra inferior, sin zoom y service worker.
import { getMasters } from './data/index.js';
import { pintarInicio } from './vistas/inicio.js';
import { el, plural } from './util/dom.js';

const $ = s => document.querySelector(s);
let inicioPintado = false;

function rutaActual() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('master/')) return { vista: 'master', master: decodeURIComponent(h.slice(7)), pestana: 'inicio' };
  if (h === 'buscar') return { vista: 'buscar', pestana: 'buscar' };
  return { vista: 'inicio', pestana: 'inicio' };
}

async function pintar() {
  const r = rutaActual();
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('on', v.id === 'v-' + r.vista);
  for (const a of document.querySelectorAll('#tabs a')) {
    if (a.dataset.tab === r.pestana) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#titulo').textContent = r.vista === 'buscar' ? 'Buscar' : r.vista === 'master' ? r.master : 'Alumnos LBS';
  $('#main').scrollTop = 0;

  if (r.vista === 'inicio' && !inicioPintado) { inicioPintado = true; await pintarInicio($('#v-inicio')); }
  if (r.vista === 'master') await pintarMaster(r.master);
}

// Provisional: la lista de alumnos llega en el paso 4.
async function pintarMaster(nombre) {
  const raiz = $('#v-master');
  let existe = false, n = 0;
  try {
    const m = (await getMasters()).find(x => x.nombre === nombre);
    existe = !!m; n = m ? m.alumnos : 0;
  } catch { /* se muestra "no encontrado" */ }
  raiz.replaceChildren(el('div', { class: 'card' },
    el('h2', {}, existe ? nombre : 'Máster no encontrado'),
    el('p', { class: 'sub' }, existe ? `${plural(n, 'alumno', 'alumnos')}. La lista llega en el paso 4.` : 'Vuelve al inicio y elige uno de la lista.'),
    el('a', { class: 'secondary', href: '#/' }, 'Volver al inicio')));
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
