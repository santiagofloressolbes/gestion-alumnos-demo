// Compartir perfiles: arma el TEXTO que se enviará (funciones puras: no tocan la pantalla ni envían nada).
// Solo se leen los campos de esta lista. Las notas de entrevista, el historial y los motivos de descarte NO están aquí a propósito:
// no hay forma de que acaben en el texto, ni marcando casillas.

import { historia, linea } from './historia.js';

export const MAX_PERFILES = 10;

// Lo que se incluye por defecto (no sensible) y lo que hay que marcar a mano (sensible).
export const CAMPOS_BASE = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'master', etiqueta: 'Programa' },
  { clave: 'area', etiqueta: 'Área (a la que quiere ir y de experiencia)' },
  { clave: 'disponibilidad', etiqueta: 'Qué busca (prácticas o empleo)' },
];
export const CAMPOS_SENSIBLES = [
  { clave: 'nacionalidad', etiqueta: 'Nacionalidad' },
  { clave: 'situacion', etiqueta: 'Situación de trabajo en España' },
  { clave: 'experiencia', etiqueta: 'Resumen de experiencia' },
  { clave: 'cv', etiqueta: 'Enlace al CV' },
];
export const BASE_POR_DEFECTO = CAMPOS_BASE.map(c => c.clave);
// Texto armado por la app (no es un dato del Sheet): sale solo si se marca la casilla. Va aparte, siempre desmarcado.
export const CAMPOS_EXTRA = [
  { clave: 'historia', etiqueta: 'Incluir resumen del perfil', nota: 'Una línea con subáreas, habilidades, idiomas (sin nivel) y formación. No usa el texto «Por qué» ni datos sensibles.' },
];

// El enlace al CV solo se incluye si es una dirección https válida; si no, se deja fuera (nunca http, javascript:, data:…).
export function enlaceHttps(t) {
  try { const u = new URL(String(t ?? '').trim()); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
}

export const nombreCompleto = a => linea(`${a.nombre ?? ''} ${a.apellidos ?? ''}`);

// Las líneas de un alumno según las casillas marcadas ("campos" es un conjunto de claves).
function lineasDe(a, campos) {
  const L = [];
  const si = c => campos.has(c);
  if (si('historia')) { const h = historia(a); if (h) L.push(['Resumen', h]); }   // primero: abre el perfil
  if (si('master') && linea(a.master)) L.push(['Programa', linea(a.master)]);
  if (si('area')) {
    const destino = linea(a.areaDestino), exp = linea(a.areaExperiencia);
    if (destino) L.push(['Quiere ir a', destino]);
    if (exp) L.push(['Experiencia en', exp]);
  }
  if (si('disponibilidad') && linea(a.disponibilidad)) L.push(['Busca', linea(a.disponibilidad)]);
  if (si('nacionalidad')) {
    const n = [a.nacionalidadPrincipal, a.nacionalidadSecundaria].map(linea).filter(Boolean).join(' · ');
    if (n) L.push(['Nacionalidad', n]);
  }
  if (si('situacion') && linea(a.situacionTrabajo)) L.push(['Situación de trabajo en España', linea(a.situacionTrabajo)]);
  if (si('experiencia') && linea(a.resumenExperiencia)) L.push(['Experiencia', linea(a.resumenExperiencia)]);
  if (si('cv') && enlaceHttps(a.enlaceCV)) L.push(['CV', enlaceHttps(a.enlaceCV)]);
  return L;
}

// El texto completo. Es exactamente lo que se enseña en la vista previa, lo que se copia y lo que va al menú de compartir.
// "oferta" es opcional: si se comparte desde una oferta, la primera línea la nombra.
export function textoPerfiles({ alumnos, campos, oferta = null }) {
  const c = new Set(campos);
  const t = [];
  t.push(alumnos.length === 1 ? 'Perfil de un alumno' : `Perfiles de ${alumnos.length} alumnos`);
  if (oferta) t.push('Oferta: ' + [linea(oferta.titulo) || 'Sin dato', linea(oferta.empresa)].filter(Boolean).join(' · '));
  alumnos.slice(0, MAX_PERFILES).forEach((a, i) => {
    t.push('');
    t.push(c.has('nombre') ? `${i + 1}. ${nombreCompleto(a) || 'Sin dato'}` : `${i + 1}.`);
    for (const [k, v] of lineasDe(a, c)) t.push(`   ${k}: ${v}`);
  });
  t.push('');
  t.push('Información confidencial: no la reenvíes sin permiso de cada persona.');
  return t.join('\n');
}

// ¿Hay datos sensibles marcados? (para avisar)
export const sensiblesMarcados = campos => CAMPOS_SENSIBLES.filter(c => new Set(campos).has(c.clave));
// ¿Algún alumno tiene un CV que no es https (y por eso se deja fuera)?
export const cvSinHttps = (alumnos, campos) => new Set(campos).has('cv') && alumnos.filter(a => !enlaceHttps(a.enlaceCV)).map(nombreCompleto);
