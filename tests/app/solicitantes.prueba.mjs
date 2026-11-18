// v32: «Quién ha solicitado» (js/util/rondas.js, solicitantesDeOferta). Función pura: sin navegador.
// Una fila por alumno con su solicitud más reciente, orden de más a menos avanzado, recuento por estado, y nada que no sea estado, fecha y ronda.
import * as R from '../../js/util/rondas.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));

const alumnos = ['Ana', 'Beto', 'Cira', 'Dani', 'Eva', 'Fito'].map((n, i) => ({ id: 'A' + (i + 1), nombre: n, apellidos: 'Prueba', master: 'MBA' }));
const ap = (id, a, ronda, fecha, estado, extra = {}) => ({ id, idAlumno: a, idOferta: 'O1', numeroRonda: String(ronda), fecha, estado, ...extra });

console.log('1. Una fila por alumno, con su solicitud más reciente');
{
  const apps = [
    ap('AP1', 'A1', 1, '2026-10-11', 'Descartado', { motivo: 'MOTIVO-CANARIO', notas: 'NOTA-CANARIO' }),
    ap('AP2', 'A1', 2, '2026-10-21', 'Recibida'),
    ap('AP3', 'A2', 1, '2026-10-12', 'Entrevista'),
    ap('AP4', 'A3', 2, '2026-10-22', 'En revisión'),
    ap('AP5', 'A3', 1, '2026-10-12', 'Enviada a la empresa'),
    { ...ap('AP9', 'A4', 1, '2026-10-12', 'Contratado'), idOferta: 'O2' },   // otra oferta: no cuenta
  ];
  const r = R.solicitantesDeOferta(apps, alumnos, 'O1');
  igual([r.totalSolicitudes, r.totalAlumnos], [5, 3], '5 solicitudes de 3 alumnos (la de otra oferta no cuenta)');
  const a1 = r.filas.find(f => f.idAlumno === 'A1'), a3 = r.filas.find(f => f.idAlumno === 'A3');
  igual([a1.app.id, a1.app.estado, a1.otrasRondas], ['AP2', 'Recibida', [1]], 'un alumno en dos rondas: manda la solicitud más reciente y se anota la otra ronda');
  igual([a3.app.id, a3.otrasRondas], ['AP4', [1]], 'la más reciente por fecha, aunque llegue después en la lista');
  igual(r.filas.map(f => f.alumno.nombre), ['Beto', 'Cira', 'Ana'], 'orden: Entrevista, En revisión, Recibida');
  igual(r.porEstado, [{ estado: 'Entrevista', n: 1 }, { estado: 'En revisión', n: 1 }, { estado: 'Recibida', n: 1 }], 'el recuento por estado es el ACTUAL de cada alumno (suma = alumnos)');
  chk(r.porEstado.reduce((s, x) => s + x.n, 0) === r.totalAlumnos, 'los estados suman el número de alumnos');
  chk(!JSON.stringify(r).includes('CANARIO'), 'lo de una solicitud anterior (motivo y notas) no se cuela en el resultado');
}

console.log('2. Orden completo y desempates');
{
  const apps = [
    ap('P1', 'A1', 1, '2026-10-10', 'Descartado'), ap('P2', 'A2', 1, '2026-10-10', 'Recibida'), ap('P3', 'A3', 1, '2026-10-10', 'Contratado'),
    ap('P4', 'A4', 1, '2026-10-10', 'Estado raro'), ap('P5', 'A5', 1, '2026-10-12', 'Recibida'), ap('P6', 'A6', 1, '2026-10-10', 'Entrevista'),
  ];
  const r = R.solicitantesDeOferta(apps, alumnos, 'O1');
  igual(r.filas.map(f => f.alumno.nombre), ['Cira', 'Fito', 'Eva', 'Beto', 'Dani', 'Ana'], 'Contratado, Entrevista, Recibida (la más reciente primero), un estado desconocido antes de Descartado, y Descartado al final');
  igual(r.porEstado.map(x => x.estado), ['Contratado', 'Entrevista', 'Recibida', 'Estado raro', 'Descartado'], 'los estados del recuento van en el mismo orden');
  // a igual estado y fecha, por nombre
  const r2 = R.solicitantesDeOferta([ap('Q1', 'A2', 1, '2026-10-10', 'Recibida'), ap('Q2', 'A1', 1, '2026-10-10', 'Recibida')], alumnos, 'O1');
  igual(r2.filas.map(f => f.alumno.nombre), ['Ana', 'Beto'], 'a igual estado y fecha, por nombre');
  // la misma fecha en dos rondas: gana la ronda mayor
  const r3 = R.solicitantesDeOferta([ap('Z1', 'A1', 1, '2026-10-10', 'Descartado'), ap('Z2', 'A1', 3, '2026-10-10', 'En revisión'), ap('Z3', 'A1', 10, '2026-10-10', 'Recibida')], alumnos, 'O1');
  igual([r3.filas[0].app.id, r3.filas[0].otrasRondas], ['Z3', [1, 3]], 'a igual fecha gana la ronda mayor (10 > 3, no por texto) y las otras salen en orden');
  // dos solicitudes del mismo alumno en la misma ronda: la otra ronda no se repite
  const r4 = R.solicitantesDeOferta([ap('Y1', 'A1', 2, '2026-10-10', 'Recibida'), ap('Y2', 'A1', 2, '2026-10-11', 'Entrevista')], alumnos, 'O1');
  igual([r4.filas.length, r4.filas[0].otrasRondas, r4.totalSolicitudes], [1, [], 2], 'dos solicitudes en la misma ronda: una fila, sin «también en» la misma ronda');
}

console.log('3. Casos raros');
{
  igual(R.solicitantesDeOferta([], alumnos, 'O1'), { totalSolicitudes: 0, totalAlumnos: 0, porEstado: [], filas: [] }, 'sin solicitudes');
  igual(R.solicitantesDeOferta(undefined, undefined, 'O1').filas, [], 'sin datos no se rompe');
  const r = R.solicitantesDeOferta([ap('B1', 'A99', 1, '2026-10-10', 'Recibida')], alumnos, 'O1');
  chk(r.filas.length === 1 && r.filas[0].alumno === null && r.filas[0].idAlumno === 'A99', 'un alumno que ya no está en los datos sigue contando (alumno: null)');
  const s = R.solicitantesDeOferta([ap('C1', 'A1', 1, '', ''), ap('C2', 'A2', 1, '2026-10-10', 'Recibida')], alumnos, 'O1');
  igual(s.porEstado.map(x => x.estado), ['Recibida', 'Sin dato'], 'una solicitud sin estado cuenta como «Sin dato» (después de los conocidos)');
  // 50 alumnos, varias rondas
  const muchos = Array.from({ length: 50 }, (_, i) => ({ id: 'M' + i, nombre: 'N' + String(i).padStart(2, '0'), apellidos: 'X', master: 'MBA' }));
  const estados = ['Recibida', 'En revisión', 'Enviada a la empresa', 'Entrevista', 'Contratado', 'Descartado'];
  const apps = muchos.flatMap((m, i) => [ap('R' + i, m.id, 1, '2026-10-10', 'Recibida'), ...(i % 2 ? [ap('S' + i, m.id, 2, '2026-10-20', estados[i % 6])] : [])]);
  const g = R.solicitantesDeOferta(apps, muchos, 'O1');
  igual([g.totalAlumnos, g.totalSolicitudes], [50, 75], '50 alumnos y 75 solicitudes: una fila por alumno');
  chk(g.filas.every((f, i, l) => i === 0 || (l[i - 1].app.estado === 'Descartado' ? f.app.estado === 'Descartado' : true)), 'una vez en Descartado, todo lo que sigue es Descartado');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
