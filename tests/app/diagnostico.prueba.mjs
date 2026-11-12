// Pruebas del bloque "Diagnóstico (temporal)" de Ajustes: mide la ventana, se actualiza al redimensionar, se puede copiar
// y NO lleva datos personales, claves ni direcciones.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async () => {
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  return t;
};
const valor = (pg, clave) => pg.evaluate(k => { for (const c of document.querySelectorAll('#dg-lista .campo')) if (c.querySelector('dt').textContent === k) return c.querySelector('dd').textContent; return null; }, clave);

const { pg, ctx, log } = await entrar();
await pg.goto(BASE + '#/ajustes'); await pg.waitForSelector('#aj-diagnostico');

console.log('1. El bloque y sus datos');
chk(/Diagnóstico \(temporal\)/.test(await pg.innerText('#dg-titulo')), 'el título dice que es temporal');
const claves = await pg.$$eval('#dg-lista dt', e => e.map(x => x.textContent));
for (const k of ['window.innerHeight', 'screen.height', 'visualViewport.height', 'env(safe-area-inset-bottom)', 'Altura de la barra de pestañas', 'Modo standalone (display-mode)', 'navigator.standalone (iOS)', 'Hueco bajo la barra (innerHeight − borde)'])
  chk(claves.includes(k), 'muestra «' + k + '»');
const alto = await pg.evaluate(() => innerHeight);
chk(await valor(pg, 'window.innerHeight') === alto + ' px', 'innerHeight coincide con el real: ' + await valor(pg, 'window.innerHeight'));
chk(await valor(pg, 'Altura de la barra de pestañas') === (await pg.evaluate(() => document.querySelector('#tabs').offsetHeight)) + ' px', 'la altura de la barra coincide con la real');
chk(await valor(pg, 'Modo standalone (display-mode)') === 'no', 'en el navegador: standalone "no"');
chk(await valor(pg, 'Hueco bajo la barra (innerHeight − borde)') === '0 px', 'sin franja: el hueco bajo la barra es 0 px');
chk(await valor(pg, 'env(safe-area-inset-bottom)') === '0 px', 'el margen de seguridad (Chromium) es 0 px');

console.log('2. Medir el margen de seguridad con una variable simulada');
await pg.evaluate(() => document.documentElement.style.setProperty('--sab', '34px'));
await pg.setViewportSize({ width: 390, height: 700 });   // el cambio de tamaño vuelve a medir
await pg.waitForFunction(() => [...document.querySelectorAll('#dg-lista .campo')].some(c => /--sab/.test(c.textContent) && /34 px/.test(c.textContent)));
chk(await valor(pg, 'variable --sab (la que usa la barra)') === '34 px', 'la variable --sab simulada se mide: 34 px');
chk(await valor(pg, 'window.innerHeight') === '700 px', 'al redimensionar se actualiza solo: ' + await valor(pg, 'window.innerHeight'));
chk(parseFloat(await valor(pg, 'Relleno inferior de la barra')) >= 36, 'el relleno de la barra incluye el margen: ' + await valor(pg, 'Relleno inferior de la barra'));
chk((await pg.$$('.sonda-margen')).length === 0, 'las sondas invisibles se quitan después de medir');

console.log('3. Privacidad');
const texto = await pg.innerText('#aj-diagnostico');
chk(!texto.includes(CLAVE_PRUEBA) && !/script\.google|AKfycb|https?:\/\//.test(texto), 'no aparece la clave ni la dirección del script');
chk(!/Quintero|Lucía|@/.test(texto), 'no aparecen nombres ni correos');
await pg.evaluate(() => { navigator.clipboard.writeText = async t => { window.__copiado = t; }; });
await pg.click('#dg-copiar');
await pg.waitForSelector('#dg-estado:not([hidden])');
const copiado = await pg.evaluate(() => window.__copiado);
chk(/window\.innerHeight: 700/.test(copiado) && !copiado.includes(CLAVE_PRUEBA) && !/script\.google|https?:\/\//.test(copiado), 'Copiar: pone los números en el portapapeles, sin clave ni direcciones');
chk(/Copiado/.test(await pg.innerText('#dg-estado')), 'dice que se ha copiado');

console.log('4. Al volver a pintar Ajustes no se acumulan avisos');
await pg.evaluate(() => { const o = window.addEventListener; window.__altas = 0; window.addEventListener = function (t, ...r) { if (t === 'resize') window.__altas++; return o.call(this, t, ...r); }; });
for (let i = 0; i < 3; i++) { await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('.masters .master'); await pg.click('#tabs a[data-tab=ajustes]'); await pg.waitForSelector('#aj-diagnostico'); }
chk(await pg.evaluate(() => window.__altas) === 3, 'cada visita añade un solo aviso (y quita el anterior)');

console.log('5. Interruptor de prueba: forzar la altura de #app');
{
  chk(await valor(pg, 'Interruptor de prueba (altura forzada)') === 'desactivado' && !(await pg.isChecked('#dg-forzar')), 'empieza desactivado');
  chk(await pg.$eval('#app', a => a.style.height === ''), '#app sin altura forzada');
  await pg.setViewportSize({ width: 390, height: 700 });
  await pg.evaluate(() => Object.defineProperty(screen, 'height', { value: 900, configurable: true }));   // un iPhone con la ventana más baja que la pantalla
  await pg.click('label[for=dg-forzar]');
  await pg.waitForFunction(() => [...document.querySelectorAll('#dg-lista .campo')].some(c => /ACTIVADO/.test(c.textContent)));
  chk(await valor(pg, 'Altura de #app') === '900 px' && await valor(pg, 'Borde inferior de la barra') === '900 px', 'activado: #app y la barra miden lo que screen.height (900): ' + await valor(pg, 'Altura de #app'));
  chk(await valor(pg, 'Hueco bajo la barra (innerHeight − borde)') === '-200 px', 'los números en vivo: hueco −200 px: ' + await valor(pg, 'Hueco bajo la barra (innerHeight − borde)'));
  chk(await valor(pg, 'Interruptor de prueba (altura forzada)') === 'ACTIVADO', 'el diagnóstico dice ACTIVADO');
  chk(!(await pg.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).some(k => /forz|altura/i.test(k) || /forz/i.test(localStorage.getItem(k) || '')))), 'no se guarda en el móvil');
  await pg.click('label[for=dg-forzar]');
  await pg.waitForFunction(() => [...document.querySelectorAll('#dg-lista .campo')].some(c => /desactivado/.test(c.textContent)));
  chk(await valor(pg, 'Altura de #app') === '700 px' && await valor(pg, 'Hueco bajo la barra (innerHeight − borde)') === '0 px' && await pg.$eval('#app', a => a.style.height === '' && a.style.bottom === ''), 'desactivado: todo vuelve a 700 y el hueco a 0');
  await pg.click('label[for=dg-forzar]');   // se deja activado y se recarga: la app siempre empieza apagada
  await pg.reload(); await pg.waitForSelector('#aj-diagnostico');
  chk(await valor(pg, 'Interruptor de prueba (altura forzada)') === 'desactivado' && !(await pg.isChecked('#dg-forzar')) && await pg.$eval('#app', a => a.style.height === ''), 'al cerrar y abrir la app, el interruptor vuelve apagado');
  chk(await pg.$eval('.diag-interruptor', e => e.getBoundingClientRect().height >= 44) && /se apaga solo a los 60 segundos/.test(await pg.innerText('.diag-interruptor')), 'mide 44 px y avisa de que se apaga solo');
}
{
  const t = await entrar();
  await t.ctx.clock.install();
  await t.pg.goto(BASE + '#/ajustes'); await t.pg.waitForSelector('#aj-diagnostico');
  await t.pg.click('label[for=dg-forzar]');
  chk(await t.pg.isChecked('#dg-forzar') && await t.pg.$eval('#app', a => a.style.height !== ''), 'seguridad: activado');
  await t.pg.clock.fastForward(59000);
  chk(await t.pg.isChecked('#dg-forzar'), 'a los 59 s sigue activado');
  await t.pg.clock.fastForward(2000);
  chk(!(await t.pg.isChecked('#dg-forzar')) && await t.pg.$eval('#app', a => a.style.height === '' && a.style.bottom === ''), 'a los 60 s se apaga solo y la barra vuelve (no puede dejarte sin barra)');
  await t.ctx.close();
}

console.log('6. A 320 px');
await pg.setViewportSize({ width: 320, height: 640 });
await pg.waitForTimeout(100);
chk(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth), 'sin scroll lateral en 320 px');
chk((await pg.$eval('#dg-copiar', e => e.getBoundingClientRect().height)) >= 44, 'el botón Copiar mide al menos 44 px');
chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
await ctx.close();
await terminar();
