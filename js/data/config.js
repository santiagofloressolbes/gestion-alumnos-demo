// Ajustes de la capa de datos. Aquí NO hay claves, direcciones del script ni enlaces del Sheet:
// la dirección y la clave las escribe la persona en la pantalla de Acceso y se guardan solo en su móvil.
export const CONFIG = {
  esperaLocalMs: 8000,       // archivos de datos-mock/ (modo demo)
  esperaScriptMs: 25000,     // el script de Google puede tardar unos segundos si llevaba rato sin usarse
  local: {
    Alumnos: new URL('../../datos-mock/Alumnos.csv', import.meta.url).href,
    Ofertas: new URL('../../datos-mock/Ofertas.csv', import.meta.url).href,
    Listas: new URL('../../datos-mock/Listas.csv', import.meta.url).href,
    Rondas: new URL('../../datos-mock/Rondas.csv', import.meta.url).href,
    Aplicaciones: new URL('../../datos-mock/Aplicaciones.csv', import.meta.url).href,
    Historial: new URL('../../datos-mock/Historial.csv', import.meta.url).href,
    // Hojas opcionales con las reglas del match
    paises: new URL('../../datos-mock/Paises.csv', import.meta.url).href,
    areas: new URL('../../datos-mock/Areas.csv', import.meta.url).href,
    afinidad: new URL('../../datos-mock/Afinidad.csv', import.meta.url).href,
    reglas: new URL('../../datos-mock/ReglasMigratorias.csv', import.meta.url).href,
    etiquetas: new URL('../../datos-mock/Etiquetas.csv', import.meta.url).href,
  },
};
