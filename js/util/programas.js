// Programas agrupados por categoría (funciones puras). La lista y la categoría de cada programa viven en la hoja Listas del Sheet.
// Entrada: lo que devuelve getMasters(): [{ nombre, categoria, idioma, enLista, alumnos }].
// Salida: grupos en el orden en que aparece cada categoría en Listas; todos los programas de Listas salen aunque tengan 0 alumnos.
// Los que no tienen categoría o no están en Listas van a un último grupo (otros: true) para que la app no falle y se vea el problema.

export const TITULO_OTROS = 'Otros programas';

export function agruparProgramas(programas) {
  const grupos = [];
  const otros = { categoria: TITULO_OTROS, otros: true, programas: [], alumnos: 0 };
  for (const p of programas) {
    if (!p.enLista || !p.categoria) { otros.programas.push(p); continue; }
    let g = grupos.find(x => x.categoria === p.categoria);
    if (!g) grupos.push(g = { categoria: p.categoria, otros: false, programas: [], alumnos: 0 });
    g.programas.push(p);
  }
  if (otros.programas.length) grupos.push(otros);
  for (const g of grupos) g.alumnos = g.programas.reduce((s, p) => s + p.alumnos, 0);
  return grupos;
}
