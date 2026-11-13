// Pruebas de «Copiar»: en los borradores de correo, en Compartir perfiles y solo se escribe TEXTO PLANO en el portapapeles
// (nada de HTML, enlaces ni formato: al pegar en Notas se veía todo subrayado como un enlace).
// El portapapeles se espía: se anota qué función se llama y con qué tipos; así se ve exactamente lo que se escribiría.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const todosJs = d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f);

/* 1. El código: un solo sitio que escribe en el portapapeles, y solo text/plain */
console.log('1. El código');
{
  const archivos = [...todosJs('js'), ...todosJs('js/util'), ...todosJs('js/vistas'), ...todosJs('js/data')];
  const fuentes = Object.fromEntries(archivos.map(f => [f, leer(f)]));
  const conPortapapeles = archivos.filter(f => /navigator\.clipboard|execCommand\(/.test(fuentes[f]));
  chk(JSON.stringify(conPortapapeles) === JSON.stringify(['js/util/trabajo.js']), 'solo js/util/trabajo.js toca el portapapeles: ' + conPortapapeles.join(', '));
  chk(!archivos.some(f => /text\/html|text\/uri-list|application\/|text\/rtf/.test(fuentes[f]) && /clipboard|ClipboardItem/.test(fuentes[f])), 'ningún tipo que no sea text/plain se menciona junto al portapapeles');
  chk(!archivos.some(f => /ClipboardItem\(\{(?![^}]*'text\/plain'\s*:)/.test(fuentes[f])), 'todo ClipboardItem lleva text/plain');
  chk(/ClipboardItem\(\{ 'text\/plain': new Blob\(\[t\], \{ type: 'text\/plain' \}\) \}\)/.test(fuentes['js/util/trabajo.js']), 'el ClipboardItem tiene UN solo tipo: text/plain, hecho de una cadena');
  chk(!archivos.some(f => /getSelection\(\)|\.select\(\)|createRange|selectNode/.test(fuentes[f].split('area.select()').join(''))), 'nadie copia una selección de la página (solo el textarea oculto del respaldo)');
  chk(['js/vistas/correo.js', 'js/vistas/compartir.js'].every(f => /copiarTexto|copiarAlPortapapeles/.test(fuentes[f])), 'correo y compartir copian con la misma función');
}

const entrar = async (modo = 'demo') => {
  const t = await nuevo();
  await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin }).catch(() => {});
  await t.pg.addInitScript(([m, u, c]) => {
    if (!sessionStorage.getItem('ini')) {
      if (m === 'demo') localStorage.setItem('gad.modo', 'demo'); else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
      localStorage.setItem('gad.firma', 'Ana Pérez'); localStorage.setItem('gad.ajustes', '["conexion"]');
      sessionStorage.setItem('ini', '1');
    }
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  return t;
};
// Espía: apunta cada escritura {via, tipos, texto}. "con" elige qué funciones existen (para probar cada respaldo).
const espiar = (pg, { write = true, writeText = true, rechazarWrite = false } = {}) => pg.evaluate(([w, wt, rw]) => {
  window.__escrituras = []; window.__copiasDoc = [];
  const c = navigator.clipboard;
  c.write = w ? async items => {
    if (rw) { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; }
    for (const it of items) window.__escrituras.push({ via: 'write', tipos: [...it.types], texto: await (await it.getType('text/plain')).text() });
  } : undefined;
  c.writeText = wt ? async t => { window.__escrituras.push({ via: 'writeText', tipos: ['text/plain'], texto: t }); } : undefined;
  document.execCommand = cmd => { const a = document.activeElement; window.__copiasDoc.push({ cmd, etiqueta: a && a.tagName, valor: a && a.value, enlace: !!(a && a.closest('a')), seleccion: String(getSelection()) }); return true; };
}, [write, writeText, rechazarWrite]);
const escrituras = pg => pg.evaluate(() => window.__escrituras);
const copias = pg => pg.evaluate(() => window.__copiasDoc);
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };

// Las dos pantallas con su botón y su vista previa.
const FUENTES = [
  ['Borrador de correo', '#/aplicacion/AP001/correo', '#co-vista', '#co-copiar', '#co-estado'],
  ['Compartir un perfil', '#/alumno/A001/compartir', '#cp-vista', '#cp-copiar', '#cp-estado'],
];
const textoVista = (pg, vista) => pg.evaluate(v => document.querySelector(v).textContent, vista);

console.log('2. Normal: un solo ClipboardItem con text/plain');
for (const [nombre, hash, vista, boton, estado] of FUENTES) {
  const { pg, ctx } = await entrar();
  await ir(pg, hash, vista);
  await espiar(pg);
  await pg.click(boton);
  await pg.waitForSelector(estado + ':not([hidden])');
  const e = await escrituras(pg);
  chk(e.length === 1 && e[0].via === 'write', `${nombre}: una sola escritura, con clipboard.write`);
  chk(e[0] && JSON.stringify(e[0].tipos) === '["text/plain"]', `${nombre}: los tipos escritos son EXACTAMENTE ["text/plain"]: ` + JSON.stringify(e[0]?.tipos));
  chk(e[0]?.texto === await textoVista(pg, vista), `${nombre}: el texto es exactamente la vista previa`);
  else chk(/window\.innerHeight: \d+/.test(e[0]?.texto || '') && !/<|&lt;|href/.test(e[0]?.texto || ''), `${nombre}: el texto es una lista de «clave: valor» sin marcas HTML`);
  chk(!/<[a-z!\/]|&[a-z]+;|\bhref=|\bmailto:/i.test(e[0]?.texto || ''), `${nombre}: el texto no lleva etiquetas HTML ni enlaces`);
  chk(await pg.evaluate(v => !document.querySelector(v).closest('a') && !document.querySelector(v).querySelector('a'), vista), `${nombre}: la vista previa no es un enlace ni lleva ninguno dentro`);
  await ctx.close();
}

console.log('3. Respaldo 1: sin ClipboardItem (clipboard.write), con writeText');
for (const [nombre, hash, vista, boton, estado] of FUENTES) {
  const { pg, ctx } = await entrar();
  await ir(pg, hash, vista);
  await espiar(pg, { write: false });
  await pg.click(boton); await pg.waitForSelector(estado + ':not([hidden])');
  const e = await escrituras(pg);
  chk(e.length === 1 && e[0].via === 'writeText' && typeof e[0].texto === 'string' && e[0].texto.length > 10, `${nombre}: usa writeText (una cadena)`);
  await ctx.close();
}

console.log('4. Si write falla (p. ej. permiso denegado), se prueba writeText y se copia igual');
{
  const [nombre, hash, vista, boton, estado] = FUENTES[0];
  const { pg, ctx } = await entrar();
  await ir(pg, hash, vista);
  await espiar(pg, { rechazarWrite: true });
  await pg.click(boton); await pg.waitForSelector(estado + ':not([hidden])');
  const e = await escrituras(pg);
  chk(e.length === 1 && e[0].via === 'writeText' && e[0].texto === await textoVista(pg, vista), `${nombre}: copia con writeText y el texto de la vista previa`);
  chk(/Copiado/.test(await pg.innerText(estado)), 'lo dice');
  await ctx.close();
}

console.log('5. Respaldo 2: sin portapapeles moderno, copia desde un textarea (texto plano)');
for (const [nombre, hash, vista, boton, estado] of FUENTES) {
  const { pg, ctx } = await entrar();
  await ir(pg, hash, vista);
  await espiar(pg, { write: false, writeText: false });
  await pg.evaluate(() => { const c = navigator.clipboard; c.write = undefined; c.writeText = async () => { throw new Error('no'); }; });
  await pg.click(boton); await pg.waitForSelector(estado + ':not([hidden])');
  const c = await copias(pg);
  chk(c.length === 1 && c[0].cmd === 'copy' && c[0].etiqueta === 'TEXTAREA', `${nombre}: se copia desde un TEXTAREA (no desde la vista previa, un enlace ni una selección): ` + JSON.stringify(c[0]?.etiqueta));
  chk(c[0] && c[0].enlace === false, `${nombre}: el elemento no está dentro de un enlace`);
  chk(c[0]?.valor === await textoVista(pg, vista), `${nombre}: el textarea lleva exactamente la vista previa`);
  chk((await pg.$$('textarea.cp-oculto')).length === 0, `${nombre}: el textarea oculto se quita después`);
  await ctx.close();
}

console.log('6. Si nada funciona, lo dice sin afirmar que copió');
{
  const [nombre, hash, vista, boton] = FUENTES[0];
  const { pg, ctx } = await entrar();
  await ir(pg, hash, vista);
  await espiar(pg, { write: false, writeText: false });
  await pg.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('no'); }; document.execCommand = () => false; });
  await pg.click(boton); await pg.waitForSelector('#co-error:not([hidden])');
  chk(/No se ha podido copiar/.test(await pg.innerText('#co-error')) && !/Copiado/.test(await pg.innerText('#v-correo')), `${nombre}: «No se ha podido copiar» y nunca «Copiado»`);
  await ctx.close();
}

console.log('7. El texto copiado con el portapapeles real del navegador');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/aplicacion/AP001/correo', '#co-vista');
  await pg.click('#co-copiar'); await pg.waitForSelector('#co-estado:not([hidden])');
  const tipos = await pg.evaluate(async () => { const items = await navigator.clipboard.read(); return items.map(i => [...i.types]); });
  chk(tipos.length === 1 && JSON.stringify(tipos[0]) === '["text/plain"]', 'el portapapeles real tiene un solo elemento y de tipo text/plain: ' + JSON.stringify(tipos));
  chk((await pg.evaluate(() => navigator.clipboard.readText())).split(String.fromCharCode(13)).join('') === await textoVista(pg, '#co-vista'), 'y su texto es la vista previa (Windows cambia los saltos a CRLF)');
  await ctx.close();
}

console.log('8. Los textos con caracteres raros');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/aplicacion/AP001/correo', '#co-vista');
  await espiar(pg);
  await pg.click('label[for=co-idioma-es]');
  await pg.click('#co-copiar'); await pg.waitForSelector('#co-estado:not([hidden])');
  const e = await escrituras(pg);
  chk(e[0].texto.startsWith('Asunto — ') && e[0].texto.includes('Seguimiento de tu solicitud') && !/[\p{Zl}\p{Zp}\u0000]/u.test(e[0].texto), 'el texto copiado es el del idioma elegido, sin separadores raros');
  chk(JSON.stringify(e[0].tipos) === '["text/plain"]', 'y solo text/plain');
  await ctx.close();
}

console.log('9. La primera línea de lo copiado NO tiene la forma «palabra:» (iOS lo leería como una dirección web: subrayado y %20)');
{
  const primera = t => t.split(String.fromCharCode(10))[0];
  const mala = l => /^[^\s:]+:/.test(l) || /^[a-z][a-z0-9+.-]*:/i.test(l);   // «Asunto:», «Subject:», «http:», «mailto:»…
  chk(mala('Asunto: x') && mala('Subject: x') && mala('mailto:a') && mala('http://a') && !mala('Asunto — x') && !mala('Perfil de un alumno'), 'el detector distingue lo malo de lo bueno');
  const destinos = [['Borrador en español', '#/aplicacion/AP001/correo', '#co-copiar', '#co-estado', '#co-idioma-es'], ['Borrador en inglés', '#/aplicacion/AP001/correo', '#co-copiar', '#co-estado', '#co-idioma-en'],
    ['Compartir perfiles', '#/alumno/A001/compartir', '#cp-copiar', '#cp-estado']];
  for (const [nombre, hash, boton, estado, idioma] of destinos) {
    const { pg, ctx } = await entrar();
    await ir(pg, hash, boton);
    if (idioma) await pg.click(`label[for=${idioma.slice(1)}]`);
    await espiar(pg);
    await pg.click(boton); await pg.waitForSelector(estado + ':not([hidden])');
    const e = await escrituras(pg);
    const l = primera(e[0].texto);
    chk(!mala(l), `${nombre}: la primera línea no es «palabra:» → ` + JSON.stringify(l));
    chk(l.length > 3 && !/^\s/.test(l), `${nombre}: la primera línea tiene texto`);
    await ctx.close();
  }
  const { pg, ctx } = await entrar();
  await ir(pg, '#/aplicacion/AP001/correo', '#co-vista');
  chk(/^(Asunto|Subject) — /.test((await textoVista(pg, '#co-vista'))), 'la vista previa del borrador empieza igual que lo copiado');
  await ctx.close();
}
await terminar();
