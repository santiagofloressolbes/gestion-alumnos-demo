// Compartir perfiles: se eligen los alumnos y los datos, se ve EXACTAMENTE el texto que saldrá y se comparte o se copia.
// No se envía nada a ningún servidor ni se guarda nada: el texto sale por el menú de compartir del móvil o por el portapapeles.
import { recargar } from '../data/index.js';
import { el, reemplazar } from '../util/dom.js';
import { navegacion } from '../util/navegacion.js';
import { avisoFlotante, copiarTexto as copiarAlPortapapeles } from '../util/trabajo.js';
import { CAMPOS_BASE, CAMPOS_SENSIBLES, CAMPOS_EXTRA, BASE_POR_DEFECTO, MAX_PERFILES, textoPerfiles, nombreCompleto, sensiblesMarcados, cvSinHttps } from '../util/compartir.js';
import { datosRondas } from './rondas.js';
import { tarjetaError } from './error-datos.js';

export async function pintarCompartir(raiz, { idOferta = '', idAlumno = '' } = {}) {
  reemplazar(raiz, el('p', { class: 'estado', role: 'status' }, 'Cargando…'));
  let d;
  const hrefVolver = idAlumno ? '#/alumno/' + encodeURIComponent(idAlumno) : idOferta ? '#/oferta/' + encodeURIComponent(idOferta) : '#/ofertas';
  const volver = el('a', { class: 'volver', href: hrefVolver }, idAlumno ? 'Ficha' : 'Oferta');
  try { d = await datosRondas(); }
  catch (err) { reemplazar(raiz, volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarCompartir(raiz, { idOferta, idAlumno }); })); return; }
  const oferta = idOferta ? d.ofertas.find(o => o.id === idOferta) || null : null;
  if (idOferta && !oferta) {
    reemplazar(raiz, el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas'), el('div', { class: 'card' }, el('h2', {}, 'Oferta no encontrada'), el('p', { class: 'sub' }, 'Vuelve a la lista y elige otra.')));
    return;
  }
  const ids = idAlumno ? [idAlumno] : navegacion.compartir?.idOferta === idOferta ? navegacion.compartir.ids : [];
  const elegidos = ids.map(id => d.alumnos.find(a => a.id === id)).filter(Boolean);
  if (!elegidos.length) {
    reemplazar(raiz, volver, el('div', { class: 'card', id: 'cp-nadie' },
      el('h2', {}, 'No hay alumnos elegidos'),
      el('p', { class: 'sub' }, 'Elige a quien quieras en «Alumnos que encajan», en la ficha de la oferta, y vuelve aquí.'),
      el('a', { class: 'secondary', href: hrefVolver }, idAlumno ? 'Volver a la ficha' : 'Volver a la oferta')));
    return;
  }
  const alumnos = elegidos.slice(0, MAX_PERFILES);

  let actual = '';   // el texto exacto: lo que se ve en la vista previa es lo que se copia y lo que va al menú de compartir
  const incluido = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Alumnos incluidos' });
  const filaAlumno = a => el('li', {}, el('label', { for: 'cp-al-' + a.id }, el('input', { type: 'checkbox', class: 'casilla', id: 'cp-al-' + a.id, value: a.id, checked: true, onchange: refrescar }),
    el('span', { class: 'alumno-texto' }, el('b', {}, nombreCompleto(a)), el('span', { class: 'sub' }, a.master || ''))));
  incluido.append(...alumnos.map(filaAlumno));

  const casilla = (c, marcada, sensible) => el('li', {}, el('label', { for: 'cp-c-' + c.clave, class: sensible ? 'sensible' : null },
    el('input', { type: 'checkbox', class: 'casilla', id: 'cp-c-' + c.clave, value: c.clave, checked: marcada, onchange: refrescar }),
    el('span', { class: 'alumno-texto' }, el('b', {}, c.etiqueta), sensible && el('span', { class: 'sub' }, 'Dato sensible'), c.nota && el('span', { class: 'sub' }, c.nota))));
  const listaBase = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Datos que se incluyen' }, CAMPOS_BASE.map(c => casilla(c, BASE_POR_DEFECTO.includes(c.clave), false)));
  const listaSensible = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Datos sensibles' }, CAMPOS_SENSIBLES.map(c => casilla(c, false, true)));

  const listaExtra = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Texto adicional' }, CAMPOS_EXTRA.map(c => casilla(c, false, false)));

  const avisoSensible = el('p', { class: 'aviso', role: 'note', id: 'cp-sensible', hidden: true });
  const vista = el('pre', { class: 'vista-previa', id: 'cp-vista', tabindex: '0', 'aria-label': 'Texto que se va a compartir' });
  const estado = el('p', { class: 'ok', role: 'status', id: 'cp-estado', hidden: true });
  const error = el('p', { class: 'error', role: 'alert', id: 'cp-error', hidden: true });
  const puedeCompartir = typeof navigator.share === 'function';
  const compartir = el('button', { class: 'primary', type: 'button', id: 'cp-compartir', onclick: () => enviar(), disabled: !puedeCompartir }, 'Compartir');
  const copiar = el('button', { class: 'secondary', type: 'button', id: 'cp-copiar', onclick: () => copiarTexto() }, 'Copiar');
  const sinMenu = !puedeCompartir && el('p', { class: 'sub', id: 'cp-sin-menu' }, 'Este navegador no puede compartir directamente. Pulsa «Copiar».');

  const marcados = lista => [...lista.querySelectorAll('input:checked')].map(i => i.value);
  const decir = (t, bien) => { estado.textContent = bien ? t : ''; estado.hidden = !(bien && t); error.textContent = bien ? '' : t; error.hidden = !t || bien; };

  function refrescar() {
    const quienes = marcados(incluido).map(id => alumnos.find(a => a.id === id)).filter(Boolean);
    const campos = [...marcados(listaBase), ...marcados(listaSensible), ...marcados(listaExtra)];
    actual = quienes.length ? textoPerfiles({ alumnos: quienes, campos, oferta }) : '';
    vista.textContent = actual || 'No hay ningún alumno marcado.';
    const sens = sensiblesMarcados(campos);
    const sinCV = cvSinHttps(quienes, campos);
    reemplazar(avisoSensible, ...[
      sens.length ? `Has marcado datos sensibles (${sens.map(c => c.etiqueta.toLowerCase()).join(', ')}). Compártelos solo con permiso de la persona.` : '',
      sinCV && sinCV.length ? (sinCV.length === 1 ? `El CV de ${sinCV[0]} no se incluye: su enlace no empieza por https.` : `El CV de ${sinCV.join(', ')} no se incluye: sus enlaces no empiezan por https.`) : '',
    ].filter(Boolean).map(t => el('span', { class: 'bloque' }, t)));
    avisoSensible.hidden = !avisoSensible.childNodes.length;
    compartir.disabled = !puedeCompartir || !quienes.length;
    copiar.disabled = !quienes.length;
    decir('', true);
  }

  async function enviar() {
    if (!actual) return;
    const texto = actual;
    try {
      await navigator.share({ title: 'Perfiles de alumnos', text: texto });
      decir('Compartido.', true);
    } catch (e) {
      if (e && e.name === 'AbortError') return decir('No se ha compartido nada.', true);
      decir('No se ha podido compartir. Prueba con «Copiar».', false);
    }
  }

  async function copiarTexto() {
    if (!actual) return;
    const bien = await copiarAlPortapapeles(actual);   // solo texto plano (ver util/trabajo.js)
    if (bien) { decir('Copiado. Pégalo donde quieras.', true); avisoFlotante('Copiado.'); }
    else decir('No se ha podido copiar. Mantén pulsado el texto de la vista previa y elige «Copiar».', false);
  }

  reemplazar(raiz, ...[
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'cp-titulo' },
      el('h2', { id: 'cp-titulo' }, alumnos.length === 1 ? 'Compartir un perfil' : `Compartir ${alumnos.length} perfiles`),
      oferta && el('p', { class: 'sub' }, [oferta.titulo || 'Sin título', oferta.empresa].filter(Boolean).join(' · ')),
      el('p', { class: 'aviso', role: 'note', id: 'cp-aviso' },
        'Lo que compartas sale de la app y ya no podrás controlar quién lo lee. Comparte solo lo necesario y pide permiso a cada persona. La app no guarda registro de lo compartido.')),
    el('section', { class: 'card', 'aria-labelledby': 'cp-quien' },
      el('h2', { id: 'cp-quien' }, `Alumnos (máximo ${MAX_PERFILES})`),
      incluido),
    el('section', { class: 'card', 'aria-labelledby': 'cp-datos' },
      el('h2', { id: 'cp-datos' }, 'Qué datos se incluyen'),
      listaBase,
      el('h3', { class: 'sub-titulo' }, 'Datos sensibles'),
      listaSensible,
      el('h3', { class: 'sub-titulo' }, 'Texto adicional'),
      listaExtra,
      avisoSensible,
      el('p', { class: 'sub' }, 'Las notas de entrevista, el historial y los motivos de descarte nunca se incluyen.')),
    el('section', { class: 'card', 'aria-labelledby': 'cp-prev' },
      el('h2', { id: 'cp-prev' }, 'Vista previa'),
      el('p', { class: 'sub' }, 'Esto es exactamente lo que se compartirá o copiará.'),
      vista, estado, error, compartir, copiar, sinMenu),
  ].filter(Boolean));
  refrescar();
}
