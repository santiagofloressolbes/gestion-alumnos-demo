// v28, parte 3: redacción del match. Solo cambia el TEXTO de un criterio, nunca el cálculo.
//   · «Idiomas · Revisar: Idiomas: …» repetía la palabra: el motor ya no empieza el texto de idiomas con «Idiomas:».
//   · Foto del cálculo hecha antes del cambio (tests/app/fixtures/match-calculo-v27.json): los 300 pares de los datos de ejemplo
//     (30 alumnos × 10 ofertas) dan el mismo grupo, el mismo % y los mismos estados, y el texto de los demás criterios no se ha tocado.
//   · Ningún texto de un criterio empieza por el nombre de su propio rótulo.
// Funciones puras: sin navegador.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCSV } from '../../js/util/csv.js';
import { aObjetos, aReglasMatch } from '../../js/data/tablas.js';
import * as E from '../../js/data/esquema.js';
import * as M from '../../js/util/match.js';
import { norm } from '../../js/util/texto.js';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const tabla = f => { const filas = leerCSV(fs.readFileSync(path.join(RAIZ, f), 'utf8')); return { cabecera: filas[0].map(h => h.trim()), filas: filas.slice(1) }; };
const al = aObjetos('Alumnos', tabla('datos-mock/Alumnos.csv'), E.ALUMNO, E.ALUMNO_OPC), of = aObjetos('Ofertas', tabla('datos-mock/Ofertas.csv'), E.OFERTA, E.OFERTA_OPC);
const hojas = Object.fromEntries(Object.entries({ paises: 'Paises', areas: 'Areas', afinidad: 'Afinidad', reglas: 'ReglasMigratorias', etiquetas: 'Etiquetas' }).map(([k, f]) => [k, tabla(`datos-mock/${f}.csv`)]));
const ctx = M.contextoDe({ match: aReglasMatch(hojas, E.HOJAS_MATCH) });
const foto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tests/app/fixtures/match-calculo-v27.json'), 'utf8')).pares;
// Los rótulos que enseña la pantalla (js/vistas/match.js, TITULO).
const TITULO = { area: 'Área', subarea: 'Subárea', etiquetas: 'Habilidades', idiomas: 'Idiomas', nivel: 'Formación', tipo: 'Tipo', nacionalidad: 'Nacionalidad', permiso: 'Permiso de trabajo' };

console.log('1. El cálculo no cambia (300 pares de los datos de ejemplo)');
{
  const claves = Object.keys(foto);
  chk(claves.length === al.length * of.length && claves.length === 300, `la foto tiene ${claves.length} pares = ${al.length} alumnos × ${of.length} ofertas`);
  let calculoMal = [], otrosMal = [], idiomasMal = [], con = 0, sin = 0;
  for (const a of al) for (const o of of) {
    const f = foto[`${a.id}|${o.id}`], r = M.evaluar(a, o, ctx), p = r.puntuacion;
    const calculo = [r.categoria, p.porcentaje, p.puntos, p.maximo, p.evaluados, p.sinDatos, ...r.criterios.map(c => `${c.id}:${c.estado}${c.sinDatos ? '?' : ''}${c.noAplica ? '-' : ''}:${c.factor}`)].join('|');
    if (calculo !== f.calculo) calculoMal.push(`${a.id}|${o.id}`);
    const otros = crypto.createHash('sha1').update(r.criterios.filter(c => c.id !== 'idiomas').map(c => c.texto).join('\n')).digest('hex').slice(0, 12);
    if (otros !== f.otros) otrosMal.push(`${a.id}|${o.id}`);
    const t = r.criterios.find(c => c.id === 'idiomas').texto;
    if (f.idiomas.startsWith('Idiomas: ')) { con++; if (t !== f.idiomas.slice('Idiomas: '.length)) idiomasMal.push(`${a.id}|${o.id}: ${t}`); }
    else { sin++; if (t !== f.idiomas) idiomasMal.push(`${a.id}|${o.id}: ${t}`); }
  }
  chk(calculoMal.length === 0, `mismo grupo, mismo %, mismos puntos y mismos estados en los 300 pares ${calculoMal.slice(0, 3).join(', ')}`);
  chk(otrosMal.length === 0, `el texto de los otros siete criterios no se ha tocado en ningún par ${otrosMal.slice(0, 3).join(', ')}`);
  chk(idiomasMal.length === 0, `el texto de idiomas solo pierde el «Idiomas: » del principio ${idiomasMal.slice(0, 2).join(' | ')}`);
  chk(con >= 20 && sin >= 5, `y se ha comprobado con textos de los dos tipos (${con} con «Idiomas:» antes, ${sin} sin él)`);
}

console.log('2. Ningún texto repite el rótulo de su criterio');
{
  const empiezanPorRotulo = [];
  const frases = new Set();
  for (const a of al) for (const o of of) for (const c of M.evaluar(a, o, ctx).criterios) {
    frases.add(c.texto);
    const rotulo = norm(TITULO[c.id]), t = norm(c.texto);
    if (t.startsWith(rotulo + ':') || t.startsWith(rotulo + ' ·') || t.startsWith(rotulo + ' -')) empiezanPorRotulo.push(`${c.id}: ${c.texto.slice(0, 50)}`);
  }
  chk(empiezanPorRotulo.length === 0, `ningún texto de criterio empieza por su rótulo («Idiomas: …», «Área: …»…) ${empiezanPorRotulo.slice(0, 2).join(' | ')}`);
  chk(frases.size > 100, `se han mirado ${frases.size} frases distintas`);
  chk([...frases].every(t => /[.!?»)]$/.test(t)), 'todas acaban en punto (o en cierre): sin frases cortadas');
}

console.log('3. Casos concretos de idiomas: el texto, sin el «Idiomas:»');
{
  const a = (idiomas) => ({ id: 'A1', nombre: 'Lucía', apellidos: 'Quintero', idiomas });
  const o = (idiomas) => ({ id: 'O1', area: 'X', tipo: 'Prácticas', idiomas });
  const t = (ai, oi) => M.criterioIdiomas(a(ai), o(oi));
  const bajo = t('Inglés B2', 'Inglés C1');
  chk(bajo.texto === 'Inglés C1: tiene B2 (nivel más bajo).' && bajo.estado === 'revisar', 'nivel más bajo: «' + bajo.texto + '»');
  chk(t('Inglés C1', 'Inglés C1').texto === 'Inglés C1: tiene C1.' && t('Inglés C1', 'Inglés C1').estado === 'ok', 'cumple: «' + t('Inglés C1', 'Inglés C1').texto + '»');
  chk(t('Español', 'Inglés C1').texto === 'Inglés C1: no lo tiene.' && t('Español', 'Inglés C1').estado === 'no', 'no lo tiene: «' + t('Español', 'Inglés C1').texto + '»');
  chk(t('Inglés C1; Francés', 'Inglés; Francés B1; Alemán').texto === 'Inglés: lo tiene; Francés B1: lo tiene pero no consta el nivel; Alemán: no lo tiene.', 'varios idiomas separados por «;»: «' + t('Inglés C1; Francés', 'Inglés; Francés B1; Alemán').texto + '»');
  chk(M.criterioIdiomas(a(''), o('Inglés C1')).texto === 'La oferta pide «Inglés C1» y no constan los idiomas de Lucía Quintero.' && M.criterioIdiomas(a(''), o('Inglés C1')).sinDatos === true, 'sin idiomas del alumno: texto de siempre y «sin datos»');
  chk(M.criterioIdiomas(a('Inglés'), o('')).noAplica === true && M.criterioIdiomas(a('Inglés'), o('')).texto === 'La oferta no pide idiomas concretos.', 'la oferta no pide idiomas: texto de siempre');
  // el estado según la fracción que se cumple (los datos de ejemplo solo dan 0, 0,5 y 1: aquí también 0,25 y «sin nivel»)
  const cuarto = t('Inglés C1', 'Inglés C1; Francés; Alemán; Italiano');
  chk(cuarto.estado === 'revisar' && cuarto.factor === 0.25, 'cumple 1 de 4: «a revisar» con factor 0,25 (' + cuarto.estado + ' ' + cuarto.factor + ')');
  const sinNivelOk = t('Inglés C1; Francés', 'Inglés C1; Francés B1');
  chk(sinNivelOk.estado === 'revisar' && sinNivelOk.factor === 1, 'todo cumplido pero a un idioma le falta el nivel: «a revisar» (' + sinNivelOk.estado + ')');
  chk(t('Inglés B2', 'Inglés B1').estado === 'ok' && t('Inglés C2', 'Inglés Nativo').estado === 'revisar', 'nivel más alto cumple; menos que «nativo» queda a revisar');
  // el cálculo de cada caso (factor y estado) es el de siempre
  chk(bajo.factor === 0.5 && t('Inglés C1', 'Inglés C1').factor === 1 && t('Español', 'Inglés C1').factor === 0, 'factores 0,5 / 1 / 0 como antes');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
