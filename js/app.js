// Arranque de la app: rutas por "#", barra inferior, sin zoom y service worker.
import { pintarInicio } from './vistas/inicio.js';
import { pintarMaster } from './vistas/master.js';
import { pintarAlumno } from './vistas/alumno.js';
import { pintarCV } from './vistas/cv.js';
import { pintarBuscar } from './vistas/buscar.js';
import { pintarAcceso } from './vistas/acceso.js';
import { pintarAjustes, AVISO_LEGAL } from './vistas/ajustes.js';
import { pintarOfertas, pintarOferta } from './vistas/ofertas.js';
import { pintarFormOferta } from './vistas/oferta-form.js';
import { pintarAplicacion } from './vistas/rondas.js';
import { pintarFormRonda, pintarFormAplicacion, pintarFormEstado } from './vistas/rondas-form.js';
import { navegacion } from './util/navegacion.js';
import { getModo } from './data/index.js';

const $ = s => document.querySelector(s);
let inicioPintado = false;
let vistaPrevia = null;
const scrollLista = { buscar: 0, ofertas: 0 };   // para volver a la búsqueda o a las ofertas en el mismo punto
function rutaActual() {
  const h = location.hash.replace(/^#\/?/, '');
  let m;
  try {
    if ((m = h.match(/^master\/(.+)$/))) return { vista: 'master', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: decodeURIComponent(m[1]) };
    if ((m = h.match(/^cv\/(.+)$/))) return { vista: 'cv', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: 'CV de ejemplo' };
    if ((m = h.match(/^alumno\/(.+)$/))) return { vista: 'alumno', valor: decodeURIComponent(m[1]), pestana: 'inicio', titulo: 'Ficha' };
  } catch { /* dirección mal escrita: se vuelve al inicio */ }
  try {
    if ((m = h.match(/^oferta\/([^/]+)\/ronda\/nueva$/))) return { vista: 'ronda-form', valor: decodeURIComponent(m[1]), pestana: 'ofertas', titulo: 'Nueva ronda' };
    if ((m = h.match(/^oferta\/([^/]+)\/ronda\/([^/]+)\/aplicar$/))) return { vista: 'aplicacion-form', valor: decodeURIComponent(m[1]), valor2: decodeURIComponent(m[2]), pestana: 'ofertas', titulo: 'Añadir solicitud' };
    if ((m = h.match(/^aplicacion\/([^/]+)\/estado$/))) return { vista: 'estado-form', valor: decodeURIComponent(m[1]), pestana: 'ofertas', titulo: 'Cambiar estado' };
    if ((m = h.match(/^aplicacion\/([^/]+)$/))) return { vista: 'aplicacion', valor: decodeURIComponent(m[1]), pestana: 'ofertas', titulo: 'Solicitud' };
    if (h === 'oferta/nueva') return { vista: 'oferta-form', valor: null, pestana: 'ofertas', titulo: 'Nueva oferta' };
    if ((m = h.match(/^oferta\/([^/]+)\/editar$/))) return { vista: 'oferta-form', valor: decodeURIComponent(m[1]), pestana: 'ofertas', titulo: 'Editar oferta' };
    if ((m = h.match(/^oferta\/([^/]+)$/))) return { vista: 'oferta', valor: decodeURIComponent(m[1]), pestana: 'ofertas', titulo: 'Oferta' };
  } catch { /* dirección mal escrita: se vuelve al inicio */ }
  if (h === 'buscar') return { vista: 'buscar', pestana: 'buscar', titulo: 'Buscar' };
  if (h === 'ofertas') return { vista: 'ofertas', pestana: 'ofertas', titulo: 'Ofertas' };
  if (h === 'ajustes') return { vista: 'ajustes', pestana: 'ajustes', titulo: 'Ajustes' };
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
  if ((vistaPrevia === 'buscar' || vistaPrevia === 'ofertas') && r.vista !== vistaPrevia) scrollLista[vistaPrevia] = $('#main').scrollTop;
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('on', v.id === 'v-' + r.vista);
  for (const a of document.querySelectorAll('#tabs a')) {
    if (a.dataset.tab === r.pestana) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  $('#titulo').textContent = r.titulo;
  // El aviso de demostración completo se ve en Inicio y en Acceso; en Ajustes es una tarjeta; en el resto, una línea corta.
  const legal = $('#legal');
  legal.hidden = r.vista === 'ajustes';
  legal.textContent = r.vista === 'inicio' || r.vista === 'acceso' ? AVISO_LEGAL : 'Demo · datos ficticios.';
  $('#main').scrollTop = 0;

  if (r.vista === 'acceso') pintarAcceso($('#v-acceso'));
  if (r.vista === 'ajustes') pintarAjustes($('#v-ajustes'));
  if (r.vista === 'inicio' && !inicioPintado) { inicioPintado = true; await pintarInicio($('#v-inicio')); }
  if (r.vista === 'master') await pintarMaster($('#v-master'), r.valor);
  if (r.vista === 'alumno') await pintarAlumno($('#v-alumno'), r.valor);
  if (r.vista === 'cv') await pintarCV($('#v-cv'), r.valor);
  if (r.vista === 'buscar') { await pintarBuscar($('#v-buscar')); if (vistaPrevia === 'alumno') $('#main').scrollTop = scrollLista.buscar; }
  if (r.vista === 'oferta') await pintarOferta($('#v-oferta'), r.valor);
  if (r.vista === 'aplicacion') await pintarAplicacion($('#v-aplicacion'), r.valor);
  if (r.vista === 'ronda-form') await pintarFormRonda($('#v-ronda-form'), r.valor);
  if (r.vista === 'aplicacion-form') await pintarFormAplicacion($('#v-aplicacion-form'), r.valor, r.valor2);
  if (r.vista === 'estado-form') await pintarFormEstado($('#v-estado-form'), r.valor);
  if (r.vista === 'oferta-form') await pintarFormOferta($('#v-oferta-form'), r.valor);
  if (r.vista === 'ofertas') { await pintarOfertas($('#v-ofertas')); if (vistaPrevia === 'oferta') $('#main').scrollTop = scrollLista.ofertas; }
  vistaPrevia = r.vista;
}

// Un formulario con cambios sin guardar pregunta antes de salir (tocar otra pestaña, "atrás"...). Si se cancela, se vuelve a la dirección anterior.
let hashPrevio = location.hash, restaurando = false;
window.addEventListener('hashchange', () => {
  if (restaurando) { restaurando = false; return; }
  if (navegacion.sinGuardar && !confirm('Hay cambios sin guardar. ¿Salir sin guardarlos?')) {
    restaurando = true; location.hash = hashPrevio; return;
  }
  navegacion.sinGuardar = false;
  hashPrevio = location.hash;
  pintar();
});
window.addEventListener('beforeunload', e => { if (navegacion.sinGuardar) { e.preventDefault(); e.returnValue = ''; } });
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
