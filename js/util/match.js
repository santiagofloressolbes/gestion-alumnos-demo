// Match entre una oferta y un alumno (funciones puras: solo leen y calculan, no tocan la pantalla ni los datos).
// El match NUNCA oculta ni descarta a nadie: devuelve, para cada alumno, una lista de criterios con su motivo,
// y la pantalla decide cómo enseñarlos. Es una ayuda para mirar, no una decisión.
//
// Cada criterio: { id, grupo: 'afinidad' | 'requisito', estado: 'ok' | 'revisar' | 'no', texto }
//   ok = encaja / cumple · revisar = hay algo que mirar a mano · no = no coincide / no cumple.
// Categoría final: 'encaja' (todo ok) · 'reservas' (nada en "no", pero algo por revisar) · 'no' (algún "no").

import { norm } from './texto.js';

export const UE_EEE = 'Unión Europea (UE/EEE)';   // valor que puede pedir una oferta (fila de la lista Nacionalidad del Sheet)
export const SITUACION_UE = 'Ciudadano UE o español';
export const SUIZA = 'Suiza';

// Países de la UE y del EEE (Islandia, Liechtenstein y Noruega), tal como se escriben en la lista Nacionalidad.
// Suiza NO está: no es de la UE ni del EEE (tiene un acuerdo de libre circulación), así que se trata aparte, "a revisar".
const PAISES = [
  'Alemania', 'Austria', 'Bélgica', 'Bulgaria', 'Chipre', 'Croacia', 'Dinamarca', 'Eslovaquia', 'Eslovenia', 'España', 'Estonia',
  'Finlandia', 'Francia', 'Grecia', 'Hungría', 'Irlanda', 'Italia', 'Letonia', 'Lituania', 'Luxemburgo', 'Malta', 'Países Bajos',
  'Polonia', 'Portugal', 'República Checa', 'Chequia', 'Rumanía', 'Suecia', 'Islandia', 'Liechtenstein', 'Noruega',
];
const SET_UE = new Set(PAISES.map(norm));
export const esPaisUE = pais => SET_UE.has(norm(pais));
const mismo = (x, y) => !!x && !!y && norm(x) === norm(y);

const nombre = a => `${a.nombre} ${a.apellidos}`.trim();
const nacionalidadesDe = a => [a.nacionalidadPrincipal, a.nacionalidadSecundaria].filter(Boolean);
const PIDE_PERMISO = 'Permiso de trabajo en vigor';

/* ---- Requisitos: lo que pide la oferta ---- */

export function criterioNacionalidad(alumno, oferta) {
  const pide = oferta.requisitoNacionalidad;
  const base = { id: 'nacionalidad', grupo: 'requisito' };
  if (!pide) return { ...base, estado: 'ok', texto: 'La oferta no pide una nacionalidad concreta.' };
  const nacs = nacionalidadesDe(alumno);
  const quien = nombre(alumno);
  const tiene = nacs.join(' · ');

  if (mismo(pide, UE_EEE)) {
    if (nacs.some(esPaisUE)) return { ...base, estado: 'ok', texto: `Pide nacionalidad de la UE/EEE y tiene «${nacs.filter(esPaisUE)[0]}».` };
    if (alumno.situacionTrabajo === SITUACION_UE) return { ...base, estado: 'ok', texto: `Pide nacionalidad de la UE/EEE y su situación es «${SITUACION_UE}».` };
    if (nacs.some(n => mismo(n, SUIZA))) {
      return { ...base, estado: 'revisar', texto: `La oferta pide nacionalidad de la UE/EEE y ${quien} es de Suiza: Suiza no es de la UE ni del EEE, aunque tiene un acuerdo de libre circulación. Conviene revisarlo.` };
    }
    if (!nacs.length) return { ...base, estado: 'revisar', texto: `La oferta pide nacionalidad de la UE/EEE y no consta la nacionalidad de ${quien}.` };
    return { ...base, estado: 'no', texto: `La oferta pide nacionalidad de la UE/EEE y ${quien} tiene «${tiene}».` };
  }

  if (nacs.some(n => mismo(n, pide))) return { ...base, estado: 'ok', texto: `Pide nacionalidad «${pide}» y la tiene.` };
  if (!nacs.length) return { ...base, estado: 'revisar', texto: `La oferta pide nacionalidad «${pide}» y no consta la nacionalidad de ${quien}.` };
  return { ...base, estado: 'no', texto: `La oferta pide nacionalidad «${pide}» y ${quien} tiene «${tiene}».` };
}

// Situaciones: con permiso o ciudadano UE → cumple · estudiante → a revisar (puede hacer prácticas con convenio, nunca "no cumple")
// · necesita permiso → no cumple · vacía o desconocida → a revisar.
export function criterioPermiso(alumno, oferta) {
  const base = { id: 'permiso', grupo: 'requisito' };
  if (oferta.requisitoPermiso !== PIDE_PERMISO) return { ...base, estado: 'ok', texto: 'La oferta no pide permiso de trabajo en vigor.' };
  const s = alumno.situacionTrabajo;
  const quien = nombre(alumno);
  if (s === SITUACION_UE) return { ...base, estado: 'ok', texto: 'Pide permiso de trabajo en vigor y es ciudadano de la UE o español.' };
  if (s === 'Residente con permiso de trabajo') return { ...base, estado: 'ok', texto: 'Pide permiso de trabajo en vigor y es residente con permiso.' };
  if (s === 'Permiso de estudiante') return { ...base, estado: 'revisar', texto: `La oferta pide permiso de trabajo en vigor y ${quien} aparece como «${s}». Un permiso de estudiante puede valer para unas prácticas: conviene revisarlo.` };
  if (s === 'Necesita permiso de trabajo') {
    if (nacionalidadesDe(alumno).some(esPaisUE)) return { ...base, estado: 'revisar', texto: `La oferta pide permiso de trabajo en vigor y ${quien} aparece como «${s}», pero tiene nacionalidad de la UE/EEE. Conviene revisarlo.` };
    return { ...base, estado: 'no', texto: `La oferta pide permiso de trabajo en vigor y ${quien} aparece como «${s}».` };
  }
  return { ...base, estado: 'revisar', texto: s ? `La oferta pide permiso de trabajo en vigor y la situación de ${quien} es «${s}»: conviene revisarla.` : `La oferta pide permiso de trabajo en vigor y no consta la situación de trabajo de ${quien}.` };
}

/* ---- Afinidad: área y tipo ---- */

export function criterioArea(alumno, oferta) {
  const base = { id: 'area', grupo: 'afinidad' };
  const area = oferta.area;
  if (!area) return { ...base, estado: 'revisar', fuerza: 0, texto: 'La oferta no indica el área.' };
  if (mismo(alumno.areaDestino, area)) return { ...base, estado: 'ok', fuerza: 2, texto: `Quiere ir al área «${area}».` };
  if (mismo(alumno.areaExperiencia, area)) return { ...base, estado: 'revisar', fuerza: 1, texto: `Tiene experiencia en «${area}», aunque quiere ir a otra área${alumno.areaDestino ? ` («${alumno.areaDestino}»)` : ''}.` };
  return { ...base, estado: 'no', fuerza: 0, texto: `El área «${area}» no coincide con lo que quiere ni con su experiencia.` };
}

export function criterioTipo(alumno, oferta) {
  const base = { id: 'tipo', grupo: 'afinidad' };
  const tipo = oferta.tipo, busca = alumno.disponibilidad;
  if (!tipo) return { ...base, estado: 'revisar', texto: 'La oferta no indica si es de prácticas o de empleo.' };
  if (!busca) return { ...base, estado: 'revisar', texto: `La oferta es de ${tipo.toLowerCase()} y no consta qué busca el alumno.` };
  if (mismo(busca, 'Ambas') || mismo(busca, tipo)) return { ...base, estado: 'ok', texto: mismo(busca, 'Ambas') ? `Busca prácticas y empleo, y la oferta es de ${tipo.toLowerCase()}.` : `Busca ${busca.toLowerCase()} y la oferta es de ${tipo.toLowerCase()}.` };
  return { ...base, estado: 'no', texto: `La oferta es de ${tipo.toLowerCase()} y ${nombre(alumno)} busca ${busca.toLowerCase()}.` };
}

/* ---- Resultado ---- */

export const CATEGORIAS = { encaja: 'Encaja', reservas: 'Encaja con reservas', no: 'No encaja' };
const ORDEN = { encaja: 0, reservas: 1, no: 2 };

export function evaluar(alumno, oferta) {
  const criterios = [criterioArea(alumno, oferta), criterioTipo(alumno, oferta), criterioNacionalidad(alumno, oferta), criterioPermiso(alumno, oferta)];
  const categoria = criterios.some(c => c.estado === 'no') ? 'no' : criterios.some(c => c.estado === 'revisar') ? 'reservas' : 'encaja';
  return { alumno, categoria, criterios, fuerza: criterios[0].fuerza || 0 };
}

// Todos los alumnos, evaluados y ordenados: primero los que encajan, luego los que tienen reservas y al final los que no.
// Dentro de cada grupo, los que quieren ir a esa área, y después por nombre. Nadie se quita de la lista.
export function emparejar(alumnos, oferta) {
  return alumnos.map(a => evaluar(a, oferta)).sort((x, y) =>
    ORDEN[x.categoria] - ORDEN[y.categoria] || y.fuerza - x.fuerza || nombre(x.alumno).localeCompare(nombre(y.alumno), 'es'));
}

// Lo mismo desde el alumno: todas las ofertas, evaluadas y ordenadas igual.
export function ofertasParaAlumno(ofertas, alumno) {
  return ofertas.map(o => ({ oferta: o, ...evaluar(alumno, o) })).sort((x, y) =>
    ORDEN[x.categoria] - ORDEN[y.categoria] || y.fuerza - x.fuerza || (y.oferta.fechaRecepcion || '').localeCompare(x.oferta.fechaRecepcion || ''));
}

// Los avisos de "Añadir solicitud": exactamente los criterios de requisitos que no se cumplen o hay que revisar
// (los mismos que usa el match, para que nunca se contradigan). Son informativos: no impiden guardar nada.
export const avisosRequisitos = (alumno, oferta) =>
  [criterioPermiso(alumno, oferta), criterioNacionalidad(alumno, oferta)].filter(c => c.estado !== 'ok').map(c => c.texto);
