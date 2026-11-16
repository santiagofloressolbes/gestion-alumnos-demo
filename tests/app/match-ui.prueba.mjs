// Pruebas de las pantallas del match: "Alumnos que encajan" (ficha de la oferta), "Ofertas que encajan" (ficha del alumno)
// y el orden y las etiquetas de "Añadir solicitud". El match solo lee y calcula: nunca oculta a nadie y siempre dice por qué.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const UE = 'Unión Europea (UE/EEE)';
const COL = { nacP: 6, nacS: 7, sit: 8, expArea: 9, destino: 11, disp: 16, etiquetas: 17, idiomas: 18, formacion: 19, subareas: 20 };   // columnas (0-based) de Alumnos
// El perfil que pide O005 (Marketing, comunicación y prensa): con él, un alumno que quiere ir a Marketing y es de la UE «encaja» del todo.
const PERFIL_O005 = ['Redacción; Redes sociales', 'Español nativo; Inglés C1', 'Grado en Comunicación', 'Comunicación y prensa'];
const conPerfil = fila => { fila[COL.etiquetas] = PERFIL_O005[0]; fila[COL.idiomas] = PERFIL_O005[1]; fila[COL.formacion] = PERFIL_O005[2]; fila[COL.subareas] = PERFIL_O005[3]; };
const entrar = async ({ modo = 'script', ajustar, ancho = 390 } = {}) => {
  const t = await nuevo();
  if (ajustar) ajustar(t.mundo);
  await t.pg.setViewportSize({ width: ancho, height: 800 });
  await t.pg.addInitScript(([m, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (m === 'demo') localStorage.setItem('gad.modo', 'demo');
    else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
    sessionStorage.setItem('ini', '1');
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  return t;
};
const alumno = (m, id) => m.hojas.Alumnos.m.find(f => f[0] === id);
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const cuentas = pg => pg.$$eval('#match-alumnos .grupo-match > summary, #match-ofertas .grupo-match > summary', s => s.map(x => x.textContent.trim()));
const numeros = cs => cs.map(c => +/\((\d+)\)/.exec(c)[1]);
const escrituras = log => log.peticiones.filter(p => /^guardar|^registrar|^crear|^cambiar/.test(JSON.parse(p.cuerpo || '{}').action || ''));
// Abre todos los grupos y todos los "Ver más": así se ven TODAS las filas.
async function abrirTodo(pg, raiz) {
  await pg.evaluate(r => { for (const d of document.querySelectorAll(r + ' .grupo-match')) d.open = true; }, raiz);
  for (let i = 0; i < 20; i++) {
    const b = await pg.$(raiz + ' .grupo-match > button:not([hidden])');
    if (!b) break;
    await b.click();
  }
}
const grupoDe = (pg, raiz, nombre) => pg.$$eval(raiz + ' .grupo-match li.fila-match', (lis, n) => lis.filter(l => l.closest('.grupo-match').dataset.grupo === n).map(l => l.innerText.replace(/\s+/g, ' ')), nombre);
const desbordes = pg => pg.evaluate(() => {
  const mal = [];
  if (document.documentElement.scrollWidth > window.innerWidth) mal.push('la página se desplaza en horizontal');
  for (const e of document.querySelectorAll('#app button, #app a, #app summary')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (e.scrollWidth > e.clientWidth + 1 || r.right > window.innerWidth + 1 || r.left < -1) mal.push(`"${(e.textContent || '').trim().slice(0, 40)}" no cabe`);
  }
  return mal;
});

for (const modo of ['demo', 'script']) {
  /* 1. Ficha de la oferta */
  {
    console.log(`1. Ficha de la oferta: alumnos que encajan (${modo})`);
    const { pg, ctx, log } = await entrar({
      modo,
      ajustar: m => {
        // Ana (A023) quiere ir a Marketing: encaja. Marcos (A030, estudiante) con área de O003 pero aún estudiante: reservas.
        alumno(m, 'A023')[COL.destino] = 'Marketing y comunicación'; conPerfil(alumno(m, 'A023'));
      },
    });
    await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match');
    const cs = await cuentas(pg);
    chk(cs.length === 3 && /^Encaja \(/.test(cs[0]) && /^Encaja con reservas \(/.test(cs[1]) && /^No encaja \(/.test(cs[2]), 'tres grupos: ' + cs.join(' | '));
    chk(numeros(cs).reduce((a, b) => a + b, 0) === 30, 'los tres grupos suman los 30 alumnos: nadie queda fuera (' + cs.join(' | ') + ')');
    chk(/ayuda para mirar, no una decisión/.test(await pg.innerText('#match-alumnos')), 'dice que es una ayuda y no una decisión');
    await abrirTodo(pg, '#match-alumnos');
    chk((await pg.$$('#match-alumnos li.fila-match')).length === 30, 'abriendo todo se ven los 30 alumnos');
    const enc = await grupoDe(pg, '#match-alumnos', 'encaja'), res = await grupoDe(pg, '#match-alumnos', 'reservas'), no = await grupoDe(pg, '#match-alumnos', 'no');
    if (modo === 'script') chk(enc.length === 1 && /Ana/.test(enc[0]) && /Quiere ir al área «Marketing y comunicación»/.test(enc[0]), 'Ana quiere ir a Marketing, es de la UE y busca empleo: encaja: ' + enc[0]);
    chk(no.some(x => /Javier/.test(x) && /pide nacionalidad de la UE\/EEE y Javier .* tiene «Chile»/.test(x)), 'Javier (Chile, necesita permiso): no encaja y dice por qué');
    chk(no.length + res.length + enc.length === 30, 'cada alumno está en un solo grupo');
    // "Por qué": cuatro criterios, con símbolo y palabra
    const crit = await pg.$$eval('#match-alumnos li.fila-match >> nth=0 >> .criterios li', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    chk(crit.length === 8 && crit.every(x => /^[✓!✗?–] ?(Área|Subárea|Habilidades|Idiomas|Formación|Prácticas o empleo|Nacionalidad|Permiso de trabajo) · (Cumple|Revisar|No cumple|Sin datos|No aplica):/.test(x)), 'cada fila explica 8 criterios con símbolo, nombre y palabra: ' + crit.join(' | '));
    chk(crit.every(x => /\((\d+(,\d)? de \d+ puntos|no suma|no cuenta)\)$/.test(x)), 'y cada criterio dice cuántos puntos da (o que no suma / no cuenta)');
    chk(/Orientativo, verifica la situación real/.test(await pg.innerText('#match-alumnos')), 'el aviso fijo «orientativo, verifica la situación real» está en la tarjeta');
    chk(await pg.$$eval('#match-alumnos li.fila-match', l => l.every(x => /^Encaje \d+ %|^Sin puntuación/.test(x.querySelector('.match-punt')?.textContent || ''))), 'cada fila enseña su puntuación («Encaje 82 %»)');
    chk(!/\bnull\b|undefined|\[object/.test(await pg.innerText('#match-alumnos')), 'sin "null" ni "undefined"');
    // el resto de la ficha sigue ahí
    chk(/Requisitos/.test(await pg.innerText('#v-oferta')) && /Unión Europea \(UE\/EEE\)/.test(await pg.innerText('#v-oferta')), 'la ficha enseña el requisito "Unión Europea (UE/EEE)"');
    chk(escrituras(log).length === 0 && log.consola.length === 0, 'sin peticiones de guardar y sin errores: ' + log.consola.join(' | '));
    await ctx.close();
  }
}

/* 2. Casos: Suiza, estudiante, sin nacionalidad, y "Ver más" con muchos alumnos */
{
  console.log('2. Suiza, estudiante, datos que faltan y listas largas');
  const { pg, ctx, log } = await entrar({
    ajustar: m => {
      const a = alumno(m, 'A023'); a[COL.nacP] = 'Suiza'; a[COL.nacS] = ''; a[COL.sit] = 'Residente con permiso de trabajo'; a[COL.destino] = 'Marketing y comunicación'; conPerfil(a);
      const c = alumno(m, 'A010'); c[COL.destino] = 'Producto y tecnología'; c[COL.disp] = 'Empleo';                // Carlos: estudiante
      const v = alumno(m, 'A011'); v[COL.nacP] = ''; v[COL.nacS] = ''; v[COL.sit] = ''; v[COL.destino] = 'Marketing y comunicación'; v[COL.disp] = 'Empleo';   // sin datos de trabajo
      for (let i = 100; i < 140; i++) m.hojas.Alumnos.m.push([`A${i}`, 'iniciales', `Nombre${i}`, `Apellido${i}`, 'MBA en inglés', '2025-2026', 'España', '', 'Ciudadano UE o español', '', '', 'Marketing y comunicación', '', '', '', '', 'Empleo', ...PERFIL_O005]);
    },
  });
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  let cs = await cuentas(pg);
  chk(numeros(cs).reduce((a, b) => a + b, 0) === 70, 'con 70 alumnos, los grupos suman 70: ' + cs.join(' | '));
  chk((await pg.$$('#match-alumnos .grupo-match[data-grupo=encaja] li.fila-match')).length === 15, 'el primer grupo pinta 15 filas de golpe, no las 40');
  const mas = await pg.innerText('#match-alumnos .grupo-match[data-grupo=encaja] > button');
  chk(/Ver 15 más \(quedan 25\)/.test(mas), '"Ver más" dice cuántas quedan: ' + mas);
  await abrirTodo(pg, '#match-alumnos');
  chk((await pg.$$('#match-alumnos li.fila-match')).length === 70, 'con "Ver más" se llega a los 70');
  const res = await grupoDe(pg, '#match-alumnos', 'reservas');
  chk(res.some(x => /Ana/.test(x) && /Suiza no es de la UE ni del EEE/.test(x)), 'Suiza: a revisar, con el aviso de que no es UE/EEE');
  chk(res.some(x => /Paula/.test(x) && /no consta la nacionalidad/.test(x)), 'sin nacionalidad: a revisar, no descartada');
  await ir(pg, '#/oferta/O003', '#match-alumnos .grupo-match');
  await abrirTodo(pg, '#match-alumnos');
  const r3 = await grupoDe(pg, '#match-alumnos', 'reservas');
  chk(r3.some(x => /Carlos/.test(x) && /Permiso de estudiante/.test(x) && /otra autorización/.test(x) && /conviene revisarlo/.test(x)), 'O003 (empleo): Carlos (permiso de estudiante) va a "reservas", nunca a "No encaja": ' + r3.find(x => /Carlos/.test(x)));
  chk(!(await grupoDe(pg, '#match-alumnos', 'no')).some(x => /Carlos/.test(x)), 'y no está en "No encaja"');
  chk(escrituras(log).length === 0 && log.consola.length === 0, 'sin peticiones de guardar y sin errores: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 3. Ficha del alumno: ofertas que encajan */
{
  console.log('3. Ficha del alumno: ofertas que encajan');
  const { pg, ctx, log } = await entrar({ ajustar: m => { const c = alumno(m, 'A010'); c[COL.destino] = 'Producto y tecnología'; c[COL.disp] = 'Empleo'; } });
  await ir(pg, '#/alumno/A010', '#match-ofertas .grupo-match');
  const cs = await cuentas(pg);
  chk(numeros(cs).reduce((a, b) => a + b, 0) === 10 && /^Encaja \(/.test(cs[0]), 'los 10 ofertas, repartidas en tres grupos: ' + cs.join(' | '));
  await abrirTodo(pg, '#match-ofertas');
  const res = await grupoDe(pg, '#match-ofertas', 'reservas');
  chk(res.some(x => /Product manager junior/.test(x) && /Permiso de estudiante/.test(x)), 'Product manager junior (pide permiso) con un estudiante: con reservas: ' + res.join(' || '));
  chk((await pg.$$('#match-ofertas li.fila-match')).length === 10, 'se ven las 10 ofertas');
  chk(/Cerrada|cerrada/.test((await grupoDe(pg, '#match-ofertas', 'no')).concat(res).join(' ')), 'las ofertas cerradas se muestran (no se esconden), marcadas como cerradas');
  await pg.click('#match-ofertas li.fila-match a >> nth=0');
  await pg.waitForSelector('#v-oferta .cabecera');
  chk(/#\/oferta\/O\d+/.test(pg.url()), 'tocar una oferta lleva a su ficha');
  chk(escrituras(log).length === 0 && log.consola.length === 0, 'sin peticiones de guardar y sin errores');
  await ctx.close();
}

/* 4. Añadir solicitud: orden, etiquetas y avisos que no contradicen al match */
{
  console.log('4. Añadir solicitud: orden, etiquetas y avisos');
  const { pg, ctx } = await entrar({ ajustar: m => { m.hojas.Rondas.m.push(['R006', 'O005', '1', '2026-10-16']); alumno(m, 'A023')[COL.destino] = 'Marketing y comunicación'; conPerfil(alumno(m, 'A023')); } });
  pg.on('dialog', d => d.accept());   // al salir de un formulario con cambios se acepta descartar
  await ir(pg, '#/oferta/O005/ronda/1/aplicar', '#ap-lista li');
  const subs = await pg.$$eval('#ap-lista li .alumno-texto .sub', s => s.map(x => x.textContent));
  const rango = t => /No encaja/.test(t) ? 2 : /Encaja con reservas/.test(t) ? 1 : /Encaja/.test(t) ? 0 : -1;
  const rangos = subs.map(rango);
  chk(rangos.every(r => r >= 0) && rangos.every((r, i) => i === 0 || r >= rangos[i - 1]), 'la lista va por orden (encajan, con reservas, no encajan) y cada fila lo dice');
  chk(rangos[0] === 0, 'el primero es quien mejor encaja: ' + subs[0]);
  chk((await pg.$$('#ap-lista input')).length === 30, 'y no falta nadie: los 30 alumnos');
  // los avisos salen del mismo cálculo que el match
  await pg.fill('#ap-q', 'mendes'); await pg.check('#ap-al-A008');
  const avisos = await pg.$$eval('#ap-avisos .aviso', a => a.map(x => x.textContent));
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  await abrirTodo(pg, '#match-alumnos');
  const motivos = await pg.$$eval('#match-alumnos li.fila-match', lis => lis.filter(l => /Javier Mendes/.test(l.innerText)).flatMap(l => [...l.querySelectorAll('.crit.no, .crit.revisar')].map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  const reqs = motivos.filter(x => /permiso de trabajo en vigor|pide nacionalidad/.test(x));
  chk(avisos.length === reqs.length && avisos.length >= 1 && avisos.every(a => reqs.some(r => r.includes(a))), 'los avisos de Añadir solicitud son los mismos motivos de requisito que enseña el match: ' + avisos.join(' | '));
  await ir(pg, '#/oferta/O005/ronda/1/aplicar', '#ap-lista li');
  await pg.fill('#ap-q', 'keller'); await pg.check('#ap-al-A004');
  chk((await pg.$$eval('#ap-avisos .aviso', a => a.length)) === 0, 'Diego (UE, ciudadano UE o español): sin avisos, y en el match cumple');
  await ctx.close();
}

/* 5. Sin la fila "Unión Europea" en la lista del Sheet: la app funciona igual y sin errores */
{
  console.log('5. Con y sin la fila "Unión Europea (UE/EEE)" en Listas');
  const sin = await entrar({ ajustar: m => { for (const f of m.hojas.Listas.m) if (f[3] === UE) f[3] = ''; } });
  await ir(sin.pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  chk(numeros(await cuentas(sin.pg)).reduce((a, b) => a + b, 0) === 30, 'sin la fila en Listas: el match sigue contando a los 30 alumnos');
  await ir(sin.pg, '#/oferta/O005/editar', '#of-f-empresa');
  chk(await sin.pg.inputValue('#of-f-requisitoNacionalidad') === UE, 'sin la fila, el formulario de ofertas se abre y conserva el valor que ya tenía la oferta (no lo pierde)');
  await ir(sin.pg, '#/alumno/A001', '#match-ofertas .grupo-match');
  await ir(sin.pg, '#/buscar', '#q');
  chk(sin.log.consola.length === 0, 'sin errores de consola cuando falta la fila: ' + sin.log.consola.join(' | '));
  await sin.ctx.close();
  const con = await entrar();
  await ir(con.pg, '#/oferta/O005/editar', '#of-f-empresa');
  const opciones = await con.pg.$$eval('#of-f-requisitoNacionalidad option', o => o.map(x => x.value));
  chk(opciones.includes(UE), 'con la fila en Listas, el formulario de ofertas ofrece "Unión Europea (UE/EEE)"');
  chk(await con.pg.inputValue('#of-f-requisitoNacionalidad') === UE, 'y O005 la tiene elegida');
  await con.ctx.close();
}

/* 6. A 320 px nada se sale */
{
  console.log('6. Diseño a 320 px');
  const { pg, ctx } = await entrar({ ancho: 320, ajustar: m => { m.hojas.Rondas.m.push(['R006', 'O005', '1', '2026-10-16']); for (let i = 100; i < 140; i++) m.hojas.Alumnos.m.push([`A${i}`, 'iniciales', `Nombre${i}`, `Apellido${i}`, 'MBA en inglés', '2025-2026', 'España', '', 'Ciudadano UE o español', '', '', 'Marketing y comunicación', '', '', '', '', 'Empleo']); } });
  for (const [hash, sel, raiz] of [['#/oferta/O005', '#match-alumnos .grupo-match', '#match-alumnos'], ['#/alumno/A010', '#match-ofertas .grupo-match', '#match-ofertas'], ['#/oferta/O005/ronda/1/aplicar', '#ap-lista li', null]]) {
    await ir(pg, hash, sel);
    if (raiz) { await abrirTodo(pg, raiz); await pg.evaluate(r => { for (const d of document.querySelectorAll(r + ' .porque')) d.open = true; }, raiz); }
    const mal = await desbordes(pg);
    chk(mal.length === 0, `${hash}: nada se sale a 320 px ${mal.join(' | ')}`);
  }
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  const altos = await pg.$$eval('#match-alumnos .grupo-match > summary, #match-alumnos .porque > summary', s => s.map(x => Math.round(x.getBoundingClientRect().height)));
  chk(altos.every(h => h >= 44), 'los desplegables miden 44 px o más: ' + [...new Set(altos)]);
  await ctx.close();
}

await terminar();
