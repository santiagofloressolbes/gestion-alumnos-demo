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
ok(Object.values(inf.columnasOfertas).every(x => x === 'ok') && Object.values(inf.listas).every(x => x === 'ok'), 'comprueba también las columnas de Ofertas y las listas que usa (incluida "Requisito de permiso")');
ok(Object.values(crearMundo({ ajustar: h => { h.Listas.m[0][h.Listas.m[0].indexOf('Requisito de permiso')] = 'x'; } }).sandbox.comprobarConfiguracion().listas).includes('FALTA LA COLUMNA EN LISTAS'), 'avisa si falta la columna "Requisito de permiso" en Listas');
ok(Object.values(inf.columnas).every(x => x === 'ok') && inf.bloqueado === false, 'columnas ok y sin bloqueo');
ok(/^FALTA$/.test(crearMundo({ sinClave: true }).sandbox.comprobarConfiguracion().clave), 'avisa si falta la clave');

titulo('13. Ofertas: alta y edición');
const OFERTA = () => ({ empresa: 'Club mock Z', tipoOrganizacion: 'Equipo', area: 'Comercial y patrocinio', titulo: 'Becario/a de ventas', tipo: 'Prácticas',
  ubicacion: 'Bilbao', requisitoNacionalidad: '', requisitoPermiso: 'No requerido', fechaRecepcion: '2026-10-30', estado: 'Abierta', enlace: 'https://example.com/oferta/Z' });
const guardarOf = (m, id, oferta, anteriores, extra = {}) => m.llamar(base(m, { action: 'guardarOferta', ...(id ? { id } : {}), oferta, ...(anteriores ? { anteriores } : {}), ...extra }));
const cabOf = m => m.hojas.Ofertas.m[0];
const filaOf = (m, id) => { const f = m.hojas.Ofertas.m.find(r => r[0] === id); return f && Object.fromEntries(cabOf(m).map((c, i) => [c, f[i]])); };
const soloOfertas = (m, antes) => m.celdasCambiadas(antes, m.foto()).every(c => c.startsWith('Ofertas!'));

m = crearMundo();
ok(m.llamar(base(m, { action: 'ping' })).soporta.includes('guardarOferta'), 'ping y data avisan de que el script sabe guardar ofertas (la app lo comprueba)');
antes = m.foto();
r = guardarOf(m, null, OFERTA());
ok(r.ok === true && r.id === 'O011' && r.creada === true, 'alta: el script pone el ID siguiente (O011)');
ok(m.hojas.Ofertas.m.length === 12 && filaOf(m, 'O011').Empresa === 'Club mock Z' && filaOf(m, 'O011')['Fecha de recepción'] === '2026-10-30', 'alta: la fila nueva está al final con sus valores');
igual(m.celdasCambiadas(antes, m.foto()).sort(), Array.from({ length: 12 }, (_, i) => `Ofertas!12,${i + 1}`).sort(), 'alta: solo se escriben las 12 celdas de la fila nueva (ninguna otra celda, ni de Ofertas)');
ok(m.celdasCambiadas(antes, m.foto()).every(c => c.startsWith('Ofertas!12,')), '... ni Alumnos ni Listas');
ok(m.registro.escrituras.filter(e => e.tipo === 'formato').length === 12 && m.registro.escrituras.filter(e => e.tipo === 'formato').every(e => e.valor === '@'), 'alta: las 12 celdas se escriben como texto plano');
r = guardarOf(m, null, { ...OFERTA(), empresa: 'Otra empresa' });
ok(r.id === 'O012' && m.hojas.Ofertas.m.length === 13, 'dos altas seguidas: IDs distintos (O011, O012)');
m.hojas.Ofertas.m.push(['O050', 'x', 'x', 'x', 'x', 'x', 'x', '', 'x', '', 'x', '']);
ok(guardarOf(m, null, OFERTA()).id === 'O051', 'con huecos, sigue desde el mayor (O051)');
m.hojas.Ofertas.m.push(['ABC', 'x']);
ok(guardarOf(m, null, OFERTA()).id === 'O052', 'un ID raro en la hoja no rompe el contador');
m.hojas.Ofertas.m.push(['O1000', 'x']);
ok(guardarOf(m, null, OFERTA()).id === 'O1001', 'pasa de 3 a 4 cifras sin repetir');

titulo('14. Ofertas: edición y conflictos');
m = crearMundo();
const o1 = () => ({ empresa: 'Liga mock A', tipoOrganizacion: 'Liga', area: 'Antipiratería y seguridad', titulo: 'Analista de antipiratería', tipo: 'Empleo', ubicacion: 'Madrid',
  requisitoNacionalidad: '', requisitoPermiso: 'Permiso de trabajo en vigor', fechaRecepcion: '2026-10-05', estado: 'Abierta', enlace: 'https://example.com/oferta/O001' });
antes = m.foto();
r = guardarOf(m, 'O001', { ...o1(), estado: 'Cerrada' }, o1());
ok(r.ok === true && r.creada === false && filaOf(m, 'O001')['Estado de la oferta'] === 'Cerrada', 'editar: cambia el estado');
igual(m.celdasCambiadas(antes, m.foto()), ['Ofertas!2,11'], 'editar un campo escribe UNA sola celda');
antes = m.foto(); const nEsc = m.registro.escrituras.length;
r = guardarOf(m, 'O001', { ...o1(), estado: 'Cerrada' }, { ...o1(), estado: 'Cerrada' });
ok(r.ok === true && m.registro.escrituras.length === nEsc && m.celdasCambiadas(antes, m.foto()).length === 0, 'guardar sin cambios no escribe nada');
antes = m.foto();
r = guardarOf(m, 'O001', { ...o1(), titulo: 'Mi título' }, o1());
ok(r.error === 'conflicto' && r.oferta.estado === 'Cerrada' && r.id === 'O001' && m.celdasCambiadas(antes, m.foto()).length === 0, 'si alguien cambió la oferta: conflicto, con lo que hay ahora, sin escribir');
r = guardarOf(m, 'O001', { ...o1(), titulo: 'Mi título', estado: 'Cerrada' }, { ...o1(), estado: 'Cerrada' });
ok(r.ok === true && filaOf(m, 'O001')['Título del puesto'] === 'Mi título', 'con lo último en la mano, guarda');
const o2 = () => ({ empresa: 'Club mock B', tipoOrganizacion: 'Equipo', area: 'Comercial y patrocinio', titulo: 'Becario/a de patrocinio', tipo: 'Prácticas', ubicacion: 'Barcelona',
  requisitoNacionalidad: '', requisitoPermiso: 'No requerido', fechaRecepcion: '2026-10-08', estado: 'Abierta', enlace: 'https://example.com/oferta/O002' });
m.hojas.Ofertas.m[2][4] = '  Becario/a de patrocinio  ';   // escrito a mano con espacios sobrantes
r = guardarOf(m, 'O002', { ...o2(), estado: 'Cerrada' }, o2());
ok(r.ok === true, 'la comparación ignora espacios sobrantes (no hay falsos conflictos)');
m.hojas.Ofertas.m[3][9] = new Date(Date.UTC(2026, 9, 10));   // una fecha que Google guarda como fecha real
const o3 = () => ({ empresa: 'Startup mock C', tipoOrganizacion: 'Startup', area: 'Producto y tecnología', titulo: 'Product manager junior', tipo: 'Empleo', ubicacion: 'Madrid',
  requisitoNacionalidad: '', requisitoPermiso: 'Permiso de trabajo en vigor', fechaRecepcion: '2026-10-10', estado: 'Abierta', enlace: 'https://example.com/oferta/O003' });
r = guardarOf(m, 'O003', { ...o3(), estado: 'Cerrada' }, o3());
ok(r.ok === true, 'una fecha real de Google se compara como AAAA-MM-DD');
igual(guardarOf(m, 'O999', o1(), o1()).error, 'no-encontrado', 'editar una oferta que no existe');
m.hojas.Ofertas.m.push(['O001', 'copia']);
igual(guardarOf(m, 'O001', o1(), o1()).error, 'id-duplicado', 'ID repetido en la hoja: se niega');

titulo('15. Ofertas: validaciones');
const malo = (campos, esperado, nombre, campo) => {
  const mm = crearMundo(); const a = mm.foto();
  const rr = guardarOf(mm, null, { ...OFERTA(), ...campos });
  ok(rr.error === esperado && (campo === undefined || rr.campo === campo) && mm.celdasCambiadas(a, mm.foto()).length === 0 && mm.registro.escrituras.length === 0, `${nombre}: "${esperado}"${campo ? ' en ' + campo : ''}, sin escribir`);
};
malo({ empresa: '' }, 'requerido', 'empresa vacía', 'empresa');
malo({ titulo: '   ' }, 'requerido', 'título en blanco', 'titulo');
malo({ ubicacion: '' }, 'requerido', 'ubicación vacía', 'ubicacion');
malo({ fechaRecepcion: '' }, 'requerido', 'sin fecha', 'fechaRecepcion');
malo({ empresa: MAS(101) }, 'largo', 'empresa de 101', 'empresa');
malo({ titulo: MAS(121) }, 'largo', 'título de 121', 'titulo');
malo({ ubicacion: MAS(101) }, 'largo', 'ubicación de 101', 'ubicacion');
malo({ enlace: MAS(501) }, 'largo', 'enlace de 501', 'enlace');
malo({ tipo: 'Becas' }, 'lista', 'tipo que no está en Listas', 'tipo');
malo({ area: 'Cocina' }, 'lista', 'área que no está en Listas', 'area');
malo({ tipoOrganizacion: 'Circo' }, 'lista', 'tipo de organización inventado', 'tipoOrganizacion');
malo({ estado: 'Pendiente' }, 'lista', 'estado inventado', 'estado');
malo({ requisitoNacionalidad: 'Narnia' }, 'lista', 'nacionalidad inventada', 'requisitoNacionalidad');
malo({ requisitoPermiso: 'Cualquiera' }, 'lista', 'permiso inventado', 'requisitoPermiso');
malo({ tipo: '' }, 'requerido', 'tipo vacío', 'tipo');
malo({ empresa: 'Club <b>mock</b>' }, 'html', 'HTML en la empresa', 'empresa');
malo({ titulo: '<!-- x -->' }, 'html', 'comentario HTML', 'titulo');
malo({ titulo: 'línea 1\nlínea 2' }, 'caracteres', 'salto de línea en un campo de una línea', 'titulo');
malo({ empresa: 'a\u0007b' }, 'caracteres', 'carácter de control', 'empresa');
malo({ fechaRecepcion: '2026-13-01' }, 'fecha', 'mes 13', 'fechaRecepcion');
malo({ fechaRecepcion: '31/10/2026' }, 'fecha', 'fecha en otro formato', 'fechaRecepcion');
malo({ fechaRecepcion: '1999-01-01' }, 'fecha', 'fecha anterior a 2000', 'fechaRecepcion');
malo({ fechaRecepcion: '2026-11-01' }, 'fecha-futura', 'fecha futura (hoy es 31/10 en el simulador)', 'fechaRecepcion');
malo({ enlace: 'javascript:alert(1)' }, 'enlace', 'enlace javascript:', 'enlace');
malo({ enlace: 'JavaScript:alert(1)' }, 'enlace', 'enlace JavaScript: en mayúsculas', 'enlace');
malo({ enlace: 'http://example.com' }, 'enlace', 'enlace sin https', 'enlace');
malo({ enlace: 'data:text/html;base64,AAAA' }, 'enlace', 'enlace data:', 'enlace');
m = crearMundo();
r = guardarOf(m, null, { ...OFERTA(), enlace: 'Ver la web de la empresa', requisitoNacionalidad: 'Estados Unidos', ubicacion: '  Remoto  ' });
ok(r.ok === true && filaOf(m, r.id)['Enlace o descripción'] === 'Ver la web de la empresa' && filaOf(m, r.id)['Ubicación'] === 'Remoto' && filaOf(m, r.id)['Requisito de nacionalidad'] === 'Estados Unidos', 'texto libre como descripción, nacionalidad de la lista y espacios recortados: válidos');
r = guardarOf(m, null, { ...OFERTA(), enlace: '' });
ok(r.ok === true && filaOf(m, r.id)['Enlace o descripción'] === '', 'el enlace es opcional');
for (const ini of ['=', '+', '-', '@']) {
  const mm = crearMundo(); const txt = ini + 'HYPERLINK("http://evil","x")';
  const rr = guardarOf(mm, null, { ...OFERTA(), empresa: txt, enlace: txt });
  ok(rr.ok === true && filaOf(mm, rr.id).Empresa === ' ' + txt && filaOf(mm, rr.id)['Enlace o descripción'] === ' ' + txt && mm.registro.formulas.length === 0, `texto que empieza por "${ini}": se guarda con un espacio delante y nunca como fórmula`);
}
m = crearMundo({ ajustar: h => { h.Listas.m[0][h.Listas.m[0].indexOf('Requisito de permiso')] = 'Otra cosa'; } });
r = guardarOf(m, null, OFERTA());
ok(r.error === 'columna' && r.columna === 'Requisito de permiso' && m.registro.escrituras.length === 0, 'si en Listas falta la columna "Requisito de permiso", lo dice (y no escribe)');
m = crearMundo({ ajustar: h => { h.Ofertas.m[0][h.Ofertas.m[0].indexOf('Estado de la oferta')] = 'Estado'; } });
r = guardarOf(m, null, OFERTA());
ok(r.error === 'columna' && r.columna === 'Estado de la oferta' && m.registro.escrituras.length === 0, 'si en Ofertas falta una columna, lo dice (y no escribe)');
m = crearMundo({ ajustar: h => { h.Ofertas.m[0][0] = 'Identificador'; } });
ok(guardarOf(m, null, OFERTA()).error === 'columna' && m.registro.escrituras.length === 0, 'sin columna "ID oferta": no escribe');

titulo('16. Ofertas: forma de la petición y acceso');
const rotas = [['sin oferta', m2 => guardarOf(m2, null, undefined)], ['oferta es una lista', m2 => guardarOf(m2, null, [])], ['oferta es texto', m2 => guardarOf(m2, null, 'x')],
  ['oferta null', m2 => guardarOf(m2, null, null)], ['falta un campo', m2 => { const o = OFERTA(); delete o.titulo; return guardarOf(m2, null, o); }],
  ['un campo es número', m2 => guardarOf(m2, null, { ...OFERTA(), tipo: 5 })], ['un campo es objeto', m2 => guardarOf(m2, null, { ...OFERTA(), empresa: { a: 1 } })],
  ['editar sin anteriores', m2 => guardarOf(m2, 'O001', OFERTA())], ['anteriores es lista', m2 => guardarOf(m2, 'O001', OFERTA(), [])],
  ['anteriores incompletos', m2 => guardarOf(m2, 'O001', OFERTA(), { empresa: 'x' })], ['ID numérico', m2 => guardarOf(m2, 5, OFERTA(), OFERTA())],
  ['ID larguísimo', m2 => guardarOf(m2, MAS(41, 'O'), OFERTA(), OFERTA())], ['ID en blanco con espacios', m2 => guardarOf(m2, '   ', OFERTA(), OFERTA())]];
for (const [nombre, f] of rotas) { const mm = crearMundo(); const a = mm.foto(); const rr = f(mm); ok(rr.error === 'peticion' && mm.celdasCambiadas(a, mm.foto()).length === 0, `petición mal formada (${nombre}): "peticion"`); }
for (const [nombre, k] of [['sin clave', undefined], ['mala', 'mala'], ['vacía', '']]) {
  const mm = crearMundo(); const rr = mm.llamar({ key: k, action: 'guardarOferta', oferta: OFERTA() });
  ok(rr.error === 'clave' && mm.registro.escrituras.length === 0, `clave ${nombre}: no puede crear ofertas`);
}
m = crearMundo();
for (let i = 0; i < 5; i++) m.llamar({ key: 'mala', action: 'guardarOferta', oferta: OFERTA() });
igual(guardarOf(m, null, OFERTA()).error, 'bloqueado', 'tras 5 fallos al guardar ofertas, bloqueo también para la clave buena');
m = crearMundo({ bloqueoOcupado: true });
ok(guardarOf(m, null, OFERTA()).error === 'ocupado' && m.registro.escrituras.length === 0, 'script ocupado: no escribe');
m = crearMundo();
antes = m.foto();
guardarOf(m, null, OFERTA()); guardarOf(m, 'O002', { ...OFERTA(), empresa: 'Club mock B' }, OFERTA());   // este último es un conflicto
ok(soloOfertas(m, antes), 'todo lo anterior solo ha tocado la hoja Ofertas (Alumnos y Listas intactas)');
m = crearMundo({ ajustar: h => { h.Ofertas.rompe = true; } });
const roto = guardarOf(m, null, OFERTA());
ok(roto.error === 'servidor' && Object.keys(roto).join() === 'ok,error', 'un fallo interno al guardar ofertas responde solo "servidor"');

// ---------------------------------------------------------------------------------------------
// Rondas de difusión, aplicaciones e historial
const tablaObj = t => t.filas.map(f => Object.fromEntries(t.cabecera.map((c, i) => [c, f[i]])));
const norm = foto => {   // la hoja sin filas vacías al final y con "" en vez de celdas sin valor
  const o = JSON.parse(foto);
  for (const n of Object.keys(o)) { o[n] = o[n].map(r => r.map(x => x ?? '')); while (o[n].length && o[n][o[n].length - 1].every(x => x === '')) o[n].pop(); }
  return JSON.stringify(o);
};
const ronda = (m, idOferta, numero, fecha, extra = {}) => m.llamar(base(m, { action: 'registrarRonda', idOferta, numero, fecha, ...extra }));
const aplica = (m, idAlumno, idOferta, numeroRonda, fecha, notas = '', extra = {}) => m.llamar(base(m, { action: 'crearAplicacion', idAlumno, idOferta, numeroRonda, fecha, notas, ...extra }));
const estadoDe = (m, id, estado, motivo, fecha, nota, anterior, extra = {}) => m.llamar(base(m, { action: 'cambiarEstado', id, estado, motivo, fecha, nota, anterior, ...extra }));
const filaHoja = (m, hoja, id) => { const t = m.hojas[hoja].m; const f = t.find(r => r[0] === id); return f && Object.fromEntries(t[0].map((c, i) => [c, f[i]])); };
const celdasDe = (m, antes) => m.celdasCambiadas(antes, m.foto());
const soloHojas = (cs, hojas) => cs.every(c => hojas.includes(c.split('!')[0]));
const hoy = '2026-10-31';

// Revisa que un conjunto de datos (como los devuelve "data") sea coherente. Devuelve la lista de problemas.
function problemas(d) {
  const p = [];
  const lista = n => d.listas.filas.map(f => f[d.listas.cabecera.indexOf(n)]).filter(Boolean);
  const al = tablaObj(d.alumnos), of = tablaObj(d.ofertas), ro = tablaObj(d.rondas), ap = tablaObj(d.aplicaciones), hi = tablaObj(d.historial);
  const estados = lista('Estado de la aplicación'), motivos = lista('Motivo de descarte');
  const unicos = (xs, que) => { if (new Set(xs).size !== xs.length) p.push('hay ' + que + ' repetidos'); };
  unicos(ro.map(r => r['ID ronda']), 'ID de ronda'); unicos(ap.map(a => a['ID aplicación']), 'ID de aplicación'); unicos(hi.map(h => h['ID cambio']), 'ID de cambio');
  unicos(ro.map(r => r['ID oferta'] + '/' + r['Número de ronda']), 'números de ronda');
  unicos(ap.map(a => [a['ID alumno'], a['ID oferta'], a['Número de ronda']].join('/')), 'alumno+oferta+ronda');
  for (const r of ro) {
    const o = of.find(x => x['ID oferta'] === r['ID oferta']);
    if (!o) p.push(`${r['ID ronda']}: la oferta no existe`);
    else if (r['Fecha de envío a los alumnos'] < o['Fecha de recepción']) p.push(`${r['ID ronda']}: enviada antes de recibir la oferta`);
    const previa = ro.find(x => x['ID oferta'] === r['ID oferta'] && +x['Número de ronda'] === +r['Número de ronda'] - 1);
    if (+r['Número de ronda'] > 1 && !previa) p.push(`${r['ID ronda']}: falta la ronda anterior`);
    if (previa && r['Fecha de envío a los alumnos'] < previa['Fecha de envío a los alumnos']) p.push(`${r['ID ronda']}: más antigua que la anterior`);
    if (r['Fecha de envío a los alumnos'] > hoy) p.push(`${r['ID ronda']}: fecha futura`);
  }
  for (const a of ap) {
    const id = a['ID aplicación'];
    if (!al.some(x => x['ID alumno'] === a['ID alumno'])) p.push(`${id}: el alumno no existe`);
    const r = ro.find(x => x['ID oferta'] === a['ID oferta'] && x['Número de ronda'] === a['Número de ronda']);
    if (!r) p.push(`${id}: la ronda no existe`);
    else if (a['Fecha de aplicación'] < r['Fecha de envío a los alumnos']) p.push(`${id}: aplica antes de enviarse la ronda`);
    if (!estados.includes(a.Estado)) p.push(`${id}: estado fuera de la lista`);
    if ((a.Estado === 'Descartado') !== (a['Motivo de descarte'] !== '')) p.push(`${id}: el motivo solo va con Descartado`);
    if (a['Motivo de descarte'] && !motivos.includes(a['Motivo de descarte'])) p.push(`${id}: motivo fuera de la lista`);
    const h = hi.filter(x => x['ID aplicación'] === id);
    if (!h.length) { p.push(`${id}: sin historial`); continue; }
    if (h[0]['Estado anterior'] !== '' || h[0]['Estado nuevo'] !== 'Recibida' || h[0].Fecha !== a['Fecha de aplicación']) p.push(`${id}: el historial no empieza en Recibida el día de la aplicación`);
    h.forEach((x, i) => {
      if (i && x['Estado anterior'] !== h[i - 1]['Estado nuevo']) p.push(`${x['ID cambio']}: no encadena con el anterior`);
      if (i && x.Fecha < h[i - 1].Fecha) p.push(`${x['ID cambio']}: fecha anterior al cambio previo`);
      if (x.Fecha > hoy) p.push(`${x['ID cambio']}: fecha futura`);
      if (!estados.includes(x['Estado nuevo'])) p.push(`${x['ID cambio']}: estado fuera de la lista`);
      if ((x['Estado nuevo'] === 'Descartado') !== (x['Motivo de descarte'] !== '')) p.push(`${x['ID cambio']}: motivo mal puesto`);
    });
    const u = h[h.length - 1];
    if (u['Estado nuevo'] !== a.Estado || u['Motivo de descarte'] !== a['Motivo de descarte']) p.push(`${id}: el último cambio no coincide con su estado`);
  }
  for (const x of hi) if (!ap.some(a => a['ID aplicación'] === x['ID aplicación'])) p.push(`${x['ID cambio']}: aplicación inexistente`);
  return p;
}

titulo('17. Rondas: datos de ejemplo (datos-mock) coherentes');
m = crearMundo();
const dd = m.llamar(base(m, { action: 'data' }));
igual([dd.rondas.filas.length, dd.aplicaciones.filas.length, dd.historial.filas.length], [5, 12, 36], '5 rondas, 12 aplicaciones y 36 líneas de historial');
igual(problemas(dd), [], 'todo coincide: alumnos y ofertas existen, fechas en orden, el historial encadena y acaba en el estado de cada aplicación');
const apD = tablaObj(dd.aplicaciones);
igual([...new Set(apD.map(a => a.Estado))].sort(), ['Contratado', 'Descartado', 'Entrevista', 'Enviada a la empresa', 'En revisión', 'Recibida'].sort(), 'hay aplicaciones en los 6 estados');
igual([...new Set(apD.filter(a => a.Estado === 'Descartado').map(a => a['Motivo de descarte']))].sort(), ['La empresa eligió a otro', 'Perfil no encaja', 'Permiso de trabajo'], 'los descartados llevan motivo');
ok(apD.every(a => /^AP\d{3}$/.test(a['ID aplicación'])) && tablaObj(dd.rondas).every(r => /^R\d{3}$/.test(r['ID ronda'])) && tablaObj(dd.historial).every(h => /^H\d{3}$/.test(h['ID cambio'])), 'los ID son AP001…, R001… y H001…');
ok(new Set(tablaObj(dd.rondas).map(r => r['ID oferta'])).size === 3 && tablaObj(dd.rondas).some(r => r['Número de ronda'] === '2'), '3 ofertas, alguna con 2 rondas');
ok(apD.some(a => apD.filter(b => b['ID alumno'] === a['ID alumno'] && b['ID oferta'] === a['ID oferta']).length === 2), 'un alumno que aplica en dos rondas de la misma oferta sale en dos filas');
// El comprobador de coherencia también sabe encontrar fallos (si no, el resultado de arriba no valdría nada)
const datosRotos = (cambio, texto) => { const d2 = JSON.parse(JSON.stringify(dd)); cambio(d2); ok(problemas(d2).length > 0, `el comprobador detecta: ${texto}`); };
datosRotos(d2 => { d2.aplicaciones.filas[0][5] = 'Descartado'; }, 'estado distinto del último cambio');
datosRotos(d2 => { d2.aplicaciones.filas[1][6] = ''; }, 'descartado sin motivo');
datosRotos(d2 => { d2.aplicaciones.filas[0][1] = 'A999'; }, 'alumno inexistente');
datosRotos(d2 => { d2.historial.filas[2][2] = 'Entrevista'; }, 'historial que no encadena');
datosRotos(d2 => { d2.aplicaciones.filas[3][3] = '9'; }, 'ronda inexistente');
datosRotos(d2 => { d2.aplicaciones.filas.push([...d2.aplicaciones.filas[0]]); }, 'aplicación repetida');
datosRotos(d2 => { d2.historial.filas[1][5] = '2026-10-01'; }, 'fecha anterior a la aplicación');
datosRotos(d2 => { d2.rondas.filas[0][3] = '2026-10-01'; }, 'ronda enviada antes de recibirse la oferta');

titulo('18. Rondas: qué anuncia el script y compatibilidad con la versión anterior');
m = crearMundo();
igual(m.llamar(base(m, { action: 'ping' })).soporta, ['guardarEntrevista', 'guardarOferta', 'registrarRonda', 'crearAplicacion', 'cambiarEstado'], 'con las 3 hojas creadas, anuncia las 3 funciones nuevas');
for (const hojaFalta of ['Rondas', 'Aplicaciones', 'Historial']) {
  m = crearMundo({ ajustar: h => { delete h[hojaFalta]; } });
  const dx = m.llamar(base(m, { action: 'data' }));
  ok(dx.ok === true && dx.rondas === undefined && dx.aplicaciones === undefined && dx.historial === undefined, `sin la hoja ${hojaFalta}: data funciona igual que antes (sin datos de rondas)`);
  igual(dx.soporta, ['guardarEntrevista', 'guardarOferta'], `sin la hoja ${hojaFalta}: no anuncia las funciones de rondas (la app no enseñará botones)`);
  igual((hojaFalta === 'Rondas' ? ronda(m, 'O004', 1, '2026-10-30') : aplica(m, 'A003', 'O002', 2, '2026-10-30')).error, 'hoja', `sin la hoja ${hojaFalta}: la función que la usa dice qué hoja falta`);
}
m = crearMundo({ ajustar: h => { delete h.Rondas; delete h.Aplicaciones; delete h.Historial; } });
antes = m.foto();
r = guardarOf(m, null, OFERTA());
ok(r.ok === true && guardar(m, 'A002', 'x', '2026-10-30').ok === true, 'sin las hojas de rondas, guardar ofertas y entrevistas sigue funcionando');

titulo('19. Rondas: registrar una ronda de difusión');
m = crearMundo();
antes = m.foto();
r = ronda(m, 'O004', 1, '2026-10-28');
ok(r.ok === true && r.ronda.id === 'R006' && r.ronda.idOferta === 'O004' && r.ronda.numero === '1' && r.ronda.fecha === '2026-10-28', 'primera ronda de una oferta: R006, número 1');
igual(celdasDe(m, antes).sort(), ['Rondas!7,1', 'Rondas!7,2', 'Rondas!7,3', 'Rondas!7,4'], 'se escriben EXACTAMENTE las 4 celdas de la fila nueva y ninguna otra');
ok(m.registro.escrituras.filter(e => e.tipo === 'formato').length === 4 && m.registro.escrituras.filter(e => e.tipo === 'formato').every(e => e.valor === '@'), 'las 4 celdas se escriben como texto plano');
igual(filaHoja(m, 'Rondas', 'R006'), { 'ID ronda': 'R006', 'ID oferta': 'O004', 'Número de ronda': '1', 'Fecha de envío a los alumnos': '2026-10-28' }, 'la fila tiene lo esperado');
r = ronda(m, 'O004', 2, '2026-10-30');
ok(r.ok && r.ronda.id === 'R007' && r.ronda.numero === '2', 'segunda ronda: R007, número 2');
ok(ronda(m, 'O004', 3, '2026-10-30').ok === true, 'la misma fecha que la ronda anterior se admite');
ok(ronda(m, 'O002', '3', '2026-10-31').ok === true, 'el número también puede llegar como texto ("3") y una oferta con rondas sigue su cuenta');
ok(ronda(m, 'O006', 2, '2026-10-31').ok === true, 'una oferta CERRADA admite rondas (la app avisará)');
{
  const mm = crearMundo(); const a = mm.foto();
  const x = ronda(mm, 'O002', 2, '2026-10-30');
  ok(x.error === 'conflicto' && x.ultima === '2' && x.ronda.id === 'R002' && x.ronda.fecha === '2026-10-21' && celdasDe(mm, a).length === 0, 'pedir una ronda que ya existe: conflicto con la existente (así se detecta una petición repetida), sin escribir');
  const y = ronda(mm, 'O002', 4, '2026-10-30');
  ok(y.error === 'conflicto' && y.ultima === '2' && y.ronda === undefined && celdasDe(mm, a).length === 0, 'saltarse un número: conflicto con la última ronda, sin escribir');
  const z = ronda(mm, 'O004', 2, '2026-10-30');
  ok(z.error === 'conflicto' && z.ultima === '0', 'una oferta sin rondas solo admite la 1');
}
const rr = (nombre, esperado, f, campo, lleva) => {
  const mm = crearMundo(); let a; const llamar0 = mm.llamar;
  mm.llamar = c => { a = a ?? mm.foto(); return llamar0(c); };   // la foto "de antes" se toma justo antes de la petición (después de preparar el Sheet)
  const x = f(mm);
  ok(x.ok === false && x.error === esperado && (campo === undefined || x.campo === campo) && (lleva === undefined || x[Object.keys(lleva)[0]] === Object.values(lleva)[0]) && norm(mm.foto()) === norm(a) && mm.registro.escrituras.length === 0, `${nombre} → "${esperado}"${campo ? ' (' + campo + ')' : ''}, sin escribir`);
};
rr('oferta inexistente', 'no-encontrado', mm => ronda(mm, 'O999', 1, '2026-10-30'), 'oferta');
rr('oferta con comodín', 'no-encontrado', mm => ronda(mm, 'O0*', 1, '2026-10-30'), 'oferta');
rr('oferta repetida en la hoja', 'id-duplicado', mm => { mm.hojas.Ofertas.m.push([...mm.hojas.Ofertas.m[4]]); return ronda(mm, 'O004', 1, '2026-10-30'); }, 'oferta');
rr('sin fecha', 'requerido', mm => ronda(mm, 'O004', 1, '   '), 'fecha');
rr('fecha mal escrita', 'fecha', mm => ronda(mm, 'O004', 1, '30/10/2026'), 'fecha');
rr('fecha imposible', 'fecha', mm => ronda(mm, 'O004', 1, '2026-02-30'), 'fecha');
rr('fecha futura', 'fecha-futura', mm => ronda(mm, 'O004', 1, '2026-11-01'), 'fecha');
rr('fecha anterior a la recepción de la oferta (O004 llegó el 12/10)', 'fecha-anterior', mm => ronda(mm, 'O004', 1, '2026-10-11'), 'fecha', { desde: '2026-10-12' });
rr('fecha anterior a la ronda previa (la ronda 2 de O002 salió el 21/10)', 'fecha-anterior', mm => ronda(mm, 'O002', 3, '2026-10-20'), 'fecha', { desde: '2026-10-21' });
for (const [n, v] of [['0', 0], ['negativo', -1], ['decimal', 1.5], ['texto', 'uno'], ['1000', 1000], ['null', null], ['lista', [1]], ['vacío', ''], ['texto con decimales', '1.5']])
  rr(`número de ronda ${n}`, 'peticion', mm => ronda(mm, 'O004', v, '2026-10-30'));
rr('sin número', 'peticion', mm => mm.llamar(base(mm, { action: 'registrarRonda', idOferta: 'O004', fecha: '2026-10-30' })));
rr('oferta que no es texto', 'peticion', mm => ronda(mm, 5, 1, '2026-10-30'));
rr('oferta en blanco', 'peticion', mm => ronda(mm, '  ', 1, '2026-10-30'));
rr('oferta con ID larguísimo', 'peticion', mm => ronda(mm, MAS(41, 'O'), 1, '2026-10-30'));
rr('fecha que no es texto', 'peticion', mm => ronda(mm, 'O004', 1, 20261030));
rr('columna renombrada en Rondas', 'columna', mm => { mm.hojas.Rondas.m[0][2] = 'Nº'; return ronda(mm, 'O004', 1, '2026-10-30'); });
rr('columna renombrada en Ofertas (fecha de recepción)', 'columna', mm => { mm.hojas.Ofertas.m[0][9] = 'Recibida'; return ronda(mm, 'O004', 1, '2026-10-30'); });
m = crearMundo({ ajustar: h => { h.Rondas.m.push(['R050', 'O001', '1', '2026-10-06']); h.Rondas.m.push(['XYZ', 'O001', '2', '2026-10-07']); } });
m = crearMundo({ ajustar: h => { h.Rondas.m.push(['R050', 'O001', '1', '2026-10-06']); h.Rondas.m.push(['XYZ', 'O001', '2', '2026-10-07']); } });
ok(ronda(m, 'O004', 1, '2026-10-30').ronda.id === 'R051', 'con huecos o IDs raros, el ID sigue desde el mayor (R051)');
m = crearMundo({ ajustar: h => { h.Rondas.m.push(['', '', '', '']); } });
antes = m.foto(); ronda(m, 'O004', 1, '2026-10-30');
ok(celdasDe(m, antes).every(c => c.startsWith('Rondas!7,')), 'una fila vacía al final no se salta: la ronda va a la primera fila libre');

titulo('20. Rondas: crear una aplicación');
m = crearMundo();
antes = m.foto();
r = aplica(m, 'A003', 'O002', 2, '2026-10-25', 'Le interesa Barcelona.');
ok(r.ok === true && r.aplicacion.id === 'AP013' && r.aplicacion.estado === 'Recibida' && r.aplicacion.motivo === '' && r.aplicacion.numeroRonda === '2' && r.aplicacion.notas === 'Le interesa Barcelona.', 'caso normal: AP013, estado Recibida, sin motivo');
igual(r.historial, { id: 'H037', idAplicacion: 'AP013', estadoAnterior: '', estadoNuevo: 'Recibida', motivo: '', fecha: '2026-10-25', nota: '' }, 'y su primera línea de historial (H037)');
igual(celdasDe(m, antes).sort(), [...Array.from({ length: 8 }, (_, i) => `Aplicaciones!14,${i + 1}`), ...Array.from({ length: 7 }, (_, i) => `Historial!38,${i + 1}`)].sort(), 'se escriben EXACTAMENTE 8 celdas de Aplicaciones y 7 de Historial (ninguna más)');
ok(m.registro.escrituras.filter(e => e.tipo === 'formato').length === 15 && m.registro.escrituras.filter(e => e.tipo === 'formato').every(e => e.valor === '@'), 'las 15 celdas se escriben como texto plano');
igual(filaHoja(m, 'Aplicaciones', 'AP013'), { 'ID aplicación': 'AP013', 'ID alumno': 'A003', 'ID oferta': 'O002', 'Número de ronda': '2', 'Fecha de aplicación': '2026-10-25', Estado: 'Recibida', 'Motivo de descarte': '', Notas: 'Le interesa Barcelona.' }, 'la fila de Aplicaciones tiene lo esperado');
ok(problemas(m.llamar(base(m, { action: 'data' }))).length === 0, 'tras crearla, los datos siguen siendo coherentes');
ok(aplica(m, 'A003', 'O006', 1, '2026-10-31').ok === true, 'una oferta CERRADA admite aplicaciones (la app avisará)');
ok(aplica(m, 'A002', 'O002', 2, '2026-10-21', '').ok === true, 'el mismo alumno puede aplicar en otra ronda de la misma oferta (A002 ya estaba en la ronda 1); misma fecha que la ronda: se admite');
ok(aplica(m, 'A005', 'O003', '2', '2026-10-30').ok === true, 'el número de ronda también puede llegar como texto');
{
  const mm = crearMundo(); const a = mm.foto();
  const x = aplica(mm, 'A001', 'O002', 2, '2026-10-30');
  ok(x.error === 'duplicado' && x.aplicacion.id === 'AP004' && x.aplicacion.estado === 'En revisión' && celdasDe(mm, a).length === 0, 'la misma pareja alumno + oferta + ronda: "duplicado" con la que ya existe, sin escribir');
  ok(aplica(mm, 'A001', 'O002', 1, '2026-10-30').ok === true, '... pero en otra ronda sí se puede');
}
const ra = (nombre, esperado, f, campo, lleva) => rr(nombre, esperado, f, campo, lleva);
ra('alumno inexistente', 'no-encontrado', mm => aplica(mm, 'A999', 'O002', 1, '2026-10-30'), 'alumno');
ra('alumno con intento de inyección', 'no-encontrado', mm => aplica(mm, "A001' OR '1'='1", 'O002', 1, '2026-10-30'), 'alumno');
ra('alumno repetido en la hoja', 'id-duplicado', mm => { mm.hojas.Alumnos.m.push([...mm.hojas.Alumnos.m[3]]); return aplica(mm, 'A003', 'O002', 1, '2026-10-30'); }, 'alumno');
ra('oferta inexistente', 'no-encontrado', mm => aplica(mm, 'A003', 'O999', 1, '2026-10-30'), 'oferta');
ra('ronda que no existe (O002 solo tiene 2)', 'no-encontrado', mm => aplica(mm, 'A003', 'O002', 3, '2026-10-30'), 'ronda');
ra('oferta sin rondas (O004)', 'no-encontrado', mm => aplica(mm, 'A003', 'O004', 1, '2026-10-30'), 'ronda');
ra('ronda repetida en la hoja', 'id-duplicado', mm => { mm.hojas.Rondas.m.push(['R050', 'O002', '1', '2026-10-10']); return aplica(mm, 'A003', 'O002', 1, '2026-10-30'); }, 'ronda');
ra('fecha anterior a la ronda (la ronda 2 salió el 21/10)', 'fecha-anterior', mm => aplica(mm, 'A003', 'O002', 2, '2026-10-20'), 'fecha', { desde: '2026-10-21' });
ra('sin fecha', 'requerido', mm => aplica(mm, 'A003', 'O002', 2, ''), 'fecha');
ra('fecha mal escrita', 'fecha', mm => aplica(mm, 'A003', 'O002', 2, '2026-1-3'), 'fecha');
ra('fecha futura', 'fecha-futura', mm => aplica(mm, 'A003', 'O002', 2, '2026-11-01'), 'fecha');
ra('notas de 2001 caracteres', 'largo', mm => aplica(mm, 'A003', 'O002', 2, '2026-10-30', MAS(2001)), 'notas');
ra('notas con HTML', 'html', mm => aplica(mm, 'A003', 'O002', 2, '2026-10-30', 'hola <b>x</b>'), 'notas');
ra('notas con carácter de control', 'caracteres', mm => aplica(mm, 'A003', 'O002', 2, '2026-10-30', 'a\u0000b'), 'notas');
ra('"Recibida" ya no está en la lista de estados', 'lista', mm => { mm.hojas.Listas.m[1][9] = 'Nueva'; return aplica(mm, 'A003', 'O002', 2, '2026-10-30'); }, 'estado');
ra('falta la columna de estados en Listas', 'columna', mm => { mm.hojas.Listas.m[0][9] = 'Otra'; return aplica(mm, 'A003', 'O002', 2, '2026-10-30'); });
ra('columna renombrada en Aplicaciones', 'columna', mm => { mm.hojas.Aplicaciones.m[0][5] = 'Situación'; return aplica(mm, 'A003', 'O002', 2, '2026-10-30'); });
ra('columna renombrada en Historial', 'columna', mm => { mm.hojas.Historial.m[0][5] = 'Día'; return aplica(mm, 'A003', 'O002', 2, '2026-10-30'); });
ra('ID de alumno que no es texto', 'peticion', mm => aplica(mm, 7, 'O002', 2, '2026-10-30'));
ra('ID de alumno vacío', 'peticion', mm => aplica(mm, '', 'O002', 2, '2026-10-30'));
ra('ronda 0', 'peticion', mm => aplica(mm, 'A003', 'O002', 0, '2026-10-30'));
ra('notas que no son texto', 'peticion', mm => aplica(mm, 'A003', 'O002', 2, '2026-10-30', 5));
ra('sin notas', 'peticion', mm => mm.llamar(base(mm, { action: 'crearAplicacion', idAlumno: 'A003', idOferta: 'O002', numeroRonda: 2, fecha: '2026-10-30' })));
for (const t of ['=1+1', '+34 600 000 000', '-nota', '@SUM(1)']) {
  const mm = crearMundo(); const x = aplica(mm, 'A003', 'O002', 2, '2026-10-30', t);
  ok(x.ok === true && x.aplicacion.notas === ' ' + t && filaHoja(mm, 'Aplicaciones', 'AP013').Notas === ' ' + t && mm.registro.formulas.length === 0, `notas que empiezan por "${t[0]}": con un espacio delante, nunca como fórmula`);
}
ok(aplica(crearMundo(), 'A003', 'O002', 2, '2026-10-30', MAS(2000)).ok === true, 'notas de 2000 caracteres justos: se admiten');
ok(aplica(crearMundo(), 'A003', 'O002', 2, '2026-10-30', 'línea 1\r\nlínea 2 ñ 😀').aplicacion.notas === 'línea 1\nlínea 2 ñ 😀', 'las notas pueden tener varias líneas, tildes y emojis (los saltos se normalizan)');
m = crearMundo({ ajustar: h => { h.Aplicaciones.m.push(['AP050', 'A001', 'O003', '1', '2026-10-14', 'Recibida', '', '']); h.Historial.m.push(['H099', 'AP050', '', 'Recibida', '', '2026-10-14', '']); } });
r = aplica(m, 'A003', 'O002', 2, '2026-10-30');
ok(r.aplicacion.id === 'AP051' && r.historial.id === 'H100', 'con huecos, los ID siguen desde el mayor (AP051, H100)');

titulo('21. Rondas: cambiar el estado de una aplicación');
const ANT = (estado, motivo = '') => ({ estado, motivo });
m = crearMundo();
antes = m.foto();
r = estadoDe(m, 'AP004', 'Enviada a la empresa', '', '2026-10-30', 'Se envió el CV.', ANT('En revisión'));
ok(r.ok === true && r.sinCambios === false && r.aplicacion.estado === 'Enviada a la empresa' && r.aplicacion.id === 'AP004' && r.aplicacion.idAlumno === 'A001', 'caso normal: devuelve la aplicación con el estado nuevo');
igual(r.historial, { id: 'H037', idAplicacion: 'AP004', estadoAnterior: 'En revisión', estadoNuevo: 'Enviada a la empresa', motivo: '', fecha: '2026-10-30', nota: 'Se envió el CV.' }, 'y la línea nueva de historial, con estado anterior y nota');
igual(celdasDe(m, antes).sort(), ['Aplicaciones!5,6', ...Array.from({ length: 7 }, (_, i) => `Historial!38,${i + 1}`)].sort(), 'se escribe EXACTAMENTE 1 celda de Aplicaciones (el estado) y 7 de Historial');
ok(soloHojas(celdasDe(m, antes), ['Aplicaciones', 'Historial']) && m.registro.escrituras.filter(e => e.tipo === 'formato').every(e => e.valor === '@'), 'solo Aplicaciones e Historial, y como texto plano');
ok(problemas(m.llamar(base(m, { action: 'data' }))).length === 0, 'los datos siguen coherentes');
r = estadoDe(m, 'AP004', 'Descartado', 'Permiso de trabajo', '2026-10-31', '', ANT('Enviada a la empresa'));
ok(r.ok && r.aplicacion.estado === 'Descartado' && r.aplicacion.motivo === 'Permiso de trabajo' && filaHoja(m, 'Aplicaciones', 'AP004')['Motivo de descarte'] === 'Permiso de trabajo' && r.historial.motivo === 'Permiso de trabajo', 'descartar con motivo: queda en la aplicación y en el historial');
r = estadoDe(m, 'AP004', 'En revisión', '', '2026-10-31', 'Se reabre.', ANT('Descartado', 'Permiso de trabajo'));
ok(r.ok && filaHoja(m, 'Aplicaciones', 'AP004').Estado === 'En revisión' && filaHoja(m, 'Aplicaciones', 'AP004')['Motivo de descarte'] === '' && r.historial.estadoAnterior === 'Descartado' && r.historial.motivo === '', 'reabrir un descartado: el motivo se vacía en la aplicación (y la línea de historial anterior lo conserva)');
ok(filaHoja(m, 'Historial', 'H038')['Motivo de descarte'] === 'Permiso de trabajo' && filaHoja(m, 'Historial', 'H038')['Estado nuevo'] === 'Descartado', '... el historial del descarte sigue ahí, intacto');
ok(problemas(m.llamar(base(m, { action: 'data' }))).length === 0, 'tras descartar y reabrir, los datos siguen coherentes');
{
  const mm = crearMundo(); const a = mm.foto();
  const x = estadoDe(mm, 'AP002', 'Descartado', 'Otro', '2026-10-31', 'Corrijo el motivo.', ANT('Descartado', 'Perfil no encaja'));
  igual(celdasDe(mm, a).sort(), ['Aplicaciones!3,7', ...Array.from({ length: 7 }, (_, i) => `Historial!38,${i + 1}`)].sort(), 'cambiar solo el motivo de un descartado: 1 celda en Aplicaciones y la línea de historial');
  ok(x.ok && x.historial.estadoAnterior === 'Descartado' && x.historial.estadoNuevo === 'Descartado', '... queda apuntado como Descartado → Descartado');
  const y = estadoDe(mm, 'AP001', 'Recibida', '', '2026-10-31', 'Vuelve atrás.', ANT('Entrevista'));
  ok(y.ok === true && filaHoja(mm, 'Aplicaciones', 'AP001').Estado === 'Recibida', 'también se puede ir hacia atrás (corregir un error)');
  const b = mm.foto(); const n = mm.registro.escrituras.length;
  const z = estadoDe(mm, 'AP002', 'Descartado', 'Otro', '2026-10-31', 'texto que se ignora', ANT('Descartado', 'Otro'));
  ok(z.ok === true && z.sinCambios === true && z.historial === null && celdasDe(mm, b).length === 0 && mm.registro.escrituras.length === n, 'sin cambios reales: no escribe nada (ni historial)');
  const w = estadoDe(mm, 'AP004', 'En revisión', '', '2026-10-27', '', ANT('En revisión'));
  ok(w.ok && w.sinCambios, 'sin cambios reales no pide ni fecha válida a efectos de orden');
  const c1 = estadoDe(mm, 'AP005', 'En revisión', '', '2026-10-22', '', ANT('Recibida'));
  ok(c1.ok === true, 'mismo día que su último movimiento: se admite');
}
const re = (nombre, esperado, f, campo, lleva) => rr(nombre, esperado, f, campo, lleva);
re('estado vacío', 'requerido', mm => estadoDe(mm, 'AP004', '', '', '2026-10-31', '', ANT('En revisión')), 'estado');
re('estado inventado', 'lista', mm => estadoDe(mm, 'AP004', 'Fichado', '', '2026-10-31', '', ANT('En revisión')), 'estado');
re('Descartado sin motivo', 'requerido', mm => estadoDe(mm, 'AP004', 'Descartado', '', '2026-10-31', '', ANT('En revisión')), 'motivo');
re('motivo que no está en la lista', 'lista', mm => estadoDe(mm, 'AP004', 'Descartado', 'Era feo', '2026-10-31', '', ANT('En revisión')), 'motivo');
re('motivo con un estado que no es Descartado', 'motivo-sobra', mm => estadoDe(mm, 'AP004', 'Entrevista', 'Otro', '2026-10-31', '', ANT('En revisión')), 'motivo');
re('"Descartado" ya no está en la lista de estados', 'lista', mm => { mm.hojas.Listas.m.forEach(f => { if (f[9] === 'Descartado') f[9] = 'Baja'; }); return estadoDe(mm, 'AP004', 'Descartado', 'Otro', '2026-10-31', '', ANT('En revisión')); }, 'estado');
re('falta la columna de motivos en Listas', 'columna', mm => { mm.hojas.Listas.m[0][10] = 'Razones'; return estadoDe(mm, 'AP004', 'Descartado', 'Otro', '2026-10-31', '', ANT('En revisión')); });
re('aplicación inexistente', 'no-encontrado', mm => estadoDe(mm, 'AP999', 'Entrevista', '', '2026-10-31', '', ANT('Recibida')), 'aplicacion');
re('aplicación con comodín', 'no-encontrado', mm => estadoDe(mm, 'AP0*', 'Entrevista', '', '2026-10-31', '', ANT('Recibida')), 'aplicacion');
re('aplicación repetida en la hoja', 'id-duplicado', mm => { mm.hojas.Aplicaciones.m.push([...mm.hojas.Aplicaciones.m[4]]); return estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', '', ANT('En revisión')); }, 'aplicacion');
re('fecha futura', 'fecha-futura', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-11-01', '', ANT('En revisión')), 'fecha');
re('fecha mal escrita', 'fecha', mm => estadoDe(mm, 'AP004', 'Entrevista', '', 'hoy', '', ANT('En revisión')), 'fecha');
re('sin fecha', 'requerido', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '', '', ANT('En revisión')), 'fecha');
re('fecha anterior a su último movimiento (27/10)', 'fecha-anterior', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-26', '', ANT('En revisión')), 'fecha', { desde: '2026-10-27' });
re('fecha anterior a la aplicación (sin más historial)', 'fecha-anterior', mm => estadoDe(mm, 'AP005', 'En revisión', '', '2026-10-21', '', ANT('Recibida')), 'fecha', { desde: '2026-10-22' });
re('nota de 2001 caracteres', 'largo', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', MAS(2001), ANT('En revisión')), 'nota');
re('nota con HTML', 'html', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', '<script>x</script>', ANT('En revisión')), 'nota');
re('nota con carácter de control', 'caracteres', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', 'a\u001bb', ANT('En revisión')), 'nota');
re('ID que no es texto', 'peticion', mm => estadoDe(mm, 7, 'Entrevista', '', '2026-10-31', '', ANT('En revisión')));
re('ID vacío', 'peticion', mm => estadoDe(mm, '', 'Entrevista', '', '2026-10-31', '', ANT('En revisión')));
re('sin "anterior"', 'peticion', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', '', undefined));
re('"anterior" es una lista', 'peticion', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', '', []));
re('"anterior" incompleto', 'peticion', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', '', { estado: 'En revisión' }));
re('estado que no es texto', 'peticion', mm => estadoDe(mm, 'AP004', 5, '', '2026-10-31', '', ANT('En revisión')));
re('motivo que no es texto', 'peticion', mm => estadoDe(mm, 'AP004', 'Entrevista', null, '2026-10-31', '', ANT('En revisión')));
re('nota que no es texto', 'peticion', mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', 7, ANT('En revisión')));
re('columna renombrada en Aplicaciones', 'columna', mm => { mm.hojas.Aplicaciones.m[0][6] = 'Razón'; return estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', '', ANT('En revisión')); });
for (const t of ['=1+1', '@x']) {
  const mm = crearMundo(); const x = estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', t, ANT('En revisión'));
  ok(x.ok && x.historial.nota === ' ' + t && mm.registro.formulas.length === 0, `nota que empieza por "${t[0]}": con un espacio delante, nunca como fórmula`);
}

titulo('22. Rondas: cambios simultáneos');
m = crearMundo();
const veo = { estado: 'En revisión', motivo: '' };
ok(estadoDe(m, 'AP004', 'Enviada a la empresa', '', '2026-10-30', '', veo).ok === true, 'la persona A cambia el estado partiendo de lo que vio');
antes = m.foto();
r = estadoDe(m, 'AP004', 'Entrevista', '', '2026-10-31', '', veo);
ok(r.ok === false && r.error === 'conflicto' && r.aplicacion.estado === 'Enviada a la empresa' && r.aplicacion.id === 'AP004' && celdasDe(m, antes).length === 0, 'la persona B parte de lo antiguo: conflicto con la aplicación como está ahora, sin pisar nada');
ok(estadoDe(m, 'AP004', 'Entrevista', '', '2026-10-31', '', { estado: 'Enviada a la empresa', motivo: '' }).ok === true, 'B reintenta con lo actual y guarda');
r = estadoDe(m, 'AP004', 'Contratado', '', '2026-10-31', '', { estado: 'Entrevista', motivo: 'Otro' });
ok(r.error === 'conflicto', 'basta con que el motivo anterior no coincida para dar conflicto');
m.hojas.Aplicaciones.m[4][5] = '  Entrevista  ';
ok(estadoDe(m, 'AP004', 'Contratado', '', '2026-10-31', '', { estado: 'Entrevista', motivo: '' }).ok === true, 'la comparación ignora espacios sobrantes (no hay falsos conflictos)');
{
  const mm = crearMundo();
  const a1 = ronda(mm, 'O004', 1, '2026-10-30'), a2 = ronda(mm, 'O004', 1, '2026-10-30');
  ok(a1.ok === true && a2.error === 'conflicto' && a2.ronda.id === a1.ronda.id && mm.hojas.Rondas.m.length === 7, 'dos personas que registran "la ronda 1" a la vez: solo se crea una, la otra recibe conflicto con la creada');
  const b1 = aplica(mm, 'A003', 'O004', 1, '2026-10-30'), b2 = aplica(mm, 'A003', 'O004', 1, '2026-10-30');
  ok(b1.ok === true && b2.error === 'duplicado' && b2.aplicacion.id === b1.aplicacion.id && mm.hojas.Aplicaciones.m.length === 14, 'dos personas que crean la misma aplicación: solo se crea una');
}

titulo('23. Rondas: nunca queda nada a medias (fallo de escritura en cualquier punto)');
const aMedias = (nombre, preparar, accion, escrituras) => {
  let bien = true, detalle = '';
  for (let k = 0; k < escrituras; k++) {
    const mm = crearMundo(); preparar?.(mm);
    const a = mm.foto();
    mm.fallarEscritura(k);
    const x = accion(mm);
    if (!(x.ok === false && x.error === 'servidor' && Object.keys(x).join() === 'ok,error' && norm(mm.foto()) === norm(a))) { bien = false; detalle += ` (k=${k}: ${JSON.stringify(x).slice(0, 80)})`; }
    mm.registro.restantes = null;
    const dr = mm.llamar(base(mm, { action: 'data' }));
    if (problemas(dr).length) { bien = false; detalle += ` (k=${k}: datos incoherentes)`; }
  }
  const mm = crearMundo(); mm.fallarEscritura(escrituras); preparar?.(mm);
  const sinFallo = accion(mm);
  ok(bien, `${nombre}: si falla la escritura nº 1, 2, … ${escrituras}, se deshace todo y los datos quedan como estaban${detalle}`);
  ok(sinFallo.ok === true, `${nombre}: con ${escrituras} escrituras sin fallo, se guarda`);
};
aMedias('registrar ronda', null, mm => ronda(mm, 'O004', 1, '2026-10-30'), 4);
aMedias('crear aplicación', null, mm => aplica(mm, 'A003', 'O002', 2, '2026-10-30', 'x'), 15);
aMedias('cambiar estado', null, mm => estadoDe(mm, 'AP004', 'Entrevista', '', '2026-10-31', 'x', ANT('En revisión')), 8);
aMedias('descartar (estado y motivo)', null, mm => estadoDe(mm, 'AP004', 'Descartado', 'Otro', '2026-10-31', 'x', ANT('En revisión')), 9);
m = crearMundo(); m.fallarEscritura(9);
r = aplica(m, 'A003', 'O002', 2, '2026-10-30');
ok(r.error === 'servidor' && m.registro.errores.some(e => e.includes('fallo de escritura simulado')) && !m.registro.respuestas.join('').includes('simulado'), 'el detalle del fallo queda en el registro del script y no sale a la app');
r = aplica(m, 'A003', 'O002', 2, '2026-10-30');
ok(r.ok === true && r.aplicacion.id === 'AP013' && r.historial.id === 'H037' && m.hojas.Aplicaciones.m.length === 14, 'después de un fallo se puede reintentar: mismos ID y la misma fila (no queda un hueco)');

titulo('24. Rondas: un recorrido completo');
m = crearMundo();
antes = m.foto();
ronda(m, 'O004', 1, '2026-10-28');
const a1 = aplica(m, 'A002', 'O004', 1, '2026-10-29', 'Aplica desde el móvil.'), a2 = aplica(m, 'A003', 'O004', 1, '2026-10-29');
estadoDe(m, a1.aplicacion.id, 'En revisión', '', '2026-10-30', '', ANT('Recibida'));
estadoDe(m, a1.aplicacion.id, 'Contratado', '', '2026-10-31', 'Empieza en enero.', ANT('En revisión'));
estadoDe(m, a2.aplicacion.id, 'Descartado', 'La empresa eligió a otro', '2026-10-31', '', ANT('Recibida'));
ronda(m, 'O004', 2, '2026-10-31');
aplica(m, 'A003', 'O004', 2, '2026-10-31');
const fin = m.llamar(base(m, { action: 'data' }));
igual(problemas(fin), [], 'tras registrar rondas, crear aplicaciones y cambiar estados, todo sigue coherente');
ok(soloHojas(celdasDe(m, antes), ['Rondas', 'Aplicaciones', 'Historial']), 'solo han cambiado Rondas, Aplicaciones e Historial (Alumnos, Ofertas y Listas intactas)');
{
  const viejo = JSON.parse(antes), nuevo = JSON.parse(m.foto());
  const intactas = ['Rondas', 'Historial'].every(n => viejo[n].every((f, i) => JSON.stringify(f) === JSON.stringify(nuevo[n][i])));
  const apV = viejo.Aplicaciones, apN = nuevo.Aplicaciones;
  const soloEstado = apV.every((f, i) => f.every((x, c) => c === 5 || c === 6 || x === apN[i][c]));
  ok(intactas && soloEstado && nuevo.Rondas.length >= viejo.Rondas.length && nuevo.Historial.length > viejo.Historial.length, 'las filas que ya había no se tocan (Historial y Rondas) salvo estado y motivo de las aplicaciones: nada se borra ni se reescribe');
}
igual(tablaObj(fin.historial).filter(h => h['ID aplicación'] === 'AP013').map(h => h['Estado nuevo']), ['Recibida', 'En revisión', 'Contratado'], 'el historial de una aplicación cuenta su recorrido en orden');

titulo('25. Rondas: acceso');
for (const [nombre, k] of [['sin clave', undefined], ['mala', 'mala'], ['vacía', '']]) {
  const mm = crearMundo(); const a = mm.foto();
  const rs = [mm.llamar({ key: k, action: 'registrarRonda', idOferta: 'O004', numero: 1, fecha: '2026-10-30' }), mm.llamar({ key: k, action: 'crearAplicacion', idAlumno: 'A003', idOferta: 'O002', numeroRonda: 2, fecha: '2026-10-30', notas: '' }),
    mm.llamar({ key: k, action: 'cambiarEstado', id: 'AP004', estado: 'Entrevista', motivo: '', fecha: '2026-10-31', nota: '', anterior: ANT('En revisión') })];
  ok(rs.every(x => x.error === 'clave') && mm.registro.escrituras.length === 0 && mm.foto() === a, `clave ${nombre}: no puede registrar rondas, crear aplicaciones ni cambiar estados`);
}
m = crearMundo();
for (let i = 0; i < 5; i++) m.llamar({ key: 'mala', action: 'cambiarEstado' });
igual(ronda(m, 'O004', 1, '2026-10-30').error, 'bloqueado', 'tras 5 fallos, bloqueo también para las funciones nuevas');
m = crearMundo({ bloqueoOcupado: true });
ok(ronda(m, 'O004', 1, '2026-10-30').error === 'ocupado' && aplica(m, 'A003', 'O002', 2, '2026-10-30').error === 'ocupado' && m.registro.escrituras.length === 0, 'script ocupado: no escribe');
m = crearMundo({ ajustar: h => { h.Rondas.rompe = true; } });
ok(ronda(m, 'O004', 1, '2026-10-30').error === 'servidor', 'un fallo interno al leer responde solo "servidor"');

titulo('26. Rondas: comprobación de configuración');
m = crearMundo();
const inf2 = m.sandbox.comprobarConfiguracion();
igual([inf2.hojas.Rondas, inf2.hojas.Aplicaciones, inf2.hojas.Historial], ['5 filas', '12 filas', '36 filas'], 'cuenta las filas de las 3 hojas nuevas');
ok(Object.values(inf2.columnasRondas).length === 19 && Object.values(inf2.columnasRondas).every(x => x === 'ok'), 'comprueba las 19 columnas de las 3 hojas');
ok(Object.values(inf2.listas).every(x => x === 'ok') && inf2.listas['Estado de la aplicación'] === 'ok' && inf2.listas['Motivo de descarte'] === 'ok', 'comprueba las dos listas nuevas');
ok(inf2.estados.Recibida === 'ok' && inf2.estados.Descartado === 'ok' && inf2.rondas.startsWith('listas'), 'comprueba que existen "Recibida" y "Descartado" y que las hojas están');
let inf3 = crearMundo({ ajustar: h => { delete h.Rondas; } }).sandbox.comprobarConfiguracion();
ok(inf3.hojas.Rondas === 'FALTA LA HOJA' && inf3.rondas.startsWith('FALTAN') && Object.entries(inf3.columnasRondas).filter(([k]) => k.startsWith('Rondas')).every(([, v]) => v === 'FALTA'), 'avisa si falta una hoja');
inf3 = crearMundo({ ajustar: h => { h.Listas.m[0][10] = 'x'; } }).sandbox.comprobarConfiguracion();
ok(inf3.listas['Motivo de descarte'] === 'FALTA LA COLUMNA EN LISTAS', 'avisa si falta la lista de motivos');
inf3 = crearMundo({ ajustar: h => { h.Listas.m.forEach(f => { if (f[9] === 'Descartado') f[9] = 'Baja'; }); } }).sandbox.comprobarConfiguracion();
ok(inf3.estados.Descartado === 'FALTA EN LA LISTA' && inf3.estados.Recibida === 'ok', 'avisa si se ha renombrado "Descartado"');
inf3 = crearMundo({ ajustar: h => { delete h.Listas; } }).sandbox.comprobarConfiguracion();
ok(inf3.estados.Recibida === 'FALTA EN LA LISTA', 'sin hoja Listas la comprobación no se rompe');

titulo('27. Que no se escape la clave');
m = crearMundo();
m.llamar(base(m, { action: 'data' })); m.llamar({ key: 'mala', action: 'data' }); m.llamar('xx'); guardar(m, 'A002', '<b>', '2026-10-30'); guardar(m, 'A999', 'x', '2026-10-30'); guardarOf(m, null, { ...OFERTA(), empresa: '<b>' }); guardarOf(m, null, OFERTA());
ronda(m, 'O004', 1, '2026-10-30'); ronda(m, 'O999', 1, '2026-10-30'); aplica(m, 'A003', 'O004', 1, '2026-10-30'); aplica(m, 'A003', 'O004', 1, '2026-10-30'); estadoDe(m, 'AP013', 'Entrevista', '', '2026-10-31', '', ANT('Recibida')); estadoDe(m, 'AP013', 'Entrevista', '', '2026-10-31', '', ANT('Recibida')); estadoDe(m, 'AP999', 'Entrevista', '', '2026-10-31', '', ANT('Recibida'));
ok(m.registro.respuestas.length >= 5 && m.registro.respuestas.every(x => !x.includes(m.clave) && !x.includes('CLAVE')), 'ninguna respuesta (buena o de error) contiene la clave');
ok(m.registro.errores.every(e => !e.includes(m.clave)), 'el registro del script tampoco');

console.log(`\n${total - fallos} de ${total} comprobaciones correctas` + (fallos ? `  ·  ${fallos} FALLAN` : ''));
process.exit(fallos ? 1 : 0);
