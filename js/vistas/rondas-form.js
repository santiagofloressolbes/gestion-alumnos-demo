// Formularios de rondas y aplicaciones: registrar una ronda de difusión, añadir una aplicación y cambiar su estado.
// Lo que se escribe NO se guarda en el móvil: solo se envía al script cuando se pulsa "Guardar". Nada se borra.
import { recargar, estadoEscrituraRondas, puedeEscribirRondas, registrarRonda, crearAplicacion, cambiarEstado, aplicarRonda, aplicarAplicacion } from '../data/index.js';
import { el } from '../util/dom.js';
import { navegacion } from '../util/navegacion.js';
import { norm } from '../util/texto.js';
import { avatar } from '../util/avatar.js';
import {
  ESTADO_DESCARTE, MAX_NOTAS, normalizarTexto, nombreAlumno, siguienteRonda, alumnosSinAplicar, avisosRequisitos, ultimoMovimiento,
  validarRonda, validarAplicacion, validarCambio,
} from '../util/rondas.js';
import { hoyLocal, fechaLarga } from './entrevista.js';
import { datosRondas, insigniaEstado } from './rondas.js';
import { tarjetaError } from './error-datos.js';
import { ocupar, avisoFlotante } from '../util/trabajo.js';

const ir = hash => { location.hash = hash; };
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const cargando = () => el('p', { class: 'estado', role: 'status' }, 'Cargando…');
const hrefOferta = id => '#/oferta/' + encodeURIComponent(id);

// Texto para la persona según el problema { codigo, campo, desde } (los mismos códigos que usa el script).
function mensaje({ codigo, campo, desde }) {
  switch (codigo) {
    case 'requerido': return campo === 'alumno' ? 'Elige un alumno.' : campo === 'fecha' ? 'Elige la fecha.' : campo === 'estado' ? 'Elige el estado.' : 'Elige el motivo del descarte.';
    case 'fecha': return 'Elige una fecha válida.';
    case 'fecha-futura': return 'La fecha no puede ser futura.';
    case 'fecha-anterior': return `La fecha no puede ser anterior al ${fechaLarga(desde)}.`;
    case 'largo': return `${campo === 'notas' ? 'Las notas superan' : 'La nota supera'} los ${miles(MAX_NOTAS)} caracteres.`;
    case 'caracteres': return 'El texto tiene caracteres de control que no se admiten.';
    case 'html': return 'El texto parece llevar código HTML (un «<» seguido de una letra o una barra). Cámbialo y vuelve a guardar.';
    case 'lista': return campo === 'estado' ? 'Ese estado no está en la lista (hoja Listas del Sheet).' : 'Ese motivo no está en la lista (hoja Listas del Sheet).';
    case 'motivo-sobra': return 'Solo se indica un motivo cuando el estado es «Descartado».';
    case 'sin-cambios': return 'No has cambiado nada.';
    default: return '';
  }
}
// Los errores del script que se pueden explicar junto al campo.
const CAMPO_ENTRADA = { fecha: 'fecha', notas: 'notas', nota: 'nota', estado: 'estado', motivo: 'motivo', alumno: 'alumno' };
const mensajeServidor = e => (e.extra?.campo && CAMPO_ENTRADA[e.extra.campo] ? mensaje({ codigo: e.codigo, campo: e.extra.campo, desde: e.extra.desde }) : '');

function sinPermiso(raiz, volver) {
  const motivo = estadoEscrituraRondas() === 'script-antiguo'
    ? 'El script de Google es de una versión anterior, o en el Sheet faltan las hojas Rondas, Aplicaciones e Historial. Mira la guía, apartado "Actualizar a la versión con rondas y aplicaciones".'
    : 'Estás en la demo: no se puede guardar nada. Conecta con el Sheet de prueba desde Inicio.';
  raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, 'No se puede guardar'), el('p', { class: 'sub' }, motivo)));
}
const noEncontrado = (raiz, volver, que) =>
  raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, que + ' no encontrada'), el('p', { class: 'sub' }, 'Vuelve atrás y elige otra.')));

// Cuenta de caracteres de un cuadro de notas.
function cuadroNotas(id, etiqueta) {
  const area = el('textarea', { id, rows: '5', autocomplete: 'off', spellcheck: 'true', 'aria-describedby': id + '-cuenta' });
  const cuenta = el('p', { class: 'cuenta', id: id + '-cuenta' });
  const pintar = () => {
    const n = normalizarTexto(area.value).length;
    cuenta.textContent = `${miles(n)} / ${miles(MAX_NOTAS)} caracteres`;
    cuenta.classList.toggle('exceso', n > MAX_NOTAS);
  };
  area.addEventListener('input', pintar); pintar();
  return { area, pintar, campo: el('div', { class: 'campo-form' }, el('label', { for: id }, etiqueta), area, cuenta) };
}

function campoFecha(id, etiqueta, hoy, desde, valor) {
  const input = el('input', { id, type: 'date', max: hoy, min: ISO.test(desde) ? desde : null });
  input.value = valor;
  return { input, campo: el('div', { class: 'campo-form' }, el('label', { for: id }, etiqueta), input) };
}

/* ------------------------------------------------------------------ registrar una ronda */

export async function pintarFormRonda(raiz, idOferta, previo = {}) {
  navegacion.sinGuardar = false;
  const volver = el('a', { class: 'volver', href: hrefOferta(idOferta) }, 'Oferta');
  raiz.replaceChildren(cargando());
  let d;
  try { d = await datosRondas(); }
  catch (err) { raiz.replaceChildren(volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarFormRonda(raiz, idOferta); })); return; }
  const oferta = d.ofertas.find(x => x.id === idOferta);
  if (!oferta) return noEncontrado(raiz, volver, 'Oferta');
  if (!puedeEscribirRondas()) return sinPermiso(raiz, volver);

  const hoy = hoyLocal();
  const { numero, desde } = siguienteRonda(d.rondas, oferta);
  const f = campoFecha('ro-fecha', 'Fecha de envío a los alumnos', hoy, desde, previo.fecha || hoy);
  const error = el('p', { class: 'error', role: 'alert', hidden: true });
  const guardar = el('button', { class: 'primary', type: 'submit' }, 'Guardar');
  const cancelar = el('button', { class: 'secondary', type: 'button', onclick: () => {
    if (navegacion.sinGuardar && !confirm('¿Descartar lo que has escrito?')) return;
    navegacion.sinGuardar = false; ir(hrefOferta(oferta.id));
  } }, 'Cancelar');
  const decir = t => { error.textContent = t; error.hidden = !t; if (t) f.input.focus(); };
  const terminar = aviso => { navegacion.sinGuardar = false; navegacion.aviso = aviso; ir(hrefOferta(oferta.id)); };

  const enviar = async () => {
    const fecha = f.input.value;
    const p = validarRonda(fecha, { hoy, desde });
    if (p) return decir(mensaje(p));
    decir('');
    const liberar = ocupar([guardar, cancelar, f.input], guardar);
    try {
      await registrarRonda(oferta.id, numero, fecha);
      terminar(`Ronda ${numero} registrada.`);
    } catch (e) {
      if (e.codigo === 'conflicto' && e.extra.ultima !== undefined) {
        const ya = e.extra.ronda;
        if (ya && ya.fecha === fecha) { aplicarRonda(ya); return terminar(`Ronda ${numero} registrada.`); }   // ya estaba guardada (p. ej. se cortó la respuesta)
        guardar.textContent = 'Cargando…';
        await recargar().catch(() => {});
        return pintarFormRonda(raiz, idOferta, { fecha, aviso: `Otra persona ya había registrado la ronda ${numero}. Ahora será la ronda ${Number(e.extra.ultima) + 1}: revisa la fecha y guarda de nuevo.` });
      }
      liberar();
      if (e.codigo === 'clave') return decir('La clave ya no es correcta. Vuelve a entrar con la clave nueva.');
      decir(mensajeServidor(e) || e.message);
      if (e.codigo === 'red' || e.codigo === 'tiempo') error.append(' Es posible que la ronda sí se haya guardado: al pulsar Guardar otra vez, la app lo comprobará.');
    }
  };

  raiz.replaceChildren(...[
    volver,
    previo.aviso && el('p', { class: 'aviso', role: 'status', id: 'ro-aviso' }, previo.aviso),
    el('section', { class: 'card', 'aria-labelledby': 'ro-titulo' },
      el('h2', { id: 'ro-titulo' }, 'Registrar ronda de difusión'),
      el('p', { class: 'sub' }, [oferta.titulo || '(sin título)', oferta.empresa].filter(Boolean).join(' · ')),
      el('p', { class: 'numero-ronda', id: 'ro-numero' }, 'Será la ronda ' + numero),
      oferta.estado === 'Cerrada' && el('p', { class: 'aviso', role: 'note', id: 'ro-cerrada' }, 'Esta oferta está cerrada. Puedes registrar la ronda igualmente.'),
      el('form', { novalidate: true, oninput: () => { navegacion.sinGuardar = f.input.value !== hoy; }, onchange: () => { navegacion.sinGuardar = f.input.value !== hoy; },
        onsubmit: ev => { ev.preventDefault(); if (!guardar.disabled) enviar(); } },
        f.campo, error, guardar, cancelar)),
  ].filter(Boolean));
  navegacion.sinGuardar = f.input.value !== hoy;
  f.input.focus();
}

/* ------------------------------------------------------------------ añadir una aplicación */

export async function pintarFormAplicacion(raiz, idOferta, numeroTxt) {
  navegacion.sinGuardar = false;
  const volver = el('a', { class: 'volver', href: hrefOferta(idOferta) }, 'Oferta');
  raiz.replaceChildren(cargando());
  let d;
  try { d = await datosRondas(); }
  catch (err) { raiz.replaceChildren(volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarFormAplicacion(raiz, idOferta, numeroTxt); })); return; }
  const oferta = d.ofertas.find(x => x.id === idOferta);
  if (!oferta) return noEncontrado(raiz, volver, 'Oferta');
  const ronda = d.rondas.find(r => r.idOferta === idOferta && Number(r.numero) === Number(numeroTxt));
  if (!ronda) return noEncontrado(raiz, volver, 'Ronda');
  if (!puedeEscribirRondas()) return sinPermiso(raiz, volver);

  const hoy = hoyLocal();
  const desde = ronda.fecha;
  let elegido = '';       // el ID del alumno elegido
  const MAX_LISTA = 40;

  const buscar = el('input', { id: 'ap-q', type: 'search', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
    placeholder: 'Nombre, apellidos o máster…', 'aria-controls': 'ap-lista', oninput: () => pintarLista(),
    onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); buscar.blur(); } } });
  const lista = el('ul', { class: 'elegir', id: 'ap-lista', role: 'radiogroup', 'aria-label': 'Alumnos que todavía no han aplicado a esta ronda' });
  const cuentaLista = el('p', { class: 'sub', role: 'status', 'aria-live': 'polite', id: 'ap-cuenta' });
  const avisos = el('div', { id: 'ap-avisos', 'aria-live': 'polite' });
  const f = campoFecha('ap-fecha', 'Fecha en que aplica', hoy, desde, hoy);
  const n = cuadroNotas('ap-notas', 'Notas (opcional)');
  const error = el('p', { class: 'error', role: 'alert', hidden: true });
  const ok = el('p', { class: 'ok aviso-ok', role: 'status', id: 'ap-ok', hidden: true });
  const guardar = el('button', { class: 'primary', type: 'submit' }, 'Guardar');
  const cancelar = el('button', { class: 'secondary', type: 'button', onclick: () => {
    if (navegacion.sinGuardar && !confirm('¿Descartar lo que has escrito?')) return;
    navegacion.sinGuardar = false; ir(hrefOferta(oferta.id));
  } }, 'Volver a la oferta');

  const alumnoElegido = () => d.alumnos.find(a => a.id === elegido);
  const marcarCambios = () => { navegacion.sinGuardar = !!elegido || !!normalizarTexto(n.area.value) || f.input.value !== hoy; };
  const decir = (t, donde) => { error.textContent = t; error.hidden = !t; if (t) ok.hidden = true; if (t && donde) donde.focus(); };
  const controles = () => [guardar, cancelar, buscar, f.input, n.area, ...lista.querySelectorAll('input')];

  // Avisos de lo que se sabe del alumno elegido: solo informativos, nunca impiden guardar.
  function pintarAvisos() {
    const a = alumnoElegido();
    const previas = a ? d.aplicaciones.filter(x => x.idOferta === idOferta && x.idAlumno === a.id) : [];
    const lineas = a ? [
      ...previas.map(x => `Ya aplicó en la ronda ${x.numeroRonda} de esta oferta (${x.estado || 'sin estado'}).`),
      ...avisosRequisitos(a, oferta)] : [];
    avisos.replaceChildren(...lineas.map(t => el('p', { class: 'aviso', role: 'note' }, t)));
  }

  function pintarLista() {
    const palabras = norm(buscar.value).split(/\s+/).filter(Boolean);
    const sinAplicar = alumnosSinAplicar(d.alumnos, d.aplicaciones, idOferta, ronda.numero);
    const candidatos = sinAplicar
      .filter(a => { const t = norm(`${nombreAlumno(a)} ${a.master}`); return palabras.every(p => t.includes(p)); });
    // El alumno elegido siempre sigue a la vista aunque la búsqueda cambie.
    const visibles = candidatos.slice(0, MAX_LISTA);
    const el0 = elegido && sinAplicar.find(a => a.id === elegido);
    if (el0 && !visibles.includes(el0)) visibles.unshift(el0);
    cuentaLista.textContent = candidatos.length > MAX_LISTA ? `Se ven ${MAX_LISTA} de ${candidatos.length}: escribe para afinar.` : candidatos.length === 1 ? '1 alumno' : `${candidatos.length} alumnos`;
    lista.replaceChildren(...visibles.map(a => {
      const radio = el('input', { type: 'radio', name: 'ap-alumno', id: 'ap-al-' + a.id, value: a.id, onchange: () => { elegido = a.id; decir(''); ok.hidden = true; pintarAvisos(); marcarCambios(); resaltar(); } });
      radio.checked = a.id === elegido;
      const previas = d.aplicaciones.filter(x => x.idOferta === idOferta && x.idAlumno === a.id);
      return el('li', {}, el('label', { for: radio.id, class: a.id === elegido ? 'elegido' : null }, radio,
        avatar(a),
        el('span', { class: 'alumno-texto' }, el('b', {}, nombreAlumno(a)),
          el('span', { class: 'sub' }, [a.master, previas.length && `ya aplicó en la ronda ${previas.map(x => x.numeroRonda).join(', ')}`].filter(Boolean).join(' · ')))));
    }));
    if (!visibles.length) lista.replaceChildren(el('li', { class: 'sub' }, palabras.length ? 'Ningún alumno coincide.' : 'Todos los alumnos ya han aplicado a esta ronda.'));
  }
  const resaltar = () => { for (const l of lista.querySelectorAll('label')) l.classList.toggle('elegido', l.control?.checked === true); };

  // Tras guardar: se queda en la pantalla para añadir otra aplicación seguida.
  async function despuesDeGuardar(texto) {
    try { d = await datosRondas(); } catch { /* se sigue con lo que había */ }
    elegido = ''; buscar.value = ''; n.area.value = ''; n.pintar();
    navegacion.sinGuardar = f.input.value !== hoy;
    decir('');
    ok.textContent = texto; ok.hidden = false;
    pintarLista(); pintarAvisos();
    avisoFlotante(texto);   // la confirmación se ve aunque la pantalla esté más abajo
    buscar.focus({ preventScroll: true });   // el cursor vuelve al buscador, para añadir otra seguida
  }

  const enviar = async () => {
    const fecha = f.input.value, notas = normalizarTexto(n.area.value);
    const p = validarAplicacion({ idAlumno: elegido, fecha, notas }, { hoy, desde });
    if (p) return decir(mensaje(p), p.campo === 'fecha' ? f.input : p.campo === 'notas' ? n.area : buscar);
    const a = alumnoElegido();
    decir(''); ok.hidden = true;
    const liberar = ocupar(controles(), guardar);
    try {
      const r = await crearAplicacion({ idAlumno: elegido, idOferta, numeroRonda: ronda.numero, fecha, notas });
      liberar();
      await despuesDeGuardar(`Aplicación de ${nombreAlumno(a)} añadida (${r.aplicacion.id}). Puedes añadir otra.`);
    } catch (e) {
      if (e.codigo === 'duplicado' && e.extra.aplicacion) {          // ya estaba guardada (p. ej. se cortó la respuesta)
        aplicarAplicacion(e.extra.aplicacion);
        guardar.textContent = 'Cargando…';
        await recargar().catch(() => {});
        liberar();
        return despuesDeGuardar(`${nombreAlumno(a)} ya estaba apuntado en la ronda ${ronda.numero} (${e.extra.aplicacion.estado || 'sin estado'}).`);
      }
      liberar();
      if (e.codigo === 'clave') return decir('La clave ya no es correcta. Vuelve a entrar con la clave nueva.');
      decir(mensajeServidor(e) || e.message);
      if (e.codigo === 'red' || e.codigo === 'tiempo') error.append(' Es posible que sí se haya guardado: al pulsar Guardar otra vez, la app lo comprobará. Lo que has escrito sigue aquí.');
    }
  };

  raiz.replaceChildren(...[
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'ap-titulo' },
      el('h2', { id: 'ap-titulo' }, 'Añadir aplicación'),
      el('p', { class: 'sub' }, `${[oferta.titulo || '(sin título)', oferta.empresa].filter(Boolean).join(' · ')} · Ronda ${ronda.numero}, enviada el ${fechaLarga(ronda.fecha)}`),
      oferta.estado === 'Cerrada' && el('p', { class: 'aviso', role: 'note', id: 'ap-cerrada' }, 'Esta oferta está cerrada. Puedes añadir la aplicación igualmente.'),
      ok,
      el('form', { novalidate: true, oninput: marcarCambios, onchange: marcarCambios, onsubmit: ev => { ev.preventDefault(); if (!guardar.disabled) enviar(); } },
        el('div', { class: 'campo-form' }, el('label', { for: 'ap-q' }, 'Alumno'), buscar),
        cuentaLista, lista, avisos,
        f.campo, n.campo, error, guardar, cancelar)),
  ]);
  pintarLista();
  buscar.focus();
}

/* ------------------------------------------------------------------ cambiar el estado */

export async function pintarFormEstado(raiz, id) {
  navegacion.sinGuardar = false;
  const volver = el('a', { class: 'volver', href: '#/aplicacion/' + encodeURIComponent(id) }, 'Aplicación');
  raiz.replaceChildren(cargando());
  let d;
  try { d = await datosRondas(); }
  catch (err) { raiz.replaceChildren(volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarFormEstado(raiz, id); })); return; }
  const a = d.hay ? d.aplicaciones.find(x => x.id === id) : null;
  if (!a) return noEncontrado(raiz, el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas'), 'Aplicación');
  if (!puedeEscribirRondas()) return sinPermiso(raiz, volver);
  const alumno = d.alumnos.find(x => x.id === a.idAlumno);
  const oferta = d.ofertas.find(x => x.id === a.idOferta);

  const hoy = hoyLocal();
  const desde = ultimoMovimiento(a, d.historial);
  let base = null;   // si hay conflicto y se elige "guardar el mío igualmente": cómo está ahora en el Sheet
  const estados = [...(d.listas.estadosAplicacion || [])];
  if (a.estado && !estados.includes(a.estado)) estados.push(a.estado);   // un estado del Sheet que ya no está en Listas: se enseña para no perderlo
  const motivos = [...(d.listas.motivosDescarte || [])];
  if (a.motivo && !motivos.includes(a.motivo)) motivos.push(a.motivo);
  const inicial = { estado: a.estado, motivo: a.estado === ESTADO_DESCARTE ? a.motivo : '', fecha: hoy, nota: '' };

  const selEstado = el('select', { id: 'es-estado', 'aria-label': 'Nuevo estado' }, estados.map(s => el('option', { value: s }, s)));
  selEstado.value = a.estado;
  const selMotivo = el('select', { id: 'es-motivo' }, el('option', { value: '' }, 'Elige…'), motivos.map(m => el('option', { value: m }, m)));
  selMotivo.value = inicial.motivo;
  const cajaMotivo = el('div', { class: 'campo-form', id: 'es-motivo-caja' }, el('label', { for: 'es-motivo' }, 'Motivo del descarte'), selMotivo);
  const f = campoFecha('es-fecha', 'Fecha del cambio', hoy, desde, hoy);
  const n = cuadroNotas('es-nota', 'Nota (opcional)');
  const error = el('p', { class: 'error', role: 'alert', hidden: true });
  const conflicto = el('div', { class: 'conflicto', hidden: true });
  const guardar = el('button', { class: 'primary', type: 'submit' }, 'Guardar');
  const cancelar = el('button', { class: 'secondary', type: 'button', onclick: () => {
    if (navegacion.sinGuardar && !confirm('¿Descartar lo que has escrito?')) return;
    navegacion.sinGuardar = false; ir('#/aplicacion/' + encodeURIComponent(a.id));
  } }, 'Cancelar');

  const leer = () => {
    const estado = selEstado.value;
    return { estado, motivo: estado === ESTADO_DESCARTE ? selMotivo.value : '', fecha: f.input.value, nota: normalizarTexto(n.area.value) };
  };
  const igualQue = (x, y) => x.estado === y.estado && x.motivo === y.motivo && x.fecha === y.fecha && x.nota === y.nota;
  const refrescar = () => { cajaMotivo.hidden = selEstado.value !== ESTADO_DESCARTE; navegacion.sinGuardar = !igualQue(leer(), inicial); };
  const entradaDe = { fecha: f.input, nota: n.area, estado: selEstado, motivo: selMotivo };
  const decir = (t, campo) => { error.textContent = t; error.hidden = !t; if (t && campo) entradaDe[campo]?.focus(); };
  const controles = () => [guardar, cancelar, selEstado, selMotivo, f.input, n.area, ...conflicto.querySelectorAll('button')];
  const terminar = aviso => { navegacion.sinGuardar = false; navegacion.aviso = aviso; ir('#/aplicacion/' + encodeURIComponent(a.id)); };

  const enviar = async (pulsado = guardar) => {
    const v = leer();
    const actual = base || { estado: a.estado, motivo: a.motivo };
    const p = validarCambio(v, { actual, listas: d.listas, hoy, desde });
    if (p) return decir(mensaje(p), p.campo);
    decir('');
    if (pulsado === guardar) conflicto.hidden = true;   // si se pulsó un botón del aviso, ese aviso sigue a la vista mientras trabaja
    const liberar = ocupar(controles(), pulsado);
    try {
      const r = await cambiarEstado(a.id, v, actual);
      terminar(r.sinCambios ? 'Ya estaba así: no se ha cambiado nada.' : `Estado cambiado a «${v.estado}».`);
    } catch (e) {
      liberar();
      if (e.codigo === 'conflicto' && e.extra.aplicacion) return pintarConflicto(e.extra.aplicacion, v);
      if (e.codigo === 'clave') return decir('La clave ya no es correcta. Copia lo que has escrito antes de salir y vuelve a entrar con la clave nueva.');
      if (e.codigo === 'no-encontrado') return decir('Esta aplicación ya no está en el Sheet.');
      decir(mensajeServidor(e) || e.message, e.extra?.campo);
      if (e.codigo === 'red' || e.codigo === 'tiempo') error.append(' Es posible que sí se haya guardado: al pulsar Guardar otra vez, la app lo comprobará. Lo que has escrito sigue aquí.');
    }
  };

  // Otra persona cambió la aplicación: se enseña cómo está ahora y se deja elegir. Nunca se pisa en silencio.
  const pintarConflicto = async (actual, mio) => {
    if (actual.estado === mio.estado && actual.motivo === mio.motivo) {   // ya estaba guardado (p. ej. se cortó la respuesta)
      aplicarAplicacion(actual);
      await recargar().catch(() => {});
      return terminar(`Estado cambiado a «${mio.estado}».`);
    }
    const ahora = actual.estado + (actual.motivo ? ` (${actual.motivo})` : '');
    conflicto.replaceChildren(
      el('h3', {}, 'Alguien cambió esta aplicación'),
      el('p', { class: 'sub' }, 'Ahora está así en el Sheet. Lo que has escrito sigue en el formulario.'),
      el('dl', { class: 'campos' }, el('div', { class: 'campo' }, el('dt', {}, 'Estado actual'), el('dd', {}, ahora))),
      el('button', { class: 'primary', type: 'button', onclick: ev => { base = { estado: actual.estado, motivo: actual.motivo }; enviar(ev.currentTarget); } }, 'Guardar el mío igualmente'),
      el('button', { class: 'secondary', type: 'button', onclick: async ev => {
        ocupar(controles(), ev.currentTarget, 'Cargando…');   // la pantalla se sustituye al terminar
        aplicarAplicacion(actual); await recargar().catch(() => {}); terminar('Se ha cargado lo que había en el Sheet.');
      } }, 'Descartar el mío'));
    conflicto.hidden = false;
    conflicto.scrollIntoView?.({ block: 'nearest' });
  };

  raiz.replaceChildren(
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'es-titulo' },
      el('h2', { id: 'es-titulo' }, 'Cambiar estado'),
      el('p', { class: 'sub' }, [alumno ? nombreAlumno(alumno) : `(alumno ${a.idAlumno})`, oferta?.titulo, oferta?.empresa].filter(Boolean).join(' · ') + ` · Ronda ${a.numeroRonda}`),
      el('p', { class: 'estado-actual' }, 'Ahora: ', insigniaEstado(a.estado), a.estado === ESTADO_DESCARTE && a.motivo ? ` ${a.motivo}` : ''),
      el('form', { novalidate: true, oninput: refrescar, onchange: refrescar, onsubmit: ev => { ev.preventDefault(); if (!guardar.disabled) enviar(); } },
        el('div', { class: 'campo-form' }, el('label', { for: 'es-estado' }, 'Nuevo estado'), selEstado),
        cajaMotivo, f.campo, n.campo, error, conflicto, guardar, cancelar)));
  refrescar();
  navegacion.sinGuardar = false;
  selEstado.focus();
}
