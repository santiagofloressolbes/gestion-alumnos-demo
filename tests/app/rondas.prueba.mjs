// Pruebas de rondas y aplicaciones (solo lectura): ficha de la oferta, ficha del alumno y detalle de una aplicación,
// en la demo y con el script, con datos que faltan, que sobran o que intentan colar código.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async (modo = 'script', alCrear, ancho) => {
  const t = await nuevo();
  if (alCrear) alCrear(t.mundo);
  if (ancho) await t.pg.setViewportSize({ width: ancho, height: 800 });
  await t.pg.addInitScript(([m, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (m === 'demo') localStorage.setItem('gad.modo', 'demo');
    else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
    sessionStorage.setItem('ini', '1');
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  return t;
};
const oferta = async (pg, id) => { await pg.goto(BASE + '#/oferta/' + id); await pg.waitForSelector('#v-oferta .cabecera'); };
const alumno = async (pg, id) => { await pg.goto(BASE + '#/alumno/' + id); await pg.waitForSelector('#v-alumno .cabecera'); };
const aplicacion = async (pg, id) => { await pg.goto(BASE + '#/aplicacion/' + id); await pg.waitForSelector('#v-aplicacion .card'); };
const textos = (pg, sel) => pg.$$eval(sel, xs => xs.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
const filasRonda = (pg, i) => pg.$$eval('#v-oferta .ronda', (rs, k) => [...rs[k].querySelectorAll('ul.alumnos li')].map(x => x.innerText.replace(/\s+/g, ' ').trim()), i);
const escrituras = log => log.peticiones.filter(p => /^guardar|^registrar|^crear|^cambiar/.test(JSON.parse(p.cuerpo || '{}').action || ''));
const limpio = async (pg, sel) => !/\bnull\b|undefined|\[object/.test(await pg.innerText(sel));

for (const modo of ['demo', 'script']) {
  /* 1. Ficha de la oferta: rondas, aplicaciones y resumen */
  {
    console.log(`1. Ficha de la oferta (${modo})`);
    const { pg, ctx, log } = await entrar(modo);
    await oferta(pg, 'O002');
    const rondas = await textos(pg, '#v-oferta .ronda h2');
    chk(rondas.join() === 'Ronda 2,Ronda 1', 'las rondas, de la más reciente a la más antigua: ' + rondas);
    const sub = await textos(pg, '#v-oferta .ronda > .sub');
    chk(sub[0] === 'Enviada el 21 de octubre de 2026 · 2 aplicaciones' && sub[1] === 'Enviada el 10 de octubre de 2026 · 3 aplicaciones', 'fecha de envío y número de aplicaciones: ' + sub);
    const chips = await textos(pg, '#v-oferta .ronda .resumen');
    chk(chips[0] === 'Recibida: 1 En revisión: 1' && chips[1] === 'Entrevista: 1 Descartado: 2', 'resumen por estado, en el orden de la lista: ' + chips);
    const filas = await filasRonda(pg, 0);
    chk(filas.length === 2 && /Lucía Quintero/.test(filas[0]) && /En revisión/.test(filas[0]) && /Adrián O'Connor/.test(filas[1]) && /Recibida/.test(filas[1]), 'ronda 2: por orden de llegada, con alumno y estado: ' + filas.join(' || '));
    const r1 = await filasRonda(pg, 1);
    chk(r1.length === 3 && /Mateo Ferrer.*Entrevista/.test(r1[0]), 'ronda 1: 3 aplicaciones: ' + r1.join(' || '));
    chk(r1.some(x => /Adrián O'Connor.*Descartado.*Perfil no encaja/.test(x)) && r1.some(x => /Paula Marín.*Descartado.*La empresa eligió a otro/.test(x)), 'los descartados enseñan su motivo');
    chk((await pg.$$('#v-oferta .ronda a.alumno')).length === 5, '5 aplicaciones en total, todas con enlace');
    await oferta(pg, 'O004');
    chk(/todavía no se ha enviado a los alumnos/.test(await pg.innerText('#v-oferta')), 'una oferta sin rondas lo dice');
    await oferta(pg, 'O003');
    chk((await textos(pg, '#v-oferta .ronda h2')).join() === 'Ronda 2,Ronda 1', 'otra oferta con 2 rondas');
    await oferta(pg, 'O006');
    chk((await textos(pg, '#v-oferta .ronda h2')).join() === 'Ronda 1' && /Cerrada/.test(await pg.innerText('#v-oferta .cabecera')), 'una oferta cerrada también enseña sus rondas');
    for (const id of ['O002', 'O003', 'O004', 'O006']) { await oferta(pg, id); chk(await limpio(pg, '#v-oferta'), `sin "null" ni "undefined" en ${id}`); }
    chk(escrituras(log).length === 0, 'ninguna petición de guardar');
    chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
    chk(modo === 'script' || log.externas.length === 0, 'sin peticiones externas en la demo');
    await ctx.close();
  }

  /* 2. Ficha del alumno */
  {
    console.log(`2. Ficha del alumno (${modo})`);
    const { pg, ctx } = await entrar(modo);
    await alumno(pg, 'A028');
    const tarj = await textos(pg, '#v-alumno [aria-label=Aplicaciones] ul.alumnos li');
    chk(tarj.length === 2 && /Becario\/a de patrocinio.*Club mock B · Ronda 2.*Recibida/.test(tarj[0]) && /Ronda 1.*Descartado.*Perfil no encaja/.test(tarj[1]), 'A028: sus 2 aplicaciones, la más reciente primero: ' + tarj.join(' || '));
    chk(/2 aplicaciones/.test(await pg.innerText('#v-alumno [aria-label=Aplicaciones]')), 'cuenta las aplicaciones');
    await alumno(pg, 'A010');
    chk(/Todavía no ha aplicado a ninguna oferta/.test(await pg.innerText('#v-alumno [aria-label=Aplicaciones]')), 'un alumno sin aplicaciones lo dice');
    await alumno(pg, 'A001');
    chk(await limpio(pg, '#v-alumno'), 'sin "null" ni "undefined" en la ficha');
    chk((await pg.$$('#en-titulo')).length === 1, 'la tarjeta de entrevista sigue ahí');
    await ctx.close();
  }

  /* 3. Detalle de una aplicación */
  {
    console.log(`3. Detalle de una aplicación (${modo})`);
    const { pg, ctx, log } = await entrar(modo);
    await aplicacion(pg, 'AP002');
    chk(await pg.innerText('#titulo') === 'Aplicación' && await pg.getAttribute('#tabs a[data-tab=ofertas]', 'aria-current') === 'page', 'título y pestaña');
    chk(/Adrián O'Connor/.test(await pg.innerText('#v-aplicacion .cabecera')) && /Becario\/a de patrocinio · Club mock B/.test(await pg.innerText('#v-aplicacion .cabecera')) && /Descartado/.test(await pg.innerText('#v-aplicacion .cabecera')) && /Ronda 1/.test(await pg.innerText('#v-aplicacion .cabecera')), 'cabecera: alumno, oferta, estado y ronda');
    const datos = await pg.innerText('#v-aplicacion [aria-label=Datos]');
    chk(/Ronda 1, enviada el 10 de octubre de 2026/.test(datos) && /Aplicó el\s+11 de octubre de 2026/.test(datos) && /Motivo del descarte\s+Perfil no encaja/.test(datos) && /AP002/.test(datos), 'datos: ronda, fecha, motivo e ID: ' + datos.replace(/\n/g, ' | '));
    const h = await textos(pg, '#v-aplicacion .historial li');
    chk(h.length === 3 && /^En revisión → Descartado 17 de octubre de 2026 · Motivo: Perfil no encaja Poca experiencia comercial\.$/.test(h[0]) && /^Recibida → En revisión/.test(h[1]) && /^Recibida \(aplicación registrada\) 11 de octubre/.test(h[2]), 'historial: lo último arriba, con motivo y nota: ' + h.join(' || '));
    await aplicacion(pg, 'AP005');
    chk(!/Motivo del descarte/.test(await pg.innerText('#v-aplicacion')) && /Sin notas|Vuelve a aplicar/.test(await pg.innerText('#v-aplicacion')), 'sin descarte no sale el motivo; las notas salen');
    chk((await textos(pg, '#v-aplicacion .historial li')).length === 1, 'una aplicación recién nacida tiene 1 línea de historial');
    // volver
    await pg.goto(BASE + '#/oferta/O002'); await pg.waitForSelector('#v-oferta .ronda');
    await pg.locator('#v-oferta .ronda').nth(1).locator('a.alumno').first().click();
    await pg.waitForSelector('#v-aplicacion .card');
    chk(await pg.getAttribute('#v-aplicacion .volver', 'href') === '#/oferta/O002', 'si vienes de la oferta, "volver" lleva a la oferta');
    await pg.goto(BASE + '#/alumno/A028'); await pg.waitForSelector('#v-alumno [aria-label=Aplicaciones] a.alumno');
    await pg.click('#v-alumno [aria-label=Aplicaciones] a.alumno');
    await pg.waitForSelector('#v-aplicacion .card');
    chk(await pg.getAttribute('#v-aplicacion .volver', 'href') === '#/alumno/A028', 'si vienes del alumno, "volver" lleva al alumno');
    await pg.click('#v-aplicacion [aria-label=Datos] a:has-text("Ver la oferta")');
    await pg.waitForSelector('#v-oferta .cabecera');
    chk(location_ok(await pg.evaluate(() => location.hash), /#\/oferta\/O002$/), 'enlace a la oferta');
    await pg.goto(BASE + '#/aplicacion/AP999'); await pg.waitForSelector('#v-aplicacion .card');
    chk(/Aplicación no encontrada/.test(await pg.innerText('#v-aplicacion')), 'una aplicación que no existe lo dice');
    chk(escrituras(log).length === 0 && log.consola.length === 0, 'sin peticiones de guardar ni errores: ' + log.consola.join(' | '));
    await ctx.close();
  }
}
function location_ok(h, re) { return re.test(h); }

/* 4. Sin las hojas de rondas (Sheet o script antiguos): la app sigue como antes */
{
  console.log('4. Sin hojas de rondas');
  const { pg, ctx, log, mundo } = await entrar('script', m => { delete m.hojas.Rondas; delete m.hojas.Aplicaciones; delete m.hojas.Historial; });
  await oferta(pg, 'O002');
  chk(/todavía no están las hojas Rondas, Aplicaciones e Historial/.test(await pg.innerText('#v-oferta')) && (await pg.$$('#v-oferta .ronda')).length === 0, 'la ficha de la oferta explica que faltan las hojas (sin romperse)');
  chk(!/todavía no se ha enviado a los alumnos/.test(await pg.innerText('#v-oferta')), 'y no dice (falsamente) que la oferta no se ha enviado');
  chk((await pg.$$('#ro-nueva')).length === 0, 'sin botón de registrar ronda');
  await alumno(pg, 'A028');
  chk(await limpio(pg, '#v-alumno'), 'sin "null" ni "undefined" en la ficha del alumno');
  chk((await pg.$$('#v-alumno [aria-label=Aplicaciones]')).length === 0, 'la ficha del alumno no enseña "Aplicaciones"');
  chk((await pg.$$('#en-titulo')).length === 1 && (await pg.$$('#en-editar')).length === 1, 'la entrevista sigue funcionando');
  await pg.goto(BASE + '#/aplicacion/AP001'); await pg.waitForSelector('#v-aplicacion .card');
  chk(/Aplicación no encontrada/.test(await pg.innerText('#v-aplicacion')), 'una aplicación no existe sin las hojas');
  await pg.goto(BASE + '#/ofertas'); await pg.waitForSelector('#v-ofertas ul.alumnos li');
  chk((await pg.$$('#v-ofertas ul.alumnos li')).length === 10, 'la lista de ofertas sigue igual');
  chk(log.consola.length === 0, 'sin errores: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 4b. Respuesta a medias (falta una de las tres hojas): se trata como si no hubiera rondas */
{
  console.log('4b. Hojas a medias');
  const { pg, ctx, ctrl } = await entrar('script');
  ctrl.alResponder = (j, accion) => { if (accion === 'data') delete j.historial; return j; };
  await oferta(pg, 'O002');
  chk((await pg.$$('#v-oferta .ronda')).length === 0 && /todavía no están las hojas/.test(await pg.innerText('#v-oferta')), 'con una hoja de menos no se enseña nada de rondas y se explica');
  await ctx.close();
}

/* 5. Script antiguo: el script no sabe guardar rondas aunque las hojas existan */
{
  console.log('5. Script antiguo con hojas de rondas');
  const { pg, ctx, ctrl } = await entrar('script');
  ctrl.alResponder = (j, accion) => { if (accion === 'data' || accion === 'ping') j.soporta = ['guardarEntrevista', 'guardarOferta']; return j; };
  await oferta(pg, 'O002');
  chk((await pg.$$('#v-oferta .ronda')).length === 2, 'las rondas se ven (son de lectura)');
  chk(/versión anterior y no sabe guardar rondas ni aplicaciones/.test(await pg.innerText('#v-oferta')) && (await pg.$$('#ro-nueva')).length === 0, 'avisa de que el script es antiguo y no enseña botones');
  await aplicacion(pg, 'AP004');
  chk((await pg.$$('#ap-estado')).length === 0, 'en el detalle no hay "Cambiar estado"');
  await ctx.close();
}

/* 6. Datos raros: alumno u oferta que ya no existen, ronda sin aplicaciones, estados fuera de la lista, huecos */
{
  console.log('6. Datos raros');
  const { pg, ctx, log } = await entrar('script', m => {
    m.hojas.Alumnos.m = m.hojas.Alumnos.m.filter(f => f[0] !== 'A002');                       // AP001 se queda sin alumno
    m.hojas.Rondas.m.push(['R006', 'O004', '1', '2026-10-28']);                               // ronda sin aplicaciones
    m.hojas.Aplicaciones.m.push(['AP013', 'A003', 'O004', '1', '2026-10-29', 'Fichado', '', '']);  // estado fuera de la lista
    m.hojas.Aplicaciones.m.push(['AP014', 'A004', 'O777', '1', '2026-10-29', 'Recibida', '', '']);  // oferta que no existe
    m.hojas.Aplicaciones.m.push(['', '', '', '', '', '', '', '']);                            // fila vacía
    m.hojas.Aplicaciones.m.push(['AP015', 'A005', 'O004', '1', '2026-10-29', 'En revisión', 'Otro', '']);   // motivo suelto sin estar descartado
  });
  await oferta(pg, 'O002');
  chk(/alumno A002, ya no está en el Sheet/.test(await pg.innerText('#v-oferta')), 'AP001: alumno que ya no está, sin romper la ficha');
  await aplicacion(pg, 'AP001');
  chk(/alumno A002, ya no está en el Sheet/.test(await pg.innerText('#v-aplicacion .cabecera')) && (await pg.$$('#v-aplicacion [aria-label=Datos] a:has-text("Ver ficha")')).length === 0, 'el detalle lo dice y no enseña enlace a una ficha que no existe');
  await oferta(pg, 'O004');
  chk(/Ronda 1/.test(await pg.innerText('#v-oferta')) && /Fichado: 1/.test(await pg.innerText('#v-oferta .resumen')) && /Valentina Aguirre.*Fichado/s.test(await pg.innerText('#v-oferta .ronda')), 'estado que no está en la lista: se enseña igualmente');
  chk(!/Camila.*Otro/s.test(await pg.innerText('#v-oferta .ronda')) && !/Motivo/.test(await pg.innerText('#v-oferta .ronda a[href$=AP015]')), 'un motivo suelto (sin estar descartado) no se enseña en la lista');
  await aplicacion(pg, 'AP015');
  chk(!/Motivo del descarte/.test(await pg.innerText('#v-aplicacion')), 'ni en el detalle');
  await aplicacion(pg, 'AP014');
  chk(/oferta O777, ya no está en el Sheet/.test(await pg.innerText('#v-aplicacion .cabecera')), 'AP014: oferta que ya no existe');
  await alumno(pg, 'A004');
  chk(/oferta O777, ya no está en el Sheet/.test(await pg.innerText('#v-alumno [aria-label=Aplicaciones]')), 'en la ficha del alumno también');
  chk(await limpio(pg, '#v-alumno'), 'sin "null" ni "undefined"');
  m6: {
    const { pg: p2, ctx: c2 } = await entrar('script', m => { m.hojas.Rondas.m.push(['R006', 'O004', '1', '2026-10-28']); });
    await oferta(p2, 'O004');
    chk(/Sin aplicaciones todavía/.test(await p2.innerText('#v-oferta .ronda')) && /0 aplicaciones/.test(await p2.innerText('#v-oferta .ronda')) && (await p2.$$('#v-oferta .ronda .resumen')).length === 0, 'una ronda sin aplicaciones: "Sin aplicaciones todavía", sin resumen vacío');
    await c2.close();
  }
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 7. Textos peligrosos en las hojas nuevas: siempre texto, nunca código */
{
  console.log('7. Textos peligrosos');
  const { pg, ctx, log } = await entrar('script', m => {
    const mal = '<img src=x onerror="window.__hack=1"><script>window.__hack=2</script>';
    m.hojas.Alumnos.m[3][2] = mal;                                              // nombre de A003
    m.hojas.Aplicaciones.m.push(['AP013', 'A003', 'O004', '1', '2026-10-29', 'Recibida', '', mal]);
    m.hojas.Rondas.m.push(['R006', 'O004', '1', '2026-10-28']);
    m.hojas.Historial.m.push(['H037', 'AP013', '', 'Recibida', '', '2026-10-29', mal]);
    m.hojas.Aplicaciones.m[1][7] = '=HYPERLINK("http://evil","x")';             // notas de AP001
  });
  for (const ruta of ['#/oferta/O004', '#/aplicacion/AP013', '#/alumno/A003', '#/aplicacion/AP001']) {
    await pg.goto(BASE + ruta); await pg.waitForSelector('.view.on .card');
    chk(await pg.evaluate(() => !window.__hack && !document.querySelector('.view.on img, .view.on script')), `${ruta}: nada se ejecuta ni se crea un elemento`);
  }
  await aplicacion(pg, 'AP013');
  chk((await pg.innerText('#v-aplicacion')).includes('<img src=x onerror='), 'el texto sale tal cual, como texto');
  await aplicacion(pg, 'AP001');
  chk((await pg.innerText('#v-aplicacion')).includes('=HYPERLINK("http://evil","x")') && (await pg.$$('#v-aplicacion a[href*=evil]')).length === 0, 'una fórmula en las notas es solo texto');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 8. Móvil pequeño y botones táctiles */
for (const ancho of [390, 320]) {
  console.log(`8. Diseño a ${ancho} px`);
  const { pg, ctx } = await entrar('demo', null, ancho);
  for (const ruta of ['#/oferta/O002', '#/alumno/A028', '#/aplicacion/AP002']) {
    await pg.goto(BASE + ruta); await pg.waitForSelector('.view.on .card');
    chk(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${ruta}: sin desbordamiento horizontal`);
    const alto = await pg.$$eval('.view.on a.alumno, .view.on a.secondary, .view.on a.primary', xs => Math.min(...xs.map(x => x.getBoundingClientRect().height)));
    chk(alto >= 44, `${ruta}: objetivos táctiles >= 44 px (${alto})`);
  }
  await ctx.close();
}

await terminar();
