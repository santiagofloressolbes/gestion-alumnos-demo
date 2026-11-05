// Pruebas de las notas de entrevista: guardar, validar, conflictos, borrar, fallos de red y modo demo.
import { b, nuevo, chk, almacen, conectar, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const mañana = () => { const d = new Date(Date.now() + 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const COL_N = 15, COL_F = 16;   // columnas (1-based) de Notas y Fecha en Alumnos
const fila = (mundo, id) => mundo.hojas.Alumnos.m.findIndex(f => f[0] === id) + 1;

async function entrar(opts = {}) {
  const t = await nuevo(opts);
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  return t;
}
const abrir = async (pg, id) => { await pg.goto(BASE + '#/alumno/' + id); await pg.waitForSelector('#en-titulo'); };
const peticionesGuardar = log => log.peticiones.filter(p => JSON.parse(p.cuerpo).action === 'guardarEntrevista');

/* 1. Añadir entrevista a quien no tiene */
{
  console.log('1. Añadir y guardar');
  const { pg, ctx, mundo, log } = await entrar();
  await abrir(pg, 'A002');
  chk(/Sin entrevista registrada/.test(await pg.innerText('#v-alumno')), 'A002 sin entrevista');
  chk(await pg.innerText('#en-editar') === 'Añadir entrevista', 'botón Añadir');
  await pg.click('#en-editar');
  chk(await pg.inputValue('#en-fecha') === hoy(), 'fecha por defecto = hoy');
  chk(await pg.getAttribute('#en-fecha', 'max') === hoy(), 'max = hoy');
  chk(await pg.evaluate(() => getComputedStyle(document.querySelector('#en-notas')).fontSize) === '16px', 'textarea a 16px (sin zoom iPhone)');
  await pg.fill('#en-notas', 'Muy buen perfil.\nQuiere prácticas en Madrid.');
  chk(/^50 \/ 2\.000|^\d+ \/ 2\.000/.test(await pg.innerText('#en-cuenta')), 'contador: ' + await pg.innerText('#en-cuenta'));
  const antes = mundo.foto();
  await pg.click('form button[type=submit]');
  await pg.waitForSelector('#en-editar');
  const cambios = mundo.celdasCambiadas(antes, mundo.foto());
  const f = fila(mundo, 'A002');
  chk(cambios.sort().join() === [`Alumnos!${f},${COL_N}`, `Alumnos!${f},${COL_F}`].sort().join(), 'solo 2 celdas cambian: ' + cambios);
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === 'Muy buen perfil.\nQuiere prácticas en Madrid.' && mundo.hojas.Alumnos.m[f - 1][COL_F - 1] === hoy(), 'valores en el Sheet');
  const t = await pg.innerText('#v-alumno');
  chk(/Guardado en el Sheet/.test(t) && /Muy buen perfil/.test(t), 'ficha enseña lo guardado');
  chk(await pg.innerText('#en-editar') === 'Editar entrevista', 'botón pasa a Editar');
  const al = await almacen(pg);
  chk(Object.keys(al).sort().join() === 'gad.clave,gad.url' && !JSON.stringify(al).includes('Muy buen'), 'la nota no se guarda en el móvil');
  const cuerpo = JSON.parse(peticionesGuardar(log)[0].cuerpo);
  chk(cuerpo.notasAnteriores === '' && cuerpo.fechaAnterior === '' && cuerpo.id === 'A002', 'petición con id y valores anteriores');
  // recargar la app: sigue ahí
  await pg.reload(); await pg.waitForSelector('#en-titulo');
  chk(/Muy buen perfil/.test(await pg.innerText('#v-alumno')), 'tras recargar la nota sigue');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 2. Validaciones en el móvil: no se envía nada */
{
  console.log('2. Validación local');
  const { pg, ctx, log } = await entrar();
  await abrir(pg, 'A002'); await pg.click('#en-editar');
  const probar = async (notas, fecha, esperado, nombre) => {
    await pg.fill('#en-notas', notas); await pg.fill('#en-fecha', fecha);
    await pg.click('form button[type=submit]');
    await pg.waitForSelector('.error:not([hidden])');
    chk(esperado.test(await pg.innerText('.error')), nombre + ': ' + await pg.innerText('.error'));
  };
  await probar('', hoy(), /Escribe una nota/, 'sin nota (alumno sin entrevista previa)');
  await probar('a'.repeat(2001), hoy(), /demasiado larga: el máximo es de 2\.000/, '2.001 caracteres');
  chk(/exceso/.test(await pg.getAttribute('#en-cuenta', 'class')), 'contador en rojo');
  await probar('hola <b>negrita</b>', hoy(), /lo toma por código/, 'HTML');
  await probar('texto\u0007con campana', hoy(), /caracteres raros/, 'control');
  await probar('nota', mañana(), /no puede ser futura/, 'fecha futura');
  await pg.fill('#en-fecha', ''); await pg.fill('#en-notas', 'nota'); await pg.click('form button[type=submit]');
  chk(/fecha válida/.test(await pg.innerText('.error')), 'fecha vacía');
  chk(peticionesGuardar(log).length === 0, 'cero peticiones de guardado');
  // límite exacto 2000 sí, y "menor que" suelto sí
  await pg.fill('#en-fecha', hoy()); await pg.fill('#en-notas', 'x'.repeat(2000));
  chk(/2\.000 \/ 2\.000/.test(await pg.innerText('#en-cuenta')) && !/exceso/.test(await pg.getAttribute('#en-cuenta', 'class')), '2.000 es válido');
  await pg.fill('#en-notas', 'edad < 30 y nota 5 > 4'); await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  chk(peticionesGuardar(log).length === 1, '"<" suelto se admite');
  await ctx.close();
}

/* 3. Texto peligroso: fórmulas y HTML llegan neutros */
{
  console.log('3. Fórmulas');
  const { pg, ctx, mundo } = await entrar();
  await abrir(pg, 'A003'); await pg.click('#en-editar');
  await pg.fill('#en-notas', '=HYPERLINK("http://evil","clic")'); await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  const f = fila(mundo, 'A003');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === ' =HYPERLINK("http://evil","clic")', 'se añadió un espacio delante');
  chk(mundo.registro.formulas.length === 0, 'no hay fórmulas activas en el Sheet');
  chk(/=HYPERLINK/.test(await pg.innerText('#v-alumno')), 'se ve como texto');
  // y se puede volver a editar sin falso conflicto (el espacio inicial no se recorta al leer)
  await pg.click('#en-editar'); chk(await pg.inputValue('#en-notas') === '=HYPERLINK("http://evil","clic")', 'al editar se ve sin el espacio');
  await pg.fill('#en-notas', '-segunda versión'); await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === ' -segunda versión', 'segunda edición sin falso conflicto');
  await ctx.close();
}

/* 4. Falsos conflictos: notas con espacios y saltos de línea escritas a mano en el Sheet */
{
  console.log('4. Notas escritas a mano en el Sheet');
  const { pg, ctx, mundo } = await entrar();
  const f = fila(mundo, 'A004');
  mundo.hojas.Alumnos.m[f - 1][COL_N - 1] = '  nota con espacios \r\n y salto  \n';
  mundo.hojas.Alumnos.m[f - 1][COL_F - 1] = '2026-09-01';
  await abrir(pg, 'A004');
  chk(/1 de septiembre de 2026/.test(await pg.innerText('#v-alumno')), 'fecha formateada');
  await pg.click('#en-editar');
  chk(await pg.inputValue('#en-fecha') === '2026-09-01', 'la fecha anterior se precarga');
  await pg.fill('#en-notas', 'nota nueva'); await pg.click('form button[type=submit]');
  await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === 'nota nueva', 'guarda sin falso conflicto');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_F - 1] === '2026-09-01', 'conserva la fecha');
  // solo cambiar la fecha
  await pg.click('#en-editar'); await pg.fill('#en-fecha', '2026-10-02'); await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === 'nota nueva' && mundo.hojas.Alumnos.m[f - 1][COL_F - 1] === '2026-10-02', 'solo la fecha cambia');
  // A001 tiene una fecha que Google guarda como fecha real
  await abrir(pg, 'A001'); await pg.click('#en-editar');
  chk(await pg.inputValue('#en-fecha') === '2026-10-20', 'fecha real de Google se precarga');
  await ctx.close();
}

/* 5. Conflicto: otra persona edita a la vez */
{
  console.log('5. Conflicto');
  const { pg, ctx, mundo } = await entrar();
  const f = fila(mundo, 'A005');
  await abrir(pg, 'A005'); await pg.click('#en-editar');
  await pg.fill('#en-notas', 'mi versión');
  mundo.hojas.Alumnos.m[f - 1][COL_N - 1] = 'versión de otra persona';   // cambia mientras edito
  mundo.hojas.Alumnos.m[f - 1][COL_F - 1] = '2026-10-10';
  const antes = mundo.foto();
  await pg.click('form button[type=submit]');
  await pg.waitForSelector('.conflicto:not([hidden])');
  chk(mundo.celdasCambiadas(antes, mundo.foto()).length === 0, 'el conflicto no escribe nada');
  const t = await pg.innerText('.conflicto');
  chk(/versión de otra persona/.test(t) && /10 de octubre de 2026/.test(t), 'enseña lo que hay ahora');
  chk(await pg.inputValue('#en-notas') === 'mi versión', 'mi texto sigue en el cuadro');
  chk(await pg.locator('form button[type=submit]').isEnabled(), 'se puede seguir editando');
  await pg.click('text=Guardar mi versión'); await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === 'mi versión', 'guardar el mío igualmente escribe lo mío');
  // y descartar
  const g = fila(mundo, 'A006');
  await abrir(pg, 'A006'); await pg.click('#en-editar'); await pg.fill('#en-notas', 'otra mía');
  mundo.hojas.Alumnos.m[g - 1][COL_N - 1] = 'de otra persona'; mundo.hojas.Alumnos.m[g - 1][COL_F - 1] = '2026-10-11';
  await pg.click('form button[type=submit]'); await pg.waitForSelector('.conflicto:not([hidden])');
  await pg.click('text=Quedarme con la del Sheet'); await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[g - 1][COL_N - 1] === 'de otra persona', 'descartar no escribe');
  chk(/de otra persona/.test(await pg.innerText('#v-alumno')), 'la ficha enseña lo del Sheet');
  await ctx.close();
}

/* 6. Borrar, cancelar y confirmaciones */
{
  console.log('6. Borrar y cancelar');
  const { pg, ctx, mundo, log } = await entrar();
  const f = fila(mundo, 'A007');
  mundo.hojas.Alumnos.m[f - 1][COL_N - 1] = 'algo que borrar'; mundo.hojas.Alumnos.m[f - 1][COL_F - 1] = '2026-08-01';
  await abrir(pg, 'A007'); await pg.click('#en-editar');
  await pg.fill('#en-notas', 'cambio sin guardar');
  let msg = '';
  pg.once('dialog', d => { msg = d.message(); d.dismiss(); });
  await pg.click('text=Cancelar');
  chk(/Salir sin guardar/.test(msg) && await pg.locator('#en-notas').isVisible(), 'cancelar con cambios pregunta y se puede seguir');
  pg.once('dialog', d => d.accept());
  await pg.click('text=Cancelar'); await pg.waitForSelector('#en-editar');
  chk(peticionesGuardar(log).length === 0 && mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === 'algo que borrar', 'cancelar no escribe');
  // borrar: nota vacía + confirmar
  await pg.click('#en-editar'); await pg.fill('#en-notas', '   ');
  pg.once('dialog', d => { msg = d.message(); d.dismiss(); });
  await pg.click('form button[type=submit]'); await pg.waitForTimeout(200);
  chk(/Se borrarán/.test(msg) && peticionesGuardar(log).length === 0, 'borrar pide confirmación y si dices no, no hace nada');
  pg.once('dialog', d => d.accept());
  await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === '' && mundo.hojas.Alumnos.m[f - 1][COL_F - 1] === '', 'borrar vacía las 2 celdas');
  chk(/Sin entrevista registrada/.test(await pg.innerText('#v-alumno')) && await pg.innerText('#en-editar') === 'Añadir entrevista', 'ficha vuelve a "sin entrevista"');
  await ctx.close();
}

/* 7. Fallos de red al guardar */
{
  console.log('7. Fallos al guardar');
  const { pg, ctx, mundo, ctrl } = await entrar();
  const f = fila(mundo, 'A008');
  await abrir(pg, 'A008'); await pg.click('#en-editar'); await pg.fill('#en-notas', 'no se debe perder');
  ctrl.abortar = true; const antes = mundo.foto();
  await pg.click('form button[type=submit]'); await pg.waitForSelector('.error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await pg.innerText('.error')) && /no se ha perdido/.test(await pg.innerText('.error')), 'mensaje de red: ' + await pg.innerText('.error'));
  chk(await pg.inputValue('#en-notas') === 'no se debe perder', 'el texto sigue en el cuadro');
  chk(mundo.celdasCambiadas(antes, mundo.foto()).length === 0 && await pg.locator('form button[type=submit]').isEnabled(), 'nada escrito y botón de nuevo activo');
  await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  chk(mundo.hojas.Alumnos.m[f - 1][COL_N - 1] === 'no se debe perder', 'al reintentar se guarda');
  // se guarda en el Sheet pero la respuesta se pierde: al reintentar no hay conflicto falso
  const g = fila(mundo, 'A009');
  await abrir(pg, 'A009'); await pg.click('#en-editar'); await pg.fill('#en-notas', 'guardada pero sin respuesta');
  ctrl.perderRespuesta = true;
  await pg.click('form button[type=submit]'); await pg.waitForSelector('.error:not([hidden])');
  chk(mundo.hojas.Alumnos.m[g - 1][COL_N - 1] === 'guardada pero sin respuesta', 'el Sheet sí se guardó');
  await pg.click('form button[type=submit]'); await pg.waitForSelector('#en-editar');
  chk(/Guardado en el Sheet/.test(await pg.innerText('#v-alumno')), 'reintento tras respuesta perdida = guardado, sin conflicto');
  await ctx.close();
}

/* 8. Clave cambiada al guardar, y doble pulsación */
{
  console.log('8. Clave mala al guardar y doble pulsación');
  const { pg, ctx, mundo, log } = await entrar();
  await abrir(pg, 'A010'); await pg.click('#en-editar'); await pg.fill('#en-notas', 'mi nota');
  mundo.props.set('CLAVE', 'otra clave completamente distinta 999');
  await pg.click('form button[type=submit]'); await pg.waitForSelector('.error:not([hidden])');
  chk(/Copia tu nota/.test(await pg.innerText('.error')), 'avisa y pide copiar la nota');
  chk(!(await almacen(pg))['gad.clave'], 'se borra la clave que ya no vale');
  chk(await pg.inputValue('#en-notas') === 'mi nota', 'el texto sigue ahí');
  await ctx.close();
  const t2 = await entrar();
  await abrir(t2.pg, 'A011'); await t2.pg.click('#en-editar'); await t2.pg.fill('#en-notas', 'doble');
  await t2.pg.evaluate(() => { const b = document.querySelector('form button[type=submit]'); b.click(); b.click(); document.querySelector('form').requestSubmit?.(); });
  await t2.pg.waitForSelector('#en-editar');
  chk(peticionesGuardar(t2.log).length === 1, 'doble pulsación = una sola petición (' + peticionesGuardar(t2.log).length + ')');
  await t2.ctx.close();
}

/* 9. Demo: sin edición */
{
  console.log('9. Modo demo');
  const t = await nuevo();
  await t.pg.addInitScript(() => localStorage.setItem('gad.modo', 'demo'));
  await abrir(t.pg, 'A002');
  chk(await t.pg.locator('#en-editar').count() === 0, 'en demo no hay botón de editar');
  chk(/Sin entrevista registrada/.test(await t.pg.innerText('#v-alumno')), 'se ve la entrevista en solo lectura');
  const intento = await t.pg.evaluate(async () => { try { const m = await import('./js/data/index.js'); await m.guardarEntrevista('A002', 'forzado', '2026-01-01'); return 'guardó'; } catch (e) { return e.codigo; } });
  chk(intento === 'solo-lectura', 'la capa de datos también se niega a guardar en demo: ' + intento);
  chk(t.log.peticiones.length === 0, 'sin tráfico al script');
  await t.ctx.close();
}

/* 10. Sin desbordes en móvil */
{
  const { pg, ctx } = await entrar();
  await abrir(pg, 'A002'); await pg.click('#en-editar');
  await pg.fill('#en-notas', 'Ejemplo de nota larga. '.repeat(10));
  chk(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll horizontal');
  const h = await pg.evaluate(() => document.querySelector('#en-fecha').getBoundingClientRect().height);
  chk(h >= 44, 'el campo de fecha mide al menos 44 px (' + h + ')');
  await ctx.close();
}

await terminar();
