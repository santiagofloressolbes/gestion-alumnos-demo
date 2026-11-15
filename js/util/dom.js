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
