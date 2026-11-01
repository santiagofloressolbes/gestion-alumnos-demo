// Service worker: deja la app disponible sin conexión.
// Cada cambio en los archivos de la app: subir CACHE para que el móvil cargue la versión nueva.
const CACHE = 'gestion-alumnos-demo-v12';
const FILES = ['./', './index.html', './manifest.webmanifest', './css/app.css', './js/app.js', './js/util/csv.js', './js/util/dom.js', './js/vistas/inicio.js', './js/vistas/master.js', './js/vistas/alumno.js', './js/util/avatar.js', './js/util/cv.js', './js/vistas/cv.js', './js/vistas/buscar.js', './js/util/texto.js', './js/util/filtros.js', './js/util/navegacion.js',
  './js/data/index.js', './js/data/config.js', './js/data/esquema.js', './js/data/fuente-csv.js', './js/data/tablas.js', './js/data/acceso.js', './js/data/fuente-apps-script.js', './js/vistas/acceso.js', './js/vistas/error-datos.js', './js/vistas/entrevista.js',
  './datos-mock/Alumnos.csv', './datos-mock/Ofertas.csv', './datos-mock/Listas.csv',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './fonts/opensans-latin-400.woff2', './fonts/opensans-latin-600.woff2', './fonts/opensans-latin-700.woff2',
  './fonts/opensans-latin-ext-400.woff2', './fonts/opensans-latin-ext-600.woff2', './fonts/opensans-latin-ext-700.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // los datos de Google no pasan por aquí
  const esDato = url.pathname.includes('/datos-mock/');
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const red = fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      // Datos: primero la red (para no enseñar datos viejos sin avisar). Resto: primero la copia guardada.
      return esDato ? red : (hit || red);
    })
  );
});
