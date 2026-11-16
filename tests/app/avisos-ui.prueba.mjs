// Pruebas de los avisos en pantalla (modo demo, con el reloj fijado en el 12/11/2026 para que no dependan del día en que se pruebe):
// tarjeta de Inicio, lista de cada tipo con su motivo, silenciar 30 días, marca en la lista del máster y tarjeta de la ficha.
import { nuevo, chk, terminar, BASE } from './ayudas.mjs';

const HOY = '2026-11-12T12:00:00';
const entrar = async ({ extraApps = '', hoy = HOY, ancho = 390, alto = 800 } = {}) => {
  const t = await nuevo();
  await t.ctx.clock.setFixedTime(hoy);
  await t.pg.addInitScript(() => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.ajustes', '["conexion","avisos","firma","version"]'); localStorage.setItem('gad.modo', 'demo'); sessionStorage.setItem('ini', '1'); } });
  if (extraApps) {
    await t.pg.route('**/datos-mock/Aplicaciones.csv*', async r => {
      const res = await r.fetch();
      await r.fulfill({ response: res, body: (await res.text()).replace(/\s*$/, '\n') + extraApps });
    });
  }
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);
const sinScrollLateral = pg => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth);
const silencios = pg => pg.evaluate(() => localStorage.getItem('gad.silencios'));
// Cuatro solicitudes más de A001 (con la que ya tiene suman 5), todas dentro del periodo, a las 3 ofertas difundidas.
const EXTRA = 'AP901,A001,O003,1,2026-10-14,Recibida,,\nAP902,A001,O003,2,2026-10-27,Recibida,,\nAP903,A001,O006,1,2026-10-17,Recibida,,\nAP904,A001,O002,1,2026-10-13,Recibida,,\n';

console.log('1. Tarjeta de Inicio');
{
  const { pg, ctx, log } = await entrar();
  await ir(pg, '#/', '.masters .master');
  await pg.waitForSelector('#in-avisos:not([hidden])');
  chk(/Avisos/.test(await pg.innerText('#in-av-titulo')) && /no bloquean nada/.test(await pg.innerText('#in-avisos')), 'hay una tarjeta «Avisos» que dice que no bloquea nada');
  chk(/Sin solicitudes\s*21 alumnos/.test((await pg.innerText('#in-av-sin-solicitudes')).replace(/\n/g, ' ')), 'Sin solicitudes: 21 alumnos: ' + (await pg.innerText('#in-av-sin-solicitudes')).replace(/\n/g, ' '));
  chk(/Aplica a todo\s*Ningún alumno/.test((await pg.innerText('#in-av-aplica-a-todo')).replace(/\n/g, ' ')), 'Aplica a todo: ningún alumno');
  chk(await pg.$$eval('.masters .master', m => m.length) === 14, 'los 14 botones de programa siguen ahí');
  chk(await pg.$$eval('#in-avisos a', a => a.every(x => x.getBoundingClientRect().height >= 44)), 'las filas miden al menos 44 px');

  console.log('2. Lista de «Sin solicitudes» con su motivo');
  await pg.click('#in-av-sin-solicitudes'); await pg.waitForSelector('#v-avisos .aviso-item');
  chk(await pg.evaluate(() => location.hash) === '#/avisos/sin-solicitudes' && await pg.innerText('#titulo') === 'Sin solicitudes' && await pg.getAttribute('#tabs a[data-tab=inicio]', 'aria-current') === 'page', 'dirección, título y pestaña Inicio');
  chk(await pg.innerText('#av-periodo') === 'Se mira del 13 de octubre al 12 de noviembre (30 días). En ese tiempo se difundieron 3 ofertas.', 'dice qué periodo mira: ' + await pg.innerText('#av-periodo'));
  chk(await pg.$$eval('#v-avisos .aviso-item', l => l.length) === 21, '21 alumnos en la lista');
  const motivos = await pg.$$eval('#v-avisos .aviso-motivo', e => e.map(x => x.textContent));
  chk(motivos.every(m => m === 'Ninguna solicitud en los últimos 30 días, y en ese tiempo se difundieron 3 ofertas. Salta si se difunden 3 o más.'), 'cada alumno dice por qué: ' + motivos[0]);
  chk(await pg.$('#v-avisos a[href="#/alumno/A002"]') !== null && await pg.$('#v-avisos a[href="#/alumno/A004"]') === null && await pg.$('#v-avisos a[href="#/alumno/A001"]') === null, 'sale A002 (solo tiene una solicitud antigua), no A004 (contratado) ni A001 (ha aplicado hace poco)');
  const nombres = await pg.$$eval('#v-avisos .aviso-item .alumno-texto b', e => e.map(x => x.textContent));
  chk(JSON.stringify(nombres) === JSON.stringify([...nombres].sort((a, b) => a.localeCompare(b, 'es'))), 'ordenados por nombre');
  const texto = await pg.innerText('#v-avisos');
  chk(!/Ciudadano|Residente|permiso|nota/i.test(texto.replace(/Solo es un aviso: no bloquea nada\./, '')), 'la lista no enseña situación de trabajo ni notas');
  chk(await pg.$$eval('#v-avisos .aviso-item button', b => b.every(x => /^Silenciar 30 días$/.test(x.textContent) && /Silenciar 30 días el aviso de /.test(x.getAttribute('aria-label')) && x.getBoundingClientRect().height >= 44)), 'cada fila tiene «Silenciar 30 días» (con nombre accesible y 44 px)');

  console.log('3. Silenciar 30 días');
  await pg.click('button[data-aviso="A002|sin-solicitudes"]');
  await pg.waitForSelector('#av-sil-titulo');
  chk(/^Silenciado hasta el 12 de diciembre: Mateo Ferrer\.$/.test(await pg.innerText('#av-estado')), 'avisa de hasta cuándo: ' + await pg.innerText('#av-estado'));
  chk(await pg.$$eval('#v-avisos .avisos-lista:first-of-type .aviso-item', l => l.length) === 20 && /Silenciados \(1\)/.test(await pg.innerText('#av-sil-titulo')), 'quedan 20 activos y 1 en «Silenciados (1)»');
  chk(/Silenciado hasta el 12 de diciembre\./.test(await pg.innerText('#v-avisos .aviso-silencio')) && /Quitar silencio/.test(await pg.innerText('button[data-aviso="A002|sin-solicitudes"]')), 'el silenciado lo dice y ofrece «Quitar silencio»');
  chk(await silencios(pg) === '{"A002|sin-solicitudes":"2026-12-12"}', 'solo se guarda el identificador y la fecha, en este móvil: ' + await silencios(pg));
  await pg.click('#v-avisos .volver'); await pg.waitForSelector('#in-av-sin-solicitudes');
  chk(/20 alumnos · 1 silenciado/.test((await pg.innerText('#in-av-sin-solicitudes')).replace(/\n/g, ' ')), 'Inicio se actualiza sin recargar: 20 alumnos · 1 silenciado: ' + (await pg.innerText('#in-av-sin-solicitudes')).replace(/\n/g, ' '));
  await pg.reload(); await pg.waitForSelector('#in-av-sin-solicitudes');
  chk(/20 alumnos · 1 silenciado/.test((await pg.innerText('#in-av-sin-solicitudes')).replace(/\n/g, ' ')), 'tras cerrar y abrir la app el silencio sigue');

  console.log('4. Marca en la lista del máster y ficha');
  await ir(pg, '#/master/' + encodeURIComponent('MBA en inglés'), '#v-master a.alumno');
  const marcas = await pg.$$eval('#v-master .etiqueta-aviso', e => e.map(x => x.textContent));
  chk(marcas.length > 0 && marcas.every(m => m === 'Aviso: sin solicitudes'), 'los alumnos con aviso llevan «Aviso: sin solicitudes» (texto, no solo color): ' + marcas.length);
  chk(!(await pg.$eval('#v-master a[href="#/alumno/A002"]', a => a.textContent.includes('Aviso'))), 'A002 está silenciado: no lleva la marca');
  await pg.click('#v-master a[href="#/alumno/A001"]'); await pg.waitForSelector('#v-alumno .cabecera');
  chk(!(await visible(pg, '#al-avisos')), 'A001 (ha aplicado hace poco): la ficha no tiene tarjeta de aviso');
  await ir(pg, '#/avisos/sin-solicitudes', '#v-avisos .aviso-item');
  await pg.click('#v-avisos a[href="#/alumno/A003"]'); await pg.waitForSelector('#al-avisos:not([hidden])');
  chk(/^Aviso/.test(await pg.innerText('#al-av-titulo')) && /Ninguna solicitud en los últimos 30 días/.test(await pg.innerText('#al-avisos')), 'la ficha tiene la tarjeta «Aviso» con el motivo');
  chk(await pg.innerText('#v-alumno .volver') === 'Avisos', 'desde un aviso, «atrás» vuelve a Avisos');
  chk(await visible(pg, '#al-compartir') && (await pg.$$eval('#v-alumno .secondary, #v-alumno .primary', e => e.length)) >= 2, 'con un aviso, la ficha sigue igual: Compartir perfil y el resto funcionan (nada bloqueado)');
  await pg.click('#al-avisos button');
  await pg.waitForSelector('#al-av-estado');
  chk(/Silenciado hasta el 12 de diciembre/.test(await pg.innerText('#al-av-estado')) && /Quitar silencio/.test(await pg.innerText('#al-avisos button')), 'se puede silenciar desde la ficha');
  await pg.click('#al-avisos button');
  chk(/Silencio quitado/.test(await pg.innerText('#al-av-estado')) && /Silenciar 30 días/.test(await pg.innerText('#al-avisos button')), 'y quitar el silencio');
  await pg.click('#v-alumno .volver'); await pg.waitForSelector('#v-avisos .aviso-item');
  chk(await pg.evaluate(() => location.hash) === '#/avisos/sin-solicitudes', 'vuelve a la lista de avisos');
  chk(log.consola.length === 0 && log.externas.length === 0, 'sin errores de consola/CSP ni peticiones externas: ' + log.consola.concat(log.externas).join(' | '));
  chk(!log.peticiones.length, 'en demo no se habla con el script de Google');
  await ctx.close();
}

console.log('5. Quitar el silencio desde la lista');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/avisos/sin-solicitudes', '#v-avisos .aviso-item');
  await pg.click('button[data-aviso="A002|sin-solicitudes"]'); await pg.waitForSelector('#av-sil-titulo');
  await pg.click('button[data-aviso="A002|sin-solicitudes"]');
  await pg.waitForFunction(() => !document.querySelector('#av-sil-titulo'));
  chk(await pg.$$eval('#v-avisos .aviso-item', l => l.length) === 21 && await silencios(pg) === null, 'Quitar silencio: vuelve a los 21 y no queda nada guardado');
  chk(/Silencio quitado: Mateo Ferrer/.test(await pg.innerText('#av-estado')), 'lo confirma');
  await ctx.close();
}

console.log('6. «Aplica a todo»');
{
  const { pg, ctx } = await entrar({ extraApps: EXTRA });
  await ir(pg, '#/', '#in-av-aplica-a-todo');
  chk(/Aplica a todo\s*1 alumno/.test((await pg.innerText('#in-av-aplica-a-todo')).replace(/\n/g, ' ')), 'Inicio: Aplica a todo, 1 alumno');
  chk(/Sin solicitudes\s*21 alumnos/.test((await pg.innerText('#in-av-sin-solicitudes')).replace(/\n/g, ' ')), 'y los 21 sin solicitudes no cambian');
  await pg.click('#in-av-aplica-a-todo'); await pg.waitForSelector('#v-avisos .aviso-item');
  chk(await pg.$$eval('#v-avisos .aviso-item', l => l.length) === 1 && await pg.$('#v-avisos a[href="#/alumno/A001"]') !== null, 'la lista tiene a A001');
  const m = await pg.innerText('#v-avisos .aviso-motivo');
  chk(m === '5 solicitudes en los últimos 30 días, a 3 de las 3 ofertas difundidas (100 %). De ellas, 2 no encajan según el match. Salta con 5 o más solicitudes y un 80 % o más de las ofertas.', 'el motivo lleva los números, el dato del match y la regla: ' + m);
  await ir(pg, '#/master/' + encodeURIComponent('MBA en inglés'), '#v-master .alumno');
  chk(/Aviso: aplica a todo/.test(await pg.innerText('#v-master a[href="#/alumno/A001"]')), 'la lista del máster marca a A001: «Aviso: aplica a todo»');
  await pg.click('#v-master a[href="#/alumno/A001"]'); await pg.waitForSelector('#al-avisos:not([hidden])');
  chk(/Salta con 5 o más solicitudes/.test(await pg.innerText('#al-avisos')), 'la ficha explica por qué');
  await ctx.close();
}

console.log('7. Cambiar los umbrales en Ajustes cambia los avisos');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/ajustes', '#aj-avisos');
  await pg.fill('#aj-av-ofertas', '4'); await pg.click('#aj-av-guardar');
  await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('#in-av-sin-solicitudes');
  chk(/Ningún alumno/.test(await pg.innerText('#in-av-sin-solicitudes')), 'con 4 ofertas mínimas (solo hay 3), nadie salta en «Sin solicitudes»');
  await pg.click('#in-av-sin-solicitudes'); await pg.waitForSelector('#av-nadie');
  chk(/Ningún alumno tiene este aviso/.test(await pg.innerText('#av-nadie')), 'la lista lo dice con claridad');
  await ir(pg, '#/ajustes', '#aj-avisos');
  await pg.click('#aj-av-defecto');
  await pg.click('#tabs a[data-tab=inicio]'); await pg.waitForSelector('#in-av-sin-solicitudes');
  chk(/21 alumnos/.test(await pg.innerText('#in-av-sin-solicitudes')), 'con los valores por defecto vuelven los 21');
  await ctx.close();
}

console.log('8. Con el paso del tiempo (sin rondas en el periodo) no hay avisos');
{
  const { pg, ctx } = await entrar({ hoy: '2026-12-20T12:00:00' });
  await ir(pg, '#/', '#in-av-sin-solicitudes');
  chk(/Ningún alumno/.test(await pg.innerText('#in-av-sin-solicitudes')) && /Ningún alumno/.test(await pg.innerText('#in-av-aplica-a-todo')), 'el 20/12 no se ha difundido nada en 30 días: no salta nadie');
  await ctx.close();
}

console.log('9. Dirección de aviso rara');
{
  const { pg, ctx } = await entrar();
  await pg.goto(BASE + '#/avisos/otra-cosa'); await pg.waitForSelector('#v-inicio .masters, #v-inicio .estado');
  chk(await pg.evaluate(() => location.hash) === '#/avisos/otra-cosa' && await visible(pg, '#v-inicio'), 'un tipo desconocido lleva a Inicio sin romper nada');
  await ctx.close();
}

console.log('10. A 320 px');
{
  const { pg, ctx } = await entrar({ extraApps: EXTRA, ancho: 320, alto: 640 });
  await ir(pg, '#/', '#in-av-sin-solicitudes');
  chk(await sinScrollLateral(pg), 'Inicio: sin scroll lateral');
  await ir(pg, '#/avisos/aplica-a-todo', '#v-avisos .aviso-item');
  chk(await sinScrollLateral(pg), 'lista de avisos: sin scroll lateral');
  chk(await pg.$$eval('#v-avisos .aviso-motivo, #v-avisos .aviso-item .alumno-texto', e => e.every(x => x.scrollWidth <= x.clientWidth + 1)), 'el motivo y el nombre no se cortan');
  chk(await pg.$$eval('#v-avisos button', b => b.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth)), 'los botones caben y miden 44 px');
  await pg.click('button[data-aviso="A001|aplica-a-todo"]'); await pg.waitForSelector('#av-sil-titulo');
  chk(await sinScrollLateral(pg), 'con un aviso silenciado, sin scroll lateral');
  await ir(pg, '#/master/' + encodeURIComponent('MBA en inglés'), '#v-master .alumno');
  chk(await sinScrollLateral(pg) && await pg.$$eval('#v-master .alumno-texto', e => e.every(x => x.scrollWidth <= x.clientWidth + 1)), 'lista del máster con marcas: sin scroll lateral y sin cortes');
  await ir(pg, '#/alumno/A003', '#al-avisos:not([hidden])');
  chk(await sinScrollLateral(pg) && await pg.$eval('#al-avisos button', b => b.getBoundingClientRect().height >= 44), 'ficha con aviso: sin scroll lateral y botón de 44 px');
  await ctx.close();
}
await terminar();
