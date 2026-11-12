// Borrador de correo de seguimiento de una solicitud: se elige el idioma, se ve EXACTAMENTE el texto y se copia o se abre en la app de correo.
// No se envía nada desde la app ni se guarda nada: el texto sale por el portapapeles o por la app de correo del móvil.
// Nunca incluye notas de entrevista, motivos de descarte, situación de trabajo ni estatus migratorio (js/util/correo.js solo lee 5 campos).
import { recargar } from '../data/index.js';
import { el } from '../util/dom.js';
import { copiarTexto, avisoFlotante } from '../util/trabajo.js';
import { nombreAlumno } from '../util/rondas.js';
import { leerFirma } from '../util/preferencias.js';
import { IDIOMAS, TIPOS_CORREO, borradorCorreo, tipoDeEstado, idiomaPorDefecto, textoCompleto, enlaceCorreo } from '../util/correo.js';
import { datosRondas, insigniaEstado } from './rondas.js';
import { tarjetaError } from './error-datos.js';

export async function pintarCorreo(raiz, id) {
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando borrador…'));
  const volver = el('a', { class: 'volver', href: '#/aplicacion/' + encodeURIComponent(id) }, 'Solicitud');
  const volverOfertas = el('a', { class: 'volver', href: '#/ofertas' }, 'Ofertas');
  let d;
  try { d = await datosRondas(); }
  catch (err) { raiz.replaceChildren(volverOfertas, tarjetaError(err, () => { recargar().catch(() => {}); pintarCorreo(raiz, id); })); return; }
  const a = d.hay ? d.aplicaciones.find(x => x.id === id) : null;
  if (!a) {
    raiz.replaceChildren(volverOfertas, el('div', { class: 'card' }, el('h2', {}, 'Solicitud no encontrada'), el('p', { class: 'sub' }, 'Vuelve a las ofertas y elige otra.')));
    return;
  }
  const alumno = d.alumnos.find(x => x.id === a.idAlumno);
  const oferta = d.ofertas.find(x => x.id === a.idOferta);
  if (!alumno || !oferta) {
    raiz.replaceChildren(volver, el('div', { class: 'card' }, el('h2', {}, 'Faltan datos'),
      el('p', { class: 'sub' }, 'No se encuentra el alumno o la oferta de esta solicitud en el Sheet, y sin ellos no se puede armar el borrador.')));
    return;
  }
  const tipo = tipoDeEstado(a.estado);
  if (!tipo) {
    raiz.replaceChildren(volver, el('div', { class: 'card', id: 'co-sin-borrador' }, el('h2', {}, 'Esta solicitud no tiene borrador'),
      el('p', { class: 'sub' }, `Solo hay borradores para solicitudes en proceso (Recibida, En revisión, Enviada a la empresa o Entrevista) o descartadas. El estado de esta es «${a.estado || 'sin estado'}».`)));
    return;
  }

  const firma = leerFirma();
  let idioma = idiomaPorDefecto(alumno);
  let actual = null;   // lo que se ve en la vista previa es lo que se copia y lo que va al enlace de correo

  const vista = el('pre', { class: 'vista-previa', id: 'co-vista', tabindex: '0', 'aria-label': 'Texto del borrador' });
  const estado = el('p', { class: 'ok', role: 'status', id: 'co-estado', hidden: true });
  const error = el('p', { class: 'error', role: 'alert', id: 'co-error', hidden: true });
  const largo = el('p', { class: 'sub', id: 'co-largo', hidden: true }, 'El texto es demasiado largo para abrirlo directamente en el correo. Usa «Copiar».');
  const abrir = el('a', { class: 'primary', id: 'co-correo' }, 'Abrir en la app de correo');
  const copiar = el('button', { class: 'secondary', type: 'button', id: 'co-copiar', onclick: () => copiarBorrador() }, 'Copiar');
  const decir = (t, bien) => { estado.textContent = bien ? t : ''; estado.hidden = !(bien && t); error.textContent = bien ? '' : t; error.hidden = !t || bien; };

  const radios = IDIOMAS.map(i => ({ ...i, input: el('input', { type: 'radio', name: 'co-idioma', id: 'co-idioma-' + i.clave, value: i.clave, checked: i.clave === idioma, onchange: () => { idioma = i.clave; refrescar(); } }) }));
  const listaIdiomas = el('ul', { class: 'elegir elegir-cp', 'aria-label': 'Idioma del borrador' },
    radios.map(r => el('li', {}, el('label', { for: 'co-idioma-' + r.clave }, r.input, el('span', { class: 'alumno-texto' }, el('b', {}, r.etiqueta))))));

  const avisoFirma = !firma && el('p', { class: 'aviso', role: 'note', id: 'co-firma-falta' }, 'Falta tu firma: el borrador lleva el hueco «[Tu nombre]». Puedes escribirla en ', el('a', { class: 'enlace', href: '#/ajustes' }, 'Ajustes'), '.');

  function refrescar() {
    const b = borradorCorreo({ alumno, oferta, aplicacion: a, idioma, firma });
    actual = textoCompleto(b);
    vista.textContent = actual;
    const href = enlaceCorreo(b);
    if (href) { abrir.setAttribute('href', href); abrir.classList.remove('desactivado'); abrir.removeAttribute('aria-disabled'); }
    else { abrir.removeAttribute('href'); abrir.classList.add('desactivado'); abrir.setAttribute('aria-disabled', 'true'); abrir.setAttribute('role', 'link'); }
    largo.hidden = !!href;
    for (const r of radios) r.input.closest('label').classList.toggle('elegido', r.input.checked);
    decir('', true);
  }

  async function copiarBorrador() {
    if (!actual) return;
    if (await copiarTexto(actual)) { decir('Copiado. Pégalo en tu correo: desde ahora el texto ya no se controla desde la app.', true); avisoFlotante('Copiado.'); }
    else decir('No se ha podido copiar. Mantén pulsado el texto de la vista previa y elige «Copiar».', false);
  }

  raiz.replaceChildren(...[
    volver,
    el('section', { class: 'card', 'aria-labelledby': 'co-titulo' },
      el('h2', { id: 'co-titulo' }, 'Borrador de seguimiento'),
      el('p', { class: 'sub' }, `${nombreAlumno(alumno)} · ${[oferta.titulo || '(sin título)', oferta.empresa].filter(Boolean).join(' · ')}`),
      el('div', { class: 'estado-actual' }, insigniaEstado(a.estado), el('span', { class: 'sub' }, tipo === TIPOS_CORREO.enProceso ? 'Correo de «en proceso»' : 'Correo de «no continúa» con invitación a acercarse')),
      el('p', { class: 'aviso', role: 'note', id: 'co-privacidad' }, 'El borrador no incluye notas de entrevista, motivo de descarte, situación de trabajo ni estatus migratorio. Solo el nombre de pila, el puesto, la empresa y el estado. Léelo antes de enviarlo: cuando sale de la app ya no se controla.')),
    el('section', { class: 'card', 'aria-labelledby': 'co-idioma-titulo' },
      el('h2', { id: 'co-idioma-titulo' }, 'Idioma'),
      listaIdiomas),
    el('section', { class: 'card', 'aria-labelledby': 'co-prev' },
      el('h2', { id: 'co-prev' }, 'Vista previa'),
      el('p', { class: 'sub' }, 'Esto es exactamente lo que se copiará o se abrirá en el correo. No lleva destinatario: lo eliges tú.'),
      avisoFirma,
      vista, estado, error, largo, abrir, copiar),
  ].filter(Boolean));
  refrescar();
}
