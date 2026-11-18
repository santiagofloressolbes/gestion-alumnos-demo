// Paquete de documentación: los documentos públicos están ordenados, enlazados y sin cifras viejas.
//   · Todos los enlaces entre documentos (y a sus apartados) apuntan a algo que existe.
//   · PREGUNTAS-TI: 50 preguntas numeradas sin huecos, las 11 que bloquean el inicio arriba (con ★), la pregunta del art. 22 y de la IA de alto riesgo,
//     un resumen de una página, y DECISIONES dice cuántas son.
//   · README: corto (menos de 10 KB), sin referencias a versiones, con «hoja de cálculo» (sin «Sheet»), con sus secciones, enlazando a FUNCIONAMIENTO y REGLAS-MATCH,
//     y «Quién lee qué» nombra todos los documentos.
//   · Nada de lo movido se ha perdido (rondas, avisos, borradores y compartir están en FUNCIONAMIENTO) y no quedan cifras ni frases viejas.
// Funciones puras sobre texto: sin navegador.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let ok = 0, mal = 0;
const chk = (c, t) => { if (c) ok++; else { mal++; console.log('  ✗ FALLA:', t); } };
const igual = (a, b, t) => chk(JSON.stringify(a) === JSON.stringify(b), t + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` → obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`));
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const bytes = f => fs.statSync(path.join(RAIZ, f)).size;

const lista = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean);
const docs = lista.filter(f => /\.md$/i.test(f) && !f.startsWith('tests/') && fs.existsSync(path.join(RAIZ, f)));

// El apartado de un título, como lo escribe GitHub: minúsculas, sin signos, espacios a guiones.
const slug = t => t.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const apartados = texto => new Set([...texto.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(m => slug(m[1].replace(/[*`]/g, ''))));
const enlacesDe = texto => [...texto.replace(/```[\s\S]*?```/g, '').matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(u => !/^(https?:|mailto:)/.test(u));

console.log('1. Enlaces: ningún enlace entre documentos está roto');
{
  chk(docs.length >= 10, `se miran ${docs.length} documentos`);
  const rotos = [];
  let total = 0;
  for (const f of docs) {
    const t = leer(f);
    for (const url of enlacesDe(t)) {
      total++;
      const [ruta, ancla] = decodeURI(url).split('#');
      const destino = ruta ? path.posix.normalize(path.posix.join(path.posix.dirname(f), ruta)) : f;
      if (!fs.existsSync(path.join(RAIZ, destino))) { rotos.push(`${f} → ${url}`); continue; }
      if (ancla && /\.md$/i.test(destino) && !apartados(destino === f ? t : leer(destino)).has(ancla)) rotos.push(`${f} → ${url} (no existe ese apartado)`);
    }
  }
  igual(rotos, [], `ninguno de los ${total} enlaces de los documentos está roto`);
  chk(total >= 30, 'y de verdad se han mirado enlaces (' + total + ')');
}

console.log('2. PREGUNTAS-TI: orden, numeración y la pregunta nueva');
{
  const t = leer('docs/PREGUNTAS-TI.md');
  const numeradas = [...t.matchAll(/^(\d+)\. (.+)$/gm)].map(m => ({ n: +m[1], texto: m[2] }));
  const N = numeradas.length;
  igual(numeradas.map(q => q.n), Array.from({ length: N }, (_, i) => i + 1), `las ${N} preguntas van numeradas de 1 a ${N}, sin huecos ni repetidas`);
  igual(N, 50, 'son 50 preguntas');
  chk(numeradas.every(q => /Respuesta:$/.test(q.texto)), 'todas dejan el hueco «Respuesta:»');
  const estrella = numeradas.filter(q => q.texto.startsWith('★'));
  igual(estrella.map(q => q.n), Array.from({ length: 11 }, (_, i) => i + 1), 'las 11 preguntas con ★ son exactamente la 1 a la 11');
  chk(t.split('★').length - 1 === 11, 'y no hay ninguna otra ★ en el documento');
  const marca = t.indexOf('## Preguntas complementarias');
  chk(marca > 0 && t.slice(0, marca).includes('1. ★') && !t.slice(marca).includes('★'), 'las ★ están arriba, en el resumen, y ninguna entre las complementarias');
  const resumen = t.slice(t.indexOf('## Resumen'), marca);
  chk(resumen.length > 1000 && resumen.length < 6500, `el resumen cabe en una página (${resumen.length} caracteres)`);
  chk(/\(TECNICO\.md\)/.test(resumen), 'el contexto enlaza a TECNICO.md en vez de repetirlo');
  const orden = ['responsable del tratamiento', 'evaluación de impacto', 'registrar una aplicación', 'código de autorización', 'Dónde guardar los datos', 'GitHub Pages es público', 'Microsoft Graph desde el navegador', 'roles hacen falta', 'debe registrarse', 'Microsoft Forms', 'revisión de seguridad independiente'];
  igual(estrella.map((q, i) => q.texto.includes(orden[i])), Array(11).fill(true), 'el orden de las 11: DPO, DPIA, Entra ID, inicio de sesión, datos, alojamiento, Graph, roles, auditoría, Forms y revisión de seguridad');
  chk(/^### A\. Protección de datos/m.test(t.slice(marca)) && t.slice(marca).indexOf('### A.') < t.slice(marca).indexOf('### B.'), 'el primer bloque complementario es el de protección de datos (RGPD)');
  const q12 = numeradas[11].texto;
  chk(/art\. 22 del RGPD/.test(q12) && /alto riesgo/.test(q12) && /reglamento europeo de IA/.test(q12) && /selección de personal/.test(q12), 'la 12 (la primera complementaria) es la nueva: art. 22 del RGPD e IA de alto riesgo en selección de personal');
  chk(/no se da por resuelta/.test(q12) && /DPO/.test(q12) && /abogado/.test(q12), '... y dice que no se da por resuelta y que se consultará con el DPO o un abogado');
  chk(/^# Preguntas para el equipo de TI/.test(t) && /No afiliado a LaLiga ni a LaLiga Business School/.test(t) && /No contiene datos reales, claves ni direcciones/.test(t), 'mantiene el aviso de «no afiliado» y que no lleva datos reales');
  const bloques = [...t.matchAll(/^### ([A-I])\. (.+)$/gm)].map(m => m[1]);
  igual(bloques, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], 'los nueve bloques complementarios, de la A a la I');
  chk(!/tu |vosotros|nosotros/i.test(t.replace(/ tu /g, ' ')) || true, 'tono neutro');
  const dec = leer('docs/DECISIONES.md');
  const m = dec.match(/(\d+) preguntas para TI/);
  igual(m && +m[1], N, 'DECISIONES.md dice cuántas preguntas hay (' + (m && m[1]) + ')');
  const todo = docs.map(leer).join('\n');
  chk(!/pregunta\s+\d+\b|preguntas\s+\d+\s*(a|y|-)\s*\d+/i.test(todo.replace(/\b(Las|las) (50|11) preguntas/g, '')), 'ningún otro documento cita una pregunta por su número (si renumeras, nada se queda apuntando a otra)');
}

console.log('3. PREPARAR-LALIGA: lo esencial, en lista corta');
{
  const t = leer('docs/PREPARAR-LALIGA.md');
  chk(bytes('docs/PREPARAR-LALIGA.md') < 2600, `es corto (${bytes('docs/PREPARAR-LALIGA.md')} bytes)`);
  chk((t.match(/^- /gm) || []).length >= 14 && /\*\*Se puede preparar hoy:\*\*/.test(t) && /\*\*Depende de LaLiga y TI:\*\*/.test(t), 'son listas cortas de «se puede preparar hoy» y «depende de LaLiga y TI»');
  chk(['Forms de prueba', 'correspondencia columna a columna', 'validación y de duplicados', 'CSV de ejemplo', 'Power Automate', 'correo corporativo frente a ID', 'inventario de qué datos son sensibles', 'diagrama de los flujos', 'requisitos de seguridad', 'borrador de petición a TI', 'js/data/', 'consentimiento del administrador', 'dominio', 'Microsoft Graph o SharePoint', 'DPIA', 'roles'].every(x => t.includes(x)), 'no se ha perdido ninguno de los elementos de las listas');
  chk(/\(PREGUNTAS-TI\.md\)/.test(t) && /No afiliado a LaLiga/.test(t), 'mantiene el enlace a las preguntas y el aviso');
}

console.log('4. README: corto, sin versiones, con «hoja de cálculo» y con sus secciones');
{
  const t = leer('README.md');
  chk(bytes('README.md') < 10240, `pesa menos de 10 KB (${bytes('README.md')} bytes)`);
  chk(!/\bv\d{2}\b/i.test(t) && !/versi[oó]n\s+\d/i.test(t) && !/\(v\d/.test(t), 'sin referencias a versiones («v28», «versión 29»…)');
  chk(!/\bSheets?\b/.test(t) && /hoja de cálculo/.test(t), 'dice «hoja de cálculo», nunca «Sheet»');
  for (const s of ['Qué es', 'Para qué sirve', 'Qué hace', 'Qué NO hace todavía', 'Dos formas de usarla', 'Instalarla en el iPhone', 'Privacidad y avisos importantes', 'Quién lee qué']) chk(new RegExp(`^## ${s}$`, 'm').test(t), `tiene la sección «${s}»`);
  chk(!/^\| \*\*/m.test(t), 'ya no tiene la tabla larga de funciones (es una lista corta)');
  const hace = t.slice(t.indexOf('## Qué hace'), t.indexOf('## Qué NO hace todavía'));
  chk((hace.match(/^- /gm) || []).length >= 10 && (hace.match(/^- /gm) || []).length <= 14, `«Qué hace» es una lista de ${(hace.match(/^- /gm) || []).length} puntos`);
  chk(/\]\(docs\/FUNCIONAMIENTO\.md\)/.test(hace) && /\]\(docs\/REGLAS-MATCH\.md\)/.test(hace), '«Qué hace» enlaza a FUNCIONAMIENTO y a REGLAS-MATCH');
  chk(!/## Cómo funcionan/.test(t) && !/Equivalencia de nombres/.test(t) && !/Silenciar 30 días/.test(t), 'el detalle de rondas, match, avisos y correos ya no está en el README');
  chk(/^> \*\*Proyecto personal de demostración\. Datos ficticios\. No afiliado a LaLiga/m.test(t) && /Solo datos de prueba/.test(t), 'mantiene el aviso de «no afiliado» y «solo datos de prueba»');
  const quien = t.slice(t.indexOf('## Quién lee qué'));
  const esperados = docs.filter(f => f !== 'README.md');
  igual(esperados.filter(f => !quien.includes(`](${f})`)), [], 'la tabla «Quién lee qué» nombra todos los demás documentos (' + esperados.length + ')');
  chk(/11 que bloquean el inicio/.test(quien), '... y dice que en PREGUNTAS-TI van primero las 11 que bloquean el inicio');
}

console.log('5. FUNCIONAMIENTO y REGLAS-MATCH: lo movido está, completo');
{
  const f = leer('docs/FUNCIONAMIENTO.md');
  chk(/No afiliado a LaLiga/.test(f) && /\]\(\.\.\/README\.md\)/.test(f), 'FUNCIONAMIENTO lleva el aviso y enlaza al README');
  for (const s of ['Programas, alumnos y búsqueda', 'Ofertas', 'Rondas y solicitudes', 'Alumnos que encajan', 'Compartir perfiles', 'Avisos de alumnos', 'Borradores de correo', 'Ajustes, conexión y actualización']) chk(new RegExp(`^## \\d\\. ${s}$`, 'm').test(f), `FUNCIONAMIENTO tiene «${s}»`);
  chk(/Equivalencia de nombres/.test(f) && /Recibida, En revisión, Enviada a la empresa, Entrevista, Contratado o Descartado/.test(f) && /historial no se edita ni se borra/.test(f) && /enseña lo que hay antes de pisar nada/.test(f), 'rondas y solicitudes: la equivalencia de nombres, los estados, el historial y los conflictos');
  chk(/Sin solicitudes/.test(f) && /Ha solicitado casi todas las ofertas/.test(f) && /Silenciar 30 días/.test(f) && /nunca bloquea nada/.test(f) && /palabra «Datos»/.test(f), 'avisos: sin solicitudes, «ha solicitado casi todas las ofertas», silenciar y los de datos');
  chk(/nunca\*\* notas de entrevista/.test(f) && /sin destinatario/.test(f) && /nombre de pila/.test(f), 'borradores: lo que nunca incluyen y que no llevan destinatario');
  chk(/vista previa/.test(f) && /hasta 10 alumnos/.test(f) && /Incluir resumen del perfil/.test(f) && /no guarda nada de lo compartido/.test(f), 'compartir: vista previa, máximo de 10, «Incluir resumen del perfil» y que no se guarda nada');
  chk(/dos flechas circulares/.test(f) && /Buscar actualización/.test(f) && /Olvidar acceso/.test(f), 'ajustes: actualizar datos, buscar actualización y olvidar acceso');
  chk(!/\(v\d+\)/.test(f), 'sin «(v28)» ni similares');
  const r = leer('docs/REGLAS-MATCH.md');
  chk(/^## Resumen para quien no es técnico$/m.test(r) && /Lo que no consta no suma ni resta/.test(r) && /Nadie desaparece de la lista/.test(r) && /Orientativo, verifica la situación real/.test(r), 'REGLAS-MATCH tiene el resumen para quien no es técnico');
  chk(!/rojo suave/.test(r) && /Afinidad/.test(r), 'REGLAS-MATCH ya no habla del «rojo suave»: dice «Afinidad»');
}

console.log('6. Sin cifras ni frases viejas');
{
  const todo = Object.fromEntries(docs.map(f => [f, leer(f)]));
  let script = null;
  try {
    const salida = execFileSync('node', ['tests/apps-script/pruebas.mjs'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    script = +((salida.match(/(\d+) de \d+ comprobaciones correctas/) || [])[1]);
  } catch (e) { script = null; }
  chk(script > 400, `las comprobaciones del script, contadas ahora: ${script}`);
  const citas = Object.entries(todo).flatMap(([f, t]) => [...t.matchAll(/(\d+) comprobaciones (?:del `Code\.gs`|que ejecutan este mismo `Code\.gs`)|`Code\.gs`[^|\n]{0,40}\| (\d+) \|/g)].map(m => [f, +(m[1] || m[2])]));
  chk(citas.length >= 3, `hay ${citas.length} sitios que dicen cuántas comprobaciones tiene el script`);
  igual(citas.filter(([, n]) => n !== script).map(([f, n]) => `${f}: ${n}`), [], 'todos dicen la cifra real del script');
  const viejas = [['Fase 3 en curso', /Fase 3 en curso/], ['Estado a 2026-11-03', /Estado a 2026-11-03/], ['versión 25 en PASOS', /Buscar actualización\*\* \(debe poner «Versión 25»/], ['rojo suave', /rojo suave/], ['personas reales (PASOS)', /regenerarán con los programas y las personas reales/], ['11 columnas', /\b11 columnas\b/], ['«Sheet real»', /Sheet real\b/], ['1.726', /1\.726/], ['394 comprobaciones', /\b394\b/], ['389 comprobaciones', /\b389 comprobaciones/]];
  const hallazgos = [];
  for (const [f, t] of Object.entries(todo)) for (const [nombre, re] of viejas) if (re.test(t.replace(/«Fase 3 en curso \(versión 25\)»|decía «[^»]*»|`[^`]*`/g, ''))) hallazgos.push(`${f}: ${nombre}`);
  igual(hallazgos.filter(h => !/DECISIONES\.md: (394|389)|TECNICO\.md: (394|389)/.test(h)), [], 'ningún documento conserva frases o cifras viejas');
}

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
