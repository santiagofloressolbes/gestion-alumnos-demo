// Fuente de datos: el script de Apps Script (puente temporal para datos de PRUEBA) protegido con clave.
// El Sheet es privado; solo el script lo lee. Cada petición lleva la clave en el cuerpo (nunca en la dirección).
import { CONFIG } from './config.js';
import { aObjetos, aListas } from './tablas.js';

const VERSION_ESPERADA = 1;

// Cómo se nombra cada cosa en los mensajes de "no encontrado" y "repetido".
const DE = {
  alumno: { este: 'Este alumno', de: 'de este alumno' }, oferta: { este: 'Esta oferta', de: 'de esta oferta' },
  ronda: { este: 'Esta ronda', de: 'de esta ronda' }, aplicacion: { este: 'Esta solicitud', de: 'de esta solicitud' },
};
const fechaCorta = f => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : 'fecha anterior'; };

// Textos para la persona. El script solo envía códigos cortos; los textos están aquí.
function mensaje(codigo, extra = {}) {
  switch (codigo) {
    case 'clave': return 'La clave no es correcta.';
    case 'bloqueado': return `Se han hecho demasiados intentos con la clave incorrecta. Prueba de nuevo dentro de ${Math.max(1, Math.ceil((Number(extra.segundos) || 900) / 60))} minutos.`;
    case 'config': return 'El script de Google no tiene la clave bien configurada. Revisa el paso 4 de la guía.';
    case 'hoja': return `Falta la hoja «${extra.hoja}» en el Sheet.`;
    case 'columna': return `Falta la columna «${extra.columna}» en el Sheet.`;
    case 'ocupado': return `Google está ocupado y no se ha guardado nada (se ha intentado ${extra.intentos > 1 ? extra.intentos + ' veces' : 'una vez'}). Espera unos segundos y vuelve a pulsar.`;
    case 'servidor': return 'El script de Google ha fallado por dentro. El detalle está en el editor de Apps Script.';
    case 'red': return `No se ha podido conectar con Google${extra.intentos > 1 ? ' (se ha intentado dos veces)' : ''}. Suele ser un corte breve: vuelve a intentarlo en un momento. Si no tienes internet, espera a recuperarla.`;
    case 'tiempo': return 'Google tarda demasiado en responder. Inténtalo otra vez.';
    case 'respuesta': return 'Esa dirección no responde como debería el script. Comprueba que la has copiado entera y que el script se publicó con acceso «Cualquier usuario».';
    case 'version': return 'El script es de una versión que la app no reconoce. Actualiza Code.gs con la guía.';
    case 'largo': return 'La nota es demasiado larga: el máximo es de 2.000 caracteres.';
    case 'html': return 'La nota lleva un «<» seguido de una letra o una barra, y la app lo toma por código. Quítalo o cámbialo y vuelve a guardar.';
    case 'caracteres': return 'La nota tiene caracteres raros que no se admiten (suelen venir de copiar y pegar).';
    case 'fecha': return 'Elige una fecha válida.';
    case 'fecha-futura': return 'La fecha no puede ser futura.';
    case 'requerido': return 'Falta un dato obligatorio.';
    case 'lista': return 'Un valor no está en las listas de la hoja Listas del Sheet.';
    case 'enlace': return 'El enlace no puede empezar por http:, javascript:… Usa https://.';
    case 'conflicto':
      if (extra.aplicacion) return 'Esta solicitud ha cambiado mientras la editabas.';
      if (extra.ultima !== undefined) return 'Otra persona ha registrado una ronda de esta oferta mientras tanto.';
      return extra.oferta ? 'Esta oferta ha cambiado mientras la editabas.' : 'Esta entrevista ha cambiado mientras la editabas.';
    case 'no-encontrado': return `${DE[extra.campo]?.este || 'Este alumno'} ya no está en el Sheet.`;
    case 'id-duplicado': return `Hay dos filas con el mismo número ${DE[extra.campo]?.de || 'de este alumno'} en el Sheet. Corrígelo ahí y vuelve a intentarlo.`;
    case 'duplicado': return 'Este alumno ya tiene solicitud en esta ronda.';
    case 'fecha-anterior': return `La fecha no puede ser anterior al ${fechaCorta(extra.desde)}.`;
    case 'motivo-sobra': return 'El motivo solo se usa cuando el estado es «Descartado».';
    case 'peticion': case 'accion': return 'El script no entiende la petición. Actualiza Code.gs (mira la guía).';
    case 'solo-lectura': return 'Esta conexión no permite guardar.';
    case 'sin-notas': return 'Escribe una nota.';
    case 'direccion': return 'La dirección no es válida. Debe empezar por https://script.google.com/macros/s/ y terminar en /exec.';
    case 'sin-clave': return 'Escribe la clave.';
    case 'sin-acceso': return 'Todavía no hay acceso configurado.';
    case 'almacenamiento': return 'Este navegador no deja guardar el acceso. ¿Estás en una ventana privada?';
    default: return 'Algo ha salido mal y no se ha podido completar (código: ' + String(codigo).slice(0, 30) + ').';
  }
}

export function errorDatos(codigo, extra) {
  const e = new Error(mensaje(codigo, extra));
  e.codigo = codigo;
  e.extra = extra || {};
  return e;
}

// Reintentos automáticos. Un móvil que lleva un rato quieto puede tener la conexión con Google "dormida" y fallar la primera vez.
//  - Sin respuesta ("red"): se reintenta UNA vez tras una pausa corta. Lo que ya se guardó se detecta solo (duplicado / conflicto idéntico).
//  - Script "ocupado" (no llegó a escribir nada): se reintenta hasta 2 veces, con más espera.
const ESPERA_RED_MS = 600;
const ESPERAS_OCUPADO_MS = [1500, 3000];
const dormir = ms => new Promise(r => setTimeout(r, ms));

// "reintentarRed: false" para lo que no se puede repetir sin riesgo de duplicar (el alta de una oferta).
export async function llamarScript(acceso, accion, datos = {}, { reintentarRed = true } = {}) {
  let intentos = 0, reintentosOcupado = 0;
  for (;;) {
    intentos++;
    try { return await unaLlamada(acceso, accion, datos); }
    catch (e) {
      if (e.codigo === 'red' && reintentarRed && intentos === 1) { await dormir(ESPERA_RED_MS); continue; }
      if (e.codigo === 'ocupado' && reintentosOcupado < ESPERAS_OCUPADO_MS.length) { await dormir(ESPERAS_OCUPADO_MS[reintentosOcupado++]); continue; }
      if (e.codigo === 'red' || e.codigo === 'ocupado') throw errorDatos(e.codigo, { ...e.extra, intentos });
      throw e;
    }
  }
}

// Una petición al script. Devuelve la respuesta (ok:true) o lanza un error con .codigo.
async function unaLlamada({ url, clave }, accion, datos) {
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
      // Las hojas de rondas pueden no existir todavía en el Sheet (o el script ser antiguo): entonces la app funciona como antes.
      const conRondas = esTabla(j.rondas) && esTabla(j.aplicaciones) && esTabla(j.historial);
      return {
        alumnos: aObjetos('Alumnos', j.alumnos, esquemas.ALUMNO),
        ofertas: aObjetos('Ofertas', j.ofertas, esquemas.OFERTA),
        listas: aListas(j.listas, esquemas.LISTAS),
        rondas: conRondas ? aObjetos('Rondas', j.rondas, esquemas.RONDA) : [],
        aplicaciones: conRondas ? aObjetos('Aplicaciones', j.aplicaciones, esquemas.APLICACION) : [],
        historial: conRondas ? aObjetos('Historial', j.historial, esquemas.HISTORIAL) : [],
        conRondas,
        puedeEscribir: j.puedeEscribir === true,
        soporta: Array.isArray(j.soporta) ? j.soporta.filter(x => typeof x === 'string') : [],   // un script antiguo no lo envía
      };
    },
  };
}

// Para la pantalla de Acceso: comprueba dirección y clave sin descargar datos.
export async function probarConexion(acceso) {
  const j = await llamarScript(acceso, 'ping');
  if (j.version !== VERSION_ESPERADA) throw errorDatos('version');
}
