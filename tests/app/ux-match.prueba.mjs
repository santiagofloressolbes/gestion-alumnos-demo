// v27, parte B: match y listas. Las tarjetas anidadas respetan el ancho (también con texto largo), el % lleva el color de su grupo,
// cada fila dice en una línea el motivo que decide el grupo, «Por qué» es más corto (razón migratoria con «ver más»),
// las casillas usan la paleta y se tocan con ≥ 44 px, y no hay un «0» suelto.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

const entrar = async ({ ancho = 390, alto = 800, alumnos, script = false } = {}) => {
  const t = await nuevo();
  await t.ctx.clock.setFixedTime('2026-11-12T12:00:00');
  await t.pg.addInitScript(([s, u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    if (s) { localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c); } else localStorage.setItem('gad.modo', 'demo');
    sessionStorage.setItem('ini', '1');
  }, [script, URL_OK, CLAVE_PRUEBA]);
  if (alumnos) await t.pg.route('**/datos-mock/Alumnos.csv*', async r => { const res = await r.fetch(); await r.fulfill({ response: res, body: alumnos(await res.text()) }); });
  await t.pg.setViewportSize({ width: ancho, height: alto });
  return t;
};
const ir = async (pg, hash, sel) => { await pg.goto(BASE + hash); await pg.waitForSelector(sel, { state: 'attached' }); };
const abrirTodo = pg => pg.evaluate(() => {
  document.querySelectorAll('#main details').forEach(d => { d.open = true; });
  document.querySelectorAll('.grupo-match>button.secondary').forEach(b => { while (!b.hidden) b.click(); });
});
const sinErrores = (log, t) => chk(log.consola.length === 0, t + (log.consola.length ? ' → ' + log.consola.join(' | ') : ''));
// Nombre y apellido larguísimos y sin espacios: si algo no parte líneas, se sale del recuadro.
const LARGO = t => t.replace('Lucía,Quintero', 'L' + 'u'.repeat(60) + ',Q' + 'q'.repeat(60));

// Ningún elemento de la tarjeta se sale de su recuadro (ni a la derecha ni a la izquierda) ni provoca scroll lateral.
const desborde = (pg, raiz) => pg.evaluate(r => {
  const card = document.querySelector(r), malos = [];
  const dentro = (e, c) => { const a = e.getBoundingClientRect(), b = c.getBoundingClientRect(); return a.width === 0 || (a.left >= b.left - 1 && a.right <= b.right + 1); };
  for (const e of card.querySelectorAll('*')) {
    if (getComputedStyle(e).display === 'none' || e.closest('[hidden]') || e.closest('details:not([open]) > :not(summary)')) continue;
    const padre = e.parentElement;
    if (!dentro(e, padre === card ? card : padre)) malos.push(e.tagName + '.' + e.className + ' en ' + padre.tagName + '.' + padre.className);
    const g = e.closest('.grupo-match'); if (g && !dentro(e, g)) malos.push('fuera del grupo: ' + e.tagName + '.' + e.className);
    if (!dentro(e, card)) malos.push('fuera de la tarjeta: ' + e.tagName + '.' + e.className);
  }
  const lateral = [card, ...card.querySelectorAll('.grupo-match, li.fila-match, .porque')].some(x => x.scrollWidth > x.clientWidth + 1);
  return { malos: [...new Set(malos)].slice(0, 4), lateral, pagina: document.documentElement.scrollWidth > innerWidth || document.querySelector('#main').scrollWidth > document.querySelector('#main').clientWidth };
}, raiz);
const contraste = (pg, sel) => pg.evaluate(s => {
  const e = document.querySelector(s);
  const rgb = t => (t.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let f = e, bg = [0, 0, 0, 0];
  while (f) { bg = rgb(getComputedStyle(f).backgroundColor); if (bg.length < 4 || bg[3] > 0) break; f = f.parentElement; }
  const t = lum(rgb(getComputedStyle(e).color)), b = lum(bg);
  return (Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05);
}, sel);

console.log('5. Las tarjetas anidadas respetan el ancho');
for (const ancho of [320, 390]) {
  const { pg, ctx, log } = await entrar({ ancho, alumnos: LARGO });
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match'); await abrirTodo(pg);
  const a = await desborde(pg, '#match-alumnos');
  chk(a.malos.length === 0, `ficha de la oferta a ${ancho} px: nada se sale de su recuadro ${a.malos.join(' | ')}`);
  chk(!a.lateral && !a.pagina, `ficha de la oferta a ${ancho} px: sin scroll lateral (ni en la tarjeta ni en la página)`);
  chk((await pg.$$eval('#match-alumnos li.fila-match', l => l.filter(x => /u{20}/.test(x.textContent)).length)) >= 1, `a ${ancho} px: el nombre larguísimo está en la lista (y parte líneas)`);
  await ir(pg, '#/alumno/A001', '#match-ofertas .grupo-match'); await abrirTodo(pg);
  const b = await desborde(pg, '#match-ofertas');
  chk(b.malos.length === 0, `ficha del alumno a ${ancho} px: nada se sale de su recuadro ${b.malos.join(' | ')}`);
  chk(!b.lateral && !b.pagina, `ficha del alumno a ${ancho} px: sin scroll lateral`);
  sinErrores(log, `a ${ancho} px: sin errores en la consola`);
  await ctx.close();
}

console.log('6. El % de encaje lleva el color de su grupo');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/oferta/O004', '#match-alumnos .grupo-match'); await abrirTodo(pg);
  const col = await pg.evaluate(() => {
    const r = getComputedStyle(document.documentElement), v = n => r.getPropertyValue(n).trim().toLowerCase();
    const hex = h => { const m = h.match(/^#(..)(..)(..)$/); return `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})`; };
    const esperado = { encaja: hex(v('--g-encaja')), reservas: hex(v('--g-reservas')), no: hex(v('--cmuted')) }, rojo = hex(v('--tab-on'));
    return [...document.querySelectorAll('#match-alumnos .grupo-match')].map(g => ({ g: g.dataset.grupo, n: g.querySelectorAll('.match-punt').length,
      ok: [...g.querySelectorAll('.match-punt')].every(p => getComputedStyle(p).color === esperado[g.dataset.grupo] && getComputedStyle(p).color !== rojo), color: esperado[g.dataset.grupo] }));
  });
  chk(col.every(c => c.n > 0 && c.ok), 'cada % lleva el color de su grupo (verde, ámbar y, en «Encaja poco», gris) y ninguno el rojo de acento: ' + JSON.stringify(col));
  chk(new Set(col.map(c => c.color)).size === 3, 'los tres grupos tienen tres colores distintos');
  const ratios = [];
  for (const g of ['encaja', 'reservas', 'no']) ratios.push(await contraste(pg, `#match-alumnos .grupo-match[data-grupo=${g}] .match-punt`));
  chk(ratios.every(x => x >= 4.5), 'contraste de cada % ≥ 4,5: ' + ratios.map(x => x.toFixed(1)).join(' / '));
  chk(await pg.$$eval('#match-alumnos .match-punt', l => l.every(x => /^((Encaje|Afinidad) \d+ %|Sin puntuación)/.test(x.textContent))), 'el % sigue escrito en texto (el color no es lo único)');
  await ir(pg, '#/alumno/A001', '#match-ofertas .grupo-match'); await abrirTodo(pg);
  chk(await pg.$$eval('#match-ofertas .grupo-match', gs => gs.every(g => [...g.querySelectorAll('.match-punt')].every(p => p.classList.contains('g-' + g.dataset.grupo)))), 'en la ficha del alumno también: cada % lleva la clase de su grupo');
  await ctx.close();
}

console.log('7. Cada fila dice en una línea el motivo que decide el grupo');
{
  const { pg, ctx } = await entrar();
  for (const [hash, raiz] of [['#/oferta/O004', '#match-alumnos'], ['#/oferta/O006', '#match-alumnos'], ['#/alumno/A001', '#match-ofertas']]) {
    await ir(pg, hash, raiz + ' .grupo-match'); await abrirTodo(pg);
    const filas = await pg.$$eval(raiz + ' li.fila-match', ls => ls.map(l => {
      const m = l.querySelector('.motivo'), id = m?.dataset.criterio, c = id && l.querySelector(`.criterios .crit[data-criterio="${id}"]`);
      return { g: l.closest('.grupo-match').dataset.grupo, n: l.querySelectorAll('.motivo').length, id, clase: c ? c.className : '', texto: m ? m.textContent : '', palabraPorQue: c ? c.textContent : '' };
    }));
    const NUCLEO = ['area', 'tipo', 'nacionalidad', 'permiso'];
    chk(filas.length > 0 && filas.every(f => f.n === 1), `${hash}: cada una de las ${filas.length} filas tiene exactamente una línea de motivo`);
    chk(filas.filter(f => f.g === 'no').every(f => NUCLEO.includes(f.id) && /\bno\b/.test(f.clase)), `${hash}: en «Encaja poco», el motivo es un «no» de área, tipo, nacionalidad o permiso (${filas.filter(f => f.g === 'no').length} filas)`);
    chk(filas.filter(f => f.g === 'reservas').every(f => /revisar|\bno\b/.test(f.clase)), `${hash}: en «con reservas», el motivo es algo que revisar (${filas.filter(f => f.g === 'reservas').length} filas)`);
    chk(filas.filter(f => f.g === 'encaja').every(f => /\bok\b/.test(f.clase)), `${hash}: en «Encaja», el motivo es un criterio que cumple`);
    chk(filas.every(f => f.texto.length <= 125), `${hash}: la línea es corta (≤ 125 caracteres; la más larga, ${Math.max(...filas.map(f => f.texto.length))})`);
    chk(filas.every(f => { const palabra = (/(Cumple|Revisar|No coincide|Sin dato|No aplica)/.exec(f.palabraPorQue) || [])[1]; return palabra && f.texto.includes(palabra); }), `${hash}: la palabra del motivo coincide con la de «Por qué»`);
  }
  await ctx.close();
}

console.log('8. «Por qué» menos repetitivo; la razón migratoria larga, con «ver más»');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match'); await abrirTodo(pg);
  const x = await pg.evaluate(() => ({
    aviso: [...document.querySelectorAll('#match-alumnos .porque-aviso')].map(e => e.textContent),
    puntos: [...document.querySelectorAll('#match-alumnos .porque-punt')].map(e => e.textContent),
    arriba: document.querySelector('#match-alumnos > .aviso-orientativo')?.textContent || '',
    n: document.querySelectorAll('#match-alumnos li.fila-match').length,
    textos: [...document.querySelectorAll('#match-alumnos .crit-texto')].map(e => e.textContent.length),
  }));
  chk(x.arriba.length > 80 && x.aviso.length === x.n && x.aviso.every(a => a.length < 60 && /comprueba/.test(a)), 'el aviso largo sale una vez arriba y en cada «Por qué» solo una frase corta');
  chk(x.puntos.every(t => !/%/.test(t) && !/Encaje/.test(t)), '«Por qué» no repite el «Encaje %» de la fila');
  const largo = await pg.$('#match-alumnos .crit[data-criterio=permiso] .ver-mas');
  chk(largo !== null, 'una razón de permiso larga lleva «ver más»');
  if (largo) {
    const largoTexto = () => pg.evaluate(() => document.querySelector('#match-alumnos .crit[data-criterio=permiso] .texto-largo').textContent);
    const corto = await largoTexto();
    chk(corto.endsWith('…') && corto.length <= 111, 'acortada a ≤ 110 caracteres y con «…»: ' + corto.length);
    const antes = await pg.evaluate(() => { const c = document.querySelector('#match-alumnos .crit[data-criterio=permiso] .ver-mas').closest('.crit-texto'); return c.textContent.length; });
    chk(antes < 260, 'acortada: ' + antes + ' caracteres con el botón');
    await largo.click();
    const d = await pg.evaluate(() => { const b = document.querySelector('#match-alumnos .crit[data-criterio=permiso] .ver-mas'); return { len: b.closest('.crit-texto').textContent.length, exp: b.getAttribute('aria-expanded'), t: b.textContent, h: b.getBoundingClientRect().height }; });
    const entero = await largoTexto();
    chk(d.len > antes && entero.length > corto.length && !entero.endsWith('…') && d.exp === 'true' && d.t === 'ver menos', '«ver más» enseña el texto completo y pasa a «ver menos» (aria-expanded=true)');
    chk(d.h >= 44, 'el botón se toca con ≥ 44 px de alto');
    await pg.click('#match-alumnos .crit[data-criterio=permiso] .ver-mas');
    chk((await largoTexto()) === corto, '«ver menos» vuelve a acortarlo');
  }
  chk(await pg.$$eval('#match-alumnos .crit[data-criterio=area] .ver-mas', l => l.length) === 0, 'el resto de criterios no lleva «ver más»');
  await ctx.close();
}

console.log('9. Casillas con la paleta, tocables con ≥ 44 px');
{
  const { pg, ctx } = await entrar();
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match'); await abrirTodo(pg);
  const c = await pg.evaluate(() => {
    const i = document.querySelector('#match-alumnos input.casilla'), s = getComputedStyle(i), l = i.closest('label').getBoundingClientRect();
    return { clase: i.className, app: s.appearance || s.webkitAppearance, borde: s.borderTopColor, fondo: s.backgroundColor, w: l.width, h: l.height, todas: [...document.querySelectorAll('#match-alumnos input[type=checkbox]')].every(x => x.classList.contains('casilla')),
      muted: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim().toLowerCase() };
  });
  chk(c.todas && c.app === 'none', 'todas las casillas del match usan el estilo propio (appearance: none)');
  chk(c.borde === 'rgb(161, 161, 170)' && c.fondo === 'rgb(23, 23, 27)', 'desmarcada: borde gris de la paleta y fondo del tema, no negra: ' + c.borde + ' / ' + c.fondo);
  chk(c.w >= 44 && c.h >= 44, `la etiqueta que se toca mide ${Math.round(c.w)}×${Math.round(c.h)} px (≥ 44×44)`);
  await pg.click('#match-alumnos label.sel-compartir >> nth=0');
  const m = await pg.evaluate(() => { const i = document.querySelector('#match-alumnos input.casilla'); const s = getComputedStyle(i); return { on: i.checked, fondo: s.backgroundColor, img: s.backgroundImage }; });
  chk(m.on && m.fondo === 'rgb(214, 59, 69)' && /svg/.test(m.img), 'marcada: fondo rojo de acento con la marca blanca (el estado también se ve por la marca, no solo por el color)');
  chk(/1 alumno elegido/.test(await pg.innerText('#cp-cuenta')) && /Compartir perfiles \(1\)/.test(await pg.innerText('#cp-ir')), 'marcar sigue contando (1 alumno elegido)');
  // la pantalla de Compartir
  await pg.click('#cp-ir'); await pg.waitForSelector('#v-compartir .elegir-cp');
  const k = await pg.evaluate(() => [...document.querySelectorAll('#v-compartir .elegir-cp label')].map(l => { const r = l.getBoundingClientRect(), i = l.querySelector('input'); return { h: r.height, w: r.width, casilla: i.classList.contains('casilla') && getComputedStyle(i).appearance === 'none' }; }));
  chk(k.length > 8 && k.every(x => x.casilla && x.h >= 44 && x.w >= 44), `Compartir: las ${k.length} casillas usan el estilo propio y miden ≥ 44 px`);
  await ctx.close();
}
{
  const { pg, ctx } = await entrar({ script: true });
  await pg.goto(BASE + '#/oferta/nueva'); await pg.waitForTimeout(1500);
  const n = await pg.$$eval('#v-oferta-form input.casilla', l => l.map(i => { const r = i.closest('label').getBoundingClientRect(); return r.height >= 44; }));
  chk(n.length > 0 ? n.every(Boolean) : true, `formulario de oferta (script): ${n.length} casillas de etiquetas con ≥ 44 px`);
  chk(await pg.$$eval('#v-oferta-form input[type=checkbox]', l => l.every(i => i.classList.contains('casilla'))), 'y todas con el estilo propio');
  await ctx.close();
}

console.log('10. Ningún «0» suelto');
{
  const { pg, ctx } = await entrar();
  const suelto = () => pg.evaluate(() => {
    const malos = [];
    for (const raiz of document.querySelectorAll('#match-alumnos, #match-ofertas')) {
      const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (/^\s*0\s*$/.test(n.textContent)) malos.push(n.parentElement.tagName + '.' + n.parentElement.className);
    }
    return malos;
  });
  await ir(pg, '#/oferta/O005', '#match-alumnos .grupo-match');
  const a = await suelto();
  chk(a.length === 0, 'ficha de la oferta: ningún texto que sea solo «0» ' + a.join(','));
  chk(!/(^|\n)0(\n|$)/.test(await pg.innerText('#match-alumnos')), 'y tampoco en una línea sola del texto visible');
  chk(/^Marca a quien quieras para compartir su perfil \(máximo 10\)\.$/.test(await pg.innerText('#cp-cuenta')), 'sin nadie marcado, el contador lo dice con palabras (no «0»)');
  await ir(pg, '#/alumno/A001', '#match-ofertas .grupo-match');
  const b = await suelto();
  chk(b.length === 0, 'ficha del alumno: ningún «0» suelto ' + b.join(','));
  await ctx.close();
}

console.log('11. v28: «Afinidad» (gris) en «Encaja poco» y todos los criterios que fallan en la fila');
{
  const { pg, ctx } = await entrar();
  const NOMBRE = { area: 'área', subarea: 'subárea', etiquetas: 'habilidades', idiomas: 'idiomas', nivel: 'formación', tipo: 'prácticas o empleo', nacionalidad: 'nacionalidad', permiso: 'permiso' };
  const NUCLEO = ['area', 'tipo', 'nacionalidad', 'permiso'];
  let multiples = 0, conRevisarYNo = 0, filasTotal = 0;
  for (const [hash, raiz] of [['#/oferta/O004', '#match-alumnos'], ['#/oferta/O005', '#match-alumnos'], ['#/oferta/O006', '#match-alumnos'], ['#/alumno/A001', '#match-ofertas'], ['#/alumno/A010', '#match-ofertas']]) {
    await ir(pg, hash, raiz + ' .grupo-match'); await abrirTodo(pg);
    const filas = await pg.$$eval(raiz + ' li.fila-match', ls => ls.map(l => ({
      g: l.closest('.grupo-match').dataset.grupo,
      punt: l.querySelector('.match-punt').textContent, color: getComputedStyle(l.querySelector('.match-punt')).color,
      no: [...l.querySelectorAll('.criterios .crit.no')].map(c => c.dataset.criterio),
      revisar: [...l.querySelectorAll('.criterios .crit.revisar')].map(c => c.dataset.criterio),
      linea: l.querySelector('.motivo').textContent.replace(/\s+/g, ' ').trim(), ids: l.querySelector('.motivo').dataset.criterios || '',
    })));
    const gris = await pg.evaluate(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--cmuted').trim(); const m = v.match(/^#(..)(..)(..)$/); return `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})`; });
    filasTotal += filas.length;
    chk(filas.filter(f => f.g === 'no').every(f => /^(Afinidad \d+ %|Sin puntuación)/.test(f.punt)), `${hash}: en «Encaja poco» el % se llama «Afinidad» (${filas.filter(f => f.g === 'no').length} filas)`);
    chk(filas.filter(f => f.g !== 'no').every(f => /^(Encaje \d+ %|Sin puntuación)/.test(f.punt)), `${hash}: en «Encaja» y «con reservas» sigue «Encaje»`);
    chk(filas.filter(f => f.g === 'no').every(f => f.color === gris), `${hash}: la «Afinidad» va en gris`);
    chk(filas.every(f => !/Afinidad de perfil/.test(f.punt)), `${hash}: el rótulo es «Afinidad» a secas`);
    // La línea de la fila lista TODOS los criterios que fallan, y son los mismos que marca «Por qué».
    const malas = [];
    for (const f of filas) {
      if (f.g === 'encaja') continue;
      const no = f.g === 'no' ? f.no.filter(i => NUCLEO.includes(i)) : f.no, rev = f.g === 'no' ? [] : f.revisar;
      if (no.length + rev.length < 2) continue;   // con uno solo se queda la línea de siempre, con el comienzo de la razón
      multiples++; if (no.length && rev.length) conRevisarYNo++;
      const esperado = [no.length && `✗ No coincide: ${no.map(i => NOMBRE[i]).join(', ')}`, rev.length && `! Revisar: ${rev.map(i => NOMBRE[i]).join(', ')}`].filter(Boolean).join(' · ');
      if (f.linea !== esperado) malas.push(`«${f.linea}» ≠ «${esperado}»`);
      if (f.ids !== [...no, ...rev].join(' ')) malas.push('data-criterios ' + f.ids);
    }
    chk(malas.length === 0, `${hash}: la línea de cada fila con varios fallos los nombra todos y en el orden de «Por qué» ${malas.slice(0, 2).join(' | ')}`);
    const unico = filas.filter(f => f.g !== 'encaja' && (f.g === 'no' ? f.no.filter(i => NUCLEO.includes(i)).length : f.no.length + f.revisar.length) === 1);
    chk(unico.every(f => /^[✗!?] \S.* · (No coincide|Revisar|Sin dato)/.test(f.linea)), `${hash}: con un solo fallo se conserva «✗ Área · No coincide» y el comienzo de la razón (${unico.length} filas)`);
    chk(filas.filter(f => f.g === 'no').every(f => !/Revisar/.test(f.linea.split(' · ')[0]) || /No coincide/.test(f.linea)), `${hash}: «Encaja poco» nombra los «no», no los «a revisar»`);
  }
  chk(multiples >= 5, `hay filas con varios criterios que fallan para comprobar (${multiples} de ${filasTotal})`);
  chk(conRevisarYNo >= 1, `y al menos una con «No coincide» y «Revisar» a la vez (${conRevisarYNo})`);
  // Ni encaja ni nombres de criterios que la oferta no pide
  chk(await pg.$$eval('#match-ofertas li.fila-match', ls => ls.every(l => !/NaN|undefined|null/.test(l.querySelector('.motivo').textContent))), 'ninguna línea con basura');
  await ctx.close();
}

console.log('12. v28: las líneas con varios fallos caben en 320 px');
{
  const { pg, ctx } = await entrar({ ancho: 320 });
  for (const [hash, raiz] of [['#/oferta/O005', '#match-alumnos'], ['#/alumno/A001', '#match-ofertas']]) {
    await ir(pg, hash, raiz + ' .grupo-match'); await abrirTodo(pg);
    const a = await desborde(pg, raiz);
    chk(a.malos.length === 0 && !a.lateral && !a.pagina, `${hash} a 320 px: nada se sale del recuadro ${a.malos.join(' | ')}`);
    chk(await pg.$$eval(raiz + ' .motivo', l => l.every(x => x.scrollHeight <= x.clientHeight + 1)), `${hash}: la línea de motivo no se corta`);
  }
  await ctx.close();
}

console.log('13. v28: «Idiomas · Revisar: Idiomas: …» ya no repite la palabra');
{
  const { pg, ctx } = await entrar();
  for (const [hash, raiz] of [['#/oferta/O004', '#match-alumnos'], ['#/oferta/O005', '#match-alumnos'], ['#/alumno/A001', '#match-ofertas'], ['#/alumno/A010', '#match-ofertas']]) {
    await ir(pg, hash, raiz + ' .grupo-match'); await abrirTodo(pg);
    const x = await pg.$$eval(raiz + ' .crit', cs => cs.map(c => {
      const b = c.querySelector('b').textContent, resto = c.querySelector('.crit-texto').textContent.slice(b.length);
      return { b, resto: resto.trim(), id: c.dataset.criterio };
    }));
    const quitar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const malos = x.filter(c => { const rotulo = quitar(c.b.split(' · ')[0]); return quitar(c.resto).startsWith(rotulo + ':') || quitar(c.resto).startsWith(rotulo + ' ·'); });
    chk(malos.length === 0, `${hash}: en «Por qué» ningún texto empieza repitiendo su rótulo (${x.length} criterios) ${malos.slice(0, 2).map(m => m.b + m.resto.slice(0, 30)).join(' | ')}`);
    const idiomas = x.filter(c => c.id === 'idiomas' && c.resto && !/^La oferta/.test(c.resto));
    chk(idiomas.every(c => !/^Idiomas/.test(c.resto)), `${hash}: los ${idiomas.length} textos de idiomas empiezan por el idioma, no por «Idiomas:»`);
    const filas = await pg.$$eval(raiz + ' .motivo', ms => ms.map(m => m.textContent.replace(/\s+/g, ' ')));
    chk(filas.every(f => !/Idiomas · (Revisar|No coincide|Cumple) Idiomas/.test(f)), `${hash}: ni en la línea de la fila`);
  }
  await ctx.close();
}

console.log('14. v29: cada criterio tiene un solo nombre, en la fila y en el detalle');
{
  const { pg, ctx } = await entrar();
  const abreviado = t => (t === 'Permiso de trabajo' ? 'permiso' : t.toLowerCase());
  let comprobadas = 0, tipoFilas = 0;
  for (const [hash, raiz] of [['#/oferta/O004', '#match-alumnos'], ['#/oferta/O005', '#match-alumnos'], ['#/oferta/O006', '#match-alumnos'], ['#/alumno/A001', '#match-ofertas'], ['#/alumno/A010', '#match-ofertas']]) {
    await ir(pg, hash, raiz + ' .grupo-match'); await abrirTodo(pg);
    const filas = await pg.$$eval(raiz + ' li.fila-match', ls => ls.map(l => ({
      titulos: Object.fromEntries([...l.querySelectorAll('.crit')].map(c => [c.dataset.criterio, c.querySelector('b').textContent.split(' · ')[0]])),
      linea: l.querySelector('.motivo').textContent.replace(/\s+/g, ' ').trim(), ids: (l.querySelector('.motivo').dataset.criterios || '').split(' ').filter(Boolean), principal: l.querySelector('.motivo').dataset.criterio,
    })));
    const malas = [];
    for (const f of filas) {
      if (f.ids.length > 1) {
        const nombres = f.linea.replace(/^[✗!] No coincide: /, '').replace(/ · ! Revisar: /, ', ').replace(/^! Revisar: /, '').split(', ');
        if (nombres.length !== f.ids.length || !f.ids.every((id, i) => nombres[i] === abreviado(f.titulos[id]))) malas.push(`«${f.linea}» no sale de ${f.ids.map(i => f.titulos[i]).join(', ')}`);
        if (f.ids.includes('tipo')) tipoFilas++;
        comprobadas++;
      } else if (f.principal) {
        const simbolo = (/^[✓!✗?–] /.exec(f.linea) || [''])[0];
        if (!f.linea.startsWith(`${simbolo}${f.titulos[f.principal]} ·`)) malas.push(`«${f.linea}» no empieza por el nombre del detalle «${f.titulos[f.principal]}»`);
      }
    }
    chk(malas.length === 0, `${hash}: el nombre de cada criterio en la fila sale del mismo del detalle (${filas.length} filas) ${malas.slice(0, 2).join(' | ')}`);
    chk(filas.every(f => f.titulos.tipo === 'Prácticas o empleo'), `${hash}: el criterio de tipo se llama «Prácticas o empleo» en el detalle`);
    chk(!/Tipo · (Cumple|Revisar|No coincide|Sin dato|No aplica)/.test(await pg.innerText(raiz)), `${hash}: ni rastro del nombre antiguo «Tipo»`);
  }
  chk(comprobadas >= 5, `se han comparado ${comprobadas} filas con varios fallos (${tipoFilas} con «tipo»)`);
  await ctx.close();
}

await terminar();
