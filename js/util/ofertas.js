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
];
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
    case 'lista': return `${c}: elige un valor de la lista. Si no está, añádelo antes en la hoja Listas del Sheet.`;
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
    if (f.lista && !(listas[f.lista] || []).includes(x)) return mal('lista');
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
