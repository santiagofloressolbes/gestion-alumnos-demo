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
let flotante = null,
  relojFlotante = 0;
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
function quitarFlotante() {
  clearTimeout(relojFlotante);
  flotante?.remove();
  flotante = null;
}

// Lleva la pantalla, con suavidad, hasta un elemento (sin abrir el teclado). Si la persona prefiere menos movimiento, salta sin animación.
export function llevarA(elemento, bloque = 'start') {
  const poco = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  elemento.scrollIntoView?.({ block: bloque, behavior: poco ? 'auto' : 'smooth' });
}

// Copia un texto al portapapeles COMO TEXTO PLANO, y nada más. Devuelve true si se copió.
// Se escribe un único tipo, text/plain, desde una cadena (nunca desde un elemento de la página: un enlace, una selección o
// un bloque con formato se copiarían con HTML y al pegar saldría con formato, por ejemplo subrayado como enlace).
// Orden: ClipboardItem solo con text/plain → writeText (también solo texto) → un textarea oculto (un textarea solo da texto plano).
export async function copiarTexto(texto) {
  const t = String(texto ?? '');
  try {
    if (typeof ClipboardItem === 'function' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([t], { type: 'text/plain' }) })]);
      return true;
    }
  } catch {
    /* se prueba el siguiente */
  }
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    /* se prueba el respaldo */
  }
  const area = document.createElement('textarea');
  area.setAttribute('aria-hidden', 'true');
  area.setAttribute('tabindex', '-1');
  area.readOnly = true;
  area.className = 'cp-oculto';
  area.value = t;
  document.body.append(area);
  area.select();
  let bien;
  try {
    bien = document.execCommand('copy');
  } catch {
    bien = false;
  }
  area.remove();
  return bien;
}
