// Recuerda desde dónde se abrió una ficha, para que "volver" lleve al mismo sitio.
// Se guarda solo en memoria: al recargar la página se vuelve a la lista del máster.
export const navegacion = {
  origen: 'master',      // 'master' | 'buscar'
  aviso: '',             // mensaje de una sola vez para la pantalla siguiente (p. ej. "Guardado en el Sheet.")
  origenAplicacion: 'oferta',   // desde dónde se abrió una aplicación: 'oferta' | 'alumno'
  sinGuardar: false,     // hay un formulario con cambios sin guardar: al cambiar de pantalla se pregunta antes
};
