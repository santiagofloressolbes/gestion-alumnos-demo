// Ayudas para las pantallas que hablan con el script: mientras una petición está en marcha, los botones
// se desactivan (una segunda pulsación no lanza otra petición) y el botón pulsado dice qué está pasando.

// Desactiva los controles y pone un texto visible en el botón pulsado. Devuelve la función que lo deja todo como estaba.
export function ocupar(controles, pulsado, texto = 'Guardando…') {
  const antes = pulsado.textContent;
  for (const c of controles) if (c) c.disabled = true;
  pulsado.textContent = texto;
  pulsado.setAttribute('aria-busy', 'true');
  return () => {
    for (const c of controles) if (c) c.disabled = false;
    pulsado.textContent = antes;
    pulsado.removeAttribute('aria-busy');
  };
}

// Un aviso que flota arriba de la pantalla, se vea donde se vea el scroll. Se quita solo (o al tocarlo).
let flotante = null, relojFlotante = 0;
export function avisoFlotante(texto, ms = 6000) {
  quitarFlotante();
  flotante = document.createElement('p');
  flotante.className = 'flotante';
  flotante.id = 'flotante';
  flotante.setAttribute('role', 'status');
  flotante.textContent = texto;
  flotante.addEventListener('click', quitarFlotante);
  document.body.append(flotante);
  relojFlotante = setTimeout(quitarFlotante, ms);
}
export function quitarFlotante() {
  clearTimeout(relojFlotante);
  flotante?.remove();
  flotante = null;
}

// Lleva la pantalla, con suavidad, hasta un elemento (sin abrir el teclado). Si la persona prefiere menos movimiento, salta sin animación.
export function llevarA(elemento, bloque = 'start') {
  const poco = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  elemento.scrollIntoView?.({ block: bloque, behavior: poco ? 'auto' : 'smooth' });
}
