// Pruebas de js/util/rondas.js (funciones puras: sin navegador).
import * as R from '../../js/util/rondas.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));

const rondas = [
  { id: 'R001', idOferta: 'O002', numero: '1', fecha: '2026-10-10' }, { id: 'R002', idOferta: 'O002', numero: '2', fecha: '2026-10-21' },
  { id: 'R010', idOferta: 'O002', numero: '10', fecha: '2026-10-30' }, { id: 'R003', idOferta: 'O003', numero: '1', fecha: '2026-10-13' },
];
const apps = [
  { id: 'AP002', idAlumno: 'A1', idOferta: 'O002', numeroRonda: '1', fecha: '2026-10-11', estado: 'Descartado' },
  { id: 'AP001', idAlumno: 'A2', idOferta: 'O002', numeroRonda: '1', fecha: '2026-10-11', estado: 'Entrevista' },
  { id: 'AP003', idAlumno: 'A1', idOferta: 'O002', numeroRonda: '2', fecha: '2026-10-22', estado: 'Recibida' },
  { id: 'AP004', idAlumno: 'A3', idOferta: 'O002', numeroRonda: '1', fecha: '2026-10-09', estado: 'Fichado' },
  { id: 'AP005', idAlumno: 'A1', idOferta: 'O003', numeroRonda: '1', fecha: '2026-10-14', estado: 'Recibida' },
];

console.log('rondas.js');
igual(R.rondasDeOferta(rondas, 'O002').map(r => r.numero), ['10', '2', '1'], 'las rondas de una oferta van de la más reciente a la más antigua (10 va antes que 2: se ordena como número, no como texto)');
igual(R.rondasDeOferta(rondas, 'O999'), [], 'una oferta sin rondas');
igual(R.aplicacionesDeRonda(apps, 'O002', '1').map(a => a.id), ['AP004', 'AP001', 'AP002'], 'las aplicaciones de una ronda, por fecha y, a igual fecha, por ID');
igual(R.aplicacionesDeRonda(apps, 'O002', 1).length, 3, 'el número de ronda vale como número o como texto');
igual(R.aplicacionesDeAlumno(apps, 'A1').map(a => a.id), ['AP003', 'AP005', 'AP002'], 'las aplicaciones de un alumno, las más recientes primero');
igual(R.resumenEstados(apps.filter(a => a.numeroRonda === '1' && a.idOferta === 'O002'), ['Recibida', 'Entrevista', 'Descartado']), [{ estado: 'Entrevista', n: 1 }, { estado: 'Descartado', n: 1 }, { estado: 'Fichado', n: 1 }], 'resumen por estado: en el orden de la lista y, al final, los que no están en ella');
igual(R.resumenEstados([], ['Recibida']), [], 'resumen vacío');
igual(R.resumenEstados([{ estado: '' }]), [{ estado: 'Sin estado', n: 1 }], 'una aplicación sin estado se cuenta como "Sin estado"');

const historial = [
  { id: 'H003', idAplicacion: 'AP001', fecha: '2026-10-14' }, { id: 'H001', idAplicacion: 'AP001', fecha: '2026-10-11' },
  { id: 'H002', idAplicacion: 'AP001', fecha: '2026-10-11' }, { id: 'H009', idAplicacion: 'AP002', fecha: '2026-10-20' },
];
igual(R.historialDe(historial, 'AP001').map(h => h.id), ['H001', 'H002', 'H003'], 'el historial de una aplicación, en orden');
igual(R.ultimoMovimiento({ id: 'AP001', fecha: '2026-10-11' }, historial), '2026-10-14', 'último movimiento: el cambio más reciente');
igual(R.ultimoMovimiento({ id: 'AP777', fecha: '2026-10-15' }, historial), '2026-10-15', 'sin historial: la fecha de la aplicación');
igual(R.ultimoMovimiento({ id: 'AP777', fecha: '' }, []), '', 'sin nada: vacío');

igual(R.siguienteRonda(rondas, { id: 'O002', fechaRecepcion: '2026-10-08' }), { numero: 11, desde: '2026-10-30' }, 'siguiente ronda: la última + 1, y no antes de la última');
igual(R.siguienteRonda(rondas, { id: 'O004', fechaRecepcion: '2026-10-12' }), { numero: 1, desde: '2026-10-12' }, 'primera ronda: no antes de recibir la oferta');
igual(R.siguienteRonda([], { id: 'O004', fechaRecepcion: '' }), { numero: 1, desde: '' }, 'sin ninguna fecha, sin límite');

const alumnos = [{ id: 'A1', nombre: 'Zoe', apellidos: 'Álvarez' }, { id: 'A2', nombre: 'Ana', apellidos: 'Pons' }, { id: 'A3', nombre: 'Óscar', apellidos: 'Ruiz' }, { id: 'A4', nombre: 'Berta', apellidos: '' }];
igual(R.alumnosSinAplicar(alumnos, apps, 'O002', 1).map(a => a.id), ['A4'], 'quien ya aplicó a esa ronda no sale');
igual(R.alumnosSinAplicar(alumnos, apps, 'O002', 2).map(a => a.id), ['A2', 'A4', 'A3'], 'por nombre, con tildes en su sitio (Ana, Berta, Óscar)');
igual(R.nombreAlumno({ nombre: 'Berta', apellidos: '' }), 'Berta', 'nombre sin apellidos');

const al = (sit, n1 = 'España', n2 = '') => ({ nombre: 'Lucía', apellidos: 'Q', situacionTrabajo: sit, nacionalidadPrincipal: n1, nacionalidadSecundaria: n2 });
igual(R.avisosRequisitos(al('Necesita permiso de trabajo'), { requisitoPermiso: 'Permiso de trabajo en vigor' }).length, 1, 'permiso en vigor y "Necesita permiso": avisa');
igual(R.avisosRequisitos(al('Permiso de estudiante'), { requisitoPermiso: 'Permiso de trabajo en vigor' }).length, 1, 'permiso en vigor y "Permiso de estudiante": avisa');
igual(R.avisosRequisitos(al('Residente con permiso de trabajo'), { requisitoPermiso: 'Permiso de trabajo en vigor' }), [], 'con permiso: no avisa');
igual(R.avisosRequisitos(al('Ciudadano UE o español'), { requisitoPermiso: 'Permiso de trabajo en vigor' }), [], 'ciudadano UE: no avisa');
igual(R.avisosRequisitos(al('Necesita permiso de trabajo'), { requisitoPermiso: 'No requerido' }), [], 'oferta que no pide permiso: no avisa');
igual(R.avisosRequisitos(al('Algo raro'), { requisitoPermiso: 'Permiso de trabajo en vigor' }), [], 'en la duda (situación desconocida): no avisa');
igual(R.avisosRequisitos(al(''), { requisitoPermiso: 'Permiso de trabajo en vigor' }), [], 'situación vacía: no avisa');
igual(R.avisosRequisitos(al('Ciudadano UE o español', 'Chile'), { requisitoNacionalidad: 'Estados Unidos' }).length, 1, 'nacionalidad requerida distinta: avisa');
igual(R.avisosRequisitos(al('Ciudadano UE o español', 'Chile', 'Estados Unidos'), { requisitoNacionalidad: 'Estados Unidos' }), [], 'la tiene como secundaria: no avisa');
igual(R.avisosRequisitos(al('Ciudadano UE o español', 'Estados Unidos'), { requisitoNacionalidad: 'Estados Unidos' }), [], 'la tiene: no avisa');
igual(R.avisosRequisitos(al('Ciudadano UE o español', ''), { requisitoNacionalidad: 'Estados Unidos' }), [], 'sin nacionalidad conocida: no avisa');
igual(R.avisosRequisitos(al('Ciudadano UE o español', 'Chile'), { requisitoNacionalidad: '' }), [], 'sin requisito de nacionalidad: no avisa');
igual(R.avisosRequisitos(al('Necesita permiso de trabajo', 'Chile'), { requisitoPermiso: 'Permiso de trabajo en vigor', requisitoNacionalidad: 'Estados Unidos' }).length, 2, 'los dos choques a la vez: dos avisos');
chk(/«Necesita permiso de trabajo»/.test(R.avisosRequisitos(al('Necesita permiso de trabajo'), { requisitoPermiso: 'Permiso de trabajo en vigor' })[0]), 'el aviso dice la situación del alumno');

igual([R.claseEstado('Contratado'), R.claseEstado('Descartado'), R.claseEstado('Entrevista'), R.claseEstado('')], [' contratado', ' descartada', '', ''], 'clase de color de cada estado');

/* ---- Validadores de los formularios ---- */
const HOY = '2026-10-31';
const ctx = (desde = '') => ({ hoy: HOY, desde });
igual(R.validarRonda('2026-10-30', ctx('2026-10-12')), null, 'ronda: fecha buena');
igual(R.validarRonda('', ctx()), { campo: 'fecha', codigo: 'requerido' }, 'ronda: sin fecha');
igual(R.validarRonda('30/10/2026', ctx()), { campo: 'fecha', codigo: 'fecha' }, 'ronda: formato malo');
igual(R.validarRonda('2026-02-30', ctx()), { campo: 'fecha', codigo: 'fecha' }, 'ronda: día imposible');
igual(R.validarRonda('1999-12-31', ctx()), { campo: 'fecha', codigo: 'fecha' }, 'ronda: antes del año 2000');
igual(R.validarRonda('2026-11-01', ctx()), { campo: 'fecha', codigo: 'fecha-futura' }, 'ronda: mañana');
igual(R.validarRonda('2026-10-31', ctx()), null, 'ronda: hoy vale');
igual(R.validarRonda('2026-10-11', ctx('2026-10-12')), { campo: 'fecha', codigo: 'fecha-anterior', desde: '2026-10-12' }, 'ronda: antes de la oferta');
igual(R.validarRonda('2026-10-12', ctx('2026-10-12')), null, 'ronda: el mismo día que la oferta vale');

igual(R.validarAplicacion({ idAlumno: '', fecha: '2026-10-30', notas: '' }, ctx()), { campo: 'alumno', codigo: 'requerido' }, 'aplicación: sin alumno (lo primero)');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '', notas: '' }, ctx()), { campo: 'fecha', codigo: 'requerido' }, 'aplicación: sin fecha');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-20', notas: '' }, ctx('2026-10-21')), { campo: 'fecha', codigo: 'fecha-anterior', desde: '2026-10-21' }, 'aplicación: antes de la ronda');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-30', notas: 'x'.repeat(2001) }, ctx()), { campo: 'notas', codigo: 'largo' }, 'aplicación: notas largas');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-30', notas: 'x'.repeat(2000) }, ctx()), null, 'aplicación: 2000 caracteres justos');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-30', notas: 'a <b>b</b>' }, ctx()), { campo: 'notas', codigo: 'html' }, 'aplicación: HTML');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-30', notas: 'a\u0000b' }, ctx()), { campo: 'notas', codigo: 'caracteres' }, 'aplicación: carácter de control');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-30', notas: 'tiene 3 < 5 años, <3, a < b' }, ctx()), null, 'aplicación: "<" suelto no es HTML');
igual(R.validarAplicacion({ idAlumno: 'A1', fecha: '2026-10-30', notas: 'línea 1\nlínea 2\ttab ñ 😀' }, ctx()), null, 'aplicación: varias líneas, tabulador, tildes y emojis');

const L = { estadosAplicacion: ['Recibida', 'En revisión', 'Descartado'], motivosDescarte: ['Otro', 'Perfil no encaja'] };
const cambio = (v, actual = { estado: 'En revisión', motivo: '' }, extra = {}) => R.validarCambio({ fecha: '2026-10-30', nota: '', motivo: '', ...v }, { actual, listas: L, ...ctx('2026-10-27'), ...extra });
igual(cambio({ estado: 'Recibida' }), null, 'cambio: hacia atrás vale');
igual(cambio({ estado: '' }), { campo: 'estado', codigo: 'requerido' }, 'cambio: sin estado');
igual(cambio({ estado: 'Fichado' }), { campo: 'estado', codigo: 'lista' }, 'cambio: estado que no está en la lista');
igual(cambio({ estado: 'Fichado' }, { estado: 'Fichado', motivo: '' }, { }), { campo: 'estado', codigo: 'sin-cambios' }, 'cambio: el estado de ahora (aunque ya no esté en la lista) se reconoce: sin cambios');
igual(cambio({ estado: 'Descartado' }), { campo: 'motivo', codigo: 'requerido' }, 'cambio: Descartado exige motivo');
igual(cambio({ estado: 'Descartado', motivo: 'Inventado' }), { campo: 'motivo', codigo: 'lista' }, 'cambio: motivo que no está en la lista');
igual(cambio({ estado: 'Descartado', motivo: 'Otro' }), null, 'cambio: Descartado con motivo');
igual(cambio({ estado: 'Recibida', motivo: 'Otro' }), { campo: 'motivo', codigo: 'motivo-sobra' }, 'cambio: motivo con otro estado');
igual(cambio({ estado: 'En revisión' }), { campo: 'estado', codigo: 'sin-cambios' }, 'cambio: igual que ahora');
igual(cambio({ estado: 'Descartado', motivo: 'Otro' }, { estado: 'Descartado', motivo: 'Otro' }), { campo: 'estado', codigo: 'sin-cambios' }, 'cambio: descartado con el mismo motivo');
igual(cambio({ estado: 'Descartado', motivo: 'Perfil no encaja' }, { estado: 'Descartado', motivo: 'Otro' }), null, 'cambio: solo el motivo');
igual(cambio({ estado: 'Descartado', motivo: 'Viejo' }, { estado: 'Descartado', motivo: 'Viejo' }), { campo: 'estado', codigo: 'sin-cambios' }, 'cambio: un motivo antiguo que ya no está en la lista, tal cual, es "sin cambios"');
igual(cambio({ estado: 'Recibida', fecha: '2026-10-26' }), { campo: 'fecha', codigo: 'fecha-anterior', desde: '2026-10-27' }, 'cambio: antes de su último movimiento');
igual(cambio({ estado: 'Recibida', fecha: '2026-11-01' }), { campo: 'fecha', codigo: 'fecha-futura' }, 'cambio: fecha futura');
igual(cambio({ estado: 'Recibida', nota: '<script>' }), { campo: 'nota', codigo: 'html' }, 'cambio: nota con HTML');
igual(cambio({ estado: 'Recibida', nota: 'x'.repeat(2001) }), { campo: 'nota', codigo: 'largo' }, 'cambio: nota larga');
igual(cambio({ estado: 'Recibida', fecha: '' }), { campo: 'fecha', codigo: 'requerido' }, 'cambio: sin fecha');
igual([R.normalizarTexto('  a\r\nb\rc  '), R.normalizarTexto(null), R.problemaNota('')], ['a\nb\nc', '', ''], 'normalizar: saltos de línea, null y vacío');
igual(R.MAX_NOTAS, 2000, 'las notas admiten 2.000 caracteres (como en el script)');

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
