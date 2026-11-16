// Búsqueda, filtros y orden sobre la lista de ofertas (funciones puras: no tocan la pantalla).
import { norm } from './texto.js';

export const estadoVacio = () => ({ texto: '', estado: '', tipo: '', area: '' });

// Cuántos filtros hay activos (sin contar el texto libre).
export const filtrosActivos = e => [e.estado, e.tipo, e.area].filter(Boolean).length;
export const hayAlgo = e => !!e.texto.trim() || filtrosActivos(e) > 0;

const pajar = new WeakMap();
function textoDe(o) {
  if (!pajar.has(o)) {
    pajar.set(o, norm([o.id, o.empresa, o.titulo, o.ubicacion, o.area, o.tipoOrganizacion, o.tipo].join(' ')));
  }
  return pajar.get(o);
}

// Más recientes primero; a igual fecha, el ID más alto primero (la última que se dio de alta).
const masReciente = (x, y) => (y.fechaRecepcion || '').localeCompare(x.fechaRecepcion || '') || y.id.localeCompare(x.id);

export function filtrar(ofertas, e) {
  const palabras = norm(e.texto).split(/\s+/).filter(Boolean);   // todas deben aparecer
  return ofertas
    .filter(o => palabras.every(p => textoDe(o).includes(p)))
    .filter(o => !e.estado || o.estado === e.estado)
    .filter(o => !e.tipo || o.tipo === e.tipo)
    .filter(o => !e.area || o.area === e.area)
    .sort(masReciente);
}

/* ---- Formulario: campos y reglas (las mismas que aplica el script; así los errores se ven antes de enviar) ---- */

// "lista" = nombre de la lista (en getListas()) de la que se elige el valor.
export const CAMPOS = [
  { clave: 'empresa', etiqueta: 'Empresa', max: 100, obligatorio: true },
  { clave: 'titulo', etiqueta: 'Título del puesto', max: 120, obligatorio: true },
  { clave: 'tipoOrganizacion', etiqueta: 'Tipo de organización', lista: 'tiposOrganizacion', obligatorio: true },
  { clave: 'area', etiqueta: 'Área', lista: 'areas', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', lista: 'tiposOferta', obligatorio: true },
  { clave: 'ubicacion', etiqueta: 'Ubicación', max: 100, obligatorio: true },
  { clave: 'requisitoNacionalidad', etiqueta: 'Nacionalidad requerida', lista: 'nacionalidades', obligatorio: false },
  { clave: 'requisitoPermiso', etiqueta: 'Permiso de trabajo', lista: 'requisitosPermiso', obligatorio: true },
  { clave: 'fechaRecepcion', etiqueta: 'Fecha de recepción', fecha: true, obligatorio: true },
  { clave: 'estado', etiqueta: 'Estado', lista: 'estadosOferta', obligatorio: true },
  { clave: 'enlace', etiqueta: 'Enlace o descripción', max: 500, enlace: true, obligatorio: false },
  // Perfil del puesto (3E-2): lo que el match compara con cada alumno. Todos opcionales.
  { clave: 'paisOferta', etiqueta: 'País de la oferta', max: 100, perfil: true, obligatorio: false },
  { clave: 'subarea', etiqueta: 'Subárea', max: 100, perfil: true, obligatorio: false },
  { clave: 'etiquetas', etiqueta: 'Etiquetas del puesto', max: 300, perfil: true, obligatorio: false },
  { clave: 'idiomas', etiqueta: 'Idiomas', max: 200, perfil: true, obligatorio: false },
  { clave: 'nivelFormacion', etiqueta: 'Nivel de formación', max: 40, perfil: true, fijo: true, obligatorio: false },
];
// Los campos que se envían al script: sin el perfil si el script no sabe guardarlo.
export const camposActivos = conPerfil => (conPerfil ? CAMPOS : CAMPOS.filter(c => !c.perfil));

export const NIVELES_FORMACION = ['Sin requisito', 'Grado', 'Máster', 'Doctorado'];
export const MAX_ETIQUETAS = 8;
export const MAX_IDIOMAS = 6;
export const GRUPO_DE_GRUPOS = 'Grupo de países';   // filas de la hoja Países que no son un país (p. ej. «Unión Europea (UE/EEE)»)
// Idioma y, si se quiere, nivel (A1–C2 o «nativo»): «Inglés B2». El mismo formato que acepta el script y que entiende el match.
const IDIOMA = /^([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]{0,29}?)(?:\s+(A1|A2|B1|B2|C1|C2|nativo))?$/i;

// Una lista escrita en una celda: valores separados por «;» o «,».
export const partesLista = t => String(t ?? '').split(/[;,]/).map(x => x.trim()).filter(Boolean);
const unicos = xs => { const vistos = new Set(); return xs.filter(x => { const k = norm(x); if (vistos.has(k)) return false; vistos.add(k); return true; }); };

// '' si los idiomas están bien; si no, el código del error ('idiomas' = formato; 'demasiadas').
export function revisarIdiomas(t) {
  const ps = partesLista(t), vistos = new Set();
  for (const p of ps) {
    const m = IDIOMA.exec(p);
    if (!m) return 'idiomas';
    const n = m[1].trim().toLowerCase();
    if (vistos.has(n)) return 'idiomas';
    vistos.add(n);
  }
  return ps.length > MAX_IDIOMAS ? 'demasiadas' : '';
}
export const revisarEtiquetas = t => (unicos(partesLista(t)).length > MAX_ETIQUETAS ? 'demasiadas' : '');

// Las listas de apoyo (hojas Países, Áreas y Etiquetas) tal como las usa el formulario. Una lista vacía = esa hoja no está: el campo es de texto.
export function apoyoPerfil(listas) {
  const m = listas?.match || {};
  const paisesHoja = (m.paises || []).filter(p => p.pais);
  const esGrupo = p => norm(p.grupo) === norm(GRUPO_DE_GRUPOS);
  const grupos = unicos(paisesHoja.filter(esGrupo).map(p => p.pais));
  const paises = unicos(paisesHoja.filter(p => !esGrupo(p)).map(p => p.pais)).sort((a, b) => a.localeCompare(b, 'es'));
  const subareas = (m.areas || []).filter(a => a.subarea).map(a => ({ area: a.area, subarea: a.subarea }));
  const etiquetas = unicos((m.etiquetas || []).map(e => e.etiqueta ?? e).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'es'));
  // Nacionalidad que pide una oferta: las filas de grupo primero y después países de Países ∪ Listas > Nacionalidad (el script valida contra las dos).
  const resto = unicos([...paises, ...(listas?.nacionalidades || [])].filter(x => !grupos.some(g => norm(g) === norm(x)))).sort((a, b) => a.localeCompare(b, 'es'));
  return { paises, subareas, etiquetas, grupos, nacionalidades: [...grupos, ...resto] };
}

// Avisos (no bloquean): algo del perfil que no está en la lista de su hoja. Si esa hoja existe, el script lo rechazará al guardar.
export function avisosPerfil(v, listas) {
  const a = apoyoPerfil(listas), fuera = [];
  const no = (lista, x) => !lista.some(y => norm(y) === norm(x));
  if (v.paisOferta && a.paises.length && no(a.paises, v.paisOferta)) fuera.push({ campo: 'paisOferta', texto: `El país «${v.paisOferta}» no está en la hoja Países. Elige uno de la lista o añádelo antes en esa hoja.` });
  if (v.subarea && a.subareas.length) {
    const filas = a.subareas.filter(s => norm(s.subarea) === norm(v.subarea));
    if (!filas.length) fuera.push({ campo: 'subarea', texto: `La subárea «${v.subarea}» no está en la hoja Áreas. Elige una de la lista o añádela antes en esa hoja.` });
    else if (v.area && !filas.some(s => norm(s.area) === norm(v.area))) fuera.push({ campo: 'subarea', texto: `La subárea «${v.subarea}» es de «${filas[0].area}», no de «${v.area}». Se puede guardar, pero conviene revisarlo.` });
  }
  if (a.etiquetas.length) for (const e of partesLista(v.etiquetas)) if (no(a.etiquetas, e)) fuera.push({ campo: 'etiquetas', texto: `La etiqueta «${e}» no está en la hoja Etiquetas. Quítala o añádela antes en esa hoja.` });
  return fuera;
}
const ETIQUETA = Object.fromEntries(CAMPOS.map(c => [c.clave, c.etiqueta]));
const MAX = Object.fromEntries(CAMPOS.filter(c => c.max).map(c => [c.clave, c.max]));
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const normalizarTexto = t => String(t ?? '').replace(/\r\n?/g, '\n').trim();

// Texto para la persona según el código de error (el mismo que usa el script) y el campo.
export function mensajeCampo(codigo, clave) {
  const c = `«${ETIQUETA[clave] || 'Un campo'}»`;
  switch (codigo) {
    case 'requerido': { const f = CAMPOS.find(x => x.clave === clave); return f?.lista || f?.fecha ? `Elige ${c}.` : `Falta ${c}.`; }
    case 'caracteres': return `${c} no admite saltos de línea ni caracteres raros.`;
    case 'html': return `${c} lleva un «<» seguido de una letra o una barra, y la app lo toma por código. Quítalo y vuelve a guardar.`;
    case 'largo': return `${c} es demasiado larga (máximo ${miles(MAX[clave] || 0)} caracteres).`;
    case 'lista': {
      const hoja = { paisOferta: 'Países', subarea: 'Áreas', etiquetas: 'Etiquetas' }[clave];
      if (clave === 'nivelFormacion') return `${c}: elige Sin requisito, Grado, Máster o Doctorado.`;
      if (clave === 'requisitoNacionalidad') return `${c}: elige un valor de la lista. Si no está, añádelo antes en la hoja Países (o en Listas) del Sheet.`;
      return hoja ? `${c}: hay un valor que no está en la hoja ${hoja}. Elige de la lista o añádelo antes en esa hoja.` : `${c}: elige un valor de la lista. Si no está, añádelo antes en la hoja Listas del Sheet.`;
    }
    case 'demasiadas': return clave === 'etiquetas' ? `${c}: máximo ${MAX_ETIQUETAS} etiquetas.` : `${c}: máximo ${MAX_IDIOMAS} idiomas.`;
    case 'idiomas': return `${c}: escribe cada idioma con su nivel (A1–C2 o nativo), separados por «;». Por ejemplo: «Inglés B2; Español nativo». No repitas un idioma.`;
    case 'fecha': return `${c}: elige una fecha válida.`;
    case 'fecha-futura': return `${c} no puede ser futura.`;
    case 'enlace': return `${c} no puede empezar por http: ni por otros prefijos raros. Usa https:// o escribe una descripción.`;
    default: return '';
  }
}

export function fechaValida(f) {
  const m = ISO.exec(f);
  if (!m || +m[1] < 2000) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

// Devuelve el primer problema { campo, mensaje } o null. "v" tiene todas las claves de CAMPOS, ya normalizadas.
export function validarOferta(v, listas, hoy) {
  for (const f of CAMPOS) {
    const x = v[f.clave];
    const mal = codigo => ({ campo: f.clave, codigo, mensaje: mensajeCampo(codigo, f.clave) });
    if (!x) { if (f.obligatorio) return mal('requerido'); continue; }
    if (/[\u0000-\u001F\u007F]/.test(x)) return mal('caracteres');
    if (/<[\/!?a-zA-Z]/.test(x)) return mal('html');
    if (f.max && x.length > f.max) return mal('largo');
    if (f.lista && !(listas[f.lista] || []).includes(x) && !(f.clave === 'requisitoNacionalidad' && apoyoPerfil(listas).nacionalidades.includes(x))) return mal('lista');
    if (f.fijo && !NIVELES_FORMACION.includes(x)) return mal('lista');
    if (f.clave === 'idiomas' && revisarIdiomas(x)) return mal(revisarIdiomas(x));
    if (f.clave === 'etiquetas' && revisarEtiquetas(x)) return mal('demasiadas');
    if (f.fecha) {
      if (!fechaValida(x)) return mal('fecha');
      if (x > hoy) return mal('fecha-futura');
    }
    if (f.enlace && /^(javascript|data|vbscript|file|http):/i.test(x)) return mal('enlace');
  }
  return null;
}

// Cómo se enseña el enlace de una oferta:
// - https:// de ejemplo (example.com/.org/.net, los de los datos de prueba): solo texto, no se abre.
// - https:// real: botón que se abre en otra pestaña, sin enviar de dónde vienes.
// - Cualquier otro texto (una descripción, o un enlace http:, javascript:...): solo texto, nunca un enlace.
export function enlaceOferta(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { tipo: 'nada' };
  let url;
  try { url = new URL(t); } catch { return { tipo: 'texto', texto: t }; }
  if (url.protocol !== 'https:') return { tipo: 'texto', texto: t };
  if (/(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return { tipo: 'ejemplo', texto: t };
  return { tipo: 'enlace', href: url.href, texto: t };
}
