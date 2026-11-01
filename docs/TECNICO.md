# Documento técnico: Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

**Para quién es:** el equipo de informática (TI) de la organización y quien mantiene la app. Si solo quieres saber qué hace la app, lee el [README](../README.md).

**Estado a 2026-11-01:** Fase 1 (lectura) terminada. Fase 2 en curso: hechos el acceso con clave, las notas de entrevista y las ofertas (lista, ficha, alta y edición). Faltan rondas y aplicaciones, el match y compartir perfiles. Todo con datos ficticios.

**Cómo leerlo:** lo que se afirma en las secciones 1 a 9 está comprobado en el código o en las pruebas. La sección 10 (integración con LaLiga) es **una propuesta técnica**, no algo ya hecho: los nombres de permisos, servicios y plazos hay que validarlos con TI.

---

## 1. Resumen en una página

- Es una **aplicación web para móvil (PWA)**: una página que se puede instalar en el teléfono. Está escrita en HTML, CSS y JavaScript puros, **sin librerías, sin compilar y sin servidor propio**.
- Hoy se publica en **GitHub Pages**, que es público. Por eso solo contiene datos ficticios.
- Los datos viven en una **hoja de Google (Sheet) privada**. La app no la lee directamente: habla con un **script de Google Apps Script** que va dentro de la hoja, y que solo responde si la petición lleva una **clave compartida**.
- Ese mecanismo (script + clave única + cuenta personal de Google) es un **puente temporal solo para pruebas**. No sirve para alumnos reales.
- Toda la lectura y escritura de datos pasa por **un único módulo** (`js/data/`). Las pantallas no saben de dónde vienen los datos. Migrar a Microsoft significa sustituir ese módulo, no rehacer la app.

```
   Móvil (PWA)                         Google (cuenta personal)
┌──────────────────┐   HTTPS POST   ┌───────────────────────────┐
│ Pantallas        │  (con clave)   │ Apps Script (Code.gs)     │
│   │              │ ─────────────► │  · comprueba la clave     │
│   ▼              │                │  · valida lo que se envía │
│ js/data/ (único  │ ◄───────────── │  · lee/escribe celdas     │
│ acceso a datos)  │     JSON       │          │                │
└──────────────────┘                │          ▼                │
   Los datos solo están             │ Google Sheet privado      │
   en memoria                       │ (Alumnos, Ofertas, Listas)│
                                    └───────────────────────────┘
```

---

## 2. Cómo está construida

### 2.1 Tecnología

| Aspecto | Decisión |
|---|---|
| Lenguajes | HTML, CSS y JavaScript con módulos del navegador. Sin framework, sin npm en la app, sin CDN. |
| Rutas | Con `#` (por ejemplo `#/oferta/O003`). La clave nunca va en la dirección. |
| Instalable y sin conexión | `manifest.webmanifest` y un *service worker* (`sw.js`) que guarda los archivos de la app (no los datos). Cada cambio exige subir el número `CACHE` de `sw.js`. |
| Tipografía e iconos | Open Sans e iconos guardados en el repositorio. Sin recursos externos. |
| Diseño | Tema oscuro, botones de al menos 44 px, letra de 16 px en formularios (el iPhone no amplía), sin zoom por pellizco. |

### 2.2 Carpetas

| Carpeta o archivo | Para qué sirve |
|---|---|
| `index.html`, `css/`, `js/` | La app. |
| `js/vistas/` | Una pantalla por archivo (inicio, máster, alumno, CV, buscar, ofertas, formulario de oferta, acceso, entrevista). |
| `js/util/` | Funciones sin pantalla: búsqueda y filtros (`filtros.js`, `ofertas.js`), CSV, textos, avatar, navegación. |
| **`js/data/`** | **Único sitio que sabe de dónde vienen los datos.** Ver sección 3. |
| `datos-mock/` | Tres CSV con los datos ficticios del modo demo (Alumnos, Ofertas, Listas). |
| `docs/apps-script/` | `Code.gs` (el script, **sin claves**) y `GUIA.md` (puesta en marcha). |
| `tests/apps-script/` | Simulador de Google y comprobaciones del script. |
| `tests/app/` | Pruebas de la app en un navegador real contra ese simulador. |
| `DECISIONES.md` | Registro de decisiones y riesgos. |

### 2.3 Modelo de datos

Tres hojas, con las columnas que espera la app (definidas en `js/data/esquema.js`). Si falta una columna, la app lo dice con su nombre.

| Hoja | Columnas |
|---|---|
| **Alumnos** | ID alumno, Foto, Nombre, Apellidos, Máster, Promoción, Nacionalidad principal, Nacionalidad secundaria, Situación de trabajo en España, Área de experiencia, Resumen de experiencia, Área a la que quiere ir, Por qué, Enlace al CV, Notas de entrevista, Fecha última entrevista, Disponibilidad. |
| **Ofertas** | ID oferta, Empresa, Tipo de organización, Área, Título del puesto, Tipo, Ubicación, Requisito de nacionalidad, Requisito de permiso de trabajo, Fecha de recepción, Estado de la oferta, Enlace o descripción. |
| **Listas** | Una columna por lista de valores: Máster, Área, Tipo de organización, Nacionalidad, Situación de trabajo en España, Tipo de oferta, Estado de la oferta, Disponibilidad, Requisito de permiso. |

Las pantallas solo usan los nombres internos (`nombre`, `areaDestino`, `estado`…). Una fuente nueva solo tiene que devolver objetos con esas claves.

---

## 3. Cómo se conecta (la capa de datos)

`js/data/index.js` es la única puerta. Estas son sus funciones públicas:

| Función | Qué hace |
|---|---|
| `getAlumnos()`, `getOfertas()`, `getListas()`, `getMasters()` | Leer. |
| `guardarEntrevista(id, notas, fecha, base)` | Escribir las 2 celdas de entrevista de un alumno. |
| `guardarOferta(id, oferta, anteriores)` | Crear (sin `id`) o editar una oferta. |
| `conectar`, `usarDemo`, `olvidarAcceso`, `getModo` | Acceso. |
| `puedeEscribir`, `puedeEscribirOfertas` | Qué permite la conexión actual. |

**Dos fuentes:**

- **demo** (`fuente-csv.js`): lee los CSV de `datos-mock/`. Solo lectura.
- **script** (`fuente-apps-script.js`): habla con Google. No hay vuelta automática a la demo si falla: se muestra el error, para no mezclar sin avisar datos de prueba con la demo.

**Cómo es una petición al script:**

- `POST` a la dirección del script (`https://script.google.com/macros/s/…/exec`), con cuerpo JSON en texto plano (`Content-Type: text/plain`), para que el navegador no haga una petición previa (Apps Script no la admite).
- El cuerpo lleva `action` y `key` (la clave). **La clave solo va en el cuerpo, nunca en la dirección.** Sin cookies (`credentials: 'omit'`) y sin cabecera de origen (`no-referrer`).
- Acciones: `ping`, `data`, `guardarEntrevista`, `guardarOferta`.
- Tiempo máximo de espera: 25 segundos.
- La respuesta incluye `version` (la app exige que sea 1) y `soporta` (qué acciones de escritura sabe hacer ese script). Si el script es antiguo y no anuncia `guardarOferta`, la app no enseña los botones de ofertas y lo explica.
- Los errores son códigos cortos (`clave`, `bloqueado`, `conflicto`, `lista`, `requerido`, `largo`…). Los textos para la persona están en la app, no en el script.

**Los datos solo están en memoria.** Nunca se guardan en el teléfono. En el teléfono (`localStorage`) solo quedan la dirección del script, la clave y el modo elegido.

**Concurrencia:**

- El script usa un cerrojo (`LockService`) para atender una petición de escritura cada vez.
- **Conflictos:** al editar, la app envía también lo que creía que había (`notasAnteriores` o `anteriores`). Si el Sheet ya no coincide, el script no escribe nada y devuelve `conflicto` con lo que hay. La app lo enseña y deja elegir. En ofertas, "Guardar el mío igualmente" guarda solo los campos que tocó la persona y conserva lo que cambió la otra.
- **Altas sin duplicar:** si la conexión se corta justo al crear una oferta, la app no sabe si llegó. Al reintentar, primero vuelve a leer el Sheet y busca una oferta nueva idéntica; si existe, no la crea otra vez.

---

## 4. Qué puede escribir (permisos del script)

| Hoja | Puede | No puede |
|---|---|---|
| Alumnos | Escribir **solo** "Notas de entrevista" y "Fecha última entrevista" de un alumno cada vez. | Crear ni borrar alumnos. Tocar otra celda. |
| Ofertas | **Añadir una fila** (el ID lo genera el script: O011, O012…) o editar las 11 columnas de una oferta. | Borrar filas. (Una oferta se cierra cambiando su estado.) |
| Listas | Solo leer. | Escribir. |

Cada valor escrito se guarda como **texto plano** (formato de celda texto). Si un texto empieza por `=`, `+`, `-` o `@`, el script le añade un espacio delante para que el Sheet no lo lea como fórmula.

**Validaciones** (las aplican a la vez el script y la app; la del script es la que vale):

- Notas: hasta 2.000 caracteres, sin HTML, sin caracteres de control, fecha real y no futura.
- Ofertas: campos obligatorios, límites (empresa 100, título 120, ubicación 100, enlace o descripción 500), sin HTML, una sola línea, fecha real y no futura, y los desplegables solo admiten valores que existan en la hoja Listas. El enlace no puede empezar por `http:`, `javascript:`, `data:`, `vbscript:` ni `file:`.

---

## 5. Seguridad: lo que hay

| Medida | Dónde |
|---|---|
| **Clave de al menos 16 caracteres**, guardada en las Propiedades del script; el script se niega a funcionar con una más corta. | `Code.gs` |
| **Bloqueo:** 5 claves malas seguidas bloquean 15 minutos (también a la clave buena). | `Code.gs` |
| **Ningún secreto en el repositorio:** ni la clave ni la dirección del script. `Code.gs` público es una plantilla; cualquier otro `Code.gs` está en `.gitignore`. | Repo |
| **Política de seguridad del contenido (CSP)** en `index.html`: solo código de la propia web; las únicas conexiones externas permitidas son `script.google.com` y `script.googleusercontent.com`; imágenes solo por https; sin formularios hacia fuera. | `index.html` |
| **Ningún `innerHTML` ni estilos en línea:** todo texto de los datos se escribe como texto. Un valor con código HTML no se ejecuta. | Todo `js/` |
| **Enlaces:** solo `https://` se abre, en otra pestaña y sin enviar de dónde vienes. `http:`, `javascript:` y similares se muestran como texto. | `js/util/ofertas.js`, `cv.js` |
| **Sin datos en el teléfono:** los datos solo están en memoria; lo escrito en un formulario no se guarda hasta pulsar Guardar. Una clave que el script rechaza se borra del teléfono. | `js/data/` |
| **Aviso antes de perder cambios** al salir de un formulario. | `js/app.js` |
| **Sin indexar:** `noindex` y `robots.txt`. (No hace la app privada.) | `index.html` |
| **Las respuestas de Google no pasan por el service worker**, así que no quedan copias de datos en la caché. | `sw.js` |

---

## 6. Límites y riesgos conocidos

Todos son aceptables **solo porque los datos son ficticios**.

1. **Cuenta personal de Google.** El script se ejecuta con una cuenta de Gmail personal. Con alumnos reales choca previsiblemente con la política de datos de la escuela y con el RGPD.
2. **Clave única compartida.** No distingue personas, no se puede retirar a una sola, y **no deja registro de quién leyó o escribió qué**.
3. **Clave en el teléfono sin cifrar** (`localStorage`). Quien use ese teléfono desbloqueado puede usar la app. Un teléfono perdido obliga a cambiar la clave.
4. **Bloqueo como arma.** La dirección del script es pública: cualquiera que la conozca puede bloquear el acceso 15 minutos con claves malas.
5. **Notas de entrevista.** Son valoraciones sobre personas: datos sensibles aunque los nombres sean ficticios. No escribir nada real.
6. **El script ahora crea filas** en la hoja Ofertas (antes solo escribía dos celdas). Hay que hacer copia de seguridad del Sheet antes de usarlo.
7. **CV y fotos.** La clave no los protege: sus enlaces tendrían que ser privados.
8. **Sin historial propio de cambios.** Si algo se pisa por error, solo sirve el historial de versiones de Google Sheets.
9. **Historial de Git.** Siguen escritos en él tres enlaces antiguos del Sheet cuando estuvo publicado. Ya no funcionan (Google responde 401) y la clave y la dirección del script nunca estuvieron en el repositorio. Se decidió no reescribir el historial.
10. **CSP en una etiqueta `<meta>`.** Es una limitación de GitHub Pages: no se pueden poner cabeceras HTTP. Una etiqueta meta no puede imponer, por ejemplo, `frame-ancestors`.
11. **Sin conexión, en modo script, no se ven datos** (por diseño: no se guardan en el teléfono). Solo la demo funciona sin conexión.
12. **La primera petición tras un rato sin usar** el script puede tardar 1 a 3 segundos.

---

## 7. Pruebas

| Qué | Comprobaciones | Cómo ejecutarlas |
|---|---|---|
| El script (`Code.gs`) contra un simulador de Google | 205 | `node tests/apps-script/pruebas.mjs` |
| La app en un navegador real: acceso y clave | 71 | `cd tests/app`, `npm install` (una vez), `npm test` |
| La app: notas de entrevista | 63 | (incluido en `npm test`) |
| La app: lista y ficha de ofertas | 106 | (incluido en `npm test`) |
| La app: formulario de ofertas | 123 | (incluido en `npm test`) |

- Las pruebas ejecutan **el mismo `Code.gs`** que se pega en Apps Script, dentro de un simulador. No tocan ningún Sheet real ni llevan claves ni direcciones reales: todo es inventado.
- Se complementan con **pruebas de mutación manuales**: se estropea a propósito una regla (por ejemplo "no comprobar duplicados") y se verifica que las pruebas fallan. Se han hecho con el script (16 variantes; la que queda es equivalente) y con la app (25 variantes, todas detectadas).
- Los comandos necesitan Node.js y, para las de navegador, Microsoft Edge (o `NAVEGADOR=chromium`). La app en sí no usa npm.

**Lo que no cubren:** la redirección real de Google (se comprobó a mano con el Sheet real), un iPhone real (el aspecto en iPhone lo comprueba Santiago a mano), ni la carga con mucha gente.

---

## 8. Mantenimiento (versión actual)

- **Publicar un cambio de la app:** subir el número `CACHE` de `sw.js`, `git commit` y `git push` a `main`; GitHub Pages publica en 1 o 2 minutos. En el teléfono hay que cerrar la app y abrirla dos veces.
- **Cambiar el script:** pegar el nuevo `Code.gs`, guardar y publicar una **"Nueva versión" de la misma implementación**. No crear una implementación nueva: cambia la dirección y la app dejaría de encontrarla. Guía completa en [GUIA.md](apps-script/GUIA.md).
- **Cambiar la clave:** editar la propiedad `CLAVE` del script; después, "Olvidar acceso" en la app y volver a entrar.
- **Cambiar los datos del Sheet:** no renombrar hojas ni columnas. Los valores de las listas deben coincidir con la hoja Listas.
- **Copias de seguridad:** copia manual del Sheet antes de cambios importantes (Archivo, Hacer una copia).

---

## 9. Qué se reutiliza y qué se rehace al migrar

| Se conserva tal cual | Se sustituye |
|---|---|
| Todas las pantallas (`js/vistas/`), los filtros y la búsqueda (`js/util/`). | `js/data/fuente-apps-script.js` y `acceso.js`. |
| El esquema de columnas (`esquema.js`) y la conversión a objetos (`tablas.js`). | La pantalla de Acceso (`vistas/acceso.js`). |
| Diseño, service worker, modo demo y la lógica de validación del formulario. | `docs/apps-script/` y `tests/apps-script/`. |
| Las pruebas de la app (cambiando solo el "Google simulado" por uno de Microsoft). | La política de seguridad de `index.html` (dominios de Microsoft en lugar de los de Google). |

---

## 10. Qué hace falta para profesionalizarla e integrarla con LaLiga

> **Es una propuesta técnica para discutir con TI, no algo ya decidido.** Los nombres de permisos y servicios son los habituales en el entorno Microsoft 365; hay que validarlos con TI en cada caso.

### 10.1 Condiciones previas (sin esto no se empieza con datos reales)

1. **Responsable y objetivo claros:** quién es el responsable de la app y de los datos, para qué personas y para qué usos.
2. **Visto bueno de TI y de protección de datos** (sección 10.4).
3. **Que la app deje de estar en un servicio público y personal** (GitHub Pages, cuenta de Gmail).

### 10.2 Identidad: inicio de sesión individual con Microsoft Entra ID

Hoy hay una clave para todos. El objetivo es que cada persona entre con **su cuenta de la organización**.

- **Registrar la app en Microsoft Entra ID** (antes Azure AD) como aplicación de una sola página (SPA), con sus direcciones de retorno (*redirect URI*), en el inquilino (*tenant*) de la organización. Lo hace TI.
- **Flujo de inicio de sesión:** código de autorización con PKCE, que es el recomendado para aplicaciones de navegador. Se suele usar la librería oficial de Microsoft (MSAL.js).
  - *Consecuencia para este proyecto:* hoy la app no usa librerías ni compilación. Hay que decidir si se incluye una copia fijada de esa librería en el repositorio (y se revisa) o si se introduce un paso de compilación. Es una decisión de arquitectura que hay que anotar en `DECISIONES.md`.
- **Permisos (*scopes*) mínimos:** de tipo delegado (en nombre de la persona), solo sobre el sitio de SharePoint de la app. A validar con TI; lo habitual es limitar el acceso a un sitio concreto en lugar de a todo SharePoint. Cualquier permiso que requiera consentimiento de administrador lo concede TI.
- **Quién puede qué:** grupos de seguridad de Entra ID (por ejemplo, "ver", "editar notas", "editar ofertas") en lugar de un único "puedeEscribir" global. La app leerá los grupos o los permisos del sitio.
- **Altas y bajas:** al dejar la organización, la persona pierde el acceso automáticamente, sin cambiar ninguna clave.
- **Dispositivos:** definir si se exige dispositivo gestionado (Intune), PIN y cifrado en el móvil.

### 10.3 Datos: SharePoint y Microsoft Graph

- **Dónde guardar los datos:** opciones habituales, **listas de SharePoint** o un libro de Excel en SharePoint. Las listas ofrecen permisos por elemento, historial de versiones y un control de cambios por elemento que encaja bien con los conflictos de edición. Hay que confirmarlo con TI.
- **Cómo se accede:** con la API de Microsoft Graph desde el navegador, con el token de la persona.
- **Qué hay que escribir:** `js/data/fuente-graph.js`, que devuelva lo mismo que `fuente-apps-script.js`:
  - tablas `{ cabecera, filas }` de Alumnos, Ofertas y Listas (`tablas.js` ya convierte a objetos);
  - `guardarEntrevista` y `guardarOferta` con las mismas entradas y salidas; y
  - el elegirla en `js/data/index.js`.
- **Equivalencias de lo que hoy hace el script:**

| Hoy (script de Google) | Con Microsoft |
|---|---|
| Clave compartida | Token de la persona (Entra ID). |
| `LockService` y comparación con "anteriores" para detectar conflictos | Control de concurrencia propio de SharePoint (versión del elemento) o la misma comparación hecha desde la app. |
| Validación en el script | **Debe seguir existiendo en el servidor**, no solo en la app: reglas de listas, longitudes, fechas. Con listas de SharePoint, columnas de elección y restricciones; si no basta, una Azure Function o un flujo de Power Automate. |
| ID de oferta O011… generado por el script | Identificador de la lista o generado de forma única en servidor. |
| Historial de versiones de Google Sheets | Versionado de SharePoint (activar y definir cuántas versiones). |

- **CV y fotos:** carpeta de SharePoint con permisos por persona. Se acabaron los enlaces de ejemplo o públicos. Las fotos siguen siendo iniciales hasta que haya consentimiento.

### 10.4 Protección de datos y RGPD

A confirmar con el delegado de protección de datos (DPD) de la organización. Lo que normalmente hay que resolver:

- **Base legal y finalidad** de tratar datos de alumnos (currículum, nacionalidad, situación de permiso de trabajo) y de las **notas de entrevista**, que son valoraciones personales.
- **Evaluación de impacto (EIPD/DPIA)** si procede, por el tratamiento de datos de personas y su cruce con ofertas.
- **Minimización:** qué datos hacen falta de verdad. La nacionalidad y el permiso de trabajo son especialmente delicados.
- **Plazos de conservación y borrado:** cuánto tiempo se guarda un perfil y sus notas, y cómo se borra.
- **Derechos de las personas:** acceso, rectificación y supresión, incluidas las notas. Quien las escribe debe saber que la persona podría pedirlas.
- **Compartir perfiles con terceros (empresas):** consentimiento expreso de cada alumno, qué se comparte y durante cuánto tiempo. Es un bloque futuro de este proyecto.
- **Registro de actividades de tratamiento** y, si interviene un proveedor, contrato de encargado del tratamiento. Si hay transferencias fuera del Espacio Económico Europeo, comprobarlas.
- **Quién puede ver y escribir notas de entrevista**, con registro de accesos.

### 10.5 Alojamiento dentro de la organización

- **Sacarla de GitHub Pages** (público). Opciones habituales: un servicio de alojamiento de sitios estáticos dentro de Azure de la organización, o un servidor web interno. Lo decide TI.
- **Dominio propio de la organización** y HTTPS.
- **Cabeceras HTTP reales** en vez de la etiqueta meta: `Content-Security-Policy` (con `frame-ancestors`), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Acceso solo para usuarios de la organización** (la propia página protegida por inicio de sesión, no solo los datos).
- **Entornos separados** de pruebas y de producción, con el modo demo solo en pruebas.

### 10.6 Revisión de seguridad

- Revisión previa de arquitectura y modelo de amenazas por el equipo de seguridad.
- **Prueba de intrusión (pentest)** independiente antes de abrirla a más gente.
- Repasar el control de acceso (que nadie pueda leer o escribir lo que no le toca), la gestión de tokens (dónde se guardan en el navegador y cuánto duran) y el manejo de datos en dispositivos perdidos.
- Revisar las librerías incluidas (hoy ninguna) y fijar sus versiones.
- Mantener las pruebas automáticas y añadir las de permisos por persona.

### 10.7 Copias de seguridad y recuperación

- Copias periódicas de la lista o el libro de datos, con restauración probada.
- Versionado y papelera de SharePoint activados y con retención acordada.
- Objetivos acordados: cuánta información se puede perder y cuánto puede tardar en recuperarse.
- Cómo se recupera una nota o una oferta borrada por error.

### 10.8 Mantenimiento y operación

- **Propietario técnico y de negocio** nombrados, con sustituto.
- **Registro de auditoría:** quién leyó o cambió qué (hoy no existe).
- **Monitorización** de errores y de disponibilidad, y un canal de soporte.
- **Ciclo de actualizaciones:** quién publica, cómo se prueba (las pruebas actuales sirven de base) y cómo se vuelve atrás.
- **Gestión de usuarios:** alta, baja y revisión periódica de quién tiene acceso a qué.
- **Documentación viva:** mantener este documento, la guía y `DECISIONES.md`.

### 10.9 Plan por fases (propuesta)

1. **Alineación:** reunión con TI y con protección de datos; responder las preguntas de 10.10.
2. **Entorno de pruebas Microsoft:** registro en Entra ID, un sitio de SharePoint de prueba con datos ficticios.
3. **`fuente-graph.js` + inicio de sesión**, con las pruebas de la app adaptadas.
4. **Alojamiento y cabeceras** dentro de la organización.
5. **Revisión de seguridad y de protección de datos.**
6. **Piloto con un grupo pequeño** y datos reales mínimos, si TI y el DPD lo aprueban.
7. **Resto de bloques** (rondas y aplicaciones, match, compartir perfiles) ya sobre la base nueva.

### 10.10 Preguntas abiertas para TI

1. ¿Se puede registrar una aplicación de una sola página en el inquilino de la organización? ¿Quién lo hace y cuánto tarda?
2. ¿Qué permisos de Graph se pueden conceder y cuáles requieren consentimiento de administrador?
3. ¿Dónde se guardan los datos: lista de SharePoint, libro de Excel u otra cosa que ya use la escuela? ¿Existe ya un sitio para esto?
4. ¿Qué librerías de terceros se aceptan (por ejemplo MSAL.js)? ¿Se puede incluir una copia fijada en el repositorio o hace falta un proceso de compilación?
5. ¿Dónde se puede alojar una página web interna? ¿Con qué dominio y qué cabeceras de seguridad se pueden fijar?
6. ¿Los móviles de quien la usará están gestionados (Intune u otro)? ¿Se exige PIN o cifrado?
7. ¿Cómo se gestionan los grupos de acceso y quién aprueba las altas y bajas?
8. ¿Qué registro de auditoría ofrece la plataforma y cuánto tiempo se conserva?
9. ¿Qué política de copias y de retención aplica a SharePoint?
10. ¿Quién es el DPD y qué proceso hay para pedir una EIPD?
11. ¿Quién será el propietario técnico de la app una vez en producción y quién da el soporte?
12. ¿Hay otras herramientas de la organización con las que deba integrarse (CRM, gestión de prácticas, correo)?

---

## 11. Glosario corto

| Término | Qué significa |
|---|---|
| **PWA** | Página web que se instala en el móvil y se abre como una app. |
| **Apps Script** | Pequeños programas de Google que viven dentro de una hoja de cálculo. |
| **Service worker** | Programa del navegador que guarda los archivos de la app para abrirla sin conexión. |
| **CSP** | Política de seguridad que dice al navegador qué código y qué conexiones están permitidos. |
| **Entra ID** | El servicio de identidades de Microsoft (antes Azure AD). |
| **Graph** | La interfaz de Microsoft para leer y escribir datos de Microsoft 365 (SharePoint, Excel…). |
| **MSAL** | La librería oficial de Microsoft para iniciar sesión desde una aplicación. |
| **PKCE** | Un método seguro para iniciar sesión desde aplicaciones de navegador. |
| **RGPD / EIPD (DPIA)** | Reglamento europeo de protección de datos / evaluación de impacto sobre esa protección. |
| **DPD** | Delegado de protección de datos. |
| **Pentest** | Prueba de intrusión: un experto intenta atacar la app con permiso para encontrar fallos. |
