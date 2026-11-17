// Ajustes: los umbrales de los avisos y la firma de los correos. Todo se guarda solo en ESTE móvil (no en el Sheet).
import { el } from '../util/dom.js';
import { plegable } from './plegable.js';
import { UMBRALES_POR_DEFECTO, LIMITES, validarUmbrales } from '../util/avisos.js';
import { leerUmbrales, guardarUmbrales, restablecerUmbrales, leerFirma, guardarFirma, limpiarFirma, MAX_FIRMA } from '../util/preferencias.js';

const CAMPOS = [
  { clave: 'dias', etiqueta: 'Días que se revisan', ayuda: 'Cuántos días atrás se cuentan las solicitudes y las ofertas enviadas.' },
  { clave: 'ofertas', etiqueta: 'Ofertas enviadas (mínimo)', ayuda: 'Si se enviaron menos ofertas, no se avisa de «Sin solicitudes».' },
  { clave: 'solicitudes', etiqueta: 'Solicitudes (mínimo)', ayuda: 'Solicitudes necesarias para avisar de «Ha solicitado casi todas las ofertas».' },
  { clave: 'porcentaje', etiqueta: 'Porcentaje de ofertas solicitadas (%)', ayuda: 'Qué parte de las ofertas enviadas ha solicitado.' },
];
export const mensajeUmbral = (codigo, clave) => {
  const [min, max] = LIMITES[clave];
  return codigo === 'vacio' ? 'Escribe un número.'
    : codigo === 'entero' ? 'Escribe un número entero, sin decimales, signos ni letras.'
    : `Tiene que estar entre ${min} y ${max}.`;
};

export function tarjetaAvisos() {
  const actuales = leerUmbrales();
  const estado = el('p', { class: 'ok', role: 'status', id: 'aj-av-ok', hidden: true });
  const error = el('p', { class: 'error', role: 'alert', id: 'aj-av-error', hidden: true });
  const inputs = {}, errores = {};
  const filas = CAMPOS.map(c => {
    const id = 'aj-av-' + c.clave;
    inputs[c.clave] = el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', id, value: String(actuales[c.clave]), 'aria-describedby': `${id}-ayuda ${id}-error`, maxlength: '4',
      oninput: () => { errores[c.clave].hidden = true; inputs[c.clave].removeAttribute('aria-invalid'); estado.hidden = true; } });
    errores[c.clave] = el('p', { class: 'error', id: id + '-error', hidden: true });
    return el('div', { class: 'campo-form' },
      el('label', { for: id }, c.etiqueta), inputs[c.clave], errores[c.clave],
      el('p', { class: 'sub ayuda', id: id + '-ayuda' }, `${c.ayuda} Entre ${LIMITES[c.clave][0]} y ${LIMITES[c.clave][1]}.`));
  });

  const decir = (t, bien) => { estado.textContent = bien ? t : ''; estado.hidden = !(bien && t); error.textContent = bien ? '' : t; error.hidden = !t || bien; };
  const limpiarErrores = () => { for (const c of CAMPOS) { errores[c.clave].hidden = true; inputs[c.clave].removeAttribute('aria-invalid'); } };

  const guardar = () => {
    limpiarErrores(); decir('', true);
    const r = validarUmbrales(Object.fromEntries(CAMPOS.map(c => [c.clave, inputs[c.clave].value])));
    if (!r.umbrales) {
      let primero = null;
      for (const c of CAMPOS) {
        if (!r.errores[c.clave]) continue;
        errores[c.clave].textContent = mensajeUmbral(r.errores[c.clave], c.clave);
        errores[c.clave].hidden = false;
        inputs[c.clave].setAttribute('aria-invalid', 'true');
        primero ||= inputs[c.clave];
      }
      decir('No se ha guardado: revisa los campos marcados.', false);
      primero?.focus();
      return;
    }
    for (const c of CAMPOS) inputs[c.clave].value = String(r.umbrales[c.clave]);
    const verificado = guardarUmbrales(r.umbrales) && JSON.stringify(leerUmbrales()) === JSON.stringify(r.umbrales);   // se relee: así se sabe que de verdad quedó guardado
    decir(verificado ? 'Guardado en este móvil.' : 'No se ha podido guardar en este móvil (¿navegación privada?).', verificado);
  };

  const porDefecto = () => {
    limpiarErrores();
    restablecerUmbrales();
    for (const c of CAMPOS) inputs[c.clave].value = String(UMBRALES_POR_DEFECTO[c.clave]);
    decir('Valores recuperados.', true);
  };

  const enter = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); guardar(); } };   // Enter en un campo = Guardar (sin <form>, para no mezclarse con los formularios de la app)
  return plegable({ id: 'aj-avisos', clave: 'avisos', idTitulo: 'aj-av-titulo', titulo: 'Avisos de alumnos' },
    el('p', { class: 'sub' }, '«Sin solicitudes»: se enviaron ofertas y el alumno no ha solicitado ninguna. «Ha solicitado casi todas las ofertas»: ha solicitado casi todas las enviadas. Son solo avisos.'),
    el('div', { role: 'group', 'aria-labelledby': 'aj-av-titulo', onkeydown: enter },
      filas, error, estado,
      el('button', { class: 'primary', type: 'button', id: 'aj-av-guardar', onclick: guardar }, 'Guardar'),
      el('button', { class: 'secondary', type: 'button', id: 'aj-av-defecto', onclick: porDefecto }, 'Valores por defecto')),
    el('p', { class: 'sub' }, 'Se guardan solo en este móvil: cada móvil tiene los suyos.'));
}

export function tarjetaFirma() {
  const estado = el('p', { class: 'ok', role: 'status', id: 'aj-fi-ok', hidden: true });
  const error = el('p', { class: 'error', role: 'alert', id: 'aj-fi-error', hidden: true });
  const campo = el('input', { type: 'text', id: 'aj-firma', value: leerFirma(), maxlength: String(MAX_FIRMA), autocomplete: 'off', placeholder: 'Tu nombre', 'aria-describedby': 'aj-firma-ayuda',
    oninput: () => { estado.hidden = true; error.hidden = true; } });
  const guardar = () => {
    const f = limpiarFirma(campo.value);
    campo.value = f;
    const bien = guardarFirma(f) && leerFirma() === f;
    error.textContent = bien ? '' : 'No se ha podido guardar en este móvil (¿navegación privada?).';
    error.hidden = bien;
    estado.textContent = bien ? (f ? 'Firma guardada en este móvil.' : 'Firma borrada.') : '';
    estado.hidden = !bien;
  };
  const enter = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); guardar(); } };
  return plegable({ id: 'aj-firma-tarjeta', clave: 'firma', idTitulo: 'aj-fi-titulo', titulo: 'Firma de los correos' },
    el('p', { class: 'sub' }, 'Sale al final de los borradores de seguimiento. Solo el nombre.'),
    el('div', { role: 'group', 'aria-labelledby': 'aj-fi-titulo', onkeydown: enter },
      el('div', { class: 'campo-form' },
        el('label', { for: 'aj-firma' }, 'Tu nombre'), campo,
        el('p', { class: 'sub ayuda', id: 'aj-firma-ayuda' }, `Hasta ${MAX_FIRMA} caracteres. Se guarda solo en este móvil.`)),
      error, estado,
      el('button', { class: 'primary', type: 'button', id: 'aj-fi-guardar', onclick: guardar }, 'Guardar firma')));
}
