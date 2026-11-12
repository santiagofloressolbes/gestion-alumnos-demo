// Pruebas de Ajustes: umbrales de los avisos y firma de los correos (se guardan solo en este móvil).
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async () => {
  const t = await nuevo();
  await t.pg.addInitScript(([u, c]) => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); } }, [URL_OK, CLAVE_PRUEBA]);
  return t;
};
const ir = async (pg) => { await pg.goto(BASE + '#/ajustes'); await pg.waitForSelector('#aj-avisos'); };
const vals = pg => pg.evaluate(() => ['dias', 'ofertas', 'solicitudes', 'porcentaje'].map(k => document.querySelector('#aj-av-' + k).value));
const poner = async (pg, [d, o, s, p]) => { await pg.fill('#aj-av-dias', d); await pg.fill('#aj-av-ofertas', o); await pg.fill('#aj-av-solicitudes', s); await pg.fill('#aj-av-porcentaje', p); };
const guardado = (pg, k) => pg.evaluate(c => localStorage.getItem(c), k);
const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);

console.log('1. Valores por defecto y etiquetas');
{
  const { pg, ctx, log } = await entrar();
  await ir(pg);
  chk(JSON.stringify(await vals(pg)) === JSON.stringify(['30', '3', '5', '80']), 'por defecto: 30 días, 3 ofertas, 5 solicitudes y 80 %: ' + await vals(pg));
  chk(await pg.$$eval('#aj-avisos label', l => l.length) === 4 && await pg.$$eval('#aj-avisos input', i => i.every(x => document.querySelector(`label[for=${x.id}]`))), 'cada campo tiene su etiqueta');
  chk(/nunca bloquean ni ocultan/.test(await pg.innerText('#aj-avisos')), 'dice que los avisos no bloquean nada');
  chk(/solo en este móvil/.test(await pg.innerText('#aj-avisos')), 'dice que se guarda solo en este móvil');
  chk(await guardado(pg, 'gad.avisos') === null, 'sin cambios no hay nada guardado');
  chk(await pg.getAttribute('#aj-av-dias', 'inputmode') === 'numeric', 'teclado numérico en el iPhone');
  chk(await pg.$eval('#aj-av-dias', e => parseFloat(getComputedStyle(e).fontSize)) >= 16, 'letra de 16 px o más (el iPhone no amplía al enfocar)');

  chk(await pg.$$eval('#v-ajustes form, #v-ajustes button[type=submit]', e => e.length) === 0, 'las tarjetas de Ajustes no usan <form> ni botones «submit» (no se mezclan con los formularios de la app)');
  console.log('2. Guardar valores nuevos');
  await poner(pg, ['14', '2', '4', '70']);
  await pg.click('#aj-av-guardar');
  chk(/Guardado en este móvil/.test(await pg.innerText('#aj-av-ok')) && await visible(pg, '#aj-av-ok'), 'dice «Guardado en este móvil.»');
  chk(await guardado(pg, 'gad.avisos') === JSON.stringify({ dias: 14, ofertas: 2, solicitudes: 4, porcentaje: 70 }), 'quedan guardados: ' + await guardado(pg, 'gad.avisos'));
  await pg.reload(); await pg.waitForSelector('#aj-avisos');
  chk(JSON.stringify(await vals(pg)) === JSON.stringify(['14', '2', '4', '70']), 'al volver a abrir Ajustes siguen ahí');
  await poner(pg, [' 021 ', '2', '4', '70']); await pg.click('#aj-av-guardar');
  chk(await pg.inputValue('#aj-av-dias') === '21' && JSON.parse(await guardado(pg, 'gad.avisos')).dias === 21, 'un número con espacios y ceros se ordena: 21');
  await poner(pg, ['30', '3', '5', '80']); await pg.click('#aj-av-guardar');
  chk(await guardado(pg, 'gad.avisos') === null, 'guardar los valores por defecto no deja nada guardado');

  await poner(pg, ['15', '3', '5', '80']); await pg.focus('#aj-av-dias'); await pg.keyboard.press('Enter');
  chk(JSON.parse(await guardado(pg, 'gad.avisos')).dias === 15, 'Enter en un campo = Guardar');
  await pg.fill('#aj-firma', 'Eva'); await pg.focus('#aj-firma'); await pg.keyboard.press('Enter');
  chk(await guardado(pg, 'gad.firma') === 'Eva', 'Enter en la firma = Guardar');
  console.log('3. Valores incorrectos: se dice cuál, no se guarda nada');
  await poner(pg, ['14', '2', '4', '70']); await pg.click('#aj-av-guardar');
  const antes = await guardado(pg, 'gad.avisos');
  for (const [campo, valor, texto] of [['dias', '', /Escribe un número\./], ['dias', 'abc', /número entero/], ['dias', '3.5', /número entero/], ['dias', '-4', /número entero/], ['dias', '0', /entre 1 y 365/], ['dias', '366', /entre 1 y 365/],
    ['ofertas', '51', /entre 1 y 50/], ['solicitudes', '0', /entre 1 y 50/], ['porcentaje', '101', /entre 1 y 100/], ['porcentaje', '0', /entre 1 y 100/]]) {
    await poner(pg, ['14', '2', '4', '70']); await pg.fill('#aj-av-' + campo, valor);
    await pg.click('#aj-av-guardar');
    chk(texto.test(await pg.innerText(`#aj-av-${campo}-error`)) && await visible(pg, `#aj-av-${campo}-error`), `${campo} = «${valor}»: ${await pg.innerText(`#aj-av-${campo}-error`)}`);
    chk(await pg.getAttribute('#aj-av-' + campo, 'aria-invalid') === 'true', `${campo} = «${valor}»: marcado como incorrecto`);
    chk(await guardado(pg, 'gad.avisos') === antes, `${campo} = «${valor}»: no se guarda nada`);
  }
  chk(/revisa los campos/.test(await pg.innerText('#aj-av-error')) && await pg.evaluate(() => document.activeElement.id) === 'aj-av-porcentaje', 'el aviso general lo dice y el foco va al campo incorrecto');
  await poner(pg, ['x', '', '4', '70']); await pg.click('#aj-av-guardar');
  chk(await visible(pg, '#aj-av-dias-error') && await visible(pg, '#aj-av-ofertas-error') && !(await visible(pg, '#aj-av-solicitudes-error')) && await pg.evaluate(() => document.activeElement.id) === 'aj-av-dias', 'varios errores a la vez: solo los campos mal, y el foco en el primero');
  await pg.fill('#aj-av-dias', '10');
  chk(!(await visible(pg, '#aj-av-dias-error')), 'al corregir el campo, su error desaparece');

  console.log('4. Valores por defecto');
  await pg.click('#aj-av-defecto');
  chk(JSON.stringify(await vals(pg)) === JSON.stringify(['30', '3', '5', '80']) && await guardado(pg, 'gad.avisos') === null, '«Valores por defecto» los restablece y borra lo guardado');
  chk(/restablecidos/.test(await pg.innerText('#aj-av-ok')) && !(await visible(pg, '#aj-av-dias-error')), 'lo dice y quita los errores');

  console.log('5. La firma');
  await pg.fill('#aj-firma', '  Ana   <b>Pérez</b>  ');
  await pg.click('#aj-fi-guardar');
  chk(await pg.inputValue('#aj-firma') === 'Ana b Pérez /b' && await guardado(pg, 'gad.firma') === 'Ana b Pérez /b', 'la firma se limpia (espacios, < y >) y se guarda: ' + await guardado(pg, 'gad.firma'));
  await pg.fill('#aj-firma', 'Ana Pérez'); await pg.click('#aj-fi-guardar');
  chk(/Firma guardada/.test(await pg.innerText('#aj-fi-ok')), 'dice que se ha guardado');
  await pg.reload(); await pg.waitForSelector('#aj-firma');
  chk(await pg.inputValue('#aj-firma') === 'Ana Pérez', 'al volver a abrir, la firma sigue');
  chk(await pg.getAttribute('#aj-firma', 'maxlength') === '60', 'máximo 60 caracteres');
  await pg.evaluate(() => { document.querySelector('#aj-firma').removeAttribute('maxlength'); });
  await pg.fill('#aj-firma', 'x'.repeat(90)); await pg.click('#aj-fi-guardar');
  chk((await guardado(pg, 'gad.firma')).length === 60, 'aunque se saltase el máximo, se guardan 60');
  await pg.fill('#aj-firma', '   '); await pg.click('#aj-fi-guardar');
  chk(await guardado(pg, 'gad.firma') === null && /borrada/.test(await pg.innerText('#aj-fi-ok')), 'una firma vacía borra la guardada');
  chk(/Solo el nombre/.test(await pg.innerText('#aj-firma-tarjeta')), 'dice que solo se pone el nombre');

  console.log('6. Nada va al Sheet');
  const guardarGoogle = log.peticiones.filter(p => /"action":"(guardar|registrar|crear|cambiar)/.test(p.cuerpo || ''));
  chk(guardarGoogle.length === 0, 'ninguna petición de guardar al script de Google');
  chk(Object.keys(await pg.evaluate(() => ({ ...localStorage }))).sort().join() === 'gad.clave,gad.url', 'al final no queda nada guardado de más');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

console.log('7. Sin almacenamiento (navegación privada)');
{
  const { pg, ctx } = await entrar();
  await ir(pg);
  await pg.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('lleno'); }; });
  await poner(pg, ['14', '2', '4', '70']); await pg.click('#aj-av-guardar');
  chk(/No se ha podido guardar/.test(await pg.innerText('#aj-av-error')) && !(await visible(pg, '#aj-av-ok')), 'umbrales: lo dice y no afirma que se guardó');
  await pg.fill('#aj-firma', 'Ana'); await pg.click('#aj-fi-guardar');
  chk(/No se ha podido guardar/.test(await pg.innerText('#aj-fi-error')) && !(await visible(pg, '#aj-fi-ok')), 'firma: lo dice y no afirma que se guardó');
  await ctx.close();
}

console.log('8. A 320 px');
{
  const { pg, ctx } = await entrar();
  await pg.setViewportSize({ width: 320, height: 640 });
  await ir(pg);
  chk(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth), 'sin scroll lateral');
  chk(await pg.$$eval('#aj-avisos input, #aj-firma, #aj-avisos button, #aj-fi-guardar', e => e.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth)), 'campos y botones: al menos 44 px de alto y dentro de la pantalla');
  await poner(pg, ['x', '', '0', '999']); await pg.click('#aj-av-guardar');
  chk(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth), 'con los 4 errores a la vista, sigue sin scroll lateral');
  chk(await pg.$$eval('#aj-avisos .error:not([hidden])', e => e.every(x => x.scrollWidth <= x.clientWidth + 1)), 'los mensajes de error no se cortan');
  await ctx.close();
}
await terminar();
