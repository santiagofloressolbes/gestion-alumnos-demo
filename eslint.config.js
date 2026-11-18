// Configuración mínima de ESLint: las reglas recomendadas y nada más.
// La app es JavaScript sin compilar: los globales de cada entorno se declaran aquí a mano (no hay dependencias extra).
import js from '@eslint/js';

const navegador = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly', localStorage: 'readonly',
  sessionStorage: 'readonly', history: 'readonly', fetch: 'readonly', caches: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
  AbortController: 'readonly', Request: 'readonly', Response: 'readonly', Event: 'readonly', CustomEvent: 'readonly', Node: 'readonly',
  Element: 'readonly', HTMLElement: 'readonly', DOMParser: 'readonly', FormData: 'readonly', Blob: 'readonly', File: 'readonly',
  FileReader: 'readonly', Intl: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly', console: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly', innerWidth: 'readonly', innerHeight: 'readonly',
  scrollTo: 'readonly', scrollX: 'readonly', scrollY: 'readonly', addEventListener: 'readonly', structuredClone: 'readonly', Notification: 'readonly',
  screen: 'readonly', confirm: 'readonly', alert: 'readonly', ClipboardItem: 'readonly', NodeFilter: 'readonly', getSelection: 'readonly', indexedDB: 'readonly', Storage: 'readonly', Navigator: 'readonly', MutationObserver: 'readonly', IntersectionObserver: 'readonly', ResizeObserver: 'readonly', queueMicrotask: 'readonly'
};

const nodo = {
  process: 'readonly', Buffer: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly',
  clearInterval: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', structuredClone: 'readonly', queueMicrotask: 'readonly',
  TextEncoder: 'readonly', TextDecoder: 'readonly', AbortController: 'readonly', fetch: 'readonly', globalThis: 'readonly'
};

const serviceWorker = {
  self: 'readonly', caches: 'readonly', clients: 'readonly', fetch: 'readonly', Request: 'readonly', Response: 'readonly', URL: 'readonly',
  console: 'readonly'
};

export default [
  { ignores: ['node_modules/**', 'docs/**', 'datos-mock/**', 'fonts/**', 'icons/**', 'tests/app/fixtures/**'] },
  js.configs.recommended,
  {
    // La app limpia a propósito el texto que viene de las hojas (caracteres de control, espacios raros) y esos patrones ya están probados:
    // no se tocan para contentar a la regla.
    rules: { 'no-control-regex': 'off', 'no-irregular-whitespace': 'off', 'no-useless-escape': 'off' }
  },
  { files: ['js/**/*.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: navegador } },
  { files: ['sw.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: serviceWorker } },
  // Las pruebas son de Node, pero llevan trozos que se ejecutan dentro de la página (page.evaluate): ven los dos entornos.
  {
    files: ['tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...navegador, ...nodo } },
    // Las pruebas llevan a propósito expresiones con espacios o caracteres raros (para comprobar que la app los rechaza).
    // Pendiente de limpiar: variables de apoyo sin usar en las pruebas (no son código de la app).
    rules: { 'no-regex-spaces': 'off', 'no-unused-vars': 'off', 'no-useless-assignment': 'off' }
  }
];
