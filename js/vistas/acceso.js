// Pantalla de Acceso: escribir la dirección del script y la clave, o entrar en el modo demo.
// La dirección y la clave solo se guardan en este móvil, y solo si el script las da por buenas.
import { conectar, usarDemo, getModo, urlGuardada } from '../data/index.js';
import { el } from '../util/dom.js';

// Recarga la app limpia (sin datos en memoria y sin nada en la dirección).
const reiniciar = () => location.replace(location.pathname);

export function pintarAcceso(raiz) {
  const mensaje = el('p', { class: 'error', role: 'alert', hidden: true });
  const url = el('input', { id: 'ac-url', type: 'url', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    placeholder: 'https://script.google.com/macros/s/…/exec', value: urlGuardada() });
  const clave = el('input', { id: 'ac-clave', type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
  const boton = el('button', { class: 'primary', type: 'submit' }, 'Conectar');
  const ver = el('button', { class: 'enlace', type: 'button', 'aria-pressed': 'false', onclick: () => {
    const oculta = clave.type === 'password';
    clave.type = oculta ? 'text' : 'password';
    ver.textContent = oculta ? 'Ocultar la clave' : 'Mostrar la clave';
    ver.setAttribute('aria-pressed', String(oculta));
  } }, 'Mostrar la clave');

  const error = texto => { mensaje.textContent = texto; mensaje.hidden = !texto; };

  const formulario = el('form', { novalidate: true, onsubmit: async ev => {
    ev.preventDefault();
    error('');
    boton.disabled = true;
    boton.textContent = 'Conectando…';
    try {
      await conectar(url.value, clave.value);
      reiniciar();
    } catch (e) {
      error(e.message);
      boton.disabled = false;
      boton.textContent = 'Conectar';
      if (e.codigo === 'clave' || e.codigo === 'bloqueado') clave.value = '';
    }
  } },
    el('div', { class: 'campo-form' }, el('label', { for: 'ac-url' }, 'Dirección del script'), url),
    el('div', { class: 'campo-form' }, el('label', { for: 'ac-clave' }, 'Clave'), clave, ver),
    mensaje,
    boton);

  raiz.replaceChildren(
    getModo() && el('a', { class: 'volver', href: '#/' }, 'Volver'),
    el('section', { class: 'card', 'aria-labelledby': 'ac-titulo' },
      el('h2', { id: 'ac-titulo' }, 'Conectar con el Sheet de prueba'),
      el('p', { class: 'sub' }, 'La dirección y la clave se guardan solo en este móvil. Los datos de los alumnos no se guardan en él.'),
      formulario),
    el('section', { class: 'card', 'aria-labelledby': 'ac-demo' },
      el('h2', { id: 'ac-demo' }, 'O mira la demo'),
      el('p', { class: 'sub' }, 'Datos de ejemplo que vienen con la app. No necesita clave y no se puede guardar nada.'),
      el('button', { class: 'secondary', type: 'button', onclick: () => {
        try { usarDemo(); reiniciar(); } catch (e) { error(e.message); }
      } }, 'Ver demo')));
}
