// Botón "Actualizar datos" (v28): arriba a la derecha de la cabecera. Vuelve a leer el Sheet sin cerrar la app.
// Se oculta donde se podría perder lo que se está escribiendo (formularios, notas de entrevista, borrador de correo) y en la demo.
// Mientras carga gira; si falla, dice por qué y los datos anteriores se quedan. No guarda nada en el móvil. Sin recarga automática.
import { refrescar, getModo } from '../data/index.js';
import { navegacion } from '../util/navegacion.js';

// Pantallas de formulario: nunca se enseña el botón.
export const VISTAS_SIN_BOTON = ['acceso', 'oferta-form', 'ronda-form', 'aplicacion-form', 'estado-form'];
const AVISO_OK_MS = 3000;

// ¿Hay algo escrito (o por escribir) en la pantalla visible? Notas de entrevista, borrador de correo, formularios o cambios sin guardar.
export function hayFormularioAbierto(doc = document) {
  return navegacion.sinGuardar || !!doc.querySelector('#main .view.on textarea, #main .view.on form');
}

// "vista" = la pantalla actual (p. ej. 'inicio'); devuelve si el botón debe verse.
export function botonVisible(vista, doc = document) {
  return getModo() === 'script' && !VISTAS_SIN_BOTON.includes(vista) && !hayFormularioAbierto(doc);
}

// Conecta el botón. "alActualizar" repinta la pantalla actual con los datos nuevos; "vistaActual" dice cuál es.
export function iniciarRefrescar({ vistaActual, alActualizar }) {
  const boton = document.getElementById('refrescar'), aviso = document.getElementById('refrescar-aviso');
  let ocupado = false, reloj = null;
  const decir = (texto, clase) => {
    clearTimeout(reloj);
    aviso.textContent = texto; aviso.hidden = !texto;
    aviso.className = 'refrescar-aviso ' + (clase || '');
    aviso.setAttribute('role', clase === 'mal' ? 'alert' : 'status');
    if (clase === 'ok') reloj = setTimeout(() => { aviso.hidden = true; }, AVISO_OK_MS);
  };
  const mostrar = () => { boton.hidden = !botonVisible(vistaActual()); if (boton.hidden) decir(''); };

  boton.addEventListener('click', async () => {
    if (ocupado || boton.hidden || hayFormularioAbierto()) return;   // un solo toque a la vez; nunca con un formulario abierto
    ocupado = true;
    boton.classList.add('girando'); boton.setAttribute('aria-busy', 'true'); boton.setAttribute('aria-disabled', 'true');
    decir('Actualizando…', 'carga');
    try {
      await refrescar();
      await alActualizar();
      decir('Datos actualizados.', 'ok');
    } catch (e) {
      const motivo = String(e?.message || 'error desconocido').trim().replace(/[.\s]+$/, '');
      decir(`No se han podido actualizar los datos: ${motivo}. Se siguen viendo los datos anteriores.`, 'mal');
      if (e?.codigo === 'clave') location.hash = '#/acceso';   // la clave ya no vale: se vuelve a pedir, como en el resto de la app
    } finally {
      ocupado = false;
      boton.classList.remove('girando'); boton.removeAttribute('aria-busy'); boton.removeAttribute('aria-disabled');
    }
  });

  // El botón sigue a la pantalla (también cuando se abre la entrevista, que no cambia la dirección).
  new MutationObserver(mostrar).observe(document.getElementById('main'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  return { mostrar };
}
