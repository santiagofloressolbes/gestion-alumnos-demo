// v27, parte C: la historia de «Compartir» es corta, no repite lo que ya sale debajo (programa, «Quiere ir a», «Experiencia en», «Busca»)
// y en los idiomas solo lleva el nombre, sin nivel ni «nativo» (que podría insinuar la nacionalidad). Se comprueba con los 30 alumnos de ejemplo y en pantalla.
import fs from 'node:fs';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';
import { historia, CAMPOS_HISTORIA } from '../../js/util/historia.js';
import * as C from '../../js/util/compartir.js';
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const filas = leerCSV(fs.readFileSync(new URL('../../datos-mock/Alumnos.csv', import.meta.url), 'utf8').replace(/^﻿/, ''));
const alumnos = aObjetos('Alumnos', { cabecera: filas[0], filas: filas.slice(1) }, E.ALUMNO, E.ALUMNO_OPC);
const NIVEL = /nativ|native|materna|biling|\b[ABC][12]\b/i;

console.log('11. La historia no repite lo de debajo (30 alumnos de ejemplo)');
{
  chk(alumnos.length === 30, 'hay 30 alumnos de ejemplo');
  const repetidos = [], largas = [], con = [];
  for (const a of alumnos) {
    const h = historia(a);
    if (!h) continue;
    con.push(a);
    // «Finanzas» dentro de «Máster en Finanzas» no es repetir el área: se comparan elementos enteros (separados por «.», «;», «,» o «:»).
    // (una subárea puede llamarse igual que el área: es otro dato —las subáreas del Sheet—, no una repetición de la línea «Quiere ir a»)
    const piezas = h.replace(/^Subáreas: [^.]*\.\s*/, '').split(/[.;,:]\s*/).map(x => x.trim()).filter(Boolean);
    for (const v of [a.master, a.areaDestino, a.areaExperiencia, a.disponibilidad].map(x => String(x || '').trim()).filter(Boolean)) if (piezas.includes(v)) repetidos.push(`${a.id}: «${v}»`);
    if (a.master && h.includes(String(a.master).trim())) repetidos.push(`${a.id}: programa «${a.master}»`);
    if (h.length > 330) largas.push(a.id + ' ' + h.length);
  }
  chk(con.length >= 25, `casi todos los alumnos tienen historia (${con.length} de 30)`);
  chk(repetidos.length === 0, 'ninguna historia repite su programa, su área destino, su área de experiencia ni lo que busca ' + repetidos.slice(0, 3).join(' | '));
  chk(largas.length === 0, 'ninguna pasa de 330 caracteres ' + largas.join(','));
  chk(con.every(a => !/Cursa|Quiere orientar|Tiene experiencia en|Entre sus habilidades|Formación previa/.test(historia(a))), 'ya no hay frases de relleno («Cursa…», «Quiere orientar…», «Tiene experiencia en…»)');
  chk(con.every(a => /^(Subáreas|Habilidades|Idiomas|Formación): /.test(historia(a))), 'cada historia empieza por una de sus 4 etiquetas');
  const lucia = alumnos.find(a => a.id === 'A001');
  chk(historia(lucia) === 'Subáreas: Producto digital, Experiencia de usuario. Habilidades: Scrum, Gestión de proyectos, Excel. Idiomas: Español, Inglés. Formación: Grado en Ingeniería Informática.', 'la de Lucía: «' + historia(lucia) + '»');
  chk(CAMPOS_HISTORIA.join() === 'subareasExperiencia,etiquetas,idiomas,formacionPrevia', 'solo lee subáreas, etiquetas, idiomas y formación');
  const largaAntes = 'Cursa ' + lucia.master + '. Quiere orientar su carrera hacia ' + lucia.areaDestino + '. Tiene experiencia en Producto digital y Experiencia de usuario. ' + historia(lucia);
  chk(historia(lucia).length < largaAntes.length * 0.7, 'es bastante más corta que la de antes');
}

console.log('12. Idiomas: solo el nombre, sin nivel ni «nativo»');
{
  const conNativo = alumnos.filter(a => /nativ/i.test(a.idiomas));
  chk(conNativo.length >= 20, `hay ${conNativo.length} alumnos con «nativo» en el Sheet (el nivel sigue ahí, en su ficha)`);
  chk(conNativo.every(a => !NIVEL.test(historia(a))), 'ninguna de sus historias dice «nativo» ni un nivel');
  chk(alumnos.every(a => !NIVEL.test(historia(a))), 'ninguna historia de los 30 lleva niveles (A1–C2) ni «nativo»');
  chk(conNativo.every(a => String(a.idiomas).split(';').map(x => x.trim().replace(/\s+(?:[ABC][12]|nativo)$/i, '')).every(n => historia(a).includes(n))), 'pero cada idioma sigue saliendo por su nombre');
  chk(historia({ idiomas: 'Italiano nativo' }) === 'Idiomas: Italiano.', '«Italiano nativo» → «Idiomas: Italiano.»');
  // el texto completo, marcando TODO: «nativo» solo podría salir de la casilla de nacionalidad (no de los idiomas)
  const a = { ...alumnos[0], idiomas: 'Italiano nativo; Inglés C1' };
  const todo = C.textoPerfiles({ alumnos: [a], campos: [...C.CAMPOS_BASE.map(c => c.clave), ...C.CAMPOS_SENSIBLES.map(c => c.clave), 'historia'] });
  chk(!NIVEL.test(todo.replace(/Nacionalidad:[^\n]*/, '')), 'marcando todo, ninguna línea lleva un nivel de idioma');
  chk(/Idiomas: Italiano, Inglés\./.test(todo), '«Idiomas: Italiano, Inglés.» sale en la historia');
}

console.log('11-12. En pantalla');
{
  const t = await nuevo();
  const { pg, ctx, mundo, log } = t;
  const ca = mundo.hojas.Alumnos.m[0], f1 = mundo.hojas.Alumnos.m[1];
  f1[ca.indexOf('Idiomas')] = 'Italiano nativo; Inglés C1; Francés B2';
  await pg.addInitScript(([u, c]) => { if (sessionStorage.getItem('ini')) return; localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); sessionStorage.setItem('ini', '1'); }, [URL_OK, CLAVE_PRUEBA]);
  await pg.goto(BASE + '#/alumno/A001/compartir'); await pg.waitForSelector('#cp-vista');
  chk(/Programa: /.test(await pg.innerText('#cp-vista')) && /Quiere ir a: /.test(await pg.innerText('#cp-vista')) && /Busca: /.test(await pg.innerText('#cp-vista')), 'por defecto salen las líneas Programa, Quiere ir a y Busca');
  await pg.check('#cp-c-historia');
  const v = await pg.innerText('#cp-vista');
  const h = (v.match(/Resumen: ([^\n]*)/) || [])[1] || '';
  chk(/^Subáreas: /.test(h) && /Idiomas: Italiano, Inglés, Francés\./.test(h), 'la historia en pantalla: «' + h + '»');
  chk(!NIVEL.test(v), 'en toda la vista previa no hay «nativo» ni niveles de idioma');
  chk(!h.includes('MBA en inglés') && !h.includes('Producto y tecnología') && !/Prácticas/.test(h), 'la historia no repite el programa, el área ni lo que busca');
  chk(/Programa: MBA en inglés/.test(v) && /Quiere ir a: Producto y tecnología/.test(v) && /Busca: Prácticas/.test(v), 'esos datos siguen saliendo, una sola vez, en sus líneas');
  chk(v.split('MBA en inglés').length === 2, 'el programa aparece una sola vez en el texto');
  chk(/sin nivel/.test(await pg.innerText('#v-compartir')) && /Una línea/.test(await pg.innerText('#v-compartir')), 'la nota de la casilla explica que es corta y sin nivel');
  chk(!/Cursa|Quiere orientar|Tiene experiencia en/.test(await pg.innerText('#v-compartir')), 'la nota ya no promete programa ni área en la historia');
  // marcando lo sensible (nacionalidad, situación…): la historia sigue sin niveles
  for (const c of ['nacionalidad', 'situacion', 'experiencia', 'cv']) await pg.check('#cp-c-' + c);
  chk(!NIVEL.test((await pg.innerText('#cp-vista')).replace(/Nacionalidad:[^\n]*/, '')), 'marcando lo sensible, los idiomas siguen sin nivel');
  chk(log.consola.length === 0, 'sin errores de consola');
  await ctx.close();
}

await terminar();
