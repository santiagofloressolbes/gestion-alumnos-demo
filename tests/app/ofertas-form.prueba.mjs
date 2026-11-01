// Pruebas del formulario de ofertas: alta, edición, validación, conflictos, fallos de red, salir con cambios y modo demo.
import { nuevo, chk, almacen, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const hoy = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mañana = () => hoy(new Date(Date.now() + 864e5));
const C = { id: 1, empresa: 2, tipoOrg: 3, area: 4, titulo: 5, tipo: 6, ubicacion: 7, nac: 8, permiso: 9, fecha: 10, estado: 11, enlace: 12 };   // columnas (1-based) de Ofertas
const fila = (mundo, id) => mundo.hojas.Ofertas.m.findIndex(f => f[0] === id) + 1;
const hojaOfertas = mundo => mundo.hojas.Ofertas.m;

async function entrar({ modo = 'script', ajustar, ...opts } = {}) {
  const t = await nuevo(opts);
  if (ajustar) ajustar(t.mundo);
  await t.pg.addInitScript(([m, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (m === 'demo') localStorage.setItem('gad.modo', 'demo');
    else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
    sessionStorage.setItem('ini', '1');
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  t.dialogos = [];
  t.responder = true;   // qué contesta el navegador a un confirm()
  t.pg.on('dialog', d => { t.dialogos.push(d.message()); d.type() === 'confirm' && t.responder ? d.accept() : d.dismiss(); });
  return t;
}
const nueva = async pg => { await pg.goto(BASE + '#/oferta/nueva'); await pg.waitForSelector('#of-f-empresa'); };
const editar = async (pg, id) => { await pg.goto(BASE + `#/oferta/${id}/editar`); await pg.waitForSelector('#of-f-empresa'); };
const guardarPeticiones = log => log.peticiones.map(p => JSON.parse(p.cuerpo)).filter(c => c.action === 'guardarOferta');
const VALIDA = { empresa: 'Club mock Z', titulo: 'Analista de ventas', tipoOrganizacion: 'Liga', area: 'Comercial y patrocinio', tipo: 'Prácticas', ubicacion: 'Bilbao', requisitoNacionalidad: '', requisitoPermiso: 'No requerido', estado: 'Abierta', enlace: 'https://empresa-real.test/o/1' };
async function rellenar(pg, v) {
  for (const [k, x] of Object.entries(v)) {
    const sel = '#of-f-' + k;
    if (await pg.evaluate(s => document.querySelector(s).tagName === 'SELECT', sel)) await pg.selectOption(sel, x); else await pg.fill(sel, x);
  }
}
const guardarBtn = pg => pg.click('#v-oferta-form button[type=submit]');
const error = pg => pg.innerText('#v-oferta-form .error');

/* 1. Alta */
{
  console.log('1. Alta');
  const { pg, ctx, mundo, log } = await entrar();
  await pg.goto(BASE + '#/ofertas'); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk(await pg.isVisible('a.nueva-oferta'), 'botón Nueva oferta en la lista');
  await pg.click('a.nueva-oferta'); await pg.waitForSelector('#of-f-empresa');
  chk(await pg.innerText('#titulo') === 'Nueva oferta', 'título');
  chk(await pg.inputValue('#of-f-fechaRecepcion') === hoy() && await pg.getAttribute('#of-f-fechaRecepcion', 'max') === hoy(), 'fecha por defecto = hoy y no futura');
  chk(await pg.inputValue('#of-f-estado') === 'Abierta', 'estado por defecto Abierta');
  chk(await pg.inputValue('#of-f-requisitoNacionalidad') === '' && /Sin requisito de nacionalidad/.test(await pg.innerText('#of-f-requisitoNacionalidad')), 'nacionalidad: vacío = sin requisito');
  chk(/Para cerrar una oferta/.test(await pg.innerText('#v-oferta-form')), 'explica cómo cerrar (no se borra)');
  const textos = await pg.$$eval('#v-oferta-form select', ss => ss.map(s => [s.id, [...s.options].map(o => o.textContent)]));
  chk(textos.find(s => s[0] === 'of-f-requisitoNacionalidad')[1].includes('Francia'), 'lista de nacionalidades');
  chk(textos.find(s => s[0] === 'of-f-requisitoPermiso')[1].join() === 'Elige…,Permiso de trabajo en vigor,No requerido', 'lista de permisos: ' + textos.find(s => s[0] === 'of-f-requisitoPermiso')[1]);
  chk(await pg.evaluate(() => [...document.querySelectorAll('#v-oferta-form input,#v-oferta-form select')].every(x => getComputedStyle(x).fontSize === '16px')), 'campos a 16 px (sin zoom iPhone)');
  chk(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desbordamiento horizontal');
  chk(await pg.$$eval('#v-oferta-form input,#v-oferta-form select,#v-oferta-form button', xs => Math.min(...xs.map(x => x.getBoundingClientRect().height)) >= 44), 'campos y botones >= 44 px');
  await rellenar(pg, VALIDA);
  chk(/^\d+ \/ 100 caracteres$/.test(await pg.innerText('#of-c-empresa')) && /\/ 500/.test(await pg.innerText('#of-c-enlace')), 'contadores');
  const antes = mundo.foto();
  await guardarBtn(pg);
  await pg.waitForSelector('#v-oferta .cabecera');
  const cambios = mundo.celdasCambiadas(antes, mundo.foto());
  const f = fila(mundo, 'O011');
  chk(f === 12 && cambios.length === 12 && cambios.every(c => c.startsWith(`Ofertas!${f},`)), '12 celdas, todas de la fila nueva (O011): ' + cambios.length);
  const m = hojaOfertas(mundo)[f - 1];
  chk(m[C.empresa - 1] === 'Club mock Z' && m[C.titulo - 1] === 'Analista de ventas' && m[C.fecha - 1] === hoy() && m[C.estado - 1] === 'Abierta' && m[C.nac - 1] === '', 'valores en el Sheet');
  const t = await pg.innerText('#v-oferta');
  chk(/Oferta creada en el Sheet/.test(t) && /Analista de ventas/.test(t) && /O011/.test(t), 'ficha nueva con aviso');
  chk(await pg.getAttribute('#v-oferta a.primary', 'href') === 'https://empresa-real.test/o/1', 'enlace https como botón');
  const c = guardarPeticiones(log);
  chk(c.length === 1 && !('id' in c[0]) && !('anteriores' in c[0]) && c[0].oferta.empresa === 'Club mock Z' && typeof c[0].key === 'string', 'petición de alta sin id ni anteriores');
  chk(!log.peticiones.some(p => p.url.includes(CLAVE_PRUEBA.slice(0, 8))), 'la clave no va en la dirección');
  await pg.click('#v-oferta .volver'); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  const ts = await pg.$$eval('#v-ofertas ul.alumnos li b', bs => bs.map(b => b.textContent));
  chk(ts.length === 11 && ts[0] === 'Analista de ventas', 'la lista tiene 11 y la nueva (de hoy) arriba');
  chk(!/Oferta creada/.test(await pg.innerText('#v-ofertas')), 'el aviso no se repite');
  const al = await almacen(pg);
  chk(Object.keys(al).sort().join() === 'gad.clave,gad.url' && !JSON.stringify(al).includes('Club mock Z'), 'lo escrito no se guarda en el móvil');
  await pg.reload(); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk((await pg.$$eval('#v-ofertas ul.alumnos li', l => l.length)) === 11, 'tras recargar la app sigue');
  // segunda alta: siguiente ID
  await nueva(pg); await rellenar(pg, { ...VALIDA, empresa: 'Segunda', requisitoNacionalidad: 'Francia', enlace: '' });
  await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(/O012/.test(await pg.innerText('#v-oferta')) && /Francia/.test(await pg.innerText('#v-oferta')), 'segunda oferta O012 con nacionalidad');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 2. Validación en el móvil: no se envía nada */
{
  console.log('2. Validación local');
  const { pg, ctx, log } = await entrar();
  await nueva(pg);
  const probar = async (cambios, esperado, campo, nombre) => {
    await rellenar(pg, { ...VALIDA, ...cambios });
    await guardarBtn(pg);
    await pg.waitForSelector('#v-oferta-form .error:not([hidden])');
    chk(esperado.test(await error(pg)), nombre + ': ' + await error(pg));
    chk(await pg.evaluate(id => document.activeElement.id === id, 'of-f-' + campo), nombre + ': el foco va al campo');
  };
  await probar({ empresa: '' }, /Falta «Empresa»/, 'empresa', 'sin empresa');
  await probar({ empresa: '   ' }, /Falta «Empresa»/, 'empresa', 'empresa solo espacios');
  await probar({ titulo: '' }, /Falta «Título del puesto»/, 'titulo', 'sin título');
  await probar({ tipoOrganizacion: '' }, /Elige «Tipo de organización»/, 'tipoOrganizacion', 'sin tipo de organización');
  await probar({ area: '' }, /Elige «Área»/, 'area', 'sin área');
  await probar({ tipo: '' }, /Elige «Tipo»/, 'tipo', 'sin tipo');
  await probar({ ubicacion: '' }, /Falta «Ubicación»/, 'ubicacion', 'sin ubicación');
  await probar({ requisitoPermiso: '' }, /Elige «Permiso de trabajo»/, 'requisitoPermiso', 'sin permiso');
  await probar({ estado: '' }, /Elige «Estado»/, 'estado', 'sin estado');
  await probar({ empresa: 'x'.repeat(101) }, /«Empresa» supera los 100/, 'empresa', 'empresa 101');
  chk(/exceso/.test(await pg.getAttribute('#of-c-empresa', 'class')), 'contador en rojo');
  await probar({ titulo: 'x'.repeat(121) }, /«Título del puesto» supera los 120/, 'titulo', 'título 121');
  await probar({ ubicacion: 'x'.repeat(101) }, /«Ubicación» supera los 100/, 'ubicacion', 'ubicación 101');
  await probar({ enlace: 'x'.repeat(501) }, /«Enlace o descripción» supera los 500/, 'enlace', 'enlace 501');
  await probar({ empresa: 'Hola <b>negrita</b>' }, /«Empresa» parece llevar código HTML/, 'empresa', 'HTML');
  await probar({ enlace: 'http://inseguro.test' }, /no puede empezar por http:/, 'enlace', 'http:');
  await probar({ enlace: 'JavaScript:alert(1)' }, /no puede empezar por http:, javascript:/, 'enlace', 'javascript:');
  await probar({ enlace: 'data:text/html,hola' }, /no puede empezar por/, 'enlace', 'data:');
  await probar({ fechaRecepcion: mañana() }, /«Fecha de recepción» no puede ser futura/, 'fechaRecepcion', 'fecha futura');
  await probar({ fechaRecepcion: '' }, /Elige «Fecha de recepción»/, 'fechaRecepcion', 'sin fecha');
  chk(guardarPeticiones(log).length === 0, 'cero peticiones de guardado');
  // límites exactos: 100, 120, 100 y 500 sí valen; "<" suelto y fórmulas también
  await rellenar(pg, { ...VALIDA, fechaRecepcion: hoy(), empresa: 'e'.repeat(100), titulo: 't'.repeat(120), ubicacion: 'u'.repeat(100), enlace: 'Escribir a rrhh. ' + 'z'.repeat(483) });
  await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(guardarPeticiones(log).length === 1, 'los límites exactos se admiten');
  await ctx.close();
}

/* 3. Texto peligroso: fórmulas y "<" suelto */
{
  console.log('3. Fórmulas y símbolos');
  const { pg, ctx, mundo } = await entrar();
  await nueva(pg);
  await rellenar(pg, { ...VALIDA, empresa: '=HYPERLINK("http://malo.test","clic")', titulo: 'Edad < 30 y nota 5 > 4', ubicacion: '+34 Madrid', enlace: '@usuario' });
  await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  const m = hojaOfertas(mundo)[fila(mundo, 'O011') - 1];
  chk(m[C.empresa - 1] === ' =HYPERLINK("http://malo.test","clic")' && m[C.ubicacion - 1] === ' +34 Madrid' && m[C.enlace - 1] === ' @usuario', 'fórmulas guardadas con un espacio delante');
  const t = await pg.innerText('#v-oferta');
  chk(/=HYPERLINK/.test(t) && /Edad < 30 y nota 5 > 4/.test(t), 'se muestran como texto normal');
  await ctx.close();
}

/* 4. Editar */
{
  console.log('4. Editar');
  const { pg, ctx, mundo, log } = await entrar();
  await pg.goto(BASE + '#/oferta/O002'); await pg.waitForSelector('#of-editar');
  await pg.click('#of-editar'); await pg.waitForSelector('#of-f-empresa');
  chk(await pg.innerText('#titulo') === 'Editar oferta', 'título');
  chk(await pg.inputValue('#of-f-empresa') === 'Club mock B' && await pg.inputValue('#of-f-titulo') === 'Becario/a de patrocinio' && await pg.inputValue('#of-f-estado') === 'Abierta' && await pg.inputValue('#of-f-fechaRecepcion') === '2026-10-08', 'campos rellenos con la oferta');
  // sin cambios: no se envía nada
  await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(guardarPeticiones(log).length === 0 && !/Guardado/.test(await pg.innerText('#v-oferta')), 'sin cambios: no hay petición');
  // cerrar la oferta
  await pg.click('#of-editar'); await pg.waitForSelector('#of-f-empresa');
  await pg.selectOption('#of-f-estado', 'Cerrada');
  const antes = mundo.foto();
  await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  const cambios = mundo.celdasCambiadas(antes, mundo.foto());
  chk(cambios.join() === `Ofertas!${fila(mundo, 'O002')},${C.estado}`, 'solo cambia la celda del estado: ' + cambios);
  const t = await pg.innerText('#v-oferta');
  chk(/Guardado en el Sheet/.test(t) && /Cerrada/.test(t), 'la ficha enseña Cerrada con el aviso');
  const c = guardarPeticiones(log)[0];
  chk(c.id === 'O002' && Object.keys(c.anteriores).length === 11 && c.anteriores.estado === 'Abierta' && c.oferta.estado === 'Cerrada', 'petición con id, anteriores y nuevo');
  await pg.click('#v-oferta .volver'); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  await pg.click('#v-ofertas .opcion:has-text("Cerrada")');
  chk((await pg.$$eval('#v-ofertas ul.alumnos li', l => l.length)) === 3, 'ahora hay 3 cerradas en la lista');
  // editar de nuevo: ya no hay conflicto con lo guardado antes (la memoria se actualizó)
  await pg.click('#v-ofertas a:has-text("Becario/a de patrocinio")'); await pg.click('#of-editar'); await pg.waitForSelector('#of-f-empresa');
  await pg.fill('#of-f-ubicacion', 'Girona'); await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(/Girona/.test(await pg.innerText('#v-oferta')), 'segunda edición seguida sin conflicto');
  // oferta inexistente
  await pg.goto(BASE + '#/oferta/O999/editar'); await pg.waitForSelector('#v-oferta-form .card');
  chk(/Oferta no encontrada/.test(await pg.innerText('#v-oferta-form')), 'editar una oferta que no existe');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 5. Conflictos */
{
  console.log('5. Conflicto');
  // a) otra persona cambia un campo que yo no toco: se conserva
  let t = await entrar();
  await editar(t.pg, 'O003');
  hojaOfertas(t.mundo)[fila(t.mundo, 'O003') - 1][C.titulo - 1] = 'Product manager senior';   // cambio ajeno en el Sheet
  await t.pg.fill('#of-f-ubicacion', 'Zaragoza');
  await guardarBtn(t.pg);
  await t.pg.waitForSelector('.conflicto:not([hidden])');
  const panel = await t.pg.innerText('.conflicto');
  chk(/Alguien cambió esta oferta/.test(panel) && /Título del puesto/.test(panel) && /Product manager senior/.test(panel) && !/Ubicación/.test(panel), 'el panel enseña solo lo que cambió la otra persona');
  chk(await t.pg.inputValue('#of-f-ubicacion') === 'Zaragoza', 'lo que escribí sigue en el formulario');
  chk(guardarPeticiones(t.log).length === 1 && mundo_ubic(t.mundo, 'O003') === 'Madrid', 'no se ha escrito nada todavía');
  await t.pg.click('text=Guardar el mío igualmente');
  await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(mundo_ubic(t.mundo, 'O003') === 'Zaragoza' && hojaOfertas(t.mundo)[fila(t.mundo, 'O003') - 1][C.titulo - 1] === 'Product manager senior', 'se guarda lo mío y se conserva el título ajeno');
  chk(/Product manager senior/.test(await t.pg.innerText('#v-oferta')) && /Zaragoza/.test(await t.pg.innerText('#v-oferta')), 'la ficha enseña ambos');
  await t.ctx.close();
  // b) descartar lo mío
  t = await entrar();
  await editar(t.pg, 'O004');
  hojaOfertas(t.mundo)[fila(t.mundo, 'O004') - 1][C.estado - 1] = 'Cerrada';
  await t.pg.fill('#of-f-ubicacion', 'Otra ciudad');
  await guardarBtn(t.pg); await t.pg.waitForSelector('.conflicto:not([hidden])');
  await t.pg.click('text=Descartar el mío'); await t.pg.waitForSelector('#v-oferta .cabecera');
  const f = await t.pg.innerText('#v-oferta');
  chk(/Cerrada/.test(f) && !/Otra ciudad/.test(f) && /Se ha cargado lo que había/.test(f) && mundo_ubic(t.mundo, 'O004') === 'Madrid', 'descartar: se ve lo del Sheet y no se escribe nada');
  await t.ctx.close();
  // c) los dos cambiamos el mismo campo: gana el mío si lo pido
  t = await entrar();
  await editar(t.pg, 'O005');
  hojaOfertas(t.mundo)[fila(t.mundo, 'O005') - 1][C.estado - 1] = 'Cerrada';
  await t.pg.selectOption('#of-f-estado', 'Cerrada'); await t.pg.fill('#of-f-ubicacion', 'Vigo');   // yo también cierro y cambio la ciudad
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta .cabecera, .conflicto:not([hidden])');
  // el estado ya coincide pero la ubicación no: hay conflicto (el Sheet cambió desde que abrí)
  chk(await t.pg.isVisible('.conflicto'), 'cambio ajeno aunque coincida con el mío: se avisa igualmente');
  await t.pg.click('text=Guardar el mío igualmente'); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(mundo_ubic(t.mundo, 'O005') === 'Vigo' && /Cerrada/.test(await t.pg.innerText('#v-oferta')), 'queda mi ubicación y el estado cerrado');
  await t.ctx.close();
  // d) la oferta desaparece o se repite en el Sheet
  t = await entrar();
  await editar(t.pg, 'O006');
  hojaOfertas(t.mundo).splice(fila(t.mundo, 'O006') - 1, 1);
  await t.pg.fill('#of-f-ubicacion', 'X'); await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/ya no está en el Sheet/.test(await error(t.pg)), 'oferta borrada en el Sheet: aviso');
  await t.ctx.close();
}
function mundo_ubic(mundo, id) { return hojaOfertas(mundo)[fila(mundo, id) - 1][C.ubicacion - 1]; }

/* 6. Fallos al guardar */
{
  console.log('6. Fallos al guardar');
  // a) la petición no llega: se puede reintentar y se guarda una sola vez
  let t = await entrar();
  await nueva(t.pg); await rellenar(t.pg, VALIDA);
  t.ctrl.abortar = true;
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/No hay conexión con Google/.test(await error(t.pg)) && /no se ha perdido/.test(await error(t.pg)), 'sin conexión: mensaje y nada perdido');
  chk(await t.pg.inputValue('#of-f-empresa') === 'Club mock Z' && !(await t.pg.isDisabled('#of-f-empresa')), 'el formulario sigue editable con lo escrito');
  chk(hojaOfertas(t.mundo).length === 11, 'no se ha creado nada');
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(hojaOfertas(t.mundo).length === 12, 'al reintentar se crea una sola');
  await t.ctx.close();
  // b) se guarda pero se pierde la respuesta: al reintentar NO se duplica
  t = await entrar();
  await nueva(t.pg); await rellenar(t.pg, VALIDA);
  t.ctrl.perderRespuesta = true;
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(hojaOfertas(t.mundo).length === 12, 'la oferta sí llegó al Sheet');
  chk(/Es posible que la oferta sí se haya guardado/.test(await error(t.pg)), 'avisa de que puede estar guardada');
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(hojaOfertas(t.mundo).length === 12, 'tras reintentar sigue habiendo una sola (no se duplica)');
  chk(/Oferta creada en el Sheet/.test(await t.pg.innerText('#v-oferta')) && /O011/.test(await t.pg.innerText('#v-oferta')), 'se reconoce la oferta ya guardada (O011)');
  chk(guardarPeticiones(t.log).length === 1, 'solo se envió un alta');
  await t.ctx.close();
  // c) al editar, se pierde la respuesta: al reintentar se reconoce como ya guardado
  t = await entrar();
  await editar(t.pg, 'O007'); await t.pg.fill('#of-f-ubicacion', 'Lugo');
  t.ctrl.perderRespuesta = true;
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(!/Es posible que la oferta sí se haya guardado/.test(await error(t.pg)) && /no se ha perdido/.test(await error(t.pg)), 'edición: mensaje de conexión');
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(/Guardado en el Sheet/.test(await t.pg.innerText('#v-oferta')) && mundo_ubic(t.mundo, 'O007') === 'Lugo', 'edición reintentada: se reconoce como guardada');
  await t.ctx.close();
  // d) la clave ya no vale
  t = await entrar();
  await nueva(t.pg); await rellenar(t.pg, VALIDA);
  t.mundo.props.set('CLAVE', 'otra frase larga distinta de la anterior 99');
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/La clave ya no es correcta/.test(await error(t.pg)) && await t.pg.inputValue('#of-f-empresa') === 'Club mock Z', 'clave cambiada: aviso y texto conservado');
  chk(!(await almacen(t.pg))['gad.clave'], 'la clave que ya no vale se borra del móvil');
  await t.ctx.close();
  // e) doble pulsación = una sola petición
  t = await entrar();
  await nueva(t.pg); await rellenar(t.pg, VALIDA);
  await t.pg.dblclick('#v-oferta-form button[type=submit]');
  await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(guardarPeticiones(t.log).length === 1 && hojaOfertas(t.mundo).length === 12, 'doble pulsación: una sola oferta');
  await t.ctx.close();
  // f) el script rechaza un campo (simulado): se enseña con su nombre y el foco va allí
  t = await entrar();
  await nueva(t.pg); await rellenar(t.pg, VALIDA);
  t.ctrl.alResponder = (j, accion) => (accion === 'guardarOferta' ? { ok: false, error: 'lista', campo: 'area' } : j);
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/«Área»: elige un valor de la lista/.test(await error(t.pg)) && await t.pg.evaluate(() => document.activeElement.id) === 'of-f-area', 'error del script por campo');
  // g) respuesta rara del script
  t.ctrl.alResponder = (j, accion) => (accion === 'guardarOferta' ? { ok: true } : j);
  await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/no responde como el script/.test(await error(t.pg)), 'respuesta sin id: error claro');
  await t.ctx.close();
}

/* 7. Salir con cambios sin guardar */
{
  console.log('7. Salir con cambios');
  const t = await entrar();
  const { pg } = t;
  await nueva(pg);
  // sin cambios: sale sin preguntar
  await pg.click('#tabs a[data-tab=buscar]'); await pg.waitForSelector('#v-buscar .buscador');
  chk(t.dialogos.length === 0, 'sin cambios: no pregunta');
  await nueva(pg);
  await pg.fill('#of-f-empresa', 'Algo escrito');
  t.responder = false;
  await pg.click('#tabs a[data-tab=buscar]');
  await pg.waitForTimeout(300);
  chk(t.dialogos.length === 1 && /cambios sin guardar/.test(t.dialogos[0]), 'con cambios: pregunta');
  chk(await pg.innerText('#titulo') === 'Nueva oferta' && await pg.inputValue('#of-f-empresa') === 'Algo escrito', 'si dices que no, te quedas con lo escrito');
  chk(pg.url().endsWith('#/oferta/nueva'), 'la dirección se restaura: ' + pg.url());
  t.responder = true;
  await pg.click('#tabs a[data-tab=buscar]'); await pg.waitForSelector('#v-buscar .buscador');
  chk(t.dialogos.length === 2 && await pg.innerText('#titulo') === 'Buscar', 'si aceptas, sales');
  // Cancelar con cambios
  await nueva(pg); await pg.fill('#of-f-empresa', 'Otra'); t.dialogos.length = 0; t.responder = false;
  await pg.click('#v-oferta-form button:has-text("Cancelar")');
  chk(t.dialogos.length === 1 && /Descartar/.test(t.dialogos[0]) && await pg.innerText('#titulo') === 'Nueva oferta', 'Cancelar pregunta y no sale si dices que no');
  t.responder = true;
  await pg.click('#v-oferta-form button:has-text("Cancelar")'); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk(t.dialogos.length === 2 && await pg.innerText('#titulo') === 'Ofertas', 'Cancelar con sí: vuelve a la lista (y sin segunda pregunta)');
  // tras guardar no pregunta
  await nueva(pg); await rellenar(pg, VALIDA); t.dialogos.length = 0;
  await guardarBtn(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(t.dialogos.length === 0, 'al guardar no pregunta');
  await pg.click('#tabs a[data-tab=buscar]'); await pg.waitForSelector('#v-buscar .buscador');
  chk(t.dialogos.length === 0, 'y después tampoco');
  await t.ctx.close();
}

/* 8. Valores de la hoja que no están en Listas */
{
  console.log('8. Valores fuera de Listas');
  const t = await entrar({ ajustar: mundo => { hojaOfertas(mundo)[1][C.estado - 1] = 'En pausa'; } });
  await editar(t.pg, 'O001');
  chk(/En pausa \(ya no está en las listas\)/.test(await t.pg.innerText('#of-f-estado')) && await t.pg.inputValue('#of-f-estado') === 'En pausa', 'el valor actual se enseña marcado');
  await t.pg.fill('#of-f-ubicacion', 'Cádiz'); await guardarBtn(t.pg);
  await t.pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/«Estado»: elige un valor de la lista/.test(await error(t.pg)) && guardarPeticiones(t.log).length === 0, 'no se envía hasta elegir un estado válido');
  await t.pg.selectOption('#of-f-estado', 'Abierta'); await guardarBtn(t.pg); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(/Abierta/.test(await t.pg.innerText('#v-oferta')), 'tras elegir uno válido se guarda');
  await t.ctx.close();
}

/* 9. Sin permiso de escritura: demo y script antiguo */
{
  console.log('9. Demo y script antiguo');
  let t = await entrar({ modo: 'demo' });
  await t.pg.goto(BASE + '#/ofertas'); await t.pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk(await t.pg.locator('a.nueva-oferta').count() === 0, 'demo: sin botón Nueva oferta');
  await t.pg.goto(BASE + '#/oferta/O001'); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(await t.pg.locator('#of-editar').count() === 0, 'demo: sin botón Editar oferta');
  await t.pg.goto(BASE + '#/oferta/nueva'); await t.pg.waitForSelector('#v-oferta-form .card');
  chk(/No se puede guardar/.test(await t.pg.innerText('#v-oferta-form')) && /demo/.test(await t.pg.innerText('#v-oferta-form')) && await t.pg.locator('#of-f-empresa').count() === 0, 'demo: la dirección directa no abre el formulario');
  await t.pg.goto(BASE + '#/oferta/O001/editar'); await t.pg.waitForSelector('#v-oferta-form .card');
  chk(await t.pg.locator('#of-f-empresa').count() === 0, 'demo: tampoco el de editar');
  chk(t.log.peticiones.length === 0, 'demo: ninguna petición a Google');
  await t.ctx.close();
  t = await entrar();
  t.ctrl.alResponder = (j, accion) => { if (accion === 'data') delete j.soporta; return j; };   // un script anterior no anuncia "soporta"
  await t.pg.goto(BASE + '#/ofertas'); await t.pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk(await t.pg.locator('a.nueva-oferta').count() === 0 && /versión anterior/.test(await t.pg.innerText('#v-ofertas')), 'script antiguo: sin botón y con explicación');
  await t.pg.goto(BASE + '#/oferta/O001'); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(await t.pg.locator('#of-editar').count() === 0, 'script antiguo: sin Editar');
  await t.pg.goto(BASE + '#/oferta/nueva'); await t.pg.waitForSelector('#v-oferta-form .card');
  chk(/versión anterior/.test(await t.pg.innerText('#v-oferta-form')) && await t.pg.locator('#of-f-empresa').count() === 0, 'script antiguo: el formulario explica por qué no');
  chk(!/\bnull\b|undefined|\bfalse\b/.test(await t.pg.innerText('#v-oferta-form')), 'sin "null", "undefined" ni "false" visibles');
  await t.ctx.close();
}

await terminar();
