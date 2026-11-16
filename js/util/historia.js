// Historia por plantillas: un párrafo corto sobre una persona, armado SOLO con campos no sensibles y frases fijas. Sin IA.
// Solo se leen los campos de CAMPOS_HISTORIA. A propósito NO están aquí: el texto libre «Por qué», el resumen de experiencia, la nacionalidad,
// la situación de trabajo, las notas de entrevista, el historial ni los motivos de descarte. Una prueba lo comprueba mirando qué se lee del alumno.
// Si falta un dato, se omite su frase (nunca se escribe «undefined» ni una frase a medias). Redacción sin género: no se supone cómo se identifica nadie.

export const CAMPOS_HISTORIA = ['master', 'areaDestino', 'subareasExperiencia', 'etiquetas', 'idiomas', 'formacionPrevia'];

const MAX_SUBAREAS = 3, MAX_ETIQUETAS = 6, MAX_IDIOMAS = 5, MAX_FORMACION = 120;

// Una sola línea: sin saltos ni espacios de más (lo que viene del Sheet no puede inventarse líneas nuevas del mensaje).
export const linea = t => String(t ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();

// Los valores de una celda («A; B»), sin repetir (sin fijarse en mayúsculas).
const valores = t => [...new Map(linea(t).split(/[;,]/).map(x => x.trim()).filter(Boolean).map(x => [x.toLowerCase(), x])).values()];
const sinPunto = t => t.replace(/[\s.;,:]+$/, '');
const recortar = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
// «A, B y C» (con «e» delante de las palabras que empiezan por «i» o «hi»).
function unir(xs) {
  if (xs.length < 2) return xs[0] || '';
  const ultimo = xs[xs.length - 1];
  const y = /^h?i(?![aeou])/i.test(ultimo) ? 'e' : 'y';
  return `${xs.slice(0, -1).join(', ')} ${y} ${ultimo}`;
}

export function historia(alumno) {
  // Lo único que se lee del alumno: los campos de la lista.
  const a = Object.fromEntries(CAMPOS_HISTORIA.map(k => [k, alumno?.[k]]));
  const frases = [];
  const programa = sinPunto(linea(a.master));
  if (programa) frases.push(`Cursa ${programa}.`);
  const destino = sinPunto(linea(a.areaDestino));
  if (destino) frases.push(`Quiere orientar su carrera hacia ${destino}.`);
  const subareas = valores(a.subareasExperiencia).slice(0, MAX_SUBAREAS);
  if (subareas.length) frases.push(`Tiene experiencia en ${unir(subareas)}.`);
  const etiquetas = valores(a.etiquetas).slice(0, MAX_ETIQUETAS);
  if (etiquetas.length) frases.push(`Entre sus habilidades: ${etiquetas.join(', ')}.`);
  const idiomas = valores(a.idiomas).slice(0, MAX_IDIOMAS);
  if (idiomas.length) frases.push(`Idiomas: ${idiomas.join(', ')}.`);
  const formacion = sinPunto(recortar(linea(a.formacionPrevia), MAX_FORMACION));
  if (formacion) frases.push(`Formación previa: ${formacion}.`);
  return frases.join(' ');
}
