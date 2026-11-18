// v32: «Quién ha solicitado» en la ficha de la oferta y la marca «Solicitó · estado» en «Alumnos que encajan».
// Demo, oferta O002: 5 solicitudes de 4 alumnos en 2 rondas (Mateo Ferrer en Entrevista, Lucía Quintero En revisión y con match «Encaja poco»,
// Adrián O'Connor en dos rondas —Descartado en la 1 y Recibida en la 2— y Paula Marín Descartada). Con canarios en un motivo de descarte y en unas notas.
import { nuevo, chk, terminar, BASE } from './ayudas.mjs';

const entrar = async ({ ancho = 390, alto = 800 } = {}) => {
  const t = await nuevo();
  await t.pg.setViewportSize({ width: ancho, height: alto });
  await t.pg.addInitScript(() => { if (!sessionStorage.getItem('ini')) { localStorage.setItem('gad.modo', 'demo'); sessionStorage.setItem('ini', '1'); } });
  await t.pg.route('**/datos-mock/Aplicaciones.csv*', async r => {
    const res = await r.fetch(); let tx = await res.text();
    tx = tx.replace('AP003,A011,O002,1,2026-10-12,Descartado,La empresa eligió a otro,Escribió por la tarde.', 'AP003,A011,O002,1,2026-10-12,Descartado,CANARIO-MOTIVO-DESCARTE,CANARIO-NOTAS-APP');
    await r.fulfill({ response: res, body: tx });
  });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel); };
const sinScrollLateral = pg => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth);

console.log('1. La tarjeta «Quién ha solicitado» (O002)');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/oferta/O002', '#quien-solicito');
  const info = await pg.evaluate(() => {
    const c = document.querySelector('#quien-solicito');
    const filas = [...c.querySelectorAll('ul.alumnos > li')].map(li => li.innerText.replace(/\n+/g, ' | '));
    return {
      texto: c.innerText, filas, chips: [...c.querySelectorAll('#qs-resumen .chip')].map(x => x.textContent),
      antesDeRondas: !!(c.compareDocumentPosition(document.querySelector('.card.ronda')) & Node.DOCUMENT_POSITION_FOLLOWING),
      antesDelMatch: !!(c.compareDocumentPosition(document.querySelector('#match-alumnos')) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  chk(info.antesDeRondas && info.antesDelMatch, 'está arriba de las rondas y de «Alumnos que encajan»');
  chk(/5 solicitudes de 4 alumnos/.test(info.texto), 'el resumen dice «5 solicitudes de 4 alumnos»: ' + info.texto.split('\n').slice(0, 3).join(' / '));
  chk(JSON.stringify(info.chips) === JSON.stringify(['Entrevista: 1', 'En revisión: 1', 'Recibida: 1', 'Descartado: 1']), 'recuento por estado actual, de más a menos avanzado: ' + info.chips);
  chk(info.filas.length === 4, 'una fila por alumno (4)');
  chk(/Mateo Ferrer/.test(info.filas[0]) && /Entrevista/.test(info.filas[0]) && /Ronda 1/.test(info.filas[0]), 'primero, Mateo Ferrer: Entrevista, ronda 1: ' + info.filas[0]);
  chk(/Lucía Quintero/.test(info.filas[1]) && /En revisión/.test(info.filas[1]) && /Ronda 2/.test(info.filas[1]), 'Lucía Quintero: En revisión, ronda 2: ' + info.filas[1]);
  chk(/Encaja poco/.test(info.filas[1]), 'Lucía Quintero sigue visible aunque encaje poco, con su marca «Encaja poco»');
  chk(!info.filas.some((f, i) => i !== 1 && /Encaja poco/.test(f)), 'la marca solo sale en quien encaja poco');
  chk(/Recibida/.test(info.filas[2]) && /Ronda 2/.test(info.filas[2]) && /también en la ronda 1/.test(info.filas[2]), 'quien está en dos rondas sale una vez, con la más reciente y «también en la ronda 1»: ' + info.filas[2]);
  chk(!/Descartado/.test(info.filas[2]), 'y no sale su estado anterior (Descartado)');
  chk(/Descartado/.test(info.filas[3]) && /Ronda 1/.test(info.filas[3]), 'Descartado, al final: ' + info.filas[3]);
  chk(/MBA en inglés/.test(info.filas[0]), 'cada fila lleva el programa del alumno: ' + info.filas[0]);
  chk(!/CANARIO|Escribió|eligió|Perfil no encaja|Permiso de trabajo|nota/i.test(info.texto), 'ni motivos de descarte ni notas en la tarjeta nueva');
  chk(!/aplic|difund|Sheet|salta|No encaja|No cumple/i.test(info.texto), 'sin palabras del vocabulario viejo');
  await pg.click('#quien-solicito ul.alumnos > li:nth-child(2) a');
  await pg.waitForFunction(() => location.hash.startsWith('#/aplicacion/'));
  chk(/#\/aplicacion\/AP004$/.test(await pg.evaluate(() => location.hash)), 'tocar la fila de Lucía lleva a su solicitud (AP004)');
  chk(/Oferta/.test(await pg.innerText('a.volver')), 'y «volver» lleva a la oferta');
  await ctx.close();
}

console.log('2. Sin solicitudes: la tarjeta no aparece');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/oferta/O004', '#v-oferta .cabecera');
  await pg.waitForTimeout(400);
  chk((await pg.$$('#quien-solicito')).length === 0, 'una oferta sin solicitudes no enseña la tarjeta');
  chk(/Esta oferta todavía no se ha enviado a los alumnos/.test(await pg.innerText('#v-oferta')), '... y sigue diciendo que no se ha enviado');
  await ctx.close();
}

console.log('3. La marca «Solicitó · estado» en «Alumnos que encajan»');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/oferta/O002', '#match-alumnos');
  await pg.evaluate(() => document.querySelectorAll('#match-alumnos details').forEach(d => { d.open = true; }));
  const marcas = await pg.evaluate(() => [...document.querySelectorAll('#match-alumnos .fila-match')].filter(f => f.querySelector('.marca-solicito')).map(f => f.querySelector('b').textContent + ' → ' + f.querySelector('.marca-solicito').textContent + ' [' + f.closest('details').dataset.grupo + ']'));
  chk(marcas.length === 4, 'cuatro alumnos llevan la marca: ' + marcas.join(' · '));
  chk(marcas.some(m => /Lucía Quintero → Solicitó · En revisión \[no\]/.test(m)), 'Lucía Quintero: «Solicitó · En revisión», dentro de «Encaja poco»');
  chk(marcas.some(m => /Adrián O.Connor → Solicitó · Recibida/.test(m)), 'Adrián O’Connor (en dos rondas): su estado más reciente, «Solicitó · Recibida»');
  chk(marcas.some(m => /Mateo Ferrer → Solicitó · Entrevista/.test(m)) && marcas.some(m => /Paula Marín → Solicitó · Descartado/.test(m)), 'Entrevista y Descartado también');
  chk(!/ya tiene solicitud/.test(await pg.innerText('#match-alumnos')), 'ya no sale el texto antiguo «ya tiene solicitud en esta oferta»');
  chk(!/CANARIO|Escribió|eligió/.test(await pg.innerText('#match-alumnos')), 'la marca no lleva motivos ni notas');
  const sinMarca = await pg.evaluate(() => [...document.querySelectorAll('#match-alumnos .fila-match')].filter(f => !f.querySelector('.marca-solicito')).length);
  chk(sinMarca >= 20, 'el resto de alumnos no lleva marca (' + sinMarca + ')');
  await ctx.close();
}

console.log('4. A 320 px: nada se sale');
{
  const { pg, ctx } = await entrar({ ancho: 320, alto: 700 });
  await ir(pg, '#/oferta/O002', '#quien-solicito');
  chk(await sinScrollLateral(pg), 'la ficha de la oferta, sin scroll lateral');
  const caben = await pg.evaluate(() => {
    const raiz = document.querySelector('#main').getBoundingClientRect();
    const fuera = [...document.querySelectorAll('#quien-solicito *, #match-alumnos .marca-solicito, #match-alumnos .marca-solicito *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > raiz.right + 1 || r.left < raiz.left - 1); });
    return fuera.map(e => e.tagName + '.' + e.className);
  });
  chk(caben.length === 0, 'ningún elemento de la tarjeta ni de las marcas se sale de la pantalla' + (caben.length ? ': ' + caben.slice(0, 4) : ''));
  await pg.evaluate(() => document.querySelectorAll('#match-alumnos details').forEach(d => { d.open = true; }));
  // la marca más larga posible: «Solicitó · Enviada a la empresa»
  await pg.evaluate(() => { const b = document.querySelector('#match-alumnos .marca-solicito .insignia'); b.textContent = 'Solicitó · Enviada a la empresa'; });
  chk(await sinScrollLateral(pg), 'con «Solicitó · Enviada a la empresa» (la marca más larga), sin scroll lateral');
  await ctx.close();
}

console.log('5. Muchos alumnos y varias rondas («Ver más»)');
{
  const { pg, ctx } = await entrar({ ancho: 320, alto: 700 });
  await ir(pg, '#/', '#main');
  const r = await pg.evaluate(async () => {
    const m = await import(new URL('js/vistas/rondas.js', location.href).href);
    const estados = ['Recibida', 'En revisión', 'Enviada a la empresa', 'Entrevista', 'Contratado', 'Descartado'];
    const alumnos = Array.from({ length: 50 }, (_, i) => ({ id: 'M' + i, nombre: 'Nombre' + String(i).padStart(2, '0'), apellidos: 'Apellido', master: 'Programa de prueba ' + (i % 3) }));
    const aplicaciones = alumnos.flatMap((a, i) => [{ id: 'R' + i, idAlumno: a.id, idOferta: 'OX', numeroRonda: '1', fecha: '2026-10-10', estado: 'Recibida', motivo: 'MOTIVO-CANARIO', notas: 'NOTA-CANARIO' }, ...(i % 2 ? [{ id: 'S' + i, idAlumno: a.id, idOferta: 'OX', numeroRonda: '2', fecha: '2026-10-20', estado: estados[i % 6] }] : [])]);
    const tarjeta = m.tarjetaQuienHaSolicitado({ id: 'OX', titulo: 'Prueba', area: 'Finanzas' }, { hay: true, alumnos, aplicaciones, listas: {} });
    document.querySelector('#main').replaceChildren(tarjeta);
    const filas = () => tarjeta.querySelectorAll('ul.alumnos > li').length;
    const mas = tarjeta.querySelector('#qs-mas');
    const pasos = [[filas(), mas.hidden, mas.textContent]];
    while (!mas.hidden) { mas.click(); pasos.push([filas(), mas.hidden, mas.textContent]); }
    return { pasos, resumen: tarjeta.querySelector('p.sub').textContent, texto: tarjeta.innerText, lateral: document.documentElement.scrollWidth > innerWidth };
  });
  chk(JSON.stringify(r.pasos.map(p => p[0])) === JSON.stringify([15, 30, 45, 50]), 'pinta 15 y «Ver más» añade 15, 15 y 5: ' + r.pasos.map(p => p[0]));
  chk(r.pasos[0][2] === 'Ver 15 más' && r.pasos[2][2] === 'Ver 5 más' && r.pasos[3][1] === true, '«Ver 15 más», «Ver 5 más» y al final el botón desaparece: ' + r.pasos.map(p => p[2]));
  chk(/75 solicitudes de 50 alumnos/.test(r.resumen), 'resumen con muchos datos: ' + r.resumen);
  chk(!/CANARIO/.test(r.texto), 'ni el motivo ni las notas, con muchos datos');
  chk(!r.lateral, 'a 320 px con 50 filas, sin scroll lateral');
  await ctx.close();
}

await terminar();
