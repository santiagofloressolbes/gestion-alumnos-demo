// Buscar una versión nueva de la app y, si la hay, cargarla sin tener que cerrar la app.
import { VERSION } from '../version.js';

const ESPERA_ACTIVAR_MS = 20000;

// La versión que hay publicada ahora: se lee de sw.js, siempre de la red (nunca de la copia guardada).
export async function versionPublicada() {
  const r = await fetch('sw.js?comprobar=' + Date.now(), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!r.ok) throw new Error('http');
  const m = /gestion-alumnos-demo-v(\d+)/.exec(await r.text());
  if (!m) throw new Error('formato');
  return m[1];
}

// Espera a que el service worker nuevo se instale y se active (hasta ESPERA_ACTIVAR_MS). Devuelve true si lo logra.
async function esperarNuevo(reg) {
  try { await reg.update(); } catch { return false; }
  const nuevo = reg.installing || reg.waiting;
  if (!nuevo) return false;
  return new Promise(resolver => {
    const reloj = setTimeout(() => resolver(false), ESPERA_ACTIVAR_MS);
    const mirar = () => { if (nuevo.state === 'activated') { clearTimeout(reloj); resolver(true); } else if (nuevo.state === 'redundant') { clearTimeout(reloj); resolver(false); } };
    nuevo.addEventListener('statechange', mirar);
    mirar();
  });
}

// Resultado: { estado: 'al-dia' | 'nueva' | 'error', version } y, si hay nueva, recarga la app con ella.
// "alEncontrar(version)" avisa en cuanto se sabe que hay una nueva, antes de instalarla y recargar.
export async function buscarActualizacion({ alEncontrar } = {}) {
  let publicada;
  try { publicada = await versionPublicada(); }
  catch { return { estado: 'error', version: VERSION }; }
  if (publicada === VERSION) return { estado: 'al-dia', version: VERSION };
  alEncontrar?.(publicada);
  // Hay una versión nueva: se instala con el service worker; si no se puede, se vacía la copia guardada y se recarga limpia.
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg && !(await esperarNuevo(reg))) {
      await reg.unregister();
      for (const k of await caches.keys()) await caches.delete(k);
    }
  } catch { /* se recarga igualmente */ }
  location.reload();
  return { estado: 'nueva', version: publicada };
}
