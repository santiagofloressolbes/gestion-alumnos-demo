// Pruebas de los borradores de correo de seguimiento: el texto (funciones puras) y la pantalla (idioma, vista previa, Copiar y abrir el correo).
// Lo que no debe salir NUNCA (notas de entrevista, motivo de descarte, situación de trabajo, estatus migratorio, nacionalidad…)
// se comprueba con "canarios": textos inventados metidos en esos campos, que no pueden aparecer en ningún borrador.
import * as C from '../../js/util/correo.js';
import fs from 'node:fs';
import { leerCSV } from '../../js/util/csv.js';
import { aReglasMatch } from '../../js/data/tablas.js';
import { HOJAS_MATCH } from '../../js/data/esquema.js';
const AREAS_MOCK = () => { const f = leerCSV(fs.readFileSync(new URL('../../datos-mock/Areas.csv', import.meta.url), 'utf8')); return aReglasMatch({ areas: { cabecera: f[0].map(h => h.trim()), filas: f.slice(1) } }, HOJAS_MATCH).areas; };
import { nuevo, chk, terminar, BASE } from './ayudas.mjs';

const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const CANARIOS = ['CANARIO-NOTAS-ENTREVISTA', 'CANARIO-SITUACION', 'CANARIO-NACIONALIDAD', 'CANARIO-MOTIVO', 'CANARIO-NOTA-APP', 'CANARIO-NOTA-HISTORIAL', 'CANARIO-CV', 'CANARIO-EXPERIENCIA', 'CANARIO-POR-QUE', 'CANARIO-REQUISITO', 'CANARIO-APELLIDO', 'CANARIO-UBICACION'];

const alumno = { id: 'A1', nombre: 'Lucía', apellidos: CANARIOS[10], master: 'MBA en español', areaDestino: 'Finanzas', areaExperiencia: 'Producto',
  notasEntrevista: CANARIOS[0], situacionTrabajo: CANARIOS[1], nacionalidadPrincipal: CANARIOS[2], nacionalidadSecundaria: CANARIOS[2], enlaceCV: 'https://x.org/' + CANARIOS[6],
  resumenExperiencia: CANARIOS[7], porQue: CANARIOS[8], fechaUltimaEntrevista: '2026-10-01' };
const oferta = { id: 'O1', empresa: 'Club Mock B', titulo: 'Becario/a de patrocinio', area: 'Comercial y patrocinio', tipo: 'Prácticas', ubicacion: CANARIOS[11],
  requisitoNacionalidad: CANARIOS[9], requisitoPermiso: CANARIOS[9], enlace: 'https://x.org/' + CANARIOS[9] };
const app = estado => ({ id: 'AP1', idAlumno: 'A1', idOferta: 'O1', estado, motivo: CANARIOS[3], notas: CANARIOS[4], nota: CANARIOS[5], fecha: '2026-10-11' });
const todos = b => [b.asunto, b.cuerpo, C.textoCompleto(b), C.enlaceCorreo(b) || '', decodeURIComponent(C.enlaceCorreo(b) || '')].join('\n');

console.log('1. Qué estados tienen borrador');
igual(C.ESTADOS_EN_PROCESO, ['Recibida', 'En revisión', 'Enviada a la empresa', 'Entrevista'], '«En proceso» son Recibida, En revisión, Enviada a la empresa y Entrevista');
for (const e of C.ESTADOS_EN_PROCESO) igual(C.tipoDeEstado(e), 'en-proceso', `${e}: en proceso`);
igual(C.tipoDeEstado('Descartado'), 'descartado', 'Descartado: descartado');
for (const e of ['Contratado', 'Rechazada', '', null, undefined, 'otra cosa']) igual(C.tipoDeEstado(e), null, `«${e}»: sin borrador`);
igual(C.tipoDeEstado('en revision'), 'en-proceso', 'sin tilde ni mayúsculas también vale');
igual(C.borradorCorreo({ alumno, oferta, aplicacion: app('Contratado') }), null, 'Contratado: no se genera borrador');
igual(C.borradorCorreo({ alumno, oferta, aplicacion: app('') }), null, 'sin estado: no se genera borrador');
igual(C.idiomaPorDefecto({ master: 'MBA en inglés' }), 'en', 'MBA en inglés: inglés por defecto');
igual(C.idiomaPorDefecto({ master: 'MBA en español' }), 'es', 'MBA en español: español');
igual(C.idiomaPorDefecto({ master: 'Marketing Deportivo / Global Sports Marketing' }), 'es', 'otro programa: español (por defecto)');
igual(C.idiomaPorDefecto({}), 'es', 'sin programa: español');
{
  const L = [{ nombre: 'Global Sports Marketing', idioma: 'en' }, { nombre: 'MBA en inglés', idioma: 'es' }, { nombre: 'Programa X', idioma: '' }, { nombre: 'Programa English', idioma: '' }, { nombre: 'Otro', idioma: 'klingon' }, { nombre: 'Curso', idioma: ' English ' }, { nombre: 'Otro curso', idioma: 'Inglés' }, { nombre: 'Curso es', idioma: 'Español' }];
  const i = m => C.idiomaPorDefecto({ master: m }, L);
  igual(i('Global Sports Marketing'), 'en', 'la columna «Idioma del programa» = en: inglés (aunque el nombre no lo diga)');
  igual(i('MBA en inglés'), 'es', 'la columna manda sobre el nombre: «es» en «MBA en inglés» da español');
  igual(i('Programa X'), 'es', 'columna vacía y sin la palabra: español');
  igual(i('Programa English'), 'en', 'columna vacía y el nombre dice English: inglés');
  igual(i('Otro'), 'es', 'columna que no se entiende: español');
  igual([i('Curso'), i('Otro curso'), i('Curso es')], ['en', 'en', 'es'], 'English, Inglés y Español también valen (con espacios y sin mirar tildes)');
  igual(i('No está en la lista'), 'es', 'programa que no está en Listas: español');
  igual(C.idiomaPorDefecto({ master: 'MBA en inglés' }, undefined), 'en', 'sin lista de programas: vale el respaldo por el nombre');
  igual(C.idiomaPorDefecto({ master: 'Inglesa Marketing' }, L), 'es', '«Inglesa» no es la palabra «inglés» (se mira la palabra entera)');
  igual(C.idiomaPorDefecto({ master: 'Máster Bilingüe English-Spanish' }, L), 'en', '«English» como palabra suelta, también entre guiones');
}
igual(C.IDIOMAS.map(i => i.clave), ['es', 'en'], 'dos idiomas');

console.log('2. El texto en español');
{
  const b = C.borradorCorreo({ alumno, oferta, aplicacion: app('Entrevista'), idioma: 'es', firma: 'Ana Pérez' });
  igual(b.tipo, 'en-proceso', 'tipo');
  igual(b.asunto, 'Seguimiento de tu solicitud: Becario/a de patrocinio en Club Mock B', 'asunto');
  igual(b.cuerpo, 'Hola Lucía,\n\nTu solicitud para Becario/a de patrocinio en Club Mock B ha pasado a la fase de entrevista.\n\nSeguimos el proceso de cerca y te avisaremos en cuanto haya novedades. Si tienes cualquier duda, escríbeme.\n\nUn saludo,\nAna Pérez', 'cuerpo de «Entrevista»');
  chk(b.faltaFirma === false, 'con firma, no falta');
  for (const [e, frag] of [['Recibida', 'Hemos recibido tu solicitud'], ['En revisión', 'está en revisión'], ['Enviada a la empresa', 'Hemos enviado tu perfil a la empresa'], ['Entrevista', 'fase de entrevista']])
    chk(C.borradorCorreo({ alumno, oferta, aplicacion: app(e), firma: 'Ana' }).cuerpo.includes(frag), `${e}: «${frag}»`);
  const d = C.borradorCorreo({ alumno, oferta, aplicacion: app('Descartado'), idioma: 'es', firma: 'Ana Pérez' });
  igual(d.tipo, 'descartado', 'descartado: tipo');
  igual(d.asunto, 'Sobre tu solicitud: Becario/a de patrocinio en Club Mock B', 'descartado: asunto');
  igual(d.cuerpo, 'Hola Lucía,\n\nTe escribo para comentarte que, esta vez, tu solicitud para Becario/a de patrocinio en Club Mock B no continúa en el proceso. Gracias por tu interés.\n\nSi quieres orientar tu carrera hacia Comercial y patrocinio, escríbeme y lo hablamos: puedo ayudarte a preparar las próximas oportunidades en esa área.\n\nUn saludo,\nAna Pérez', 'cuerpo de «Descartado» con invitación al área de la oferta');
  chk(!/descartad|rechaz|motivo|perfil no encaja/i.test(d.cuerpo + d.asunto), 'el descartado no dice «descartado», «rechazado» ni ningún motivo');
  const sinArea = C.borradorCorreo({ alumno, oferta: { ...oferta, area: '' }, aplicacion: app('Descartado'), firma: 'Ana' });
  chk(/escríbeme y lo hablamos/.test(sinArea.cuerpo) && !/hacia/.test(sinArea.cuerpo), 'sin área en la oferta: invitación general, sin inventar un área');
}

console.log('3. El texto en inglés');
{
  const b = C.borradorCorreo({ alumno, oferta, aplicacion: app('Enviada a la empresa'), idioma: 'en', firma: 'Ana Pérez' });
  igual(b.asunto, 'Update on your application: Becario/a de patrocinio at Club Mock B', 'asunto en inglés');
  igual(b.cuerpo, "Hi Lucía,\n\nWe have sent your profile to the company for Becario/a de patrocinio at Club Mock B.\n\nWe are following the process closely and will let you know as soon as there is news. If you have any questions, just get in touch.\n\nBest regards,\nAna Pérez", 'cuerpo en inglés');
  const d = C.borradorCorreo({ alumno, oferta, aplicacion: app('Descartado'), idioma: 'en', firma: 'Ana' });
  chk(/will not be moving forward/.test(d.cuerpo) && /focus your career on Comercial y patrocinio/.test(d.cuerpo) && !/descartad|rejected|reason/i.test(d.cuerpo), 'descartado en inglés: invitación y sin motivo');
  chk(!/Un saludo|Hola|Te escribo/.test(b.cuerpo + d.cuerpo), 'ni una palabra en español');
  chk(!/Best regards|Hi |I'm writing/.test(C.borradorCorreo({ alumno, oferta, aplicacion: app('Recibida'), idioma: 'es', firma: 'Ana' }).cuerpo), 'ni una palabra en inglés en el español');
  igual(C.borradorCorreo({ alumno, oferta, aplicacion: app('Recibida'), idioma: 'fr', firma: 'Ana' }).idioma, 'es', 'un idioma desconocido vuelve al español');
  igual(C.lineaAsunto('en') + '|' + C.lineaAsunto('es'), 'Subject|Asunto', 'la línea de asunto según el idioma');
}

console.log('3b. El área en inglés (columna opcional «Área (inglés)» de la hoja Áreas)');
{
  const AREAS = [{ area: 'Comercial y patrocinio', subarea: 'Hospitality', areaEn: '' }, { area: 'Comercial y patrocinio', subarea: 'Activación de marca', areaEn: 'Commercial and sponsorship' }, { area: 'Finanzas', subarea: 'Contabilidad', areaEn: 'Finance' }];
  const en = (o, areas) => C.borradorCorreo({ alumno, oferta: o, aplicacion: app('Descartado'), idioma: 'en', firma: 'Ana', areas }).cuerpo;
  chk(/focus your career on Commercial and sponsorship, get in touch/.test(en(oferta, AREAS)) && !/Comercial y patrocinio/.test(en(oferta, AREAS)), 'en inglés sale el nombre en inglés (el de la primera fila de esa área que lo tiene)');
  chk(/focus your career on Comercial y patrocinio,/.test(en(oferta, [])) && /focus your career on Comercial y patrocinio,/.test(en(oferta, undefined)) && /focus your career on Comercial y patrocinio,/.test(en(oferta, [{ area: 'Comercial y patrocinio', areaEn: '' }])), 'sin hoja, sin columna o con la celda vacía: respaldo al nombre en español (sin hueco ni error)');
  chk(/focus your career on Commercial and sponsorship,/.test(en({ ...oferta, area: ' comercial Y patrocinio ' }, AREAS)), 'el área se reconoce sin fijarse en mayúsculas, tildes ni espacios');
  const es = C.borradorCorreo({ alumno, oferta, aplicacion: app('Descartado'), idioma: 'es', firma: 'Ana', areas: AREAS }).cuerpo;
  chk(/hacia Comercial y patrocinio,/.test(es) && !/Commercial/.test(es), 'en español no cambia: sigue el nombre en español');
  chk(/focus your career on Comercial y patrocinio,/.test(en({ ...oferta, area: 'Área inventada' }, AREAS).replace('Área inventada', 'Comercial y patrocinio')) && /on Área inventada,/.test(en({ ...oferta, area: 'Área inventada' }, AREAS)), 'un área que no está en la hoja se queda como está');
  chk(C.areaEnIdioma('', AREAS, 'en') === '' && C.areaEnIdioma('Finanzas', AREAS, 'es') === 'Finanzas' && C.areaEnIdioma('Finanzas', AREAS, 'en') === 'Finance', 'la función por separado: vacío, español e inglés');
  const mock = AREAS_MOCK();
  chk(mock.length >= 10 && mock.every(f => f.areaEn), 'los datos de ejemplo traen el nombre en inglés de cada área');
}

console.log('4. Firma');
{
  const sin = C.borradorCorreo({ alumno, oferta, aplicacion: app('Recibida'), idioma: 'es' });
  chk(sin.faltaFirma && sin.cuerpo.endsWith('Un saludo,\n[Tu nombre]'), 'sin firma: «[Tu nombre]» y se avisa de que falta');
  chk(C.borradorCorreo({ alumno, oferta, aplicacion: app('Recibida'), idioma: 'en', firma: '   ' }).cuerpo.endsWith('Best regards,\n[Your name]'), 'firma en blanco: «[Your name]»');
  chk(C.borradorCorreo({ alumno, oferta, aplicacion: app('Recibida'), firma: 'Ana\nBcc: x@y.z' }).cuerpo.endsWith('Un saludo,\nAna Bcc: x@y.z'), 'una firma con salto de línea se queda en una línea');
}

console.log('5. Privacidad: lo que nunca sale');
for (const estado of [...C.ESTADOS_EN_PROCESO, 'Descartado']) for (const idioma of ['es', 'en']) {
  const b = C.borradorCorreo({ alumno, oferta, aplicacion: app(estado), idioma, firma: 'Ana' });
  const salido = todos(b);
  const colados = CANARIOS.filter(c => salido.includes(c));
  chk(!colados.length, `${estado} (${idioma}): ningún canario en el asunto, el cuerpo ni el enlace de correo${colados.length ? ': ' + colados : ''}`);
  chk(!/2026-10|\bA1\b|\bAP1\b|\bO1\b/.test([b.asunto, b.cuerpo].join('\n')), `${estado} (${idioma}): ni fechas ni identificadores internos`);
}
chk(!/España|Chile|permiso|Ciudadano|Residente|estudiante/i.test(todos(C.borradorCorreo({ alumno: { ...alumno, nacionalidadPrincipal: 'Chile', situacionTrabajo: 'Residente con permiso de trabajo' }, oferta, aplicacion: app('Descartado'), firma: 'Ana' }))), 'ni nacionalidad ni situación de trabajo reales');
{
  // el apellido, aunque esté en el alumno, no se usa: solo el nombre de pila
  const b = C.borradorCorreo({ alumno, oferta, aplicacion: app('Recibida'), firma: 'Ana' });
  chk(!b.cuerpo.includes(CANARIOS[10]) && b.cuerpo.startsWith('Hola Lucía,'), 'solo el nombre de pila, sin apellidos');
}

console.log('6. Datos incompletos o raros');
{
  const sinEmpresa = C.borradorCorreo({ alumno, oferta: { ...oferta, empresa: '' }, aplicacion: app('Recibida'), firma: 'Ana' });
  chk(sinEmpresa.asunto === 'Seguimiento de tu solicitud: Becario/a de patrocinio' && !/ en \./.test(sinEmpresa.cuerpo), 'sin empresa: no queda «en »');
  const sinPuesto = C.borradorCorreo({ alumno, oferta: { ...oferta, titulo: '' }, aplicacion: app('Recibida'), firma: 'Ana' });
  chk(sinPuesto.asunto === 'Seguimiento de tu solicitud: una oferta de Club Mock B', 'sin puesto: «una oferta de Club Mock B»');
  const nada = C.borradorCorreo({ alumno, oferta: { ...oferta, titulo: '', empresa: '' }, aplicacion: app('Recibida'), idioma: 'en', firma: 'Ana' });
  chk(nada.asunto === 'Update on your application: the position', 'sin puesto ni empresa (inglés): «the position»');
  chk(C.borradorCorreo({ alumno: { ...alumno, nombre: '' }, oferta, aplicacion: app('Recibida'), firma: 'Ana' }).cuerpo.startsWith('Hola,\n'), 'sin nombre: «Hola,»');
  chk(C.borradorCorreo({ alumno: undefined, oferta: undefined, aplicacion: app('Recibida') }) !== null, 'sin alumno ni oferta no se rompe');
  const raro = C.borradorCorreo({ alumno: { ...alumno, nombre: 'Ana\u0000\r\nBcc: x@y.z' + String.fromCharCode(0x2028) + 'fin' }, oferta: { ...oferta, empresa: 'A\nB\tC', titulo: 'x'.repeat(500) }, aplicacion: app('Recibida'), firma: 'Ana' });
  chk(!/[\u0000-\u0009\u000B-\u001F]/.test(raro.asunto) && !raro.cuerpo.includes(String.fromCharCode(0x2028)) && raro.cuerpo.startsWith('Hola Ana Bcc: x@y.z fin,') && raro.cuerpo.split('\n').every(l => !/^Bcc:/i.test(l)), 'saltos de línea y caracteres de control del Sheet no crean líneas nuevas ni cabeceras');
  chk(raro.asunto.length < 220, 'un título larguísimo se recorta: ' + raro.asunto.length);
}

console.log('7. Enlace para abrir el correo');
{
  const b = C.borradorCorreo({ alumno, oferta: { ...oferta, empresa: 'X&bcc=evil@x.org?cc=a@b.c', titulo: 'Q=1 & más #fin' }, aplicacion: app('Descartado'), firma: 'Ana' });
  const href = C.enlaceCorreo(b);
  chk(href.startsWith('mailto:?subject='), 'empieza por mailto:?subject= (sin destinatario)');
  const params = new URLSearchParams(href.slice('mailto:?'.length));
  igual([...params.keys()], ['subject', 'body'], 'solo lleva asunto y cuerpo (no se cuelan bcc, cc ni to)');
  igual(params.get('subject'), b.asunto, 'el asunto decodificado es el del borrador (con & ? = # intactos)');
  igual(params.get('body').replace(/\r\n/g, '\n'), b.cuerpo, 'el cuerpo decodificado es el del borrador');
  chk(/%0D%0A/.test(href) && !href.replace(/%0D%0A/g, '').includes('%0A'), 'los saltos de línea van como CRLF');
  chk(!/[ <>"]/.test(href), 'no hay espacios ni caracteres sin codificar');
  chk(href.length <= C.MAX_MAILTO, `longitud razonable (${href.length} ≤ ${C.MAX_MAILTO})`);
  const largo = { asunto: 'a'.repeat(100), cuerpo: 'é'.repeat(400), idioma: 'es' };
  igual(C.enlaceCorreo(largo), null, 'un texto demasiado largo no genera enlace (se usa «Copiar»)');
  chk(C.textoCompleto({ idioma: 'es', asunto: 'S', cuerpo: 'C' }) === 'Asunto — S\n\nC' && C.textoCompleto({ idioma: 'en', asunto: 'S', cuerpo: 'C' }) === 'Subject — S\n\nC', 'el texto que se copia lleva el asunto delante');
}

console.log('8. En pantalla: solicitud AP001 (Mateo Ferrer, MBA en inglés, Entrevista)');
const entrar = async ({ ancho = 390, alto = 800, firma = 'Ana Pérez', apps = true } = {}) => {
  const t = await nuevo();
  await t.pg.addInitScript(f => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.modo', 'demo'); if (f) localStorage.setItem('gad.firma', f); sessionStorage.setItem('ini', '1'); } }, firma);
  if (apps) {   // un canario en las notas de la solicitud AP001 y otro en el motivo de AP002 (descartado), para comprobar que no salen
    await t.pg.route('**/datos-mock/Aplicaciones.csv*', async r => {
      const res = await r.fetch(); let tx = await res.text();
      tx = tx.replace('AP001,A002,O002,1,2026-10-11,Entrevista,,', 'AP001,A002,O002,1,2026-10-11,Entrevista,,CANARIO-NOTA-APP').replace('Perfil no encaja', 'CANARIO-MOTIVO-DEMO');
      await r.fulfill({ response: res, body: tx });
    });
  }
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const visible = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }, sel);
const sinScrollLateral = pg => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth);
{
  const { pg, ctx, log } = await entrar();
  await ir(pg, '#/aplicacion/AP001', '#ap-estado, #v-aplicacion .cabecera');
  chk(await visible(pg, '#ap-correo') && /Borrador de correo/.test(await pg.innerText('#ap-correo')) && await pg.getAttribute('#ap-correo', 'href') === '#/aplicacion/AP001/correo', 'la solicitud en proceso tiene el botón «Borrador de correo»');
  await pg.click('#ap-correo'); await pg.waitForSelector('#co-vista');
  chk(await pg.innerText('#titulo') === 'Borrador de correo' && await pg.getAttribute('#tabs a[data-tab=ofertas]', 'aria-current') === 'page', 'título y pestaña');
  chk(await pg.isChecked('#co-idioma-en') && !(await pg.isChecked('#co-idioma-es')), 'MBA en inglés: el idioma por defecto es English');
  let vista = await pg.innerText('#co-vista');
  chk(/^Subject — Update on your application: Becario\/a de patrocinio at Club mock B/.test(vista) && /Hi Mateo,/.test(vista) && /interview stage/.test(vista) && /Best regards,\s*Ana Pérez$/.test(vista.trim()), 'vista previa en inglés, con asunto, nombre y firma: ' + vista.slice(0, 120).replace(/\n/g, ' / '));
  chk(!/CANARIO/.test(await pg.innerText('#v-correo')) && !/Ferrer/.test(vista), 'ningún canario en la pantalla y sin apellidos en el borrador');
  chk(/no incluye notas, motivo de descarte ni datos de trabajo/i.test(await pg.innerText('#co-privacidad')), 'avisa de qué nunca incluye');
  chk(!(await visible(pg, '#co-firma-falta')), 'con firma guardada no avisa de que falte');

  console.log('9. Cambiar de idioma');
  await pg.click('label[for=co-idioma-es]');
  vista = await pg.innerText('#co-vista');
  chk(/^Asunto — Seguimiento de tu solicitud: Becario\/a de patrocinio en Club mock B/.test(vista) && /Hola Mateo,/.test(vista) && /fase de entrevista/.test(vista) && /Un saludo,\s*Ana Pérez$/.test(vista.trim()), 'al elegir Español, la vista previa cambia');
  chk(await pg.getAttribute('html', 'lang') === 'es', 'el idioma de la página no cambia (solo el borrador)');
  await pg.click('label[for=co-idioma-en]');
  chk(/^Subject — /.test(await pg.innerText('#co-vista')), 'y vuelve a English');

  console.log('10. Copiar y abrir el correo');
  await pg.evaluate(() => { navigator.clipboard.write = async i => { window.__copiado = await (await i[0].getType('text/plain')).text(); }; });
  await pg.click('#co-copiar');
  await pg.waitForSelector('#co-estado:not([hidden])');
  const copiado = await pg.evaluate(() => window.__copiado);
  chk(copiado === (await pg.evaluate(() => document.querySelector('#co-vista').textContent)), 'lo copiado es exactamente la vista previa');
  chk(/Copiado/.test(await pg.innerText('#co-estado')), 'dice que se ha copiado');
  const href = await pg.getAttribute('#co-correo', 'href');
  const p = new URLSearchParams(href.slice('mailto:?'.length));
  chk(href.startsWith('mailto:?') && p.get('subject').startsWith('Update on your application') && p.get('body').replace(/\r\n/g, '\n').includes('Hi Mateo,') && [...p.keys()].join() === 'subject,body', '«Abrir en la app de correo» lleva asunto y cuerpo, sin destinatario');
  await pg.click('label[for=co-idioma-es]');
  chk((await pg.getAttribute('#co-correo', 'href')).includes('Seguimiento'), 'al cambiar de idioma, el enlace de correo también cambia');
  chk(await pg.$eval('#co-correo', a => a.getBoundingClientRect().height >= 44) && await pg.$eval('#co-copiar', a => a.getBoundingClientRect().height >= 44), 'los dos botones miden al menos 44 px');
  chk(log.consola.length === 0 && log.externas.length === 0 && !log.peticiones.length, 'sin errores de consola/CSP, sin peticiones externas y sin hablar con Google: ' + log.consola.join(' | '));
  await ctx.close();
}

console.log('11. Descartado: sin motivo');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/aplicacion/AP002/correo', '#co-vista');
  await pg.check('#co-idioma-en');
  await pg.waitForTimeout(300);
  const vista = await pg.innerText('#co-vista');
  chk(/focus your career on Commercial and sponsorship/.test(vista) && !/Comercial y patrocinio/.test(vista), 'en pantalla, el borrador en inglés enseña el área traducida');
  await pg.check('#co-idioma-es');
  await pg.waitForTimeout(300);
  chk(/hacia Comercial y patrocinio/.test(await pg.innerText('#co-vista')), '... y al volver al español, el área en español');
  await ctx.close();
}
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/aplicacion/AP002/correo', '#co-vista');   // A028, Descartado con motivo (con canario)
  const vista = await pg.innerText('#co-vista'), todo = await pg.innerText('#v-correo');
  chk(/will not be moving forward/.test(vista) || /no continúa/.test(vista), 'es el borrador de «no continúa»');
  chk(!/CANARIO|Perfil no encaja/.test(todo) && !/descartad|discard|rejected/i.test(vista), 'no sale el motivo del descarte (ni siquiera en la pantalla) ni la palabra «descartado»');
  chk(/Comercial y patrocinio|steer your career/.test(vista) || /orientar tu carrera/.test(vista), 'invita a acercarse hacia el área de la oferta');
  await ctx.close();
}

console.log('12. Estados sin borrador y casos raros');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/aplicacion/AP008', '#v-aplicacion .cabecera');   // A004, Contratado
  chk(!(await visible(pg, '#ap-correo')), 'una solicitud «Contratado» no tiene botón de borrador');
  await ir(pg, '#/aplicacion/AP008/correo', '#co-sin-borrador');
  chk(/Contratado/.test(await pg.innerText('#co-sin-borrador')) && !(await visible(pg, '#co-vista')) && !(await visible(pg, '#co-correo')), 'por dirección directa: lo explica, sin vista previa ni enlace de correo');
  await ir(pg, '#/aplicacion/AP999/correo', '#v-correo .card');
  chk(/Solicitud no encontrada/.test(await pg.innerText('#v-correo')), 'una solicitud que no existe: lo dice');
  await ctx.close();
}

console.log('13. Sin firma guardada');
{
  const { pg, ctx } = await entrar({ firma: '' });
  await ir(pg, '#/aplicacion/AP001/correo', '#co-vista');
  chk(await visible(pg, '#co-firma-falta') && /Ajustes/.test(await pg.innerText('#co-firma-falta')) && await pg.getAttribute('#co-firma-falta a', 'href') === '#/ajustes', 'avisa de que falta la firma y lleva a Ajustes');
  chk(/\[Your name\]/.test(await pg.innerText('#co-vista')), 'el borrador lleva [Your name] bien visible');
  await ctx.close();
}

console.log('14. A 320 px');
{
  const { pg, ctx } = await entrar({ ancho: 320, alto: 640 });
  await ir(pg, '#/aplicacion/AP001', '#ap-correo');
  chk(await sinScrollLateral(pg), 'la solicitud con el botón nuevo: sin scroll lateral');
  await pg.click('#ap-correo'); await pg.waitForSelector('#co-vista');
  chk(await sinScrollLateral(pg), 'el borrador: sin scroll lateral');
  chk(await pg.$$eval('#co-vista', e => e.every(x => x.scrollWidth <= x.clientWidth + 1)), 'la vista previa no se corta por los lados');
  chk(await pg.$$eval('#v-correo label, #v-correo .primary, #v-correo .secondary', e => e.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth)), 'idiomas y botones: 44 px y dentro de la pantalla');
  await pg.click('label[for=co-idioma-es]');
  chk(await sinScrollLateral(pg), 'en español, sin scroll lateral');
  await ctx.close();
}

console.log('9. El idioma por defecto sale de la columna «Idioma del programa» de la hoja Listas');
for (const [idioma, esperado] of [['en', 'en'], ['', 'es'], ['es', 'es']]) {
  const { pg, ctx } = await entrar({ apps: false });
  await pg.route('**/datos-mock/Listas.csv*', async r => {   // «MBA en español» (alumna A009, solicitud AP009): se le pone el idioma de la columna
    const res = await r.fetch();
    await r.fulfill({ response: res, body: (await res.text()).replace(/^(MBA en español,.*,MBA),[^,\r\n]*$/m, `$1,${idioma}`) });
  });
  await pg.goto(BASE + '#/aplicacion/AP009/correo'); await pg.waitForSelector('#co-vista');
  chk(await pg.isChecked('#co-idioma-' + esperado), `columna «${idioma || 'vacía'}» en «MBA en español»: el borrador sale en ${esperado === 'en' ? 'English' : 'español'}`);
  await ctx.close();
}
await terminar();
