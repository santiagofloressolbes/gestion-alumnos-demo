// Historia por plantillas: un párrafo corto sobre una persona, armado SOLO con campos no sensibles y frases fijas. Sin IA.
// Solo se leen los campos de CAMPOS_HISTORIA. A propósito NO están aquí: el texto libre «Por qué», el resumen de experiencia, la nacionalidad,
// la situación de trabajo, las notas de entrevista, el historial ni los motivos de descarte. Una prueba lo comprueba mirando qué se lee del alumno.
// Si falta un dato, se omite su frase (nunca se escribe «undefined» ni una frase a medias). Redacción sin género: no se supone cómo se identifica nadie.

export const CAMPOS_HISTORIA = ['subareasExperiencia', 'etiquetas', 'idiomas', 'formacionPrevia'];

// v27: la historia es corta y solo dice lo que NO sale ya en las líneas de debajo del perfil. El programa, el área a la que quiere ir, el área de experiencia
// y qué busca ya tienen su propia línea («Programa», «Quiere ir a», «Experiencia en», «Busca»), así que aquí no se repiten ni se leen.
const MAX_SUBAREAS = 3, MAX_ETIQUETAS = 6, MAX_IDIOMAS = 5, MAX_FORMACION = 120;

// Una sola línea: sin saltos ni espacios de más (lo que viene del Sheet no puede inventarse líneas nuevas del mensaje).
export const linea = t => String(t ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();

// Los valores de una celda («A; B»), sin repetir (sin fijarse en mayúsculas).
const valores = t => [...new Map(linea(t).split(/[;,]/).map(x => x.trim()).filter(Boolean).map(x => [x.toLowerCase(), x])).values()];
const sinPunto = t => t.replace(/[\s.;,:]+$/, '');
const recortar = (t, n) => (t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

// Idiomas: SOLO el nombre, nunca el nivel. «Italiano nativo» o «Español nativo» pueden insinuar la nacionalidad de alguien, y un «C2» suelto junto a
// idiomas sin nivel también lo haría: por eso se quita el nivel (A1–C2, nativo, lengua materna, bilingüe…) de todos. El nivel sigue en la ficha.
const NIVEL = /\s*[(\[]?\s*(?:[ABC][12]|nativ[oa]s?|native|lengua materna|materno|materna|mother tongue|biling(?:ü|u)e|bilingual)\s*[)\]]?\s*$/i;
const idiomas = t => { const vistos = new Set(); return valores(t).map(x => x.replace(NIVEL, '').trim()).filter(x => x && !vistos.has(x.toLowerCase()) && vistos.add(x.toLowerCase())); };

export function historia(alumno) {
  // Lo único que se lee del alumno: los campos de la lista.
  const a = Object.fromEntries(CAMPOS_HISTORIA.map(k => [k, alumno?.[k]]));
  const frases = [];
  const subareas = valores(a.subareasExperiencia).slice(0, MAX_SUBAREAS);
  if (subareas.length) frases.push(`Subáreas: ${subareas.join(', ')}.`);
  const etiquetas = valores(a.etiquetas).slice(0, MAX_ETIQUETAS);
  if (etiquetas.length) frases.push(`Habilidades: ${etiquetas.join(', ')}.`);
  const lenguas = idiomas(a.idiomas).slice(0, MAX_IDIOMAS);
  if (lenguas.length) frases.push(`Idiomas: ${lenguas.join(', ')}.`);
  const formacion = sinPunto(recortar(linea(a.formacionPrevia), MAX_FORMACION));
  if (formacion) frases.push(`Formación: ${formacion}.`);
  return frases.join(' ');
}
