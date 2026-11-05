// Pruebas del margen inferior en iPhone: la app ocupa TODA la pantalla, la barra de pestañas llega hasta abajo
// (también bajo la barra de inicio) y su fondo no deja ninguna franja de otro color.
// Chromium no tiene "safe area"; se simula dándole a las variables --sab/--sal/--sar el valor que daría un iPhone.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async (ancho, alto) => {
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};

// iPhone SE (sin barra de inicio) y modelos con barra de inicio (34 px abajo) y con isla/muesca (59 px arriba).
const MODELOS = [
  ['iPhone SE (320 × 568, sin barra de inicio)', 320, 568, 0, 20],
  ['iPhone 8 (375 × 667, sin barra de inicio)', 375, 667, 0, 20],
  ['iPhone 13 (390 × 844, barra de inicio)', 390, 844, 34, 47],
  ['iPhone 15 Pro Max (430 × 932, barra de inicio)', 430, 932, 34, 59],
];

// Pone las variables del iPhone (y, si hace falta, una altura forzada) sobre la página ya cargada: por JavaScript, que la política de seguridad permite.
const simular = (pg, vars, altura) => pg.evaluate(([v, h]) => {
  for (const [k, x] of Object.entries(v)) document.documentElement.style.setProperty(k, x);
  if (h) { document.documentElement.style.height = h; document.body.style.height = h; }
}, [vars, altura]);
const abrir = async (pg, hash, vars, altura) => { await pg.goto(BASE + hash); await pg.waitForSelector('#tabs'); await simular(pg, vars, altura); };

const medir = pg => pg.evaluate(() => {
  const cs = (e, p) => getComputedStyle(e)[p];
  const app = document.querySelector('#app').getBoundingClientRect();
  const tabs = document.querySelector('#tabs').getBoundingClientRect();
  const main = document.querySelector('#main').getBoundingClientRect();
  const abajo = document.elementFromPoint(Math.round(window.innerWidth / 2), window.innerHeight - 1);
  const rojo = (document.querySelector('#tabs a').getBoundingClientRect());
  return {
    alto: window.innerHeight, ancho: window.innerWidth,
    appArriba: Math.round(app.top), appAbajo: Math.round(app.bottom),
    tabsAbajo: Math.round(tabs.bottom), tabsArriba: Math.round(tabs.top), mainAbajo: Math.round(main.bottom),
    relleno: parseFloat(cs(document.querySelector('#tabs'), 'paddingBottom')),
    fondoTabs: cs(document.querySelector('#tabs'), 'backgroundColor'),
    fondoHtml: cs(document.documentElement, 'backgroundColor'),
    pos: cs(document.querySelector('#app'), 'position'),
    ultimoPixel: abajo ? (abajo.closest('#tabs') ? 'tabs' : abajo.tagName) : null,
    altoPestana: Math.round(rojo.height),
    scrollPagina: document.documentElement.scrollHeight > window.innerHeight,
  };
});

/* 1. Cada modelo de iPhone */
for (const [nombre, ancho, alto, sab, sat] of MODELOS) {
  console.log('1. ' + nombre);
  const { pg, ctx } = await entrar(ancho, alto);
  for (const hash of ['#/', '#/buscar', '#/ofertas', '#/ajustes']) {
    await abrir(pg, hash, { '--sab': sab + 'px', '--sat': sat + 'px' });
    const m = await medir(pg);
    chk(m.pos === 'fixed' && m.appArriba === 0 && m.appAbajo === m.alto, `${hash}: la app ocupa toda la pantalla (de 0 a ${m.alto}): ${m.appArriba}–${m.appAbajo}`);
    chk(m.tabsAbajo === m.alto, `${hash}: la barra de pestañas llega hasta el borde de abajo (${m.tabsAbajo} de ${m.alto})`);
    chk(m.relleno >= sab + 2, `${hash}: deja ${sab} px de margen de seguridad dentro de la barra (relleno ${m.relleno})`);
    chk(m.ultimoPixel === 'tabs', `${hash}: el último punto de la pantalla es de la barra (${m.ultimoPixel})`);
    chk(m.fondoTabs === m.fondoHtml, `${hash}: el fondo de la barra y el de la página son del mismo color: ${m.fondoTabs} / ${m.fondoHtml}`);
    chk(m.mainAbajo <= m.tabsArriba && m.altoPestana >= 44, `${hash}: el contenido acaba donde empieza la barra y las pestañas miden ${m.altoPestana} px`);
    chk(!m.scrollPagina, `${hash}: la página en sí no se desplaza (solo el contenido)`);
  }
  await ctx.close();
}

/* 2. No depende de dvh/vh: aunque la página fuese más baja que la pantalla, la app y la barra llegan abajo */
{
  console.log('2. Aunque html y body se queden cortos');
  const { pg, ctx } = await entrar(390, 844);
  await abrir(pg, '#/', { '--sab': '34px' }, '500px');
  const m = await medir(pg);
  chk(m.appAbajo === m.alto && m.tabsAbajo === m.alto && m.ultimoPixel === 'tabs', `la barra sigue llegando abajo: app ${m.appAbajo}, barra ${m.tabsAbajo}, alto ${m.alto}`);
  await ctx.close();
}

/* 3. Modo horizontal con muesca a los lados */
{
  console.log('3. Horizontal');
  const { pg, ctx } = await entrar(844, 390);
  await abrir(pg, '#/', { '--sab': '21px', '--sal': '47px', '--sar': '47px' });
  const r = await pg.evaluate(() => { const a = document.querySelector('#app'); const cs = getComputedStyle(a); const t = document.querySelector('#tabs a').getBoundingClientRect(); return { izq: parseFloat(cs.paddingLeft), der: parseFloat(cs.paddingRight), primera: t.left, alto: window.innerHeight, abajo: document.querySelector('#tabs').getBoundingClientRect().bottom }; });
  chk(r.izq >= 0 && r.der >= 0 && r.abajo === r.alto, `horizontal: la barra llega abajo (${r.abajo} de ${r.alto})`);
  await ctx.close();
}

/* 4. El código: viewport-fit=cover, env(safe-area-inset-*) y el fondo de la barra */
{
  console.log('4. Código');
  const { pg, ctx } = await entrar(390, 844);
  await pg.goto(BASE); await pg.waitForSelector('#tabs');
  const meta = await pg.getAttribute('meta[name=viewport]', 'content');
  chk(/viewport-fit=cover/.test(meta) && /width=device-width/.test(meta), 'viewport: width=device-width y viewport-fit=cover: ' + meta);
  const css = await (await fetch(BASE + 'css/app.css')).text();
  chk(/safe-area-inset-bottom/.test(css) && /safe-area-inset-top/.test(css) && /safe-area-inset-left/.test(css) && /safe-area-inset-right/.test(css), 'el CSS usa env(safe-area-inset-…) en los cuatro lados');
  chk(/\.tabs\{[^}]*padding:[^}]*var\(--sab\)/.test(css), 'la barra de pestañas suma el margen inferior (--sab) a su relleno');
  chk(/html\{[^}]*background:var\(--tab-bg\)/.test(css), 'el fondo de la página es el de la barra de pestañas');
  chk(/#app\{[^}]*position:fixed/.test(css), '#app es position:fixed (ocupa toda la pantalla)');
  chk(await pg.getAttribute('meta[name=apple-mobile-web-app-capable]', 'content') === 'yes', 'app instalable en iPhone (apple-mobile-web-app-capable)');
  await ctx.close();
}

await terminar();
