// Pestaña Ofertas: lista (más recientes primero) con filtros, y ficha de una oferta. Solo lectura.
import { getOfertas, getListas, recargar, puedeEscribirOfertas, estadoEscrituraOfertas } from '../data/index.js';
import { navegacion } from '../util/navegacion.js';
import { el, svgFlecha, plural } from '../util/dom.js';
import { filtrar, estadoVacio, filtrosActivos, hayAlgo, enlaceOferta } from '../util/ofertas.js';
import { fechaLarga } from './entrevista.js';
import { tarjetaError } from './error-datos.js';
import { datosRondas, seccionesRondas } from './rondas.js';

const e = estadoVacio();   // búsqueda y filtros: se conservan al entrar en una oferta y volver
const volverAOfertas = () => el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas');
const insignia = estado => el('span', { class: 'insignia' + (estado === 'Abierta' ? ' abierta' : '') }, estado || 'Sin estado');

export async function pintarOfertas(raiz) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando ofertas…'));
  let ofertas, listas;
  try {
    [ofertas, listas] = await Promise.all([getOfertas(), getListas()]);
  } catch (err) {
    raiz.replaceChildren(tarjetaError(err, () => { recargar().catch(() => {}); pintarOfertas(raiz); }));
    return;
  }

  // Solo se ofrecen valores que alguna oferta tiene (en el orden de la hoja Listas).
  const opciones = (lista, campo) => {
    const usados = new Set(ofertas.map(o => o[campo]).filter(Boolean));
    return [...new Set([...lista, ...usados])].filter(v => usados.has(v));
  };
  const estados = opciones(listas.estadosOferta, 'estado');
  const tipos = opciones(listas.tiposOferta, 'tipo');
  const areas = opciones(listas.areas, 'area');
  // Un filtro guardado de antes que ya no existe (porque cambiaron los datos) se quita.
  if (e.estado && !estados.includes(e.estado)) e.estado = '';
  if (e.tipo && !tipos.includes(e.tipo)) e.tipo = '';
  if (e.area && !areas.includes(e.area)) e.area = '';

  const campoSelect = (id, etiqueta, valores, clave, todas) => {
    const s = el('select', { id, onchange: () => { e[clave] = s.value; pintarResultados(); } },
      el('option', { value: '' }, todas), valores.map(v => el('option', { value: v, selected: v === e[clave] }, v)));
    return el('div', { class: 'campo-form' }, el('label', { for: id }, etiqueta), s);
  };

  const q = el('input', {
    id: 'of-q', type: 'search', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
    placeholder: 'Empresa, puesto, ciudad…', value: e.texto,
    oninput: () => { e.texto = q.value; pintarResultados(); },
    onkeydown: ev => { if (ev.key === 'Enter') q.blur(); },   // cierra el teclado del móvil
  });

  // Estado: botones siempre a la vista (lo más usado: ver solo las abiertas).
  const opcionesEstado = [['', 'Todas'], ...estados.map(s => [s, s])];
  const botonesEstado = opcionesEstado.map(([valor, texto]) => el('button', {
    type: 'button', class: 'opcion', 'aria-pressed': 'false',
    onclick: () => { e.estado = valor; pintarResultados(); },
  }, texto));

  const resumen = el('summary', {});
  const limpiar = el('button', { class: 'secondary', type: 'button', hidden: true, onclick: () => {
    Object.assign(e, estadoVacio()); q.value = ''; for (const s of raiz.querySelectorAll('select')) s.value = ''; pintarResultados();
  } }, 'Quitar búsqueda y filtros');
  const cuenta = el('p', { class: 'estado cuenta', role: 'status', 'aria-live': 'polite' });
  const lista = el('ul', { class: 'alumnos', 'aria-label': 'Ofertas' });
  const vacio = el('div', { class: 'card', hidden: true },
    el('h2', {}, 'Ninguna oferta coincide'),
    el('p', { class: 'sub' }, 'Prueba con menos palabras o quita algún filtro.'));

  const filtros = el('details', { class: 'filtros', open: !!(e.tipo || e.area) },
    resumen,
    el('div', { class: 'filtros-cuerpo' },
      campoSelect('of-tipo', 'Tipo', tipos, 'tipo', 'Prácticas y empleo'),
      campoSelect('of-area', 'Área', areas, 'area', 'Todas las áreas')));

  function pintarResultados() {
    const res = filtrar(ofertas, e);
    const n = filtrosActivos(e);
    resumen.textContent = n ? `Filtros (${n} activo${n > 1 ? 's' : ''})` : 'Filtros';
    botonesEstado.forEach((b, i) => b.setAttribute('aria-pressed', opcionesEstado[i][0] === e.estado ? 'true' : 'false'));
    limpiar.hidden = !hayAlgo(e);
    cuenta.textContent = hayAlgo(e) ? `${res.length} de ${plural(ofertas.length, 'oferta', 'ofertas')}` : plural(ofertas.length, 'oferta', 'ofertas');
    vacio.hidden = res.length > 0 || ofertas.length === 0;
    lista.replaceChildren(...res.map(fila));
  }

  const aviso = navegacion.aviso; navegacion.aviso = '';
  // replaceChildren convierte un false o un texto vacío en texto visible: los elementos opcionales se filtran antes.
  raiz.replaceChildren(...[
    aviso && el('p', { class: 'ok', role: 'status' }, aviso),
    puedeEscribirOfertas() && el('a', { class: 'primary nueva-oferta', href: '#/oferta/nueva' }, 'Nueva oferta'),
    estadoEscrituraOfertas() === 'script-antiguo' && el('p', { class: 'aviso', role: 'note' },
      'El script de Google es de una versión anterior y no sabe guardar ofertas. Actualiza Code.gs (guía, "Actualizar a la versión con ofertas").'),
    el('div', { class: 'card buscador', role: 'search' },
      el('div', { class: 'campo-form' }, el('label', { for: 'of-q' }, 'Buscar oferta'), q),
      el('div', { class: 'campo-form' },
        el('span', { class: 'etiqueta', id: 'of-l-estado' }, 'Estado'),
        el('div', { class: 'opciones', role: 'group', 'aria-labelledby': 'of-l-estado' }, botonesEstado)),
      filtros),
    limpiar, cuenta,
    el('div', { class: 'card', hidden: ofertas.length > 0 }, el('h2', {}, 'Todavía no hay ofertas'), el('p', { class: 'sub' }, 'Cuando haya ofertas en el Sheet aparecerán aquí.')),
    vacio, lista].filter(Boolean));
  pintarResultados();
}

// Una fila de la lista: puesto, empresa y ciudad, tipo y área, fecha y estado.
function fila(o) {
  const donde = [o.empresa, o.ubicacion].filter(Boolean).join(' · ');
  return el('li', {}, el('a', { class: 'alumno oferta', href: '#/oferta/' + encodeURIComponent(o.id) },
    el('span', { class: 'alumno-texto' },
      el('b', {}, o.titulo || '(sin título)'),
      donde && el('span', { class: 'sub' }, donde),
      el('span', { class: 'sub' }, [o.tipo, o.area].filter(Boolean).join(' · ')),
      el('span', { class: 'oferta-pie' }, insignia(o.estado), o.fechaRecepcion && el('span', { class: 'sub' }, fechaLarga(o.fechaRecepcion)))),
    svgFlecha()));
}

/* ---- Ficha de una oferta ---- */

function campo(etiqueta, valor, { texto = false, vacio = 'No indicado' } = {}) {
  return el('div', { class: 'campo' },
    el('dt', {}, etiqueta),
    el('dd', { class: (valor ? '' : 'vacio ') + (texto ? 'largo' : '') }, valor || vacio));
}

export async function pintarOferta(raiz, id) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando oferta…'));
  let o = null, d = null;
  try { d = await datosRondas(); o = d.ofertas.find(x => x.id === id) || null; }
  catch (err) {
    raiz.replaceChildren(volverAOfertas(), tarjetaError(err, () => { recargar().catch(() => {}); pintarOferta(raiz, id); }));
    return;
  }
  if (!o) {
    raiz.replaceChildren(volverAOfertas(), el('div', { class: 'card' },
      el('h2', {}, 'Oferta no encontrada'),
      el('p', { class: 'sub' }, 'Vuelve a la lista y elige otra.')));
    return;
  }

  const enlace = enlaceOferta(o.enlace);
  const aviso = navegacion.aviso; navegacion.aviso = '';
  // replaceChildren convierte un null en el texto "null": los apartados opcionales se filtran antes.
  raiz.replaceChildren(...[
    volverAOfertas(),
    aviso && el('p', { class: 'ok aviso-ok', role: 'status' }, aviso),

    el('section', { class: 'card cabecera cabecera-oferta', 'aria-label': 'Oferta' },
      el('h2', { class: 'nombre' }, o.titulo || '(sin título)'),
      el('p', { class: 'sub' }, [o.empresa, o.ubicacion].filter(Boolean).join(' · ')),
      el('div', { class: 'chips' }, insignia(o.estado), o.tipo && el('span', { class: 'chip' }, o.tipo)),
      enlace.tipo === 'enlace'
        ? el('a', { class: 'primary', href: enlace.href, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir la oferta')
        : null),

    el('section', { class: 'card', 'aria-label': 'Datos' },
      el('h2', {}, 'La oferta'),
      el('dl', { class: 'campos' },
        campo('Empresa', o.empresa),
        campo('Tipo de organización', o.tipoOrganizacion),
        campo('Área', o.area),
        campo('Ubicación', o.ubicacion),
        campo('Recibida el', fechaLarga(o.fechaRecepcion)),
        campo('Número de oferta', o.id))),

    el('section', { class: 'card', 'aria-label': 'Requisitos' },
      el('h2', {}, 'Requisitos'),
      el('dl', { class: 'campos' },
        campo('Nacionalidad', o.requisitoNacionalidad, { vacio: 'Sin requisito de nacionalidad' }),
        campo('Permiso de trabajo', o.requisitoPermiso))),

    enlace.tipo === 'nada' ? null : el('section', { class: 'card', 'aria-label': 'Enlace o descripción' },
      el('h2', {}, enlace.tipo === 'enlace' ? 'Enlace' : 'Descripción'),
      el('dl', { class: 'campos' },
        campo(enlace.tipo === 'ejemplo' ? 'Enlace de ejemplo (no se abre)' : enlace.tipo === 'enlace' ? 'Dirección' : 'Texto', enlace.texto, { texto: true }))),

    ...seccionesRondas(o, d),

    puedeEscribirOfertas() && el('a', { class: 'secondary', id: 'of-editar', href: `#/oferta/${encodeURIComponent(o.id)}/editar` }, 'Editar oferta'),
  ].filter(Boolean));
}
