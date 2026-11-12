// Pruebas de js/util/avisos.js y js/util/preferencias.js (funciones puras: sin navegador).
// El reloj nunca se lee dentro del cálculo: "hoy" se pasa siempre, así los resultados no dependen del día en que se pruebe.
import * as A from '../../js/util/avisos.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));

// Un localStorage de mentira (en memoria) para probar las preferencias sin navegador.
const memoria = new Map();
let fallaAlmacen = false;
globalThis.localStorage = {
  getItem: k => { if (fallaAlmacen) throw new Error('sin almacenamiento'); return memoria.has(k) ? memoria.get(k) : null; },
  setItem: (k, v) => { if (fallaAlmacen) throw new Error('sin almacenamiento'); memoria.set(k, String(v)); },
  removeItem: k => { if (fallaAlmacen) throw new Error('sin almacenamiento'); memoria.delete(k); },
};
const P = await import('../../js/util/preferencias.js');

console.log('1. Fechas');
igual(A.sumarDias('2026-11-12', -30), '2026-10-13', 'hoy − 30 días');
igual(A.sumarDias('2026-03-01', -1), '2026-02-28', 'cruza el fin de mes');
igual(A.sumarDias('2026-12-20', 30), '2027-01-19', 'cruza el fin de año');
igual(A.hoyISO(new Date(2026, 10, 5)), '2026-11-05', 'hoyISO con ceros');
igual(A.fechaCorta('2026-10-13'), '13 de octubre', 'fecha corta');

console.log('2. Umbrales: validar lo que escribe la persona');
igual(A.UMBRALES_POR_DEFECTO, { dias: 30, ofertas: 3, solicitudes: 5, porcentaje: 80 }, 'valores por defecto: 30 días, 3 ofertas, 5 solicitudes y 80 %');
igual(A.validarUmbrales({ dias: '30', ofertas: '3', solicitudes: '5', porcentaje: '80' }).umbrales, { dias: 30, ofertas: 3, solicitudes: 5, porcentaje: 80 }, 'valores buenos (escritos como texto)');
for (const [campo, malo, codigo] of [['dias', '', 'vacio'], ['dias', '  ', 'vacio'], ['dias', '3.5', 'entero'], ['dias', '-1', 'entero'], ['dias', 'abc', 'entero'], ['dias', '1e2', 'entero'],
  ['dias', '0', 'rango'], ['dias', '366', 'rango'], ['ofertas', '51', 'rango'], ['solicitudes', '0', 'rango'], ['porcentaje', '0', 'rango'], ['porcentaje', '101', 'rango']]) {
  const r = A.validarUmbrales({ ...A.UMBRALES_POR_DEFECTO, [campo]: malo });
  chk(r.umbrales === null && r.errores[campo] === codigo, `${campo} = «${malo}» → ${codigo}: ${JSON.stringify(r.errores)}`);
}
for (const [campo, bueno] of [['dias', '1'], ['dias', '365'], ['porcentaje', '100'], ['porcentaje', '1'], ['ofertas', '50']]) chk(A.validarUmbrales({ ...A.UMBRALES_POR_DEFECTO, [campo]: bueno }).umbrales?.[campo] === Number(bueno), `${campo} = ${bueno} vale (límite incluido)`);
igual(Object.keys(A.validarUmbrales({}).errores).sort(), ['dias', 'ofertas', 'porcentaje', 'solicitudes'], 'sin nada: los 4 campos fallan');
igual(A.umbralesSaneados({ dias: 7, ofertas: 'x', solicitudes: 9999, porcentaje: 50 }), { dias: 7, ofertas: 3, solicitudes: 5, porcentaje: 50 }, 'lo guardado con basura: lo válido se conserva y el resto vuelve al valor por defecto');
igual(A.umbralesSaneados(null), A.UMBRALES_POR_DEFECTO, 'nada guardado: los valores por defecto');
igual(A.umbralesSaneados('hola'), A.UMBRALES_POR_DEFECTO, 'un texto en vez de un objeto: los valores por defecto');

console.log('3. Cálculo de los avisos');
const HOY = '2026-11-12';   // con 30 días: el periodo empieza el 13 de octubre
const al = (id, extra = {}) => ({ id, nombre: 'N' + id, apellidos: 'Ap', areaDestino: 'Área X', areaExperiencia: 'Área X', disponibilidad: 'Ambas', nacionalidadPrincipal: 'España', situacionTrabajo: 'Ciudadano UE o español', ...extra });
const of = (id, extra = {}) => ({ id, empresa: 'E' + id, titulo: 'T' + id, area: 'Área X', tipo: 'Prácticas', requisitoNacionalidad: '', requisitoPermiso: 'No requerido', ...extra });
const ronda = (id, idOferta, fecha) => ({ id, idOferta, numero: '1', fecha });
const sol = (id, idAlumno, idOferta, fecha, estado = 'Recibida') => ({ id, idAlumno, idOferta, numeroRonda: '1', fecha, estado });
const calc = (o, umbrales) => A.calcularAvisos({ hoy: HOY, umbrales: { ...A.UMBRALES_POR_DEFECTO, ...umbrales }, alumnos: [], ofertas: [], rondas: [], aplicaciones: [], ...o });
const ids = r => r.avisos.map(a => a.id).sort();

// Un periodo completo: la primera ronda es anterior al 13 de octubre, así que no se recorta.
const rondas4 = [ronda('R0', 'O0', '2026-09-01'), ronda('R1', 'O1', '2026-10-20'), ronda('R2', 'O2', '2026-10-25'), ronda('R3', 'O3', '2026-11-01'), ronda('R4', 'O4', '2026-11-05')];
const ofertas = ['O0', 'O1', 'O2', 'O3', 'O4'].map(id => of(id));

// 3a. Sin solicitudes
{
  const r = calc({ alumnos: [al('A1'), al('A2')], ofertas, rondas: rondas4, aplicaciones: [sol('S1', 'A2', 'O1', '2026-10-21')] });
  igual(ids(r), ['A1|sin-solicitudes'], 'sin solicitudes: salta A1 (ninguna) y no A2 (una en el periodo)');
  igual(r.periodo, { desde: '2026-10-13', hasta: HOY, ofertas: 4, recortado: false }, 'el periodo: 30 días y 4 ofertas difundidas');
  const m = r.avisos[0].motivo;
  chk(/Ninguna solicitud en los últimos 30 días/.test(m) && /difundieron 4 ofertas/.test(m) && /Salta si se difunden 3 o más/.test(m), 'el motivo explica por qué salta: ' + m);
  igual(r.avisos[0].id, 'A1|sin-solicitudes', 'el aviso tiene un identificador estable (alumno|tipo)');
}
// bordes de fecha
{
  const sinSol = f => ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: [sol('S1', 'A1', 'O1', f)] }));
  igual(sinSol('2026-10-13'), [], 'una solicitud justo el primer día del periodo cuenta');
  igual(sinSol('2026-10-12'), ['A1|sin-solicitudes'], 'una solicitud un día antes del periodo NO cuenta');
  igual(sinSol(HOY), [], 'una solicitud de hoy cuenta');
  igual(sinSol('2026-11-13'), ['A1|sin-solicitudes'], 'una solicitud con fecha de mañana no cuenta');
  igual(sinSol(''), [], 'una solicitud SIN fecha: no se puede situar, así que no se avisa (por si acaso)');
  igual(sinSol('31/10/2026'), [], 'una solicitud con fecha rara: tampoco se avisa');
}
// umbral M (ofertas difundidas)
{
  const con = n => ids(calc({ alumnos: [al('A1')], ofertas, rondas: [ronda('R0', 'O0', '2026-09-01'), ...['O1', 'O2', 'O3', 'O4'].slice(0, n).map((o, i) => ronda('RR' + i, o, '2026-11-01'))] }));
  igual(con(2), [], 'con 2 ofertas difundidas y umbral 3: no salta');
  igual(con(3), ['A1|sin-solicitudes'], 'con 3 ofertas difundidas y umbral 3: salta');
  const r4 = ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4 }, { ofertas: 5 }));
  igual(r4, [], 'subiendo el umbral a 5: con 4 ofertas ya no salta (el umbral se respeta)');
  const dos = calc({ alumnos: [al('A1')], ofertas, rondas: [ronda('R0', 'O1', '2026-10-20'), ronda('R1', 'O1', '2026-10-28'), ronda('R2', 'O2', '2026-11-01')] }, { ofertas: 3 });
  igual(dos.periodo.ofertas, 2, 'dos rondas de la MISMA oferta cuentan como una oferta');
}
// días editables
{
  const r = calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: [sol('S1', 'A1', 'O1', '2026-10-20')] }, { dias: 7 });
  igual(r.periodo.desde, '2026-11-05', 'con 7 días el periodo empieza el 5 de noviembre');
  igual(ids(r), [], 'con 7 días solo hay 1 oferta difundida (<3): no salta');
}
// desde la primera ronda
{
  const nuevas = [ronda('R1', 'O1', '2026-11-03'), ronda('R2', 'O2', '2026-11-05'), ronda('R3', 'O3', '2026-11-06')];
  const r = calc({ alumnos: [al('A1')], ofertas, rondas: nuevas });
  igual(r.periodo, { desde: '2026-11-03', hasta: HOY, ofertas: 3, recortado: true }, 'el periodo cuenta desde la primera ronda si es más reciente que hoy − N');
  chk(/desde la primera ronda \(3 de noviembre\)/.test(r.avisos[0].motivo), 'el motivo lo dice: ' + r.avisos[0].motivo);
  igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: nuevas, aplicaciones: [sol('S1', 'A1', 'O1', '2026-10-30')] })), ['A1|sin-solicitudes'], 'una solicitud anterior a la primera ronda no cuenta en el periodo');
}
// contratado
igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: [sol('S1', 'A1', 'O0', '2026-09-10', 'Contratado')] })), [], 'quien ya está Contratado no recibe "sin solicitudes"');
igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: [sol('S1', 'A1', 'O0', '2026-09-10', 'Descartado')] })), ['A1|sin-solicitudes'], 'un descartado antiguo no lo evita');
// sin rondas / hoy roto
igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: [] })), [], 'sin rondas no hay avisos');
igual(A.calcularAvisos({ hoy: 'ayer', alumnos: [al('A1')], rondas: rondas4, umbrales: A.UMBRALES_POR_DEFECTO }).avisos, [], 'una fecha de hoy rota no da avisos (ni errores)');
igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: [{ id: 'RX', idOferta: 'O1', fecha: '' }, { id: 'RY', idOferta: 'O1', fecha: 'xx' }] })), [], 'rondas sin fecha válida: se ignoran');

// 3b. Aplica a todo
{
  const sols = n => Array.from({ length: n }, (_, i) => sol('S' + i, 'A1', 'O' + (i % 4 + 1), '2026-10-2' + i));
  igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: sols(4) })), [], '4 solicitudes (umbral 5): no salta');
  const r = calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: sols(5) });
  igual(ids(r), ['A1|aplica-a-todo'], '5 solicitudes a las 4 ofertas difundidas (100 %): salta');
  const m = r.avisos[0].motivo;
  chk(/5 solicitudes en los últimos 30 días, a 4 de las 4 ofertas difundidas \(100 %\)/.test(m) && /Salta con 5 o más solicitudes y un 80 % o más/.test(m), 'el motivo lleva los números y la regla: ' + m);
  chk(!/según el match/.test(m), 'si todas encajan, no menciona el match');
  // porcentaje: 3 de 5 ofertas = 60 %
  const cinco = [...rondas4, ronda('R5', 'O5', '2026-11-08')];
  const of5 = [...ofertas, of('O5')];
  const tres = [sol('S1', 'A1', 'O1', '2026-10-20'), sol('S2', 'A1', 'O2', '2026-10-21'), sol('S3', 'A1', 'O3', '2026-10-22')];
  igual(ids(calc({ alumnos: [al('A1')], ofertas: of5, rondas: cinco, aplicaciones: tres }, { solicitudes: 3 })), [], '3 de 5 ofertas (60 %): no salta con 80 %');
  igual(ids(calc({ alumnos: [al('A1')], ofertas: of5, rondas: cinco, aplicaciones: tres }, { solicitudes: 3, porcentaje: 60 })), ['A1|aplica-a-todo'], 'con el umbral al 60 %, 3 de 5 sí salta (el porcentaje es editable y el borde cuenta)');
  const cuatro = [...tres, sol('S4', 'A1', 'O4', '2026-10-23')];
  igual(ids(calc({ alumnos: [al('A1')], ofertas: of5, rondas: cinco, aplicaciones: cuatro }, { solicitudes: 4 })), ['A1|aplica-a-todo'], '4 de 5 ofertas = 80 % justo: salta (el 80 % cuenta)');
  // solicitudes repetidas a la misma oferta no inflan el porcentaje
  const repes = Array.from({ length: 6 }, (_, i) => sol('S' + i, 'A1', 'O1', '2026-10-2' + i));
  igual(ids(calc({ alumnos: [al('A1')], ofertas: of5, rondas: cinco, aplicaciones: repes })), [], '6 solicitudes a la MISMA oferta: 1 de 5 ofertas, no salta');
  // solicitudes sin fecha no cuentan
  igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: sols(5).map(s => ({ ...s, fecha: '' })) })), [], 'solicitudes sin fecha válida: no cuentan para "aplica a todo"');
  // dato extra del match: ofertas de otra área
  const otras = ofertas.map(o => (o.id === 'O1' || o.id === 'O2') ? { ...o, area: 'Otra área' } : o);
  const m2 = calc({ alumnos: [al('A1')], ofertas: otras, rondas: rondas4, aplicaciones: sols(5) }).avisos[0].motivo;
  chk(/De ellas, 2 no encajan según el match\./.test(m2), 'dato extra: cuántas no encajan según el match: ' + m2);
  const aviso1 = calc({ alumnos: [al('A1')], ofertas: otras.map(o => ({ ...o, area: o.id === 'O1' ? 'Otra área' : 'Área X' })), rondas: rondas4, aplicaciones: sols(5) }).avisos[0].motivo;
  chk(/De ellas, 1 no encaja según el match\./.test(aviso1), 'en singular: «1 no encaja»');
  igual(ids(calc({ alumnos: [al('A1')], ofertas: otras, rondas: rondas4, aplicaciones: sols(5) })), ['A1|aplica-a-todo'], 'el match NO decide si salta: con ofertas que no encajan sigue saltando solo por las reglas de arriba');
  // los dos avisos a la vez no son posibles; y un alumno con 5 solicitudes no tiene "sin solicitudes"
  igual(ids(calc({ alumnos: [al('A1')], ofertas, rondas: rondas4, aplicaciones: sols(5) })).includes('A1|sin-solicitudes'), false, 'quien aplica a todo no tiene también "sin solicitudes"');
}
// 3c. Varios alumnos y utilidades
{
  const r = calc({ alumnos: [al('A1'), al('A2'), al('A3')], ofertas, rondas: rondas4, aplicaciones: Array.from({ length: 5 }, (_, i) => sol('S' + i, 'A3', 'O' + (i % 4 + 1), '2026-10-2' + i)) });
  igual([A.contar(r.avisos, 'sin-solicitudes'), A.contar(r.avisos, 'aplica-a-todo')], [2, 1], 'contadores por tipo: 2 sin solicitudes y 1 aplica a todo');
  igual(A.avisosDe(r.avisos, 'A3').map(a => a.tipo), ['aplica-a-todo'], 'los avisos de un alumno');
  igual(A.avisosDe(r.avisos, 'A9'), [], 'un alumno sin avisos');
}

console.log('4. Silenciar 30 días');
{
  const hasta = A.silenciadoHasta('2026-11-12');
  igual(hasta, '2026-12-12', 'silenciar desde hoy: hasta 30 días después');
  const s = { 'A1|sin-solicitudes': hasta };
  chk(A.estaSilenciado(s, 'A1|sin-solicitudes', '2026-11-12') && A.estaSilenciado(s, 'A1|sin-solicitudes', '2026-12-11'), 'silenciado hasta el día anterior a la fecha');
  chk(!A.estaSilenciado(s, 'A1|sin-solicitudes', '2026-12-12') && !A.estaSilenciado(s, 'A1|sin-solicitudes', '2027-01-01'), 'a partir de la fecha el aviso vuelve');
  chk(!A.estaSilenciado(s, 'A1|aplica-a-todo', '2026-11-12'), 'silenciar un tipo no silencia el otro');
  chk(!A.estaSilenciado({ 'A1|sin-solicitudes': 'basura' }, 'A1|sin-solicitudes', '2026-11-12') && !A.estaSilenciado(null, 'x', '2026-11-12'), 'datos rotos: no se silencia nada');
  const av = [{ id: 'A1|sin-solicitudes' }, { id: 'A2|sin-solicitudes' }];
  igual(A.repartir(av, s, '2026-11-12'), { activos: [{ id: 'A2|sin-solicitudes' }], silenciados: [{ id: 'A1|sin-solicitudes' }] }, 'repartir en activos y silenciados');
}

console.log('5. Preferencias de este móvil');
{
  igual(P.leerUmbrales(), A.UMBRALES_POR_DEFECTO, 'sin nada guardado: valores por defecto');
  chk(P.guardarUmbrales({ dias: 14, ofertas: 2, solicitudes: 4, porcentaje: 70 }) && JSON.stringify(P.leerUmbrales()) === JSON.stringify({ dias: 14, ofertas: 2, solicitudes: 4, porcentaje: 70 }), 'guardar y leer los umbrales');
  P.guardarUmbrales(A.UMBRALES_POR_DEFECTO);
  chk(!memoria.has('gad.avisos'), 'guardar los valores por defecto no deja nada guardado');
  memoria.set('gad.avisos', '{no es json'); igual(P.leerUmbrales(), A.UMBRALES_POR_DEFECTO, 'lo guardado roto: valores por defecto, sin errores');
  memoria.set('gad.avisos', '{"dias":0,"ofertas":4}'); igual(P.leerUmbrales(), { ...A.UMBRALES_POR_DEFECTO, ofertas: 4 }, 'lo guardado a medias: lo válido se aprovecha');
  P.restablecerUmbrales(); chk(!memoria.has('gad.avisos'), 'restablecer borra los umbrales guardados');

  igual(P.limpiarFirma('  Ana   Pérez \n\t'), 'Ana Pérez', 'firma: espacios y saltos recogidos en una línea');
  igual(P.limpiarFirma('Ana <b>Pérez</b>'), 'Ana b Pérez /b', 'firma: sin < ni > (se cambian por un espacio)');
  igual(P.limpiarFirma('x'.repeat(100)).length, 60, 'firma: como mucho 60 caracteres');
  igual(P.limpiarFirma(null), '', 'firma vacía');
  chk(P.guardarFirma('  Ana Pérez ') && P.leerFirma() === 'Ana Pérez' && memoria.get('gad.firma') === 'Ana Pérez', 'guardar y leer la firma');
  P.guardarFirma('   '); chk(!memoria.has('gad.firma'), 'una firma vacía borra lo guardado');

  const hasta = '2026-12-12';
  chk(P.silenciar('A1|sin-solicitudes', hasta) && JSON.stringify(P.leerSilencios()) === JSON.stringify({ 'A1|sin-solicitudes': hasta }), 'silenciar y leer');
  P.silenciar('A2|aplica-a-todo', hasta); igual(Object.keys(P.leerSilencios()).sort(), ['A1|sin-solicitudes', 'A2|aplica-a-todo'], 'se acumulan');
  chk(!P.silenciar('<script>|sin-solicitudes', hasta) && !P.silenciar('A1|otra-cosa', hasta), 'no se guardan claves raras');
  memoria.set('gad.silencios', JSON.stringify({ 'A1|sin-solicitudes': hasta, '<img>|sin-solicitudes': hasta, 'A3|sin-solicitudes': 'mañana', 'A4|aplica-a-todo': 5 }));
  igual(Object.keys(P.leerSilencios()), ['A1|sin-solicitudes'], 'al leer, lo roto o raro se descarta');
  memoria.set('gad.silencios', '[1,2]'); igual(P.leerSilencios(), {}, 'una lista en vez de un objeto: nada');
  memoria.set('gad.silencios', '{no'); igual(P.leerSilencios(), {}, 'JSON roto: nada');
  P.silenciar('A1|sin-solicitudes', hasta); P.quitarSilencio('A1|sin-solicitudes');
  chk(!memoria.has('gad.silencios'), 'quitar el último silencio no deja nada guardado');

  // lo guardado es solo eso: nada de datos de alumnos
  P.guardarUmbrales({ dias: 14, ofertas: 2, solicitudes: 4, porcentaje: 70 }); P.guardarFirma('Ana'); P.silenciar('A1|sin-solicitudes', hasta);
  igual([...memoria.keys()].sort(), ['gad.avisos', 'gad.firma', 'gad.silencios'], 'solo se guardan tres claves');
  chk(![...memoria.values()].join('|').match(/notas|nacionalidad|clave|script\.google/i), 'lo guardado no lleva notas, nacionalidades ni claves');

  // sin almacenamiento (modo privado): nada falla
  fallaAlmacen = true;
  igual(P.leerUmbrales(), A.UMBRALES_POR_DEFECTO, 'sin almacenamiento: los umbrales por defecto');
  chk(P.leerFirma() === '' && Object.keys(P.leerSilencios()).length === 0, 'sin almacenamiento: firma vacía y sin silencios');
  chk(P.guardarFirma('Ana') === false && P.silenciar('A1|sin-solicitudes', hasta) === false && P.guardarUmbrales({ dias: 1, ofertas: 1, solicitudes: 1, porcentaje: 1 }) === false, 'sin almacenamiento: guardar devuelve false (la pantalla lo puede decir)');
  fallaAlmacen = false;
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
