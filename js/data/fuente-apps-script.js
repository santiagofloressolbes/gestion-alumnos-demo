// Fuente de datos: el script de Apps Script (puente temporal para datos de PRUEBA) protegido con clave.
// El Sheet es privado; solo el script lo lee. Cada petición lleva la clave en el cuerpo (nunca en la dirección).
import { CONFIG } from './config.js';
import { aObjetos, aListas } from './tablas.js';

const VERSION_ESPERADA = 1;

// Textos para la persona. El script solo envía códigos cortos; los textos están aquí.
function mensaje(codigo, extra = {}) {
  switch (codigo) {
    case 'clave': return 'La clave no es correcta.';
    case 'bloqueado': return `Demasiados intentos fallidos. Prueba de nuevo dentro de ${Math.max(1, Math.ceil((Number(extra.segundos) || 900) / 60))} minutos.`;
    case 'config': return 'El script no tiene bien puesta la clave (mira el paso 4 de la guía).';
    case 'hoja': return `Falta la hoja «${extra.hoja}» en el Sheet.`;
    case 'columna': return `Falta la columna «${extra.columna}» en el Sheet.`;
    case 'ocupado': return 'El script estaba ocupado. Inténtalo otra vez en unos segundos.';
    case 'servidor': return 'El script ha tenido un fallo interno. Mira el detalle en el editor de Apps Script.';
    case 'red': return 'No hay conexión con Google. Comprueba tu conexión e inténtalo otra vez.';
    case 'tiempo': return 'Google tarda demasiado en responder. Inténtalo otra vez.';
    case 'respuesta': return 'La dirección no responde como el script. Revisa que esté bien copiada y que se implementó con acceso «Cualquier usuario».';
    case 'version': return 'El script es de una versión que esta app no entiende. Actualiza Code.gs (mira la guía).';
    case 'largo': return 'La nota supera los 2.000 caracteres.';
    case 'html': return 'La nota parece llevar código HTML (un «<» seguido de una letra o una barra). Cámbialo y vuelve a guardar.';
    case 'caracteres': return 'La nota tiene caracteres de control que no se admiten.';
    case 'fecha': return 'Elige una fecha válida.';
    case 'fecha-futura': return 'La fecha no puede ser futura.';
    case 'conflicto': return 'Otra persona ha cambiado esta entrevista mientras la editabas.';
    case 'no-encontrado': return 'Este alumno ya no está en el Sheet.';
    case 'id-duplicado': return 'El ID de este alumno está repetido en el Sheet.';
    case 'peticion': case 'accion': return 'El script no entiende la petición. Actualiza Code.gs (mira la guía).';
    case 'solo-lectura': return 'Esta conexión no permite guardar.';
    case 'sin-notas': return 'Escribe una nota.';
    case 'direccion': return 'La dirección no es válida. Debe empezar por https://script.google.com/macros/s/ y terminar en /exec.';
    case 'sin-clave': return 'Escribe la clave.';
    case 'sin-acceso': return 'Todavía no hay acceso configurado.';
    case 'almacenamiento': return 'Este navegador no permite guardar el acceso (¿navegación privada?).';
    default: return 'No se ha podido completar la operación (' + String(codigo).slice(0, 30) + ').';
  }
}

export function errorDatos(codigo, extra) {
  const e = new Error(mensaje(codigo, extra));
  e.codigo = codigo;
  e.extra = extra || {};
  return e;
}

// Una petición al script. Devuelve la respuesta (ok:true) o lanza un error con .codigo.
export async function llamarScript({ url, clave }, accion, datos = {}) {
  const ctl = new AbortController();
  const reloj = setTimeout(() => ctl.abort(), CONFIG.esperaScriptMs);
  try {
    let r;
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // "simple": el navegador no hace petición previa (Apps Script no la admite)
        body: JSON.stringify({ ...datos, key: clave, action: accion }),
        signal: ctl.signal, credentials: 'omit', redirect: 'follow', cache: 'no-store', referrerPolicy: 'no-referrer',
      });
    } catch { throw errorDatos(ctl.signal.aborted ? 'tiempo' : 'red'); }
    let j;
    try { j = await r.json(); } catch { throw errorDatos(ctl.signal.aborted ? 'tiempo' : 'respuesta'); }
    if (!j || typeof j !== 'object') throw errorDatos('respuesta');
    if (j.ok !== true) throw errorDatos(typeof j.error === 'string' ? j.error : 'respuesta', j);
    return j;
  } finally { clearTimeout(reloj); }
}

const esTabla = t => t && Array.isArray(t.cabecera) && Array.isArray(t.filas);

export function crearFuenteAppsScript(acceso, esquemas) {
  return {
    async cargar() {
      const j = await llamarScript(acceso, 'data');
      if (j.version !== VERSION_ESPERADA) throw errorDatos('version');
      if (!esTabla(j.alumnos) || !esTabla(j.ofertas) || !esTabla(j.listas)) throw errorDatos('respuesta');
      return {
        alumnos: aObjetos('Alumnos', j.alumnos, esquemas.ALUMNO),
        ofertas: aObjetos('Ofertas', j.ofertas, esquemas.OFERTA),
        listas: aListas(j.listas, esquemas.LISTAS),
        puedeEscribir: j.puedeEscribir === true,
      };
    },
  };
}

// Para la pantalla de Acceso: comprueba dirección y clave sin descargar datos.
export async function probarConexion(acceso) {
  const j = await llamarScript(acceso, 'ping');
  if (j.version !== VERSION_ESPERADA) throw errorDatos('version');
}
