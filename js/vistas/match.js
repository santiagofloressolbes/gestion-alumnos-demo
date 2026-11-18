// Tarjetas del match: "Alumnos que encajan" (ficha de la oferta) y "Ofertas que encajan" (ficha del alumno).
// Solo lectura y cálculo. Nadie se oculta: los tres grupos suman todos los alumnos (u ofertas) y cada fila dice por qué.
import { el, svgFlecha, plural } from '../util/dom.js';
import { desplegable } from './desplegable.js';
import { emparejar, ofertasParaAlumno, contextoDe, CATEGORIAS, NUCLEO } from '../util/match.js';
import { nombreAlumno, claseEstado, solicitantesDeOferta } from '../util/rondas.js';
import { navegacion } from '../util/navegacion.js';
import { MAX_PERFILES } from '../util/compartir.js';

const POR_PAGINA = 15;   // filas que se pintan de golpe en cada grupo (con "Ver más")
const NOTA = 'Cada fila dice por qué.';
// Aviso fijo: el match orienta y ordena; si alguien puede trabajar o no lo decide siempre una persona.
export const AVISO_ORIENTATIVO = 'Es una ayuda, no una decisión. Nadie queda fuera de la lista. La decisión sobre si puede trabajar en una oferta la toma siempre una persona.';
const TITULO = { area: 'Área', subarea: 'Subárea', etiquetas: 'Habilidades', idiomas: 'Idiomas', nivel: 'Formación', tipo: 'Prácticas o empleo', nacionalidad: 'Nacionalidad', permiso: 'Permiso de trabajo' };

// Cómo se dice cada criterio: el símbolo y la palabra van siempre en texto (el color nunca es lo único que lo dice).
// «Sin dato» = falta el dato: se ve como «a revisar», pero no suma puntos ni cuenta como «no cumple». «No aplica» = la oferta no pide eso.
function rotulo(c) {
  if (c.noAplica) return { signo: '–', palabra: 'No aplica', clase: 'na' };
  if (c.sinDatos) return { signo: '?', palabra: 'Sin dato', clase: 'revisar sin-datos' };
  return { signo: { ok: '✓', revisar: '!', no: '✗' }[c.estado], palabra: { ok: 'Cumple', revisar: 'Revisar', no: 'No coincide' }[c.estado], clase: c.estado };
}
const num = n => String(Math.round(n * 10) / 10).replace('.', ',');
const puntosDe = c => (c.noAplica ? 'no cuenta' : c.sinDatos ? 'no suma' : `${num(c.peso * c.factor)} de ${c.peso} puntos`);

// La línea de la puntuación de una fila: «Encaje 82 %» y, si faltan datos, «datos incompletos».
// En «No encaja» (v28) se llama «Afinidad» y va en gris: el % no dice si la persona puede ocupar la oferta, solo cuánto se parece su perfil.
export function textoPuntuacion(p, categoria) {
  if (p.porcentaje == null) return 'Sin puntuación: faltan datos' + (p.incompleto ? ' · datos incompletos' : '');
  return `${categoria === 'no' ? 'Afinidad' : 'Encaje'} ${p.porcentaje} %` + (p.incompleto ? ' · datos incompletos' : '');
}

// Aviso corto dentro de cada «Por qué» (el aviso completo está arriba, en la tarjeta): la decisión sobre si se puede trabajar la toma siempre una persona.
export const AVISO_CORTO = 'Orientativo: comprueba la situación real.';

// Un texto largo se acorta con «ver más» (y «ver menos»). Solo se usa donde el texto puede ser muy largo (la razón de nacionalidad y de permiso).
const MAX_TEXTO = 110;
function conVerMas(texto, max = MAX_TEXTO) {
  if (texto.length <= max) return el('span', {}, texto);
  const corto = texto.slice(0, max).replace(/\s+\S*$/, '') + '…';
  const cuerpo = el('span', { class: 'texto-largo' }, corto);
  const boton = el('button', { class: 'ver-mas', type: 'button', 'aria-expanded': 'false', onclick: () => {
    const abierto = boton.getAttribute('aria-expanded') === 'true';
    cuerpo.textContent = abierto ? corto : texto;
    boton.textContent = abierto ? 'ver más' : 'ver menos';
    boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
  } }, 'ver más');
  return el('span', {}, cuerpo, ' ', boton);
}

function porQue(r) {
  const p = r.puntuacion;
  // Sin repetir el «Encaje 81 %» de la fila: aquí solo los puntos y cuántos criterios tenían datos.
  const puntos = p.porcentaje == null
    ? 'Sin puntuación: no hay dato en ningún criterio.'
    : `${num(p.puntos)} de ${p.maximo} puntos con ${p.evaluados === 1 ? '1 criterio' : `${p.evaluados} criterios`}.`
      + (p.incompleto ? ` ${p.sinDatos === 1 ? '1 criterio sin dato: ni suma ni resta' : `${p.sinDatos} criterios sin dato: ni suman ni restan`}.` : '');
  return desplegable({ class: 'porque' },
    el('summary', {}, 'Por qué'),
    el('p', { class: 'sub porque-punt' }, puntos),
    el('ul', { class: 'criterios' }, r.criterios.map(c => {
      const t = rotulo(c);
      const migratorio = c.id === 'nacionalidad' || c.id === 'permiso';
      return el('li', { class: 'crit ' + t.clase, 'data-criterio': c.id },
        el('span', { class: 'crit-signo', 'aria-hidden': 'true' }, t.signo),
        el('span', { class: 'crit-texto' }, el('b', {}, `${TITULO[c.id]} · ${t.palabra}: `), migratorio ? conVerMas(c.texto) : c.texto, el('span', { class: 'crit-puntos' }, ` (${puntosDe(c)})`)));
    })),
    el('p', { class: 'sub porque-aviso' }, AVISO_CORTO));
}

// El criterio que decide el grupo (o, en «Encaja», el primero que cuenta).
// Primero lo que decide el grupo (un «no» en área, tipo, nacionalidad o permiso); después lo que hay que verificar de nacionalidad y permiso
// (lo legal se ve siempre arriba); después cualquier otro «no», lo que hay que revisar, lo que no tiene datos, y si no, el primer criterio que cuenta.
export function criterioDecisivo(r) {
  const c = r.criterios, legal = x => x.grupo === 'requisito' && x.estado !== 'ok';
  const malo = c.find(x => x.estado === 'no' && NUCLEO.includes(x.id)) || c.find(x => legal(x) && !x.sinDatos) || c.find(legal) || c.find(x => x.estado === 'no')
    || c.find(x => x.estado === 'revisar' && !x.sinDatos) || c.find(x => x.estado === 'revisar');
  return malo || c.find(x => !x.noAplica) || c[0];
}

// Los criterios que fallan, con nombre corto, para la línea de la fila (v28).
//   «No encaja»: los «no» de área, tipo, nacionalidad y permiso (los que deciden el grupo).
//   «Encaja con reservas»: los «no» (de perfil) y lo que hay que revisar (incluye lo que no tiene datos).
// v29: un solo nombre por criterio: el de la fila sale del mismo que el del detalle («Por qué»), en minúscula («Permiso de trabajo» se abrevia a «permiso»).
const NOMBRE_CORTO = Object.fromEntries(Object.entries(TITULO).map(([id, t]) => [id, id === 'permiso' ? 'permiso' : t.toLowerCase()]));
export function criteriosQueFallan(r) {
  const c = r.criterios.filter(x => !x.noAplica);
  if (r.categoria === 'no') return { no: c.filter(x => x.estado === 'no' && NUCLEO.includes(x.id)), revisar: [] };
  if (r.categoria === 'reservas') return { no: c.filter(x => x.estado === 'no'), revisar: c.filter(x => x.estado === 'revisar') };
  return { no: [], revisar: [] };
}
const nombres = lista => lista.map(x => NOMBRE_CORTO[x.id]).join(', ');

// La línea corta de la fila. Con varios fallos: «✗ No coincide: prácticas o empleo, nacionalidad, permiso · ! Revisar: idiomas».
// Con uno solo (o en «Encaja»): «✗ Área · No coincide» y el comienzo de la razón. El detalle completo está en «Por qué».
const MAX_MOTIVO = 70;
function motivo(r) {
  const f = criteriosQueFallan(r);
  if (f.no.length + f.revisar.length > 1) {
    const todos = [...f.no, ...f.revisar];
    return el('span', { class: 'sub motivo ' + (f.no.length ? 'no' : 'revisar'), 'data-criterio': criterioDecisivo(r).id, 'data-criterios': todos.map(x => x.id).join(' ') },
      f.no.length > 0 && el('b', { class: 'm-no' }, `✗ No coincide: ${nombres(f.no)}`),
      f.no.length > 0 && f.revisar.length > 0 && ' · ',
      f.revisar.length > 0 && el('b', { class: 'm-revisar' }, `! Revisar: ${nombres(f.revisar)}`));
  }
  const c = criterioDecisivo(r), t = rotulo(c);
  const corto = c.texto.length <= MAX_MOTIVO ? c.texto : c.texto.slice(0, MAX_MOTIVO).replace(/\s+\S*$/, '') + '…';
  return el('span', { class: 'sub motivo ' + t.clase, 'data-criterio': c.id },
    el('b', {}, `${t.signo} ${TITULO[c.id]} · ${t.palabra}`), ` ${corto}`);
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
      mas.textContent = `Ver ${quedan > POR_PAGINA ? POR_PAGINA : quedan} más`;
      extra();
    };
    pintar();
    return desplegable({ class: 'grupo-match ' + c, open: c !== 'no' && items.length > 0, 'data-grupo': c },
      el('summary', {}, `${CATEGORIAS[c]} (${items.length})`),
      items.length ? [lista, mas] : el('p', { class: 'sub' }, `Ningún ${nombreItem} en este grupo.`));
  });
}

/* ---- Ficha de la oferta: alumnos que encajan ---- */

// Avisos del principio de la tarjeta: el aviso fijo y, si alguna fila de las hojas de reglas no se entiende, cuáles.
function avisosDeTarjeta(ctx) {
  return [
    el('p', { class: 'aviso aviso-orientativo', role: 'note' }, AVISO_ORIENTATIVO),
    ctx.problemas.length > 0 && el('p', { class: 'aviso', role: 'note', id: 'match-problemas' },
      `Hay ${ctx.problemas.length === 1 ? '1 regla que no se entiende y no se ha usado' : `${ctx.problemas.length} reglas que no se entienden y no se han usado`}: ${ctx.problemas.slice(0, 3).join(' ')}${ctx.problemas.length > 3 ? ' …' : ''} Avisa a quien administra la app.`),
  ];
}

export function tarjetaAlumnosQueEncajan(oferta, d) {
  const ctx = contextoDe(d.listas);
  const res = emparejar(d.alumnos, oferta, ctx);
  const solicito = new Map(solicitantesDeOferta(d.aplicaciones, d.alumnos, oferta.id).filas.map(f => [f.idAlumno, f.app]));   // su solicitud más reciente en esta oferta

  // Alumnos marcados para compartir su perfil (solo en memoria; al cambiar de oferta se empieza de cero).
  const sel = new Set(navegacion.compartir?.idOferta === oferta.id ? navegacion.compartir.ids.filter(id => d.alumnos.some(a => a.id === id)) : []);
  let tarjeta = null;
  const cuenta = el('p', { class: 'sub', id: 'cp-cuenta', role: 'status', 'aria-live': 'polite' });
  const boton = el('button', { class: 'primary', type: 'button', id: 'cp-ir', onclick: () => { location.hash = `#/oferta/${encodeURIComponent(oferta.id)}/compartir`; } }, 'Compartir perfiles');
  const actualizar = () => {
    navegacion.compartir = { idOferta: oferta.id, ids: [...sel] };
    cuenta.textContent = sel.size ? `${plural(sel.size, 'alumno elegido', 'alumnos elegidos')} para compartir (máximo ${MAX_PERFILES}).` : `Marca los alumnos cuyo perfil quieras compartir (máximo ${MAX_PERFILES}).`;
    boton.disabled = sel.size === 0;
    boton.textContent = sel.size ? `Compartir perfiles (${sel.size})` : 'Compartir perfiles';
    for (const i of tarjeta?.querySelectorAll('input.cp-sel') || []) i.disabled = sel.size >= MAX_PERFILES && !i.checked;
  };
  const casilla = a => {
    const i = el('input', { type: 'checkbox', class: 'casilla cp-sel', id: 'cp-sel-' + a.id, 'aria-label': 'Elegir a ' + nombreAlumno(a) + ' para compartir su perfil',
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
            el('span', { class: 'sub' }, a.master || ''),
            solicito.has(a.id) && el('span', { class: 'oferta-pie marca-solicito' }, el('span', { class: 'insignia' + claseEstado(solicito.get(a.id).estado) }, 'Solicitó · ' + (solicito.get(a.id).estado || 'Sin dato'))),
            el('span', { class: 'sub match-punt g-' + r.categoria }, textoPuntuacion(r.puntuacion, r.categoria)),
            motivo(r)),
          svgFlecha()),
        porQue(r)));
  };
  tarjeta = el('section', { class: 'card', id: 'match-alumnos', 'aria-labelledby': 'match-titulo' },
    el('h2', { id: 'match-titulo' }, 'Alumnos que encajan'),
    el('p', { class: 'sub' }, `${plural(d.alumnos.length, 'alumno', 'alumnos')}, ordenados por cómo encajan con esta oferta. ${NOTA}`),
    avisosDeTarjeta(ctx),
    el('div', { class: 'compartir-barra' }, cuenta, boton),
    grupos(res, fila, 'alumno', actualizar));
  actualizar();
  return tarjeta;
}

/* ---- Ficha del alumno: ofertas que encajan ---- */

export function tarjetaOfertasQueEncajan(alumno, d) {
  if (!d.ofertas.length) return null;
  const ctx = contextoDe(d.listas);
  const res = ofertasParaAlumno(d.ofertas, alumno, ctx);
  const fila = r => {
    const o = r.oferta;
    return el('li', { class: 'fila-match' }, el('div', { class: 'fila-match-cuerpo' },
      el('a', { class: 'alumno oferta', href: '#/oferta/' + encodeURIComponent(o.id) },
        el('span', { class: 'alumno-texto' },
          el('b', {}, o.titulo || 'Sin título'),
          el('span', { class: 'sub' }, [o.empresa, o.estado === 'Cerrada' && 'cerrada'].filter(Boolean).join(' · ')),
          el('span', { class: 'sub match-punt g-' + r.categoria }, textoPuntuacion(r.puntuacion, r.categoria)),
          motivo(r)),
        svgFlecha()),
      porQue(r)));
  };
  return el('section', { class: 'card', id: 'match-ofertas', 'aria-labelledby': 'match-of-titulo' },
    el('h2', { id: 'match-of-titulo' }, 'Ofertas que encajan'),
    el('p', { class: 'sub' }, `${plural(d.ofertas.length, 'oferta', 'ofertas')}, ordenadas por cómo encajan con este alumno. ${NOTA}`),
    avisosDeTarjeta(ctx),
    grupos(res, fila, 'oferta'));
}
