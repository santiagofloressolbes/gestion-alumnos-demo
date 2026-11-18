// Crea elementos HTML sin usar innerHTML: el texto de los datos siempre se escribe como texto,
// así que nada de lo que venga de la hoja puede colar código en la página.
export function el(etiqueta, atributos = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h);
  return e;
}

// Pinta los hijos en un contenedor (como replaceChildren) pero IGNORANDO lo que no es contenido: null, undefined, false, true y ''.
// replaceChildren, a pelo, escribe «false» o «null» como texto: un `cond && el(...)` con cond falso enseñaba la palabra «false».
// Por eso la app NO usa replaceChildren directamente (una prueba lo vigila); se usa siempre esta función.
export function reemplazar(contenedor, ...hijos) {
  contenedor.replaceChildren(...hijos.flat(Infinity).filter(h => h != null && h !== false && h !== true && h !== ''));
}

export function svgFlecha() {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M9 5l7 7-7 7');
  s.append(p);
  return s;
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Iconos de los dos tipos de aviso. El color nunca es lo único que los distingue: la forma y la palabra («Datos» / «Seguimiento») también.
//   'datos'       → triángulo con «!» (algo está mal en el Sheet).
//   'seguimiento' → reloj (algo que mirar con el tiempo).
export function svgAviso(tipo) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'icono-aviso ' + tipo);
  const trazos = tipo === 'datos'
    ? ['M12 3.5L2.8 20h18.4L12 3.5z', 'M12 10v4.5', 'M12 17.6v.1']
    : ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5V12l3 2'];
  for (const d of trazos) { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); s.append(p); }
  return s;
}
