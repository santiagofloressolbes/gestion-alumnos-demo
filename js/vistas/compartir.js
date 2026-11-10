// Compartir perfiles: se eligen los alumnos y los datos, se ve EXACTAMENTE el texto que saldrá y se comparte o se copia.
// No se envía nada a ningún servidor ni se guarda nada: el texto sale por el menú de compartir del móvil o por el portapapeles.
import { recargar } from '../data/index.js';
import { el } from '../util/dom.js';
import { navegacion } from '../util/navegacion.js';
import { avisoFlotante } from '../util/trabajo.js';
import { CAMPOS_BASE, CAMPOS_SENSIBLES, BASE_POR_DEFECTO, MAX_PERFILES, textoPerfiles, nombreCompleto, sensiblesMarcados, cvSinHttps } from '../util/compartir.js';
import { datosRondas } from './rondas.js';
import { tarjetaError } from './error-datos.js';

export async function pintarCompartir(raiz, { idOferta = '', idAlumno = '' } = {}) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando…'));
  let d;
  const hrefVolver = idAlumno ? '#/alumno/' + encodeURIComponent(idAlumno) : idOferta ? '#/oferta/' + encodeURIComponent(idOferta) : '#/ofertas';
  const volver = el('a', { class: 'volver', href: hrefVolver }, idAlumno ? 'Ficha' : 'Oferta');
  try { d = await datosRondas(); }
  catch (err) { raiz.replaceChildren(volver, tarjetaError(err, () => { recargar().catch(() => {}); pintarCompartir(raiz, { idOferta, idAlumno }); })); return; }
  const oferta = idOferta ? d.ofertas.find(o => o.id === idOferta) || null : null;
  if (idOferta && !oferta) {
    raiz.replaceChildren(el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas'), el('div', { class: 'card' }, el('h2', {}, 'Oferta no encontrada'), el('p', { class: 'sub' }, 'Vuelve a la lista y elige otra.')));
    return;
  }
  const ids = idAlumno ? [idAlumno] : navegacion.compartir?.idOferta === idOferta ? navegacion.compartir.ids : [];
  const elegidos = ids.map(id => d.alumnos.find(a => a.id === id)).filter(Boolean);
  if (!elegidos.length) {
    raiz.replaceChildren(volver, el('div', { class: 'card', id: 'cp-nadie' },
      el('h2', {}, 'No hay alumnos elegidos'),
      el('p', { class: 'sub' }, 'Elige a quien quieras en «Alumnos que encajan», en la ficha de la oferta, y vuelve aquí.'),
      el('a', { class: 'secondary', href: hrefVolver }, idAlumno ? 'Volver a la ficha' : 'Volver a la oferta')));
    return;
  }
  const alumnos = elegidos.slice(0, MAX_PERFILES);

  let actual = '';   // el texto exacto: lo que se ve en la vista previa es lo que se copia y lo que va al menú de compartir
  const incluido = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Alumnos incluidos' });
  const filaAlumno = a => el('li', {}, el('label', { for: 'cp-al-' + a.id }, el('input', { type: 'checkbox', id: 'cp-al-' + a.id, value: a.id, checked: true, onchange: refrescar }),
    el('span', { class: 'alumno-texto' }, el('b', {}, nombreCompleto(a)), el('span', { class: 'sub' }, a.master || ''))));
  incluido.append(...alumnos.map(filaAlumno));

  const casilla = (c, marcada, sensible) => el('li', {}, el('label', { for: 'cp-c-' + c.clave, class: sensible ? 'sensible' : null },
    el('input', { type: 'checkbox', id: 'cp-c-' + c.clave, value: c.clave, checked: marcada, onchange: refrescar }),
    el('span', { class: 'alumno-texto' }, el('b', {}, c.etiqueta), sensible && el('span', { class: 'sub' }, 'Dato sensible'))));
  const listaBase = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Datos que se incluyen' }, CAMPOS_BASE.map(c => casilla(c, BASE_POR_DEFECTO.includes(c.clave), false)));
  const listaSensible = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Datos sensibles' }, CAMPOS_SENSIBLES.map(c => casilla(c, false, true)));

  const avisoSensible = el('p', { class: 'aviso', role: 'note', id: 'cp-sensible', hidden: true });
  const vista = el('pre', { class: 'vista-previa', id: 'cp-vista', tabindex: '0', 'aria-label': 'Texto que se va a compartir' });
  const estado = el('p', { class: 'ok', role: 'status', id: 'cp-estado', hidden: true });
  const error = el('p', { class: 'error', role: 'alert', id: 'cp-error', hidden: true });
  const puedeCompartir = typeof navigator.share === 'function';
  const compartir = el('button', { class: 'primary', type: 'button', id: 'cp-compartir', onclick: () => enviar(), disabled: !puedeCompartir }, 'Compartir');
  const copiar = el('button', { class: 'secondary', type: 'button', id: 'cp-copiar', onclick: () => copiarTexto() }, 'Copiar');
  const sinMenu = !puedeCompartir && el('p', { class: 'sub', id: 'cp-sin-menu' }, 'Este navegador no tiene el menú de compartir. Usa «Copiar».');

  const marcados = lista => [...lista.querySelectorAll('input:checked')].map(i => i.value);
  const decir = (t, bien) => { estado.textContent = bien ? t : ''; estado.hidden = !(bien && t); error.textContent = bien ? '' : t; error.hidden = !t || bien; };

  function refrescar() {
    const quienes = marcados(incluido).map(id => alumnos.find(a => a.id === id)).filter(Boolean);
    const campos = [...marcados(listaBase), ...marcados(listaSensible)];
    actual = quienes.length ? textoPerfiles({ alumnos: quienes, campos, oferta }) : '';
    vista.textContent = actual || '(No hay ningún alumno marcado.)';
    const sens = sensiblesMarcados(campos);
    const sinCV = cvSinHttps(quienes, campos);
    avisoSensible.replaceChildren(...[
      sens.length ? `Has marcado datos sensibles (${sens.map(c => c.etiqueta.toLowerCase()).join(', ')}). Compártelos solo si la persona lo sabe y lo permite.` : '',
      sinCV && sinCV.length ? `Sin enlace https, se deja fuera el CV de: ${sinCV.join(', ')}.` : '',
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
      decir('Compartido. Desde ahora el texto ya no se controla desde la app.', true);
    } catch (e) {
      if (e && e.name === 'AbortError') return decir('No se ha compartido nada.', true);
      decir('No se ha podido abrir el menú de compartir. Usa «Copiar».', false);
    }
  }

  async function copiarTexto() {
    if (!actual) return;
    const texto = actual;
    let bien = false;
    try { await navigator.clipboard.writeText(texto); bien = true; }
    catch {
      const t = el('textarea', { 'aria-hidden': 'true', tabindex: '-1', readonly: true, class: 'cp-oculto' });   // respaldo para navegadores sin portapapeles
      t.value = texto; document.body.append(t); t.select();
      try { bien = document.execCommand('copy'); } catch { bien = false; }
      t.remove();
    }
    if (bien) { decir('Copiado. Pégalo donde quieras: desde ahora el texto ya no se controla desde la app.', true); avisoFlotante('Copiado.'); }
    else decir('No se ha podido copiar. Mantén pulsado el texto de la vista previa y elige «Copiar».', false);
  }

  raiz.replaceChildren(...[
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'cp-titulo' },
      el('h2', { id: 'cp-titulo' }, alumnos.length === 1 ? 'Compartir un perfil' : `Compartir ${alumnos.length} perfiles`),
      oferta && el('p', { class: 'sub' }, [oferta.titulo || '(sin título)', oferta.empresa].filter(Boolean).join(' · ')),
      el('p', { class: 'aviso', role: 'note', id: 'cp-aviso' },
        'Lo que compartas sale de la app: desde ese momento ya no se controla quién lo lee ni lo reenvía. Comparte solo lo necesario. Con personas reales hace falta su permiso, y esta app no guarda un registro de lo que compartes.')),
    el('section', { class: 'card', 'aria-labelledby': 'cp-quien' },
      el('h2', { id: 'cp-quien' }, `Alumnos (máximo ${MAX_PERFILES})`),
      incluido),
    el('section', { class: 'card', 'aria-labelledby': 'cp-datos' },
      el('h2', { id: 'cp-datos' }, 'Qué datos se incluyen'),
      listaBase,
      el('h3', { class: 'sub-titulo' }, 'Datos sensibles (desmarcados)'),
      listaSensible,
      avisoSensible,
      el('p', { class: 'sub' }, 'Las notas de entrevista, el historial y los motivos de descarte nunca se incluyen.')),
    el('section', { class: 'card', 'aria-labelledby': 'cp-prev' },
      el('h2', { id: 'cp-prev' }, 'Vista previa'),
      el('p', { class: 'sub' }, 'Esto es exactamente lo que se compartirá o copiará.'),
      vista, estado, error, compartir, copiar, sinMenu),
  ].filter(Boolean));
  refrescar();
}
