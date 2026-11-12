// Recuerda desde dónde se abrió una ficha, para que "volver" lleve al mismo sitio.
// Se guarda solo en memoria: al recargar la página se vuelve a la lista del máster.
export const navegacion = {
  origen: 'master',      // 'master' | 'buscar' | 'avisos'
  avisosTipo: 'sin-solicitudes',   // si el origen es 'avisos': de qué lista viene (para volver a ella)
  aviso: '',             // mensaje de una sola vez para la pantalla siguiente (p. ej. "Guardado en el Sheet.")
  origenAplicacion: 'oferta',   // desde dónde se abrió una aplicación: 'oferta' | 'alumno'
  compartir: null,       // { idOferta, ids }: alumnos marcados para compartir su perfil (solo en memoria)
  sinGuardar: false,     // hay un formulario con cambios sin guardar: al cambiar de pantalla se pregunta antes
};
