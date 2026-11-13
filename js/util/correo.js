// Borradores de correo de seguimiento (funciones puras: arman el TEXTO; no envían nada ni tocan la pantalla).
//
// PRIVACIDAD: este archivo solo lee, a propósito, estos campos (lista cerrada):
//   alumno.nombre · oferta.empresa · oferta.titulo · oferta.area · aplicacion.estado
// Las notas de entrevista, los motivos de descarte, las notas y el historial de la solicitud, la situación de trabajo,
// el estatus migratorio, la nacionalidad, el CV y el resto de campos NO se leen aquí: no hay forma de que acaben en el texto.
// (Pruebas con textos "canario" lo comprueban.) Un borrador de "descartado" nunca dice el motivo.

import { norm } from './texto.js';

export const IDIOMAS = Object.freeze([{ clave: 'es', etiqueta: 'Español' }, { clave: 'en', etiqueta: 'English' }]);
// Estados en los que hay borrador. "Contratado" y cualquier otro no tienen.
export const ESTADOS_EN_PROCESO = Object.freeze(['Recibida', 'En revisión', 'Enviada a la empresa', 'Entrevista']);
export const ESTADO_DESCARTADO = 'Descartado';
export const TIPOS_CORREO = Object.freeze({ enProceso: 'en-proceso', descartado: 'descartado' });
export const MAX_MAILTO = 1800;   // los enlaces mailto muy largos se cortan en algunas apps de correo

const SIN_FIRMA = { es: '[Tu nombre]', en: '[Your name]' };
const MAX_CAMPO = 120;

// Una línea, sin caracteres de control ni espacios de más (lo que viene del Sheet no puede inventar líneas del mensaje ni cabeceras).
const limpio = t => String(t ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CAMPO).trim();

const estadoNorm = estado => norm(limpio(estado));
const EN_PROCESO = new Map(ESTADOS_EN_PROCESO.map(e => [norm(e), e]));

// 'en-proceso' | 'descartado' | null (sin borrador para ese estado).
export function tipoDeEstado(estado) {
  const e = estadoNorm(estado);
  if (EN_PROCESO.has(e)) return TIPOS_CORREO.enProceso;
  if (e === norm(ESTADO_DESCARTADO)) return TIPOS_CORREO.descartado;
  return null;
}

// Idioma del borrador (solo para elegir el idioma: el programa NUNCA aparece en el texto). La persona puede cambiarlo con el selector.
//   1) Lo que diga la columna «Idioma del programa» de la hoja Listas para el programa del alumno (en / es, también English, Inglés, Español…).
//   2) Si está vacía o no se entiende: el nombre del programa lleva la palabra «inglés» o «English» → inglés.
//   3) Si no: español.
const IDIOMA_COLUMNA = { en: 'en', english: 'en', ingles: 'en', es: 'es', espanol: 'es', castellano: 'es' };
export function idiomaPorDefecto(alumno, programas = []) {
  const programa = (programas || []).find(p => p.nombre === alumno?.master);
  const dePrograma = IDIOMA_COLUMNA[norm(programa?.idioma)];
  if (dePrograma) return dePrograma;
  return /\b(ingles|english)\b/.test(norm(alumno?.master)) ? 'en' : 'es';
}

// "el puesto en la empresa", con lo que haya.
function descripcion(puesto, empresa, idioma) {
  if (idioma === 'en') return puesto && empresa ? `${puesto} at ${empresa}` : puesto || (empresa ? `an opening at ${empresa}` : 'the position');
  return puesto && empresa ? `${puesto} en ${empresa}` : puesto || (empresa ? `una oferta de ${empresa}` : 'la oferta');
}

const FRASES = {
  es: {
    saludo: n => (n ? `Hola ${n},` : 'Hola,'),
    'en-proceso': {
      'Recibida': d => `Te escribo para decirte que hemos recibido tu solicitud para ${d}.`,
      'En revisión': d => `Te escribo para decirte que tu solicitud para ${d} está en revisión.`,
      'Enviada a la empresa': d => `Te escribo para decirte que hemos enviado tu perfil a la empresa para ${d}.`,
      'Entrevista': d => `Te escribo para decirte que tu solicitud para ${d} está en fase de entrevista.`,
      cierre: 'Seguimos el proceso de cerca y te avisaremos en cuanto haya novedades. Si tienes cualquier duda, escríbeme.',
      asunto: d => `Seguimiento de tu solicitud: ${d}`,
    },
    descartado: {
      cuerpo: d => `Te escribo para comentarte que, en esta ocasión, tu solicitud para ${d} no continúa en el proceso. Gracias por tu interés y por el esfuerzo.`,
      conArea: a => `Si te gustaría orientar tu carrera hacia ${a}, acércate y lo hablamos: puedo ayudarte a preparar las próximas oportunidades en esa área.`,
      sinArea: 'Si quieres comentar tu búsqueda y los próximos pasos, acércate y lo hablamos.',
      asunto: d => `Sobre tu solicitud: ${d}`,
    },
    despedida: 'Un saludo,',
  },
  en: {
    saludo: n => (n ? `Hi ${n},` : 'Hi,'),
    'en-proceso': {
      'Recibida': d => `I'm writing to let you know that we have received your application for ${d}.`,
      'En revisión': d => `I'm writing to let you know that your application for ${d} is under review.`,
      'Enviada a la empresa': d => `I'm writing to let you know that we have sent your profile to the company for ${d}.`,
      'Entrevista': d => `I'm writing to let you know that your application for ${d} is at the interview stage.`,
      cierre: "We are following the process closely and will let you know as soon as there is any news. If you have any questions, just write to me.",
      asunto: d => `Update on your application: ${d}`,
    },
    descartado: {
      cuerpo: d => `I'm writing to let you know that, on this occasion, your application for ${d} will not be moving forward. Thank you for your interest and for the effort you put in.`,
      conArea: a => `If you would like to steer your career towards ${a}, come and see me and we can talk it through: I can help you prepare for the next opportunities in that area.`,
      sinArea: 'If you would like to talk about your search and the next steps, come and see me.',
      asunto: d => `About your application: ${d}`,
    },
    despedida: 'Best regards,',
  },
};

// Devuelve { tipo, idioma, asunto, cuerpo, faltaFirma } o null si ese estado no tiene borrador.
// Solo se leen alumno.nombre, oferta.empresa, oferta.titulo, oferta.area y aplicacion.estado (ver arriba).
export function borradorCorreo({ alumno, oferta, aplicacion, idioma = 'es', firma = '' }) {
  const tipo = tipoDeEstado(aplicacion?.estado);
  if (!tipo) return null;
  const lang = idioma === 'en' ? 'en' : 'es';
  const T = FRASES[lang];
  const nombre = limpio(alumno?.nombre), empresa = limpio(oferta?.empresa), puesto = limpio(oferta?.titulo), area = limpio(oferta?.area);
  const d = descripcion(puesto, empresa, lang);
  const firmaLimpia = limpio(firma);

  let parrafos, asunto;
  if (tipo === TIPOS_CORREO.enProceso) {
    const estado = EN_PROCESO.get(estadoNorm(aplicacion.estado));
    parrafos = [T['en-proceso'][estado](d), T['en-proceso'].cierre];
    asunto = T['en-proceso'].asunto(d);
  } else {
    parrafos = [T.descartado.cuerpo(d), area ? T.descartado.conArea(area) : T.descartado.sinArea];
    asunto = T.descartado.asunto(d);
  }
  const cuerpo = [T.saludo(nombre), ...parrafos, `${T.despedida}\n${firmaLimpia || SIN_FIRMA[lang]}`].join('\n\n');
  return { tipo, idioma: lang, asunto, cuerpo, faltaFirma: !firmaLimpia };
}

// El texto tal como se copia: asunto y cuerpo juntos.
// La primera línea NO puede tener la forma «palabra:» (iOS la lee como una dirección web): va con raya.
export const textoCompleto = b => `${lineaAsunto(b.idioma)} — ${b.asunto}\n\n${b.cuerpo}`;
export const lineaAsunto = idioma => (idioma === 'en' ? 'Subject' : 'Asunto');

// Enlace para abrir la app de correo, sin destinatario. Todo va codificado: nada del texto puede añadir cabeceras (Bcc, Cc…).
// Devuelve null si es demasiado largo (entonces se usa "Copiar").
export function enlaceCorreo(b) {
  const href = 'mailto:?subject=' + encodeURIComponent(b.asunto) + '&body=' + encodeURIComponent(b.cuerpo).replace(/%0A/g, '%0D%0A');
  return href.length <= MAX_MAILTO ? href : null;
}
