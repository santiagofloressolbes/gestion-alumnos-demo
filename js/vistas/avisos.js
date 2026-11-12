// Avisos de alumnos en pantalla: la tarjeta de Inicio, la lista de cada tipo, la marca en la lista del máster y la tarjeta de la ficha.
// Un aviso nunca bloquea nada: solo informa, dice por qué ha saltado y se puede silenciar 30 días (solo en este móvil).
import { el, svgFlecha, plural } from '../util/dom.js';
import { avatar } from '../util/avatar.js';
import { navegacion } from '../util/navegacion.js';
import { avisoFlotante } from '../util/trabajo.js';
import { nombreAlumno } from '../util/rondas.js';
import { TIPOS, TITULO_TIPO, calcularAvisos, hoyISO, repartir, silenciadoHasta, fechaCorta, avisosDe, contar, estaSilenciado } from '../util/avisos.js';
import { leerUmbrales, leerSilencios, silenciar, quitarSilencio } from '../util/preferencias.js';
import { datosRondas } from './rondas.js';
import { tarjetaError } from './error-datos.js';
import { recargar } from '../data/index.js';

export const TIPOS_VALIDOS = Object.values(TIPOS);

// Todo lo que hace falta para pintar avisos, o null si el Sheet (o la demo) no tiene rondas. Se recalcula cada vez: es barato.
export function estadoAvisos(d, hoy = hoyISO()) {
  if (!d.hay) return null;
  const umbrales = leerUmbrales();
  const { periodo, avisos } = calcularAvisos({ alumnos: d.alumnos, ofertas: d.ofertas, rondas: d.rondas, aplicaciones: d.aplicaciones, hoy, umbrales });
  const silencios = leerSilencios();
  return { hoy, umbrales, periodo, avisos, silencios, ...repartir(avisos, silencios, hoy) };
}

// Una frase que dice qué periodo se está mirando (para que se entienda de dónde salen los números).
export function textoPeriodo(e) {
  if (!e.periodo) return '';
  const { desde, hasta, ofertas, recortado } = e.periodo;
  return `Se mira del ${fechaCorta(desde)} al ${fechaCorta(hasta)}${recortado ? ' (desde la primera ronda registrada)' : ` (${e.umbrales.dias} días)`}. En ese tiempo se ${ofertas === 1 ? 'difundió 1 oferta' : `difundieron ${ofertas} ofertas`}.`;
}

const alumnosTexto = n => (n === 0 ? 'Ningún alumno' : plural(n, 'alumno', 'alumnos'));

/* ---- Inicio ---- */

function contenidoInicio(e) {
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
    el('p', { class: 'sub' }, 'Solo informan: no bloquean nada. Toca uno para ver a quién afecta y por qué.'),
    el('ul', { class: 'avisos-resumen', 'aria-label': 'Tipos de aviso' }, TIPOS_VALIDOS.map(fila)),
  ];
}

// Rellena (o vuelve a rellenar) la tarjeta de Inicio. Si no hay rondas o algo falla, la tarjeta no se enseña: Inicio sigue funcionando.
export async function pintarAvisosInicio(caja) {
  if (!caja) return;
  let e = null;
  try { e = estadoAvisos(await datosRondas()); } catch { e = null; }
  caja.hidden = !e;
  caja.replaceChildren(...(e ? contenidoInicio(e) : []));
}

export const cajaAvisosInicio = () => el('section', { class: 'card', id: 'in-avisos', 'aria-labelledby': 'in-av-titulo', hidden: true });

/* ---- Marca en la lista del máster ---- */

// Los avisos activos de cada alumno (para la lista del máster). Si algo falla, no hay marcas: la lista sigue igual.
export async function avisosActivosPorAlumno() {
  try {
    const e = estadoAvisos(await datosRondas());
    if (!e) return () => [];
    return id => avisosDe(e.activos, id);
  } catch { return () => []; }
}
export const etiquetaAviso = avisos => (avisos.length ? 'Aviso: ' + avisos.map(a => TITULO_TIPO[a.tipo].toLowerCase()).join(' · ') : '');

/* ---- Una fila con motivo y botón de silenciar ---- */

function bloqueAviso(a, alumno, e, alCambiar, { conEnlace }) {
  const silenciado = estaSilenciado(e.silencios, a.id, e.hoy);
  const nombre = alumno ? nombreAlumno(alumno) : `(alumno ${a.idAlumno}, ya no está en el Sheet)`;
  const boton = silenciado
    ? el('button', { class: 'secondary', type: 'button', 'data-aviso': a.id, 'aria-label': `Quitar el silencio del aviso de ${nombre}`, onclick: () => { quitarSilencio(a.id); alCambiar(`Silencio quitado: ${nombre}.`); } }, 'Quitar silencio')
    : el('button', { class: 'secondary', type: 'button', 'data-aviso': a.id, 'aria-label': `Silenciar 30 días el aviso de ${nombre}`, onclick: () => {
        const hasta = silenciadoHasta(e.hoy);
        if (!silenciar(a.id, hasta)) { avisoFlotante('No se ha podido guardar el silencio en este móvil (¿navegación privada?).'); return; }
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
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando avisos…'));
  const volver = el('a', { class: 'volver', href: '#/' }, 'Inicio');
  if (!TIPOS_VALIDOS.includes(tipo)) {
    raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, 'Aviso no encontrado'), el('p', { class: 'sub' }, 'Vuelve al inicio y elige uno.')));
    return;
  }
  let d;
  try { d = await datosRondas(); }
  catch (err) { raiz.replaceChildren(volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarAvisos(raiz, tipo); })); return; }
  const e = estadoAvisos(d);
  if (!e) {
    raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, 'Sin datos de rondas'), el('p', { class: 'sub' }, 'Los avisos se calculan con las rondas y las solicitudes, y todavía no hay.')));
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
  raiz.replaceChildren(...[
    volver,
    el('h2', { class: 'seccion' }, `${TITULO_TIPO[tipo]} · ${alumnosTexto(activos.length).toLowerCase()}`),
    el('p', { class: 'sub', id: 'av-periodo' }, textoPeriodo(e)),
    el('p', { class: 'sub' }, 'Solo es un aviso: no bloquea nada. Cada alumno dice por qué ha saltado.'),
    estado,
    activos.length ? lista(activos, 'Alumnos con este aviso') : el('div', { class: 'card', id: 'av-nadie' }, el('p', { class: 'sub' }, 'Ningún alumno tiene este aviso ahora mismo.')),
    silenciados.length && el('h3', { class: 'sub-titulo', id: 'av-sil-titulo' }, `Silenciados (${silenciados.length})`),
    silenciados.length && lista(silenciados, 'Avisos silenciados'),
    el('p', { class: 'sub' }, 'Los umbrales se cambian en Ajustes. Los silencios se guardan solo en este móvil.'),
  ].filter(Boolean));
}

/* ---- Ficha del alumno ---- */

export function tarjetaAvisosAlumno(alumno, d) {
  const seccion = el('section', { class: 'card', id: 'al-avisos', 'aria-labelledby': 'al-av-titulo', hidden: true });
  const pintar = mensaje => {
    const e = estadoAvisos(d);
    const suyos = e ? avisosDe(e.avisos, alumno.id) : [];
    seccion.hidden = !suyos.length;
    if (!suyos.length) { seccion.replaceChildren(); return; }
    seccion.replaceChildren(
      el('h2', { id: 'al-av-titulo' }, suyos.length === 1 ? 'Aviso' : 'Avisos'),
      el('p', { class: 'sub' }, 'Solo informa: no bloquea nada.'),
      mensaje && el('p', { class: 'ok', role: 'status', id: 'al-av-estado' }, mensaje),
      ...suyos.map(a => el('div', { class: 'aviso-ficha' }, bloqueAviso(a, alumno, e, pintar, { conEnlace: false }))));
  };
  pintar('');
  return seccion;
}
