// Botón "Actualizar datos": arriba a la derecha de la cabecera. Vuelve a leer el Sheet sin cerrar la app.
// Se oculta donde se podría perder lo que se está escribiendo (formularios, notas de entrevista, borrador de correo) y en la demo.
// Mientras carga gira; si falla, dice por qué y los datos anteriores se quedan. No guarda nada en el móvil. Sin recarga automática.
import { refrescar, getModo } from '../data/index.js';
import { navegacion } from '../util/navegacion.js';

// Pantallas de formulario: nunca se enseña el botón.
const VISTAS_SIN_BOTON = ['acceso', 'oferta-form', 'ronda-form', 'aplicacion-form', 'estado-form'];
const AVISO_OK_MS = 3000;

// ¿Hay algo escrito (o por escribir) en la pantalla visible? Notas de entrevista, borrador de correo, formularios o cambios sin guardar.
function hayFormularioAbierto(doc = document) {
  return navegacion.sinGuardar || !!doc.querySelector('#main .view.on textarea, #main .view.on form');
}

// "vista" = la pantalla actual (p. ej. 'inicio'); devuelve si el botón debe verse.
function botonVisible(vista, doc = document) {
  return getModo() === 'script' && !VISTAS_SIN_BOTON.includes(vista) && !hayFormularioAbierto(doc);
}

// El texto del error: siempre dos frases cortas, sin repetir «no se ha podido»; los datos de antes se siguen viendo.
export function textoError(e) {
  if (e?.codigo === 'red') return 'Sin conexión: se siguen viendo los datos anteriores. Vuelve a intentarlo cuando tengas internet.';
  if (e?.codigo === 'tiempo')
    return 'Google tarda demasiado en responder: se siguen viendo los datos anteriores. Vuelve a intentarlo en un momento.';
  const motivo = String(e?.message || 'Error desconocido.').trim();
  return `No se han podido actualizar los datos. ${/[.!?]$/.test(motivo) ? motivo : motivo + '.'} Se siguen viendo los datos anteriores.`;
}

// Conecta el botón. "alActualizar" repinta la pantalla actual con los datos nuevos; "vistaActual" dice cuál es.
export function iniciarRefrescar({ vistaActual, alActualizar }) {
  const boton = document.getElementById('refrescar'),
    aviso = document.getElementById('refrescar-aviso');
  const textoAviso = document.getElementById('refrescar-texto'),
    cerrar = document.getElementById('refrescar-cerrar');
  let ocupado = false,
    reloj = null;
  const decir = (texto, clase) => {
    clearTimeout(reloj);
    textoAviso.textContent = texto;
    aviso.hidden = !texto;
    cerrar.hidden = clase !== 'mal'; // solo el error se puede cerrar (lo demás se quita solo)
    aviso.className = 'refrescar-aviso ' + (clase || '');
    aviso.setAttribute('role', clase === 'mal' ? 'alert' : 'status');
    if (clase === 'ok')
      reloj = setTimeout(() => {
        aviso.hidden = true;
      }, AVISO_OK_MS);
  };
  const mostrar = () => {
    boton.hidden = !botonVisible(vistaActual());
    document.getElementById('app').classList.toggle('con-refrescar', !boton.hidden); // en horizontal, el contenido deja libre el hueco del botón
    if (boton.hidden) decir('');
  };

  boton.addEventListener('click', async () => {
    if (ocupado || boton.hidden || hayFormularioAbierto()) return; // un solo toque a la vez; nunca con un formulario abierto
    ocupado = true;
    boton.classList.add('girando');
    boton.setAttribute('aria-busy', 'true');
    boton.setAttribute('aria-disabled', 'true');
    decir('Actualizando…', 'carga'); // también cierra un error anterior
    try {
      await refrescar();
      await alActualizar();
      decir('Datos actualizados.', 'ok');
    } catch (e) {
      decir(textoError(e), 'mal');
      if (e?.codigo === 'clave') location.hash = '#/acceso'; // la clave ya no vale: se vuelve a pedir, como en el resto de la app
    } finally {
      ocupado = false;
      boton.classList.remove('girando');
      boton.removeAttribute('aria-busy');
      boton.removeAttribute('aria-disabled');
    }
  });

  cerrar.addEventListener('click', () => {
    decir('');
    boton.focus();
  });

  // El botón sigue a la pantalla (también cuando se abre la entrevista, que no cambia la dirección).
  new MutationObserver(mostrar).observe(document.getElementById('main'), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  return { mostrar };
}
