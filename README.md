# Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

App web para móvil (PWA) para consultar alumnos de un máster: lista por máster, ficha con CV, búsqueda y filtros. Los nombres de los másteres y de las empresas de las ofertas son de ejemplo.

**Fase 1: solo lectura y solo datos de prueba (ficticios).** No usar con alumnos reales: ver [DECISIONES.md](DECISIONES.md).

Web publicada: https://santiagofloressolbes.github.io/gestion-alumnos-demo/

## Qué hay en cada carpeta

| Carpeta o archivo | Para qué sirve |
|---|---|
| `index.html`, `css/`, `js/` | La app (HTML, CSS y JavaScript sin instalar nada). |
| `js/data/` | **Único sitio que sabe de dónde vienen los datos.** `config.js` dice cuál es la fuente. |
| `datos-mock/` | Los 3 CSV de prueba (Alumnos, Ofertas, Listas). Son el respaldo si falla Google. |
| `fonts/`, `icons/` | Tipografía Open Sans e iconos, guardados en el repo (sin CDN). |
| `sw.js`, `manifest.webmanifest` | Permiten instalar la app y abrirla sin conexión. |
| `DECISIONES.md` | Qué se decidió y por qué, y el plan pendiente de acceso con clave. |

## Probarla en tu ordenador

1. Abre una terminal en la carpeta del proyecto.
2. Escribe `python -m http.server 8123` y pulsa Intro.
3. Abre `http://localhost:8123` en el navegador.
4. Para parar el servidor, pulsa Ctrl+C en la terminal.

No se puede abrir `index.html` con doble clic: los navegadores bloquean así los módulos de JavaScript.

## Publicar un cambio (GitHub Pages)

1. **Sube el número de caché** en `sw.js` (la línea `const CACHE = 'gestion-alumnos-demo-vN'`, un número más). Sin esto, el móvil sigue con la versión vieja.
2. Guarda y sube los cambios a la rama `main` (`git add -A`, `git commit`, `git push`).
3. Espera 1 o 2 minutos. GitHub Pages publica solo.
4. En el móvil, cierra la app del todo y ábrela dos veces para que cargue la versión nueva.

Primera vez: en GitHub, Settings, Pages, Source "Deploy from a branch", rama `main`, carpeta `/ (root)`.

## Actualizar los datos (Google Sheet)

Los datos de prueba están en un Google Sheet propio, con 3 hojas: **Alumnos**, **Ofertas** y **Listas**. La app lee las 3 hojas publicadas como CSV (Archivo, Compartir, Publicar en la web). Los enlaces están en `js/data/config.js`.

- **Editar, añadir o borrar alumnos:** cambia las filas del Sheet. No hace falta tocar la app ni subir nada.
- **Tarda unos 5 minutos** en verse en la app: Google refresca el CSV publicado con retraso.
- **No cambies los nombres de las columnas ni de las hojas.** Si falta una columna, la app lo avisa en Inicio con el motivo y enseña los datos de respaldo (`datos-mock/`).
- **Un alumno nuevo** necesita un ID distinto (A031, A032…) y un máster. Conviene que el máster esté en la hoja Listas; si no, aparece igualmente, pero al final de la lista de másteres.
- **Valores de las listas:** escribe situación de trabajo, área, nacionalidad y disponibilidad exactamente igual que en la hoja Listas (usa el desplegable). Si cambias una letra o una tilde, los filtros lo tratan como otro valor y salen opciones duplicadas.
- **Si borras o renombras una hoja, o dejas de publicarla,** su enlace deja de funcionar y la app usa el respaldo.
- Para cambiar los datos de respaldo, edita los CSV de `datos-mock/` (con el mismo formato) y publica como arriba.

## Seguridad y privacidad (importante)

- **Todo lo que está aquí es público:** el código, los CSV de prueba y los enlaces del Sheet publicado. Por eso solo hay datos ficticios.
- **No hay ninguna clave ni contraseña** en el repo. No añadas ninguna.
- **No uses "Publicar en la web" con datos reales.** Antes de usar alumnos reales hay que cambiar la fuente de datos y añadir acceso con clave o inicio de sesión (lista de comprobación en `DECISIONES.md`).
- **No es una app oficial** ni está afiliada a LaLiga ni a LaLiga Business School. No usar sus logos, nombres comerciales ni datos reales.
- La web lleva `noindex` para que Google no la muestre, pero **eso no la hace privada**: quien tenga el enlace puede abrirla.

## Migrar a Excel / SharePoint (Microsoft Graph)

Las pantallas nunca leen los datos directamente: piden `getAlumnos()`, `getOfertas()`, `getListas()` y `getMasters()` a `js/data/index.js`. Para migrar:

1. Crear en `js/data/` un archivo nuevo (por ejemplo `fuente-graph.js`) que devuelva los mismos datos con las mismas claves (están en `js/data/esquema.js`).
2. Cambiar la fuente en `js/data/config.js` y en `js/data/index.js`.
3. Añadir el inicio de sesión de Microsoft. Hace falta apoyo del departamento de IT de la organización para registrar la app y dar permisos.

## Comprobaciones rápidas tras un cambio

- Inicio muestra 4 másteres con 8, 8, 7 y 7 alumnos.
- Un máster lista a sus alumnos; una ficha abre su "CV de ejemplo".
- Buscar encuentra "ibanez" (sin tilde) y los filtros combinan.
- Sin conexión la app abre y avisa de que usa datos de respaldo.
