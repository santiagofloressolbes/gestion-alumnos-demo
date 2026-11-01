// Dónde se guardan la dirección del script y la clave: SOLO en el almacenamiento de este móvil (localStorage).
// Nunca van en el código, en el repositorio ni en la dirección de la página. Los datos de los alumnos NO se guardan.
const K_URL = 'gad.url', K_CLAVE = 'gad.clave', K_MODO = 'gad.modo';

// Solo se aceptan direcciones de aplicaciones web de Apps Script.
const FORMA_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{16,}\/exec$/;
export const urlValida = u => FORMA_URL.test(u);

const leer = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const poner = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const quitar = k => { try { localStorage.removeItem(k); } catch { /* sin almacenamiento: nada que borrar */ } };

export const urlGuardada = () => leer(K_URL);
export const accesoGuardado = () => ({ url: leer(K_URL), clave: leer(K_CLAVE) });

// 'demo' = datos de datos-mock/ · 'script' = datos del script de Google · '' = todavía sin elegir
export function getModo() {
  if (leer(K_MODO) === 'demo') return 'demo';
  return leer(K_URL) && leer(K_CLAVE) ? 'script' : '';
}

export function guardarAcceso(url, clave) {
  quitar(K_MODO);
  return poner(K_URL, url) && poner(K_CLAVE, clave);
}
export const guardarDemo = () => { quitar(K_URL); quitar(K_CLAVE); return poner(K_MODO, 'demo'); };
export const borrarClave = () => quitar(K_CLAVE);                       // la dirección se conserva para no escribirla otra vez
export function olvidarTodo() { quitar(K_URL); quitar(K_CLAVE); quitar(K_MODO); }
