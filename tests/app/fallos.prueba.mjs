// Pruebas de los fallos al hablar con el script: primer intento fallido (reintento automático), script "ocupado",
// doble pulsación, botones que muestran "Guardando…" / "Cargando…" y confirmación visible sin hacer scroll.
// Afecta a TODOS los formularios que guardan: ronda, aplicación, estado, entrevista y oferta.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async () => {
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const filas = (m, hoja) => { const t = m.hojas[hoja].m; return t.slice(1).filter(f => f.some(x => x !== '' && x != null)).map(f => Object.fromEntries(t[0].map((c, i) => [c, f[i]]))); };
const fila = (m, hoja, id) => filas(m, hoja).find(f => Object.values(f)[0] === id);
const cuantas = (log, accion) => log.peticiones.filter(p => JSON.parse(p.cuerpo || '{}').action === accion).length;
const aterriza = async (pg, hash, sel) => { await pg.waitForFunction(h => location.hash === h, hash); await pg.waitForSelector(sel); };
const error = (pg, vista) => pg.innerText(`#${vista} .error`);
const hayError = (pg, vista) => pg.waitForSelector(`#${vista} .error:not([hidden])`);
const enviar = (pg, vista) => pg.click(`#${vista} form button[type=submit]`);
// Dos pulsaciones seguidas en el mismo instante (como un dedo nervioso).
const doble = async (pg, sel) => { await pg.locator(sel).scrollIntoViewIfNeeded(); await pg.evaluate(s => { const b = document.querySelector(s); b.click(); b.click(); }, sel); };
// ¿Se ve el elemento dentro de la pantalla (sin hacer scroll)?
const enPantalla = (pg, sel) => pg.evaluate(s => {
  const e = document.querySelector(s); if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
}, sel);
const GUARDA = ['registrarRonda', 'crearAplicacion', 'cambiarEstado', 'guardarEntrevista', 'guardarOferta'];
const escrituras = log => GUARDA.reduce((n, a) => n + cuantas(log, a), 0);

// Cada formulario con lo que hace falta para guardar algo válido y cómo comprobar que se guardó.
const FORMS = {
  ronda: {
    vista: 'v-ronda-form', accion: 'registrarRonda',
    abrir: pg => ir(pg, '#/oferta/O004/ronda/nueva', '#ro-fecha'),
    rellenar: async () => {}, filas: m => filas(m, 'Rondas').length,
    final: pg => aterriza(pg, '#/oferta/O004', '#v-oferta .ronda'),
  },
  aplicacion: {
    vista: 'v-aplicacion-form', accion: 'crearAplicacion',
    abrir: pg => ir(pg, '#/oferta/O002/ronda/2/aplicar', '#ap-q'),
    rellenar: pg => pg.click('#ap-lista li:first-child label'), filas: m => filas(m, 'Aplicaciones').length,
    final: pg => pg.waitForSelector('#ap-ok:not([hidden])'),
  },
  estado: {
    vista: 'v-estado-form', accion: 'cambiarEstado',
    abrir: pg => ir(pg, '#/aplicacion/AP009/estado', '#es-estado'),
    rellenar: pg => pg.selectOption('#es-estado', 'Enviada a la empresa'), filas: m => filas(m, 'Historial').length,
    final: pg => aterriza(pg, '#/aplicacion/AP009', '#v-aplicacion .cabecera'),
  },
};

/* 1. El primer intento falla: la app lo repite sola y el resultado es el mismo que si hubiera ido bien */
{
  console.log('1. Primer intento fallido: reintento automático');
  for (const [nombre, F] of Object.entries(FORMS)) {
    const { pg, ctx, log, mundo, ctrl } = await entrar();
    await F.abrir(pg); await F.rellenar(pg);
    const n0 = F.filas(mundo);
    ctrl.abortar = 1;   // solo falla el primer intento
    await enviar(pg, F.vista); await F.final(pg);
    chk(F.filas(mundo) === n0 + 1, `${nombre}: se guardó una sola vez`);
    chk(cuantas(log, F.accion) === 2, `${nombre}: la app lo intentó dos veces (la primera cortada) sin que la persona lo notara`);
    await ctx.close();
  }
  // entrevista y edición de oferta
  let t = await entrar();
  await ir(t.pg, '#/alumno/A002', '#en-editar'); await t.pg.click('#en-editar'); await t.pg.fill('#en-notas', 'Nota de prueba');
  t.ctrl.abortar = 1; await t.pg.click('form button[type=submit]');
  await t.pg.waitForFunction(() => /Guardado en el Sheet/.test(document.querySelector('#v-alumno').innerText));
  chk(fila(t.mundo, 'Alumnos', 'A002')['Notas de entrevista'] === 'Nota de prueba' && cuantas(t.log, 'guardarEntrevista') === 2, 'entrevista: se guardó y se reintentó sola');
  await t.ctx.close();
  t = await entrar();
  await ir(t.pg, '#/oferta/O007/editar', '#of-f-empresa'); await t.pg.fill('#of-f-ubicacion', 'Lugo');
  t.ctrl.abortar = 1; await enviar(t.pg, 'v-oferta-form'); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(fila(t.mundo, 'Ofertas', 'O007')['Ubicación'] === 'Lugo' && cuantas(t.log, 'guardarOferta') === 2, 'edición de oferta: se guardó y se reintentó sola');
  await t.ctx.close();
  // un ALTA de oferta no se repite sola (podría duplicarse): el primer fallo se enseña y se comprueba al pulsar otra vez
  t = await entrar();
  await ir(t.pg, '#/oferta/nueva', '#of-f-empresa');
  for (const [k, x] of Object.entries({ empresa: 'Club mock Z', titulo: 'Analista', ubicacion: 'Bilbao', enlace: 'https://empresa-real.test/o/1' })) await t.pg.fill('#of-f-' + k, x);
  await t.pg.selectOption('#of-f-tipoOrganizacion', 'Liga'); await t.pg.selectOption('#of-f-area', 'Comercial y patrocinio'); await t.pg.selectOption('#of-f-tipo', 'Prácticas');
  await t.pg.selectOption('#of-f-requisitoPermiso', 'No requerido'); await t.pg.selectOption('#of-f-estado', 'Abierta');
  const nO = filas(t.mundo, 'Ofertas').length;
  t.ctrl.perderRespuesta = 1;   // se guarda pero la respuesta se pierde
  await enviar(t.pg, 'v-oferta-form'); await hayError(t.pg, 'v-oferta-form');
  chk(cuantas(t.log, 'guardarOferta') === 1 && filas(t.mundo, 'Ofertas').length === nO + 1, 'alta de oferta: una sola petición (no se reintenta sola) y la oferta sí llegó');
  await enviar(t.pg, 'v-oferta-form'); await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(filas(t.mundo, 'Ofertas').length === nO + 1, 'alta de oferta: al pulsar otra vez se reconoce y no se duplica');
  await t.ctx.close();
}

/* 2. Fallan los dos intentos: el mensaje dice lo que pasó y lo escrito se conserva */
{
  console.log('2. Fallan los dos intentos');
  for (const [nombre, F] of Object.entries(FORMS)) {
    const { pg, ctx, log, mundo, ctrl } = await entrar();
    await F.abrir(pg); await F.rellenar(pg);
    const n0 = F.filas(mundo);
    ctrl.abortar = 2;
    await enviar(pg, F.vista); await hayError(pg, F.vista);
    const t = await error(pg, F.vista);
    chk(/No se ha podido conectar con Google/.test(t) && /dos veces/.test(t) && !/tu conexión|Comprueba/i.test(t), `${nombre}: el mensaje dice lo que pasó (dos intentos) sin culpar a la conexión: ${t.replace(/\n/g, ' ')}`);
    chk(F.filas(mundo) === n0 && cuantas(log, F.accion) === 2, `${nombre}: no se escribió nada y fueron exactamente dos intentos`);
    chk(!(await pg.isDisabled(`#${F.vista} form button[type=submit]`)) && /^Guardar$/.test(await pg.innerText(`#${F.vista} form button[type=submit]`)), `${nombre}: el botón vuelve a "Guardar"`);
    await enviar(pg, F.vista); await F.final(pg);
    chk(F.filas(mundo) === n0 + 1, `${nombre}: al pulsar otra vez se guarda una sola vez`);
    await ctx.close();
  }
}

/* 3. Se guardó pero se perdió la respuesta, y el reintento automático lo reconoce */
{
  console.log('3. Respuesta perdida + reintento automático');
  for (const [nombre, F] of Object.entries(FORMS)) {
    const { pg, ctx, mundo, ctrl } = await entrar();
    await F.abrir(pg); await F.rellenar(pg);
    const n0 = F.filas(mundo);
    ctrl.perderRespuesta = 1;
    await enviar(pg, F.vista); await F.final(pg);
    chk(F.filas(mundo) === n0 + 1, `${nombre}: el reintento reconoce lo ya guardado y no duplica`);
    await ctx.close();
  }
}

/* 4. El script está ocupado: se reintenta con espera, y si sigue ocupado se dice con claridad */
{
  console.log('4. Script ocupado');
  for (const [nombre, F] of Object.entries(FORMS)) {
    let { pg, ctx, log, mundo, ctrl } = await entrar();
    await F.abrir(pg); await F.rellenar(pg);
    const n0 = F.filas(mundo);
    ctrl.ocupado = 1;
    const t0 = Date.now();
    await enviar(pg, F.vista); await F.final(pg);
    chk(F.filas(mundo) === n0 + 1 && cuantas(log, F.accion) === 2, `${nombre}: ocupado una vez → espera y reintenta; se guarda una sola vez`);
    chk(Date.now() - t0 >= 1400, `${nombre}: esperó un poco antes de reintentar`);
    await ctx.close();
    ({ pg, ctx, log, mundo, ctrl } = await entrar());
    await F.abrir(pg); await F.rellenar(pg);
    ctrl.ocupado = 9;
    await enviar(pg, F.vista); await hayError(pg, F.vista);
    const m = await error(pg, F.vista);
    chk(/Google está ocupado/.test(m) && /3 veces/.test(m), `${nombre}: sigue ocupado → lo dice y cuenta los intentos: ${m}`);
    chk(F.filas(mundo) === n0 && cuantas(log, F.accion) === 3 && !(await pg.isDisabled(`#${F.vista} form button[type=submit]`)), `${nombre}: 3 intentos, nada escrito, botón libre`);
    await ctx.close();
  }
}

/* 5. Doble pulsación: una sola petición, con "Guardando…" a la vista */
{
  console.log('5. Doble pulsación y "Guardando…"');
  for (const [nombre, F] of Object.entries(FORMS)) {
    const { pg, ctx, log, mundo, ctrl } = await entrar();
    await F.abrir(pg); await F.rellenar(pg);
    const n0 = F.filas(mundo);
    ctrl.lento = 700;
    const boton = `#${F.vista} form button[type=submit]`;
    await doble(pg, boton);
    await pg.waitForTimeout(150);
    chk(await pg.isDisabled(boton) && /Guardando…/.test(await pg.innerText(boton)) && await enPantalla(pg, boton), `${nombre}: el botón está desactivado, dice "Guardando…" y se ve sin hacer scroll`);
    await F.final(pg);
    chk(cuantas(log, F.accion) === 1 && F.filas(mundo) === n0 + 1, `${nombre}: dos pulsaciones = una sola petición y una sola fila`);
    await ctx.close();
  }
  // entrevista
  let t = await entrar();
  await ir(t.pg, '#/alumno/A002', '#en-editar'); await t.pg.click('#en-editar'); await t.pg.fill('#en-notas', 'Nota doble');
  t.ctrl.lento = 700; await doble(t.pg, '#v-alumno form button[type=submit]'); await t.pg.waitForTimeout(150);
  chk(await t.pg.isDisabled('#v-alumno form button[type=submit]') && /Guardando…/.test(await t.pg.innerText('#v-alumno form button[type=submit]')), 'entrevista: "Guardando…" y desactivado');
  await t.pg.waitForFunction(() => /Guardado en el Sheet/.test(document.querySelector('#v-alumno').innerText));
  chk(cuantas(t.log, 'guardarEntrevista') === 1, 'entrevista: una sola petición');
  await t.ctx.close();
  // oferta
  t = await entrar();
  await ir(t.pg, '#/oferta/O007/editar', '#of-f-empresa'); await t.pg.fill('#of-f-ubicacion', 'Vigo');
  t.ctrl.lento = 700; await doble(t.pg, '#v-oferta-form form button[type=submit]'); await t.pg.waitForTimeout(150);
  chk(await t.pg.isDisabled('#v-oferta-form form button[type=submit]') && /Guardando…/.test(await t.pg.innerText('#v-oferta-form form button[type=submit]')), 'oferta: "Guardando…" y desactivado');
  await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(cuantas(t.log, 'guardarOferta') === 1, 'oferta: una sola petición');
  await t.ctx.close();
}

/* 6. Botones del aviso de conflicto: también se desactivan y dicen qué hacen */
{
  console.log('6. Conflictos: botones ocupados');
  const GUARDAR = 'button:has-text("Guardar mi versión")', DESCARTAR = 'button:has-text("Quedarme con la del Sheet")';
  const conflictoEstado = async id => {
    const t = await entrar();
    await ir(t.pg, `#/aplicacion/${id}/estado`, '#es-estado');
    await t.pg.selectOption('#es-estado', 'Contratado');
    t.mundo.llamar({ key: t.mundo.clave, action: 'cambiarEstado', id, estado: 'Descartado', motivo: 'Otro', fecha: '2026-10-30', nota: 'otra persona', anterior: { estado: 'Entrevista', motivo: '' } });
    await enviar(t.pg, 'v-estado-form'); await t.pg.waitForSelector('#v-estado-form .conflicto:not([hidden])');
    return t;
  };
  // estado: "Quedarme con la del Sheet" con 5 pulsaciones seguidas
  let t = await conflictoEstado('AP001');
  const d0 = cuantas(t.log, 'data');
  t.ctrl.lento = 0;
  await t.pg.evaluate(() => { const b = [...document.querySelectorAll('#v-estado-form .conflicto button')].find(x => /Quedarme con la del Sheet/.test(x.textContent)); for (let i = 0; i < 5; i++) b.click(); });
  await aterriza(t.pg, '#/aplicacion/AP001', '#v-aplicacion .cabecera');
  chk(cuantas(t.log, 'data') === d0 + 1, 'estado: 5 pulsaciones en "Quedarme con la del Sheet" = una sola carga de datos');
  chk(/Listo: ahora ves lo que hay en el Sheet/.test(await t.pg.innerText('#v-aplicacion .aviso-ok')), 'estado: Quedarme con la del Sheet termina bien');
  await t.ctx.close();
  // mientras trabaja: texto visible y el otro botón desactivado (se frena la carga de datos para poder verlo)
  t = await conflictoEstado('AP001');
  await t.pg.route('https://script.google.com/**', async r => { await new Promise(x => setTimeout(x, 900)); r.fallback(); });
  await t.pg.click('#v-estado-form .conflicto ' + DESCARTAR);
  await t.pg.waitForTimeout(150);
  const bt = await t.pg.$$eval('#v-estado-form .conflicto button', b => b.map(x => ({ t: x.textContent, d: x.disabled })));
  chk(bt.length === 2 && bt.every(x => x.d) && bt.some(x => /Cargando…/.test(x.t)), 'estado: mientras carga, los dos botones están desactivados y uno dice "Cargando…": ' + JSON.stringify(bt));
  chk(await t.pg.locator('#v-estado-form .conflicto button[aria-busy=true]').evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }), 'estado: el botón pulsado se ve sin hacer scroll');
  await aterriza(t.pg, '#/aplicacion/AP001', '#v-aplicacion .cabecera');
  await t.ctx.close();
  // estado: "Guardar mi versión" doble
  t = await conflictoEstado('AP001');
  t.ctrl.lento = 700;
  const c0 = cuantas(t.log, 'cambiarEstado');
  await t.pg.evaluate(() => { const b = [...document.querySelectorAll('#v-estado-form .conflicto button')].find(x => /Guardar/.test(x.textContent)); b.click(); b.click(); });
  await t.pg.waitForTimeout(150);
  const bg = await t.pg.$$eval('#v-estado-form .conflicto button', b => b.map(x => ({ t: x.textContent, d: x.disabled })));
  chk(bg.every(x => x.d) && bg.some(x => /Guardando…/.test(x.t)) && await t.pg.isVisible('#v-estado-form .conflicto'), 'estado: "Guardar mi versión" → "Guardando…", los dos botones desactivados y el aviso sigue a la vista');
  await aterriza(t.pg, '#/aplicacion/AP001', '#v-aplicacion .cabecera');
  chk(cuantas(t.log, 'cambiarEstado') === c0 + 1, 'estado: doble pulsación = una sola petición');
  chk(fila(t.mundo, 'Aplicaciones', 'AP001').Estado === 'Contratado', 'estado: y se guardó lo mío');
  await t.ctx.close();
  // entrevista: conflicto y "Guardar mi versión" doble
  t = await entrar();
  await ir(t.pg, '#/alumno/A002', '#en-editar'); await t.pg.click('#en-editar'); await t.pg.fill('#en-notas', 'Mi versión');
  t.mundo.llamar({ key: t.mundo.clave, action: 'guardarEntrevista', id: 'A002', notas: 'De otra persona', fecha: '2026-10-30', notasAnteriores: '', fechaAnterior: '' });
  await t.pg.click('#v-alumno form button[type=submit]'); await t.pg.waitForSelector('#v-alumno .conflicto:not([hidden])');
  t.ctrl.lento = 700;
  await t.pg.evaluate(() => { const b = [...document.querySelectorAll('#v-alumno .conflicto button')].find(x => /Guardar/.test(x.textContent)); b.click(); b.click(); });
  await t.pg.waitForTimeout(150);
  const be = await t.pg.$$eval('#v-alumno .conflicto button', b => b.map(x => ({ t: x.textContent, d: x.disabled })));
  chk(be.every(x => x.d) && be.some(x => /Guardando…/.test(x.t)) && await t.pg.isVisible('#v-alumno .conflicto'), 'entrevista: botones del aviso desactivados y "Guardando…"');
  await t.pg.waitForFunction(() => /Guardado en el Sheet/.test(document.querySelector('#v-alumno').innerText));
  chk(cuantas(t.log, 'guardarEntrevista') === 2, 'entrevista: doble pulsación = una sola petición (la primera dio el conflicto)');
  await t.ctx.close();
  // oferta: conflicto y "Guardar mi versión" doble
  t = await entrar();
  await ir(t.pg, '#/oferta/O003/editar', '#of-f-empresa');
  t.mundo.hojas.Ofertas.m[t.mundo.hojas.Ofertas.m.findIndex(f => f[0] === 'O003')][4] = 'Product manager senior';
  await t.pg.fill('#of-f-ubicacion', 'Zaragoza');
  await enviar(t.pg, 'v-oferta-form'); await t.pg.waitForSelector('#v-oferta-form .conflicto:not([hidden])');
  t.ctrl.lento = 700;
  await t.pg.evaluate(() => { const b = [...document.querySelectorAll('#v-oferta-form .conflicto button')].find(x => /Guardar/.test(x.textContent)); b.click(); b.click(); });
  await t.pg.waitForTimeout(150);
  const bo = await t.pg.$$eval('#v-oferta-form .conflicto button', b => b.map(x => ({ t: x.textContent, d: x.disabled })));
  chk(bo.every(x => x.d) && bo.some(x => /Guardando…/.test(x.t)) && await t.pg.isVisible('#v-oferta-form .conflicto'), 'oferta: botones del aviso desactivados y "Guardando…"');
  await t.pg.waitForSelector('#v-oferta .cabecera');
  chk(cuantas(t.log, 'guardarOferta') === 2, 'oferta: doble pulsación = una sola petición (más la primera, que dio el conflicto)');
  await t.ctx.close();
}

/* 7. La confirmación de "Añadir solicitud" se ve sin hacer scroll */
{
  console.log('7. Confirmación visible');
  const { pg, ctx, mundo } = await entrar();
  await ir(pg, '#/oferta/O002/ronda/2/aplicar', '#ap-q');
  await pg.click('#ap-lista li:first-child label');
  await pg.evaluate(() => { document.querySelector('#main').scrollTop = 99999; });   // la pantalla se queda abajo, lejos del aviso de arriba
  const n0 = filas(mundo, 'Aplicaciones').length;
  await pg.click('#v-aplicacion-form form button[type=submit]');
  await pg.waitForSelector('#flotante');
  chk(/añadida/.test(await pg.innerText('#flotante')) && await enPantalla(pg, '#flotante'), 'aviso flotante con la confirmación, a la vista aunque la pantalla esté abajo');
  chk(filas(mundo, 'Aplicaciones').length === n0 + 1 && await pg.isVisible('#ap-ok'), 'se guardó y el aviso de arriba también está');
  chk(await pg.getAttribute('#flotante', 'role') === 'status', 'el aviso se anuncia a los lectores de pantalla (role=status)');
  await pg.click('#flotante');
  chk((await pg.$$('#flotante')).length === 0, 'al tocar el aviso, se quita');
  // y se quita solo
  await pg.click('#ap-lista li:first-child label'); await pg.click('#v-aplicacion-form form button[type=submit]'); await pg.waitForSelector('#flotante');
  await pg.waitForSelector('#flotante', { state: 'detached', timeout: 9000 });
  await ctx.close();
}

/* 8. Nada de lo anterior mete claves en la dirección ni errores en consola */
{
  console.log('8. Claves y consola');
  const { pg, ctx, log, ctrl } = await entrar();
  await ir(pg, '#/aplicacion/AP005/estado', '#es-estado');
  await pg.selectOption('#es-estado', 'Entrevista'); ctrl.abortar = 1;
  await enviar(pg, 'v-estado-form'); await aterriza(pg, '#/aplicacion/AP005', '#v-aplicacion .cabecera');
  chk(log.peticiones.every(p => !p.url.includes(CLAVE_PRUEBA) && p.metodo === 'POST' && /^text\/plain/.test(p.tipo || '')), 'los reintentos siguen llevando la clave solo en el cuerpo');
  chk(log.consola.every(c => /Failed to load resource|net::ERR/i.test(c)), 'solo errores de red esperados en consola: ' + log.consola.join(' | '));
  await ctx.close();
}

await terminar();
