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
// Columnas NUEVAS de la 3E (perfil para el match). Son OPCIONALES: si el Sheet no las tiene todavía, la app funciona igual
// y esos datos se tratan como «sin datos» (nunca rompen nada ni cuentan como «no cumple»).
export const ALUMNO_OPC = {
  'Etiquetas': 'etiquetas', 'Idiomas': 'idiomas', 'Formación previa': 'formacionPrevia', 'Subáreas de experiencia': 'subareasExperiencia',
};
export const OFERTA_OPC = {
  'País de la oferta': 'paisOferta', 'Subárea': 'subarea', 'Etiquetas': 'etiquetas', 'Idiomas': 'idiomas', 'Nivel de formación': 'nivelFormacion',
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
// Programas (v23): la hoja Listas puede llamar «Máster» a la columna de programas (nombre de antes) o «Programa»; la app acepta las dos.
// «Categoría del programa» e «Idioma del programa» van en la MISMA FILA que su programa. Son opcionales.
export const ALIAS_LISTAS = { 'Programa': ['Máster'] };
export const COLUMNA_CATEGORIA = 'Categoría del programa';
export const COLUMNA_IDIOMA = 'Idioma del programa';
export const LISTAS = {
  'Programa': 'masters', 'Área': 'areas', 'Tipo de organización': 'tiposOrganizacion',
  'Nacionalidad': 'nacionalidades', 'Situación de trabajo en España': 'situaciones',
  'Tipo de oferta': 'tiposOferta', 'Estado de la oferta': 'estadosOferta', 'Disponibilidad': 'disponibilidades',
  'Requisito de permiso': 'requisitosPermiso',
  'Estado de la aplicación': 'estadosAplicacion', 'Motivo de descarte': 'motivosDescarte',
};

// Hojas OPCIONALES con las reglas del match (3E). Cada una: nombre de la hoja en el Sheet y sus columnas. Si falta, la app usa las reglas de respaldo del código.
export const HOJAS_MATCH = {
  paises: { hoja: 'Países', columnas: { pais: 'País', grupo: 'Grupo' } },
  areas: { hoja: 'Áreas', columnas: { area: 'Área', subarea: 'Subárea', areaEn: 'Área (inglés)' } },   // «Área (inglés)» es opcional: nombre del área para el correo en inglés
  afinidad: { hoja: 'Afinidad', columnas: { a: 'Área A', b: 'Área B', nivel: 'Nivel' } },
  reglas: { hoja: 'Reglas migratorias', columnas: { situacion: 'Situación de trabajo', tipo: 'Tipo de oferta', lugar: 'País o grupo de la oferta', resultado: 'Resultado', motivo: 'Motivo', fecha: 'Fecha de validación' } },
  etiquetas: { hoja: 'Etiquetas', columnas: { etiqueta: 'Etiqueta' } },
};
