// v28, parte 4: el móvil en horizontal. Poca altura: el título grande se oculta (sigue ahí para los lectores de pantalla),
// la cabecera deja de ocupar una fila y el botón de actualizar flota arriba a la derecha. La barra inferior no se toca.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async ({ ancho, alto, script = true }) => {
  const t = await nuevo();
  await t.ctx.clock.setFixedTime('2026-11-12T12:00:00');
  await t.pg.addInitScript(([s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    sessionStorage.setItem('ini', '1');
  }, [script, URL_OK, CLAVE_PRUEBA]);
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); await pg.waitForTimeout(500); };
const medir = pg => pg.evaluate(() => {
  const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; }, cs = s => getComputedStyle(document.querySelector(s));
  const b = r('#refrescar'), h1 = r('#titulo'), main = r('#main'), tabs = r('#tabs'), header = r('header');
  const visible = !document.querySelector('#refrescar').hidden;
  const centro = b && visible ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
  return {
    alto: innerHeight, ancho: innerWidth, headerAlto: cs('header').position === 'absolute' ? 0 : header.height,   // flotante = no ocupa fila
     h1Ancho: h1.width, h1Alto: h1.height, h1Display: cs('#titulo').display, h1Vis: cs('#titulo').visibility, h1Texto: document.querySelector('#titulo').textContent,
    b: visible && b ? { l: b.left, r: b.right, t: b.top, w: b.width, h: b.height } : null, botonEncima: !!centro && (centro.id === 'refrescar' || document.querySelector('#refrescar').contains(centro)),
    mainTop: main.top, mainAlto: main.height, mainPadDer: parseFloat(cs('#main').paddingRight), tabsAlto: tabs.height, tabsTop: tabs.top,
    tabsLabels: [...document.querySelectorAll('#tabs a span')].map(s => getComputedStyle(s).display !== 'none').every(Boolean),
    conClase: document.querySelector('#app').classList.contains('con-refrescar'),
    appDer: document.querySelector('#app').getBoundingClientRect().right,
    lateral: document.documentElement.scrollWidth > innerWidth || document.querySelector('#main').scrollWidth > document.querySelector('#main').clientWidth,
    encabezados: document.querySelectorAll('h1').length,
    primeroTop: (() => { const e = document.querySelector('#main .view.on').firstElementChild; return e ? e.getBoundingClientRect().top - main.top : 0; })(),
  };
});

console.log('1. En horizontal, la cabecera no ocupa una fila y el título grande se oculta');
const base = await (async () => { const { pg, ctx } = await entrar({ ancho: 390, alto: 844 }); await ir(pg, '#/ofertas', '#v-ofertas .card, #v-ofertas li'); const x = await medir(pg); await ctx.close(); return x; })();
chk(base.headerAlto >= 48 && base.h1Ancho > 50 && base.mainPadDer === 24, `en vertical todo sigue igual: cabecera de ${Math.round(base.headerAlto)} px, título visible (${Math.round(base.h1Ancho)} px de ancho), margen de 24 px`);
for (const [ancho, alto, nombre] of [[844, 390, 'iPhone 14 en horizontal'], [667, 375, 'iPhone SE en horizontal'], [568, 320, 'iPhone 5 en horizontal'], [932, 430, 'iPhone Pro Max en horizontal']]) {
  const { pg, ctx, log } = await entrar({ ancho, alto });
  for (const hash of ['#/ofertas', '#/', '#/buscar', '#/oferta/O005', '#/alumno/A001']) {
    await ir(pg, hash, '#main .view.on');
    const x = await medir(pg);
    if (hash === '#/ofertas') {
      chk(x.headerAlto <= 1, `${nombre} (${ancho}×${alto}): la cabecera ya no ocupa una fila (${Math.round(x.headerAlto)} px)`);
      chk(base.mainTop - x.mainTop >= 40 && x.mainTop <= 12, `${nombre}: el contenido empieza ${Math.round(base.mainTop - x.mainTop)} px más arriba que en vertical (a ${Math.round(x.mainTop)} px del borde)`);
      chk(x.h1Ancho <= 1 && x.h1Alto <= 1 && x.h1Display !== 'none' && x.h1Vis !== 'hidden' && x.h1Texto.length > 3, `${nombre}: el título grande no se ve, pero sigue en la página para lectores de pantalla («${x.h1Texto}»)`);
      chk(x.primeroTop <= base.primeroTop + 1, `${nombre}: lo primero de la pantalla queda tan arriba como en vertical (${Math.round(x.primeroTop)} px bajo el borde, en vertical ${Math.round(base.primeroTop)})`);
      chk(x.encabezados === 1, `${nombre}: un solo h1`);
      chk(Math.abs(x.tabsAlto - base.tabsAlto) <= 1 && x.tabsLabels, `${nombre}: la barra inferior no se ha tocado (${Math.round(x.tabsAlto)} px, con sus palabras)`);
    }
    chk(x.b && x.b.w >= 44 && x.b.h >= 44 && x.b.t >= 0 && x.b.r <= x.ancho && x.b.l >= 0, `${nombre} ${hash}: el botón de actualizar se ve entero y se toca en ≥ 44 px`);
    chk(x.b && x.botonEncima && x.b.r > x.appDer - 24, `${nombre} ${hash}: está arriba a la derecha de la app y no lo tapa nada`);
    chk(x.conClase && x.mainPadDer >= 24 + 44, `${nombre} ${hash}: el contenido deja libre el hueco del botón (margen derecho ${x.mainPadDer} px)`);
    chk(!x.lateral, `${nombre} ${hash}: sin scroll lateral`);
    chk(x.mainAlto >= alto - x.tabsAlto - 12, `${nombre} ${hash}: el contenido gana la altura de la cabecera (${Math.round(x.mainAlto)} px de ${alto} con la barra de ${Math.round(x.tabsAlto)})`);
  }
  chk(log.consola.length === 0, `${nombre}: sin errores en la consola ` + log.consola.join(' | '));
  await ctx.close();
}

console.log('2. Zonas seguras en horizontal (muesca a un lado, barra de inicio abajo)');
{
  const { pg, ctx } = await entrar({ ancho: 844, alto: 390 });
  await ir(pg, '#/ofertas', '#v-ofertas .card, #v-ofertas li');
  await pg.evaluate(() => { const s = document.documentElement.style; s.setProperty('--sat', '0px'); s.setProperty('--sab', '21px'); s.setProperty('--sal', '47px'); s.setProperty('--sar', '47px'); });
  await pg.waitForTimeout(150);
  const x = await medir(pg);
  chk(x.b && x.appDer - x.b.r >= 47 + 11, `con la muesca a un lado, el botón queda dentro de la zona segura (a ${Math.round(x.appDer - (x.b?.r || 0))} px del borde, ≥ 47 + 12)`);
  chk(x.botonEncima, 'y sigue sin taparlo nada');
  await pg.evaluate(() => document.documentElement.style.setProperty('--sat', '20px'));
  const y = await medir(pg);
  chk(y.b && y.b.t >= 20, `si el sistema reserva arriba, el botón queda por debajo (${Math.round(y.b?.t)} px ≥ 20)`);
  await ctx.close();
}

console.log('3. Sin botón (formularios y demo) no se reserva ningún hueco');
{
  const { pg, ctx } = await entrar({ ancho: 844, alto: 390 });
  await ir(pg, '#/oferta/nueva', '#v-oferta-form form');
  const x = await medir(pg);
  chk(!x.conClase && x.mainPadDer === 24, `en un formulario no se reserva el hueco (margen derecho ${x.mainPadDer} px)`);
  chk(x.mainTop <= 12 && x.headerAlto <= 1, `y el contenido empieza arriba del todo (${Math.round(x.mainTop)} px)`);
  await ctx.close();
  const d = await entrar({ ancho: 844, alto: 390, script: false });
  await ir(d.pg, '#/ofertas', '#v-ofertas .card, #v-ofertas li');
  const z = await medir(d.pg);
  chk(!z.conClase && z.mainPadDer === 24, 'en la demo, igual: sin hueco reservado');
  await d.ctx.close();
}

console.log('4. Tabletas y pantallas altas no cambian');
for (const [ancho, alto] of [[1024, 768], [768, 1024], [390, 844]]) {
  const { pg, ctx } = await entrar({ ancho, alto });
  await ir(pg, '#/ofertas', '#v-ofertas .card, #v-ofertas li');
  const x = await medir(pg);
  chk(x.headerAlto >= 48 && x.h1Ancho > 50 && x.mainPadDer === 24, `${ancho}×${alto}: cabecera de ${Math.round(x.headerAlto)} px con título visible y margen de 24 px`);
  chk(x.b && x.b.w >= 44 && x.botonEncima, `${ancho}×${alto}: el botón sigue a la derecha del título`);
  await ctx.close();
}

console.log('5. Al girar el móvil se adapta sin recargar');
{
  const { pg, ctx } = await entrar({ ancho: 390, alto: 844 });
  await ir(pg, '#/ofertas', '#v-ofertas .card, #v-ofertas li');
  const a = await medir(pg);
  await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(250);
  const b = await medir(pg);
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(250);
  const c = await medir(pg);
  chk(a.headerAlto >= 48 && b.headerAlto <= 1 && c.headerAlto >= 48, `vertical ${Math.round(a.headerAlto)} px → horizontal ${Math.round(b.headerAlto)} px → vertical ${Math.round(c.headerAlto)} px`);
  chk(c.h1Ancho > 50 && c.mainPadDer === 24, 'al volver a vertical, el título y los márgenes vuelven');
  await ctx.close();
}

await terminar();
