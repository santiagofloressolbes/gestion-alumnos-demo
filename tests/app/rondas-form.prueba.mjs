// Pruebas de escribir rondas y aplicaciones: registrar una ronda, añadir aplicaciones y cambiar su estado.
// Contra el MISMO Code.gs (simulado): conflictos, respuestas perdidas, sin conexión, validaciones y salir sin guardar.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const hoyLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const HOY = hoyLocal();
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
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const formRonda = (pg, id) => ir(pg, `#/oferta/${id}/ronda/nueva`, '#ro-fecha');
const formApl = (pg, id, n) => ir(pg, `#/oferta/${id}/ronda/${n}/aplicar`, '#ap-q');
const formEstado = (pg, id) => ir(pg, `#/aplicacion/${id}/estado`, '#es-estado');
const guardar = (pg, vista) => pg.click(`#${vista} form button[type=submit]`);
const aterriza = async (pg, hash, sel) => { await pg.waitForFunction(h => location.hash === h, hash); await pg.waitForSelector(sel); };
const filas = (m, hoja) => { const t = m.hojas[hoja].m; return t.slice(1).filter(f => f.some(x => x !== '' && x != null)).map(f => Object.fromEntries(t[0].map((c, i) => [c, f[i]]))); };
const fila = (m, hoja, id) => filas(m, hoja).find(f => Object.values(f)[0] === id);
const escrituras = log => log.peticiones.filter(p => /^registrar|^crear|^cambiar|^guardar/.test(JSON.parse(p.cuerpo || '{}').action || ''));
const cuerpoDe = (log, accion) => log.peticiones.map(p => JSON.parse(p.cuerpo || '{}')).filter(j => j.action === accion);
const texto = (pg, sel) => pg.innerText(sel);
const visible = (pg, sel) => pg.isVisible(sel);
const base = (m, extra) => ({ key: m.clave, ...extra });
const sinClaveEnUrl = log => log.peticiones.every(p => !p.url.includes(CLAVE_PRUEBA) && p.metodo === 'POST' && /^text\/plain/.test(p.tipo || ''));

/* 1. Quién ve los botones */
{
  console.log('1. Botones según la conexión');
  let { pg, ctx } = await entrar('script');
  await ir(pg, '#/oferta/O002', '#v-oferta .ronda');
  chk(await visible(pg, '#ro-nueva') && /Registrar nueva ronda/.test(await texto(pg, '#ro-nueva')), 'conectado: botón "Registrar nueva ronda"');
  chk((await pg.$$('#v-oferta .ronda a:has-text("Añadir solicitud")')).length === 2, 'un botón "Añadir solicitud" por ronda');
  chk(await pg.getAttribute('#v-oferta .ronda >> nth=0 >> a:has-text("Añadir solicitud")', 'href') === '#/oferta/O002/ronda/2/aplicar', 'el de la ronda 2 apunta a la ronda 2');
  await ir(pg, '#/aplicacion/AP004', '#v-aplicacion .card');
  chk(await visible(pg, '#ap-estado'), 'detalle: botón "Cambiar estado"');
  await ctx.close();
  ({ pg, ctx } = await entrar('demo'));
  await ir(pg, '#/oferta/O002', '#v-oferta .ronda');
  chk((await pg.$$('#ro-nueva, #v-oferta .ronda a:has-text("Añadir solicitud")')).length === 0, 'demo: ningún botón de escribir');
  await ir(pg, '#/aplicacion/AP004', '#v-aplicacion .card');
  chk((await pg.$$('#ap-estado')).length === 0, 'demo: sin "Cambiar estado"');
  for (const [h, v] of [['#/oferta/O004/ronda/nueva', '#v-ronda-form'], ['#/oferta/O002/ronda/2/aplicar', '#v-aplicacion-form'], ['#/aplicacion/AP004/estado', '#v-estado-form']]) {
    await pg.goto(BASE + h); await pg.waitForSelector(v + ' .card');
    chk(/No se puede guardar/.test(await texto(pg, v)) && /demo/.test(await texto(pg, v)) && (await pg.$$(v + ' form')).length === 0, `demo: ${h} explica que no se puede guardar, sin formulario`);
  }
  await ctx.close();
}

/* 2. Registrar una ronda */
{
  console.log('2. Registrar una ronda');
  const { pg, ctx, log, mundo } = await entrar('script');
  await formRonda(pg, 'O004');
  chk(await texto(pg, '#ro-numero') === 'Vas a registrar la ronda 1 (el primer envío de esta oferta a los alumnos).' && await pg.inputValue('#ro-fecha') === HOY, 'ronda 1 y la fecha de hoy por defecto');
  chk(await pg.getAttribute('#ro-fecha', 'max') === HOY && await pg.getAttribute('#ro-fecha', 'min') === '2026-10-12', 'la fecha no puede ser futura ni anterior a la recepción de la oferta (12/10)');
  chk(await pg.innerText('#titulo') === 'Nueva ronda' && (await pg.$$('#ro-cerrada')).length === 0, 'título; sin aviso de oferta cerrada');
  // validaciones locales
  const n0 = escrituras(log).length;
  await pg.fill('#ro-fecha', ''); await guardar(pg, 'v-ronda-form');
  chk(/Elige la fecha/.test(await texto(pg, '#v-ronda-form .error')), 'sin fecha: "Elige la fecha."');
  await pg.fill('#ro-fecha', '2026-10-11'); await guardar(pg, 'v-ronda-form');
  chk(/anterior al 12 de octubre de 2026/.test(await texto(pg, '#v-ronda-form .error')), 'antes de la oferta: "no puede ser anterior al 12 de octubre de 2026"');
  await pg.fill('#ro-fecha', '2099-01-01'); await guardar(pg, 'v-ronda-form');
  chk(/no puede ser futura/.test(await texto(pg, '#v-ronda-form .error')), 'fecha futura rechazada');
  chk(escrituras(log).length === n0, 'ninguna de esas pruebas envió nada al script');
  // guardar bien
  await pg.fill('#ro-fecha', '2026-10-28'); await guardar(pg, 'v-ronda-form');
  await aterriza(pg, '#/oferta/O004', '#v-oferta .ronda');
  chk(/Ronda 1 registrada\./.test(await texto(pg, '#v-oferta .aviso-ok')), 'aviso "Ronda 1 registrada."');
  chk((await pg.$$eval('#v-oferta .ronda h2', h => h.map(x => x.textContent))).join() === 'Ronda 1' && /Enviada el 28 de octubre de 2026 · 0 solicitudes/.test(await texto(pg, '#v-oferta .ronda')) && /Aún no hay solicitudes/.test(await texto(pg, '#v-oferta .ronda')), 'la ficha enseña la ronda nueva, sin aplicaciones');
  const r6 = fila(mundo, 'Rondas', 'R006');
  chk(r6 && r6['ID oferta'] === 'O004' && r6['Número de ronda'] === '1' && r6['Fecha de envío a los alumnos'] === '2026-10-28', 'en el Sheet: R006, oferta O004, ronda 1, 2026-10-28');
  const j = cuerpoDe(log, 'registrarRonda')[0];
  chk(j.idOferta === 'O004' && j.numero === 1 && j.fecha === '2026-10-28' && Object.keys(j).sort().join() === 'action,fecha,idOferta,key,numero', 'la petición lleva solo lo necesario');
  chk(sinClaveEnUrl(log), 'la clave va en el cuerpo, nunca en la dirección');
  await pg.click('#ro-nueva'); await pg.waitForSelector('#ro-fecha');
  chk(await texto(pg, '#ro-numero') === 'Vas a registrar la ronda 2 (un nuevo envío de esta oferta a los alumnos).' && await pg.getAttribute('#ro-fecha', 'min') === '2026-10-28', 'la siguiente es la ronda 2 y no puede ser antes de la ronda 1');
  await guardar(pg, 'v-ronda-form'); await aterriza(pg, '#/oferta/O004', '#v-oferta .ronda');
  chk((await pg.$$eval('#v-oferta .ronda h2', h => h.map(x => x.textContent))).join() === 'Ronda 2,Ronda 1', 'dos rondas, la última arriba');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 3. Oferta cerrada y varias personas a la vez */
{
  console.log('3. Registrar ronda: oferta cerrada, conflicto, respuesta perdida y sin conexión');
  const { pg, ctx, log, mundo, ctrl } = await entrar('script');
  await formRonda(pg, 'O006');
  chk(/Esta oferta está cerrada/.test(await texto(pg, '#ro-cerrada')) && await texto(pg, '#ro-numero') === 'Vas a registrar la ronda 2 (un nuevo envío de esta oferta a los alumnos).', 'oferta cerrada: avisa, pero deja registrar');
  await guardar(pg, 'v-ronda-form'); await aterriza(pg, '#/oferta/O006', '#v-oferta .ronda');
  chk(fila(mundo, 'Rondas', 'R006')['ID oferta'] === 'O006', 'se guardó en una oferta cerrada');
  // conflicto: otra persona registra la ronda 1 de O004 con otra fecha mientras esta tiene el formulario abierto
  await formRonda(pg, 'O004');
  await pg.fill('#ro-fecha', '2026-10-27');
  mundo.llamar(base(mundo, { action: 'registrarRonda', idOferta: 'O004', numero: 1, fecha: '2026-10-20' }));
  await guardar(pg, 'v-ronda-form');
  await pg.waitForSelector('#ro-aviso');
  chk(/Otra persona ya había registrado la ronda 1, así que esta es la ronda 2/.test(await texto(pg, '#ro-aviso')) && await texto(pg, '#ro-numero') === 'Vas a registrar la ronda 2 (un nuevo envío de esta oferta a los alumnos).' && await pg.inputValue('#ro-fecha') === '2026-10-27', 'conflicto: lo explica, propone la ronda 2 y conserva la fecha escrita');
  chk(filas(mundo, 'Rondas').filter(r => r['ID oferta'] === 'O004').length === 1, '... y no se ha creado nada de más');
  await guardar(pg, 'v-ronda-form'); await aterriza(pg, '#/oferta/O004', '#v-oferta .ronda');
  chk((await pg.$$eval('#v-oferta .ronda h2', h => h.map(x => x.textContent))).join() === 'Ronda 2,Ronda 1', 'tras revisar, guarda la ronda 2');
  // respuesta perdida: se guarda pero la app no se entera; al reintentar no se duplica
  await formRonda(pg, 'O003');
  const antes = filas(mundo, 'Rondas').length;
  ctrl.perderRespuesta = true;
  await guardar(pg, 'v-ronda-form');
  await pg.waitForSelector('#v-ronda-form .error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await texto(pg, '#v-ronda-form .error')) && /sí se haya guardado/.test(await texto(pg, '#v-ronda-form .error')) && filas(mundo, 'Rondas').length === antes + 1, 'respuesta perdida: lo dice (y el Sheet sí la tiene)');
  await guardar(pg, 'v-ronda-form'); await aterriza(pg, '#/oferta/O003', '#v-oferta .ronda');
  chk(filas(mundo, 'Rondas').length === antes + 1 && /Ronda 3 registrada/.test(await texto(pg, '#v-oferta .aviso-ok')), 'al reintentar la reconoce como ya guardada: no se duplica');
  // sin conexión
  await formRonda(pg, 'O009');
  const n1 = filas(mundo, 'Rondas').length;
  await pg.fill('#ro-fecha', '2026-10-30');
  ctrl.abortar = true;
  await guardar(pg, 'v-ronda-form');
  await pg.waitForSelector('#v-ronda-form .error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await texto(pg, '#v-ronda-form .error')) && await pg.inputValue('#ro-fecha') === '2026-10-30' && filas(mundo, 'Rondas').length === n1 && !(await pg.isDisabled('#ro-fecha')), 'sin conexión: error claro, la fecha sigue ahí y no se escribió nada');
  await guardar(pg, 'v-ronda-form'); await aterriza(pg, '#/oferta/O009', '#v-oferta .ronda');
  chk(filas(mundo, 'Rondas').length === n1 + 1, 'al reintentar, se guarda una sola vez');
  chk(log.consola.every(c => /Failed to load resource|net::ERR/i.test(c)), 'solo errores de red esperados en consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 4. Salir sin guardar (ronda) */
{
  console.log('4. Salir con cambios sin guardar (ronda)');
  const { pg, ctx } = await entrar('script');
  await formRonda(pg, 'O004');
  let dialogos = 0;
  pg.on('dialog', d => { dialogos++; d.dismiss(); });
  await pg.click('#v-ronda-form .secondary');   // sin cambios: no pregunta
  await aterriza(pg, '#/oferta/O004', '#v-oferta .cabecera');
  chk(dialogos === 0, 'sin cambios no pregunta al cancelar');
  await formRonda(pg, 'O004');
  await pg.fill('#ro-fecha', '2026-10-27');
  await pg.click('#v-ronda-form .secondary');
  chk(dialogos === 1 && await pg.evaluate(() => location.hash) === '#/oferta/O004/ronda/nueva', 'con cambios pregunta y, al decir que no, se queda');
  await pg.click('#tabs a[data-tab=buscar]');
  chk(dialogos === 2 && /ronda\/nueva/.test(await pg.evaluate(() => location.hash)), 'cambiar de pestaña también pregunta');
  pg.removeAllListeners('dialog'); pg.on('dialog', d => d.accept());
  await pg.click('#v-ronda-form .secondary');
  await aterriza(pg, '#/oferta/O004', '#v-oferta .cabecera');
  chk(await pg.evaluate(() => location.hash) === '#/oferta/O004', 'al aceptar, sale');
  await ctx.close();
}

/* 5. Añadir una aplicación */
{
  console.log('5. Añadir una aplicación');
  const { pg, ctx, log, mundo } = await entrar('script');
  await ir(pg, '#/oferta/O002', '#v-oferta .ronda');
  await pg.click('#v-oferta .ronda >> nth=0 >> a:has-text("Añadir solicitud")');
  await pg.waitForSelector('#ap-q');
  chk(await pg.innerText('#titulo') === 'Añadir solicitud' && /Ronda 2, enviada el 21 de octubre de 2026/.test(await texto(pg, '#v-aplicacion-form .sub')), 'abre desde la ronda 2');
  chk((await pg.$$('#ap-lista input')).length === 28 && await texto(pg, '#ap-cuenta') === '28 alumnos', 'la lista no incluye a los 2 alumnos que ya aplicaron a la ronda 2 (28 de 30)');
  chk(!(await texto(pg, '#ap-lista')).includes('Lucía Quintero') && !(await texto(pg, '#ap-lista')).includes("Adrián O'Connor"), '... Lucía y Adrián no salen');
  chk(/Mateo Ferrer[\s\S]*ya tiene solicitud en la ronda 1/.test(await texto(pg, '#ap-lista')), 'quien ya aplicó en otra ronda lo indica');
  chk(await pg.inputValue('#ap-fecha') === HOY && await pg.getAttribute('#ap-fecha', 'min') === '2026-10-21', 'fecha de hoy por defecto; no antes de la ronda (21/10)');
  const n0 = escrituras(log).length;
  await guardar(pg, 'v-aplicacion-form');
  chk(/Elige un alumno/.test(await texto(pg, '#v-aplicacion-form .error')) && escrituras(log).length === n0, 'sin alumno: "Elige un alumno." y no envía');
  await pg.fill('#ap-q', 'mateo');
  chk((await pg.$$('#ap-lista input')).length === 1 && await texto(pg, '#ap-cuenta') === '1 alumno', 'buscar "mateo": 1 resultado');
  await pg.fill('#ap-q', 'ferrer');
  chk((await pg.$$('#ap-lista input')).length === 1, 'la búsqueda ignora tildes y mayúsculas');
  await pg.fill('#ap-q', 'zzzz');
  chk(/Ningún alumno coincide/.test(await texto(pg, '#ap-lista')), 'sin coincidencias lo dice');
  await pg.fill('#ap-q', 'mba en español');
  chk((await pg.$$('#ap-lista input')).length === 8, 'también busca por máster (8 de MBA en español)');
  await pg.fill('#ap-q', '');
  await pg.check('#ap-al-A003');
  chk((await pg.$$eval('#ap-avisos .aviso', a => a.length)) === 0, 'alumno sin avisos');
  await pg.check('#ap-al-A002');
  chk(/Ya tiene una solicitud en la ronda 1 de esta oferta \(Entrevista\)/.test(await texto(pg, '#ap-avisos')), 'al elegir a Mateo avisa de su aplicación anterior y su estado');
  await pg.check('#ap-al-A003');
  await pg.fill('#ap-fecha', '2026-10-20'); await guardar(pg, 'v-aplicacion-form');
  chk(/anterior al 21 de octubre de 2026/.test(await texto(pg, '#v-aplicacion-form .error')), 'antes de la ronda: lo rechaza');
  await pg.fill('#ap-fecha', '2099-01-01'); await guardar(pg, 'v-aplicacion-form');
  chk(/no puede ser futura/.test(await texto(pg, '#v-aplicacion-form .error')), 'fecha futura rechazada');
  await pg.fill('#ap-fecha', HOY);
  await pg.fill('#ap-notas', 'hola <b>x</b>'); await guardar(pg, 'v-aplicacion-form');
  chk(/lo toma por código/.test(await texto(pg, '#v-aplicacion-form .error')), 'HTML en las notas: rechazado');
  await pg.fill('#ap-notas', 'x'.repeat(2001));
  chk(/2\.001 \/ 2\.000/.test(await texto(pg, '#ap-notas-cuenta')) && await pg.evaluate(() => document.querySelector('#ap-notas-cuenta').classList.contains('exceso')), 'contador de notas: 2.001 / 2.000 en rojo');
  await guardar(pg, 'v-aplicacion-form');
  chk(/Las notas son demasiado largas/.test(await texto(pg, '#v-aplicacion-form .error')) && escrituras(log).length === n0, 'demasiado largo: rechazado sin enviar');
  await pg.fill('#ap-notas', '=1+1');
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForSelector('#ap-ok:not([hidden])');
  chk(/Solicitud de Valentina Aguirre añadida \(AP013\)\. Puedes añadir otra\./.test(await texto(pg, '#ap-ok')), 'guarda y lo confirma: "Solicitud de Valentina Aguirre añadida (AP013)"');
  const ap = fila(mundo, 'Aplicaciones', 'AP013'), h = fila(mundo, 'Historial', 'H037');
  chk(ap && ap['ID alumno'] === 'A003' && ap['ID oferta'] === 'O002' && ap['Número de ronda'] === '2' && ap['Fecha de aplicación'] === HOY && ap.Estado === 'Recibida' && ap['Motivo de descarte'] === '' && ap.Notas === ' =1+1', 'en el Sheet: AP013, Recibida, notas como texto (con un espacio delante, sin fórmula)');
  chk(h && h['ID aplicación'] === 'AP013' && h['Estado anterior'] === '' && h['Estado nuevo'] === 'Recibida', 'y su primera línea de historial');
  chk(!(await texto(pg, '#ap-lista')).includes('Valentina Aguirre') && (await pg.$$('#ap-lista input')).length === 27 && await pg.inputValue('#ap-q') === '' && await pg.inputValue('#ap-notas') === '', 'el formulario se limpia y Valentina ya no sale en la lista (27)');
  chk(await pg.evaluate(() => document.activeElement.id) === 'ap-q', 'el cursor vuelve al buscador, para añadir otra');
  chk(!log.peticiones.some(p => p.url.includes(CLAVE_PRUEBA)) && sinClaveEnUrl(log), 'la clave nunca va en la dirección');
  // otra seguida
  await pg.check('#ap-al-A004'); await guardar(pg, 'v-aplicacion-form');
  await pg.waitForFunction(() => /AP014/.test(document.querySelector('#ap-ok').textContent));
  chk(fila(mundo, 'Aplicaciones', 'AP014')['ID alumno'] === 'A004', 'una segunda seguida: AP014');
  await pg.click('#v-aplicacion-form .secondary');
  await aterriza(pg, '#/oferta/O002', '#v-oferta .ronda');
  const r2 = await pg.$$eval('#v-oferta .ronda >> nth=0 >> li', li => li.map(x => x.innerText.replace(/\s+/g, ' ')));
  chk(r2.length === 4 && /Valentina Aguirre/.test(r2.join()) && /Diego Keller/.test(r2.join()), 'la ficha de la oferta enseña las 4 solicitudes de la ronda 2');
  chk(/Ronda 2[\s\S]*4 solicitudes/.test(await texto(pg, '#v-oferta .ronda')), 'y el contador');
  await ir(pg, '#/alumno/A003', '#v-alumno [aria-label=Solicitudes] a.alumno');
  chk(/Recibida/.test(await texto(pg, '#v-alumno [aria-label=Solicitudes]')), 'la ficha del alumno también la enseña');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 6. Añadir solicitud: avisos de requisitos, oferta cerrada, rondas que no existen, listas largas y textos raros */
{
  console.log('6. Añadir solicitud: avisos y casos raros');
  const { pg, ctx, log, mundo } = await entrar('script', m => {
    for (let i = 100; i < 170; i++) m.hojas.Alumnos.m.push([`A${i}`, 'iniciales', `Nombre${i}`, `Apellido${i}`, 'MBA en inglés', '2025-2026', 'España', '', 'Ciudadano UE o español', '', '', '', '', '', '', '', 'Ambas']);
    m.hojas.Alumnos.m[4][2] = '<img src=x onerror="window.__hack=1">';   // nombre de A004
    m.hojas.Ofertas.m[7][7] = 'Estados Unidos';                          // O007 pide nacionalidad estadounidense (fila 8 = O007)
    m.hojas.Rondas.m.push(['R006', 'O007', '1', '2026-10-19']);
    m.hojas.Rondas.m.push(['R007', 'O001', '1', '2026-10-06']);
  });
  pg.on('dialog', d => d.accept());   // al saltar de un formulario con cambios a otro, se acepta descartar
  const elegir = async (nombre, id) => { await pg.fill('#ap-q', nombre); await pg.check('#ap-al-' + id); };   // con 100 alumnos solo se ven 40: se busca
  await formApl(pg, 'O003', 2);
  await elegir('brandt', 'A018');
  let avisos = await pg.$$eval('#ap-avisos .aviso', a => a.map(x => x.textContent));
  chk(avisos.length === 2 && /Ya tiene una solicitud en la ronda 1 de esta oferta \(Descartado\)/.test(avisos[0]) && /permiso de trabajo en vigor y Pedro Brandt aparece como «Necesita permiso de trabajo»/.test(avisos[1]), 'O003 pide permiso: Pedro (Necesita permiso) → aviso de permiso y de su ronda anterior: ' + avisos.join(' | '));
  await elegir('mendes', 'A008');
  avisos = await pg.$$eval('#ap-avisos .aviso', a => a.map(x => x.textContent));
  chk(avisos.length === 1 && /Javier Mendes/.test(avisos[0]), 'Javier: solo el aviso de permiso');
  await elegir('quintero', 'A001');
  chk((await pg.$$('#ap-avisos .aviso')).length === 0, 'Lucía (ciudadana UE): sin avisos');
  await pg.fill('#ap-fecha', HOY);
  await elegir('mendes', 'A008'); await guardar(pg, 'v-aplicacion-form');
  await pg.waitForSelector('#ap-ok:not([hidden])');
  chk(fila(mundo, 'Aplicaciones', 'AP013')['ID alumno'] === 'A008', 'un aviso informativo no impide guardar');
  await formApl(pg, 'O007', 1);
  await elegir('castañeda', 'A009');
  avisos = await pg.$$eval('#ap-avisos .aviso', a => a.map(x => x.textContent));
  chk(avisos.length === 1 && /nacionalidad «Estados Unidos» y Isabella Castañeda tiene «Argentina · Países Bajos»/.test(avisos[0]), 'nacionalidad requerida distinta → aviso: ' + avisos.join(' | '));
  await elegir('haddad', 'A012');
  chk((await pg.$$('#ap-avisos .aviso')).length === 0, 'Rafael (EE. UU.): sin avisos');
  // oferta cerrada
  await formApl(pg, 'O006', 1);
  chk(/Esta oferta está cerrada/.test(await texto(pg, '#ap-cerrada')), 'oferta cerrada: avisa');
  // ronda inexistente
  await pg.goto(BASE + '#/oferta/O002/ronda/9/aplicar'); await pg.waitForSelector('#v-aplicacion-form .card');
  chk(/Ronda no encontrada/.test(await texto(pg, '#v-aplicacion-form')), 'ronda que no existe: lo dice');
  await pg.goto(BASE + '#/oferta/O999/ronda/1/aplicar'); await pg.waitForSelector('#v-aplicacion-form .card');
  chk(/Oferta no encontrada/.test(await texto(pg, '#v-aplicacion-form')), 'oferta que no existe: lo dice');
  // lista larga
  await formApl(pg, 'O001', 1);
  chk((await pg.$$('#ap-lista input')).length === 40 && /Se muestran 40 de 100\. Escribe para acotar/.test(await texto(pg, '#ap-cuenta')), 'con 100 alumnos solo enseña 40 y pide afinar');
  await pg.fill('#ap-q', 'apellido150');
  chk((await pg.$$('#ap-lista input')).length === 1, 'al buscar aparece el que no estaba entre los 40');
  await pg.check('#ap-al-A150'); await pg.fill('#ap-q', 'nombre10');
  chk(await pg.isChecked('#ap-al-A150'), 'el elegido sigue a la vista y marcado aunque cambie la búsqueda');
  // texto peligroso en un nombre
  await formApl(pg, 'O002', 2);
  chk(await pg.evaluate(() => !window.__hack && !document.querySelector('#ap-lista img')) && (await texto(pg, '#ap-lista')).includes('<img src=x'), 'un nombre con HTML se ve como texto y no se ejecuta');
  chk(log.consola.length === 0, 'sin errores de consola/CSP: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 7. Añadir solicitud: respuesta perdida, otra persona, sin conexión, salir sin guardar */
{
  console.log('7. Añadir solicitud: fallos y conflictos');
  const { pg, ctx, log, mundo, ctrl } = await entrar('script');
  await formApl(pg, 'O002', 2);
  await pg.check('#ap-al-A003');
  const n0 = filas(mundo, 'Aplicaciones').length;
  ctrl.perderRespuesta = true;
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForSelector('#v-aplicacion-form .error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await texto(pg, '#v-aplicacion-form .error')) && /sí se haya guardado/.test(await texto(pg, '#v-aplicacion-form .error')) && filas(mundo, 'Aplicaciones').length === n0 + 1 && await pg.isChecked('#ap-al-A003'), 'respuesta perdida: lo dice (se guardó) y conserva lo escrito');
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForSelector('#ap-ok:not([hidden])');
  chk(/Valentina Aguirre ya tenía solicitud en la ronda 2 \(Recibida\)/.test(await texto(pg, '#ap-ok')) && filas(mundo, 'Aplicaciones').length === n0 + 1 && filas(mundo, 'Historial').length === 37, 'al reintentar la reconoce: no se duplica ni la aplicación ni su historial');
  chk(!(await texto(pg, '#ap-lista')).includes('Valentina Aguirre'), 'y sale de la lista');
  // otra persona la crea mientras tanto
  await pg.check('#ap-al-A005');
  mundo.llamar(base(mundo, { action: 'crearAplicacion', idAlumno: 'A005', idOferta: 'O002', numeroRonda: 2, fecha: HOY, notas: 'de otra persona' }));
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForFunction(() => /Camila Santana ya tenía solicitud/.test(document.querySelector('#ap-ok').textContent));
  chk(/Camila Santana ya tenía solicitud en la ronda 2/.test(await texto(pg, '#ap-ok')) && filas(mundo, 'Aplicaciones').filter(a => a['ID alumno'] === 'A005').length === 1, 'si otra persona ya la había creado: lo dice y no duplica');
  // sin conexión
  await pg.check('#ap-al-A006');
  ctrl.abortar = true;
  const n1 = filas(mundo, 'Aplicaciones').length;
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForSelector('#v-aplicacion-form .error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await texto(pg, '#v-aplicacion-form .error')) && filas(mundo, 'Aplicaciones').length === n1 && await pg.isChecked('#ap-al-A006') && !(await pg.isDisabled('#ap-q')), 'sin conexión: error claro, nada escrito, la selección sigue');
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForFunction(() => /Andrés Duarte/.test(document.querySelector('#ap-ok').textContent));
  chk(filas(mundo, 'Aplicaciones').length === n1 + 1, 'al reintentar se guarda');
  // la ronda se borra mientras tanto (alguien edita el Sheet)
  await pg.check('#ap-al-A007');
  mundo.hojas.Alumnos.m = mundo.hojas.Alumnos.m.filter(f => f[0] !== 'A007');
  await guardar(pg, 'v-aplicacion-form');
  await pg.waitForSelector('#v-aplicacion-form .error:not([hidden])');
  chk(/Este alumno ya no está en el Sheet/.test(await texto(pg, '#v-aplicacion-form .error')), 'alumno borrado del Sheet mientras tanto: lo dice');
  // salir sin guardar
  pg.on('dialog', d => d.accept());   // la pantalla anterior tiene cambios sin guardar: al ir a otra se acepta descartarlos
  await formApl(pg, 'O003', 2);
  pg.removeAllListeners('dialog');
  let dialogos = 0; pg.on('dialog', d => { dialogos++; d.dismiss(); });
  await pg.click('#v-aplicacion-form .secondary');
  chk(dialogos === 0, 'sin cambios no pregunta');
  await formApl(pg, 'O003', 2);
  await pg.check('#ap-al-A010');
  await pg.click('#v-aplicacion-form .secondary');
  chk(dialogos === 1 && /aplicar/.test(await pg.evaluate(() => location.hash)), 'con un alumno elegido, pregunta y se queda');
  await pg.click('#tabs a[data-tab=inicio]');
  chk(dialogos === 2, 'cambiar de pestaña también pregunta');
  chk(log.consola.every(c => /Failed to load resource|net::ERR/i.test(c)), 'solo errores de red esperados: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 8. Cambiar el estado */
{
  console.log('8. Cambiar el estado');
  const { pg, ctx, log, mundo } = await entrar('script');
  await ir(pg, '#/aplicacion/AP004', '#v-aplicacion .card');
  await pg.click('#ap-estado'); await pg.waitForSelector('#es-estado');
  chk(await pg.innerText('#titulo') === 'Cambiar estado' && /Lucía Quintero/.test(await texto(pg, '#v-estado-form .sub')) && /Ahora:\s*En revisión/.test(await texto(pg, '#v-estado-form .estado-actual')), 'abre con el alumno y el estado de ahora');
  const opciones = await pg.$$eval('#es-estado option', o => o.map(x => x.value));
  chk(opciones.join() === 'Recibida,En revisión,Enviada a la empresa,Entrevista,Contratado,Descartado' && await pg.inputValue('#es-estado') === 'En revisión', 'todos los estados, con el actual elegido');
  chk(!(await visible(pg, '#es-motivo-caja')) && await pg.inputValue('#es-fecha') === HOY && await pg.getAttribute('#es-fecha', 'min') === '2026-10-27', 'sin motivo mientras no sea Descartado; fecha de hoy; no antes de su último cambio (27/10)');
  const n0 = escrituras(log).length;
  await guardar(pg, 'v-estado-form');
  chk(/Todavía no has cambiado nada/.test(await texto(pg, '#v-estado-form .error')) && escrituras(log).length === n0, 'sin cambios: "No has cambiado nada." y no envía');
  await pg.selectOption('#es-estado', 'Descartado');
  chk(await visible(pg, '#es-motivo-caja'), 'al elegir Descartado aparece el motivo');
  await guardar(pg, 'v-estado-form');
  chk(/Elige el motivo del descarte/.test(await texto(pg, '#v-estado-form .error')) && escrituras(log).length === n0, 'Descartado sin motivo: lo pide');
  await pg.selectOption('#es-motivo', 'Permiso de trabajo');
  await pg.selectOption('#es-estado', 'Entrevista');
  chk(!(await visible(pg, '#es-motivo-caja')), 'al cambiar a otro estado el motivo desaparece');
  await pg.fill('#es-fecha', '2026-10-26'); await guardar(pg, 'v-estado-form');
  chk(/anterior al 27 de octubre de 2026/.test(await texto(pg, '#v-estado-form .error')), 'antes de su último cambio: lo rechaza');
  await pg.fill('#es-fecha', '2099-01-01'); await guardar(pg, 'v-estado-form');
  chk(/no puede ser futura/.test(await texto(pg, '#v-estado-form .error')), 'fecha futura rechazada');
  await pg.fill('#es-fecha', HOY);
  await pg.fill('#es-nota', '<b>x</b>'); await guardar(pg, 'v-estado-form');
  chk(/lo toma por código/.test(await texto(pg, '#v-estado-form .error')) && escrituras(log).length === n0, 'HTML en la nota: rechazado sin enviar');
  await pg.fill('#es-nota', 'Le llaman el lunes.'); await guardar(pg, 'v-estado-form');
  await aterriza(pg, '#/aplicacion/AP004', '#v-aplicacion .cabecera');
  await pg.waitForFunction(() => /Entrevista/.test(document.querySelector('#v-aplicacion .cabecera .insignia').textContent));
  chk(/Estado cambiado a «Entrevista»\./.test(await texto(pg, '#v-aplicacion .aviso-ok')), 'aviso "Estado cambiado a «Entrevista»."');
  const j = cuerpoDe(log, 'cambiarEstado')[0];
  chk(j.id === 'AP004' && j.estado === 'Entrevista' && j.motivo === '' && j.nota === 'Le llaman el lunes.' && j.anterior.estado === 'En revisión' && j.anterior.motivo === '' && sinClaveEnUrl(log), 'la petición lleva el estado, motivo vacío (aunque se había elegido uno y se cambió de idea), nota y lo que se creía que había');
  const ap = fila(mundo, 'Aplicaciones', 'AP004'), h = fila(mundo, 'Historial', 'H037');
  chk(ap.Estado === 'Entrevista' && ap['Motivo de descarte'] === '' && h['ID aplicación'] === 'AP004' && h['Estado anterior'] === 'En revisión' && h['Estado nuevo'] === 'Entrevista' && h.Nota === 'Le llaman el lunes.' && h.Fecha === HOY, 'en el Sheet: estado nuevo y la línea de historial con anterior, nuevo, fecha y nota');
  const hist = await pg.$$eval('#v-aplicacion .historial li', li => li.map(x => x.innerText.replace(/\s+/g, ' ')));
  chk(hist.length === 3 && /^En revisión → Entrevista/.test(hist[0]) && /Le llaman el lunes\./.test(hist[0]), 'el historial del detalle enseña el cambio arriba: ' + hist[0]);
  // descartar con motivo
  await pg.click('#ap-estado'); await pg.waitForSelector('#es-estado');
  await pg.selectOption('#es-estado', 'Descartado'); await pg.selectOption('#es-motivo', 'La empresa eligió a otro');
  await guardar(pg, 'v-estado-form'); await aterriza(pg, '#/aplicacion/AP004', '#v-aplicacion .cabecera');
  await pg.waitForFunction(() => /Descartado/.test(document.querySelector('#v-aplicacion .cabecera .insignia').textContent));
  chk(/Motivo del descarte\s+La empresa eligió a otro/.test(await texto(pg, '#v-aplicacion [aria-label=Datos]')) && fila(mundo, 'Aplicaciones', 'AP004')['Motivo de descarte'] === 'La empresa eligió a otro' && fila(mundo, 'Historial', 'H038')['Motivo de descarte'] === 'La empresa eligió a otro', 'descartar con motivo: queda en el detalle, en la aplicación y en el historial');
  // reabrir
  await pg.click('#ap-estado'); await pg.waitForSelector('#es-estado');
  chk(await pg.inputValue('#es-estado') === 'Descartado' && await pg.inputValue('#es-motivo') === 'La empresa eligió a otro' && await visible(pg, '#es-motivo-caja'), 'al abrir un descartado, enseña su estado y motivo');
  await pg.selectOption('#es-estado', 'En revisión'); await guardar(pg, 'v-estado-form');
  await aterriza(pg, '#/aplicacion/AP004', '#v-aplicacion .cabecera');
  await pg.waitForFunction(() => /En revisión/.test(document.querySelector('#v-aplicacion .cabecera .insignia').textContent));
  chk(!/Motivo del descarte/.test(await texto(pg, '#v-aplicacion')) && fila(mundo, 'Aplicaciones', 'AP004')['Motivo de descarte'] === '' && fila(mundo, 'Historial', 'H038')['Estado nuevo'] === 'Descartado', 'reabrir: el motivo se vacía, y el historial del descarte sigue');
  // cambiar solo el motivo
  await ir(pg, '#/aplicacion/AP002/estado', '#es-estado');
  await pg.selectOption('#es-motivo', 'Otro'); await guardar(pg, 'v-estado-form');
  await aterriza(pg, '#/aplicacion/AP002', '#v-aplicacion .cabecera');
  chk(/Motivo del descarte\s+Otro/.test(await texto(pg, '#v-aplicacion [aria-label=Datos]')), 'cambiar solo el motivo de un descartado se puede');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 9. Cambiar el estado: otra persona, respuesta perdida, sin conexión, salir sin guardar */
{
  console.log('9. Cambiar el estado: conflictos y fallos');
  const { pg, ctx, log, mundo, ctrl } = await entrar('script', m => { m.hojas.Aplicaciones.m.push(['AP013', 'A003', 'O004', '1', '2026-10-29', 'Fichado', '', '']); m.hojas.Rondas.m.push(['R006', 'O004', '1', '2026-10-28']); });
  const ANT = (estado, motivo = '') => ({ estado, motivo });
  const otra = (id, estado, motivo, anterior) => mundo.llamar(base(mundo, { action: 'cambiarEstado', id, estado, motivo, fecha: HOY, nota: 'de otra persona', anterior }));
  // un estado que ya no está en la lista se conserva en el desplegable
  await formEstado(pg, 'AP013');
  chk((await pg.$$eval('#es-estado option', o => o.map(x => x.value))).includes('Fichado') && await pg.inputValue('#es-estado') === 'Fichado', 'un estado que ya no está en Listas se sigue viendo (para no perderlo)');
  // conflicto: elegir "guardar el mío igualmente"
  await formEstado(pg, 'AP001');   // Entrevista
  await pg.selectOption('#es-estado', 'Contratado'); await pg.fill('#es-nota', 'Mi cambio');
  otra('AP001', 'Descartado', 'Otro', ANT('Entrevista'));
  const n0 = filas(mundo, 'Historial').length;
  await guardar(pg, 'v-estado-form');
  await pg.waitForSelector('#v-estado-form .conflicto:not([hidden])');
  chk(/Esta solicitud ha cambiado mientras la editabas/.test(await texto(pg, '#v-estado-form .conflicto')) && /Estado en el Sheet\s+Descartado \(Otro\)/.test(await texto(pg, '#v-estado-form .conflicto')) && await pg.inputValue('#es-estado') === 'Contratado' && await pg.inputValue('#es-nota') === 'Mi cambio', 'conflicto: enseña cómo está ahora y conserva lo escrito');
  chk(filas(mundo, 'Historial').length === n0 && fila(mundo, 'Aplicaciones', 'AP001').Estado === 'Descartado', '... y no se ha pisado nada (sigue Descartado y sin líneas nuevas)');
  await pg.click('#v-estado-form .conflicto button:has-text("Guardar mi versión")');
  await aterriza(pg, '#/aplicacion/AP001', '#v-aplicacion .cabecera');
  await pg.waitForFunction(() => /Contratado/.test(document.querySelector('#v-aplicacion .cabecera .insignia').textContent));
  const hh = fila(mundo, 'Historial', 'H038');
  chk(fila(mundo, 'Aplicaciones', 'AP001').Estado === 'Contratado' && fila(mundo, 'Aplicaciones', 'AP001')['Motivo de descarte'] === '' && hh['Estado anterior'] === 'Descartado' && hh['Estado nuevo'] === 'Contratado', 'guardar el mío igualmente: queda Contratado y el historial dice Descartado → Contratado');
  // conflicto: descartar el mío
  await formEstado(pg, 'AP005');   // Recibida
  await pg.selectOption('#es-estado', 'Entrevista');
  otra('AP005', 'En revisión', '', ANT('Recibida'));
  await guardar(pg, 'v-estado-form');
  await pg.waitForSelector('#v-estado-form .conflicto:not([hidden])');
  await pg.click('#v-estado-form .conflicto button:has-text("Quedarme con la del Sheet")');
  await aterriza(pg, '#/aplicacion/AP005', '#v-aplicacion .cabecera');
  chk(/Listo: ahora ves lo que hay en el Sheet/.test(await texto(pg, '#v-aplicacion .aviso-ok')) && /En revisión/.test(await texto(pg, '#v-aplicacion .cabecera')) && fila(mundo, 'Aplicaciones', 'AP005').Estado === 'En revisión', 'descartar el mío: carga lo que había y no escribe');
  chk((await pg.$$eval('#v-aplicacion .historial li', l => l.length)) === 2, 'y el historial ya incluye el cambio de la otra persona');
  // conflicto: la otra persona hizo lo mismo que yo
  await formEstado(pg, 'AP007');   // Enviada a la empresa
  await pg.selectOption('#es-estado', 'Entrevista');
  otra('AP007', 'Entrevista', '', ANT('Enviada a la empresa'));
  const n1 = filas(mundo, 'Historial').length;
  await guardar(pg, 'v-estado-form');
  await aterriza(pg, '#/aplicacion/AP007', '#v-aplicacion .cabecera');
  chk(/Estado cambiado a «Entrevista»/.test(await texto(pg, '#v-aplicacion .aviso-ok')) && filas(mundo, 'Historial').length === n1, 'si la otra persona hizo el mismo cambio: no hay conflicto que decidir y no se duplica el historial');
  // respuesta perdida
  await formEstado(pg, 'AP009');   // En revisión
  await pg.selectOption('#es-estado', 'Enviada a la empresa');
  const n2 = filas(mundo, 'Historial').length;
  ctrl.perderRespuesta = true;
  await guardar(pg, 'v-estado-form');
  await pg.waitForSelector('#v-estado-form .error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await texto(pg, '#v-estado-form .error')) && /sí se haya guardado/.test(await texto(pg, '#v-estado-form .error')) && filas(mundo, 'Historial').length === n2 + 1, 'respuesta perdida: lo dice y el Sheet sí lo tiene');
  await guardar(pg, 'v-estado-form');
  await aterriza(pg, '#/aplicacion/AP009', '#v-aplicacion .cabecera');
  chk(filas(mundo, 'Historial').length === n2 + 1 && /Estado cambiado a «Enviada a la empresa»/.test(await texto(pg, '#v-aplicacion .aviso-ok')), 'al reintentar la reconoce como guardada: una sola línea de historial');
  // sin conexión
  await formEstado(pg, 'AP010');   // Recibida
  await pg.selectOption('#es-estado', 'En revisión'); await pg.fill('#es-nota', 'Mi nota');
  const n3 = filas(mundo, 'Historial').length;
  ctrl.abortar = true; await guardar(pg, 'v-estado-form');
  await pg.waitForSelector('#v-estado-form .error:not([hidden])');
  chk(/No se ha podido conectar con Google/.test(await texto(pg, '#v-estado-form .error')) && filas(mundo, 'Historial').length === n3 && await pg.inputValue('#es-nota') === 'Mi nota' && await pg.inputValue('#es-estado') === 'En revisión', 'sin conexión: error claro, nada escrito, lo escrito sigue');
  await guardar(pg, 'v-estado-form'); await aterriza(pg, '#/aplicacion/AP010', '#v-aplicacion .cabecera');
  chk(filas(mundo, 'Historial').length === n3 + 1, 'al reintentar se guarda una vez');
  // la aplicación desaparece del Sheet
  await formEstado(pg, 'AP011');
  await pg.selectOption('#es-estado', 'Recibida');
  mundo.hojas.Aplicaciones.m = mundo.hojas.Aplicaciones.m.filter(f => f[0] !== 'AP011');
  await guardar(pg, 'v-estado-form');
  await pg.waitForSelector('#v-estado-form .error:not([hidden])');
  chk(/Esta solicitud ya no está en el Sheet/.test(await texto(pg, '#v-estado-form .error')), 'aplicación borrada del Sheet mientras tanto: lo dice');
  // salir sin guardar
  pg.on('dialog', d => d.accept());
  await formEstado(pg, 'AP012');
  pg.removeAllListeners('dialog');
  let dialogos = 0; pg.on('dialog', d => { dialogos++; d.dismiss(); });
  await pg.click('#v-estado-form .secondary');
  chk(dialogos === 0, 'sin cambios no pregunta');
  await formEstado(pg, 'AP012');
  await pg.selectOption('#es-estado', 'Recibida');
  await pg.click('#v-estado-form .secondary');
  chk(dialogos === 1 && /estado/.test(await pg.evaluate(() => location.hash)), 'con cambios pregunta y se queda');
  await pg.click('#tabs a[data-tab=buscar]');
  chk(dialogos === 2, 'cambiar de pestaña también pregunta');
  chk(log.consola.every(c => /Failed to load resource|net::ERR/i.test(c)), 'solo errores de red esperados: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 10. Script antiguo o sin hojas: nada de escribir */
{
  console.log('10. Script antiguo y Sheet sin las hojas');
  let { pg, ctx, ctrl } = await entrar('script');
  ctrl.alResponder = (j, accion) => { if (accion === 'data' || accion === 'ping') j.soporta = ['guardarEntrevista', 'guardarOferta']; return j; };
  for (const [h, v] of [['#/oferta/O004/ronda/nueva', '#v-ronda-form'], ['#/oferta/O002/ronda/2/aplicar', '#v-aplicacion-form'], ['#/aplicacion/AP004/estado', '#v-estado-form']]) {
    await pg.goto(BASE + h); await pg.waitForSelector(v + ' .card');
    chk(/No se puede guardar/.test(await texto(pg, v)) && /versión anterior/.test(await texto(pg, v)) && (await pg.$$(v + ' form')).length === 0, `script antiguo: ${h} no deja guardar y lo explica`);
  }
  await ctx.close();
  ({ pg, ctx } = await entrar('script', m => { delete m.hojas.Rondas; delete m.hojas.Aplicaciones; delete m.hojas.Historial; }));
  await pg.goto(BASE + '#/oferta/O004/ronda/nueva'); await pg.waitForSelector('#v-ronda-form .card');
  chk(/No se puede guardar/.test(await texto(pg, '#v-ronda-form')) && /faltan hojas/.test(await texto(pg, '#v-ronda-form')) && (await pg.$$('#v-ronda-form form')).length === 0, 'sin las hojas: no deja guardar y lo explica');
  await ctx.close();
}

/* 10b. La clave cambia mientras se tiene un formulario abierto; el script rechaza una fecha que la app no podía saber */
{
  console.log('10b. Clave que ya no vale y fecha anterior que solo el script conoce');
  const { pg, ctx, mundo } = await entrar('script');
  await formRonda(pg, 'O004');
  mundo.props.set('CLAVE', 'otra clave nueva y distinta 9876543210');
  await guardar(pg, 'v-ronda-form');
  await pg.waitForSelector('#v-ronda-form .error:not([hidden])');
  chk(/La clave ha cambiado o ya no vale/.test(await texto(pg, '#v-ronda-form .error')) && (await pg.evaluate(() => localStorage.getItem('gad.clave'))) === null && filas(mundo, 'Rondas').length === 5, 'clave rechazada: lo dice, olvida la clave guardada y no escribe');
  await ctx.close();
  {
    const t = await entrar('script');
    await formEstado(t.pg, 'AP004');
    t.mundo.props.set('CLAVE', 'otra clave nueva y distinta 9876543210');
    await t.pg.selectOption('#es-estado', 'Entrevista'); await guardar(t.pg, 'v-estado-form');
    await t.pg.waitForSelector('#v-estado-form .error:not([hidden])');
    chk(/La clave ha cambiado o ya no vale/.test(await texto(t.pg, '#v-estado-form .error')), 'al cambiar el estado, igual');
    await t.ctx.close();
  }
  const t2 = await entrar('script');
  await formEstado(t2.pg, 'AP004');   // En revisión, último movimiento 27/10
  const otra = (estado, fecha, anterior) => t2.mundo.llamar(base(t2.mundo, { action: 'cambiarEstado', id: 'AP004', estado, motivo: '', fecha, nota: '', anterior }));
  otra('Entrevista', HOY, { estado: 'En revisión', motivo: '' }); otra('En revisión', HOY, { estado: 'Entrevista', motivo: '' });   // otra persona: ida y vuelta hoy
  await t2.pg.selectOption('#es-estado', 'Recibida'); await t2.pg.fill('#es-fecha', '2026-10-28');
  await guardar(t2.pg, 'v-estado-form');
  await t2.pg.waitForSelector('#v-estado-form .error:not([hidden])');
  const [aa, mm, dd] = HOY.split('-').map(Number), meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  chk((await texto(t2.pg, '#v-estado-form .error')) === `La fecha no puede ser anterior al ${dd} de ${meses[mm - 1]} de ${aa}.` && escrituras(t2.log).length === 1, 'fecha anterior al último cambio (que otra persona acaba de hacer): el script la rechaza y la app lo explica con la fecha, sin escribir');
  await t2.ctx.close();
}

/* 10c. Defensas de la capa de datos y respuestas raras del script */
{
  console.log('10c. Capa de datos: sin permiso y respuestas raras');
  let { pg, ctx, log } = await entrar('demo');
  await ir(pg, '#/oferta/O004', '#v-oferta .cabecera');
  const r = await pg.evaluate(async () => {
    const d = await import('/js/data/index.js');
    const fallo = async f => { try { await f(); return 'sin error'; } catch (e) { return e.codigo; } };
    return [await fallo(() => d.registrarRonda('O004', 1, '2026-10-30')), await fallo(() => d.crearAplicacion({ idAlumno: 'A003', idOferta: 'O002', numeroRonda: '2', fecha: '2026-10-30', notas: '' })),
      await fallo(() => d.cambiarEstado('AP004', { estado: 'Entrevista', motivo: '', fecha: '2026-10-30', nota: '' }, { estado: 'En revisión', motivo: '' }))];
  });
  chk(r.join() === 'solo-lectura,solo-lectura,solo-lectura' && escrituras(log).length === 0 && log.peticiones.length === 0, 'en la demo, las 3 funciones de escribir se niegan por sí solas y no envían nada: ' + r);
  await ctx.close();
  const t = await entrar('script');
  t.pg.on('dialog', d => d.accept());   // al saltar de un formulario con cambios a otro, se acepta descartarlos
  t.ctrl.alResponder = (j, accion) => (accion === 'registrarRonda' ? { ok: true, ronda: null } : accion === 'cambiarEstado' ? { ok: true, aplicacion: { id: 'AP004', estado: 5 }, historial: null } : accion === 'crearAplicacion' ? { ok: true, aplicacion: { id: 'AP013' }, historial: [] } : j);
  await formRonda(t.pg, 'O004'); await guardar(t.pg, 'v-ronda-form');
  await t.pg.waitForSelector('#v-ronda-form .error:not([hidden])');
  chk(/no responde como debería el script/.test(await texto(t.pg, '#v-ronda-form .error')), 'una respuesta sin la ronda: error claro, sin romperse');
  await formEstado(t.pg, 'AP004'); await t.pg.selectOption('#es-estado', 'Entrevista'); await guardar(t.pg, 'v-estado-form');
  await t.pg.waitForSelector('#v-estado-form .error:not([hidden])');
  chk(/no responde como debería el script/.test(await texto(t.pg, '#v-estado-form .error')), 'una aplicación con campos que no son texto: error claro');
  await formApl(t.pg, 'O002', 2); await t.pg.check('#ap-al-A003'); await guardar(t.pg, 'v-aplicacion-form');
  await t.pg.waitForSelector('#v-aplicacion-form .error:not([hidden])');
  chk(/no responde como debería el script/.test(await texto(t.pg, '#v-aplicacion-form .error')) && t.log.consola.length === 0, 'un historial que no es un objeto: error claro y sin errores de consola');
  await t.ctx.close();
  const u = await entrar('script');
  await formEstado(u.pg, 'AP005'); await u.pg.selectOption('#es-estado', 'En revisión'); await u.pg.fill('#es-nota', '  Hola   mundo  ');
  await guardar(u.pg, 'v-estado-form'); await aterriza(u.pg, '#/aplicacion/AP005', '#v-aplicacion .cabecera');
  chk(cuerpoDe(u.log, 'cambiarEstado')[0].nota === 'Hola   mundo' && fila(u.mundo, 'Historial', 'H037').Nota === 'Hola   mundo', 'la nota se envía sin espacios sobrantes al principio y al final');
  await u.ctx.close();
}

/* 11. Móvil pequeño */
for (const ancho of [390, 320]) {
  console.log(`11. Diseño a ${ancho} px`);
  const { pg, ctx } = await entrar('script');
  await pg.setViewportSize({ width: ancho, height: 800 });
  for (const [h, sel] of [['#/oferta/O004/ronda/nueva', '#ro-fecha'], ['#/oferta/O002/ronda/2/aplicar', '#ap-q'], ['#/aplicacion/AP002/estado', '#es-estado']]) {
    await ir(pg, h, sel);
    chk(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${h}: sin desbordamiento horizontal`);
    const alto = await pg.$$eval('.view.on button, .view.on input:not([type=radio]), .view.on select, .view.on .elegir label', xs => Math.min(...xs.filter(x => x.getBoundingClientRect().height > 0).map(x => x.getBoundingClientRect().height)));
    chk(alto >= 44, `${h}: objetivos táctiles >= 44 px (${alto})`);
    const tam = await pg.$$eval('.view.on input:not([type=radio]), .view.on select, .view.on textarea', xs => Math.min(...xs.map(x => parseFloat(getComputedStyle(x).fontSize))));
    chk(tam >= 16, `${h}: letra de los campos >= 16 px (el iPhone no amplía al enfocar): ${tam}`);
  }
  await ctx.close();
}

await terminar();
