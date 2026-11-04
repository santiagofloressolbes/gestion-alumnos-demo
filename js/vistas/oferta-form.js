// Formulario para dar de alta o editar una oferta. Lo que se escribe NO se guarda en el móvil:
// solo se envía al script cuando se pulsa "Guardar". Las ofertas no se borran: se cierran cambiando el estado.
import { getOfertas, getListas, recargar, guardarOferta, aplicarOferta, puedeEscribirOfertas, estadoEscrituraOfertas } from '../data/index.js';
import { el } from '../util/dom.js';
import { navegacion } from '../util/navegacion.js';
import { CAMPOS, validarOferta, mensajeCampo, normalizarTexto, miles } from '../util/ofertas.js';
import { hoyLocal, fechaLarga } from './entrevista.js';
import { tarjetaError } from './error-datos.js';
import { ocupar } from '../util/trabajo.js';

const ir = hash => { location.hash = hash; };
const igual = (a, b) => CAMPOS.every(c => a[c.clave] === b[c.clave]);
const recortadas = o => Object.fromEntries(CAMPOS.map(c => [c.clave, normalizarTexto(o[c.clave])]));

export async function pintarFormOferta(raiz, id) {
  navegacion.sinGuardar = false;
  const volver = el('a', { class: 'volver', href: id ? '#/oferta/' + encodeURIComponent(id) : '#/ofertas' }, id ? 'Oferta' : 'Ofertas');
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando…'));
  let ofertas, listas;
  try {
    [ofertas, listas] = await Promise.all([getOfertas(), getListas()]);
  } catch (err) {
    raiz.replaceChildren(volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarFormOferta(raiz, id); }));
    return;
  }
  if (!puedeEscribirOfertas()) {
    const motivo = estadoEscrituraOfertas() === 'script-antiguo'
      ? 'El script de Google es de una versión anterior y no sabe guardar ofertas. Actualiza Code.gs (mira la guía, apartado "Actualizar a la versión con ofertas").'
      : 'Estás en la demo: no se puede guardar nada. Conecta con el Sheet de prueba desde Inicio.';
    raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, 'No se puede guardar'), el('p', { class: 'sub' }, motivo)));
    return;
  }
  const oferta = id ? ofertas.find(x => x.id === id) : null;
  if (id && !oferta) {
    raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, 'Oferta no encontrada'), el('p', { class: 'sub' }, 'Vuelve a la lista y elige otra.')));
    return;
  }

  const hoy = hoyLocal();
  const idsAntes = new Set(ofertas.map(x => x.id));   // para reconocer la oferta recién creada si se pierde la respuesta
  const inicial = oferta
    ? recortadas(oferta)
    : { ...recortadas({}), fechaRecepcion: hoy, estado: (listas.estadosOferta || []).includes('Abierta') ? 'Abierta' : '' };
  let base = null;        // al editar: lo que se cree que hay en el Sheet (cambia si se elige "guardar el mío igualmente")
  let incierto = false;   // un alta cuya respuesta se perdió: no se sabe si llegó a guardarse
  const entradas = {};

  /* ---- campos ---- */
  const campoTexto = c => {
    const input = el('input', { id: 'of-f-' + c.clave, type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'of-c-' + c.clave,
      placeholder: c.enlace ? 'https://… o una descripción corta' : null, autocapitalize: c.enlace ? 'off' : 'sentences' });
    input.value = inicial[c.clave];
    const cuenta = el('p', { class: 'cuenta', id: 'of-c-' + c.clave });
    const pintar = () => {
      const n = normalizarTexto(input.value).length;
      cuenta.textContent = `${miles(n)} / ${miles(c.max)} caracteres`;
      cuenta.classList.toggle('exceso', n > c.max);
    };
    input.addEventListener('input', pintar); pintar();
    entradas[c.clave] = input;
    return el('div', { class: 'campo-form' }, el('label', { for: input.id }, c.etiqueta + (c.obligatorio ? '' : ' (opcional)')), input, cuenta);
  };

  const campoLista = c => {
    let valores = [...(listas[c.lista] || [])];
    if (c.clave === 'requisitoNacionalidad') valores.sort((a, b) => a.localeCompare(b, 'es'));
    const actual = inicial[c.clave];
    const fuera = actual && !valores.includes(actual);   // un valor del Sheet que ya no está en Listas: se enseña, pero habrá que cambiarlo
    const vacia = c.clave === 'requisitoNacionalidad' ? 'Sin requisito de nacionalidad' : 'Elige…';
    const sel = el('select', { id: 'of-f-' + c.clave },
      el('option', { value: '' }, vacia),
      valores.map(v => el('option', { value: v }, v)),
      fuera && el('option', { value: actual }, `${actual} (ya no está en las listas)`));
    sel.value = actual;
    entradas[c.clave] = sel;
    return el('div', { class: 'campo-form' }, el('label', { for: sel.id }, c.etiqueta + (c.obligatorio ? '' : ' (opcional)')), sel,
      c.clave === 'estado' && el('p', { class: 'sub ayuda' }, 'Para cerrar una oferta, cámbiala a «Cerrada». Las ofertas no se borran desde la app.'));
  };

  const campoFecha = c => {
    const input = el('input', { id: 'of-f-' + c.clave, type: 'date', max: hoy });
    input.value = inicial[c.clave];
    entradas[c.clave] = input;
    return el('div', { class: 'campo-form' }, el('label', { for: input.id }, c.etiqueta), input);
  };

  const campos = CAMPOS.map(c => (c.lista ? campoLista(c) : c.fecha ? campoFecha(c) : campoTexto(c)));
  const leer = () => Object.fromEntries(CAMPOS.map(c => [c.clave, normalizarTexto(entradas[c.clave].value)]));

  /* ---- estado de la pantalla ---- */
  const error = el('p', { class: 'error', role: 'alert', hidden: true });
  const conflicto = el('div', { class: 'conflicto', hidden: true });
  const guardar = el('button', { class: 'primary', type: 'submit' }, 'Guardar');
  const cancelar = el('button', { class: 'secondary', type: 'button', onclick: () => {
    if (navegacion.sinGuardar && !confirm('¿Descartar lo que has escrito?')) return;
    navegacion.sinGuardar = false;
    ir(id ? '#/oferta/' + encodeURIComponent(id) : '#/ofertas');
  } }, 'Cancelar');
  const decir = (t, campo) => { error.textContent = t; error.hidden = !t; if (t && campo) entradas[campo]?.focus(); };
  const controles = () => [guardar, cancelar, ...Object.values(entradas), ...conflicto.querySelectorAll('button')];
  const marcarCambios = () => { navegacion.sinGuardar = !igual(leer(), inicial); };

  const terminar = (idFinal, aviso) => {
    navegacion.sinGuardar = false;
    navegacion.aviso = aviso;
    ir('#/oferta/' + encodeURIComponent(idFinal));
  };

  const enviar = async (pulsado = guardar) => {
    const v = leer();
    if (id && !base && igual(v, inicial)) return terminar(id, '');   // nada que guardar: no se envía nada
    const problema = validarOferta(v, listas, hoy);
    if (problema) { decir(problema.mensaje, problema.campo); return; }
    decir('');
    if (pulsado === guardar) conflicto.hidden = true;   // si se pulsó un botón del aviso, ese aviso sigue a la vista mientras trabaja
    const liberar = ocupar(controles(), pulsado);
    try {
      // Si un alta anterior se quedó sin respuesta, primero se mira si la oferta ya está en el Sheet: así no se duplica.
      if (!id && incierto) {
        const ya = await buscarYaGuardada(v, idsAntes);
        if (ya) return terminar(ya, 'Oferta creada en el Sheet.');
      }
      const r = await guardarOferta(id, v, base || inicial);
      terminar(r.id, r.creada ? 'Oferta creada en el Sheet.' : 'Guardado en el Sheet.');
    } catch (e) {
      liberar();
      if (e.codigo === 'conflicto' && e.extra.oferta) return pintarConflicto(e.extra.oferta, v);
      if (e.extra?.campo && mensajeCampo(e.codigo, e.extra.campo)) return decir(mensajeCampo(e.codigo, e.extra.campo), e.extra.campo);
      if (e.codigo === 'clave') return decir('La clave ya no es correcta. Copia lo que has escrito antes de salir y vuelve a entrar con la clave nueva.');
      if (e.codigo === 'no-encontrado') return decir('Esta oferta ya no está en el Sheet.');
      if (e.codigo === 'id-duplicado') return decir('El número de esta oferta está repetido en el Sheet. Corrígelo en el Sheet.');
      decir(e.message);
      if (e.codigo === 'red' || e.codigo === 'tiempo') {
        if (!id) { incierto = true; error.append(' Es posible que la oferta sí se haya guardado: al pulsar Guardar otra vez, la app lo comprobará antes de enviarla de nuevo, para no duplicarla.'); }
        error.append(' Lo que has escrito sigue aquí: no se ha perdido.');
      }
    }
  };

  // Otra persona cambió la oferta: se enseña lo que hay ahora y se deja elegir. Nunca se pisa en silencio.
  const pintarConflicto = (actualBruto, mias) => {
    const actual = recortadas(actualBruto);
    if (igual(actual, mias)) { aplicarOferta(id, actual); return terminar(id, 'Guardado en el Sheet.'); }   // ya estaba guardado (p. ej. se cortó la respuesta)
    const antes = base || inicial;
    const cambiados = CAMPOS.filter(c => actual[c.clave] !== antes[c.clave]);
    conflicto.replaceChildren(
      el('h3', {}, 'Alguien cambió esta oferta'),
      el('p', { class: 'sub' }, 'Esto es lo que hay ahora en el Sheet en lo que ha cambiado. Lo que has escrito sigue en el formulario.'),
      el('p', { class: 'sub' }, 'Si guardas el tuyo, se guardan solo los campos que has tocado tú; en los demás se conserva lo que hay en el Sheet.'),
      el('dl', { class: 'campos' }, (cambiados.length ? cambiados : CAMPOS).map(c => el('div', { class: 'campo' },
        el('dt', {}, c.etiqueta),
        el('dd', { class: actual[c.clave] ? '' : 'vacio' }, (c.fecha ? fechaLarga(actual[c.clave]) : actual[c.clave]) || 'Vacío')))),
      el('button', { class: 'primary', type: 'button', onclick: ev => {
        // Mis cambios sobre lo que hay ahora: lo que no toqué se queda como está en el Sheet.
        for (const c of CAMPOS) if (mias[c.clave] === inicial[c.clave]) ponerValor(entradas[c.clave], actual[c.clave]);
        base = actual; enviar(ev.currentTarget);
      } }, 'Guardar el mío igualmente'),
      el('button', { class: 'secondary', type: 'button', onclick: () => { aplicarOferta(id, actual); terminar(id, 'Se ha cargado lo que había en el Sheet.'); } }, 'Descartar el mío'));
    conflicto.hidden = false;
    conflicto.scrollIntoView?.({ block: 'nearest' });
  };

  raiz.replaceChildren(
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'of-form-titulo' },
      el('h2', { id: 'of-form-titulo' }, id ? 'Editar oferta' : 'Nueva oferta'),
      el('form', { novalidate: true, oninput: marcarCambios, onchange: marcarCambios, onsubmit: ev => { ev.preventDefault(); if (!guardar.disabled) enviar(); } },
        campos, error, conflicto, guardar, cancelar)));
  entradas.empresa.focus();
}

// Pone un valor en un campo; en un desplegable, si el valor no está entre las opciones, la añade para no perderlo.
function ponerValor(campo, v) {
  if (campo.tagName === 'SELECT' && v && ![...campo.options].some(o => o.value === v)) campo.append(el('option', { value: v }, `${v} (ya no está en las listas)`));
  campo.value = v;
}

// Tras un fallo de conexión en un alta: vuelve a leer el Sheet y busca una oferta nueva idéntica a la escrita.
async function buscarYaGuardada(v, idsAntes) {
  try {
    await recargar();
    return (await getOfertas()).find(o => !idsAntes.has(o.id) && igual(recortadas(o), v))?.id || null;
  } catch { return null; }   // sin conexión otra vez: se intenta guardar de todos modos y se verá el error
}
