// Avisos de alumnos en pantalla: la tarjeta de Inicio, la lista de cada tipo, la marca en la lista del programa y la tarjeta de la ficha.
// Un aviso nunca bloquea nada: solo informa, dice por qué ha saltado y se puede silenciar 30 días (solo en este móvil).
import { el, svgFlecha, svgAviso, plural, reemplazar } from '../util/dom.js';
import { avatar } from '../util/avatar.js';
import { navegacion } from '../util/navegacion.js';
import { avisoFlotante } from '../util/trabajo.js';
import { nombreAlumno } from '../util/rondas.js';
import { TIPOS, TITULO_TIPO, ETIQUETA_CORTA, calcularAvisos, hoyISO, repartir, silenciadoHasta, fechaCorta, avisosDe, contar, estaSilenciado } from '../util/avisos.js';
import { leerUmbrales, leerSilencios, silenciar, quitarSilencio } from '../util/preferencias.js';
import { datosRondas } from './rondas.js';
import { tarjetaError } from './error-datos.js';
import { recargar, getMasters } from '../data/index.js';
import { contextoDe } from '../util/match.js';

export const TIPOS_VALIDOS = Object.values(TIPOS);

// Todo lo que hace falta para pintar avisos, o null si el Sheet (o la demo) no tiene rondas. Se recalcula cada vez: es barato.
export function estadoAvisos(d, hoy = hoyISO()) {
  if (!d.hay) return null;
  const umbrales = leerUmbrales();
  const { periodo, avisos } = calcularAvisos({ alumnos: d.alumnos, ofertas: d.ofertas, rondas: d.rondas, aplicaciones: d.aplicaciones, hoy, umbrales, contextoMatch: contextoDe(d.listas) });
  const silencios = leerSilencios();
  return { hoy, umbrales, periodo, avisos, silencios, ...repartir(avisos, silencios, hoy) };
}

// Una frase que dice qué periodo se está mirando (para que se entienda de dónde salen los números).
export function textoPeriodo(e) {
  if (!e.periodo) return '';
  const { desde, hasta, ofertas, recortado } = e.periodo;
  return `${recortado ? 'Se revisa desde la primera ronda registrada' : `Se revisan los últimos ${e.umbrales.dias} días`} (del ${fechaCorta(desde)} al ${fechaCorta(hasta)}). En ese tiempo se ${ofertas === 1 ? 'envió 1 oferta' : `enviaron ${ofertas} ofertas`}.`;
}

const alumnosTexto = n => (n === 0 ? 'Ningún alumno' : plural(n, 'alumno', 'alumnos'));

/* ---- Inicio ---- */

// Etiqueta de tipo: icono + palabra. «Datos» = algo está mal en el Sheet (rojo, relleno). «Seguimiento» = algo que mirar con el tiempo (naranja, solo borde).
export const etiquetaTipo = (tipo, texto) => el('span', { class: 'etiqueta-tipo ' + tipo }, svgAviso(tipo), el('span', {}, texto));

// Programas que un alumno tiene pero no están en Listas (o no tienen categoría): son los mismos que van a «Otros programas».
export const programasFuera = masters => masters.filter(m => !m.enLista || !m.categoria);

// Una nota de DATOS suelta (programa fuera de Listas en la lista, la ficha y Otros programas): rojo relleno, icono y la palabra «Datos».
export const notaDatos = (texto, id) => el('p', { class: 'aviso aviso-alerta', role: 'note', id }, svgAviso('datos'), el('span', {}, el('b', {}, 'Datos: '), texto));

// Aviso de DATOS. No se puede silenciar: no depende del tiempo, se arregla en los datos. El alumno sigue en «Otros programas».
function avisoDatos(fuera) {
  const abrirOtros = ev => {
    ev.preventDefault();
    const d = document.querySelector('details.grupo-programas[data-categoria="Otros programas"]');
    if (!d) return;
    d.open = true;
    d.scrollIntoView({ block: 'start' });
    d.querySelector('summary')?.focus({ preventScroll: true });
  };
  return el('div', { class: 'aviso-datos', id: 'in-av-datos', role: 'note' },
    etiquetaTipo('datos', 'Datos'),
    el('ul', { class: 'aviso-datos-lista' }, fuera.map(m => el('li', {},
      `Programa «${m.nombre}» (${plural(m.alumnos, 'alumno', 'alumnos')}) fuera de la lista de programas.`))),
    el('a', { class: 'enlace', id: 'in-av-datos-ver', href: '#/', onclick: abrirOtros }, 'Ver en «Otros programas»'),
    el('p', { class: 'sub aviso-datos-nota' }, 'Este aviso no se puede silenciar. Avisa a quien administra la app: desaparece cuando el programa esté en la lista.'));
}

function contenidoInicio(e, fuera) {
  const fila = tipo => {
    const activos = contar(e.activos, tipo), sil = contar(e.silenciados, tipo);
    return el('li', {}, el('a', { class: 'aviso-fila', id: 'in-av-' + tipo, href: '#/avisos/' + tipo, onclick: () => { navegacion.avisosVolver = 'inicio'; } },
      el('span', { class: 'alumno-texto' },
        el('b', {}, TITULO_TIPO[tipo]),
        el('span', { class: 'sub' }, alumnosTexto(activos) + (sil ? ` · ${plural(sil, 'silenciado', 'silenciados')}` : ''))),
      svgFlecha()));
  };
  return [
    el('h2', { id: 'in-av-titulo' }, 'Avisos'),
    fuera.length > 0 && avisoDatos(fuera),
    e && el('div', { class: 'aviso-seguimiento', id: 'in-av-seguimiento' },
      etiquetaTipo('seguimiento', 'Seguimiento'),
      el('p', { class: 'sub' }, 'Son solo avisos. Toca uno para ver a quién afecta y por qué.'),
      el('ul', { class: 'avisos-resumen', 'aria-label': 'Tipos de aviso' }, TIPOS_VALIDOS.map(fila))),
  ];
}

// Rellena (o vuelve a rellenar) la tarjeta de Inicio. Los avisos de DATOS salen siempre que haya algo que corregir (aunque no haya rondas);
// los de SEGUIMIENTO, solo si hay rondas. Si no hay ninguno, la tarjeta no se enseña. Si algo falla, Inicio sigue igual.
export async function pintarAvisosInicio(caja) {
  if (!caja) return;
  let e = null, fuera = [];
  try { e = estadoAvisos(await datosRondas()); } catch { e = null; }
  try { fuera = programasFuera(await getMasters()); } catch { fuera = []; }
  const hay = !!e || fuera.length > 0;
  caja.hidden = !hay;
  caja.classList.toggle('con-seguimiento', !!e);
  reemplazar(caja, ...(hay ? contenidoInicio(e, fuera) : []));
}

export const cajaAvisosInicio = () => el('section', { class: 'card', id: 'in-avisos', 'aria-labelledby': 'in-av-titulo', hidden: true });

/* ---- Marca en la lista del programa ---- */

// Los avisos activos de cada alumno (para la lista del programa). Si algo falla, no hay marcas: la lista sigue igual.
export async function avisosActivosPorAlumno() {
  try {
    const e = estadoAvisos(await datosRondas());
    if (!e) return () => [];
    return id => avisosDe(e.activos, id);
  } catch { return () => []; }
}
export const etiquetaAviso = avisos => (avisos.length ? 'Aviso: ' + avisos.map(a => ETIQUETA_CORTA[a.tipo]).join(' · ') : '');

/* ---- Una fila con motivo y botón de silenciar ---- */

function bloqueAviso(a, alumno, e, alCambiar, { conEnlace }) {
  const silenciado = estaSilenciado(e.silencios, a.id, e.hoy);
  const nombre = alumno ? nombreAlumno(alumno) : `(alumno ${a.idAlumno}: sin dato)`;
  const boton = silenciado
    ? el('button', { class: 'secondary', type: 'button', 'data-aviso': a.id, 'aria-label': `Quitar el silencio del aviso de ${nombre}`, onclick: () => { quitarSilencio(a.id); alCambiar(`Silencio quitado: ${nombre}.`); } }, 'Quitar silencio')
    : el('button', { class: 'secondary', type: 'button', 'data-aviso': a.id, 'aria-label': `Silenciar 30 días el aviso de ${nombre}`, onclick: () => {
        const hasta = silenciadoHasta(e.hoy);
        if (!silenciar(a.id, hasta)) { avisoFlotante('No se ha podido guardar el silencio en este móvil. ¿Estás en una ventana privada?'); return; }
        alCambiar(`Silenciado hasta el ${fechaCorta(hasta)}: ${nombre}.`);
      } }, 'Silenciar 30 días');
  return [
    conEnlace && alumno && el('a', { class: 'alumno', href: '#/alumno/' + encodeURIComponent(alumno.id), onclick: () => { navegacion.origen = 'avisos'; navegacion.avisosTipo = a.tipo; } },
      avatar(alumno),
      el('span', { class: 'alumno-texto' }, el('b', {}, nombre), el('span', { class: 'sub' }, alumno.master || '')),
      svgFlecha()),
    !conEnlace && el('b', {}, TITULO_TIPO[a.tipo]),
    el('p', { class: 'sub aviso-motivo' }, a.motivo),
    silenciado && el('p', { class: 'sub aviso-silencio' }, `Silenciado hasta el ${fechaCorta(e.silencios[a.id])}.`),
    boton,
  ];
}

/* ---- Pantalla de cada tipo de aviso ---- */

export async function pintarAvisos(raiz, tipo) {
  reemplazar(raiz, el('p', { class: 'estado', role: 'status' }, 'Cargando avisos…'));
  const volver = el('a', { class: 'volver', href: '#/' }, 'Inicio');
  if (!TIPOS_VALIDOS.includes(tipo)) {
    reemplazar(raiz, volver, el('div', { class: 'card' }, el('h2', {}, 'Aviso no encontrado'), el('p', { class: 'sub' }, 'Vuelve al inicio y elige uno.')));
    return;
  }
  let d;
  try { d = await datosRondas(); }
  catch (err) { reemplazar(raiz, volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarAvisos(raiz, tipo); })); return; }
  const e = estadoAvisos(d);
  if (!e) {
    reemplazar(raiz, volver, el('div', { class: 'card' }, el('h2', {}, 'Todavía no hay rondas'), el('p', { class: 'sub' }, 'Aún no hay rondas ni solicitudes para calcular avisos.')));
    return;
  }
  const estado = el('p', { class: 'ok', role: 'status', id: 'av-estado', hidden: true });
  const alumnoDe = id => d.alumnos.find(x => x.id === id);
  const ordenar = lista => lista.map(a => ({ a, al: alumnoDe(a.idAlumno) })).sort((x, y) => (x.al ? nombreAlumno(x.al) : '~').localeCompare(y.al ? nombreAlumno(y.al) : '~', 'es'));
  const delTipo = lista => lista.filter(a => a.tipo === tipo);
  const alCambiar = async mensaje => { await pintarAvisos(raiz, tipo); const s = raiz.querySelector('#av-estado'); s.textContent = mensaje; s.hidden = false; };
  const lista = (items, etiqueta) => el('ul', { class: 'alumnos avisos-lista', 'aria-label': etiqueta },
    ordenar(items).map(({ a, al }) => el('li', { class: 'aviso-item' }, bloqueAviso(a, al, e, alCambiar, { conEnlace: true }))));

  const activos = delTipo(e.activos), silenciados = delTipo(e.silenciados);
  reemplazar(raiz, ...[
    volver,
    etiquetaTipo('seguimiento', 'Seguimiento'),
    el('h2', { class: 'seccion' }, `${TITULO_TIPO[tipo]} · ${alumnosTexto(activos.length).toLowerCase()}`),
    el('p', { class: 'sub', id: 'av-periodo' }, textoPeriodo(e)),
    el('p', { class: 'sub' }, 'Es solo un aviso. Cada alumno indica el motivo.'),
    estado,
    activos.length ? lista(activos, 'Alumnos con este aviso') : el('div', { class: 'card', id: 'av-nadie' }, el('p', { class: 'sub' }, 'Ningún alumno tiene este aviso ahora mismo.')),
    silenciados.length && el('h3', { class: 'sub-titulo', id: 'av-sil-titulo' }, `Silenciados (${silenciados.length})`),
    silenciados.length && lista(silenciados, 'Avisos silenciados'),
    el('p', { class: 'sub' }, 'Puedes cambiar los límites en Ajustes. Los silencios se guardan solo en este móvil.'),
  ].filter(Boolean));
}

/* ---- Ficha del alumno ---- */

export function tarjetaAvisosAlumno(alumno, d) {
  const seccion = el('section', { class: 'card card-seguimiento', id: 'al-avisos', 'aria-labelledby': 'al-av-titulo', hidden: true });
  const pintar = mensaje => {
    const e = estadoAvisos(d);
    const suyos = e ? avisosDe(e.avisos, alumno.id) : [];
    seccion.hidden = !suyos.length;
    if (!suyos.length) { reemplazar(seccion); return; }
    reemplazar(seccion, 
      etiquetaTipo('seguimiento', 'Seguimiento'),
      el('h2', { id: 'al-av-titulo' }, suyos.length === 1 ? 'Aviso' : 'Avisos'),
      el('p', { class: 'sub' }, 'Es solo un aviso.'),
      mensaje && el('p', { class: 'ok', role: 'status', id: 'al-av-estado' }, mensaje),
      ...suyos.map(a => el('div', { class: 'aviso-ficha' }, bloqueAviso(a, alumno, e, pintar, { conEnlace: false }))));
  };
  pintar('');
  return seccion;
}
