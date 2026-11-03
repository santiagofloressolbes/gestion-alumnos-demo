// Tarjeta "Entrevista" de la ficha: ver y (si la conexión lo permite) editar las notas y la fecha.
// Lo que se escribe NO se guarda en el móvil: solo se envía al script cuando se pulsa "Guardar".
import { guardarEntrevista, aplicarEntrevista, puedeEscribir } from '../data/index.js';
import { el } from '../util/dom.js';

const MAX_NOTAS = 2000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

// "2026-10-05" -> "5 de octubre de 2026". Si el formato es otro, se muestra tal cual.
export function fechaLarga(t) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  return m && MESES[m[2] - 1] ? `${+m[3]} de ${MESES[m[2] - 1]} de ${m[1]}` : t;
}

export function hoyLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const normalizar = t => String(t).replace(/\r\n?/g, '\n').trim();
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 2000 -> 2.000 (toLocaleString no pone el punto en 4 cifras)

// Las mismas reglas que aplica el script; así los errores se ven antes de enviar nada. Devuelve un código o ''.
export function validar(notas, fecha, hoy) {
  if (!notas) return 'sin-notas';
  if (notas.length > MAX_NOTAS) return 'largo';
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(notas)) return 'caracteres';
  if (/<[\/!?a-zA-Z]/.test(notas)) return 'html';
  const m = ISO.exec(fecha);
  if (!m || +m[1] < 2000 || fecha === '') return 'fecha';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return 'fecha';
  return fecha > hoy ? 'fecha-futura' : '';
}

const MENSAJES = {
  'sin-notas': 'Escribe una nota.', largo: `La nota supera los ${miles(MAX_NOTAS)} caracteres.`,
  caracteres: 'La nota tiene caracteres de control que no se admiten.',
  html: 'La nota parece llevar código HTML (un «<» seguido de una letra o una barra). Cámbialo y vuelve a guardar.',
  fecha: 'Elige una fecha válida.', 'fecha-futura': 'La fecha no puede ser futura.',
};

export function tarjetaEntrevista(a) {
  const caja = el('section', { class: 'card', 'aria-labelledby': 'en-titulo' });

  const ver = (aviso = '') => {
    const hay = !!(a.notasEntrevista.trim() || a.fechaUltimaEntrevista);
    // replaceChildren convierte un null en el texto "null": lo opcional se filtra antes.
    caja.replaceChildren(...[
      el('h2', { id: 'en-titulo' }, 'Entrevista'),
      el('dl', { class: 'campos' },
        campo('Última entrevista', fechaLarga(a.fechaUltimaEntrevista) || 'Sin entrevista registrada', !a.fechaUltimaEntrevista),
        campo('Notas', a.notasEntrevista.trim() || 'Sin notas', !a.notasEntrevista.trim(), true)),
      aviso && el('p', { class: 'ok', role: 'status' }, aviso),
      puedeEscribir()
        ? el('button', { class: 'secondary', type: 'button', id: 'en-editar', onclick: editar }, hay ? 'Editar entrevista' : 'Añadir entrevista')
        : null,
    ].filter(Boolean));
  };

  const editar = () => {
    const hoy = hoyLocal();
    let base = null;   // si hay conflicto y se elige "guardar el mío igualmente": lo que hay ahora en el Sheet
    const inicial = a.notasEntrevista.trim();
    const textarea = el('textarea', { id: 'en-notas', rows: '9', autocomplete: 'off', spellcheck: 'true', 'aria-describedby': 'en-cuenta' });
    textarea.value = inicial;
    const cuenta = el('p', { class: 'cuenta', id: 'en-cuenta' });
    const fechaIn = el('input', { id: 'en-fecha', type: 'date', max: hoy, required: true });
    fechaIn.value = ISO.test(a.fechaUltimaEntrevista) ? a.fechaUltimaEntrevista : hoy;
    const error = el('p', { class: 'error', role: 'alert', hidden: true });
    const conflicto = el('div', { class: 'conflicto', hidden: true });
    const guardar = el('button', { class: 'primary', type: 'submit' }, 'Guardar');
    const cancelar = el('button', { class: 'secondary', type: 'button', onclick: () => {
      if (textarea.value !== inicial && !confirm('¿Descartar lo que has escrito?')) return;
      ver();
    } }, 'Cancelar');

    const pintarCuenta = () => {
      const n = normalizar(textarea.value).length;
      cuenta.textContent = `${miles(n)} / ${miles(MAX_NOTAS)} caracteres`;
      cuenta.classList.toggle('exceso', n > MAX_NOTAS);
    };
    textarea.addEventListener('input', pintarCuenta);
    pintarCuenta();

    const decir = t => { error.textContent = t; error.hidden = !t; };
    const ocupado = si => { guardar.disabled = cancelar.disabled = textarea.disabled = fechaIn.disabled = si; guardar.textContent = si ? 'Guardando…' : 'Guardar'; };

    // ¿Se puede guardar? Si no hay nota y ya había entrevista, se entiende que se quiere borrarla.
    const enviar = async () => {
      const notas = normalizar(textarea.value);
      let fecha = fechaIn.value;
      if (!notas && inicial && !base) {
        if (!confirm('No hay notas: se borrarán las notas y la fecha de esta entrevista. ¿Seguro?')) return;
        fecha = '';
      } else {
        const c = validar(notas, fecha, hoy);
        if (c) { decir(MENSAJES[c]); (c === 'fecha' || c === 'fecha-futura' ? fechaIn : textarea).focus(); return; }
      }
      decir(''); conflicto.hidden = true; ocupado(true);
      try {
        await guardarEntrevista(a.id, notas, fecha, base || undefined);
        ver('Guardado en el Sheet.');
      } catch (e) {
        ocupado(false);
        if (e.codigo === 'conflicto') return pintarConflicto(e.extra, notas, fecha);
        decir(e.codigo === 'clave'
          ? 'La clave ya no es correcta. Copia tu nota antes de salir y vuelve a entrar con la clave nueva.'
          : e.message);
        if (e.codigo === 'red' || e.codigo === 'tiempo') error.append(' Tu nota sigue aquí: no se ha perdido.');
      }
    };

    // Otra persona cambió la entrevista: se enseña lo que hay ahora y se deja elegir. Nunca se pisa en silencio.
    const pintarConflicto = (actual, mias, miFecha) => {
      const nA = normalizar(actual.notas || ''), fA = actual.fecha || '';
      if (nA === mias && fA === miFecha) {            // ya estaba guardado (p. ej. se cortó la respuesta): no hay nada que decidir
        aplicarEntrevista(a.id, actual.notas, fA);
        return ver('Guardado en el Sheet.');
      }
      conflicto.replaceChildren(
        el('h3', {}, 'Alguien cambió esta entrevista'),
        el('p', { class: 'sub' }, 'Esto es lo que hay ahora en el Sheet. Lo que has escrito sigue en el cuadro de arriba.'),
        el('dl', { class: 'campos' }, campo('Fecha', fechaLarga(fA) || 'Sin fecha', !fA), campo('Notas', nA || 'Sin notas', !nA, true)),
        el('button', { class: 'primary', type: 'button', onclick: () => { base = { notas: actual.notas || '', fecha: fA }; enviar(); } }, 'Guardar el mío igualmente'),
        el('button', { class: 'secondary', type: 'button', onclick: () => { aplicarEntrevista(a.id, actual.notas || '', fA); ver('Se ha cargado lo que había en el Sheet.'); } }, 'Descartar el mío'));
      conflicto.hidden = false;
      conflicto.scrollIntoView?.({ block: 'nearest' });
    };

    caja.replaceChildren(
      el('h2', { id: 'en-titulo' }, 'Editar entrevista'),
      el('form', { novalidate: true, onsubmit: ev => { ev.preventDefault(); if (!guardar.disabled) enviar(); } },
        el('div', { class: 'campo-form' }, el('label', { for: 'en-notas' }, 'Notas'), textarea, cuenta),
        el('div', { class: 'campo-form' }, el('label', { for: 'en-fecha' }, 'Fecha de la entrevista'), fechaIn),
        error, conflicto, guardar, cancelar));
    textarea.focus();
  };

  ver();
  return caja;
}

function campo(etiqueta, valor, vacio, largo) {
  return el('div', { class: 'campo' }, el('dt', {}, etiqueta), el('dd', { class: (vacio ? 'vacio ' : '') + (largo ? 'largo' : '') }, valor));
}
