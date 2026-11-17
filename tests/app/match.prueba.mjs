// Pruebas de js/util/match.js (funciones puras: sin navegador). El match nunca oculta a nadie y siempre da el motivo.
import * as M from '../../js/util/match.js';
import * as R from '../../js/util/rondas.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));

const al = (o = {}) => ({ id: 'A1', nombre: 'Lucía', apellidos: 'Quintero', nacionalidadPrincipal: 'España', nacionalidadSecundaria: '', situacionTrabajo: 'Ciudadano UE o español', areaExperiencia: 'Finanzas', areaDestino: 'Producto y tecnología', disponibilidad: 'Prácticas', ...o });
const of = (o = {}) => ({ id: 'O1', area: 'Producto y tecnología', tipo: 'Prácticas', requisitoNacionalidad: '', requisitoPermiso: 'No requerido', ...o });
const est = (c, id) => c.criterios.find(x => x.id === id).estado;

console.log('match.js: nacionalidad');
const UE = M.UE_EEE;
igual(UE, 'Unión Europea (UE/EEE)', 'el valor de la lista del Sheet');
for (const p of ['España', 'Francia', 'Alemania', 'Países Bajos', 'Portugal', 'Italia', 'Irlanda', 'Noruega', 'Islandia', 'Liechtenstein', 'Rumanía', 'Chequia']) chk(M.esPaisUE(p), p + ' es de la UE/EEE');
for (const p of ['Suiza', 'Reino Unido', 'México', 'Estados Unidos', 'Turquía', '']) chk(!M.esPaisUE(p), p + ' no es de la UE/EEE');
chk(M.esPaisUE('ESPAÑA') && M.esPaisUE('paises bajos'), 'sin fijarse en mayúsculas ni tildes');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Francia' }), of({ requisitoNacionalidad: UE })), 'nacionalidad'), 'ok', 'pide UE/EEE y es francés: cumple');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile', nacionalidadSecundaria: 'Italia' }), of({ requisitoNacionalidad: UE })), 'nacionalidad'), 'ok', 'pide UE/EEE y la secundaria es de la UE: cumple');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile', situacionTrabajo: 'Ciudadano UE o español' }), of({ requisitoNacionalidad: UE })), 'nacionalidad'), 'ok', 'pide UE/EEE y su situación es "Ciudadano UE o español": cumple');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile', situacionTrabajo: 'Necesita permiso de trabajo' }), of({ requisitoNacionalidad: UE })), 'nacionalidad'), 'no', 'pide UE/EEE y es chileno sin situación UE: no cumple');
const suiza = M.criterioNacionalidad(al({ nacionalidadPrincipal: 'Suiza', situacionTrabajo: 'Residente con permiso de trabajo' }), of({ requisitoNacionalidad: UE }));
igual(suiza.estado, 'revisar', 'pide UE/EEE y es suizo: a revisar (nunca "no cumple")');
chk(/es de Suiza: no es de la UE\/EEE/.test(suiza.texto), 'el aviso de Suiza lo explica');
igual(M.criterioNacionalidad(al({ nacionalidadPrincipal: '', situacionTrabajo: '' }), of({ requisitoNacionalidad: UE })).estado, 'revisar', 'pide UE/EEE y no consta nacionalidad: a revisar');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile' }), of({ requisitoNacionalidad: 'Chile' })), 'nacionalidad'), 'ok', 'país concreto que sí tiene');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile', nacionalidadSecundaria: 'Perú' }), of({ requisitoNacionalidad: 'Perú' })), 'nacionalidad'), 'ok', 'país concreto: vale la secundaria');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile' }), of({ requisitoNacionalidad: 'Perú' })), 'nacionalidad'), 'no', 'país concreto que no tiene: no cumple');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Chile', situacionTrabajo: 'Ciudadano UE o español' }), of({ requisitoNacionalidad: 'España' })), 'nacionalidad'), 'no', 'pedir "España" no se cumple solo con la situación UE');
igual(est(M.evaluar(al(), of({ requisitoNacionalidad: '' })), 'nacionalidad'), 'ok', 'sin requisito: cumple');
igual(est(M.evaluar(al({ nacionalidadPrincipal: '', nacionalidadSecundaria: '' }), of({ requisitoNacionalidad: 'Perú' })), 'nacionalidad'), 'revisar', 'país concreto y no consta la nacionalidad: a revisar, no "no cumple"');
// sin la fila "Unión Europea" en el Sheet: la oferta no la puede pedir, pero todo lo demás sigue funcionando sin errores
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Francia' }), of()), 'nacionalidad'), 'ok', 'oferta sin requisito (como cuando falta la fila en el Sheet): sin errores');
igual(est(M.evaluar(al({ nacionalidadPrincipal: 'Francia' }), { id: 'O9' }), 'nacionalidad'), 'ok', 'oferta casi vacía: sin errores');

console.log('match.js: permiso de trabajo');
const pide = of({ requisitoPermiso: 'Permiso de trabajo en vigor' });
igual(est(M.evaluar(al({ situacionTrabajo: 'Ciudadano UE o español' }), pide), 'permiso'), 'ok', 'ciudadano UE o español: cumple');
igual(est(M.evaluar(al({ situacionTrabajo: 'Residente con permiso de trabajo' }), pide), 'permiso'), 'ok', 'residente con permiso: cumple');
const estudiante = M.criterioPermiso(al({ situacionTrabajo: 'Permiso de estudiante' }), pide);
igual(estudiante.estado, 'revisar', 'permiso de estudiante: a revisar, NUNCA "no cumple"');
chk(/puede valer para unas prácticas/.test(estudiante.texto), 'y lo explica');
igual(est(M.evaluar(al({ situacionTrabajo: 'Permiso de estudiante' }), of({ requisitoPermiso: 'No requerido' })), 'permiso'), 'ok', 'estudiante y la oferta no pide permiso: cumple');
igual(est(M.evaluar(al({ situacionTrabajo: 'Necesita permiso de trabajo', nacionalidadPrincipal: 'Chile' }), pide), 'permiso'), 'no', 'necesita permiso: no cumple');
igual(est(M.evaluar(al({ situacionTrabajo: 'Necesita permiso de trabajo', nacionalidadPrincipal: 'Francia' }), pide), 'permiso'), 'revisar', 'necesita permiso pero es de la UE: dato contradictorio, a revisar');
igual(est(M.evaluar(al({ situacionTrabajo: '' }), pide), 'permiso'), 'revisar', 'situación vacía: a revisar');
igual(est(M.evaluar(al({ situacionTrabajo: 'Algo raro' }), pide), 'permiso'), 'revisar', 'situación desconocida: a revisar');
chk(!['Permiso de estudiante', 'Ciudadano UE o español', 'Residente con permiso de trabajo', '', 'Algo raro'].some(s => est(M.evaluar(al({ situacionTrabajo: s }), pide), 'permiso') === 'no'), 'solo "Necesita permiso de trabajo" (sin ser de la UE) llega a "no cumple"');

console.log('match.js: afinidad');
igual(est(M.evaluar(al(), of()), 'area'), 'ok', 'quiere ir a esa área: encaja');
const exp = M.criterioArea(al({ areaDestino: 'Comercial y patrocinio', areaExperiencia: 'Producto y tecnología' }), of());
igual(exp.estado, 'revisar', 'solo tiene experiencia en esa área: encaja algo (a revisar)');
chk(/Tiene experiencia en «Producto y tecnología»/.test(exp.texto), 'lo explica');
igual(est(M.evaluar(al({ areaDestino: 'Finanzas', areaExperiencia: 'Finanzas' }), of()), 'area'), 'no', 'otra área: no coincide');
igual(est(M.evaluar(al({ areaDestino: 'producto y tecnología' }), of()), 'area'), 'ok', 'área sin fijarse en mayúsculas');
igual(est(M.evaluar(al(), of({ area: '' })), 'area'), 'revisar', 'oferta sin área: a revisar');
igual(est(M.evaluar(al({ disponibilidad: 'Prácticas' }), of({ tipo: 'Prácticas' })), 'tipo'), 'ok', 'prácticas con prácticas');
igual(est(M.evaluar(al({ disponibilidad: 'Ambas' }), of({ tipo: 'Empleo' })), 'tipo'), 'ok', '"Ambas" encaja con empleo');
igual(est(M.evaluar(al({ disponibilidad: 'Empleo' }), of({ tipo: 'Prácticas' })), 'tipo'), 'no', 'busca empleo y la oferta es de prácticas: no encaja');
igual(est(M.evaluar(al({ disponibilidad: '' }), of()), 'tipo'), 'revisar', 'no consta lo que busca: a revisar');

console.log('match.js: resultado final');
igual(M.evaluar(al(), of()).categoria, 'encaja', 'todo ok: encaja');
igual(M.evaluar(al({ situacionTrabajo: 'Permiso de estudiante' }), pide).categoria, 'reservas', 'estudiante con todo lo demás ok: encaja con reservas');
igual(M.evaluar(al({ areaDestino: 'Finanzas', areaExperiencia: 'Producto y tecnología' }), of()).categoria, 'reservas', 'solo experiencia en el área: con reservas');
igual(M.evaluar(al({ areaDestino: 'Finanzas', areaExperiencia: 'Finanzas' }), of()).categoria, 'no', 'área distinta: no encaja');
igual(M.evaluar(al({ situacionTrabajo: 'Permiso de estudiante', disponibilidad: 'Empleo' }), pide).categoria, 'no', 'un "no" gana a un "a revisar"');
chk(M.evaluar(al({ areaDestino: 'Finanzas', areaExperiencia: 'Finanzas' }), of()).criterios.every(c => c.texto && c.texto.length > 10), 'todos los criterios llevan su motivo escrito, también el que no encaja');
chk(M.evaluar(al(), of()).criterios.length === 8, 'siempre los ocho criterios (los que la oferta no pide salen como "no aplica")');

console.log('match.js: nunca oculta a nadie');
const todos = [al({ id: 'B', nombre: 'Berta', apellidos: 'X', areaDestino: 'Finanzas', areaExperiencia: 'Finanzas' }), al({ id: 'A', nombre: 'Ana', apellidos: 'Y' }),
  al({ id: 'C', nombre: 'Carla', apellidos: 'Z', situacionTrabajo: 'Permiso de estudiante' }), al({ id: 'D', nombre: 'Dani', apellidos: 'W', areaDestino: 'Finanzas', areaExperiencia: 'Producto y tecnología', situacionTrabajo: 'Ciudadano UE o español' }), al({ id: 'E', nombre: 'Eva', apellidos: 'V' })];
const r = M.emparejar(todos, pide);
igual(r.length, todos.length, 'emparejar devuelve a TODOS los alumnos');
igual(new Set(r.map(x => x.alumno.id)).size, todos.length, 'sin repetir ni perder a nadie');
igual(r.map(x => x.alumno.id), ['A', 'E', 'C', 'D', 'B'], 'orden: encajan (por nombre), con reservas (los que quieren ir al área primero), y al final los que no');
igual(M.emparejar([], pide), [], 'sin alumnos: lista vacía, sin errores');
igual(M.emparejar([{ id: 'X' }], { id: 'O' }).length, 1, 'un alumno vacío y una oferta vacía: sin errores y sin perderlo');
const ofs = [of({ id: 'O1', area: 'Finanzas', fechaRecepcion: '2026-10-01' }), of({ id: 'O2', fechaRecepcion: '2026-10-05' }), of({ id: 'O3', fechaRecepcion: '2026-10-09' }), of({ id: 'O4', area: 'Derecho y compliance', fechaRecepcion: '2026-10-12' })];
const po = M.ofertasParaAlumno(ofs, al());
igual(po.length, 4, 'ofertasParaAlumno devuelve TODAS las ofertas (también la que no encaja)');
igual(po.map(x => x.oferta.id), ['O3', 'O2', 'O1', 'O4'], 'las que encajan primero (más recientes antes) y las que no, al final');

console.log('Los avisos de "Añadir solicitud" y el match no se contradicen');
const personas = ['Ciudadano UE o español', 'Residente con permiso de trabajo', 'Permiso de estudiante', 'Necesita permiso de trabajo', '', 'Raro'];
const nacs = ['España', 'Chile', 'Suiza', 'Estados Unidos', ''];
const exigencias = [{ requisitoPermiso: 'Permiso de trabajo en vigor' }, { requisitoPermiso: 'No requerido' }, { requisitoNacionalidad: UE }, { requisitoNacionalidad: 'Estados Unidos' }, { requisitoNacionalidad: UE, requisitoPermiso: 'Permiso de trabajo en vigor' }];
let casos = 0, contradice = 0;
for (const s of personas) for (const n of nacs) for (const e of exigencias) {
  const a = al({ situacionTrabajo: s, nacionalidadPrincipal: n }), o = of(e);
  const c = M.evaluar(a, o), avisos = R.avisosRequisitos(a, o);
  const req = c.criterios.filter(x => x.grupo === 'requisito');
  casos++;
  if (avisos.length !== req.filter(x => x.estado !== 'ok').length || (c.categoria === 'encaja' && avisos.length) || (req.some(x => x.estado === 'no') && !avisos.length)) contradice++;
}
igual(contradice, 0, `en ${casos} combinaciones, los avisos salen exactamente cuando el match ve un requisito que no se cumple o hay que revisar`);
igual(R.avisosRequisitos, M.avisosRequisitos, 'rondas.js usa las mismas reglas que match.js (no hay dos copias)');

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
