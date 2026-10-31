// De dónde salen los datos. SOLO enlaces públicos de datos de prueba: nunca claves ni contraseñas.
// Para cambiar de fuente (p. ej. Microsoft Graph) se cambia "fuente" y se añade su archivo en esta carpeta.
export const CONFIG = {
  fuente: 'google',          // 'google' = Google Sheet publicado como CSV · 'local' = archivos de datos-mock/
  esperaMs: 8000,            // si Google no responde en este tiempo, se usan los archivos locales de respaldo
  google: {
    Alumnos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuL_WV8EjK3Nn2N7xrelVSAtxb_27QW1k7XAkuTXTy-Bx3Wi4JU_fjwcqzshcaA1PxYmW3ACezFeKG/pub?gid=1581789883&single=true&output=csv',
    Ofertas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuL_WV8EjK3Nn2N7xrelVSAtxb_27QW1k7XAkuTXTy-Bx3Wi4JU_fjwcqzshcaA1PxYmW3ACezFeKG/pub?gid=925887798&single=true&output=csv',
    Listas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRuL_WV8EjK3Nn2N7xrelVSAtxb_27QW1k7XAkuTXTy-Bx3Wi4JU_fjwcqzshcaA1PxYmW3ACezFeKG/pub?gid=1363272135&single=true&output=csv',
  },
  local: {
    Alumnos: new URL('../../datos-mock/Alumnos.csv', import.meta.url).href,
    Ofertas: new URL('../../datos-mock/Ofertas.csv', import.meta.url).href,
    Listas: new URL('../../datos-mock/Listas.csv', import.meta.url).href,
  },
};
