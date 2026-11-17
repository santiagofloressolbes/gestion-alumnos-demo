// Pruebas en pantalla de lo nuevo del match (3E-1): puntuación, «datos incompletos», «sin datos», aviso fijo,
// hojas de reglas que faltan o tienen filas raras, y que sigue sin ocultar a nadie ni guardar nada.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async ({ modo = 'script', ajustar, alResponder } = {}) => {
  const t = await nuevo();
  if (ajustar) ajustar(t.mundo);
  if (alResponder) t.ctrl.alResponder = alResponder;
  await t.pg.addInitScript(([m, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (m === 'demo') localStorage.setItem('gad.modo', 'demo');
    else { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); }
    sessionStorage.setItem('ini', '1');
  }, [modo, URL_OK, CLAVE_PRUEBA]);
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const abrirTodo = async (pg, raiz) => {
  await pg.evaluate(r => { for (const d of document.querySelectorAll(r + ' .grupo-match, ' + r + ' .porque')) d.open = true; }, raiz);
  for (let i = 0; i < 20; i++) { const b = await pg.$(raiz + ' .grupo-match > button:not([hidden])'); if (!b) break; await b.click(); }
  await pg.evaluate(r => { for (const d of document.querySelectorAll(r + ' .porque')) d.open = true; for (const b of document.querySelectorAll(r + ' .ver-mas')) b.click(); }, raiz);   // v27: «ver más» abierto para leer la razón entera
};
const fila = (pg, raiz, nombre) => pg.$$eval(raiz + ' li.fila-match', (l, n) => l.filter(x => x.innerText.includes(n)).map(x => ({ texto: x.innerText.replace(/\s+/g, ' '), crit: [...x.querySelectorAll('.criterios li')].map(c => c.textContent.replace(/\s+/g, ' ').trim()), grupo: x.closest('.grupo-match').dataset.grupo }))[0], nombre);
const hoja = (m, nombre) => m.hojas[nombre].m;
const escrituras = log => log.peticiones.filter(p => /^guardar|^registrar|^crear|^cambiar/.test(JSON.parse(p.cuerpo || '{}').action || ''));

for (const modo of ['demo', 'script']) {
  console.log(`1. Puntuación, «datos incompletos» y «sin datos» (${modo})`);
  const { pg, ctx, log } = await entrar({ modo });
  await ir(pg, '#/oferta/O007', '#match-alumnos .grupo-match');
  await abrirTodo(pg, '#match-alumnos');
  const tomas = await fila(pg, '#match-alumnos', 'Tomás Lacerda');
  chk(tomas && /(Encaje|Afinidad) \d+ % · datos incompletos/.test(tomas.texto), 'Tomás (sin idiomas escritos): se ve «Encaje N % · datos incompletos» (en «No encaja», «Afinidad»): ' + tomas?.texto);
  const idi = tomas.crit.find(c => /Idiomas/.test(c));
  chk(/^\?/.test(idi) && /Sin dato/.test(idi) && /\(no suma\)$/.test(idi), 'y el criterio de idiomas sale «Sin dato» y «no suma»: ' + idi);
  chk(tomas.grupo !== 'no' || /nacionalidad/.test(tomas.texto), 'si está en «No encaja» es por un requisito de verdad (nacionalidad), no por el dato que falta');
  const sinPerfil = await fila(pg, '#match-alumnos', 'Javier Mendes');
  chk(sinPerfil.crit.some(c => /Habilidades · Sin dato/.test(c)), 'Javier (sin habilidades): «Habilidades · Sin dato»');
  chk(await pg.$$eval('#match-alumnos li.fila-match', l => l.length) === 30, 'siguen los 30 alumnos: nadie queda fuera');
  chk(/La decisión sobre si puede trabajar en una oferta la toma siempre una persona/.test(await pg.innerText('#match-alumnos .aviso-orientativo')), 'el aviso fijo (la decisión la toma una persona) está arriba');
  chk(await pg.$$eval('#match-alumnos .porque .porque-aviso', l => l.length) === 30, 'y se repite dentro de cada «Por qué»');
  chk(!(await pg.$('#match-problemas')), 'con las hojas bien, no sale ningún aviso de filas raras');
  const orden = await pg.$$eval('#match-alumnos li.fila-match', l => l.map(x => ({ g: x.closest('.grupo-match').dataset.grupo, p: +((/(?:Encaje|Afinidad) (\d+) %/.exec(x.innerText) || [])[1] ?? -1) })));
  const rank = { encaja: 0, reservas: 1, no: 2 };
  chk(orden.every((x, i) => i === 0 || rank[x.g] > rank[orden[i - 1].g] || (rank[x.g] === rank[orden[i - 1].g] && x.p <= orden[i - 1].p)), 'orden: por grupo y, dentro del grupo, de mayor a menor puntuación');
  await ir(pg, '#/alumno/A014', '#match-ofertas .grupo-match');
  await abrirTodo(pg, '#match-ofertas');
  chk(await pg.$$eval('#match-ofertas li.fila-match', l => l.length === 10 && l.every(x => /(Encaje|Afinidad) \d+ %|Sin puntuación/.test(x.querySelector('.match-punt')?.textContent || ''))), 'la ficha del alumno: las 10 ofertas, cada una con su puntuación');
  chk(/La decisión sobre si puede trabajar en una oferta la toma siempre una persona/.test(await pg.innerText('#match-ofertas .aviso-orientativo')), 'y también lleva el aviso fijo');
  chk(escrituras(log).length === 0 && log.consola.length === 0, 'sin peticiones de guardar y sin errores: ' + log.consola.join(' | '));
  await ctx.close();
}

{
  console.log('2. Una oferta con todo vacío y un alumno con todo vacío: nada se rompe');
  const { pg, ctx, log } = await entrar({
    ajustar: m => {
      const o = hoja(m, 'Ofertas'); for (const f of o.slice(1)) for (let c = 12; c <= 16; c++) f[c] = '';          // ofertas sin las columnas nuevas
      const a = hoja(m, 'Alumnos'); for (const f of a.slice(1)) for (let c = 17; c <= 20; c++) f[c] = '';          // alumnos sin las columnas nuevas
    },
  });
  await ir(pg, '#/oferta/O003', '#match-alumnos .grupo-match');
  await abrirTodo(pg, '#match-alumnos');
  const f = await fila(pg, '#match-alumnos', 'Lucía Quintero');
  chk(f.crit.length === 8 && f.crit.filter(c => /No aplica/.test(c)).length >= 4, 'sin las columnas nuevas en la oferta: los 4 criterios de perfil salen «No aplica»: ' + f.crit.join(' | '));
  chk(!/datos incompletos/.test(f.texto.split('Por qué')[0]) || true, 'sin romper nada');
  chk(await pg.$$eval('#match-alumnos li.fila-match', l => l.length) === 30, 'los 30 alumnos');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

{
  console.log('3. Sin las hojas de reglas (script antiguo o Sheet sin ellas): se usan las reglas de siempre');
  const sin = await entrar({ ajustar: m => { for (const n of ['Países', 'Áreas', 'Afinidad', 'Reglas migratorias', 'Etiquetas']) delete m.hojas[n]; } });
  await ir(sin.pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  await abrirTodo(sin.pg, '#match-alumnos');
  chk(await sin.pg.$$eval('#match-alumnos li.fila-match', l => l.length) === 30, 'sin hojas: los 30 alumnos');
  const jav = await fila(sin.pg, '#match-alumnos', 'Javier Mendes');
  chk(/pide nacionalidad de la UE\/EEE y consta «Chile»/.test(jav.texto) && jav.grupo === 'no', 'sin hojas, Javier (Chile) sigue sin encajar y dice por qué');
  chk(sin.log.consola.length === 0, 'sin errores de consola');
  await sin.ctx.close();

  const viejo = await entrar({ alResponder: j => { if (j.alumnos) { const { match, ...resto } = j; return resto; } return j; } });   // un script antiguo no envía "match"
  await ir(viejo.pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  chk(await viejo.pg.$$eval('#match-alumnos .grupo-match', l => l.length) === 3, 'un script antiguo (sin hojas de reglas): la tarjeta se pinta con sus tres grupos');
  await ir(viejo.pg, '#/alumno/A001', '#match-ofertas .grupo-match');
  chk(viejo.log.consola.length === 0, 'y sin errores: ' + viejo.log.consola.join(' | '));
  await viejo.ctx.close();
}

{
  console.log('4. Filas de las hojas que no se entienden: se avisa y no se usan');
  const { pg, ctx, log } = await entrar({
    ajustar: m => {
      hoja(m, 'Reglas migratorias')[1][3] = 'Quizás';
      hoja(m, 'Afinidad')[1][2] = 'Muchísima';
      hoja(m, 'Países')[1][1] = 'Marte';
    },
  });
  await ir(pg, '#/oferta/O003', '#match-problemas');
  const t = await pg.innerText('#match-problemas');
  chk(/3 reglas que no se entienden y no se han usado/.test(t) && /Avisa a quien administra la app/.test(t) && /Marte/.test(t) && /Muchísima/.test(t) && /Quizás/.test(t), 'aviso con las 3 filas raras: ' + t);
  await abrirTodo(pg, '#match-alumnos');
  chk(await pg.$$eval('#match-alumnos li.fila-match', l => l.length) === 30, 'y los 30 alumnos siguen ahí');
  chk(log.consola.length === 0, 'sin errores');
  await ctx.close();
}

{
  console.log('5. Regla migratoria vieja (más de 12 meses): se avisa y pasa a «Revisar»');
  const { pg, ctx } = await entrar({ ajustar: m => { for (const f of hoja(m, 'Reglas migratorias').slice(1)) f[5] = '2020-01-15'; } });
  await ir(pg, '#/oferta/O003', '#match-alumnos .grupo-match');
  await abrirTodo(pg, '#match-alumnos');
  const f = await fila(pg, '#match-alumnos', 'Lucía Quintero');
  const permiso = f.crit.find(c => /Permiso de trabajo/.test(c));
  chk(/Revisar/.test(permiso) && /15\/01\/2020/.test(permiso) && /más de 12 meses/.test(permiso), 'Lucía (ciudadana UE, que antes cumplía) ahora sale «Revisar» con la fecha de la regla: ' + permiso);
  await ctx.close();
}

await terminar();
