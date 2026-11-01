# Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

App web para móvil (PWA) para consultar alumnos de un máster: lista por máster, ficha con CV, búsqueda y filtros, y notas de entrevista. Los nombres de los másteres y de las empresas de las ofertas son de ejemplo.

**Solo datos de prueba (ficticios).** Se puede ver una demo o conectar con un Google Sheet de prueba privado (con clave) y guardar notas de entrevista desde la ficha. **No usar con alumnos reales:** ver [DECISIONES.md](DECISIONES.md).

Web publicada: https://santiagofloressolbes.github.io/gestion-alumnos-demo/

## Qué hay en cada carpeta

| Carpeta o archivo | Para qué sirve |
|---|---|
| `index.html`, `css/`, `js/` | La app (HTML, CSS y JavaScript sin instalar nada). |
| `js/data/` | **Único sitio que sabe de dónde vienen los datos** (demo o script de Google) y cómo se guardan las notas. |
| `datos-mock/` | Los 3 CSV de prueba (Alumnos, Ofertas, Listas). Son los datos del **modo demo**. |
| `docs/apps-script/` | `Code.gs` (el script, sin claves) y `GUIA.md` (cómo ponerlo en marcha). |
| `tests/apps-script/` | Simulador de Google y 128 comprobaciones del script. |
| `tests/app/` | Pruebas de la app en un navegador real contra ese simulador. |
| `fonts/`, `icons/` | Tipografía Open Sans e iconos, guardados en el repo (sin CDN). |
| `sw.js`, `manifest.webmanifest` | Permiten instalar la app y abrirla sin conexión. |
| `DECISIONES.md` | Qué se decidió y por qué, los riesgos y cómo migrar a Microsoft. |

## Probarla en tu ordenador

1. Abre una terminal en la carpeta del proyecto.
2. Escribe `python -m http.server 8123` y pulsa Intro.
3. Abre `http://localhost:8123` en el navegador.
4. Para parar el servidor, pulsa Ctrl+C en la terminal.

No se puede abrir `index.html` con doble clic: los navegadores bloquean así los módulos de JavaScript.

Pruebas (necesitan Node.js; solo para desarrollo, la app no usa npm):

- **El script:** `node tests/apps-script/pruebas.mjs`. Deben salir 128 de 128.
- **La app en un navegador real:** `cd tests/app`, `npm install` (una vez) y `npm test`. Usa Microsoft Edge; con `NAVEGADOR=chromium` usa el Chromium de Playwright (hay que instalarlo con `npx playwright install chromium`). Todo es simulado: no hay claves ni direcciones reales.

## Publicar un cambio (GitHub Pages)

1. **Sube el número de caché** en `sw.js` (la línea `const CACHE = 'gestion-alumnos-demo-vN'`, un número más). Sin esto, el móvil sigue con la versión vieja.
2. Guarda y sube los cambios a la rama `main` (`git add -A`, `git commit`, `git push`).
3. Espera 1 o 2 minutos. GitHub Pages publica solo.
4. En el móvil, cierra la app del todo y ábrela dos veces para que cargue la versión nueva.

Primera vez: en GitHub, Settings, Pages, Source "Deploy from a branch", rama `main`, carpeta `/ (root)`.

## Conectar con el Sheet de prueba (con clave)

La primera vez la app enseña la pantalla **Acceso**, con dos opciones:

- **Ver demo:** datos de ejemplo que vienen con la app (`datos-mock/`). Sale un aviso fijo "MODO DEMO" y no se puede guardar nada. Es lo único que funciona sin conexión.
- **Conectar:** escribe la dirección del script (termina en `/exec`) y la clave. La app las comprueba y, solo si son correctas, las guarda **en ese móvil**. Los datos de los alumnos no se guardan en el móvil.

Para tener un Sheet propio con su script y su clave, sigue [docs/apps-script/GUIA.md](docs/apps-script/GUIA.md). **No pegues la dirección ni la clave en chats, en el código ni en el repositorio.**

Si el script falla, la app lo dice (sin conexión, clave mala, bloqueo, falta una columna…) y **no** cambia sola a la demo. En Inicio, la tarjeta **Conexión** tiene el botón "Olvidar acceso".

## Notas de entrevista

En la ficha de cada alumno, la tarjeta **Entrevista** tiene **Editar entrevista** (solo conectado al Sheet; no en la demo).

- **Una nota por alumno**, de hasta 2.000 caracteres, y la fecha de la entrevista (hoy por defecto; no se admiten fechas futuras ni código HTML).
- Solo se escriben esas dos celdas del Sheet. La app no crea ni borra alumnos: eso se hace en el Sheet.
- Si empiezas la nota con `-`, `=`, `+` o `@`, se guarda con un espacio delante para que el Sheet no la tome por una fórmula.
- Si otra persona cambió esa entrevista mientras la editabas, la app te enseña lo que hay ahora y eliges: **Guardar el mío igualmente** o **Descartar el mío**.
- Para borrar una entrevista, deja la nota vacía y confirma.
- Lo que escribes no se guarda en el móvil hasta que pulsas Guardar.

## Cambiar los datos de alumnos

Edita el Sheet de prueba. No hay que subir nada a GitHub; los cambios se ven al volver a abrir la app.

- **No cambies los nombres de las columnas ni de las hojas** (Alumnos, Ofertas, Listas). Si falta una, la app lo dice con el nombre.
- **Un alumno nuevo** necesita un ID distinto (A031, A032…) y un máster. Conviene que el máster esté en la hoja Listas; si no, aparece igualmente, al final.
- **Valores de las listas:** escribe situación de trabajo, área, nacionalidad y disponibilidad exactamente igual que en la hoja Listas (usa el desplegable). Si cambias una letra o una tilde, los filtros lo tratan como otro valor.
- **El Sheet debe seguir "Restringido"** y sin "Publicar en la web".
- Para cambiar la demo, edita los CSV de `datos-mock/` (mismo formato) y publica como arriba.

## Seguridad y privacidad (importante)

- **Todo lo que está aquí es público:** el código y los CSV de prueba. Por eso solo hay datos ficticios.
- **No hay ninguna clave ni contraseña** en el repo, ni la dirección del script. No añadas ninguna. La clave vive en las Propiedades del script y en el móvil de cada persona.
- **La clave es una sola para todos:** no distingue personas. Si pierdes el móvil, cambia la clave (guía, "Cambiar la clave").
- **Cuenta personal de Google:** este mecanismo es un puente temporal solo para datos de prueba. Con alumnos reales no se usa.
- **No uses "Publicar en la web" con datos reales.** Antes de usar alumnos reales hay que migrar a Microsoft con inicio de sesión individual (lista de comprobación en `DECISIONES.md`).
- **No es una app oficial** ni está afiliada a LaLiga ni a LaLiga Business School. No usar sus logos, nombres comerciales ni datos reales.
- La web lleva `noindex` para que Google no la muestre, pero **eso no la hace privada**: quien tenga el enlace puede abrirla (aunque sin la clave no ve datos).

## Al migrar a Microsoft

El puente de Google (Apps Script, clave compartida y cuenta personal) es **temporal y solo para datos de prueba**. Con alumnos reales:

1. **Pedir a TI** el registro de la app en Microsoft Entra ID y su visto bueno de seguridad y protección de datos.
2. **Cambiar la fuente a Microsoft Graph y SharePoint:** crear `js/data/fuente-graph.js` (mismas tablas y la misma función de guardar la entrevista) y elegirla en `js/data/index.js`. Las pantallas no cambian: solo usan `getAlumnos()`, `getMasters()`, `guardarEntrevista()`, etc.
3. **Quitar la clave compartida** y usar inicio de sesión individual (Entra ID), con permisos por persona. Se sustituye la pantalla Acceso y se borran `acceso.js` y `fuente-apps-script.js`. Se ajusta la política de seguridad de `index.html`.
4. **Borrar el Apps Script y el Sheet de Google** (y la copia de seguridad).
5. **Decidir dónde viven los CV y las fotos reales** (SharePoint con permisos por persona).

El detalle y la lista de comprobación previa a usar alumnos reales están en [DECISIONES.md](DECISIONES.md).

## Comprobaciones rápidas tras un cambio

- Sin acceso elegido, solo se ve la pantalla Acceso.
- **Ver demo:** Inicio muestra 4 másteres con 8, 8, 7 y 7 alumnos y el aviso "MODO DEMO"; no hay botón de editar en las fichas.
- Conectado: la misma lista, la tarjeta "Conexión" y, en la ficha, **Editar entrevista**.
- Un máster lista a sus alumnos; una ficha abre su "CV de ejemplo".
- Buscar encuentra "ibanez" (sin tilde) y los filtros combinan.
- Una clave mala se rechaza y, tras 5 fallos, bloquea 15 minutos.
- Sin conexión la app abre; la demo funciona y, en modo script, se avisa de que no hay conexión con Google.
