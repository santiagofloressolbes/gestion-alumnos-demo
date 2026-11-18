// Preferencias de ESTE móvil (umbrales de los avisos, firma de los correos y avisos silenciados).
// Se guardan solo en localStorage: no van al Sheet ni a ningún servidor, y cada móvil tiene las suyas.
// Ahí solo hay números, un nombre de firma y IDs de alumno con una fecha: nunca notas, nacionalidades ni claves.
import { UMBRALES_POR_DEFECTO, umbralesSaneados } from './avisos.js';
import { fechaValida } from './ofertas.js';

const K_UMBRALES = 'gad.avisos',
  K_FIRMA = 'gad.firma',
  K_SILENCIOS = 'gad.silencios';
export const MAX_FIRMA = 60;

const leer = k => {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};
const poner = (k, v) => {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
};
const quitar = k => {
  try {
    localStorage.removeItem(k);
  } catch {
    /* sin almacenamiento: nada que borrar */
  }
};
const json = k => {
  try {
    return JSON.parse(leer(k));
  } catch {
    return null;
  }
};

export const leerUmbrales = () => umbralesSaneados(json(K_UMBRALES));
export function guardarUmbrales(u) {
  const igualesAlDefecto = Object.keys(UMBRALES_POR_DEFECTO).every(k => u[k] === UMBRALES_POR_DEFECTO[k]);
  if (igualesAlDefecto) {
    quitar(K_UMBRALES);
    return true;
  }
  return poner(K_UMBRALES, JSON.stringify(u));
}
export const restablecerUmbrales = () => quitar(K_UMBRALES);

// La firma: solo el nombre, en una línea, sin caracteres raros.
export const limpiarFirma = t =>
  String(t ?? '')
    .replace(/[\u0000-\u001F\u007F<>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FIRMA);
export const leerFirma = () => limpiarFirma(leer(K_FIRMA));
export function guardarFirma(t) {
  const f = limpiarFirma(t);
  if (!f) {
    quitar(K_FIRMA);
    return true;
  }
  return poner(K_FIRMA, f);
}

const CLAVE_AVISO = /^[A-Za-z0-9_-]{1,40}\|(sin-solicitudes|aplica-a-todo)$/;
export function leerSilencios() {
  const crudo = json(K_SILENCIOS),
    limpio = {};
  if (crudo && typeof crudo === 'object' && !Array.isArray(crudo)) {
    for (const [k, v] of Object.entries(crudo)) if (CLAVE_AVISO.test(k) && typeof v === 'string' && fechaValida(v)) limpio[k] = v;
  }
  return limpio;
}
export function silenciar(id, hasta) {
  if (!CLAVE_AVISO.test(id)) return false;
  return poner(K_SILENCIOS, JSON.stringify({ ...leerSilencios(), [id]: hasta }));
}
export function quitarSilencio(id) {
  const s = leerSilencios();
  delete s[id];
  if (Object.keys(s).length) return poner(K_SILENCIOS, JSON.stringify(s));
  quitar(K_SILENCIOS);
  return true;
}
