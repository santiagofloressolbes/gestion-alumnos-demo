// Pruebas de la historia por plantillas (js/util/historia.js) y de su casilla en «Compartir perfiles».
// Lo importante: la historia solo sale si se marca la casilla, solo usa campos no sensibles y NADA sensible se filtra
// (situación migratoria, notas de entrevista, historial, motivos de descarte, el texto libre «Por qué»...). Se comprueba con «canarios».
import fs from 'node:fs';
import * as H from '../../js/util/historia.js';
import * as C from '../../js/util/compartir.js';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const CAN = { porQue: 'CANARIO-POR-QUE', notas: 'CANARIO-NOTAS-ENTREVISTA', situacion: 'CANARIO-SITUACION-MIGRATORIA', nac1: 'CANARIO-NAC-1', nac2: 'CANARIO-NAC-2',
  resumen: 'CANARIO-RESUMEN', cv: 'https://canario-cv.test/x', exp: 'CANARIO-AREA-EXPERIENCIA', historial: 'CANARIO-HISTORIAL', motivo: 'CANARIO-MOTIVO-DESCARTE', nota: 'CANARIO-NOTA-APLICACION' };
const CANARIOS = Object.values(CAN);

const alumno = () => ({ id: 'A1', nombre: 'Lucía', apellidos: 'Quintero', master: 'MBA en inglés', areaDestino: 'Producto y tecnología', subareasExperiencia: 'Producto digital; Experiencia de usuario',
  etiquetas: 'Scrum; Gestión de proyectos; Excel', idiomas: 'Español nativo; Inglés C1', formacionPrevia: 'Grado en Ingeniería Informática', disponibilidad: 'Prácticas',
  // todo lo sensible, con canarios
  porQue: CAN.porQue, notasEntrevista: CAN.notas, fechaUltimaEntrevista: '2026-10-01', situacionTrabajo: CAN.situacion, nacionalidadPrincipal: CAN.nac1, nacionalidadSecundaria: CAN.nac2,
  resumenExperiencia: CAN.resumen, enlaceCV: CAN.cv, areaExperiencia: CAN.exp, historial: CAN.historial, motivo: CAN.motivo, nota: CAN.nota, estado: 'Descartado' });

/* 1. La plantilla */
console.log('1. La plantilla');
{
  const h = H.historia(alumno());
  igual(h, 'Subáreas: Producto digital, Experiencia de usuario. Habilidades: Scrum, Gestión de proyectos, Excel. Idiomas: Español, Inglés. Formación: Grado en Ingeniería Informática.', 'la historia de Lucía, corta y sin lo que ya sale debajo (programa, a dónde quiere ir, experiencia en, busca)');
  igual(H.historia({}), '', 'sin ningún dato: vacía');
  igual(H.historia(null), '', 'sin alumno: vacía');
  // si falta un dato, se omite SU frase (y solo esa)
  const frases = { subareasExperiencia: /Subáreas:/, etiquetas: /Habilidades:/, idiomas: /Idiomas:/, formacionPrevia: /Formación:/ };
  for (const [campo, re] of Object.entries(frases)) {
    for (const vacio of ['', '   ', undefined, null, ';', ' ; ; ']) {
      const x = H.historia({ ...alumno(), [campo]: vacio });
      chk(!re.test(x) && Object.entries(frases).filter(([k]) => k !== campo).every(([, r]) => r.test(x)), `sin «${campo}» (${JSON.stringify(vacio)}): se omite esa frase y quedan las demás`);
      chk(!/undefined|null|NaN|\bfalse\b|\btrue\b|  |\.\./.test(x), `sin «${campo}» (${JSON.stringify(vacio)}): sin «undefined», dobles espacios ni puntos dobles`);
    }
  }
  igual(H.historia({ formacionPrevia: 'Máster en X' }), 'Formación: Máster en X.', 'con un solo dato: una sola frase');
  igual(H.historia({ master: 'MBA en inglés', areaDestino: 'Finanzas', areaExperiencia: 'Derecho', disponibilidad: 'Empleo' }), '', 'el programa, el área, la experiencia y lo que busca ya NO están en la historia (salen en sus líneas)');
  igual(H.historia({ subareasExperiencia: 'Ingeniería; Hospitality' }), 'Subáreas: Ingeniería, Hospitality.', 'subáreas con el formato «Subáreas: A, B» (sin prefijo repetido como «Tiene experiencia en»)');
  igual(H.historia({ subareasExperiencia: 'A; B; C; D; E' }), 'Subáreas: A, B, C.', 'como mucho 3 subáreas');
  igual(H.historia({ etiquetas: 'a; b; c; d; e; f; g; h' }), 'Habilidades: a, b, c, d, e, f.', 'como mucho 6 habilidades');
  igual(H.historia({ etiquetas: 'Excel; excel; Excel' }).includes('Excel, excel'), false, 'sin repetidas exactas');
  // una sola línea, sin saltos, sin textos largos, sin puntos dobles
  const raro = H.historia({ master: 'MBA\nen\r\ninglés\u0000.', formacionPrevia: 'Grado ' + 'muy largo '.repeat(40) });
  chk(!/[\n\r\u0000]/.test(raro) && !/\.\./.test(raro), 'una sola línea, sin saltos ni caracteres de control ni puntos dobles: ' + JSON.stringify(raro));
  chk(raro.length < 260, 'la formación se recorta: ' + raro.length);
  chk(/…\.$/.test(raro), 'la formación recortada acaba en «…» y punto');
  // sin género: no usa «él», «ella», «el alumno», «la alumna»
  chk(!/\b(él|ella|alumno|alumna|estudiante|chico|chica)\b/i.test(h), 'redacción sin género');
}

/* 1b. Idiomas: solo el nombre, sin nivel (v27) */
console.log('1b. Idiomas sin nivel');
{
  const id = t => H.historia({ idiomas: t });
  igual(id('Español nativo; Italiano nativo; Inglés C1'), 'Idiomas: Español, Italiano, Inglés.', '«Italiano nativo» sale como «Italiano»: sin «nativo» ni nivel');
  igual(id('Italiano (nativo); Inglés (B2)'), 'Idiomas: Italiano, Inglés.', 'también entre paréntesis');
  igual(id('Italiano nativa; Francés lengua materna; Alemán materna; Chino native; Árabe bilingüe'), 'Idiomas: Italiano, Francés, Alemán, Chino, Árabe.', 'nativa, lengua materna, materna, native y bilingüe también se quitan');
  igual(id('Inglés A1; Francés A2; Alemán B1; Ruso B2; Chino C1; Árabe C2'), 'Idiomas: Inglés, Francés, Alemán, Ruso, Chino.', 'los seis niveles A1–C2 se quitan (y el máximo de 5 idiomas se mantiene)');
  igual(id('Italiano nativo; italiano; ITALIANO C2'), 'Idiomas: Italiano.', 'sin repetir un idioma que solo se distinguía por su nivel');
  igual(id('Inglés'), 'Idiomas: Inglés.', 'un idioma sin nivel queda igual');
  igual(id('nativo; C1'), '', 'si solo había niveles, no sale la frase');
  for (const t of ['Español nativo; Italiano nativo; Inglés C1', 'Italiano (nativo)', 'Francés lengua materna', 'Árabe bilingüe', 'Chino C2', 'Alemán native']) chk(!/nativ|native|materna|biling|[ABC][12]/i.test(id(t)), 'sin rastro de nivel en la salida de «' + t + '»');
  // el nivel NO se pierde en otros sitios: la ficha y el match siguen leyéndolo del alumno
  chk(!/nativ|[ABC][12]/.test(H.historia(alumno())), 'la historia de Lucía («Español nativo; Inglés C1» en el Sheet) no lleva niveles');
}

/* 2. Lo que se lee del alumno */
console.log('2. Qué campos lee');
{
  const leidos = new Set();
  const espia = new Proxy(alumno(), { get(o, k) { if (typeof k === 'string') leidos.add(k); return o[k]; }, has(o, k) { if (typeof k === 'string') leidos.add(k); return k in o; }, ownKeys(o) { leidos.add('<<ownKeys>>'); return Reflect.ownKeys(o); } });
  H.historia(espia);
  chk([...leidos].every(k => H.CAMPOS_HISTORIA.includes(k)), 'solo se leen campos de la lista blanca: ' + [...leidos].join(', '));
  igual([...leidos].sort(), [...H.CAMPOS_HISTORIA].sort(), 'y se leen todos');
  igual(H.CAMPOS_HISTORIA, ['subareasExperiencia', 'etiquetas', 'idiomas', 'formacionPrevia'], 'la lista blanca es exactamente: subáreas, etiquetas, idiomas y formación');
  // el código (sin comentarios) no nombra ningún campo sensible
  const codigo = fs.readFileSync(new URL('../../js/util/historia.js', import.meta.url), 'utf8').split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
  const prohibidos = ['porQue', 'notasEntrevista', 'situacionTrabajo', 'nacionalidad', 'resumenExperiencia', 'enlaceCV', 'areaExperiencia', 'historial', 'motivo', 'estado', 'disponibilidad', 'nombre', 'apellidos'];
  igual(prohibidos.filter(p => codigo.includes(p)), [], 'el código de historia.js no menciona ningún campo sensible');
  chk(!/\b(fetch|XMLHttpRequest|localStorage|import\s)/.test(codigo), 'historia.js no hace peticiones, no guarda nada y no importa nada');
  const todo = H.historia(alumno());
  chk(CANARIOS.every(c => !todo.includes(c)) && !/2026-10-01|Descartado/.test(todo), 'ningún canario sensible en la historia');
}

/* 3. En el texto de compartir: solo con casilla, y sin filtrar nada */
console.log('3. En el texto de compartir');
{
  const a = alumno();
  const sensibles = C.CAMPOS_SENSIBLES.map(c => c.clave);
  igual(C.CAMPOS_EXTRA.map(c => c.clave), ['historia'], 'hay una casilla extra: «historia»');
  chk(!C.BASE_POR_DEFECTO.includes('historia') && !sensibles.includes('historia'), 'no está entre las casillas por defecto ni entre las sensibles');
  const sin = C.textoPerfiles({ alumnos: [a], campos: C.BASE_POR_DEFECTO });
  chk(!/Historia:|Subáreas:|Habilidades:|Idiomas:/.test(sin), 'por defecto NO sale la historia');
  const con = C.textoPerfiles({ alumnos: [a], campos: [...C.BASE_POR_DEFECTO, 'historia'] });
  chk(/\n   Historia: Subáreas: Producto digital, Experiencia de usuario\. Habilidades:/.test(con) && !/Cursa|Quiere orientar|habilidades\./.test(con.split('Programa:')[0]), 'con la casilla marcada, sale como primera línea del perfil: ' + JSON.stringify(con));
  chk(con.indexOf('Historia:') < con.indexOf('Programa:'), '... antes que el resto de datos');
  chk(con.split('\n').filter(l => /Historia:/.test(l)).length === 1 && !/\n\n\n/.test(con), 'una sola línea de historia, sin huecos raros');
  igual(C.textoPerfiles({ alumnos: [a], campos: ['historia'] }).includes('Lucía'), false, 'la historia no trae el nombre (sale solo si se marca «Nombre»)');
  // aunque se marque TODO
  const todo = C.textoPerfiles({ alumnos: [a], campos: [...C.CAMPOS_BASE.map(c => c.clave), ...sensibles.filter(s => !['nacionalidad', 'situacion', 'experiencia', 'cv'].includes(s)), 'historia'] });
  chk(CANARIOS.filter(c => c !== CAN.exp).every(c => !todo.includes(c)), 'con las casillas no sensibles + historia: ningún canario');
  chk(todo.includes(CAN.exp) && !H.historia(a).includes(CAN.exp), '(el área de experiencia sale por la casilla «Área», que es no sensible; la historia no la usa)');
  const absoluto = C.textoPerfiles({ alumnos: [a], campos: [...C.CAMPOS_BASE.map(c => c.clave), 'historia', 'master', 'area', 'disponibilidad', 'inventada', 'notasEntrevista', 'porQue', 'historial', 'motivo'] });
  chk([CAN.porQue, CAN.notas, CAN.historial, CAN.motivo, CAN.nota, CAN.situacion, CAN.nac1, CAN.resumen, CAN.cv].every(c => !absoluto.includes(c)), 'ni pidiendo a mano casillas que no existen (notasEntrevista, porQue, historial, motivo): no sale nada sensible');
  const marcandoSensiblesSi = C.textoPerfiles({ alumnos: [a], campos: [...C.BASE_POR_DEFECTO, ...sensibles, 'historia'] });
  chk(![CAN.porQue, CAN.notas, CAN.historial, CAN.motivo, CAN.nota].some(c => marcandoSensiblesSi.includes(c)), 'marcando TAMBIÉN las sensibles: siguen sin salir el «por qué», las notas, el historial y los motivos');
  // la historia sola, tras la casilla, no depende de las sensibles
  const h1 = H.historia(a);
  chk(con.includes(h1), 'el texto lleva exactamente la historia de historia()');
}

/* 4. La pantalla */
console.log('4. La pantalla');
{
  const t = await nuevo();
  const { pg, ctx, mundo, log } = t;
  // canarios también en la hoja de verdad: «Por qué», notas, y el historial y los motivos de una aplicación
  const ca = mundo.hojas.Alumnos.m[0], f1 = mundo.hojas.Alumnos.m[1];
  f1[ca.indexOf('Por qué')] = CAN.porQue; f1[ca.indexOf('Notas de entrevista')] = CAN.notas; f1[ca.indexOf('Situación de trabajo en España')] = CAN.situacion;
  f1[ca.indexOf('Resumen de experiencia')] = CAN.resumen;
  const cp = mundo.hojas.Aplicaciones.m[0];
  for (const r of mundo.hojas.Aplicaciones.m.slice(1)) { r[cp.indexOf('Motivo de descarte')] = CAN.motivo; r[cp.indexOf('Notas')] = CAN.nota; }
  const ch = mundo.hojas.Historial.m[0];
  for (const r of mundo.hojas.Historial.m.slice(1)) { r[ch.indexOf('Motivo de descarte')] = CAN.motivo; r[ch.indexOf('Nota')] = CAN.historial; }
  await pg.addInitScript(([u, c]) => { if (sessionStorage.getItem('ini')) return; localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); }, [URL_OK, CLAVE_PRUEBA]);
  await pg.goto(BASE + '#/alumno/A001/compartir'); await pg.waitForSelector('#cp-vista');
  chk(await pg.isVisible('#cp-c-historia') && !(await pg.isChecked('#cp-c-historia')), 'la casilla «Incluir historia» existe y está desmarcada');
  chk(/Texto adicional/.test(await pg.innerText('#v-compartir')) && /plantillas/.test(await pg.innerText('#v-compartir')), 'se explica qué es');
  chk(!/Historia:/.test(await pg.innerText('#cp-vista')), 'sin marcarla, la vista previa no lleva historia');
  await pg.check('#cp-c-historia');
  const v = await pg.innerText('#cp-vista');
  chk(/Historia: Subáreas: Producto digital, Experiencia de usuario\./.test(v) && /Scrum, Gestión de proyectos, Excel/.test(v) && /Idiomas: Español, Inglés\./.test(v) && !/nativo|C1/.test(v) && !/Cursa|Quiere orientar/.test(v), 'marcada, la vista previa lleva la historia de Lucía: ' + v.replace(/\n/g, ' / '));
  chk(await pg.isHidden('#cp-sensible'), 'la historia no cuenta como dato sensible (no sale el aviso de sensibles)');
  // marcar todo lo sensible: la vista previa sigue sin canarios de lo que no se puede compartir
  for (const c of ['nacionalidad', 'situacion', 'experiencia', 'cv']) await pg.check('#cp-c-' + c);
  const t2 = await pg.innerText('#cp-vista');
  chk([CAN.porQue, CAN.notas, CAN.motivo, CAN.nota, CAN.historial].every(c => !t2.includes(c)), 'marcándolo todo, la vista previa nunca lleva «por qué», notas, motivos ni historial');
  chk(/Historia:/.test(t2) && /Situación de trabajo en España: CANARIO-SITUACION/.test(t2), '(la situación sí sale porque se marcó A MANO la casilla sensible; la historia no la usa)');
  await pg.uncheck('#cp-c-situacion');
  chk(!(await pg.innerText('#cp-vista')).includes(CAN.situacion) && /Historia:/.test(await pg.innerText('#cp-vista')), 'con la historia marcada y la situación desmarcada, la situación no sale: la historia no la filtra');
  await pg.uncheck('#cp-c-historia');
  chk(!/Historia:/.test(await pg.innerText('#cp-vista')), 'desmarcada otra vez: desaparece');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  chk(log.peticiones.every(p => !/^guardar|^registrar|^crear|^cambiar/.test(JSON.parse(p.cuerpo || '{}').action || '')), 'no se guarda nada en el Sheet al compartir');
  await ctx.close();
}

await terminar();
