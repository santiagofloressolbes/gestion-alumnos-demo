// Pruebas del perfil del puesto (3E-2) en el formulario de ofertas: ofertas con y sin perfil, hojas de apoyo que faltan,
// script antiguo, avisos de lo que no está en las listas, nacionalidad con «Unión Europea (UE/EEE)» y una oferta creada
// desde la app que luego aparece bien en el match.
import { nuevo, chk, terminar, BASE, URL_OK, CLAVE_PRUEBA } from './ayudas.mjs';

async function entrar({ ajustar, alResponder } = {}) {
  const t = await nuevo();
  if (ajustar) ajustar(t.mundo);
  if (alResponder) t.ctrl.alResponder = alResponder;
  await t.pg.addInitScript(([u, c]) => {
    if (sessionStorage.getItem('ini')) return;
    localStorage.setItem('gad.url', u); localStorage.setItem('gad.clave', c);
    sessionStorage.setItem('ini', '1');
  }, [URL_OK, CLAVE_PRUEBA]);
  t.pg.on('dialog', d => d.accept());
  return t;
}
const nueva = async pg => { await pg.goto(BASE + '#/oferta/nueva'); await pg.waitForSelector('#of-f-empresa'); };
const editar = async (pg, id) => { await pg.goto(BASE + `#/oferta/${id}/editar`); await pg.waitForSelector('#of-f-empresa'); };
const peticiones = log => log.peticiones.map(p => JSON.parse(p.cuerpo)).filter(c => c.action === 'guardarOferta');
const BASICA = { empresa: 'Club mock Z', titulo: 'Analista de producto', tipoOrganizacion: 'Liga', area: 'Producto y tecnología', tipo: 'Empleo', ubicacion: 'Madrid', requisitoPermiso: 'No requerido', estado: 'Abierta' };
async function rellenar(pg, v) {
  for (const [k, x] of Object.entries(v)) {
    const sel = '#of-f-' + k;
    if (await pg.evaluate(s => document.querySelector(s).tagName === 'SELECT', sel)) await pg.selectOption(sel, x); else await pg.fill(sel, x);
  }
}
const marcarEtiquetas = async (pg, nombres) => { for (const n of nombres) await pg.check(`#of-f-etiquetas input[value="${n}"]`); };
const guardar = pg => pg.click('#v-oferta-form button[type=submit]');
const fila = (m, id) => { const h = m.hojas.Ofertas.m; const i = h.findIndex(f => f[0] === id); return i < 0 ? null : Object.fromEntries(h[0].map((c, k) => [c, h[i][k]])); };
const quitarSoporte = (j) => { if (Array.isArray(j.soporta)) j.soporta = j.soporta.filter(x => x !== 'perfilOferta'); return j; };

/* 1. Alta con perfil completo y aparece bien en el match */
{
  console.log('1. Alta con perfil y match');
  const { pg, ctx, mundo, log } = await entrar();
  await nueva(pg);
  chk(/Perfil del puesto/.test(await pg.innerText('#v-oferta-form')), 'hay un bloque «Perfil del puesto»');
  const opc = id => pg.$$eval(`#of-f-${id} option`, os => os.map(o => o.textContent));
  const pais = await opc('paisOferta');
  chk(pais.includes('España') && !pais.includes('Unión Europea (UE/EEE)'), 'País de la oferta: lista de la hoja Países, sin las filas de grupo');
  const nac = await opc('requisitoNacionalidad');
  chk(nac[1] === 'Unión Europea (UE/EEE)' && nac.includes('México') && nac.includes('Francia'), 'Requisito de nacionalidad: primero la fila de grupo y luego los países de Países ∪ Listas: ' + nac.slice(0, 3));
  chk(new Set(nac).size === nac.length, '... sin repetidos');
  chk((await pg.$$eval('#of-f-subarea optgroup', gs => gs.map(g => g.label))).includes('Producto y tecnología'), 'Subárea: agrupada por área (hoja Áreas)');
  chk((await opc('nivelFormacion')).join() === 'Sin indicar,Sin requisito,Grado,Máster,Doctorado', 'Nivel de formación: lista fija');
  chk((await pg.$$eval('#of-f-etiquetas input[type=checkbox]', xs => xs.length)) >= 20 && await pg.isVisible('#of-f-etiquetas legend'), 'Etiquetas: casillas con la lista de la hoja Etiquetas');
  await rellenar(pg, { ...BASICA, requisitoNacionalidad: 'Unión Europea (UE/EEE)', paisOferta: 'España', subarea: 'Producto digital', idiomas: 'Inglés B2', nivelFormacion: 'Grado' });
  await marcarEtiquetas(pg, ['Scrum', 'Excel']);
  chk(await pg.$eval('#of-f-etiquetas', e => e.value) === 'Excel; Scrum', 'las etiquetas marcadas se leen como «A; B»');
  chk(await pg.$$eval('#v-oferta-form .cuenta.exceso:not([hidden])', xs => xs.length) === 0, 'todo de la lista: sin avisos');
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  const p = peticiones(log);
  chk(p.length === 1 && Object.keys(p[0].oferta).length === 16 && p[0].oferta.nivelFormacion === 'Grado', 'la petición lleva los 16 campos');
  const f = fila(mundo, 'O011');
  chk(f && f['País de la oferta'] === 'España' && f['Subárea'] === 'Producto digital' && f.Etiquetas === 'Excel; Scrum' && f.Idiomas === 'Inglés B2' && f['Nivel de formación'] === 'Grado' && f['Requisito de nacionalidad'] === 'Unión Europea (UE/EEE)', 'el Sheet tiene la fila con los 16 valores');
  // la oferta recién creada, en el match (sin recargar y recargando)
  for (const recargar of [false, true]) {
    if (recargar) await pg.reload();
    await pg.goto(BASE + '#/oferta/O011'); await pg.waitForSelector('#match-alumnos .grupo-match');
    await pg.evaluate(() => { for (const d of document.querySelectorAll('#match-alumnos .grupo-match, #match-alumnos .porque')) d.open = true; });
    for (let i = 0; i < 20; i++) { const b = await pg.$('#match-alumnos .grupo-match > button:not([hidden])'); if (!b) break; await b.click(); }
    const a1 = await pg.$$eval('#match-alumnos li.fila-match', ls => ls.filter(l => l.innerText.includes('Lucía Quintero')).map(l => [...l.querySelectorAll('.criterios li')].map(c => c.textContent.replace(/\s+/g, ' ').trim()))[0]);
    const txt = (a1 || []).join(' | ');
    chk(a1 && /etiquetas/i.test(txt) && /Tiene las 2 etiquetas/.test(txt), `match (${recargar ? 'tras recargar' : 'sin recargar'}): las etiquetas de la oferta nueva se comparan con las de la alumna`);
    chk(/Inglés B2: tiene C1/.test(txt) && /llega a ese nivel/.test(txt), '... y los idiomas y el nivel de formación');
    chk(/Subárea|subárea/.test(txt) && !/no consta/i.test(txt.split('|').filter(x => /subárea|Subárea/.test(x)).join('')), '... y la subárea');
  }
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 2. Alta sin perfil y edición que no toca el perfil */
{
  console.log('2. Sin perfil, y editar sin tocar el perfil');
  const { pg, ctx, mundo, log } = await entrar();
  await nueva(pg);
  await rellenar(pg, BASICA);
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  const f = fila(mundo, 'O011');
  chk(f && f['País de la oferta'] === '' && f.Etiquetas === '' && f.Idiomas === '' && f['Nivel de formación'] === '', 'oferta sin perfil: se guarda con el perfil vacío');
  await pg.goto(BASE + '#/oferta/O011'); await pg.waitForSelector('#match-alumnos .grupo-match');
  chk(true, 'la oferta sin perfil abre su match sin romperse');
  // O001 trae perfil: cambiar solo el título escribe UNA celda
  await editar(pg, 'O001');
  chk(await pg.inputValue('#of-f-paisOferta') === 'España' && await pg.inputValue('#of-f-subarea') === 'Antipiratería digital' && await pg.inputValue('#of-f-idiomas') === 'Inglés B2' && await pg.inputValue('#of-f-nivelFormacion') === 'Grado', 'al editar, el perfil sale relleno');
  chk(await pg.$$eval('#of-f-etiquetas input:checked', xs => xs.map(x => x.value).join('; ')) === 'Investigación digital; Python', 'y sus etiquetas marcadas');
  const antes = mundo.foto();
  await pg.fill('#of-f-titulo', 'Analista de antipiratería (nuevo)');
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(mundo.celdasCambiadas(antes, mundo.foto()).length === 1, 'cambiar solo el título escribe UNA celda: ' + mundo.celdasCambiadas(antes, mundo.foto()));
  // marcar una etiqueta más: solo cambia esa celda
  await editar(pg, 'O001');
  const antes2 = mundo.foto();
  await marcarEtiquetas(pg, ['Excel']);
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(fila(mundo, 'O001').Etiquetas === 'Investigación digital; Python; Excel' && mundo.celdasCambiadas(antes2, mundo.foto()).length === 1, 'añadir una etiqueta: se guarda detrás de las que había y cambia UNA celda');
  // sin tocar nada: no hay petición
  await editar(pg, 'O002');
  const n = peticiones(log).length;
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(peticiones(log).length === n, 'sin cambios (con perfil): no se envía nada');
  await ctx.close();
}

/* 3. Avisos y errores de lo que no está en la lista */
{
  console.log('3. Avisos');
  const { pg, ctx, mundo, log } = await entrar({ ajustar: m => {
    const c = m.hojas.Ofertas.m[0];
    m.hojas.Ofertas.m[1][c.indexOf('País de la oferta')] = 'Narnia';
    m.hojas.Ofertas.m[1][c.indexOf('Etiquetas')] = 'Python; Etiqueta antigua';
    m.hojas.Ofertas.m[1][c.indexOf('Subárea')] = 'Venta de patrocinios';   // es de Comercial y patrocinio, no de Antipiratería
  } });
  await editar(pg, 'O001');
  const avisos = await pg.$$eval('#v-oferta-form .cuenta.exceso:not([hidden])', xs => xs.map(x => x.textContent));
  chk(avisos.some(t => /«Narnia» no está en la hoja Países/.test(t)), 'aviso: país que no está en la hoja Países');
  chk(avisos.some(t => /«Etiqueta antigua» no está en la hoja Etiquetas/.test(t)), 'aviso: etiqueta que no está en la hoja Etiquetas');
  chk(avisos.some(t => /es de «Comercial y patrocinio», no de «Antipiratería y seguridad»/.test(t)), 'aviso: subárea de otra área');
  chk(await pg.$eval('#of-f-paisOferta', s => [...s.options].some(o => /Narnia \(no está en la lista\)/.test(o.textContent))), 'el valor antiguo se sigue viendo en el desplegable');
  chk(await pg.$eval('#v-oferta-form', f => /Etiqueta antigua \(no está en la lista\)/.test(f.innerText)), 'y la etiqueta antigua, marcada y avisada');
  // editar otra cosa: el script no rechaza lo que no se toca
  const antes = mundo.foto();
  await pg.fill('#of-f-titulo', 'Otro título'); await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(mundo.celdasCambiadas(antes, mundo.foto()).length === 1 && fila(mundo, 'O001')['País de la oferta'] === 'Narnia', 'un valor antiguo que no se toca no impide guardar y no se reescribe');
  // y ahora un cambio que sí hay que hacer bien
  await editar(pg, 'O001');
  await pg.fill('#of-f-titulo', 'Tercer título'); await pg.uncheck('#of-f-etiquetas input[value="Python"]');
  const antes3 = mundo.foto();
  await guardar(pg); await pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/Etiquetas.*no está en la hoja Etiquetas/.test(await pg.innerText('#v-oferta-form .error')) && mundo.celdasCambiadas(antes3, mundo.foto()).length === 0, 'si CAMBIAS las etiquetas, la antigua sí se rechaza (con un mensaje claro) y no se escribe nada');
  await pg.uncheck('#of-f-etiquetas input[value="Etiqueta antigua"]'); await pg.check('#of-f-etiquetas input[value="Excel"]');
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera:not([hidden])');
  chk(fila(mundo, 'O001').Etiquetas === 'Excel', 'quitando la antigua, guarda: ' + fila(mundo, 'O001').Etiquetas);
  await ctx.close();
}
{
  console.log('3b. Errores en el móvil (no se envía nada)');
  const { pg, ctx, log } = await entrar();
  await nueva(pg);
  await rellenar(pg, { ...BASICA, idiomas: 'Inglés Z9' });
  await guardar(pg);
  chk(/Idiomas.*A1–C2 o nativo/.test(await pg.innerText('#v-oferta-form .error')) && peticiones(log).length === 0, 'idiomas con formato malo: mensaje claro y no se envía');
  await pg.fill('#of-f-idiomas', 'Inglés B2; Inglés C1'); await guardar(pg);
  chk(/No repitas un idioma/.test(await pg.innerText('#v-oferta-form .error')) && peticiones(log).length === 0, 'idioma repetido: mensaje y no se envía');
  await pg.fill('#of-f-idiomas', ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(x => 'Idioma' + x).join('; ')); await guardar(pg);
  chk(/máximo 6 idiomas/.test(await pg.innerText('#v-oferta-form .error')), 'más de 6 idiomas');
  await pg.fill('#of-f-idiomas', 'Inglés B2');
  const todas = await pg.$$eval('#of-f-etiquetas input', xs => xs.map(x => x.value));
  for (const e of todas.slice(0, 9)) await pg.check(`#of-f-etiquetas input[value="${e}"]`);
  await guardar(pg);
  chk(/máximo 8 etiquetas/.test(await pg.innerText('#v-oferta-form .error')) && peticiones(log).length === 0, 'más de 8 etiquetas: mensaje y no se envía');
  await ctx.close();
}

/* 4. Hojas de apoyo ausentes: campos de texto */
{
  console.log('4. Sin hojas de apoyo');
  const { pg, ctx, mundo, log } = await entrar({ ajustar: m => { delete m.hojas['Países']; delete m.hojas['Áreas']; delete m.hojas.Etiquetas; } });
  await nueva(pg);
  const tipos = await pg.$$eval('#of-f-paisOferta,#of-f-subarea,#of-f-etiquetas', xs => xs.map(x => x.tagName));
  chk(tipos.join() === 'INPUT,INPUT,INPUT', 'país, subárea y etiquetas son campos de texto: ' + tipos);
  chk(/no hay hoja Etiquetas/.test(await pg.innerText('#v-oferta-form')), 'con una pista de que falta la hoja');
  const nac = await pg.$$eval('#of-f-requisitoNacionalidad option', os => os.map(o => o.textContent));
  chk(nac.includes('Francia') && nac.includes('Unión Europea (UE/EEE)'), 'la nacionalidad sigue saliendo de Listas');
  await rellenar(pg, { ...BASICA, paisOferta: 'España', subarea: 'Lo que sea', etiquetas: 'Una; Otra', idiomas: 'Inglés B2', nivelFormacion: 'Máster' });
  await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  const f = fila(mundo, 'O011');
  chk(f && f.Etiquetas === 'Una; Otra' && f['Subárea'] === 'Lo que sea' && f['Nivel de formación'] === 'Máster', 'se guarda como texto');
  chk(log.consola.length === 0, 'sin errores de consola: ' + log.consola.join(' | '));
  await ctx.close();
}

/* 5. Script anterior (no anuncia perfilOferta) */
{
  console.log('5. Script anterior');
  const { pg, ctx, mundo, log } = await entrar({ alResponder: quitarSoporte });
  await nueva(pg);
  chk(await pg.isVisible('#of-sin-perfil') && /no se puede guardar todavía/.test(await pg.innerText('#of-sin-perfil')), 'avisa de que hay que actualizar el script');
  chk(!(await pg.$('#of-f-paisOferta')) && !(await pg.$('#of-f-etiquetas')) && !(await pg.$('.sub-seccion')), 'no se enseñan los campos del perfil');
  await rellenar(pg, BASICA); await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  const p = peticiones(log);
  chk(p.length === 1 && Object.keys(p[0].oferta).length === 11, 'la petición lleva solo los 11 campos de siempre');
  chk(fila(mundo, 'O011')?.Empresa === 'Club mock Z', 'se guarda la oferta');
  // editar una con perfil: no se toca el perfil, ni en el Sheet ni en la pantalla
  await editar(pg, 'O001');
  const antes = mundo.foto();
  await pg.fill('#of-f-titulo', 'Cambio con script antiguo'); await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(mundo.celdasCambiadas(antes, mundo.foto()).length === 1 && fila(mundo, 'O001').Etiquetas === 'Investigación digital; Python', 'el perfil que ya tenía no se toca');
  await pg.goto(BASE + '#/oferta/O001'); await pg.waitForSelector('#match-alumnos .grupo-match');   // solo cambia el # : la app sigue en memoria, sin recargar
  await pg.evaluate(() => { for (const d of document.querySelectorAll('#match-alumnos .grupo-match, #match-alumnos .porque')) d.open = true; });
  for (let i = 0; i < 20; i++) { const b = await pg.$('#match-alumnos .grupo-match > button:not([hidden])'); if (!b) break; await b.click(); }
  const crit = await pg.$$eval('#match-alumnos li.fila-match .criterios li', cs => cs.map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '));
  chk(!/La oferta no pide etiquetas/.test(crit) && !/La oferta no pide idiomas/.test(crit), 'tras guardar con el script anterior, el match (sin recargar) sigue viendo las etiquetas y los idiomas de la oferta: no se borraron en memoria');
  await ctx.close();
}

/* 6. Faltan las columnas del perfil en el Sheet */
{
  console.log('6. Sin las columnas del perfil');
  const { pg, ctx, mundo } = await entrar({ ajustar: m => { m.hojas.Ofertas.m.forEach(f => { f.length = 12; }); } });
  await nueva(pg);
  await rellenar(pg, BASICA); await guardar(pg); await pg.waitForSelector('#v-oferta .cabecera');
  chk(fila(mundo, 'O011')?.Empresa === 'Club mock Z', 'sin las 5 columnas y con el perfil vacío: se guarda igual');
  await nueva(pg);
  await rellenar(pg, { ...BASICA, idiomas: 'Inglés B2' }); await guardar(pg);
  await pg.waitForSelector('#v-oferta-form .error:not([hidden])');
  chk(/columna/i.test(await pg.innerText('#v-oferta-form .error')), 'con perfil que guardar: dice que falta la columna: ' + await pg.innerText('#v-oferta-form .error'));
  await ctx.close();
}

await terminar();
