// Simulador de los servicios de Google (hoja, propiedades, bloqueo...) para probar docs/apps-script/Code.gs
// en el ordenador, sin tocar ningún Sheet real. Ejecuta el MISMO código que se pega en Apps Script.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { leerCSV } from '../../js/util/csv.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
// CODE_GS permite probar una copia modificada (para comprobar que las pruebas detectan fallos).
export const CODIGO = process.env.CODE_GS ? fs.readFileSync(process.env.CODE_GS, 'utf8') : leer('docs/apps-script/Code.gs');
export const CLAVE_PRUEBA = 'frase larga de prueba solo para el simulador 4821';

class Hoja {
  constructor(nombre, matriz, registro) { this.nombre = nombre; this.m = matriz; this.reg = registro; this.formatos = new Map(); }
  getName() { return this.nombre; }
  getLastRow() { return this.m.length; }
  getDataRange() { return { getValues: () => { if (this.rompe) throw new Error('fallo interno simulado: detalle privado'); return this.m.map(f => f.slice()); } }; }
  getRange(r, c) {
    const hoja = this, k = `${r},${c}`;
    const rango = {
      setNumberFormat(f) { hoja.formatos.set(k, f); hoja.reg.escrituras.push({ hoja: hoja.nombre, fila: r, col: c, tipo: 'formato', valor: f }); return rango; },
      setValue(v) {
        // Fallo simulado: la escritura número (restantes + 1) a partir de ahora falla una sola vez (para probar que no queda nada a medias).
        if (hoja.reg.restantes != null) { if (hoja.reg.restantes === 0) { hoja.reg.restantes = null; throw new Error('fallo de escritura simulado'); } hoja.reg.restantes--; }
        hoja.reg.escrituras.push({ hoja: hoja.nombre, fila: r, col: c, tipo: 'valor', valor: v });
        // Si Google recibe "=..." en una celda que no es de texto plano, lo evaluaría como fórmula.
        if (typeof v === 'string' && /^[=+\-@]/.test(v) && hoja.formatos.get(k) !== '@') hoja.reg.formulas.push({ hoja: hoja.nombre, fila: r, col: c, valor: v });
        while (hoja.m.length < r) hoja.m.push([]);
        hoja.m[r - 1][c - 1] = v;
        return rango;
      },
      getValue: () => (hoja.m[r - 1] || [])[c - 1],
    };
    return rango;
  }
}

// Crea un "Google" nuevo con las hojas de datos-mock/. `ajustar(hojas)` permite estropear algo a propósito.
export function crearMundo({ clave = CLAVE_PRUEBA, ajustar, bloqueoOcupado = false, sinClave = false } = {}) {
  const registro = { escrituras: [], formulas: [], errores: [], respuestas: [] };
  const hojas = {};
  for (const n of ['Alumnos', 'Ofertas', 'Listas', 'Rondas', 'Aplicaciones', 'Historial']) hojas[n] = new Hoja(n, leerCSV(leer(`datos-mock/${n}.csv`)), registro);
  const col = hojas.Alumnos.m[0].indexOf('Fecha última entrevista');
  hojas.Alumnos.m[1][col] = new Date(Date.UTC(2026, 9, 20));   // A001: una fecha que Google guarda como fecha de verdad
  ajustar?.(hojas);

  const props = new Map(sinClave || clave == null ? [] : [['CLAVE', clave]]);
  const reloj = { t: Date.parse('2026-10-31T10:00:00Z') };
  const salida = txt => ({ txt, setMimeType() { return this; }, getContent: () => txt });
  const sandbox = {
    console: { log() {}, error: (...a) => registro.errores.push(a.join(' ')) },
    SpreadsheetApp: { getActive: () => ({ getSheetByName: n => hojas[n] || null }), flush() {} },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (props.has(k) ? props.get(k) : null),
      setProperty: (k, v) => { props.set(k, String(v)); },
      deleteProperty: k => { props.delete(k); },
    }) },
    LockService: { getScriptLock: () => ({ waitLock() { if (bloqueoOcupado) throw new Error('Lock timeout'); }, releaseLock() {} }) },
    ContentService: { createTextOutput: salida, MimeType: { JSON: 'JSON' } },
    Session: { getScriptTimeZone: () => 'Europe/Madrid' },
    Utilities: { formatDate: (d, tz) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(d) },   // AAAA-MM-DD
  };
  vm.createContext(sandbox);
  vm.runInContext(CODIGO, sandbox, { filename: 'Code.gs' });
  sandbox.ahora = () => new Date(reloj.t);   // reloj controlado por las pruebas

  const llamar = cuerpo => {
    const contenido = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
    const salidaWeb = sandbox.doPost({ postData: { contents: contenido, type: 'text/plain' } });
    registro.respuestas.push(salidaWeb.getContent());
    return JSON.parse(salidaWeb.getContent());
  };
  const foto = () => JSON.stringify(Object.fromEntries(Object.entries(hojas).map(([n, h]) => [n, h.m])));
  const celdasCambiadas = (antes, despues) => {
    const a = JSON.parse(antes), d = JSON.parse(despues), out = [];
    for (const n of Object.keys(d)) for (let r = 0; r < Math.max(a[n].length, d[n].length); r++) for (let c = 0; c < Math.max((a[n][r] || []).length, (d[n][r] || []).length); c++)
      if (JSON.stringify((a[n][r] || [])[c]) !== JSON.stringify((d[n][r] || [])[c])) out.push(`${n}!${r + 1},${c + 1}`);
    return out;
  };
  const fallarEscritura = k => { registro.restantes = k; };
  return { llamar, hojas, props, reloj, registro, sandbox, foto, celdasCambiadas, fallarEscritura, clave };
}
