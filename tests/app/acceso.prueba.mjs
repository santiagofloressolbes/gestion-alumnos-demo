// Pruebas de acceso: pantalla Acceso, clave, bloqueo, modo demo, fallos del script y contenido hostil.
import { b, nuevo, chk, almacen, conectar, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

/* 1. Primera vez: solo Acceso, sin tráfico */
{
  console.log('1. Primera vez');
  const { pg, log, ctx } = await nuevo();
  await pg.goto(BASE); await pg.waitForSelector('#ac-url');
  chk(await pg.innerText('#titulo') === 'Acceso', 'título Acceso');
  chk(!(await pg.locator('#tabs').isVisible()), 'sin barra inferior');
  chk(!(await pg.locator('#demo').isVisible()), 'sin banner demo');
  chk(await pg.locator('#ac-clave').getAttribute('type') === 'password', 'clave oculta');
  chk(log.peticiones.length === 0 && log.externas.length === 0, 'ninguna petición externa antes de conectar');
  await pg.goto(BASE + '#/buscar'); await pg.waitForTimeout(300);
  chk(await pg.locator('#ac-url').isVisible(), 'cualquier ruta sin acceso lleva a Acceso');
  await pg.click('text=Mostrar la clave');
  chk(await pg.locator('#ac-clave').getAttribute('type') === 'text', 'mostrar clave');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 2. Dirección inválida y clave vacía: no se llama al script */
{
  console.log('2. Validación local');
  const { pg, log, ctx } = await nuevo();
  await pg.goto(BASE); await pg.waitForSelector('#ac-url');
  for (const u of ['http://script.google.com/macros/s/AKfycbTESTTESTTESTTESTTEST12345/exec', 'https://evil.example/macros/s/AKfycbTESTTESTTESTTESTTEST12345/exec', 'https://script.google.com/macros/s/AKfycbTESTTESTTESTTESTTEST12345/exec?x=1', 'https://script.google.com/macros/s/corto/exec', '']) {
    await conectar(pg, u, 'loquesea');
    await pg.waitForSelector('.error:not([hidden])');
    chk(/dirección no es válida/.test(await pg.innerText('.error')), 'rechaza ' + u);
  }
  await conectar(pg, URL_OK, '');
  chk(/Escribe la clave/.test(await pg.innerText('.error')), 'clave vacía');
  chk(log.peticiones.length === 0, 'cero peticiones con datos inválidos');
  chk(Object.keys(await almacen(pg)).length === 0, 'nada guardado');
  await ctx.close();
}

/* 3. Clave mala x4, buena, y bloqueo */
{
  console.log('3. Clave mala y bloqueo');
  const { pg, log, ctx, mundo } = await nuevo();
  await pg.goto(BASE); await pg.waitForSelector('#ac-url');
  await pg.fill('#ac-url', URL_OK);
  for (let i = 1; i <= 4; i++) {
    await pg.fill('#ac-clave', 'clave incorrecta ' + i); await pg.click('form button[type=submit]');
    await pg.waitForFunction(() => /no es correcta/.test(document.querySelector('.error')?.textContent || '') && !document.querySelector('form button').disabled);
  }
  chk(Object.keys(await almacen(pg)).length === 0, 'clave mala no se guarda');
  chk(await pg.inputValue('#ac-clave') === '', 'se vacía el campo de clave tras fallo');
  await pg.fill('#ac-clave', 'clave incorrecta 5'); await pg.click('form button[type=submit]');
  await pg.waitForFunction(() => /Demasiados intentos/.test(document.querySelector('.error')?.textContent || ''));
  chk(/15 minutos/.test(await pg.innerText('.error')), 'quinto fallo bloquea 15 min: ' + await pg.innerText('.error'));
  await pg.fill('#ac-clave', CLAVE_PRUEBA); await pg.click('form button[type=submit]');
  await pg.waitForFunction(() => /Demasiados intentos/.test(document.querySelector('.error')?.textContent || ''));
  chk(Object.keys(await almacen(pg)).length === 0, 'bloqueado: ni con la clave buena se guarda');
  mundo.sandbox.desbloquear();
  await pg.fill('#ac-clave', CLAVE_PRUEBA); await pg.click('form button[type=submit]');
  await pg.waitForSelector('.masters');
  chk(true, 'tras desbloquear entra');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 4. Conexión buena: datos, almacenamiento, tráfico */
{
  console.log('4. Conexión buena');
  const { pg, log, ctx, mundo } = await nuevo();
  await pg.goto(BASE); await pg.waitForSelector('#ac-url');
  await conectar(pg, URL_OK, CLAVE_PRUEBA);
  await pg.waitForSelector('.masters .master');
  chk(await pg.innerText('#titulo') === 'Gestión de alumnos (demo)', 'título normal');
  chk(await pg.locator('#tabs').isVisible(), 'barra inferior visible');
  chk(!(await pg.locator('#demo').isVisible()), 'sin banner demo en modo script');
  const al = await almacen(pg);
  chk(Object.keys(al).sort().join() === 'gad.clave,gad.url', 'solo se guardan dirección y clave: ' + Object.keys(al));
  chk(al['gad.clave'] === CLAVE_PRUEBA && al['gad.url'] === URL_OK, 'valores guardados');
  const sesion = await pg.evaluate(() => JSON.stringify(sessionStorage));
  chk(!sesion.includes('Ana') && sesion === '{}', 'nada en sessionStorage');
  const total = mundo.hojas.Alumnos.m.length - 1;
  const textoInicio = await pg.innerText('#v-inicio');
  const suma = [...textoInicio.matchAll(/(\d+) alumnos?/g)].slice(0, -1).map(m => +m[1]).reduce((a, c) => a + c, 0);
  chk(suma === total, `alumnos en pantalla (${suma}) = filas del Sheet (${total})`);
  chk(!/Conexión/.test(textoInicio), 'Inicio ya no lleva la tarjeta Conexión (está en Ajustes)');
  await pg.click('#tabs a[data-tab=ajustes]'); await pg.waitForSelector('#v-ajustes .conexion');
  chk(/Conectado al Sheet de prueba/.test(await pg.innerText('#v-ajustes')), 'tarjeta Conexión (en Ajustes)');
  await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('.masters .master');
  // Todas las peticiones: POST, text/plain, solo script.google.com, sin clave en la URL
  chk(log.peticiones.length >= 2, 'ping + data: ' + log.peticiones.length);
  chk(log.peticiones.every(p => p.metodo === 'POST' && /^text\/plain/.test(p.tipo) && p.url === URL_OK), 'POST text/plain a la URL exacta');
  chk(log.peticiones.every(p => !p.url.includes(CLAVE_PRUEBA) && p.cuerpo.includes(JSON.stringify(CLAVE_PRUEBA))), 'la clave va en el cuerpo, no en la URL');
  chk(log.externas.every(x => x.includes('script.google.com')), 'solo se contacta con script.google.com: ' + log.externas.filter(x => !x.includes('script.google.com')));
  chk(!pg.url().includes('clave') && !pg.url().includes(CLAVE_PRUEBA), 'la dirección de la página no lleva la clave');
  // Navegar: lista, ficha, buscar
  await pg.click('.master >> nth=0'); await pg.waitForSelector('.alumno');
  const n1 = await pg.locator('.alumno').count();
  await pg.click('.alumno >> nth=0'); await pg.waitForSelector('.campos');
  chk(await pg.locator('.campos').count() > 0, 'ficha abre');
  await pg.goto(BASE + '#/buscar'); await pg.waitForSelector('#v-buscar input');
  await pg.fill('#v-buscar input[type=search], #v-buscar input[type=text]', 'a');
  await pg.waitForTimeout(300);
  chk(await pg.locator('#v-buscar .alumno').count() > 0, 'búsqueda funciona en modo script (' + n1 + ' en el 1.º máster)');
  const peticionesAntes = log.peticiones.length;
  await pg.goto(BASE + '#/'); await pg.waitForTimeout(300);
  chk(log.peticiones.length === peticionesAntes, 'los datos se piden una sola vez por sesión');
  // Recargar: sigue conectado
  await pg.reload(); await pg.waitForSelector('.masters .master');
  chk(true, 'tras recargar sigue conectado sin volver a pedir la clave');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));

  // Olvidar acceso
  pg.on('dialog', d => d.accept());
  await pg.click('#tabs a[data-tab=ajustes]'); await pg.waitForSelector('#aj-olvidar');
  await pg.click('text=Olvidar acceso'); await pg.waitForSelector('#ac-url');
  chk(Object.keys(await almacen(pg)).length === 0, 'olvidar acceso borra todo');
  chk(await pg.inputValue('#ac-url') === '', 'URL no queda precargada tras olvidar');
  await ctx.close();
}

/* 5. Script caído: error claro, SIN respaldo automático a la demo */
{
  console.log('5. Script caído');
  for (const modo of ['caido', 'html']) {
    const { pg, ctx, log } = await nuevo({ modo });
    await pg.addInitScript(([u, c]) => { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }, [URL_OK, CLAVE_PRUEBA]);
    await pg.goto(BASE); await pg.waitForSelector('#v-inicio .card');
    const t = await pg.innerText('#v-inicio');
    chk(/No se han podido cargar los datos/.test(t), modo + ': tarjeta de error');
    chk(modo === 'caido' ? /no ha podido hablar con Google/.test(t) : /no responde como el script/.test(t), modo + ': mensaje claro: ' + t.replace(/\n/g, ' | '));
    chk(!(await pg.locator('.master').count()), modo + ': NO se muestran datos de la demo');
    chk(!(await pg.locator('#demo').isVisible()), modo + ': no se activa el modo demo');
    chk(await pg.locator('text=Reintentar').count() === 1 && await pg.locator('text=Cambiar o quitar el acceso').count() === 1, modo + ': botones');
    chk(!log.externas.some(x => x.includes('datos-mock')) , 'no pide datos-mock');
    const al = await almacen(pg);
    chk(al['gad.clave'] === CLAVE_PRUEBA, modo + ': el fallo de red no borra la clave');
    await ctx.close();
  }
}

/* 6. Clave cambiada en el servidor */
{
  console.log('6. Clave cambiada en el Sheet');
  const { pg, ctx, mundo } = await nuevo();
  mundo.props.set('CLAVE', 'otra clave completamente distinta 999');
  await pg.addInitScript(([u, c]) => { if (!localStorage.getItem('visto')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); localStorage.setItem('visto', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  await pg.goto(BASE); await pg.waitForSelector('#v-inicio .card');
  chk(/La clave guardada ya no vale/.test(await pg.innerText('#v-inicio')), 'aviso de clave caducada');
  const al = await almacen(pg);
  chk(!al['gad.clave'] && al['gad.url'] === URL_OK, 'se borra la clave y se conserva la dirección');
  await pg.click('text=Escribir la clave de nuevo'); await pg.waitForSelector('#ac-url');
  chk(await pg.inputValue('#ac-url') === URL_OK, 'la dirección sale precargada');
  await ctx.close();
}

/* 7. Modo demo */
{
  console.log('7. Modo demo');
  const { pg, ctx, log } = await nuevo();
  await pg.goto(BASE); await pg.waitForSelector('#ac-url');
  await pg.click('text=Ver demo'); await pg.waitForSelector('.masters .master');
  chk(await pg.locator('#demo').isVisible(), 'banner MODO DEMO visible');
  chk(/MODO DEMO/.test(await pg.innerText('#demo')) && /No se guarda nada/.test(await pg.innerText('#demo')), 'texto del banner');
  chk(log.peticiones.length === 0, 'la demo no contacta con el script');
  await pg.click('#tabs a[data-tab=ajustes]'); await pg.waitForSelector('#v-ajustes .conexion');
  chk(/Estás viendo la demo/.test(await pg.innerText('#v-ajustes')), 'tarjeta Conexión en demo (en Ajustes)');
  await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('.masters .master');
  const al = await almacen(pg);
  chk(Object.keys(al).join() === 'gad.modo', 'solo se guarda el modo');
  await pg.click('.master >> nth=0'); await pg.waitForSelector('.alumno');
  chk(await pg.locator('#demo').isVisible(), 'el banner sigue en las otras pantallas');
  await pg.goto(BASE + '#/acceso'); await pg.waitForSelector('#ac-url');
  chk(await pg.locator('text=Volver').count() > 0, 'desde demo se puede ir a Acceso y volver');
  await conectar(pg, URL_OK, CLAVE_PRUEBA);
  await pg.waitForSelector('.masters .master');
  chk(!(await pg.locator('#demo').isVisible()), 'al conectar desaparece el banner');
  chk(!('gad.modo' in await almacen(pg)), 'al conectar se quita el modo demo');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 8. Seguridad del contenido: nada de HTML activo desde el Sheet */
{
  console.log('8. HTML en los datos');
  const { pg, ctx, mundo, log } = await nuevo();
  mundo.hojas.Alumnos.m[1][mundo.hojas.Alumnos.m[0].indexOf('Nombre')] = '<img src=x onerror=window.__pwn=1>';
  await pg.addInitScript(([u, c]) => { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }, [URL_OK, CLAVE_PRUEBA]);
  await pg.goto(BASE + '#/alumno/A001'); await pg.waitForSelector('.campos, .avatar');
  await pg.waitForTimeout(500);
  chk(await pg.evaluate(() => window.__pwn) === undefined, 'HTML del Sheet no se ejecuta');
  chk((await pg.innerText('#v-alumno')).includes('<img src=x'), 'se enseña como texto');
  await ctx.close();
}

await terminar();
