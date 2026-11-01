// Ajustes de la capa de datos. Aquí NO hay claves, direcciones del script ni enlaces del Sheet:
// la dirección y la clave las escribe la persona en la pantalla de Acceso y se guardan solo en su móvil.
export const CONFIG = {
  esperaLocalMs: 8000,       // archivos de datos-mock/ (modo demo)
  esperaScriptMs: 25000,     // el script de Google puede tardar unos segundos si llevaba rato sin usarse
  local: {
    Alumnos: new URL('../../datos-mock/Alumnos.csv', import.meta.url).href,
    Ofertas: new URL('../../datos-mock/Ofertas.csv', import.meta.url).href,
    Listas: new URL('../../datos-mock/Listas.csv', import.meta.url).href,
  },
};
