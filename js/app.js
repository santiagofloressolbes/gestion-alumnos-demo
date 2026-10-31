// Arranque de la app: rutas por "#", barra inferior, sin zoom y service worker.

const VISTAS = { inicio: '#v-inicio', buscar: '#v-buscar' };
const TITULOS = { inicio: 'Alumnos LBS', buscar: 'Buscar' };

function rutaActual() {
  const h = location.hash.replace(/^#\/?/, '');
  return VISTAS[h] ? h : 'inicio';
}

function pintar() {
  const ruta = rutaActual();
  for (const [nombre, sel] of Object.entries(VISTAS)) {
    document.querySelector(sel).classList.toggle('on', nombre === ruta);
  }
  for (const a of document.querySelectorAll('#tabs a')) {
    if (a.dataset.tab === ruta) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  document.getElementById('titulo').textContent = TITULOS[ruta];
  document.getElementById('main').scrollTop = 0;
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
    if (habiaSW) document.getElementById('upd').hidden = false;
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.getElementById('updBtn').addEventListener('click', () => location.reload());
