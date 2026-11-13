// TEMPORAL (v20): mide la pantalla del móvil para encontrar la franja bajo la barra de pestañas. Se quita en la v21, con el arreglo.
// Solo mide la ventana y el modo de la app: ningún dato personal, ninguna clave, ninguna dirección.
import { el } from '../util/dom.js';
import { plegable } from './plegable.js';
import { copiarTexto } from '../util/trabajo.js';
import { VERSION } from '../version.js';

// Interruptor de PRUEBA (v21): fuerza #app a la altura de screen.height para ver si así desaparece la franja. NO se guarda en el móvil,
// se apaga solo a los 60 s (por si la barra de pestañas quedase fuera de la pantalla) y siempre empieza apagado al abrir la app.
export const SEGUNDOS_PRUEBA = 60;
let forzado = false, relojForzado = 0, alApagar = null;
export function forzarAltura(encendido) {
  clearTimeout(relojForzado);
  forzado = !!encendido;
  const app = document.querySelector('#app');
  if (app) {
    if (forzado) { app.style.setProperty('height', screen.height + 'px'); app.style.setProperty('bottom', 'auto'); }
    else { app.style.removeProperty('height'); app.style.removeProperty('bottom'); }
  }
  if (forzado) relojForzado = setTimeout(() => { forzarAltura(false); alApagar?.(); }, SEGUNDOS_PRUEBA * 1000);
}
export const alturaForzada = () => forzado;

let quitarAnterior = null;   // al volver a pintar Ajustes se sueltan los avisos de la vez anterior (si no, se acumulan)

const px = n => (Number.isFinite(n) ? String(Math.round(n * 10) / 10).replace('.', ',') + ' px' : 'no disponible');

// Mide el margen de seguridad con elementos "sonda" invisibles: env() no se puede leer directamente.
function medirMargen(propiedad, valor) {
  const s = el('div', { class: 'sonda-margen', 'aria-hidden': 'true' });
  document.body.append(s);
  s.style.setProperty(propiedad, valor);
  const n = parseFloat(getComputedStyle(s)[propiedad.replace(/-(\w)/g, (_, c) => c.toUpperCase())]);
  s.remove();
  return n;
}

export function lineasDiagnostico() {
  const vv = window.visualViewport;
  const tabs = document.querySelector('#tabs');
  const app = document.querySelector('#app');
  const rt = tabs?.getBoundingClientRect();
  const ra = app?.getBoundingClientRect();
  const standalone = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ? 'sí' : 'no';
  const iosStandalone = navigator.standalone === undefined ? 'no aplica' : navigator.standalone ? 'sí' : 'no';
  const sistema = /OS (\d+)[_.](\d+)/.exec(navigator.userAgent);
  return [
    ['window.innerHeight', px(window.innerHeight)],
    ['window.innerWidth', px(window.innerWidth)],
    ['screen.height', px(screen.height)],
    ['screen.width', px(screen.width)],
    ['visualViewport.height', px(vv?.height)],
    ['visualViewport.offsetTop', px(vv?.offsetTop)],
    ['documentElement.clientHeight', px(document.documentElement.clientHeight)],
    ['devicePixelRatio', String(window.devicePixelRatio)],
    ['env(safe-area-inset-top)', px(medirMargen('padding-top', 'env(safe-area-inset-top, 0px)'))],
    ['env(safe-area-inset-bottom)', px(medirMargen('padding-bottom', 'env(safe-area-inset-bottom, 0px)'))],
    ['variable --sab (la que usa la barra)', px(medirMargen('padding-bottom', 'var(--sab)'))],
    ['Altura de la barra de pestañas', px(tabs?.offsetHeight)],
    ['Relleno inferior de la barra', px(tabs ? parseFloat(getComputedStyle(tabs).paddingBottom) : NaN)],
    ['Borde inferior de la barra', px(rt?.bottom)],
    ['Hueco bajo la barra (innerHeight − borde)', px(rt ? window.innerHeight - rt.bottom : NaN)],
    ['Borde inferior de #app', px(ra?.bottom)],
    ['Altura de #app', px(ra?.height)],
    ['Interruptor de prueba (altura forzada)', forzado ? 'ACTIVADO' : 'desactivado'],
    ['Modo standalone (display-mode)', standalone],
    ['navigator.standalone (iOS)', iosStandalone],
    ['Sistema (versión de iOS)', sistema ? `${sistema[1]}.${sistema[2]}` : 'no detectada'],
  ];
}

export function tarjetaDiagnostico() {
  const lista = el('dl', { class: 'campos diag', id: 'dg-lista' });
  const estado = el('p', { class: 'ok', role: 'status', id: 'dg-estado', hidden: true });
  const pintar = () => {
    lista.replaceChildren(...lineasDiagnostico().map(([k, v]) => el('div', { class: 'campo' }, el('dt', {}, k), el('dd', {}, v))));
  };
  // La primera línea es un título sin la forma «palabra:» (iOS la leería como una dirección web al pegar).
  const texto = () => `Diagnóstico de pantalla — v${VERSION}\n` + lineasDiagnostico().map(([k, v]) => `${k}: ${v}`).join('\n');
  const copiar = el('button', { class: 'secondary', type: 'button', id: 'dg-copiar', onclick: async () => {
    const bien = await copiarTexto(texto());
    estado.hidden = false;
    estado.textContent = bien ? 'Copiado. Pégalo en el chat.' : 'No se ha podido copiar. Apunta los números a mano.';
  } }, 'Copiar diagnóstico');

  const interruptor = el('input', { type: 'checkbox', id: 'dg-forzar', checked: forzado, onchange: () => { forzarAltura(interruptor.checked); pintar(); } });
  alApagar = () => { interruptor.checked = false; if (lista.isConnected) pintar(); };
  const pruebas = el('label', { class: 'diag-interruptor', for: 'dg-forzar' }, interruptor,
    el('span', {}, el('b', {}, 'Probar: forzar la altura de #app a screen.height'),
      el('span', { class: 'sub' }, `Solo para medir. No se guarda y se apaga solo a los ${SEGUNDOS_PRUEBA} segundos. Si la barra de pestañas desaparece, espera o cierra la app.`)));

  quitarAnterior?.();
  const alCambiar = () => { if (lista.isConnected) pintar(); };
  window.addEventListener('resize', alCambiar);
  window.addEventListener('orientationchange', alCambiar);
  window.visualViewport?.addEventListener('resize', alCambiar);
  quitarAnterior = () => {
    window.removeEventListener('resize', alCambiar);
    window.removeEventListener('orientationchange', alCambiar);
    window.visualViewport?.removeEventListener('resize', alCambiar);
  };

  const t = plegable({ id: 'aj-diagnostico', clave: 'diagnostico', idTitulo: 'dg-titulo', titulo: 'Diagnóstico (temporal)' },
    el('p', { class: 'sub' }, 'Solo mide la ventana de este móvil, para arreglar la franja bajo la barra. No lleva datos personales ni claves. Se quitará en la próxima versión.'),
    lista, pruebas, copiar, estado);
  pintar();
  return t;
}
