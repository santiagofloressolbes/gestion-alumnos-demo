// v27, parte C (13): revisión general en móvil. En unas 20 pantallas, a 390 y a 320 px: zonas táctiles ≥ 44 px, contraste ≥ 4,5:1, letra ≥ 12 px y solo de la escala
// de tamaños, campos de 16 px (sin zoom al enfocar) y sin scroll lateral. (Sin zoom, zonas seguras, errores y estados vacíos: ux-zonas.prueba.mjs.)
// UX_RAPIDO=1 mira solo unas pocas pantallas a 390 px (para las roturas a propósito).
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async ({ ancho = 390, alto = 800, script = false, modo = 'normal' } = {}) => {
  const t = await nuevo({ modo });
  await t.ctx.clock.setFixedTime('2026-11-12T12:00:00');
  await t.pg.addInitScript(([s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    sessionStorage.setItem('ini', '1');
  }, [script, URL_OK, CLAVE_PRUEBA]);
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); await pg.waitForTimeout(600); };
const sinErrores = (log, t) => chk(log.consola.length === 0, t + (log.consola.length ? ' → ' + log.consola.join(' | ') : ''));

// La escala de tamaños de letra de la app (rem × 16): pestañas 12, pequeño 13, secundario 14, texto 16, título 17, grande 20, nombre 24, avatar 28.
const ESCALA = [12, 13, 14, 16, 17, 20, 24, 28];

// Mira la pantalla visible y devuelve lo que no cumple.
const revisar = pg => pg.evaluate(escala => {
  const rgb = t => (t.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fondo = e => { let f = e; while (f) { const b = rgb(getComputedStyle(f).backgroundColor); if (b.length < 4 || b[3] > 0.5) return b; f = f.parentElement; } return [23, 23, 27]; };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); };
  const nom = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ').join('.') + ' «' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 28) + '»';
  const out = { tactil: [], contraste: [], letra: [], tamanos: new Set(), campos: [], n: 0 };
  const vista = document.querySelector('.view.on') || document.body;
  for (const e of vista.querySelectorAll('a[href],button,summary,input:not([type=hidden]),select,textarea,[role=button]')) {
    if (!vis(e) || e.closest('.demo, .legal')) continue;
    out.n++;
    const lab = e.closest('label'), r = (lab && e.matches('input') ? lab : e).getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) out.tactil.push(nom(e) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    if (e.matches('input:not([type=checkbox]):not([type=radio]),select,textarea') && parseFloat(getComputedStyle(e).fontSize) < 16) out.campos.push(nom(e));
  }
  const w = document.createTreeWalker(vista, NodeFilter.SHOW_TEXT), vistos = new Set();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const e = n.parentElement;
    if (!n.textContent.trim() || !vis(e) || vistos.has(e) || e.closest('svg,[aria-hidden=true]')) continue;
    vistos.add(e);
    const s = getComputedStyle(e), fs = parseFloat(s.fontSize);
    out.tamanos.add(fs);
    if (fs < 12) out.letra.push(nom(e) + ' ' + fs + 'px');
    if (e.closest('[disabled],[aria-disabled=true],.desactivado')) continue;
    const c = rgb(s.color), b = fondo(e), a = c[3] ?? 1, mix = [0, 1, 2].map(i => c[i] * a + b[i] * (1 - a));
    const ratio = (Math.max(lum(mix), lum(b)) + 0.05) / (Math.min(lum(mix), lum(b)) + 0.05);
    if (ratio < 4.5) out.contraste.push(nom(e) + ' ' + ratio.toFixed(2));
  }
  out.fuera = [...out.tamanos].filter(x => !escala.includes(x));
  out.lateral = document.querySelector('#main').scrollWidth > document.querySelector('#main').clientWidth || document.documentElement.scrollWidth > innerWidth;
  out.tamanos = [...out.tamanos];
  return out;
}, ESCALA);

const RUTAS_DEMO = ['#/', '#/master/MBA%20en%20ingl%C3%A9s', '#/alumno/A001', '#/cv/A001', '#/buscar', '#/ofertas', '#/oferta/O004', '#/ajustes', '#/avisos/sin-solicitudes', '#/alumno/A001/compartir', '#/acceso'];
const RUTAS_SCRIPT = ['#/oferta/nueva', '#/oferta/O001/editar', '#/oferta/O002', '#/oferta/O002/ronda/nueva', '#/aplicacion/AP001', '#/aplicacion/AP001/estado', '#/aplicacion/AP001/correo', '#/alumno/A002', '#/ofertas'];

console.log('13a. Revisión de pantallas: táctil, contraste, letra, escala y scroll lateral');
const RAPIDO = process.env.UX_RAPIDO === '1';
const RAPIDAS = { demo: ['#/', '#/oferta/O004', '#/alumno/A001', '#/buscar', '#/master/MBA%20en%20ingl%C3%A9s'], script: ['#/oferta/nueva', '#/aplicacion/AP001'] };
for (const ancho of RAPIDO ? [390] : [390, 320]) {
  for (const [script, rutas] of [[false, RAPIDO ? RAPIDAS.demo : RUTAS_DEMO], [true, RAPIDO ? RAPIDAS.script : RUTAS_SCRIPT]]) {
    const { pg, ctx, log } = await entrar({ ancho, script });
    const tamanos = new Set(); let total = 0;
    for (const r of rutas) {
      await pg.goto(BASE + r); await pg.waitForTimeout(1200);
      await pg.evaluate(() => document.querySelectorAll('#main details').forEach(d => { d.open = true; }));
      await pg.waitForTimeout(150);
      const x = await revisar(pg);
      total += x.n; x.tamanos.forEach(t => tamanos.add(t));
      chk(x.n > 0, `${r} (${ancho} px): hay elementos que mirar`);
      chk(x.tactil.length === 0, `${r} (${ancho} px): todo lo que se toca mide ≥ 44 px ${x.tactil.slice(0, 3).join(' | ')}`);
      chk(x.contraste.length === 0, `${r} (${ancho} px): contraste ≥ 4,5 en todo el texto ${[...new Set(x.contraste)].slice(0, 3).join(' | ')}`);
      chk(x.letra.length === 0, `${r} (${ancho} px): nada de letra menor de 12 px ${x.letra.slice(0, 3).join(' | ')}`);
      chk(x.fuera.length === 0, `${r} (${ancho} px): solo tamaños de la escala ${x.fuera.join(',')}`);
      chk(x.campos.length === 0, `${r} (${ancho} px): campos de 16 px o más (el iPhone no amplía) ${x.campos.slice(0, 3).join(' | ')}`);
      chk(!x.lateral, `${r} (${ancho} px): sin scroll lateral`);
    }
    chk(total > (RAPIDO ? 30 : 150), `${script ? 'script' : 'demo'} a ${ancho} px: ${total} elementos mirados`);
    chk([...tamanos].every(t => ESCALA.includes(t)), `${script ? 'script' : 'demo'} a ${ancho} px: los tamaños usados son ${[...tamanos].sort((a, b) => a - b).join(', ')}`);
    sinErrores(log, `${script ? 'script' : 'demo'} a ${ancho} px: sin errores en la consola`);
    await ctx.close();
  }
}

await terminar();
