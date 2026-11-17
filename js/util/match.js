// Match entre una oferta y un alumno (funciones puras: solo leen y calculan, no tocan la pantalla ni los datos).
// El match NUNCA oculta ni descarta a nadie: devuelve, para cada alumno, una lista de criterios con su motivo,
// y la pantalla decide cómo enseñarlos. Es una ayuda para mirar, no una decisión; la elegibilidad legal siempre es humana.
// La tabla exacta de reglas, pesos y casos está en docs/REGLAS-MATCH.md.
//
// Cada criterio: { id, grupo: 'afinidad' | 'requisito', estado: 'ok' | 'revisar' | 'no', texto, peso, factor, sinDatos?, noAplica? }
//   ok = encaja / cumple (verde) · revisar = afín o a revisar (amarillo) · no = no coincide / no cumple (rojo).
//   factor = qué parte de su peso suma (1, 0,5 o 0, o una fracción) y NULL si no suma nada:
//     · sinDatos: faltan datos (vacíos o desconocidos). Se enseña como «a revisar» pero NO suma puntos ni cuenta como «no cumple».
//     · noAplica: la oferta no pide nada en ese criterio. Tampoco entra en la puntuación.
// Categoría final: 'encaja' (todo ok) · 'reservas' (ningún "no" en área, tipo, nacionalidad ni permiso, pero algo por revisar) · 'no' (algún "no" en esos cuatro).
// Puntuación: puntos de los criterios CON datos sobre el máximo de esos mismos criterios (los que no tienen datos no cuentan).

import { norm } from './texto.js';

export const UE_EEE = 'Unión Europea (UE/EEE)';   // valor que puede pedir una oferta (fila de la lista Nacionalidad del Sheet)
export const SITUACION_UE = 'Ciudadano UE o español';
export const SUIZA = 'Suiza';
const PIDE_PERMISO = 'Permiso de trabajo en vigor';

// Pesos fijos de cada criterio (suman 100). Documentados en docs/REGLAS-MATCH.md.
export const PESOS = { area: 30, subarea: 10, etiquetas: 20, idiomas: 15, nivel: 5, tipo: 10, nacionalidad: 5, permiso: 5 };
const GRUPO = { area: 'afinidad', subarea: 'afinidad', etiquetas: 'afinidad', idiomas: 'afinidad', nivel: 'afinidad', tipo: 'afinidad', nacionalidad: 'requisito', permiso: 'requisito' };
export const NUCLEO = ['area', 'tipo', 'nacionalidad', 'permiso'];   // los criterios que deciden el grupo
const MESES_VIGENCIA = 12;   // una regla migratoria sin validar desde hace más de esto se marca como «sin revisar»

// Países de la UE y del EEE (Islandia, Liechtenstein y Noruega), tal como se escriben en la lista Nacionalidad.
// RESPALDO: la fuente de verdad es la hoja «Países» del Sheet; esta lista solo se usa si esa hoja no existe (una prueba comprueba que coinciden).
// Suiza NO está: no es de la UE ni del EEE (tiene un acuerdo de libre circulación), así que se trata aparte, "a revisar".
export const PAISES_UE_EEE = [
  'Alemania', 'Austria', 'Bélgica', 'Bulgaria', 'Chipre', 'Croacia', 'Dinamarca', 'Eslovaquia', 'Eslovenia', 'España', 'Estonia',
  'Finlandia', 'Francia', 'Grecia', 'Hungría', 'Irlanda', 'Italia', 'Letonia', 'Lituania', 'Luxemburgo', 'Malta', 'Países Bajos',
  'Polonia', 'Portugal', 'República Checa', 'Chequia', 'Rumanía', 'Suecia', 'Islandia', 'Liechtenstein', 'Noruega',
];
const SET_UE = new Set(PAISES_UE_EEE.map(norm));

const mismo = (x, y) => !!x && !!y && norm(x) === norm(y);
const nombre = a => `${a.nombre ?? ''} ${a.apellidos ?? ''}`.trim();
const nacionalidadesDe = a => [a.nacionalidadPrincipal, a.nacionalidadSecundaria].filter(Boolean);
// Una lista escrita en una celda: valores separados por «;» o «,» (o salto de línea), sin repetir y sin vacíos.
export const lista = t => [...new Map(String(t ?? '').split(/[;,\n]/).map(x => x.trim()).filter(Boolean).map(x => [norm(x), x])).values()];
const unir = xs => xs.map(x => `«${x}»`).join(', ');

/* ---- Contexto: lo que dicen las hojas del Sheet (todas opcionales) ---- */

const GRUPOS = { ue: 'UE', eee: 'EEE', suiza: 'Suiza', resto: 'Resto' };
const NIVELES_AFINIDAD = { directa: 'directa', afin: 'afin', lejana: 'lejana' };
const RESULTADOS = { cumple: 'ok', ok: 'ok', verde: 'ok', revisar: 'revisar', 'a revisar': 'revisar', amarillo: 'revisar', 'no cumple': 'no', no: 'no', rojo: 'no' };
const COMODIN = new Set(['', '*', 'cualquiera', 'cualquier', 'todas', 'todos']);
const claveParAreas = (a, b) => [norm(a), norm(b)].sort().join('|');

// Reglas de respaldo (las de siempre) por si la hoja «Reglas migratorias» no existe o no tiene filas válidas.
export const REGLAS_POR_DEFECTO = [
  { situacion: SITUACION_UE, tipo: '', lugar: '', resultado: 'Cumple', motivo: 'Pide permiso de trabajo en vigor y es ciudadano de la UE o español.', fecha: '' },
  { situacion: 'Residente con permiso de trabajo', tipo: '', lugar: '', resultado: 'Cumple', motivo: 'Pide permiso de trabajo en vigor y es residente con permiso.', fecha: '' },
  { situacion: 'Permiso de estudiante', tipo: '', lugar: '', resultado: 'Revisar', motivo: 'La oferta pide permiso de trabajo en vigor y {alumno} aparece como «Permiso de estudiante». Un permiso de estudiante puede valer para unas prácticas: conviene revisarlo.', fecha: '' },
  { situacion: 'Necesita permiso de trabajo', tipo: '', lugar: '', resultado: 'No cumple', motivo: 'La oferta pide permiso de trabajo en vigor y {alumno} aparece como «Necesita permiso de trabajo».', fecha: '' },
];

// Convierte las listas leídas del Sheet ({ paises, areas, afinidad, reglas, etiquetas }) en lo que usa el match.
// Lo que no se entiende (un grupo, un nivel o un resultado que no existen) se IGNORA y se anota en "problemas": nunca acaba en «no cumple».
export function crearContexto(datos = {}, { hoy = null } = {}) {
  const problemas = [];
  const paises = new Map();
  for (const p of datos.paises || []) {
    const g = GRUPOS[norm(p.grupo)];
    if (g) paises.set(norm(p.pais), g);
    else if (norm(p.grupo) !== 'grupo de paises') problemas.push(`Países: «${p.pais}» tiene el grupo «${p.grupo}», que no existe (usa UE, EEE, Suiza o Resto).`);
  }
  const areaDeSubarea = new Map();
  for (const s of datos.areas || []) if (s.subarea) areaDeSubarea.set(norm(s.subarea), norm(s.area));
  const afinidad = new Map();
  for (const f of datos.afinidad || []) {
    const n = NIVELES_AFINIDAD[norm(f.nivel)];
    if (n) afinidad.set(claveParAreas(f.a, f.b), n);
    else problemas.push(`Afinidad: «${f.a}» y «${f.b}» tienen el nivel «${f.nivel}», que no existe (usa Directa, Afín o Lejana).`);
  }
  const etiquetas = new Map((datos.etiquetas || []).map(e => [norm(e.etiqueta ?? e), e.etiqueta ?? e]));
  const reglas = [];
  for (const r of datos.reglas || []) {
    const res = RESULTADOS[norm(r.resultado)];
    if (res) reglas.push({ ...r, estado: res });
    else problemas.push(`Reglas migratorias: «${r.situacion}» tiene el resultado «${r.resultado}», que no existe (usa Cumple, Revisar o No cumple).`);
  }
  const deSheet = reglas.length > 0;
  return {
    paises, hayPaises: paises.size > 0, areaDeSubarea, afinidad, hayAfinidad: afinidad.size > 0, etiquetas, hayEtiquetas: etiquetas.size > 0,
    reglas: deSheet ? reglas : REGLAS_POR_DEFECTO.map(r => ({ ...r, estado: RESULTADOS[norm(r.resultado)] })), reglasDeSheet: deSheet,
    hoy, problemas,
  };
}
export const CONTEXTO_VACIO = crearContexto();

// El contexto de unos datos ya cargados (listas.match), calculado una sola vez.
const guardados = new WeakMap();
export function contextoDe(listas) {
  const m = listas?.match;
  if (!m || typeof m !== 'object') return CONTEXTO_VACIO;
  if (!guardados.has(m)) guardados.set(m, crearContexto(m));
  return guardados.get(m);
}

/* ---- País ---- */

export function esPaisUE(pais, ctx = CONTEXTO_VACIO) {
  if (ctx.hayPaises) { const g = ctx.paises.get(norm(pais)); return g === 'UE' || g === 'EEE'; }
  return SET_UE.has(norm(pais));
}
const paisConocido = (pais, ctx) => !ctx.hayPaises || ctx.paises.has(norm(pais));
const esSuiza = (pais, ctx) => mismo(pais, SUIZA) || ctx.paises.get(norm(pais)) === 'Suiza';

/* ---- Un criterio ---- */

function crit(id, estado, texto, { factor, sinDatos = false, noAplica = false } = {}) {
  const f = sinDatos || noAplica ? null : factor ?? (estado === 'ok' ? 1 : estado === 'revisar' ? 0.5 : 0);
  return { id, grupo: GRUPO[id], estado, texto, peso: PESOS[id], factor: f, ...(sinDatos ? { sinDatos: true } : {}), ...(noAplica ? { noAplica: true } : {}) };
}
const sinDatos = (id, texto) => crit(id, 'revisar', texto, { sinDatos: true });
const noAplica = (id, texto) => crit(id, 'ok', texto, { noAplica: true });

/* ---- Requisitos: lo que pide la oferta ---- */

export function criterioNacionalidad(alumno, oferta, ctx = CONTEXTO_VACIO) {
  const pide = oferta.requisitoNacionalidad;
  if (!pide) return noAplica('nacionalidad', 'La oferta no pide una nacionalidad concreta.');
  const nacs = nacionalidadesDe(alumno);
  const tiene = nacs.join(' · ');
  const desconocidas = nacs.filter(n => !paisConocido(n, ctx));
  const nuevo = (...a) => crit('nacionalidad', ...a);

  if (mismo(pide, UE_EEE)) {
    if (nacs.some(n => esPaisUE(n, ctx))) return nuevo('ok', `Pide nacionalidad de la UE/EEE y tiene «${nacs.filter(n => esPaisUE(n, ctx))[0]}».`);
    if (alumno.situacionTrabajo === SITUACION_UE) return nuevo('ok', `Pide nacionalidad de la UE/EEE y su situación es «${SITUACION_UE}».`);
    if (nacs.some(n => esSuiza(n, ctx))) {
      return nuevo('revisar', `La oferta pide nacionalidad de la UE/EEE y es de Suiza: no es de la UE/EEE, pero tiene libre circulación. Revísalo.`);
    }
    if (!nacs.length) return sinDatos('nacionalidad', `La oferta pide nacionalidad de la UE/EEE y no hay dato de la nacionalidad.`);
    if (desconocidas.length) return sinDatos('nacionalidad', `La oferta pide nacionalidad de la UE/EEE y ${desconocidas.length === 1 ? 'el país' : 'los países'} ${unir(desconocidas)} no ${desconocidas.length === 1 ? 'está' : 'están'} en la lista de países: revísalo.`);
    return nuevo('no', `La oferta pide nacionalidad de la UE/EEE y consta «${tiene}».`);
  }

  if (nacs.some(n => mismo(n, pide))) return nuevo('ok', `Pide nacionalidad «${pide}» y la tiene.`);
  if (!nacs.length) return sinDatos('nacionalidad', `La oferta pide nacionalidad «${pide}» y no hay dato de la nacionalidad.`);
  if (desconocidas.length) return sinDatos('nacionalidad', `La oferta pide nacionalidad «${pide}» y ${desconocidas.length === 1 ? 'el país' : 'los países'} ${unir(desconocidas)} no ${desconocidas.length === 1 ? 'está' : 'están'} en la lista de países: revísalo.`);
  return nuevo('no', `La oferta pide nacionalidad «${pide}» y consta «${tiene}».`);
}

// Fecha del Sheet (AAAA-MM-DD o DD/MM/AAAA) → Date, o null si no se entiende.
function fechaDe(t) {
  const s = String(t ?? '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s), y, mes, dia;
  if (m) [, y, mes, dia] = m;
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) [, dia, mes, y] = m;
  else return null;
  const d = new Date(Date.UTC(+y, +mes - 1, +dia));
  return Number.isNaN(d.getTime()) ? null : d;
}
const fechaCorta = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
// ¿La regla se validó hace más de 12 meses? Devuelve la fecha de validación si es así.
function reglaCaducada(regla, ctx) {
  const f = fechaDe(regla.fecha);
  if (!f) return null;
  const hoy = ctx.hoy ? (ctx.hoy instanceof Date ? ctx.hoy : fechaDe(ctx.hoy)) : new Date();
  if (!hoy) return null;
  const limite = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + MESES_VIGENCIA, f.getUTCDate()));
  return hoy.getTime() > limite.getTime() ? f : null;
}

// La regla migratoria que vale para esta situación, tipo de oferta y país: gana la más concreta (país > grupo > cualquiera; después el tipo).
// Si el país de la oferta no consta, solo valen las filas que no hablan de un país. Si ninguna vale: no hay regla (sin datos, nunca «no cumple»).
export function buscarRegla(reglas, situacion, tipo, paisOferta, ctx = CONTEXTO_VACIO) {
  const pais = norm(paisOferta), grupo = ctx.paises.get(pais);
  // Un país que consta pero no está en la hoja Países es un dato desconocido: solo vale una fila que lo nombre tal cual (si no, «revisar»).
  const desconocido = !!pais && ctx.hayPaises && !grupo;
  let mejor = null, mejorPuntos = -1;
  for (const r of reglas) {
    if (norm(r.situacion) !== norm(situacion)) continue;
    const t = norm(r.tipo), l = norm(r.lugar);
    if (!COMODIN.has(t) && t !== norm(tipo)) continue;
    let punto = COMODIN.has(t) ? 0 : 1;
    if (desconocido && l !== pais) continue;
    if (!COMODIN.has(l)) {
      if (!pais) continue;
      if (l === pais) punto += 4; else if (grupo && l === norm(grupo)) punto += 2; else continue;
    }
    if (punto > mejorPuntos) { mejor = r; mejorPuntos = punto; }
  }
  return mejor;
}

// Permiso de trabajo: lo decide la tabla de reglas migratorias (la del Sheet o, si no hay, la de respaldo).
// Una situación vacía o sin regla → sin datos (a revisar, sin puntos). Nunca se llega a «no cumple» por no saber.
export function criterioPermiso(alumno, oferta, ctx = CONTEXTO_VACIO) {
  if (oferta.requisitoPermiso !== PIDE_PERMISO) return noAplica('permiso', 'La oferta no pide permiso de trabajo en vigor.');
  const s = alumno.situacionTrabajo;
  const quien = nombre(alumno);
  if (!s) return sinDatos('permiso', `La oferta pide permiso de trabajo en vigor y no hay dato de la situación de trabajo.`);
  const regla = buscarRegla(ctx.reglas, s, oferta.tipo, oferta.paisOferta, ctx);
  if (!regla) {
    const donde = ctx.reglas.some(r => norm(r.situacion) === norm(s)) ? ` (${[oferta.tipo && oferta.tipo.toLowerCase(), oferta.paisOferta || 'sin país en la oferta'].filter(Boolean).join(', ')})` : '';
    return sinDatos('permiso', `No hay una regla para la situación «${s}»${donde}. Avisa a quien administra la app.`);
  }
  let estado = regla.estado;
  let texto = (regla.motivo || `La oferta pide permiso de trabajo en vigor y ${quien} aparece como «${s}».`).replaceAll('{alumno}', quien).replaceAll('{situacion}', s);
  let factor;
  if (estado === 'no' && nacionalidadesDe(alumno).some(n => esPaisUE(n, ctx))) {
    estado = 'revisar';
    texto = `La oferta pide permiso de trabajo en vigor y ${quien} aparece como «${s}», pero consta nacionalidad de la UE/EEE. Revísalo.`;
  }
  const vieja = reglaCaducada(regla, ctx);
  if (vieja) {
    texto += ` Esta regla se validó el ${fechaCorta(vieja)}, hace más de ${MESES_VIGENCIA} meses: avisa a quien administra la app para que la confirme.`;
    if (estado === 'ok') { estado = 'revisar'; factor = 0.5; }
  }
  return crit('permiso', estado, texto, { factor });
}

/* ---- Afinidad ---- */

const nivelAfinidad = (x, y, ctx) => (ctx.hayAfinidad && x && y ? ctx.afinidad.get(claveParAreas(x, y)) : undefined);

export function criterioArea(alumno, oferta, ctx = CONTEXTO_VACIO) {
  const area = oferta.area;
  if (!area) return sinDatos('area', 'La oferta no indica el área.');
  const destino = alumno.areaDestino, exp = alumno.areaExperiencia;
  if (mismo(destino, area)) return crit('area', 'ok', `Quiere ir al área «${area}».`);
  if (!destino && !exp) return sinDatos('area', `No hay dato del área a la que quiere ir ni de su experiencia.`);
  const dDestino = nivelAfinidad(destino, area, ctx), dExp = nivelAfinidad(exp, area, ctx);
  if (dDestino === 'directa') return crit('area', 'ok', `Quiere ir a «${destino}», un área directamente relacionada con «${area}» (según las afinidades definidas).`);
  if (mismo(exp, area)) return crit('area', 'revisar', `Tiene experiencia en «${area}», aunque quiere ir a otra área${destino ? ` («${destino}»)` : ''}.`);
  if (dDestino === 'afin') return crit('area', 'revisar', `Quiere ir a «${destino}», un área afín a «${area}» (según las afinidades definidas).`);
  if (dExp === 'directa' || dExp === 'afin') return crit('area', 'revisar', `Tiene experiencia en «${exp}», un área ${dExp === 'directa' ? 'directamente relacionada con' : 'afín a'} «${area}» (según las afinidades definidas).`);
  // Con la hoja Afinidad cargada, una pareja que no está en ella es un dato que falta (no un «no coincide»).
  if (ctx.hayAfinidad && ((destino && dDestino === undefined) || (!destino && dExp === undefined))) {
    return sinDatos('area', `No hay dato de cómo se relaciona «${destino || exp}» con «${area}»: revísalo.`);
  }
  return crit('area', 'no', `El área «${area}» no coincide con lo que quiere ni con su experiencia.`);
}

export function criterioSubarea(alumno, oferta, ctx = CONTEXTO_VACIO) {
  const sub = oferta.subarea;
  if (!sub) return noAplica('subarea', 'La oferta no indica una subárea.');
  const subs = lista(alumno.subareasExperiencia);
  if (!subs.length) return sinDatos('subarea', `La oferta es de la subárea «${sub}» y no hay dato de las subáreas de experiencia.`);
  const propia = subs.find(s => mismo(s, sub));
  if (propia) return crit('subarea', 'ok', `Tiene experiencia en la subárea «${sub}».`);
  const areaOferta = ctx.areaDeSubarea.get(norm(sub));
  const conocidas = subs.filter(s => ctx.areaDeSubarea.has(norm(s)));
  if (areaOferta && conocidas.some(s => ctx.areaDeSubarea.get(norm(s)) === areaOferta)) {
    return crit('subarea', 'revisar', `La oferta es de la subárea «${sub}»; tiene experiencia en otra subárea de la misma área (${unir(conocidas.filter(s => ctx.areaDeSubarea.get(norm(s)) === areaOferta))}).`);
  }
  if (areaOferta && conocidas.length) return crit('subarea', 'no', `La oferta es de la subárea «${sub}» y su experiencia está en otras áreas (${unir(subs)}).`);
  return sinDatos('subarea', `No se sabe a qué área pertenece la subárea «${sub}» o las del alumno: revísalo.`);
}

export function criterioEtiquetas(alumno, oferta, ctx = CONTEXTO_VACIO) {
  const piden = lista(oferta.etiquetas);
  if (!piden.length) return noAplica('etiquetas', 'La oferta no pide habilidades concretas.');
  const oficial = e => !ctx.hayEtiquetas || ctx.etiquetas.has(norm(e));
  const req = piden.filter(oficial), reqFuera = piden.filter(e => !oficial(e));
  if (!req.length) return sinDatos('etiquetas', `Las habilidades de la oferta (${unir(reqFuera)}) no están en la lista de habilidades: revísalas.`);
  const tiene = lista(alumno.etiquetas), tieneOf = tiene.filter(oficial), tieneFuera = tiene.filter(e => !oficial(e));
  if (!tieneOf.length) return sinDatos('etiquetas', `La oferta pide ${unir(req)} y no hay habilidades del alumno${tieneFuera.length ? ` reconocidas (${unir(tieneFuera)} no están en la lista de habilidades)` : ''}.`);
  const coinciden = req.filter(e => tieneOf.some(t => mismo(t, e))), faltan = req.filter(e => !coinciden.some(c => mismo(c, e)));
  const frac = coinciden.length / req.length;
  const nota = (reqFuera.length || tieneFuera.length) ? ` No se han contado las que no están en la lista de habilidades: ${unir([...reqFuera, ...tieneFuera])}.` : '';
  const texto = frac === 1 ? `Tiene ${req.length === 1 ? 'la habilidad' : `las ${req.length} habilidades`} que pide la oferta (${unir(coinciden)}).${nota}`
    : frac === 0 ? `La oferta pide ${unir(req)} y no tiene ninguna.${nota}`
      : `Tiene ${coinciden.length} de las ${req.length} habilidades que pide la oferta (${unir(coinciden)}); le faltan ${unir(faltan)}.${nota}`;
  return crit('etiquetas', frac === 1 ? 'ok' : frac === 0 ? 'no' : 'revisar', texto, { factor: frac });
}

// Idiomas: «Inglés C1; Español nativo». El nivel es la última palabra (A1–C2 o Nativo). Sin nivel en la oferta, basta con saber el idioma.
const NIVELES_IDIOMA = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'nativo'];
function idiomasDe(t) {
  return lista(t).map(x => {
    const partes = x.split(/\s+/);
    const ultimo = norm(partes[partes.length - 1]).replace('native', 'nativo');
    const nivel = partes.length > 1 && NIVELES_IDIOMA.includes(ultimo) ? ultimo : '';
    return { idioma: norm(nivel ? partes.slice(0, -1).join(' ') : x), texto: nivel ? partes.slice(0, -1).join(' ') : x, nivel };
  });
}
const rotuloNivel = n => (n === 'nativo' ? 'nativo' : n.toUpperCase());

export function criterioIdiomas(alumno, oferta) {
  const piden = idiomasDe(oferta.idiomas);
  if (!piden.length) return noAplica('idiomas', 'La oferta no pide idiomas concretos.');
  const tiene = idiomasDe(alumno.idiomas);
  if (!tiene.length) return sinDatos('idiomas', `La oferta pide ${unir(lista(oferta.idiomas))} y no hay dato de los idiomas.`);
  const partes = []; let suma = 0, medidos = 0, sinNivel = 0;
  for (const p of piden) {
    const q = tiene.find(t => t.idioma === p.idioma);
    const pide = p.nivel ? ` ${rotuloNivel(p.nivel)}` : '';
    if (!q) { partes.push(`${p.texto}${pide}: no lo tiene`); medidos++; continue; }
    if (!p.nivel) { partes.push(`${p.texto}: lo tiene`); suma += 1; medidos++; continue; }
    if (!q.nivel) { partes.push(`${p.texto}${pide}: consta el idioma pero no el nivel`); sinNivel++; continue; }
    const cumple = NIVELES_IDIOMA.indexOf(q.nivel) >= NIVELES_IDIOMA.indexOf(p.nivel);
    partes.push(`${p.texto}${pide}: tiene ${rotuloNivel(q.nivel)}${cumple ? '' : ' (nivel más bajo)'}`);
    suma += cumple ? 1 : 0.5; medidos++;
  }
  if (!medidos) return sinDatos('idiomas', `No hay dato de los niveles de idioma: ${partes.join('; ')}.`);
  const frac = suma / medidos;
  const estado = frac === 0 ? 'no' : frac === 1 && !sinNivel ? 'ok' : 'revisar';
  return crit('idiomas', estado, `${partes.join('; ')}.`, { factor: frac });   // v28: sin el «Idiomas:» del principio (el rótulo «Idiomas · Revisar:» ya lo dice)
}

// Nivel de formación: lo que pide la oferta (Grado, Máster, Doctorado) frente a la «Formación previa» del alumno (texto libre: se buscan esas palabras).
const NIVELES_FORMACION = ['grado', 'master', 'doctorado'];
const nivelOferta = t => { const n = norm(t); return /^(sin requisito|ninguno|cualquiera)$/.test(n) ? 'ninguno' : /^(grado|licenciatura|ingenieria)$/.test(n) ? 'grado' : /^(master|posgrado|mba)$/.test(n) ? 'master' : /^doctor/.test(n) ? 'doctorado' : null; };
function nivelAlumno(t) {
  const n = norm(t);
  if (/\bdoctor/.test(n)) return 'doctorado';
  if (/\b(master|mba|posgrado)\b/.test(n)) return 'master';
  if (/\b(grado|licenciatura|ingenieria|diplomatura|bachelor)\b/.test(n)) return 'grado';
  return null;
}
export function criterioNivel(alumno, oferta) {
  if (!oferta.nivelFormacion) return noAplica('nivel', 'La oferta no pide un nivel de formación.');
  const pide = nivelOferta(oferta.nivelFormacion);
  if (pide === null) return sinDatos('nivel', `El nivel de formación «${oferta.nivelFormacion}» de la oferta no se reconoce (usa Grado, Máster, Doctorado o Sin requisito).`);
  if (pide === 'ninguno') return noAplica('nivel', 'La oferta no pide un nivel de formación.');
  const tiene = nivelAlumno(alumno.formacionPrevia);
  if (!tiene) return sinDatos('nivel', `La oferta pide ${oferta.nivelFormacion} y no hay dato de la formación previa (o no se reconoce el nivel).`);
  const d = NIVELES_FORMACION.indexOf(tiene) - NIVELES_FORMACION.indexOf(pide);
  if (d >= 0) return crit('nivel', 'ok', `Pide ${oferta.nivelFormacion} y su formación previa llega a ese nivel.`);
  if (d === -1) return crit('nivel', 'revisar', `Pide ${oferta.nivelFormacion} y su formación previa es de un nivel por debajo (${tiene === 'grado' ? 'Grado' : 'Máster'}).`);
  return crit('nivel', 'no', `Pide ${oferta.nivelFormacion} y su formación previa es de Grado.`);
}

export function criterioTipo(alumno, oferta) {
  const tipo = oferta.tipo, busca = alumno.disponibilidad;
  if (!tipo) return sinDatos('tipo', 'La oferta no indica si es de prácticas o empleo.');
  if (!busca) return sinDatos('tipo', `La oferta es de ${tipo.toLowerCase()} y no hay dato de qué busca.`);
  if (mismo(busca, 'Ambas') || mismo(busca, tipo)) return crit('tipo', 'ok', mismo(busca, 'Ambas') ? `Busca prácticas y empleo, y la oferta es de ${tipo.toLowerCase()}.` : `Busca ${busca.toLowerCase()} y la oferta es de ${tipo.toLowerCase()}.`);
  return crit('tipo', 'no', `La oferta es de ${tipo.toLowerCase()} y busca ${busca.toLowerCase()}.`);
}

/* ---- Resultado ---- */

export const CATEGORIAS = { encaja: 'Encaja', reservas: 'Encaja con reservas', no: 'Encaja poco' };
const ORDEN = { encaja: 0, reservas: 1, no: 2 };

// La puntuación: solo cuentan los criterios con datos y que la oferta pide. "incompleto" = hay criterios sin datos.
export function puntuacion(criterios) {
  const con = criterios.filter(c => c.factor != null);
  const maximo = con.reduce((s, c) => s + c.peso, 0);
  const puntos = con.reduce((s, c) => s + c.peso * c.factor, 0);
  const faltan = criterios.filter(c => c.sinDatos).length;
  return {
    puntos: Math.round(puntos * 10) / 10, maximo, porcentaje: maximo ? Math.round(puntos * 100 / maximo) : null,
    evaluados: con.length, aplicables: criterios.filter(c => !c.noAplica).length, sinDatos: faltan, incompleto: faltan > 0,
  };
}

export function evaluar(alumno, oferta, ctx = CONTEXTO_VACIO) {
  const criterios = [
    criterioArea(alumno, oferta, ctx), criterioSubarea(alumno, oferta, ctx), criterioEtiquetas(alumno, oferta, ctx), criterioIdiomas(alumno, oferta),
    criterioNivel(alumno, oferta), criterioTipo(alumno, oferta), criterioNacionalidad(alumno, oferta, ctx), criterioPermiso(alumno, oferta, ctx),
  ];
  // El grupo lo deciden los cuatro criterios de siempre (área, tipo, nacionalidad y permiso). Los de perfil (subárea, etiquetas, idiomas y nivel)
  // matizan la puntuación y pueden bajar de «Encaja» a «Encaja con reservas», pero nunca mandan solos a «No encaja».
  const basicos = criterios.filter(c => NUCLEO.includes(c.id));
  const categoria = basicos.some(c => c.estado === 'no') ? 'no' : criterios.some(c => c.estado !== 'ok') ? 'reservas' : 'encaja';
  return { alumno, categoria, criterios, puntuacion: puntuacion(criterios) };
}
const pct = r => r.puntuacion.porcentaje ?? -1;

// Todos los alumnos, evaluados y ordenados: primero los que encajan, luego los que tienen reservas y al final los que no.
// Dentro de cada grupo, por puntuación (mayor primero); a igual puntuación, primero el que tiene más criterios con datos (más pruebas), y después por nombre.
// Nadie se quita de la lista.
export function emparejar(alumnos, oferta, ctx = CONTEXTO_VACIO) {
  return alumnos.map(a => evaluar(a, oferta, ctx)).sort((x, y) =>
    ORDEN[x.categoria] - ORDEN[y.categoria] || pct(y) - pct(x) || y.puntuacion.evaluados - x.puntuacion.evaluados || nombre(x.alumno).localeCompare(nombre(y.alumno), 'es'));
}

// Lo mismo desde el alumno: todas las ofertas, evaluadas y ordenadas igual (a igual puntuación, la más reciente primero).
export function ofertasParaAlumno(ofertas, alumno, ctx = CONTEXTO_VACIO) {
  return ofertas.map(o => ({ oferta: o, ...evaluar(alumno, o, ctx) })).sort((x, y) =>
    ORDEN[x.categoria] - ORDEN[y.categoria] || pct(y) - pct(x) || y.puntuacion.evaluados - x.puntuacion.evaluados || (y.oferta.fechaRecepcion || '').localeCompare(x.oferta.fechaRecepcion || ''));
}

// Los avisos de "Añadir solicitud": exactamente los criterios de requisitos que no se cumplen o hay que revisar
// (los mismos que usa el match, para que nunca se contradigan). Son informativos: no impiden guardar nada.
export const avisosRequisitos = (alumno, oferta, ctx = CONTEXTO_VACIO) =>
  [criterioPermiso(alumno, oferta, ctx), criterioNacionalidad(alumno, oferta, ctx)].filter(c => c.estado !== 'ok').map(c => c.texto);
