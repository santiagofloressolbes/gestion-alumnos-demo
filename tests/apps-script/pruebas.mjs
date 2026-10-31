// Pruebas de docs/apps-script/Code.gs con el simulador de Google. Se ejecutan con:
//   node tests/apps-script/pruebas.mjs
// Salen con código 1 si alguna falla.
import { crearMundo, CODIGO, CLAVE_PRUEBA } from './simulador.mjs';

let fallos = 0, total = 0;
const ok = (cond, texto) => { total++; if (!cond) fallos++; console.log((cond ? 'OK  ' : 'MAL ') + texto); };
const igual = (a, b, texto) => ok(JSON.stringify(a) === JSON.stringify(b), texto + (JSON.stringify(a) === JSON.stringify(b) ? '' : `  → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const titulo = t => console.log('\n' + t);
const todasLasRespuestas = [];   // para comprobar al final que ninguna filtra la clave

const base = (m, extra = {}) => ({ key: m.clave, ...extra });
const guardar = (m, id, notas, fecha, ant = { n: '', f: '' }, extra = {}) =>
  m.llamar(base(m, { action: 'guardarEntrevista', id, notas, fecha, notasAnteriores: ant.n, fechaAnterior: ant.f, ...extra }));
const celda = (m, id, columna) => {
  const h = m.hojas.Alumnos.m, c = h[0].indexOf(columna), f = h.find(r => r[0] === id);
  return f && f[c];
};
const MAS = (n, c = 'x') => c.repeat(n);

// ---------------------------------------------------------------------------------------------
titulo('0. El archivo Code.gs (plantilla pública)');
ok(/@OnlyCurrentDoc/.test(CODIGO), 'declara @OnlyCurrentDoc (solo accede a su propia hoja)');
ok(!/UrlFetchApp|MailApp|GmailApp|DriveApp|eval\(|new Function/.test(CODIGO), 'no hace peticiones externas, ni envía correos, ni usa Drive, ni eval');
ok(!/CLAVE\w*\s*=\s*['"`][^'"`]{6,}/.test(CODIGO), 'no hay ninguna clave escrita en el código (solo el NOMBRE de la propiedad, "CLAVE")');
ok(!CODIGO.includes(CLAVE_PRUEBA), 'la clave de prueba no aparece en el código');
ok(!/innerHTML/.test(CODIGO), 'no genera HTML');

// ---------------------------------------------------------------------------------------------
titulo('1. Configuración');
let m = crearMundo({ sinClave: true });
igual(m.llamar({ key: 'cualquiera', action: 'ping' }).error, 'config', 'sin CLAVE configurada: el script se niega a trabajar');
m = crearMundo({ clave: 'corta' });
igual(m.llamar({ key: 'corta', action: 'ping' }).error, 'config', 'clave de menos de 16 caracteres: se considera sin configurar');
m = crearMundo({ bloqueoOcupado: true });
igual(m.llamar(base(m, { action: 'ping' })).error, 'ocupado', 'si el script está ocupado responde "ocupado"');
igual([...m.props.keys()].filter(k => k.startsWith('_')), [], '... y no cuenta intentos');

// ---------------------------------------------------------------------------------------------
titulo('2. Clave');
m = crearMundo();
const pong = m.llamar(base(m, { action: 'ping' }));
ok(pong.ok === true && pong.version === 1, 'clave correcta: ping ok');
for (const [nombre, k] of [['sin clave', undefined], ['vacía', ''], ['número', 12345], ['lista', [m.clave]], ['null', null], ['objeto', { a: 1 }],
  ['una letra distinta', m.clave.slice(0, -1) + 'X'], ['prefijo', m.clave.slice(0, 20)], ['con espacio al final', m.clave + ' '], ['en mayúsculas', m.clave.toUpperCase()]]) {
  const m2 = crearMundo();
  igual(m2.llamar({ key: k, action: 'data' }).error, 'clave', `clave ${nombre}: rechazada`);
  const r = m2.llamar({ key: k, action: 'guardarEntrevista', id: 'A001', notas: 'x', fecha: '2026-10-30', notasAnteriores: '', fechaAnterior: '' });
  ok(r.error === 'clave' && m2.registro.escrituras.length === 0, `clave ${nombre}: tampoco puede escribir`);
}

// ---------------------------------------------------------------------------------------------
titulo('3. Bloqueo tras 5 fallos (15 minutos)');
m = crearMundo();
const mala = () => m.llamar({ key: 'mala', action: 'ping' });
igual([1, 2, 3, 4].map(() => mala().error), ['clave', 'clave', 'clave', 'clave'], 'los 4 primeros fallos dicen "clave"');
const quinto = mala();
ok(quinto.error === 'bloqueado' && quinto.segundos === 900, 'el 5.º fallo bloquea 900 s (15 min)');
igual(m.llamar(base(m, { action: 'ping' })).error, 'bloqueado', 'con el bloqueo puesto, ni la clave buena entra');
m.reloj.t += 899 * 1000;
const aun = m.llamar(base(m, { action: 'ping' }));
ok(aun.error === 'bloqueado' && aun.segundos === 1, 'a los 14 min 59 s sigue bloqueado');
m.reloj.t += 2 * 1000;
ok(m.llamar(base(m, { action: 'ping' })).ok === true, 'pasados los 15 min la clave buena entra');
m = crearMundo();
for (let i = 0; i < 4; i++) m.llamar({ key: 'mala', action: 'ping' });
m.llamar(base(m, { action: 'ping' }));
igual([1, 2, 3, 4].map(() => m.llamar({ key: 'mala', action: 'ping' }).error), ['clave', 'clave', 'clave', 'clave'], 'un acierto pone el contador a cero (4 + acierto + 4 no bloquea)');
m = crearMundo();
for (let i = 0; i < 5; i++) m.llamar({ key: 'mala', action: 'ping' });
m.sandbox.desbloquear();
ok(m.llamar(base(m, { action: 'ping' })).ok === true, 'desbloquear() (desde el editor) quita el bloqueo al momento');
m = crearMundo();
for (let i = 0; i < 20; i++) m.llamar('esto no es json');
for (let i = 0; i < 20; i++) m.llamar({ action: 'ping' });
ok(m.llamar(base(m, { action: 'ping' })).error === 'bloqueado', 'las peticiones sin clave cuentan como intentos fallidos');
m = crearMundo();
for (let i = 0; i < 20; i++) m.llamar('esto no es json');
ok(m.llamar(base(m, { action: 'ping' })).ok === true, 'las peticiones mal formadas (no son JSON) no cuentan como intentos');

// ---------------------------------------------------------------------------------------------
titulo('4. Peticiones raras');
m = crearMundo();
for (const [n, c] of [['texto que no es JSON', 'hola'], ['vacía', ''], ['un número', '123'], ['una lista', '[1]'], ['null', 'null'], ['demasiado grande', JSON.stringify({ key: m.clave, action: 'ping', relleno: MAS(11000) })]])
  igual(m.llamar(c).error, 'peticion', `${n}: "peticion"`);
igual(JSON.parse(m.sandbox.doPost({}).getContent()).error, 'peticion', 'sin cuerpo: "peticion"');
igual(m.llamar(base(m, { action: 'borrarTodo' })).error, 'accion', 'acción desconocida: "accion"');
igual(m.llamar(base(m, {})).error, 'accion', 'sin acción: "accion"');
ok(m.registro.escrituras.length === 0, 'nada de esto escribe en la hoja');

// ---------------------------------------------------------------------------------------------
titulo('5. Lectura (data)');
m = crearMundo();
const d = m.llamar(base(m, { action: 'data' }));
ok(d.ok && d.puedeEscribir === true, 'data responde ok e indica que se puede escribir');
igual([d.alumnos.filas.length, d.ofertas.filas.length], [30, 10], '30 alumnos y 10 ofertas');
ok(d.alumnos.cabecera.includes('Notas de entrevista') && d.alumnos.cabecera.length === 17, 'cabecera de Alumnos con 17 columnas');
ok(d.listas.cabecera[0] === 'Máster' && d.listas.filas.length === 17, 'hoja Listas completa (17 filas)');
const c1 = d.alumnos.filas.find(f => f[0] === 'A001');
ok(c1[d.alumnos.cabecera.indexOf('Fecha última entrevista')] === '2026-10-20', 'una fecha guardada como fecha real sale como 2026-10-20');
ok(d.alumnos.filas.every(f => f.length === 17 && f.every(x => typeof x === 'string')), 'todo sale como texto');
m = crearMundo({ ajustar: h => { h.Ofertas.m.push(['', '', '', '', '', '', '', '', '', '', '', '']); } });
igual(m.llamar(base(m, { action: 'data' })).ofertas.filas.length, 10, 'las filas totalmente vacías se ignoran');
m = crearMundo({ ajustar: h => { delete h.Listas; } });
const sinHoja = m.llamar(base(m, { action: 'data' }));
ok(sinHoja.error === 'hoja' && sinHoja.hoja === 'Listas', 'falta una hoja: error "hoja" con su nombre');

// ---------------------------------------------------------------------------------------------
titulo('6. Guardar una entrevista (caso normal)');
m = crearMundo();
let antes = m.foto();
let r = guardar(m, 'A002', 'Muy buena entrevista.\nPendiente de CV.', '2026-10-30', { n: celda(m, 'A002', 'Notas de entrevista'), f: celda(m, 'A002', 'Fecha última entrevista') });
ok(r.ok === true && r.notas === 'Muy buena entrevista.\nPendiente de CV.' && r.fecha === '2026-10-30', 'guarda y devuelve lo guardado');
const cambios = m.celdasCambiadas(antes, m.foto());
const cN = m.hojas.Alumnos.m[0].indexOf('Notas de entrevista') + 1, cF = m.hojas.Alumnos.m[0].indexOf('Fecha última entrevista') + 1;
igual(cambios, [`Alumnos!3,${cN}`, `Alumnos!3,${cF}`], 'cambian EXACTAMENTE 2 celdas: las de notas y fecha de ese alumno');
ok(m.registro.escrituras.every(w => w.hoja === 'Alumnos'), 'solo se escribe en la hoja Alumnos');
ok(m.registro.escrituras.filter(w => w.tipo === 'formato').every(w => w.valor === '@'), 'las 2 celdas se marcan como texto plano');
r = m.llamar(base(m, { action: 'data' }));
const f2 = r.alumnos.filas.find(f => f[0] === 'A002');
ok(f2[r.alumnos.cabecera.indexOf('Notas de entrevista')] === 'Muy buena entrevista.\nPendiente de CV.', 'al volver a leer, la nota está');

titulo('7. Validaciones (ninguna debe escribir)');
const fresco = () => crearMundo();
const rechaza = (nombre, esperado, notas, fecha, ant, extra) => {
  const mm = fresco(); const a = mm.foto();
  const rr = guardar(mm, 'A002', notas, fecha, ant, extra);
  ok(rr.ok === false && rr.error === esperado && mm.foto() === a && mm.registro.escrituras.length === 0, `${nombre} → "${esperado}", sin escribir`);
};
const acepta = (nombre, notas, fecha) => { const mm = fresco(); const rr = guardar(mm, 'A002', notas, fecha, { n: celda(mm, 'A002', 'Notas de entrevista'), f: celda(mm, 'A002', 'Fecha última entrevista') }); ok(rr.ok === true, nombre + ' → aceptado'); return rr; };
acepta('2000 caracteres justos', MAS(2000), '2026-10-30');
rechaza('2001 caracteres', 'largo', MAS(2001), '2026-10-30');
rechaza('<b>negrita</b>', 'html', 'hola <b>negrita</b>', '2026-10-30');
rechaza('<script>', 'html', '<script>alert(1)</script>', '2026-10-30');
rechaza('<img onerror>', 'html', '<img src=x onerror=alert(1)>', '2026-10-30');
rechaza('</p>', 'html', 'fin</p>', '2026-10-30');
rechaza('comentario <!-- -->', 'html', 'a <!-- b -->', '2026-10-30');
rechaza('<?xml', 'html', '<?xml version="1.0"?>', '2026-10-30');
acepta('"3 < 5" (no es una etiqueta)', 'tiene 3 < 5 años', '2026-10-30');
acepta('"<3" (no es una etiqueta)', 'le gustó <3', '2026-10-30');
acepta('"a < b" con espacios', 'a < b y c > d', '2026-10-30');
rechaza('carácter de control (NUL)', 'caracteres', 'hola\u0000mundo', '2026-10-30');
rechaza('carácter de control (ESC)', 'caracteres', 'hola\u001bmundo', '2026-10-30');
acepta('tabulador y salto de línea', 'a\tb\nc', '2026-10-30');
acepta('tildes, eñes y emojis', 'Está motivadísima ñ 😀', '2026-10-30');
for (const f of ['2026-02-30', '2026-13-01', '30-10-2026', '2026/10/30', '2026-1-3', '1999-12-31', 'ayer', '2026-10-30T10:00', '0000-00-00'])
  rechaza(`fecha "${f}"`, 'fecha', 'x', f);
rechaza('fecha de mañana', 'fecha-futura', 'x', '2026-11-01');
rechaza('fecha de 2027', 'fecha-futura', 'x', '2027-01-01');
acepta('fecha de hoy', 'x', '2026-10-31');
acepta('fecha de ayer', 'x', '2026-10-30');
rechaza('notas con texto y fecha vacía', 'fecha', 'x', '');
rechaza('id inexistente', 'no-encontrado', 'x', '2026-10-30', undefined, { id: 'A999' });
rechaza('id con intento de inyección', 'no-encontrado', 'x', '2026-10-30', undefined, { id: "A001' OR '1'='1" });
rechaza('id con comodín', 'no-encontrado', 'x', '2026-10-30', undefined, { id: 'A0*' });
rechaza('id vacío', 'peticion', 'x', '2026-10-30', undefined, { id: '' });
rechaza('id demasiado largo', 'peticion', 'x', '2026-10-30', undefined, { id: MAS(41, 'A') });
rechaza('id que no es texto', 'peticion', 'x', '2026-10-30', undefined, { id: 7 });
rechaza('notas que no son texto', 'peticion', 123, '2026-10-30');
rechaza('notas como lista', 'peticion', ['a'], '2026-10-30');
rechaza('fecha que no es texto', 'peticion', 'x', 20261030);
rechaza('sin notasAnteriores', 'peticion', 'x', '2026-10-30', undefined, { notasAnteriores: undefined });
rechaza('sin fechaAnterior', 'peticion', 'x', '2026-10-30', undefined, { fechaAnterior: null });
m = crearMundo({ ajustar: h => { h.Alumnos.m.push([...h.Alumnos.m[2]]); } });
ok(guardar(m, 'A002', 'x', '2026-10-30', { n: '', f: '' }).error === 'id-duplicado' && m.registro.escrituras.length === 0, 'ID repetido en la hoja → "id-duplicado", sin escribir');
m = crearMundo({ ajustar: h => { h.Alumnos.m[0][h.Alumnos.m[0].indexOf('Notas de entrevista')] = 'Notas'; } });
const sinCol = guardar(m, 'A002', 'x', '2026-10-30');
ok(sinCol.error === 'columna' && sinCol.columna === 'Notas de entrevista' && m.registro.escrituras.length === 0, 'columna renombrada → "columna" con su nombre, sin escribir');

titulo('8. Cambios simultáneos (conflicto)');
m = crearMundo();
const vacio = { n: '', f: '' };
const ya = m.llamar(base(m, { action: 'data' }));
const cabA = ya.alumnos.cabecera, filaA2 = ya.alumnos.filas.find(f => f[0] === 'A002');
const actual = { n: filaA2[cabA.indexOf('Notas de entrevista')], f: filaA2[cabA.indexOf('Fecha última entrevista')] };
ok(guardar(m, 'A002', 'Primera versión', '2026-10-29', actual).ok === true, 'la persona A guarda partiendo de lo que vio');
antes = m.foto();
r = guardar(m, 'A002', 'Versión de B', '2026-10-30', actual);
ok(r.ok === false && r.error === 'conflicto' && r.notas === 'Primera versión' && r.fecha === '2026-10-29', 'la persona B parte de lo antiguo → "conflicto" y se le devuelve lo que hay ahora');
ok(m.foto() === antes, '... y no se pisa nada');
r = guardar(m, 'A002', 'Versión de B', '2026-10-30', { n: 'Primera versión', f: '2026-10-29' });
ok(r.ok === true, 'B reintenta con lo actual y guarda');
r = guardar(m, 'A002', 'Otra', '2026-10-30', { n: 'Versión de B', f: '2026-10-28' });
igual(r.error, 'conflicto', 'basta con que la fecha anterior no coincida para dar conflicto');
m = crearMundo({ ajustar: h => { h.Alumnos.m[2][h.Alumnos.m[0].indexOf('Notas de entrevista')] = 'línea1\r\nlínea2'; } });
ok(guardar(m, 'A002', 'nueva', '2026-10-30', { n: 'línea1\nlínea2', f: '' }).ok === true, 'saltos de línea de Windows (CRLF) y normales se consideran iguales');
m = crearMundo();
r = guardar(m, 'A002', 'a\r\nb\rc', '2026-10-30');
ok(r.notas === 'a\nb\nc', 'se guardan con saltos de línea normales');

titulo('9. Fórmulas y CSV (texto que empieza por = + - @)');
for (const t of ['=1+1', '=HYPERLINK("http://x","y")', '+34 600 000 000', '-bullet', '@SUM(1)']) {
  m = crearMundo();
  r = guardar(m, 'A002', t, '2026-10-30');
  ok(r.ok === true && r.notas === ' ' + t && m.registro.formulas.length === 0 && celda(m, 'A002', 'Notas de entrevista') === ' ' + t, `"${t}" se guarda como texto, con un espacio delante, sin evaluarse`);
}
m = crearMundo(); r = guardar(m, 'A002', 'normal = igual', '2026-10-30');
ok(r.notas === 'normal = igual', 'el = en medio del texto no se toca');

titulo('10. Borrar una entrevista');
m = crearMundo();
r = guardar(m, 'A002', '', '', { n: '', f: '' });
ok(r.ok === true && celda(m, 'A002', 'Notas de entrevista') === '' && celda(m, 'A002', 'Fecha última entrevista') === '', 'notas y fecha vacías: borra las dos celdas');
r = guardar(m, 'A002', '', '2026-10-30');
ok(r.ok === true, 'notas vacías con fecha: se admite');
r = guardar(m, 'A002', 'x', '', { n: '', f: '2026-10-30' });
igual(r.error, 'fecha', 'notas con texto y sin fecha: rechazado');

titulo('11. Errores internos');
m = crearMundo({ ajustar: h => { h.Ofertas.rompe = true; } });
const raro = m.llamar(base(m, { action: 'data' }));
ok(raro.ok === false && raro.error === 'servidor' && Object.keys(raro).join() === 'ok,error', 'un fallo interno responde solo "servidor"');
ok(!m.registro.respuestas.join('').includes('detalle privado') && m.registro.errores.some(e => e.includes('detalle privado')), '... el detalle queda en el registro del script y no sale a la app');

titulo('12. Comprobación de configuración (solo editor)');
m = crearMundo();
const inf = m.sandbox.comprobarConfiguracion();
ok(inf.clave.startsWith('ok (') && !JSON.stringify(inf).includes(m.clave), 'informa de que la clave existe, sin mostrarla');
igual([inf.hojas.Alumnos, inf.hojas.Ofertas, inf.hojas.Listas], ['30 filas', '10 filas', '17 filas'], 'cuenta las filas de cada hoja');
ok(Object.values(inf.columnas).every(x => x === 'ok') && inf.bloqueado === false, 'columnas ok y sin bloqueo');
ok(/^FALTA$/.test(crearMundo({ sinClave: true }).sandbox.comprobarConfiguracion().clave), 'avisa si falta la clave');

titulo('13. Que no se escape la clave');
m = crearMundo();
m.llamar(base(m, { action: 'data' })); m.llamar({ key: 'mala', action: 'data' }); m.llamar('xx'); guardar(m, 'A002', '<b>', '2026-10-30'); guardar(m, 'A999', 'x', '2026-10-30');
ok(m.registro.respuestas.length >= 5 && m.registro.respuestas.every(x => !x.includes(m.clave) && !x.includes('CLAVE')), 'ninguna respuesta (buena o de error) contiene la clave');
ok(m.registro.errores.every(e => !e.includes(m.clave)), 'el registro del script tampoco');

console.log(`\n${total - fallos} de ${total} comprobaciones correctas` + (fallos ? `  ·  ${fallos} FALLAN` : ''));
process.exit(fallos ? 1 : 0);
