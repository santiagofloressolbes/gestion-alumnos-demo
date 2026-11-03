// Qué columnas espera la app y cómo las llama por dentro.
// Las pantallas solo usan los nombres de la derecha, así que una fuente nueva (Excel, SharePoint...)
// solo tiene que devolver objetos con esas mismas claves.
export const ALUMNO = {
  'ID alumno': 'id', 'Foto': 'foto', 'Nombre': 'nombre', 'Apellidos': 'apellidos', 'Máster': 'master',
  'Promoción': 'promocion', 'Nacionalidad principal': 'nacionalidadPrincipal',
  'Nacionalidad secundaria': 'nacionalidadSecundaria', 'Situación de trabajo en España': 'situacionTrabajo',
  'Área de experiencia': 'areaExperiencia', 'Resumen de experiencia': 'resumenExperiencia',
  'Área a la que quiere ir': 'areaDestino', 'Por qué': 'porQue', 'Enlace al CV': 'enlaceCV',
  'Notas de entrevista': 'notasEntrevista', 'Fecha última entrevista': 'fechaUltimaEntrevista',
  'Disponibilidad': 'disponibilidad',
};
export const OFERTA = {
  'ID oferta': 'id', 'Empresa': 'empresa', 'Tipo de organización': 'tipoOrganizacion', 'Área': 'area',
  'Título del puesto': 'titulo', 'Tipo': 'tipo', 'Ubicación': 'ubicacion',
  'Requisito de nacionalidad': 'requisitoNacionalidad', 'Requisito de permiso de trabajo': 'requisitoPermiso',
  'Fecha de recepción': 'fechaRecepcion', 'Estado de la oferta': 'estado', 'Enlace o descripción': 'enlace',
};
// Rondas de difusión (cada vez que una oferta se reenvía a los alumnos), aplicaciones (alumno + oferta + ronda) e historial de estados.
export const RONDA = {
  'ID ronda': 'id', 'ID oferta': 'idOferta', 'Número de ronda': 'numero', 'Fecha de envío a los alumnos': 'fecha',
};
export const APLICACION = {
  'ID aplicación': 'id', 'ID alumno': 'idAlumno', 'ID oferta': 'idOferta', 'Número de ronda': 'numeroRonda',
  'Fecha de aplicación': 'fecha', 'Estado': 'estado', 'Motivo de descarte': 'motivo', 'Notas': 'notas',
};
export const HISTORIAL = {
  'ID cambio': 'id', 'ID aplicación': 'idAplicacion', 'Estado anterior': 'estadoAnterior', 'Estado nuevo': 'estadoNuevo',
  'Motivo de descarte': 'motivo', 'Fecha': 'fecha', 'Nota': 'nota',
};
// Hoja Listas: cada columna es una lista de valores (las celdas vacías se ignoran).
export const LISTAS = {
  'Máster': 'masters', 'Área': 'areas', 'Tipo de organización': 'tiposOrganizacion',
  'Nacionalidad': 'nacionalidades', 'Situación de trabajo en España': 'situaciones',
  'Tipo de oferta': 'tiposOferta', 'Estado de la oferta': 'estadosOferta', 'Disponibilidad': 'disponibilidades',
  'Requisito de permiso': 'requisitosPermiso',
  'Estado de la aplicación': 'estadosAplicacion', 'Motivo de descarte': 'motivosDescarte',
};
