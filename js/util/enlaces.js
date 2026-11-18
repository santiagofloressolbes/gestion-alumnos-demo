// Los enlaces que llegan de las hojas (CV) o de lo que escribe la persona (oferta) se validan aquí y SOLO aquí.
// Regla única: solo https, y sin usuario ni contraseña dentro de la dirección (https://usuario@sitio: es el truco típico para
// que un enlace parezca de un sitio y lleve a otro). Cualquier otra cosa (http:, javascript:, data:, un texto cualquiera) no es un enlace.

// La dirección normalizada si es un enlace válido; si no, '' (nunca lanza error).
export function enlaceHttps(texto) {
  try {
    const url = new URL(String(texto ?? '').trim());
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

// Los datos de ejemplo usan example.com, .org y .net: son enlaces de mentira que la app no abre.
export const esDeEjemplo = href => /(^|\.)example\.(com|org|net)$/i.test(new URL(href).hostname);
