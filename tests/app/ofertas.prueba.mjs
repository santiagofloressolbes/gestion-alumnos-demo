// Pruebas de la pestaña Ofertas (solo lectura): lista, orden, filtros, ficha, enlaces seguros y textos peligrosos.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async (modo = 'script', alCrear) => {
  const t = await nuevo();
  if (alCrear) alCrear(t.mundo);
  await t.pg.addInitScript(([m, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (m === 'demo') localStorage.setItem('gad.modo', 'demo');
    else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
    sessionStorage.setItem('ini', '1');
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  return t;
};
const abrirLista = async pg => { await pg.goto(BASE + '#/ofertas'); await pg.waitForSelector('#v-ofertas ul.alumnos li'); };
const titulos = pg => pg.$$eval('#v-ofertas ul.alumnos li b', bs => bs.map(b => b.textContent));
const cuenta = pg => pg.innerText('#v-ofertas .cuenta');
const escrituras = log => log.peticiones.filter(p => /^guardar/.test(JSON.parse(p.cuerpo || '{}').action || ''));

for (const modo of ['demo', 'script']) {
  /* 1. Lista, orden y barra de pestañas (con los datos de ejemplo, en la demo y con el script) */
  {
    console.log(`1. Lista y orden (${modo})`);
    const { pg, ctx, log } = await entrar(modo);
    await abrirLista(pg);
    const t = await titulos(pg);
    chk(t.length === 10, '10 ofertas: ' + t.length);
    chk(t[0] === 'Asociado/a junior de derecho deportivo' && t[9] === 'Analista de antipiratería', 'más reciente primero (O010) y más antigua última (O001): ' + t[0] + ' / ' + t[9]);
    chk(await cuenta(pg) === '10 ofertas', 'contador: ' + await cuenta(pg));
    chk(await pg.$$eval('#tabs a', a => a.map(x => x.textContent.trim()).join()) === 'Inicio,Buscar,Ofertas', '3 pestañas');
    chk(await pg.getAttribute('#tabs a[data-tab=ofertas]', 'aria-current') === 'page', 'pestaña Ofertas activa');
    chk(await pg.innerText('#titulo') === 'Ofertas', 'título');
    const fila0 = await pg.innerText('#v-ofertas ul.alumnos li:first-child');
    chk(/Despacho mock J · Madrid/.test(fila0) && /Empleo · Derecho y compliance/.test(fila0) && /Cerrada/.test(fila0) && /25 de octubre de 2026/.test(fila0), 'fila con empresa, ciudad, tipo, área, estado y fecha: ' + fila0.replace(/\n/g, ' | '));
    chk(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin desbordamiento horizontal a 390 px');
    const alto = await pg.$$eval('#tabs a, #v-ofertas ul.alumnos a, #v-ofertas .opcion', xs => Math.min(...xs.map(x => x.getBoundingClientRect().height)));
    chk(alto >= 44, 'objetivos táctiles >= 44 px: ' + alto);
    chk(!/\bnull\b|undefined/.test(await pg.innerText('#v-ofertas')), 'sin "null" ni "undefined" visibles en la lista');
    chk(await pg.isHidden('#v-ofertas .card:has-text("Todavía no hay ofertas")'), 'el aviso de "sin ofertas" está oculto');
    await pg.goto(BASE + '#/oferta/O001'); await pg.waitForSelector('#v-oferta .cabecera');
    chk(!/\bnull\b|undefined/.test(await pg.innerText('#v-oferta')), 'sin "null" ni "undefined" visibles en la ficha');
    chk(escrituras(log).length === 0, 'ninguna petición de guardar');
    chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
    chk(log.externas.length === 0 || modo === 'script', 'sin peticiones externas en la demo');
    await ctx.close();
  }

  /* 2. Filtros y búsqueda */
  {
    console.log(`2. Filtros (${modo})`);
    const { pg, ctx } = await entrar(modo);
    await abrirLista(pg);
    const estados = await pg.$$eval('#v-ofertas .opcion', b => b.map(x => x.textContent));
    chk(estados.join() === 'Todas,Abierta,Cerrada', 'botones de estado: ' + estados);
    await pg.click('#v-ofertas .opcion:has-text("Abierta")');
    chk((await titulos(pg)).length === 8 && /^8 de 10 ofertas$/.test(await cuenta(pg)), 'Abierta = 8: ' + await cuenta(pg));
    chk(await pg.getAttribute('#v-ofertas .opcion:has-text("Abierta")', 'aria-pressed') === 'true', 'botón marcado');
    await pg.click('#v-ofertas .opcion:has-text("Cerrada")');
    chk((await titulos(pg)).join() === 'Asociado/a junior de derecho deportivo,Becario/a de redacción', 'Cerrada = 2, orden por fecha');
    await pg.click('#v-ofertas .opcion:has-text("Todas")');
    chk((await titulos(pg)).length === 10, 'Todas = 10');
    await pg.click('#v-ofertas summary');
    await pg.selectOption('#of-tipo', 'Prácticas');
    chk((await titulos(pg)).length === 5, 'Prácticas = 5: ' + (await titulos(pg)).length);
    chk(/Filtros \(1 activo\)/.test(await pg.innerText('#v-ofertas summary')), 'resumen de filtros');
    await pg.selectOption('#of-area', 'Marketing y comunicación');
    chk((await titulos(pg)).join() === 'Becario/a de redacción', 'Prácticas + Marketing = 1');
    chk(/Filtros \(2 activos\)/.test(await pg.innerText('#v-ofertas summary')), '2 activos');
    await pg.click('#v-ofertas .opcion:has-text("Abierta")');
    chk(await pg.isVisible('#v-ofertas .card:has-text("Ninguna oferta coincide")'), 'mensaje sin resultados');
    chk(/^0 de 10 ofertas$/.test(await cuenta(pg)), '0 de 10');
    await pg.click('text=Quitar búsqueda y filtros');
    chk((await titulos(pg)).length === 10 && await pg.inputValue('#of-tipo') === '' && await pg.inputValue('#of-area') === '', 'quitar filtros lo deja todo');
    // texto: sin tildes ni mayúsculas, todas las palabras
    await pg.fill('#of-q', 'MADRID prácticas');
    chk((await titulos(pg)).join() === 'Becario/a de People & Culture,Becario/a de redacción,Becario/a de eventos', 'texto "MADRID prácticas": ' + (await titulos(pg)));
    await pg.fill('#of-q', 'analisis');
    chk((await titulos(pg)).join() === 'Analista de datos deportivos', '"analisis" encuentra el área "Análisis de datos"');
    await pg.fill('#of-q', 'O003');
    chk((await titulos(pg)).join() === 'Product manager junior', 'busca por número de oferta');
    await pg.fill('#of-q', 'liga mock');
    chk((await titulos(pg)).length === 2, 'busca por empresa');
    await pg.fill('#of-q', '<script>');
    chk((await titulos(pg)).length === 0, 'texto raro: sin resultados y sin romper');
    await ctx.close();
  }

  /* 3. Ficha, volver y navegación */
  {
    console.log(`3. Ficha (${modo})`);
    const { pg, ctx } = await entrar(modo);
    await abrirLista(pg);
    await pg.click('#v-ofertas .opcion:has-text("Abierta")');
    await pg.fill('#of-q', 'datos');
    await pg.click('#v-ofertas a:has-text("Analista de datos deportivos")');
    await pg.waitForSelector('#v-oferta .cabecera');
    const f = await pg.innerText('#v-oferta');
    chk(/Analista de datos deportivos/.test(f) && /Liga mock G \(EE\. UU\.\) · Remoto/.test(f), 'cabecera con puesto, empresa y ubicación');
    chk(/Estados Unidos/.test(f) && /Permiso de trabajo/.test(f) && /No requerido/.test(f), 'requisitos');
    chk(/18 de octubre de 2026/.test(f) && /O007/.test(f), 'fecha y número');
    chk(await pg.getAttribute('#tabs a[data-tab=ofertas]', 'aria-current') === 'page', 'en la ficha la pestaña Ofertas sigue activa');
    chk(await pg.innerText('#titulo') === 'Oferta', 'título de la ficha');
    chk(await pg.locator('#v-oferta a[href*="example."]').count() === 0, 'enlace de ejemplo NO es un enlace');
    chk(/Enlace de ejemplo/.test(f) && /https:\/\/example\.com\/oferta\/O007/.test(f), 'se muestra como texto');
    await pg.click('#v-oferta .volver');
    await pg.waitForSelector('#v-ofertas ul.alumnos li');
    chk(await pg.inputValue('#of-q') === 'datos' && await pg.getAttribute('#v-ofertas .opcion:has-text("Abierta")', 'aria-pressed') === 'true', 'al volver se conservan búsqueda y filtro');
    chk((await titulos(pg)).join() === 'Analista de datos deportivos', 'y la lista');
    // sin requisito de nacionalidad
    await pg.goto(BASE + '#/oferta/O001'); await pg.waitForSelector('#v-oferta .cabecera');
    chk(/Sin requisito de nacionalidad/.test(await pg.innerText('#v-oferta')), 'nacionalidad vacía = sin requisito');
    // oferta que no existe y dirección rota
    await pg.goto(BASE + '#/oferta/O999'); await pg.waitForSelector('#v-oferta .card');
    chk(/Oferta no encontrada/.test(await pg.innerText('#v-oferta')) && await pg.isVisible('#v-oferta .volver'), 'oferta inexistente');
    await pg.goto(BASE + '#/oferta/%E0%A4%A');
    await pg.waitForSelector('#v-inicio .masters');
    chk(await pg.innerText('#titulo') !== 'Oferta', 'dirección mal escrita: vuelve al inicio sin romper');
    await ctx.close();
  }
}

/* 4. Solo con el script: enlaces y textos de la hoja que no son de fiar */
{
  console.log('4. Enlaces y textos peligrosos');
  const { pg, ctx, log } = await entrar('script', mundo => {
    const m = mundo.hojas.Ofertas.m;
    const poner = (id, col, v) => { m.find(f => f[0] === id)[col] = v; };
    poner('O001', 11, 'https://empresa-real.test/ofertas/1?a=1&b=2');     // enlace https real
    poner('O002', 11, 'http://inseguro.test/o2');                           // http: no es enlace
    poner('O003', 11, 'javascript:alert(1)');                               // nunca enlace
    poner('O004', 11, 'Escribir a rrhh@empresa.test indicando la referencia');   // descripción
    poner('O005', 11, '');                                                  // sin nada
    poner('O006', 4, '<img src=x onerror=alert(1)>Becario');                // HTML en el título
    poner('O006', 1, '=HYPERLINK("http://malo.test","clic")');              // fórmula en la empresa
  });
  await pg.goto(BASE + '#/oferta/O001'); await pg.waitForSelector('#v-oferta .cabecera');
  const a = pg.locator('#v-oferta a.primary');
  chk(await a.count() === 1 && await a.getAttribute('href') === 'https://empresa-real.test/ofertas/1?a=1&b=2', 'https real: botón con la dirección');
  chk(await a.getAttribute('target') === '_blank' && await a.getAttribute('rel') === 'noopener noreferrer', 'se abre en otra pestaña, sin enviar el origen');
  for (const id of ['O002', 'O003', 'O004', 'O005']) {
    await pg.goto(BASE + '#/oferta/' + id); await pg.waitForSelector('#v-oferta .cabecera');
    chk(await pg.locator('#v-oferta a:not(.volver)').count() === 0, id + ': ningún enlace pulsable');
  }
  await pg.goto(BASE + '#/oferta/O003'); await pg.waitForSelector('#v-oferta .cabecera');
  chk(/javascript:alert\(1\)/.test(await pg.innerText('#v-oferta')), 'javascript: se ve como texto');
  await pg.goto(BASE + '#/oferta/O004'); await pg.waitForSelector('#v-oferta .cabecera');
  chk(/Descripción/.test(await pg.innerText('#v-oferta')) && /rrhh@empresa\.test/.test(await pg.innerText('#v-oferta')), 'descripción libre');
  await pg.goto(BASE + '#/oferta/O005'); await pg.waitForSelector('#v-oferta .cabecera');
  chk(!/Descripción|Enlace/.test(await pg.innerText('#v-oferta')), 'sin enlace ni descripción: no hay tarjeta');
  await pg.goto(BASE + '#/oferta/O006'); await pg.waitForSelector('#v-oferta .cabecera');
  chk(await pg.locator('#v-oferta img, #v-oferta script').count() === 0 && /<img src=x onerror=alert\(1\)>Becario/.test(await pg.innerText('#v-oferta')), 'HTML del título: solo texto');
  chk(/=HYPERLINK/.test(await pg.innerText('#v-oferta')), 'fórmula: solo texto');
  await pg.goto(BASE + '#/ofertas'); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk(await pg.locator('#v-ofertas img').count() === 0, 'la lista tampoco crea elementos con el HTML del título');
  chk(escrituras(log).length === 0, 'ninguna petición de guardar');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 5. Errores y casos límite */
{
  console.log('5. Errores y casos límite');
  // sin conexión: mensaje claro y botón de reintentar
  const c = await nuevo({ modo: 'caido' });
  await c.pg.addInitScript(([u, k]) => { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', k); }, [URL_OK, CLAVE_PRUEBA]);
  await c.pg.goto(BASE + '#/ofertas');
  await c.pg.waitForSelector('#v-ofertas .card');
  chk(/conexi/i.test(await c.pg.innerText('#v-ofertas')) && await c.pg.isVisible('#v-ofertas button'), 'sin conexión: aviso y reintentar');
  await c.ctx.close();
  // sin ofertas en el Sheet
  const v = await entrar('script', mundo => { mundo.hojas.Ofertas.m.splice(1); });
  await v.pg.goto(BASE + '#/ofertas'); await v.pg.waitForSelector('#v-ofertas .card:has-text("Todavía no hay ofertas")');
  chk(await v.pg.locator('#v-ofertas ul.alumnos li').count() === 0 && !await v.pg.isVisible('#v-ofertas .card:has-text("Ninguna oferta coincide")'), 'hoja vacía: mensaje claro');
  await v.ctx.close();
  // la hoja Listas sin la columna nueva sigue funcionando (el permiso solo es un dato)
  const s = await entrar('script', mundo => { for (const f of mundo.hojas.Listas.m) f.length = 8; });
  await s.pg.goto(BASE + '#/ofertas'); await s.pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk(s.log.consola.length === 0, 'Listas sin la columna de permisos: sigue funcionando');
  await s.ctx.close();
  // estado desconocido en la hoja (no está en Listas): también aparece como botón
  const x = await entrar('script', mundo => { mundo.hojas.Ofertas.m[1][10] = 'En pausa'; });
  await x.pg.goto(BASE + '#/ofertas'); await x.pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk((await x.pg.$$eval('#v-ofertas .opcion', b => b.map(y => y.textContent))).includes('En pausa'), 'estado fuera de Listas: botón propio');
  await x.ctx.close();
}

await terminar();
