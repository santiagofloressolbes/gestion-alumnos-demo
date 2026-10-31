// Pestaña Buscar: cuadro de búsqueda y filtros (área, nacionalidad, situación de trabajo) sobre todos los alumnos.
import { getAlumnos, getListas, recargar } from '../data/index.js';
import { el } from '../util/dom.js';
import { filtrar, estadoVacio, filtrosActivos, hayAlgo } from '../util/filtros.js';
import { fila } from './master.js';

const OPCIONES_AREA = [['ambas', 'Cualquiera'], ['destino', 'Quiere ir'], ['experiencia', 'Experiencia']];
let construida = false;   // la pantalla se construye una vez: así se conservan lo escrito, los filtros y el foco

export async function pintarBuscar(raiz) {
  if (construida) return;
  raiz.replaceChildren(el('p', { class: 'estado', role: 'status' }, 'Cargando alumnos…'));
  let alumnos, listas;
  try {
    [alumnos, listas] = await Promise.all([getAlumnos(), getListas()]);
  } catch (e) {
    raiz.replaceChildren(el('div', { class: 'card' },
      el('h2', {}, 'No se han podido cargar los datos'),
      el('p', { class: 'sub' }, e.message),
      el('button', { class: 'primary', type: 'button', onclick: () => { recargar().catch(() => {}); pintarBuscar(raiz); } }, 'Reintentar')));
    return;
  }
  construida = true;

  const e = estadoVacio();
  const unicos = (lista, extra) => [...new Set([...lista, ...extra])].filter(Boolean);
  // Solo se ofrecen valores que algún alumno tiene (más los de la hoja Listas, para el orden).
  const usadas = (campos) => new Set(alumnos.flatMap(a => campos.map(c => a[c])).filter(Boolean));
  const opciones = (lista, campos) => { const u = usadas(campos); return unicos(lista, [...u]).filter(v => u.has(v)); };
  const areas = opciones(listas.areas, ['areaExperiencia', 'areaDestino']);
  const nacionalidades = opciones(listas.nacionalidades, ['nacionalidadPrincipal', 'nacionalidadSecundaria']).sort((a, b) => a.localeCompare(b, 'es'));
  const situaciones = opciones(listas.situaciones, ['situacionTrabajo']);
  const disponibilidades = opciones(listas.disponibilidades, ['disponibilidad']);

  const campoSelect = (id, etiqueta, valores, clave, todas, nombreOpcion = v => v) => {
    const s = el('select', { id, onchange: () => { e[clave] = s.value; pintarResultados(); } },
      el('option', { value: '' }, todas), valores.map(v => el('option', { value: v }, nombreOpcion(v))));
    return el('div', { class: 'campo-form' }, el('label', { for: id }, etiqueta), s);
  };

  const q = el('input', {
    id: 'q', type: 'search', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
    placeholder: 'Nombre, área, país…',
    oninput: () => { e.texto = q.value; pintarResultados(); },
    onkeydown: ev => { if (ev.key === 'Enter') q.blur(); },   // cierra el teclado del móvil
  });

  const botonesArea = OPCIONES_AREA.map(([valor, texto]) => el('button', {
    type: 'button', class: 'opcion', 'aria-pressed': valor === e.areaEn ? 'true' : 'false',
    onclick: () => { e.areaEn = valor; pintarResultados(); },
  }, texto));

  const resumen = el('summary', {});
  const limpiar = el('button', { class: 'secondary', type: 'button', hidden: true, onclick: () => {
    Object.assign(e, estadoVacio()); q.value = ''; for (const s of raiz.querySelectorAll('select')) s.value = ''; pintarResultados();
  } }, 'Quitar búsqueda y filtros');
  const cuenta = el('p', { class: 'estado cuenta', role: 'status', 'aria-live': 'polite' });
  const lista = el('ul', { class: 'alumnos', 'aria-label': 'Resultados' });
  const vacio = el('div', { class: 'card', hidden: true },
    el('h2', {}, 'Ningún alumno coincide'),
    el('p', { class: 'sub' }, 'Prueba con menos palabras o quita algún filtro.'));

  const filtros = el('details', { class: 'filtros' },
    resumen,
    el('div', { class: 'filtros-cuerpo' },
      campoSelect('f-area', 'Área', areas, 'area', 'Todas las áreas'),
      el('div', { class: 'campo-form' },
        el('span', { class: 'etiqueta', id: 'l-area-en' }, 'El área es la que…'),
        el('div', { class: 'opciones', role: 'group', 'aria-labelledby': 'l-area-en' }, botonesArea)),
      campoSelect('f-nac', 'Nacionalidad (principal o secundaria)', nacionalidades, 'nacionalidad', 'Todas las nacionalidades'),
      campoSelect('f-sit', 'Situación de trabajo en España', situaciones, 'situacion', 'Todas las situaciones'),
      campoSelect('f-disp', 'Disponibilidad', disponibilidades, 'disponibilidad', 'Prácticas, empleo o ambas',
        v => (v === 'Ambas' ? 'Ambas (prácticas y empleo)' : `${v} (incluye Ambas)`))));

  function pintarResultados() {
    const res = filtrar(alumnos, e);
    const n = filtrosActivos(e);
    resumen.textContent = n ? `Filtros (${n} activo${n > 1 ? 's' : ''})` : 'Filtros';
    botonesArea.forEach((b, i) => b.setAttribute('aria-pressed', OPCIONES_AREA[i][0] === e.areaEn ? 'true' : 'false'));
    limpiar.hidden = !hayAlgo(e);
    cuenta.textContent = hayAlgo(e) ? `${res.length} de ${alumnos.length} alumnos` : `${alumnos.length} alumnos`;
    vacio.hidden = res.length > 0;
    lista.replaceChildren(...res.map(a => fila(a, 'buscar', true)));
  }

  raiz.replaceChildren(
    el('div', { class: 'card buscador', role: 'search' },
      el('div', { class: 'campo-form' }, el('label', { for: 'q' }, 'Buscar alumno'), q),
      filtros),
    limpiar, cuenta, vacio, lista);
  pintarResultados();
}
