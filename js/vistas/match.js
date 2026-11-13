// Tarjetas del match: "Alumnos que encajan" (ficha de la oferta) y "Ofertas que encajan" (ficha del alumno).
// Solo lectura y cálculo. Nadie se oculta: los tres grupos suman todos los alumnos (u ofertas) y cada fila dice por qué.
import { el, svgFlecha, plural } from '../util/dom.js';
import { desplegable } from './desplegable.js';
import { emparejar, ofertasParaAlumno, CATEGORIAS } from '../util/match.js';
import { nombreAlumno } from '../util/rondas.js';
import { navegacion } from '../util/navegacion.js';
import { MAX_PERFILES } from '../util/compartir.js';

const POR_PAGINA = 15;   // filas que se pintan de golpe en cada grupo (con "Ver más")
const SIGNO = { ok: '✓', revisar: '!', no: '✗' };
const PALABRA = { ok: 'Cumple', revisar: 'Revisar', no: 'No cumple' };
const NOTA = 'Es una ayuda para mirar, no una decisión: nadie queda fuera de la lista y cada fila dice por qué.';

// Los criterios de una fila: el símbolo y la palabra van siempre en texto (el color nunca es lo único que lo dice).
function porQue(criterios) {
  return desplegable({ class: 'porque' },
    el('summary', {}, 'Por qué'),
    el('ul', { class: 'criterios' }, criterios.map(c => el('li', { class: 'crit ' + c.estado },
      el('span', { class: 'crit-signo', 'aria-hidden': 'true' }, SIGNO[c.estado]),
      el('span', {}, el('b', {}, PALABRA[c.estado] + ': '), c.texto)))));
}

// Una línea corta para la fila: lo primero que hay que saber (lo que no encaja o hay que revisar, y si no, el área).
function resumen(r) {
  const malo = r.criterios.find(c => c.estado === 'no') || r.criterios.find(c => c.estado === 'revisar');
  return (malo || r.criterios[0]).texto;
}

// Los tres grupos. "fila(r)" pinta cada elemento; "vacio" es lo que se dice cuando no hay nadie en el grupo.
function grupos(resultados, fila, nombreItem, extra = () => {}) {
  const porCategoria = c => resultados.filter(r => r.categoria === c);
  return ['encaja', 'reservas', 'no'].map(c => {
    const items = porCategoria(c);
    const lista = el('ul', { class: 'alumnos match-lista', 'aria-label': CATEGORIAS[c] });
    let pintadas = 0;
    const mas = el('button', { class: 'secondary', type: 'button', onclick: () => pintar() });
    const pintar = () => {
      for (const r of items.slice(pintadas, pintadas + POR_PAGINA)) lista.append(fila(r));
      pintadas = Math.min(items.length, pintadas + POR_PAGINA);
      const quedan = items.length - pintadas;
      mas.hidden = quedan === 0;
      mas.textContent = `Ver ${quedan > POR_PAGINA ? POR_PAGINA : quedan} más (quedan ${quedan})`;
      extra();
    };
    pintar();
    return desplegable({ class: 'grupo-match ' + c, open: c !== 'no' && items.length > 0, 'data-grupo': c },
      el('summary', {}, `${CATEGORIAS[c]} (${items.length})`),
      items.length ? [lista, mas] : el('p', { class: 'sub' }, `Ningún ${nombreItem} en este grupo.`));
  });
}

/* ---- Ficha de la oferta: alumnos que encajan ---- */

export function tarjetaAlumnosQueEncajan(oferta, d) {
  const res = emparejar(d.alumnos, oferta);
  const yaTiene = new Set(d.aplicaciones.filter(a => a.idOferta === oferta.id).map(a => a.idAlumno));

  // Alumnos marcados para compartir su perfil (solo en memoria; al cambiar de oferta se empieza de cero).
  const sel = new Set(navegacion.compartir?.idOferta === oferta.id ? navegacion.compartir.ids.filter(id => d.alumnos.some(a => a.id === id)) : []);
  let tarjeta = null;
  const cuenta = el('p', { class: 'sub', id: 'cp-cuenta', role: 'status', 'aria-live': 'polite' });
  const boton = el('button', { class: 'primary', type: 'button', id: 'cp-ir', onclick: () => { location.hash = `#/oferta/${encodeURIComponent(oferta.id)}/compartir`; } }, 'Compartir perfiles');
  const actualizar = () => {
    navegacion.compartir = { idOferta: oferta.id, ids: [...sel] };
    cuenta.textContent = sel.size ? `${plural(sel.size, 'alumno elegido', 'alumnos elegidos')} para compartir (máximo ${MAX_PERFILES}).` : `Marca a quien quieras para compartir su perfil (máximo ${MAX_PERFILES}).`;
    boton.disabled = sel.size === 0;
    boton.textContent = sel.size ? `Compartir perfiles (${sel.size})` : 'Compartir perfiles';
    for (const i of tarjeta?.querySelectorAll('input.cp-sel') || []) i.disabled = sel.size >= MAX_PERFILES && !i.checked;
  };
  const casilla = a => {
    const i = el('input', { type: 'checkbox', class: 'cp-sel', id: 'cp-sel-' + a.id, 'aria-label': 'Elegir a ' + nombreAlumno(a) + ' para compartir su perfil',
      onchange: () => { if (i.checked) sel.add(a.id); else sel.delete(a.id); actualizar(); } });
    i.checked = sel.has(a.id);
    i.disabled = sel.size >= MAX_PERFILES && !i.checked;
    return el('label', { class: 'sel-compartir' }, i);
  };

  const fila = r => {
    const a = r.alumno;
    return el('li', { class: 'fila-match' },
      casilla(a),
      el('div', { class: 'fila-match-cuerpo' },
        el('a', { class: 'alumno oferta', href: '#/alumno/' + encodeURIComponent(a.id) },
          el('span', { class: 'alumno-texto' },
            el('b', {}, nombreAlumno(a)),
            el('span', { class: 'sub' }, [a.master, yaTiene.has(a.id) && 'ya tiene solicitud en esta oferta'].filter(Boolean).join(' · ')),
            el('span', { class: 'sub' }, resumen(r))),
          svgFlecha()),
        porQue(r.criterios)));
  };
  tarjeta = el('section', { class: 'card', id: 'match-alumnos', 'aria-labelledby': 'match-titulo' },
    el('h2', { id: 'match-titulo' }, 'Alumnos que encajan'),
    el('p', { class: 'sub' }, `${plural(d.alumnos.length, 'alumno', 'alumnos')}, ordenados por cómo encajan con esta oferta. ${NOTA}`),
    el('div', { class: 'compartir-barra' }, cuenta, boton),
    grupos(res, fila, 'alumno', actualizar));
  actualizar();
  return tarjeta;
}

/* ---- Ficha del alumno: ofertas que encajan ---- */

export function tarjetaOfertasQueEncajan(alumno, d) {
  if (!d.ofertas.length) return null;
  const res = ofertasParaAlumno(d.ofertas, alumno);
  const fila = r => {
    const o = r.oferta;
    return el('li', { class: 'fila-match' }, el('div', { class: 'fila-match-cuerpo' },
      el('a', { class: 'alumno oferta', href: '#/oferta/' + encodeURIComponent(o.id) },
        el('span', { class: 'alumno-texto' },
          el('b', {}, o.titulo || '(sin título)'),
          el('span', { class: 'sub' }, [o.empresa, o.estado === 'Cerrada' && 'cerrada'].filter(Boolean).join(' · ')),
          el('span', { class: 'sub' }, resumen(r))),
        svgFlecha()),
      porQue(r.criterios)));
  };
  return el('section', { class: 'card', id: 'match-ofertas', 'aria-labelledby': 'match-of-titulo' },
    el('h2', { id: 'match-of-titulo' }, 'Ofertas que encajan'),
    el('p', { class: 'sub' }, `${plural(d.ofertas.length, 'oferta', 'ofertas')}, ordenadas por cómo encajan con este alumno. ${NOTA}`),
    grupos(res, fila, 'oferta'));
}
