// Formulario para dar de alta o editar una oferta. Lo que se escribe NO se guarda en el móvil:
// solo se envía al script cuando se pulsa "Guardar". Las ofertas no se borran: se cierran cambiando el estado.
import { getOfertas, getListas, recargar, guardarOferta, aplicarOferta, puedeEscribirOfertas, estadoEscrituraOfertas, soportaPerfilOferta } from '../data/index.js';
import { el, reemplazar } from '../util/dom.js';
import { navegacion } from '../util/navegacion.js';
import { CAMPOS, camposActivos, validarOferta, mensajeCampo, normalizarTexto, miles, apoyoPerfil, avisosPerfil, partesLista, NIVELES_FORMACION } from '../util/ofertas.js';
import { hoyLocal, fechaLarga } from './entrevista.js';
import { tarjetaError } from './error-datos.js';
import { ocupar } from '../util/trabajo.js';

const ir = hash => { location.hash = hash; };
let CS = CAMPOS;   // los campos de ESTA pantalla: sin el perfil del puesto si el script no sabe guardarlo
const igual = (a, b) => CS.every(c => a[c.clave] === b[c.clave]);
const recortadas = o => Object.fromEntries(CS.map(c => [c.clave, normalizarTexto(o[c.clave])]));

export async function pintarFormOferta(raiz, id) {
  navegacion.sinGuardar = false;
  const volver = el('a', { class: 'volver', href: id ? '#/oferta/' + encodeURIComponent(id) : '#/ofertas' }, id ? 'Oferta' : 'Ofertas');
  reemplazar(raiz, el('p', { class: 'estado', role: 'status' }, 'Cargando…'));
  let ofertas, listas;
  try {
    [ofertas, listas] = await Promise.all([getOfertas(), getListas()]);
  } catch (err) {
    reemplazar(raiz, volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarFormOferta(raiz, id); }));
    return;
  }
  if (!puedeEscribirOfertas()) {
    const motivo = estadoEscrituraOfertas() === 'script-antiguo'
      ? 'No se pueden guardar ofertas: el script de Google es de una versión anterior. Actualiza Code.gs con la guía («Actualizar a la versión con ofertas»).'
      : 'Estás en la demo y aquí no se puede guardar nada. Conecta con el Sheet de prueba desde Ajustes.';
    reemplazar(raiz, volver, el('div', { class: 'card' }, el('h2', {}, 'No se puede guardar'), el('p', { class: 'sub' }, motivo)));
    return;
  }
  const conPerfil = soportaPerfilOferta();
  CS = camposActivos(conPerfil);
  const apoyo = apoyoPerfil(listas);
  const oferta = id ? ofertas.find(x => x.id === id) : null;
  if (id && !oferta) {
    reemplazar(raiz, volver, el('div', { class: 'card' }, el('h2', {}, 'Oferta no encontrada'), el('p', { class: 'sub' }, 'Vuelve a la lista y elige otra.')));
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
    // La nacionalidad que pide una oferta sale de la hoja Países (con filas de grupo como «Unión Europea (UE/EEE)») y de Listas: el script valida contra las dos.
    const valores = c.clave === 'requisitoNacionalidad' ? [...apoyo.nacionalidades] : [...(listas[c.lista] || [])];
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

  /* ---- perfil del puesto: con la hoja de apoyo, se elige de su lista; sin ella, es un campo de texto ---- */
  const avisos = {};   // un párrafo de aviso (no bloquea) por campo del perfil
  const parrafoAviso = c => { avisos[c.clave] = el('p', { class: 'cuenta exceso', id: 'of-a-' + c.clave, role: 'status', hidden: true }); return avisos[c.clave]; };
  const desplegable = (c, opciones, vacia, estaEnLista) => {
    const actual = inicial[c.clave];
    const sel = el('select', { id: 'of-f-' + c.clave, 'aria-describedby': 'of-a-' + c.clave }, el('option', { value: '' }, vacia), opciones,
      actual && !estaEnLista(actual) && el('option', { value: actual }, actual + ' (no está en la lista)'));
    sel.value = actual;
    entradas[c.clave] = sel;
    return el('div', { class: 'campo-form' }, el('label', { for: sel.id }, c.etiqueta + ' (opcional)'), sel, parrafoAviso(c));
  };
  const campoPerfil = c => {
    if (c.clave === 'paisOferta' && apoyo.paises.length) return desplegable(c, apoyo.paises.map(p => el('option', { value: p }, p)), 'Sin indicar', x => apoyo.paises.includes(x));
    if (c.clave === 'nivelFormacion') return desplegable(c, NIVELES_FORMACION.map(n => el('option', { value: n }, n)), 'Sin indicar', x => NIVELES_FORMACION.includes(x));
    if (c.clave === 'subarea' && apoyo.subareas.length) {
      const areas = [...new Set(apoyo.subareas.map(x => x.area))];
      return desplegable(c, areas.map(a => el('optgroup', { label: a }, apoyo.subareas.filter(x => x.area === a).map(x => el('option', { value: x.subarea }, x.subarea)))), 'Sin indicar', x => apoyo.subareas.some(y => y.subarea === x));
    }
    if (c.clave === 'etiquetas' && apoyo.etiquetas.length) {
      const puestas = new Set(partesLista(inicial.etiquetas));
      const extra = [...puestas].filter(e => !apoyo.etiquetas.includes(e));
      const lista = el('fieldset', { class: 'campo-etiquetas', id: 'of-f-etiquetas', tabindex: '-1', 'aria-describedby': 'of-a-etiquetas' },
        el('legend', { class: 'etiqueta' }, c.etiqueta + ' (opcional, máximo 8)'),
        el('ul', { class: 'elegir' }, [...apoyo.etiquetas, ...extra].map((e, i) => el('li', {}, el('label', { for: 'of-et-' + i },
          el('input', { type: 'checkbox', id: 'of-et-' + i, value: e, checked: puestas.has(e) }), el('span', {}, extra.includes(e) ? e + ' (no está en la lista)' : e))))));
      // Se guardan en el orden en que ya estaban (las nuevas, al final): así no se reescribe la celda si no se toca nada.
      const orden = e => { const i = [...puestas].indexOf(e); return i < 0 ? 1e6 : i; };
      // Para el resto de la pantalla, las etiquetas son un valor de texto como cualquier otro: «A; B».
      Object.defineProperty(lista, 'value', { get: () => [...lista.querySelectorAll('input:checked')].map(x => x.value).sort((a, b) => orden(a) - orden(b)).join('; '), set: v => { const p = new Set(partesLista(v)); lista.querySelectorAll('input').forEach(x => { x.checked = p.has(x.value); }); } });
      entradas.etiquetas = lista;
      return el('div', { class: 'campo-form' }, lista, parrafoAviso(c));
    }
    const t = campoTexto(c);
    const pista = { idiomas: 'Un idioma con su nivel (A1–C2 o nativo), separados por «;». Por ejemplo: «Inglés B2; Español nativo».', etiquetas: 'Separadas por «;» (no hay hoja Etiquetas en el Sheet). Máximo 8.', paisOferta: 'Escribe el país (no hay hoja Países en el Sheet).', subarea: 'Escribe la subárea (no hay hoja Áreas en el Sheet).' }[c.clave];
    if (pista) t.append(el('p', { class: 'sub ayuda' }, pista));
    t.append(parrafoAviso(c));
    return t;
  };
  const pintarAvisos = () => {
    if (!conPerfil) return;
    for (const a of Object.values(avisos)) { a.hidden = true; a.textContent = ''; }
    for (const a of avisosPerfil(leer(), listas)) { const p = avisos[a.campo]; if (p) { p.hidden = false; p.append(p.textContent ? ' ' + a.texto : a.texto); } }
  };
  const campos = CS.flatMap(c => {
    const campo = c.perfil ? campoPerfil(c) : c.lista ? campoLista(c) : c.fecha ? campoFecha(c) : campoTexto(c);
    return c.clave === 'paisOferta' ? [el('h3', { class: 'sub-seccion' }, 'Perfil del puesto'), el('p', { class: 'sub ayuda' }, 'Lo que el match compara con cada alumno. Todo es opcional: lo que dejes vacío no cuenta en la puntuación.'), campo] : [campo];
  });
  const avisoScript = puedeEscribirOfertas() && !conPerfil
    ? el('div', { class: 'card', id: 'of-sin-perfil' }, el('h3', {}, 'El perfil del puesto no se puede guardar todavía'), el('p', { class: 'sub' }, 'El script de Google es de una versión anterior a esta función. Actualiza Code.gs con la guía («Perfil del puesto en las ofertas»). Mientras tanto, la oferta se guarda sin esos datos y los que ya tenga no se tocan.'))
    : null;
  const leer = () => Object.fromEntries(CS.map(c => [c.clave, normalizarTexto(entradas[c.clave].value)]));

  /* ---- estado de la pantalla ---- */
  const error = el('p', { class: 'error', role: 'alert', hidden: true });
  const conflicto = el('div', { class: 'conflicto', hidden: true });
  const guardar = el('button', { class: 'primary', type: 'submit' }, 'Guardar');
  const cancelar = el('button', { class: 'secondary', type: 'button', onclick: () => {
    if (navegacion.sinGuardar && !confirm('¿Salir sin guardar lo que has escrito?')) return;
    navegacion.sinGuardar = false;
    ir(id ? '#/oferta/' + encodeURIComponent(id) : '#/ofertas');
  } }, 'Cancelar');
  const decir = (t, campo) => { error.textContent = t; error.hidden = !t; if (t && campo) entradas[campo]?.focus(); };
  const controles = () => [guardar, cancelar, ...Object.values(entradas), ...conflicto.querySelectorAll('button')];
  const marcarCambios = () => { navegacion.sinGuardar = !igual(leer(), inicial); pintarAvisos(); };

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
      if (e.codigo === 'clave') return decir('La clave ha cambiado o ya no vale. Copia lo que has escrito antes de salir y entra de nuevo con la clave nueva.');
      if (e.codigo === 'no-encontrado') return decir('Esta oferta ya no está en el Sheet.');
      if (e.codigo === 'id-duplicado') return decir('Hay dos filas con el mismo número en el Sheet. Corrígelo ahí y vuelve a intentarlo.');
      decir(e.message);
      if (e.codigo === 'red' || e.codigo === 'tiempo') {
        if (!id) { incierto = true; error.append(' Puede que la oferta sí se haya creado. Si vuelves a pulsar Guardar, la app lo comprobará antes de enviarla otra vez, para no duplicarla.'); }
        error.append(' Lo que has escrito sigue aquí: no se ha perdido.');
      }
    }
  };

  // Otra persona cambió la oferta: se enseña lo que hay ahora y se deja elegir. Nunca se pisa en silencio.
  const pintarConflicto = (actualBruto, mias) => {
    const actual = recortadas(actualBruto);
    if (igual(actual, mias)) { aplicarOferta(id, actual); return terminar(id, 'Guardado en el Sheet.'); }   // ya estaba guardado (p. ej. se cortó la respuesta)
    const antes = base || inicial;
    const cambiados = CS.filter(c => actual[c.clave] !== antes[c.clave]);
    reemplazar(conflicto, 
      el('h3', {}, 'Esta oferta ha cambiado mientras la editabas'),
      el('p', { class: 'sub' }, 'Esto es lo que ha cambiado en el Sheet. Lo que has escrito sigue en el formulario.'),
      el('p', { class: 'sub' }, 'Si guardas tu versión, solo cambian los campos que has tocado tú. Los demás se quedan como están en el Sheet.'),
      el('dl', { class: 'campos' }, (cambiados.length ? cambiados : CS).map(c => el('div', { class: 'campo' },
        el('dt', {}, c.etiqueta),
        el('dd', { class: actual[c.clave] ? '' : 'vacio' }, (c.fecha ? fechaLarga(actual[c.clave]) : actual[c.clave]) || 'Vacío')))),
      el('button', { class: 'primary', type: 'button', onclick: ev => {
        // Mis cambios sobre lo que hay ahora: lo que no toqué se queda como está en el Sheet.
        for (const c of CS) if (mias[c.clave] === inicial[c.clave]) ponerValor(entradas[c.clave], actual[c.clave]);
        base = actual; enviar(ev.currentTarget);
      } }, 'Guardar mi versión'),
      el('button', { class: 'secondary', type: 'button', onclick: () => { aplicarOferta(id, actual); terminar(id, 'Listo: ahora ves lo que hay en el Sheet. Tus cambios no se han guardado.'); } }, 'Quedarme con la del Sheet'));
    conflicto.hidden = false;
    conflicto.scrollIntoView?.({ block: 'nearest' });
  };

  reemplazar(raiz, 
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'of-form-titulo' },
      el('h2', { id: 'of-form-titulo' }, id ? 'Editar oferta' : 'Nueva oferta'),
      el('form', { novalidate: true, oninput: marcarCambios, onchange: marcarCambios, onsubmit: ev => { ev.preventDefault(); if (!guardar.disabled) enviar(); } },
        campos, avisoScript, error, conflicto, guardar, cancelar)));
  pintarAvisos();
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
