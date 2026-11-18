// Pruebas de "Compartir perfiles": el texto (funciones puras) y la pantalla (elegir, vista previa, Compartir y Copiar).
// Lo que no debe salir NUNCA (notas de entrevista, historial, motivos de descarte, claves) se comprueba con "canarios":
// textos inventados metidos en esos campos, que no pueden aparecer en ningún texto, marquen lo que marquen.
import * as C from '../../js/util/compartir.js';
import { enlaceHttps } from '../../js/util/enlaces.js';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const CANARIOS = ['CANARIO-NOTAS-ENTREVISTA', 'CANARIO-POR-QUE', 'CANARIO-NOTA-APP', 'CANARIO-MOTIVO', 'CANARIO-NOTA-HISTORIAL'];

/* 1. El texto: funciones puras */
console.log('1. El texto (funciones puras)');
{
  const a = { id: 'A1', nombre: 'Lucía', apellidos: 'Quintero', master: 'MBA en inglés', areaDestino: 'Producto y tecnología', areaExperiencia: 'Finanzas', disponibilidad: 'Prácticas',
    nacionalidadPrincipal: 'España', nacionalidadSecundaria: 'Chile', situacionTrabajo: 'Ciudadano UE o español', resumenExperiencia: '2 años\nen una app', enlaceCV: 'https://ejemplo.org/cv/A1',
    notasEntrevista: CANARIOS[0], porQue: CANARIOS[1], fechaUltimaEntrevista: '2026-10-01', notas: CANARIOS[2], motivo: CANARIOS[3], nota: CANARIOS[4], estado: 'Descartado' };
  const base = C.textoPerfiles({ alumnos: [a], campos: C.BASE_POR_DEFECTO });
  chk(/^Perfil de un alumno\n\n1\. Lucía Quintero\n   Programa: MBA en inglés\n   Quiere ir a: Producto y tecnología\n   Experiencia en: Finanzas\n   Busca: Prácticas\n\nInformación confidencial/.test(base), 'por defecto: nombre, máster, área y qué busca: ' + JSON.stringify(base));
  chk(!/España|Chile|Ciudadano|2 años|ejemplo\.org/.test(base), 'por defecto NO salen nacionalidad, situación, experiencia ni CV');
  const todo = C.textoPerfiles({ alumnos: [a], campos: [...C.BASE_POR_DEFECTO, ...C.CAMPOS_SENSIBLES.map(c => c.clave)] });
  chk(/Nacionalidad: España · Chile/.test(todo) && /Situación de trabajo en España: Ciudadano UE o español/.test(todo) && /Experiencia: 2 años en una app/.test(todo) && /CV: https:\/\/ejemplo\.org\/cv\/A1/.test(todo), 'marcando lo sensible, sale (y el resumen en una sola línea): ' + JSON.stringify(todo));
  chk(CANARIOS.every(c => !todo.includes(c)) && !/2026-10-01|Descartado/.test(todo), 'aunque se marque TODO, nunca salen notas de entrevista, "por qué", notas, motivos, historial ni fecha de entrevista');
  igual(C.textoPerfiles({ alumnos: [a], campos: [] }).split('\n').filter(l => l.startsWith('   ')), [], 'sin casillas: solo el número (sin datos)');
  igual(C.textoPerfiles({ alumnos: [a], campos: ['master'] }).includes('Lucía'), false, 'sin la casilla del nombre no sale el nombre');
  igual(C.textoPerfiles({ alumnos: [a, { ...a, id: 'A2', nombre: 'Berta' }], campos: ['nombre'] }).split('\n')[0], 'Perfiles de 2 alumnos', 'varios: "Perfiles de 2 alumnos"');
  const doce = Array.from({ length: 12 }, (_, i) => ({ ...a, id: 'X' + i, nombre: 'N' + i }));
  igual(C.textoPerfiles({ alumnos: doce, campos: ['nombre'] }).split('\n').filter(l => /^\d+\. /.test(l)).length, 10, 'como mucho 10 perfiles, aunque se pasen más');
  igual(C.MAX_PERFILES, 10, 'el máximo es 10');
  chk(C.textoPerfiles({ alumnos: [a], campos: ['nombre'], oferta: { titulo: 'Becario/a', empresa: 'Club B' } }).split('\n')[1] === 'Oferta: Becario/a · Club B', 'desde una oferta, la nombra');
  // CV: solo https
  for (const [u, esperado] of [['https://x.org/cv', 'https://x.org/cv'], ['http://x.org/cv', ''], ['javascript:alert(1)', ''], ['data:text/html,x', ''], ['ftp://x.org', ''], ['', ''], ['no es un enlace', ''], ['  https://x.org/a b  ', 'https://x.org/a%20b']]) igual(enlaceHttps(u), esperado, `CV "${u}" → "${esperado}"`);
  chk(!C.textoPerfiles({ alumnos: [{ ...a, enlaceCV: 'http://x.org/cv' }], campos: ['cv'] }).includes('http'), 'un CV con http no se incluye');
  igual(C.cvSinHttps([a, { ...a, nombre: 'Berta', enlaceCV: 'http://x.org' }], ['cv']), ['Berta Quintero'], 'avisa de a quién se le deja fuera el CV');
  // líneas inventadas desde el Sheet
  const hostil = C.textoPerfiles({ alumnos: [{ ...a, nombre: 'Ana\n9. Falso Perfil', master: 'x\r\ny' }], campos: ['nombre', 'master'] });
  chk(hostil.split('\n').filter(l => /^\d+\./.test(l)).length === 1, 'un nombre con saltos de línea no puede inventar otro perfil');
  igual(C.CAMPOS_SENSIBLES.map(c => c.clave), ['nacionalidad', 'situacion', 'experiencia', 'cv'], 'sensibles: nacionalidad, situación, resumen de experiencia y CV');
  igual(C.BASE_POR_DEFECTO, ['nombre', 'master', 'area', 'disponibilidad'], 'por defecto: nombre, máster, área y disponibilidad');
  chk(!Object.values(C.CAMPOS_BASE.concat(C.CAMPOS_SENSIBLES)).some(c => /notas|historial|descarte|entrevista/i.test(c.clave)), 'no existe ninguna casilla para notas, historial, descarte ni entrevista');
}

/* La pantalla */
const COL = { nacP: 6, sit: 8, resumen: 10, porQue: 12, cv: 13, notas: 14 };
async function entrar({ modo = 'script', ajustar, ancho = 390, sinShare = false, sinClipboard = false } = {}) {
  const t = await nuevo();
  if (ajustar) ajustar(t.mundo);
  await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin }).catch(() => {});
  await t.pg.setViewportSize({ width: ancho, height: 800 });
  await t.pg.addInitScript(([m, u, c, sinS, sinC]) => {
    if (!sessionStorage.getItem('ini')) {
      if (m === 'demo') localStorage.setItem('gad.modo', 'demo');
      else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
      sessionStorage.setItem('ini', '1');
    }
    window.__share = []; window.__modoShare = 'ok';
    if (sinS) delete Navigator.prototype.share;
    else navigator.share = async d => { window.__share.push(d); if (window.__modoShare === 'cancelar') { const e = new Error('x'); e.name = 'AbortError'; throw e; } if (window.__modoShare === 'fallar') { const e = new Error('x'); e.name = 'NotAllowedError'; throw e; } };
    if (sinC) { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); window.__copiado = null; document.execCommand = () => { window.__copiado = (document.activeElement && document.activeElement.value) || ''; return true; }; }
  }, [modo, URL_OK, CLAVE_PRUEBA, sinShare, sinClipboard]);
  t.pg.on('dialog', d => d.accept());
  return t;
}
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const alumno = (m, id) => m.hojas.Alumnos.m.find(f => f[0] === id);
const vista = pg => pg.$eval('#cp-vista', e => e.textContent);
const desbordes = pg => pg.evaluate(() => {
  const mal = [];
  if (document.documentElement.scrollWidth > window.innerWidth) mal.push('la página se desplaza en horizontal');
  for (const e of document.querySelectorAll('#app button, #app a, #app summary, #app label')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (e.scrollWidth > e.clientWidth + 1 || r.right > window.innerWidth + 1 || r.left < -1) mal.push(`"${(e.textContent || '').trim().slice(0, 40)}" no cabe`);
  }
  return mal;
});
const preparar = m => {
  const a = alumno(m, 'A001'); a[COL.notas] = CANARIOS[0]; a[COL.porQue] = CANARIOS[1]; a[COL.resumen] = 'Dos años\nen una app';
  const b = alumno(m, 'A002'); b[COL.notas] = CANARIOS[0]; b[COL.cv] = 'http://sin-https.org/cv';
  const c = alumno(m, 'A003'); c[COL.cv] = 'javascript:alert(1)';
  m.hojas.Aplicaciones.m.find(f => f[0] === 'AP001')[7] = CANARIOS[2];
  m.hojas.Aplicaciones.m.find(f => f[0] === 'AP002')[6] = CANARIOS[3];
  m.hojas.Historial.m.find(f => f[0] === 'H001')[6] = CANARIOS[4];
};
// Abre los tres grupos y todos los "Ver más": así están todas las casillas en la página.
async function abrirTodo(pg) {
  await pg.evaluate(() => { for (const d of document.querySelectorAll('#match-alumnos .grupo-match')) d.open = true; });
  for (let i = 0; i < 20; i++) { const b = await pg.$('#match-alumnos .grupo-match > button:not([hidden])'); if (!b) break; await b.click(); }
}
const elegir = async (pg, ids) => { for (const id of ids) await pg.check('#cp-sel-' + id); };
const escrituras = log => log.peticiones.filter(p => /^guardar|^registrar|^crear|^cambiar/.test(JSON.parse(p.cuerpo || '{}').action || ''));

/* 2. Elegir alumnos en la ficha de la oferta */
{
  console.log('2. Elegir alumnos en la ficha de la oferta');
  const { pg, ctx, log } = await entrar({ ajustar: preparar });
  await ir(pg, '#/oferta/O002', '#match-alumnos .grupo-match');
  await abrirTodo(pg);
  chk(await pg.isDisabled('#cp-ir') && /Marca los alumnos cuyo perfil quieras compartir/.test(await pg.innerText('#cp-cuenta')), 'sin nadie marcado, el botón está desactivado y explica qué hacer');
  const casillas = await pg.$$eval('#match-alumnos input.cp-sel', i => i.map(x => ({ visible: x.getBoundingClientRect().width > 0 })));
  chk(casillas.length > 0, 'cada alumno tiene su casilla');
  const cajas = await pg.$$eval('#match-alumnos .sel-compartir', l => l.slice(0, 3).map(x => [Math.round(x.getBoundingClientRect().width), Math.round(x.getBoundingClientRect().height)]));
  chk(cajas.every(([w, h]) => w >= 44 && h >= 44), 'la zona de toque de la casilla mide 44 px o más: ' + JSON.stringify(cajas));
  const visibles = await pg.$$eval('#match-alumnos input.cp-sel', i => i.filter(x => x.getBoundingClientRect().width > 0).map(x => x.id.replace('cp-sel-', '')));
  await elegir(pg, visibles.slice(0, 3));
  chk(/Compartir perfiles \(3\)/.test(await pg.innerText('#cp-ir')) && /3 alumnos elegidos/.test(await pg.innerText('#cp-cuenta')), 'con 3 marcados: "Compartir perfiles (3)"');
  await pg.uncheck('#cp-sel-' + visibles[2]);
  chk(/\(2\)/.test(await pg.innerText('#cp-ir')), 'al desmarcar, baja a 2');
  // máximo 10
  await abrirTodo(pg);
  let marcados = 2;
  for (const id of visibles.slice(2)) { if (marcados >= 10) break; if (await pg.isDisabled('#cp-sel-' + id)) break; await pg.check('#cp-sel-' + id); marcados++; }
  chk(marcados === 10 && /\(10\)/.test(await pg.innerText('#cp-ir')), 'se pueden marcar 10');
  const sobrantes = await pg.$$eval('#match-alumnos input.cp-sel:not(:checked)', i => i.filter(x => x.getBoundingClientRect().width > 0).map(x => x.disabled));
  chk(sobrantes.length > 0 && sobrantes.every(Boolean), 'con 10 marcados, las demás casillas se bloquean (máximo 10)');
  chk(/máximo 10/.test(await pg.innerText('#cp-cuenta')), 'y el texto recuerda el máximo');
  // la selección sobrevive a ir a una ficha y volver
  await pg.click('#match-alumnos li.fila-match a >> nth=0'); await pg.waitForSelector('#v-alumno .cabecera');
  await ir(pg, '#/oferta/O002', '#match-alumnos .grupo-match');
  chk(/\(10\)/.test(await pg.innerText('#cp-ir')), 'al volver a la oferta, los 10 siguen marcados');
  await pg.click('#cp-ir'); await pg.waitForSelector('#cp-vista');
  chk(/#\/oferta\/O002\/compartir/.test(pg.url()), 'el botón lleva a la vista previa');
  const lineas = (await vista(pg)).split('\n').filter(l => /^\d+\. /.test(l));
  chk(lineas.length === 10 && /^Perfiles de 10 alumnos/.test(await vista(pg)), 'la vista previa tiene los 10 perfiles');
  chk(escrituras(log).length === 0 && log.consola.length === 0, 'sin peticiones de guardar y sin errores: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 3. La vista previa: qué datos salen y cuáles nunca */
{
  console.log('3. Vista previa: datos y canarios');
  const { pg, ctx } = await entrar({ ajustar: preparar });
  await ir(pg, '#/oferta/O002', '#match-alumnos .grupo-match');
  await abrirTodo(pg);
  await elegir(pg, ['A001', 'A002', 'A003']);
  await pg.click('#cp-ir'); await pg.waitForSelector('#cp-vista');
  const marcadas = await pg.$$eval('#v-compartir input[id^=cp-c-]:checked', i => i.map(x => x.value));
  chk(marcadas.join() === 'nombre,master,area,disponibilidad', 'por defecto marcados: nombre, máster, área, disponibilidad: ' + marcadas);
  const sens = await pg.$$eval('#v-compartir input[id^=cp-c-]:not(:checked)', i => i.map(x => x.value));
  chk(sens.join() === 'nacionalidad,situacion,experiencia,cv,historia', 'desmarcados: nacionalidad, situación, resumen de experiencia, CV y la historia (casilla aparte): ' + sens);
  chk((await pg.innerText('#v-compartir')).match(/Dato sensible/g)?.length === 4, 'cada dato sensible lo dice con texto: "Dato sensible" ×4');
  chk(await pg.isHidden('#cp-sensible'), 'sin datos sensibles marcados, no hay aviso de sensibles');
  chk(/ya no podrás controlar quién lo lee/.test(await pg.innerText('#cp-aviso')) && /La app no guarda registro de lo compartido/.test(await pg.innerText('#cp-aviso')), 'aviso de privacidad visible: sale de la app y no hay registro');
  chk(/Las notas de entrevista, el historial y los motivos de descarte nunca se incluyen/.test(await pg.innerText('#v-compartir')), 'dice que notas, historial y descartes nunca se incluyen');
  let t = await vista(pg);
  chk(/1\. Lucía Quintero/.test(t) && /2\. Mateo Ferrer/.test(t) && /3\. Valentina Aguirre/.test(t) && /Programa: /.test(t) && /Busca: /.test(t), 'el texto tiene los 3 perfiles');
  chk(!/Nacionalidad|Situación de trabajo|Dos años|CV:/.test(t), 'por defecto no sale nada sensible');
  // se marca todo lo sensible
  for (const c of ['nacionalidad', 'situacion', 'experiencia', 'cv']) await pg.check('#cp-c-' + c);
  t = await vista(pg);
  chk(/Nacionalidad: España/.test(t) && /Situación de trabajo en España: Ciudadano UE o español/.test(t) && /Experiencia: Dos años en una app/.test(t), 'marcando lo sensible, sale: ' + t.slice(0, 160).replace(/\n/g, ' / '));
  chk(/CV: https:\/\/example\.com\/cv\/A001/.test(t), 'el CV con https sale');
  chk(!/sin-https\.org|javascript:/.test(t) && !/CV: http:/.test(t), 'un CV con http, o con javascript:, se deja fuera');
  chk(await pg.isVisible('#cp-sensible'), 'el aviso de datos sensibles se ve al marcarlos');
  const aviso = await pg.innerText('#cp-sensible');
  chk(/datos sensibles \(nacionalidad, situación de trabajo en españa, resumen de experiencia, enlace al cv\)/i.test(aviso) && /solo con permiso de la persona/.test(aviso), 'avisa de los datos sensibles marcados: ' + aviso.replace(/\n/g, ' '));
  chk(/El CV de .*Mateo Ferrer.*Valentina Aguirre no se incluye|El CV de .*Valentina Aguirre.*Mateo Ferrer no se incluye/.test(aviso), 'y de a quién se le deja fuera el CV: ' + aviso.replace(/\n/g, ' '));
  chk(CANARIOS.every(c => !t.includes(c)), 'con TODO marcado: ningún canario (notas de entrevista, por qué, notas, motivo de descarte, historial)');
  chk(!t.includes(CLAVE_PRUEBA) && !/script\.google\.com|AKfycb/.test(t), 'ni la clave ni la dirección del script');
  // quitar un alumno y todos
  await pg.uncheck('#cp-al-A002');
  t = await vista(pg);
  chk(!/Mateo/.test(t) && /Perfiles de 2 alumnos/.test(t), 'quitar a un alumno lo quita del texto');
  await pg.uncheck('#cp-al-A001'); await pg.uncheck('#cp-al-A003');
  chk(await pg.isDisabled('#cp-copiar') && await pg.isDisabled('#cp-compartir') && /No hay ningún alumno marcado/.test(await vista(pg)), 'sin ningún alumno: Copiar y Compartir desactivados');
  // el texto sin nombre
  await pg.check('#cp-al-A001'); await pg.uncheck('#cp-c-nombre');
  chk(!/Lucía/.test(await vista(pg)), 'sin la casilla del nombre, no sale el nombre');
  await ctx.close();
}

/* 4. Compartir y Copiar */
{
  console.log('4. Compartir y Copiar');
  const { pg, ctx, log } = await entrar({ ajustar: preparar });
  await ir(pg, '#/oferta/O002', '#match-alumnos .grupo-match');
  await abrirTodo(pg);
  await elegir(pg, ['A001', 'A004']);
  await pg.click('#cp-ir'); await pg.waitForSelector('#cp-vista');
  await pg.check('#cp-c-nacionalidad');
  await pg.click('#cp-compartir');
  await pg.waitForSelector('#cp-estado:not([hidden])');
  const enviado = await pg.evaluate(() => window.__share);
  chk(enviado.length === 1 && enviado[0].text === await vista(pg), 'Compartir envía al menú del móvil EXACTAMENTE el texto de la vista previa');
  chk(enviado[0].title === 'Perfiles de alumnos' && Object.keys(enviado[0]).sort().join() === 'text,title', 'solo título y texto (sin enlaces ni archivos)');
  chk(/^Compartido\.$/.test(await pg.innerText('#cp-estado')), 'lo confirma (el aviso de que ya no se controla está arriba, una sola vez)');
  await pg.evaluate(() => { window.__modoShare = 'cancelar'; });
  await pg.click('#cp-compartir');
  await pg.waitForFunction(() => /No se ha compartido nada/.test(document.querySelector('#cp-estado').textContent));
  chk(true, 'si se cancela el menú: "No se ha compartido nada."');
  await pg.evaluate(() => { window.__modoShare = 'fallar'; });
  await pg.click('#cp-compartir');
  await pg.waitForSelector('#cp-error:not([hidden])');
  chk(/No se ha podido compartir\. Prueba con «Copiar»/.test(await pg.innerText('#cp-error')), 'si falla el menú: lo dice y manda a Copiar');
  // Copiar
  await pg.click('#cp-copiar');
  await pg.waitForSelector('#cp-estado:not([hidden])');
  const copiado = await pg.evaluate(() => navigator.clipboard.readText());
  chk(copiado.split('\r\n').join('\n') === await vista(pg), 'Copiar deja en el portapapeles EXACTAMENTE el texto de la vista previa');
  chk(/Copiado\./.test(await pg.innerText('#cp-estado')) && (await pg.$('#flotante')) !== null, 'confirma con mensaje y aviso flotante');
  chk(escrituras(log).length === 0, 'nada se guarda en el Sheet');
  chk(log.peticiones.every(p => JSON.parse(p.cuerpo || '{}').action !== undefined && !/compart/i.test(p.cuerpo || '')), 'compartir no envía nada a ningún servidor');
  chk(log.externas.every(x => x.includes('script.google.com')) && log.consola.length === 0, 'solo se habla con el script (para leer los datos), nada más, y sin errores: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 5. Sin menú de compartir / sin portapapeles */
{
  console.log('5. Navegador sin menú de compartir y sin portapapeles');
  const { pg, ctx } = await entrar({ sinShare: true, sinClipboard: true, ajustar: preparar });
  await ir(pg, '#/alumno/A001/compartir', '#cp-vista');
  chk(await pg.isDisabled('#cp-compartir') && /no puede compartir directamente/.test(await pg.innerText('#cp-sin-menu')), 'sin menú de compartir: botón desactivado y explica que se use Copiar');
  await pg.click('#cp-copiar');
  await pg.waitForSelector('#cp-estado:not([hidden])');
  chk(await pg.evaluate(() => window.__copiado) === await vista(pg), 'sin portapapeles moderno: el respaldo copia el mismo texto');
  await ctx.close();
}

/* 6. Un solo alumno desde su ficha, y entradas que no valen */
{
  console.log('6. Desde la ficha del alumno y entradas que no valen');
  const { pg, ctx } = await entrar({ ajustar: preparar });
  await ir(pg, '#/alumno/A001', '#al-compartir');
  chk(/Compartir perfil/.test(await pg.innerText('#al-compartir')), 'la ficha tiene "Compartir perfil"');
  await pg.click('#al-compartir'); await pg.waitForSelector('#cp-vista');
  chk(/^Perfil de un alumno\n\n1\. Lucía Quintero/.test(await vista(pg)) && !/Oferta:/.test(await vista(pg)), 'un solo perfil, sin oferta');
  await pg.reload(); await pg.waitForSelector('#cp-vista');
  chk(/Lucía Quintero/.test(await vista(pg)), 'al recargar la página sigue funcionando (el alumno va en la dirección)');
  await pg.click('#v-compartir .volver');
  await pg.waitForSelector('#v-alumno .cabecera');
  chk(/#\/alumno\/A001$/.test(pg.url()), '"Ficha" vuelve a la ficha');
  await ir(pg, '#/oferta/O002/compartir', '#cp-nadie');
  chk(/No hay alumnos elegidos/.test(await pg.innerText('#cp-nadie')), 'oferta sin nadie elegido (p. ej. tras recargar): lo dice y no falla');
  await ir(pg, '#/oferta/O999/compartir', '#v-compartir .card');
  chk(/Oferta no encontrada/.test(await pg.innerText('#v-compartir')), 'oferta que no existe: "Oferta no encontrada"');
  await ir(pg, '#/alumno/A999/compartir', '#cp-nadie');
  chk(/No hay alumnos elegidos/.test(await pg.innerText('#cp-nadie')), 'alumno que no existe: no falla');
  await ctx.close();
}

/* 7. Datos hostiles, demo y 320 px */
{
  console.log('7. Datos con código, demo y 320 px');
  const hostil = await entrar({ ancho: 320, ajustar: m => { const a = alumno(m, 'A001'); a[2] = '<img src=x onerror="window.__hack=1">'; a[10] = '<script>window.__hack=2</script>\nlinea dos'; } });
  await ir(hostil.pg, '#/alumno/A001/compartir', '#cp-vista');
  await hostil.pg.check('#cp-c-experiencia');
  chk(/<img src=x/.test(await vista(hostil.pg)) && (await hostil.pg.$('#cp-vista img')) === null && await hostil.pg.evaluate(() => window.__hack) === undefined, 'el código de los datos se ve como texto y no se ejecuta');
  const mal = await desbordes(hostil.pg);
  chk(mal.length === 0, 'a 320 px nada se sale: ' + mal.join(' | '));
  chk(hostil.log.consola.length === 0, 'sin errores de consola');
  await hostil.ctx.close();
  const co = await entrar({ ancho: 320, ajustar: preparar });
  await ir(co.pg, '#/oferta/O002', '#match-alumnos .grupo-match');
  await abrirTodo(co.pg);
  const mal2 = await desbordes(co.pg);
  chk(mal2.length === 0, 'la ficha de la oferta con casillas, a 320 px: nada se sale ' + mal2.join(' | '));
  await elegir(co.pg, ['A001', 'A002']);
  await co.pg.click('#cp-ir'); await co.pg.waitForSelector('#cp-vista');
  for (const c of ['nacionalidad', 'situacion', 'experiencia', 'cv']) await co.pg.check('#cp-c-' + c);
  const mal3 = await desbordes(co.pg);
  chk(mal3.length === 0, 'la vista previa con todo marcado, a 320 px: nada se sale ' + mal3.join(' | '));
  const alturas = await co.pg.$$eval('#cp-compartir, #cp-copiar', b => b.map(x => Math.round(x.getBoundingClientRect().height)));
  chk(alturas.every(h => h >= 44), 'Compartir y Copiar miden 44 px o más: ' + alturas);
  await co.ctx.close();
  const demo = await entrar({ modo: 'demo' });
  await ir(demo.pg, '#/oferta/O002', '#match-alumnos .grupo-match');
  await abrirTodo(demo.pg);
  await elegir(demo.pg, await demo.pg.$$eval('#match-alumnos input.cp-sel', i => i.filter(x => x.getBoundingClientRect().width > 0).slice(0, 2).map(x => x.id.replace('cp-sel-', ''))));
  await demo.pg.click('#cp-ir'); await demo.pg.waitForSelector('#cp-vista');
  chk(/Perfiles de 2 alumnos/.test(await vista(demo.pg)) && demo.log.externas.length === 0, 'en la demo también funciona, sin peticiones externas');
  await demo.ctx.close();
}

await terminar();
