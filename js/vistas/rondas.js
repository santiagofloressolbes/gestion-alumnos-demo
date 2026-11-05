// Rondas de difusión y aplicaciones, solo lectura: el apartado de la ficha de la oferta, el del alumno y el detalle de una aplicación.
import { getAlumnos, getOfertas, getListas, getRondas, getAplicaciones, getHistorial, hayRondas, recargar, getEstadoFuente, puedeEscribirRondas, estadoEscrituraRondas } from '../data/index.js';
import { navegacion } from '../util/navegacion.js';
import { el, svgFlecha, plural } from '../util/dom.js';
import { rondasDeOferta, aplicacionesDeRonda, aplicacionesDeAlumno, resumenEstados, historialDe, nombreAlumno, claseEstado, ESTADO_DESCARTE } from '../util/rondas.js';
import { fechaLarga } from './entrevista.js';
import { tarjetaError } from './error-datos.js';

export const insigniaEstado = estado => el('span', { class: 'insignia' + claseEstado(estado) }, estado || 'Sin estado');

// Lo que hace falta para pintar rondas: todo sale de la misma carga de datos.
export async function datosRondas() {
  const [alumnos, ofertas, listas, rondas, aplicaciones, historial, hay] =
    await Promise.all([getAlumnos(), getOfertas(), getListas(), getRondas(), getAplicaciones(), getHistorial(), hayRondas()]);
  return { alumnos, ofertas, listas, rondas, aplicaciones, historial, hay };
}

// Por qué no hay botones de rondas (null = sí los hay, o es la demo, que ya tiene su banner).
export function notaSinEscritura() {
  const e = getEstadoFuente();
  if (e.modo !== 'script' || !e.puedeEscribir || puedeEscribirRondas()) return null;
  return el('p', { class: 'aviso', role: 'note' }, e.conRondas
    ? 'No se pueden guardar rondas ni solicitudes: el script de Google es de una versión anterior. Actualiza Code.gs con la guía («Actualizar a la versión con rondas y solicitudes»).'
    : 'No se pueden guardar rondas ni solicitudes: en el Sheet todavía no están las hojas Rondas, Aplicaciones e Historial. Créalas con la guía («Actualizar a la versión con rondas y solicitudes»).');
}

const mover = origen => () => { navegacion.origenAplicacion = origen; };

// Una fila de aplicación: "alumno" (en la ficha de la oferta) o "oferta" (en la ficha del alumno).
function filaAplicacion(a, d, desde) {
  const alumno = d.alumnos.find(x => x.id === a.idAlumno);
  const oferta = d.ofertas.find(x => x.id === a.idOferta);
  const titulo = desde === 'oferta'
    ? (alumno ? nombreAlumno(alumno) : `(alumno ${a.idAlumno}, ya no está en el Sheet)`)
    : (oferta ? (oferta.titulo || '(sin título)') : `(oferta ${a.idOferta}, ya no está en el Sheet)`);
  const sub = desde === 'oferta' ? '' : [oferta?.empresa, 'Ronda ' + a.numeroRonda].filter(Boolean).join(' · ');
  return el('li', {}, el('a', { class: 'alumno oferta', href: '#/aplicacion/' + encodeURIComponent(a.id), onclick: mover(desde) },
    el('span', { class: 'alumno-texto' },
      el('b', {}, titulo),
      sub && el('span', { class: 'sub' }, sub),
      el('span', { class: 'oferta-pie' }, insigniaEstado(a.estado),
        a.estado === ESTADO_DESCARTE && a.motivo && el('span', { class: 'sub' }, a.motivo),
        a.fecha && el('span', { class: 'sub' }, fechaLarga(a.fecha)))),
    svgFlecha()));
}

/* ---- Ficha de la oferta: sus rondas ---- */

export function seccionesRondas(oferta, d) {
  const nota = notaSinEscritura();
  if (!d.hay) return [nota && el('section', { class: 'card', 'aria-label': 'Rondas' }, el('h2', {}, 'Rondas'), nota)].filter(Boolean);

  const rondas = rondasDeOferta(d.rondas, oferta.id);
  const puede = puedeEscribirRondas();
  const cerrada = oferta.estado === 'Cerrada';
  const enlaceNueva = puede && el('a', { class: 'primary', id: 'ro-nueva', href: `#/oferta/${encodeURIComponent(oferta.id)}/ronda/nueva` }, 'Registrar nueva ronda');
  const avisoCerrada = puede && cerrada && el('p', { class: 'aviso', role: 'note', id: 'ro-cerrada' }, 'Esta oferta está cerrada, pero aún puedes registrar rondas y solicitudes.');

  const tarjetas = rondas.map(r => {
    const apps = aplicacionesDeRonda(d.aplicaciones, oferta.id, r.numero);
    const resumen = resumenEstados(apps, d.listas.estadosAplicacion || []);
    return el('section', { class: 'card ronda', 'aria-label': 'Ronda ' + r.numero },
      el('h2', {}, 'Ronda ' + r.numero),
      el('p', { class: 'sub' }, [r.fecha && 'Enviada el ' + fechaLarga(r.fecha), plural(apps.length, 'solicitud', 'solicitudes')].filter(Boolean).join(' · ')),
      resumen.length > 0 && el('div', { class: 'chips resumen' }, resumen.map(x => el('span', { class: 'chip' }, `${x.estado}: ${x.n}`))),
      apps.length
        ? el('ul', { class: 'alumnos', 'aria-label': 'Solicitudes de la ronda ' + r.numero }, apps.map(a => filaAplicacion(a, d, 'oferta')))
        : el('p', { class: 'sub' }, 'Aún no hay solicitudes.'),
      puede && el('a', { class: 'secondary', href: `#/oferta/${encodeURIComponent(oferta.id)}/ronda/${encodeURIComponent(r.numero)}/aplicar` }, 'Añadir solicitud'));
  });

  return [
    nota && el('section', { class: 'card', 'aria-label': 'Rondas' }, el('h2', {}, 'Rondas'), nota),
    ...(tarjetas.length ? tarjetas : [el('section', { class: 'card', 'aria-label': 'Rondas' },
      el('h2', {}, 'Rondas'),
      el('p', { class: 'sub' }, 'Esta oferta todavía no se ha enviado a los alumnos.'))]),
    avisoCerrada,
    enlaceNueva,
  ].filter(Boolean);
}

/* ---- Ficha del alumno: sus aplicaciones ---- */

export function tarjetaAplicaciones(alumno, d) {
  if (!d.hay) return null;
  const apps = aplicacionesDeAlumno(d.aplicaciones, alumno.id);
  return el('section', { class: 'card', 'aria-label': 'Solicitudes' },
    el('h2', {}, 'Solicitudes'),
    apps.length
      ? [el('p', { class: 'sub' }, plural(apps.length, 'solicitud', 'solicitudes')),
         el('ul', { class: 'alumnos', 'aria-label': 'Solicitudes del alumno' }, apps.map(a => filaAplicacion(a, d, 'alumno')))]
      : el('p', { class: 'sub' }, 'Todavía no tiene solicitudes.'));
}

/* ---- Detalle de una aplicación ---- */

function campo(etiqueta, valor, { texto = false, vacio = 'No indicado' } = {}) {
  return el('div', { class: 'campo' }, el('dt', {}, etiqueta), el('dd', { class: (valor ? '' : 'vacio ') + (texto ? 'largo' : '') }, valor || vacio));
}

export async function pintarAplicacion(raiz, id) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando solicitud…'));
  let d;
  try { d = await datosRondas(); }
  catch (err) {
    raiz.replaceChildren(el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas'), tarjetaError(err, () => { recargar().catch(() => {}); pintarAplicacion(raiz, id); }));
    return;
  }
  const a = d.hay ? d.aplicaciones.find(x => x.id === id) : null;
  if (!a) {
    raiz.replaceChildren(el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas'), el('div', { class: 'card' },
      el('h2', {}, 'Solicitud no encontrada'), el('p', { class: 'sub' }, 'Vuelve a las ofertas y elige otra.')));
    return;
  }
  const alumno = d.alumnos.find(x => x.id === a.idAlumno);
  const oferta = d.ofertas.find(x => x.id === a.idOferta);
  const ronda = d.rondas.find(r => r.idOferta === a.idOferta && Number(r.numero) === Number(a.numeroRonda));
  const historial = historialDe(d.historial, a.id).reverse();   // lo último, arriba
  const aviso = navegacion.aviso; navegacion.aviso = '';
  const volver = navegacion.origenAplicacion === 'alumno' && alumno
    ? el('a', { class: 'volver', href: '#/alumno/' + encodeURIComponent(alumno.id) }, nombreAlumno(alumno))
    : el('a', { class: 'volver', href: oferta ? '#/oferta/' + encodeURIComponent(oferta.id) : '#/ofertas' }, oferta ? 'Oferta' : 'Ofertas');
  const nombreAl = alumno ? nombreAlumno(alumno) : `(alumno ${a.idAlumno}, ya no está en el Sheet)`;
  const nombreOf = oferta ? [oferta.titulo || '(sin título)', oferta.empresa].filter(Boolean).join(' · ') : `(oferta ${a.idOferta}, ya no está en el Sheet)`;

  raiz.replaceChildren(...[
    volver,
    aviso && el('p', { class: 'ok aviso-ok', role: 'status' }, aviso),
    el('section', { class: 'card cabecera cabecera-oferta', 'aria-label': 'Solicitud' },
      el('h2', { class: 'nombre' }, nombreAl),
      el('p', { class: 'sub' }, nombreOf),
      el('div', { class: 'chips' }, insigniaEstado(a.estado), el('span', { class: 'chip' }, 'Ronda ' + a.numeroRonda)),
      puedeEscribirRondas() && el('a', { class: 'primary', id: 'ap-estado', href: `#/aplicacion/${encodeURIComponent(a.id)}/estado` }, 'Cambiar estado')),

    el('section', { class: 'card', 'aria-label': 'Datos' },
      el('h2', {}, 'La solicitud'),
      el('dl', { class: 'campos' },
        campo('Alumno', nombreAl),
        campo('Oferta', nombreOf),
        campo('Ronda', ronda ? `Ronda ${a.numeroRonda}, enviada el ${fechaLarga(ronda.fecha)}` : 'Ronda ' + a.numeroRonda),
        campo('Solicitada el', fechaLarga(a.fecha)),
        campo('Estado', a.estado),
        a.estado === ESTADO_DESCARTE && campo('Motivo del descarte', a.motivo),
        campo('Notas', a.notas, { texto: true, vacio: 'Sin notas' }),
        campo('Número de solicitud', a.id)),
      alumno && el('a', { class: 'secondary', href: '#/alumno/' + encodeURIComponent(alumno.id) }, 'Ver ficha del alumno'),
      oferta && el('a', { class: 'secondary', href: '#/oferta/' + encodeURIComponent(oferta.id) }, 'Ver la oferta')),

    el('section', { class: 'card', 'aria-label': 'Historial' },
      el('h2', {}, 'Historial'),
      historial.length
        ? el('ol', { class: 'historial' }, historial.map(h => el('li', {},
            el('b', {}, h.estadoAnterior ? `${h.estadoAnterior} → ${h.estadoNuevo}` : h.estadoNuevo + ' (solicitud registrada)'),
            el('span', { class: 'sub' }, [fechaLarga(h.fecha), h.motivo && 'Motivo: ' + h.motivo].filter(Boolean).join(' · ')),
            h.nota && el('span', { class: 'nota-historial' }, h.nota))))
        : el('p', { class: 'sub' }, 'Todavía no hay cambios de estado.')),
  ].filter(Boolean));
}
