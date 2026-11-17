// Pruebas de las reglas nuevas del match (3E-1): criterios de perfil, puntuación, reglas migratorias, países y datos vacíos.
// Funciones puras: sin navegador. La tabla de reglas está en docs/REGLAS-MATCH.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos, aReglasMatch, aListas } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';
import * as M from '../../js/util/match.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const tabla = f => { const filas = leerCSV(fs.readFileSync(path.join(RAIZ, f), 'utf8')); return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) }; };
const HOJAS = { paises: 'Paises', areas: 'Areas', afinidad: 'Afinidad', reglas: 'ReglasMigratorias', etiquetas: 'Etiquetas' };
const match = aReglasMatch(Object.fromEntries(Object.entries(HOJAS).map(([k, f]) => [k, tabla(`datos-mock/${f}.csv`)])), E.HOJAS_MATCH);
const HOY = '2026-11-16';
const ctx = M.crearContexto(match, { hoy: HOY });

const al = (o = {}) => ({ id: 'A1', nombre: 'Lucía', apellidos: 'Quintero', nacionalidadPrincipal: 'España', nacionalidadSecundaria: '', situacionTrabajo: 'Ciudadano UE o español', areaExperiencia: 'Finanzas', areaDestino: 'Producto y tecnología', disponibilidad: 'Prácticas', etiquetas: '', idiomas: '', formacionPrevia: '', subareasExperiencia: '', ...o });
const of = (o = {}) => ({ id: 'O1', area: 'Producto y tecnología', tipo: 'Prácticas', requisitoNacionalidad: '', requisitoPermiso: 'No requerido', paisOferta: '', subarea: '', etiquetas: '', idiomas: '', nivelFormacion: '', ...o });
const crit = (c, id) => c.criterios.find(x => x.id === id);
const est = (c, id) => crit(c, id).estado;
const ev = (a, o, x = ctx) => M.evaluar(a, o, x);

console.log('1. Pesos y puntuación');
igual(Object.values(M.PESOS).reduce((a, b) => a + b, 0), 100, 'los pesos suman 100');
igual(M.PESOS, { area: 30, subarea: 10, etiquetas: 20, idiomas: 15, nivel: 5, tipo: 10, nacionalidad: 5, permiso: 5 }, 'pesos fijos (los de docs/REGLAS-MATCH.md)');
{
  const r = ev(al(), of());
  igual(r.criterios.map(c => c.id), ['area', 'subarea', 'etiquetas', 'idiomas', 'nivel', 'tipo', 'nacionalidad', 'permiso'], 'siempre los 8 criterios, en este orden');
  igual(r.puntuacion.porcentaje, 100, 'área y tipo verdes y la oferta no pide nada más: 100 %');
  igual([r.puntuacion.evaluados, r.puntuacion.aplicables, r.puntuacion.maximo], [2, 2, 40], 'solo cuentan los criterios que la oferta pide (área 30 + tipo 10)');
  chk(r.criterios.filter(c => c.noAplica).length === 6 && r.criterios.filter(c => c.noAplica).every(c => c.factor === null && c.estado === 'ok'), 'lo que la oferta no pide sale «no aplica»: verde, sin puntos y fuera del total');
  igual(r.puntuacion.incompleto, false, 'sin criterios sin datos: no es «incompleto»');
}
{
  // Amarillo = media puntuación (área: experiencia) y rojo = 0
  const amarillo = ev(al({ areaDestino: 'Finanzas', areaExperiencia: 'Producto y tecnología' }), of());
  igual([est(amarillo, 'area'), crit(amarillo, 'area').factor, amarillo.puntuacion.porcentaje], ['revisar', 0.5, 63], 'amarillo (solo experiencia): suma la mitad → (15 + 10) / 40');
  const rojo = ev(al({ areaDestino: 'Finanzas', areaExperiencia: 'Finanzas' }), of(), M.CONTEXTO_VACIO);
  igual([est(rojo, 'area'), crit(rojo, 'area').factor, rojo.puntuacion.porcentaje], ['no', 0, 25], 'rojo: suma 0 pero SÍ cuenta en el máximo → 10 / 40');
}

console.log('2. AJUSTE: un criterio sin datos no suma puntos ni cuenta como «no cumple»');
{
  const o = of({ subarea: 'Producto digital', etiquetas: 'SQL; Excel', idiomas: 'Inglés B2', nivelFormacion: 'Grado', requisitoNacionalidad: M.UE_EEE, requisitoPermiso: 'Permiso de trabajo en vigor', paisOferta: 'España' });
  const vacio = ev({ id: 'X' }, o);
  chk(vacio.criterios.every(c => c.estado !== 'no'), 'un alumno sin ningún dato: NINGÚN criterio sale en rojo');
  chk(vacio.criterios.every(c => c.sinDatos === true && c.factor === null), 'todos «sin datos» y sin puntos');
  igual(vacio.puntuacion.porcentaje, null, 'sin ningún criterio con datos: no hay puntuación (no 0 %)');
  igual([vacio.puntuacion.incompleto, vacio.puntuacion.sinDatos], [true, 8], 'se marca «datos incompletos» (8 criterios sin datos)');
  igual(vacio.categoria, 'reservas', 'y el grupo es «con reservas», nunca «no encaja»');
  chk(vacio.criterios.every(c => c.texto.length > 15), 'cada uno dice qué falta');
  // El mismo alumno con UN dato en rojo puntúa distinto de otro con ese dato vacío
  const conRojo = ev(al({ etiquetas: 'Python', idiomas: '', subareasExperiencia: '', formacionPrevia: '' }), of({ etiquetas: 'SQL' }));
  const conVacio = ev(al({ etiquetas: '' }), of({ etiquetas: 'SQL' }));
  igual([est(conRojo, 'etiquetas'), crit(conRojo, 'etiquetas').factor], ['no', 0], 'etiquetas sin ninguna coincidencia: rojo y 0 puntos');
  igual([est(conVacio, 'etiquetas'), crit(conVacio, 'etiquetas').factor, !!crit(conVacio, 'etiquetas').sinDatos], ['revisar', null, true], 'etiquetas sin rellenar: amarillo «sin datos», SIN puntos');
  igual(conVacio.puntuacion.porcentaje, 100, 'la puntuación se calcula solo sobre lo que tiene datos (área + tipo = 100 %)');
  igual(conRojo.puntuacion.porcentaje, 67, 'mientras que el rojo sí baja la nota: (30 + 10 + 0) / 60');
  igual(conVacio.puntuacion.incompleto, true, 'y el vacío marca «datos incompletos»');
}
// Cualquier criterio con el alumno vacío o raro: nunca «no cumple»
for (const [nombre, f] of Object.entries({ area: M.criterioArea, subarea: M.criterioSubarea, etiquetas: M.criterioEtiquetas, idiomas: M.criterioIdiomas, nivel: M.criterioNivel, tipo: M.criterioTipo, nacionalidad: M.criterioNacionalidad, permiso: M.criterioPermiso })) {
  const o = of({ subarea: 'Producto digital', etiquetas: 'SQL', idiomas: 'Inglés B2', nivelFormacion: 'Máster', requisitoNacionalidad: M.UE_EEE, requisitoPermiso: 'Permiso de trabajo en vigor' });
  for (const [quien, a] of [['sin datos', {}], ['con espacios', { nombre: ' ', areaDestino: ' ', etiquetas: ' ; ', idiomas: ',', formacionPrevia: ' ', subareasExperiencia: ';', nacionalidadPrincipal: ' ', situacionTrabajo: ' ' }]]) {
    const c = f(a, o, ctx);
    chk(c.estado !== 'no' && c.factor === null, `${nombre}: alumno ${quien} → sin datos, no «no cumple» (${c.estado}, ${c.factor})`);
  }
}

console.log('3. Etiquetas con lista cerrada (hoja Etiquetas), coincidencia exacta normalizada');
{
  const o = of({ etiquetas: 'SQL; Excel; Python' });
  const todas = M.criterioEtiquetas(al({ etiquetas: 'sql, EXCEL; Python' }), o, ctx);
  igual([todas.estado, todas.factor], ['ok', 1], 'las tres, sin fijarse en mayúsculas ni en si separa «;» o «,»');
  const dos = M.criterioEtiquetas(al({ etiquetas: 'SQL; Excel' }), o, ctx);
  igual([dos.estado, Math.round(dos.factor * 100)], ['revisar', 67], 'tiene 2 de 3: amarillo y suma 2/3 del peso');
  chk(/Tiene 2 de las 3/.test(dos.texto) && /«Python»/.test(dos.texto), 'dice cuáles le faltan');
  const sin = M.criterioEtiquetas(al({ etiquetas: 'Tableau' }), o, ctx);
  igual([sin.estado, sin.factor], ['no', 0], 'no tiene ninguna: rojo');
  igual(M.criterioEtiquetas(al({ etiquetas: 'Exce' }), of({ etiquetas: 'Excel' }), ctx).estado, 'revisar', 'una etiqueta mal escrita («Exce») NO coincide por parecida: no hay sinónimos ni aproximaciones');
  igual(M.criterioEtiquetas(al({ etiquetas: 'Exce' }), of({ etiquetas: 'Excel' }), ctx).sinDatos, true, '…y como no está en la lista, es dato desconocido (sin datos), no «no cumple»');
  const fuera = M.criterioEtiquetas(al({ etiquetas: 'SQL; Cocina' }), of({ etiquetas: 'SQL' }), ctx);
  igual(fuera.estado, 'ok', 'una etiqueta que no es de la lista se ignora y no estropea lo demás');
  chk(/«Cocina»/.test(fuera.texto) && /no están en la lista de habilidades/.test(fuera.texto), 'y se avisa cuál se ha ignorado');
  const ofFuera = M.criterioEtiquetas(al({ etiquetas: 'SQL' }), of({ etiquetas: 'Cocina' }), ctx);
  igual([ofFuera.estado, ofFuera.sinDatos], ['revisar', true], 'si la oferta pide una etiqueta que no está en la lista: sin datos');
  igual(M.criterioEtiquetas(al({ etiquetas: 'Cocina' }), of({ etiquetas: 'Cocina' }), M.CONTEXTO_VACIO).estado, 'ok', 'sin hoja Etiquetas no hay lista que validar: coincide el texto exacto');
  igual(M.criterioEtiquetas(al({ etiquetas: 'SQL' }), of({ etiquetas: '' }), ctx).noAplica, true, 'la oferta sin etiquetas: no aplica');
}

console.log('4. Idiomas y nivel de formación');
{
  const o = of({ idiomas: 'Inglés B2; Español C1' });
  const dos = M.criterioIdiomas(al({ idiomas: 'Español nativo; Inglés C1' }), o);
  igual([dos.estado, dos.factor], ['ok', 1], 'nativo y C1 superan C1 y B2');
  const bajo = M.criterioIdiomas(al({ idiomas: 'Inglés B1; Español nativo' }), o);
  igual([bajo.estado, bajo.factor], ['revisar', 0.75], 'inglés más bajo: la mitad de ese idioma → (0,5 + 1) / 2');
  chk(/nivel más bajo/.test(bajo.texto), 'lo dice');
  igual(M.criterioIdiomas(al({ idiomas: 'Francés C2' }), o).estado, 'no', 'no tiene ninguno de los idiomas: rojo');
  const sinNivel = M.criterioIdiomas(al({ idiomas: 'Inglés; Español nativo' }), o);
  igual([sinNivel.estado, sinNivel.factor], ['revisar', 1], 'tiene el idioma pero no consta el nivel: amarillo, y solo puntúa lo que se sabe');
  igual(M.criterioIdiomas(al({ idiomas: 'Inglés' }), of({ idiomas: 'Inglés' })).estado, 'ok', 'la oferta no pide nivel: basta con tener el idioma');
  igual(M.criterioIdiomas(al({ idiomas: 'Inglés' }), of({ idiomas: 'Inglés C1' })).sinDatos, true, 'pide nivel y el alumno no lo tiene escrito: sin datos');
  igual(M.criterioIdiomas(al({ idiomas: 'inglés c1' }), of({ idiomas: 'INGLES B2' })).estado, 'ok', 'sin fijarse en mayúsculas ni tildes');

  const n = { master: of({ nivelFormacion: 'Máster' }), grado: of({ nivelFormacion: 'Grado' }) };
  igual(M.criterioNivel(al({ formacionPrevia: 'Grado en Derecho; Máster en Derecho Fiscal' }), n.master).estado, 'ok', 'pide Máster y lo tiene');
  igual(M.criterioNivel(al({ formacionPrevia: 'Grado en Derecho' }), n.master).estado, 'revisar', 'pide Máster y tiene Grado: un nivel por debajo, amarillo');
  igual(M.criterioNivel(al({ formacionPrevia: 'Máster en Finanzas' }), n.grado).estado, 'ok', 'pide Grado y tiene Máster: cumple');
  igual(M.criterioNivel(al({ formacionPrevia: 'Grado en ADE' }), of({ nivelFormacion: 'Doctorado' })).estado, 'no', 'pide Doctorado y tiene Grado: rojo');
  igual(M.criterioNivel(al({ formacionPrevia: 'Cursos varios' }), n.grado).sinDatos, true, 'una formación sin ningún nivel reconocible: sin datos');
  igual(M.criterioNivel(al(), of({ nivelFormacion: 'Sin requisito' })).noAplica, true, '«Sin requisito»: no aplica');
  igual(M.criterioNivel(al({ formacionPrevia: 'Grado' }), of({ nivelFormacion: 'Bachillerato' })).sinDatos, true, 'un nivel de oferta que no se reconoce: sin datos');
}

console.log('5. Área: tabla de afinidad (directa, afín, lejana)');
{
  const o = of({ area: 'Comercial y patrocinio' });
  const dir = M.criterioArea(al({ areaDestino: 'Marketing y comunicación', areaExperiencia: '' }), o, ctx);
  igual([dir.estado, dir.factor], ['ok', 1], 'Marketing ↔ Comercial es directa: verde');
  const afin = M.criterioArea(al({ areaDestino: 'Finanzas', areaExperiencia: '' }), o, ctx);
  igual([afin.estado, afin.factor], ['revisar', 0.5], 'Finanzas ↔ Comercial es afín: amarillo');
  chk(/afín/.test(afin.texto), 'y el motivo lo dice');
  const lej = M.criterioArea(al({ areaDestino: 'Recursos Humanos', areaExperiencia: 'Análisis de datos' }), o, ctx);
  igual([lej.estado, lej.factor], ['no', 0], 'Recursos Humanos ↔ Comercial es lejana: rojo');
  igual(M.criterioArea(al({ areaDestino: 'Comercial y patrocinio' }), o, ctx).estado, 'ok', 'la misma área: verde');
  igual(M.criterioArea(al({ areaDestino: 'Recursos Humanos', areaExperiencia: 'Comercial y patrocinio' }), o, ctx).estado, 'revisar', 'experiencia en esa área: amarillo');
  const ext = M.criterioArea(al({ areaDestino: 'Área inventada', areaExperiencia: '' }), o, ctx);
  igual([ext.estado, ext.sinDatos], ['revisar', true], 'una pareja que no está en la tabla: sin datos (nunca «no cumple»)');
  igual(M.criterioArea(al({ areaDestino: 'Finanzas', areaExperiencia: '' }), o, M.CONTEXTO_VACIO).estado, 'no', 'sin hoja Afinidad: como siempre (otra área = no coincide)');
  const sub = M.criterioSubarea(al({ subareasExperiencia: 'Hospitality' }), of({ subarea: 'Venta de patrocinios' }), ctx);
  igual(sub.estado, 'revisar', 'subárea distinta de la misma área: amarillo');
  igual(M.criterioSubarea(al({ subareasExperiencia: 'Contabilidad' }), of({ subarea: 'Venta de patrocinios' }), ctx).estado, 'no', 'experiencia solo en otra área: rojo');
  igual(M.criterioSubarea(al({ subareasExperiencia: 'Nóminas; Venta de patrocinios' }), of({ subarea: 'venta de patrocinios' }), ctx).estado, 'ok', 'la subárea exacta (sin mayúsculas): verde');
  igual(M.criterioSubarea(al({ subareasExperiencia: 'Contabilidad' }), of({ subarea: 'Venta de patrocinios' }), M.CONTEXTO_VACIO).sinDatos, true, 'sin hoja Áreas no se sabe a qué área pertenece: sin datos');
}

console.log('6. Reglas migratorias (hoja del Sheet) y respaldo');
{
  const pide = of({ requisitoPermiso: 'Permiso de trabajo en vigor', paisOferta: 'España', tipo: 'Empleo' });
  const caso = (s, o = pide, a = {}) => M.criterioPermiso(al({ situacionTrabajo: s, nacionalidadPrincipal: 'Chile', ...a }), o, ctx);
  igual(caso('Ciudadano UE o español').estado, 'ok', 'ciudadano UE en España: cumple');
  igual(caso('Residente con permiso de trabajo').estado, 'ok', 'residente con permiso en España: cumple');
  igual(caso('Residente con permiso de trabajo', { ...pide, paisOferta: 'Portugal' }).estado, 'revisar', 'residente con permiso (de España) y oferta en Portugal: revisar');
  igual(caso('Ciudadano UE o español', { ...pide, paisOferta: 'Portugal' }).estado, 'ok', 'ciudadano UE y oferta en otro país de la UE: cumple');
  igual(caso('Ciudadano UE o español', { ...pide, paisOferta: 'Noruega' }).estado, 'ok', 'ciudadano UE y oferta en el EEE: cumple');
  igual(caso('Ciudadano UE o español', { ...pide, paisOferta: 'Suiza' }).estado, 'revisar', 'ciudadano UE y oferta en Suiza: revisar');
  igual(caso('Ciudadano UE o español', { ...pide, paisOferta: 'Estados Unidos' }).estado, 'revisar', 'ciudadano UE y oferta fuera de la UE/EEE: revisar, nunca «no cumple»');
  igual(caso('Necesita permiso de trabajo').estado, 'no', 'necesita permiso y la oferta es de España: no cumple');
  igual(caso('Necesita permiso de trabajo', { ...pide, paisOferta: 'Francia' }).estado, 'revisar', 'necesita permiso (en España) y la oferta es de Francia: revisar');
  igual(caso('Necesita permiso de trabajo', pide, { nacionalidadPrincipal: 'Francia' }).estado, 'revisar', 'necesita permiso pero es francés: dato contradictorio, revisar');
  const est1 = caso('Permiso de estudiante', { ...pide, tipo: 'Prácticas' }), est2 = caso('Permiso de estudiante');
  igual([est1.estado, est2.estado], ['revisar', 'revisar'], 'estudiante: SIEMPRE revisar (prácticas o empleo), nunca «no cumple»');
  chk(/prácticas/.test(est1.texto) && /otra autorización/.test(est2.texto), 'y el motivo distingue prácticas de empleo (regla más concreta primero)');
  igual(caso('Permiso de estudiante', { ...pide, paisOferta: '' }).estado, 'revisar', 'sin país de la oferta: valen las reglas que no hablan de país');
  const sinReglaPais = M.criterioPermiso(al({ situacionTrabajo: 'Residente con permiso de trabajo' }), { ...pide, paisOferta: 'Atlantis' }, ctx);
  igual([sinReglaPais.estado, sinReglaPais.sinDatos], ['revisar', true], 'país de la oferta desconocido (no está en la hoja Países): sin datos, no «cumple» ni «no cumple»');
  const rara = caso('Situación inventada');
  igual([rara.estado, rara.sinDatos], ['revisar', true], 'situación sin regla en la tabla: sin datos');
  chk(/No hay una regla para la situación «Situación inventada»/.test(rara.texto) && /Avisa a quien administra la app/.test(rara.texto), 'y dice dónde falta la regla y qué hacer');
  igual(M.criterioPermiso(al({ situacionTrabajo: 'Necesita permiso de trabajo' }), of({ requisitoPermiso: 'No requerido' }), ctx).noAplica, true, 'la oferta no pide permiso: no aplica');
  chk(['Ciudadano UE o español', 'Residente con permiso de trabajo', 'Permiso de estudiante', 'Necesita permiso de trabajo', '', 'Raro'].every(s => ['España', 'Portugal', 'Noruega', 'Suiza', 'Estados Unidos', 'Atlantis', ''].every(p => ['Prácticas', 'Empleo', ''].every(t => {
    const c = M.criterioPermiso(al({ situacionTrabajo: s, nacionalidadPrincipal: 'Chile' }), { ...pide, paisOferta: p, tipo: t }, ctx);
    return c.estado !== 'no' || (s === 'Necesita permiso de trabajo' && (p === 'España' || p === ''));
  }))), '«no cumple» solo sale con «Necesita permiso de trabajo» y una oferta de España (o sin país): en las demás 126 combinaciones, nunca');

  // La regla más concreta gana
  const reglas = [
    { situacion: 'X', tipo: '', lugar: '', resultado: 'Cumple', motivo: 'general', fecha: '' },
    { situacion: 'X', tipo: '', lugar: 'UE', resultado: 'Revisar', motivo: 'grupo', fecha: '' },
    { situacion: 'X', tipo: '', lugar: 'Portugal', resultado: 'No cumple', motivo: 'país', fecha: '' },
    { situacion: 'X', tipo: 'Prácticas', lugar: 'UE', resultado: 'Cumple', motivo: 'grupo y tipo', fecha: '' },
  ];
  const c2 = M.crearContexto({ ...match, reglas });
  const b = (t, p) => M.buscarRegla(c2.reglas, 'x', t, p, c2)?.motivo;
  igual([b('Empleo', 'Portugal'), b('Empleo', 'Francia'), b('Prácticas', 'Francia'), b('Empleo', 'Chile'), b('Empleo', ''), b('Empleo', 'Atlantis')], ['país', 'grupo', 'grupo y tipo', 'general', 'general', undefined], 'país > grupo (con tipo mejor que sin él) > cualquiera; un país desconocido no usa la regla general');
}
{
  // La tabla del Sheet manda; sin filas válidas se usan las de respaldo; las filas raras se ignoran y se anotan
  const cRaro = M.crearContexto({ ...match, reglas: [{ situacion: 'Residente con permiso de trabajo', tipo: '', lugar: '', resultado: 'Quizás', motivo: 'x', fecha: '' }] });
  igual([cRaro.reglasDeSheet, cRaro.problemas.length], [false, 1], 'una regla con un resultado que no existe se ignora, se anota como problema y se usan las de respaldo');
  igual(M.criterioPermiso(al({ situacionTrabajo: 'Residente con permiso de trabajo' }), of({ requisitoPermiso: 'Permiso de trabajo en vigor' }), cRaro).estado, 'ok', 'y el resultado es el de siempre (nunca «no cumple» por una fila rota)');
  igual(M.crearContexto({ ...match, afinidad: [{ a: 'A', b: 'B', nivel: 'Mucha' }] }).problemas.length, 1, 'un nivel de afinidad que no existe: se anota');
  igual(M.crearContexto({ paises: [{ pais: 'X', grupo: 'Marte' }] }).problemas.length, 1, 'un grupo de países que no existe: se anota');
  igual(M.crearContexto(match).problemas, [], 'los datos mock no tienen ningún problema');
  const cPropia = M.crearContexto({ reglas: [{ situacion: 'Residente con permiso de trabajo', tipo: '', lugar: '', resultado: 'No cumple', motivo: 'Mi regla para {alumno}.', fecha: '' }] });
  const c = M.criterioPermiso(al({ situacionTrabajo: 'Residente con permiso de trabajo', nombre: 'Eva', apellidos: 'Gil', nacionalidadPrincipal: 'Chile' }), of({ requisitoPermiso: 'Permiso de trabajo en vigor' }), cPropia);
  igual([c.estado, c.texto], ['no', 'Mi regla para Eva Gil.'], 'la tabla del Sheet manda sobre el código, y {alumno} se sustituye');
}
{
  // Vigencia: 12 meses desde la fecha de validación
  const regla = f => [{ situacion: 'Residente con permiso de trabajo', tipo: '', lugar: '', resultado: 'Cumple', motivo: 'Vale.', fecha: f }];
  const pide = of({ requisitoPermiso: 'Permiso de trabajo en vigor' });
  const con = (f, hoy) => M.criterioPermiso(al({ situacionTrabajo: 'Residente con permiso de trabajo' }), pide, M.crearContexto({ reglas: regla(f) }, { hoy }));
  igual([con('2026-11-01', '2026-11-16').estado, con('2025-11-16', '2026-11-16').estado, con('2025-11-15', '2026-11-16').estado], ['ok', 'ok', 'revisar'], 'a los 12 meses justos aún vale; un día más y pasa a «revisar»');
  const vieja = con('2025-01-10', '2026-11-16');
  igual([vieja.estado, vieja.factor], ['revisar', 0.5], 'regla vieja: amarillo (nunca verde)');
  chk(/10\/01\/2025/.test(vieja.texto) && /más de 12 meses/.test(vieja.texto), 'y lo dice con la fecha');
  igual(con('', '2026-11-16').estado, 'ok', 'sin fecha de validación: no se controla la vigencia');
  igual(con('algún día', '2026-11-16').estado, 'ok', 'una fecha que no se entiende no rompe nada');
  igual(con('10/01/2025', '2026-11-16').estado, 'revisar', 'la fecha también se entiende como DD/MM/AAAA');
}

console.log('7. Nacionalidad y países (hoja Países)');
{
  const pide = of({ requisitoNacionalidad: M.UE_EEE });
  const nac = (n, s = 'Necesita permiso de trabajo', x = ctx) => M.criterioNacionalidad(al({ nacionalidadPrincipal: n, situacionTrabajo: s }), pide, x);
  igual(nac('Chile').estado, 'no', 'país conocido de fuera de la UE: no cumple');
  const raro = nac('Atlantis');
  igual([raro.estado, raro.sinDatos], ['revisar', true], 'país DESCONOCIDO (no está en la hoja Países): revisar, nunca «no cumple»');
  chk(/Atlantis/.test(raro.texto) && /lista de países/.test(raro.texto), 'y lo explica');
  igual(nac('Atlantis', 'Necesita permiso de trabajo', M.CONTEXTO_VACIO).estado, 'no', '(sin hoja Países no se puede saber qué país es desconocido: como siempre)');
  igual(nac('Chile').sinDatos, undefined, 'el rojo de un país conocido no es «sin datos»');
  igual(M.criterioNacionalidad(al({ nacionalidadPrincipal: 'Chile', nacionalidadSecundaria: 'Atlantis', situacionTrabajo: 'Necesita permiso de trabajo' }), pide, ctx).sinDatos, true, 'si una de las dos es desconocida no se puede dar un «no cumple»');
  igual(nac('Noruega').estado, 'ok', 'Noruega (EEE): cumple');
  igual(nac('Suiza').estado, 'revisar', 'Suiza: revisar');
  igual(nac('Suiza').sinDatos, undefined, '…con puntos (no es un dato que falte, es una duda legal)');
  igual(M.criterioNacionalidad(al({ nacionalidadPrincipal: 'Brasil' }), of({ requisitoNacionalidad: 'Brasil' }), ctx).estado, 'ok', 'país concreto que sí tiene');
  igual(M.esPaisUE('Chequia', ctx) && M.esPaisUE('República Checa', ctx) && !M.esPaisUE('Suiza', ctx) && !M.esPaisUE('Reino Unido', ctx) && !M.esPaisUE('Unión Europea (UE/EEE)', ctx), true, 'Chequia y República Checa son UE; Suiza, Reino Unido y la fila de grupo no');
}
{
  // Cada país UE/EEE está escrito igual en el código y en la hoja de países (y en Listas)
  const enHoja = (g) => match.paises.filter(p => g.includes(p.grupo)).map(p => p.pais);
  const hoja = new Set(enHoja(['UE', 'EEE']));
  const codigo = new Set(M.PAISES_UE_EEE);
  igual([...codigo].filter(p => !hoja.has(p)), [], 'cada país de la lista de respaldo del código está escrito IGUAL en la hoja Países (UE/EEE)');
  igual([...hoja].filter(p => !codigo.has(p)), [], 'y cada país UE/EEE de la hoja está en la lista de respaldo');
  igual(match.paises.filter(p => p.grupo === 'UE').length, 28, '27 países de la UE + «Chequia» (otra forma de escribir República Checa)');
  igual(match.paises.filter(p => p.grupo === 'EEE').map(p => p.pais), ['Islandia', 'Liechtenstein', 'Noruega'], 'EEE: Islandia, Liechtenstein y Noruega');
  igual(match.paises.filter(p => p.grupo === 'Suiza').map(p => p.pais), ['Suiza'], 'Suiza va aparte');
  igual(match.paises.length, new Set(match.paises.map(p => p.pais)).size, 'ningún país repetido');
  chk(match.paises.every(p => p.pais === p.pais.trim() && !/\s{2}/.test(p.pais)), 'sin espacios de más');
  const listas = aListas(tabla('datos-mock/Listas.csv'), E.LISTAS, E.ALIAS_LISTAS);
  const conocidos = new Set(match.paises.map(p => p.pais));
  igual(listas.nacionalidades.filter(n => !conocidos.has(n)), [], 'cada valor de Listas > Nacionalidad (incluida la fila de la UE) está escrito IGUAL en la hoja Países');
  const al_ = aObjetos('Alumnos', tabla('datos-mock/Alumnos.csv'), E.ALUMNO, E.ALUMNO_OPC);
  igual([...new Set(al_.flatMap(a => [a.nacionalidadPrincipal, a.nacionalidadSecundaria]).filter(Boolean))].filter(n => !conocidos.has(n)), [], 'y las nacionalidades de los 30 alumnos mock también');
  const of_ = aObjetos('Ofertas', tabla('datos-mock/Ofertas.csv'), E.OFERTA, E.OFERTA_OPC);
  igual(of_.flatMap(o => [o.paisOferta, o.requisitoNacionalidad]).filter(Boolean).filter(n => !conocidos.has(n)), [], 'y los países y requisitos de las 10 ofertas mock');
}

console.log('8. Datos vacíos: nada se rompe y todo se trata como «a revisar»');
{
  const al_ = aObjetos('Alumnos', tabla('datos-mock/Alumnos.csv'), E.ALUMNO, E.ALUMNO_OPC), of_ = aObjetos('Ofertas', tabla('datos-mock/Ofertas.csv'), E.OFERTA, E.OFERTA_OPC);
  const sinPerfil = al_.map(a => ({ ...a, etiquetas: '', idiomas: '', formacionPrevia: '', subareasExperiencia: '' }));
  let n = 0, raros = 0;
  for (const o of of_) for (const x of [ctx, M.CONTEXTO_VACIO, M.crearContexto({})]) {
    const r = M.emparejar(sinPerfil, o, x);
    n++;
    if (r.length !== 30 || r.some(e => !['encaja', 'reservas', 'no'].includes(e.categoria) || e.criterios.length !== 8 || e.criterios.some(c => !c.texto))) raros++;
  }
  igual([n, raros], [30, 0], 'las 10 ofertas con alumnos sin perfil y con cualquier contexto (hojas, vacío): 30 alumnos, siempre 8 criterios con su motivo');
  const sinNada = of_.map(o => ({ ...o, paisOferta: '', subarea: '', etiquetas: '', idiomas: '', nivelFormacion: '' }));
  igual(sinNada.every(o => al_.every(a => ['subarea', 'etiquetas', 'idiomas', 'nivel'].every(id => crit(ev(a, o), id).noAplica))), true, 'ofertas sin las columnas nuevas: los 4 criterios de perfil «no aplican» y todo queda como antes');
  const viejo = of_.map(({ paisOferta, subarea, etiquetas, idiomas, nivelFormacion, ...o }) => o), viejoA = al_.map(({ etiquetas, idiomas, formacionPrevia, subareasExperiencia, ...a }) => a);
  igual(M.emparejar(viejoA, viejo[2], ctx).length, 30, 'objetos SIN esos campos (como una oferta recién guardada desde la app): sin errores');
  igual(M.emparejar([{ id: 'X' }], { id: 'O' }, ctx).length, 1, 'un alumno vacío y una oferta vacía: sin errores y sin perderlo');
  igual(M.contextoDe(undefined), M.CONTEXTO_VACIO, 'sin listas: contexto vacío');
  igual(M.contextoDe({ match: 'basura' }), M.CONTEXTO_VACIO, 'listas con algo raro: contexto vacío');
  const l = { match }; igual(M.contextoDe(l) === M.contextoDe(l), true, 'el contexto se calcula una sola vez');
}

console.log('9. Los avisos de «Añadir solicitud» siguen sin contradecir al match (con las reglas del Sheet)');
{
  let casos = 0, contradice = 0;
  for (const s of ['Ciudadano UE o español', 'Residente con permiso de trabajo', 'Permiso de estudiante', 'Necesita permiso de trabajo', '', 'Raro']) for (const n of ['España', 'Chile', 'Suiza', 'Atlantis', '']) for (const p of ['España', 'Portugal', 'Estados Unidos', 'Atlantis', '']) {
    for (const e of [{ requisitoPermiso: 'Permiso de trabajo en vigor' }, { requisitoNacionalidad: M.UE_EEE }, { requisitoNacionalidad: 'Estados Unidos', requisitoPermiso: 'Permiso de trabajo en vigor' }]) {
      const a = al({ situacionTrabajo: s, nacionalidadPrincipal: n }), o = of({ ...e, paisOferta: p });
      const c = ev(a, o), avisos = M.avisosRequisitos(a, o, ctx), req = c.criterios.filter(x => x.grupo === 'requisito');
      casos++;
      if (avisos.length !== req.filter(x => x.estado !== 'ok').length || (c.categoria === 'encaja' && avisos.length)) contradice++;
    }
  }
  igual(contradice, 0, `en ${casos} combinaciones, los avisos salen exactamente cuando el match ve un requisito que no se cumple o hay que revisar`);
}

console.log('10. Orden: por grupo y, dentro del grupo, por puntuación');
{
  const o = of({ area: 'Finanzas', etiquetas: 'SQL; Excel' });
  const a = [al({ id: 'B', nombre: 'Berta', areaDestino: 'Finanzas', etiquetas: 'SQL' }), al({ id: 'A', nombre: 'Ana', areaDestino: 'Finanzas', etiquetas: 'SQL; Excel' }), al({ id: 'C', nombre: 'Carla', areaDestino: 'Finanzas', etiquetas: '' }),
    al({ id: 'D', nombre: 'Dani', areaDestino: 'Producto y tecnología', areaExperiencia: 'Recursos Humanos', etiquetas: 'SQL; Excel' })];
  const r = M.emparejar(a, o, ctx);
  igual(r.map(x => [x.alumno.id, x.categoria, x.puntuacion.porcentaje]), [['A', 'encaja', 100], ['C', 'reservas', 100], ['B', 'reservas', 83], ['D', 'no', 50]].map(x => x), 'Ana (todo verde) → Carla (sin datos: no suma pero tampoco baja; con reservas) → Berta (le falta una etiqueta) → Dani (otra área)');
  igual(r.length, 4, 'nadie se pierde');
}
{
  const o = of({ area: 'Finanzas', etiquetas: 'SQL; Excel' });
  const a = [al({ id: 'X', nombre: 'Xia', areaDestino: 'Finanzas', etiquetas: 'SQL' }), al({ id: 'Y', nombre: 'Yago', areaDestino: 'Finanzas', etiquetas: 'SQL; Excel' }), al({ id: 'Z', nombre: 'Zoe', areaDestino: 'Finanzas', etiquetas: 'Tableau' })];
  const r = M.emparejar(a, o, ctx);
  chk(r[0].alumno.id === 'Y' && r[0].categoria === 'encaja' && r[1].alumno.id === 'X' && r[2].alumno.id === 'Z', 'dentro de «con reservas» manda la puntuación: Xia (1 de 2 etiquetas) antes que Zoe (ninguna)');
  chk(r[1].puntuacion.porcentaje > r[2].puntuacion.porcentaje && r[2].categoria === 'reservas', 'y un rojo de perfil (ninguna etiqueta) baja la nota pero NO manda a «No encaja»');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
