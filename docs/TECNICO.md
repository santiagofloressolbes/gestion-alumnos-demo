# Documento técnico: Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

**Para quién es:** el equipo de informática (TI) de la organización y quien mantiene la app. Si solo quieres saber qué hace la app, lee el [README](../README.md).

**Estado a 2026-11-17 (versión 29):** Fase 1 (lectura) y Fase 2 (acceso con clave, notas de entrevista, ofertas, rondas y solicitudes, match y compartir perfiles) terminadas. De la Fase 3 está hecho todo lo que lleva código (avisos y borradores de correo, programas agrupados, match de ocho criterios, perfil del puesto, historia por plantillas y los paquetes de presentación v27 a v29); 3B (Microsoft Forms) y 3C (Entra ID) son solo documentos. Todo con datos ficticios.

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
   en memoria                       │ (6 hojas, ver 2.3)        │
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
| `js/vistas/` | Una pantalla por archivo (inicio, máster, alumno, CV, buscar, ofertas, formulario de oferta, acceso, entrevista, rondas y solicitudes, los formularios de rondas, **las tarjetas del match (`match.js`) y la pantalla de compartir perfiles (`compartir.js`)**). |
| `js/util/` | Funciones sin pantalla: búsqueda y filtros (`filtros.js`, `ofertas.js`), orden, resúmenes y validación de rondas y «quién ha solicitado» una oferta (`rondas.js`, `solicitantesDeOferta`: una fila por alumno con su solicitud más reciente), **match oferta-alumno y avisos de requisitos (`match.js`)**, **texto de los perfiles que se comparten (`compartir.js`)**, CSV, textos, avatar, navegación. |
| **`js/data/`** | **Único sitio que sabe de dónde vienen los datos.** Ver sección 3. |
| `datos-mock/` | Seis CSV con los datos ficticios del modo demo (Alumnos, Ofertas, Listas, Rondas, Aplicaciones, Historial). También sirven para crear esas hojas en el Sheet de prueba (ver la guía). |
| `docs/apps-script/` | `Code.gs` (el script, **sin claves**) y `GUIA.md` (puesta en marcha). |
| `tests/apps-script/` | Simulador de Google y comprobaciones del script. |
| `tests/app/` | Pruebas de la app en un navegador real contra ese simulador. |
| `docs/DECISIONES.md` | Registro de decisiones y riesgos. |

### 2.3 Modelo de datos

Seis hojas, con las columnas que espera la app (definidas en `js/data/esquema.js`). Si falta una columna, la app lo dice con su nombre.

| Hoja | Columnas |
|---|---|
| **Alumnos** | ID alumno, Foto, Nombre, Apellidos, Máster, Promoción, Nacionalidad principal, Nacionalidad secundaria, Situación de trabajo en España, Área de experiencia, Resumen de experiencia, Área a la que quiere ir, Por qué, Enlace al CV, Notas de entrevista, Fecha última entrevista, Disponibilidad. |
| **Ofertas** | ID oferta, Empresa, Tipo de organización, Área, Título del puesto, Tipo, Ubicación, Requisito de nacionalidad, Requisito de permiso de trabajo, Fecha de recepción, Estado de la oferta, Enlace o descripción. |
| **Rondas** | Una fila cada vez que una oferta se reenvía a los alumnos: ID ronda (R001…), ID oferta, Número de ronda, Fecha de envío a los alumnos. |
| **Aplicaciones** | Una fila por alumno + oferta + ronda: ID aplicación (AP001…), ID alumno, ID oferta, Número de ronda, Fecha de aplicación, Estado, Motivo de descarte, Notas. Si un alumno aplica en dos rondas de la misma oferta, salen dos filas. |
| **Historial** | Una fila por cada cambio de estado: ID cambio (H001…), ID aplicación, Estado anterior, Estado nuevo, Motivo de descarte, Fecha, Nota. Solo se añaden filas: no se edita ni se borra. |
| **Listas** | Una columna por lista de valores: **Programa** (la app acepta también la cabecera antigua «Máster»), Área, Tipo de organización, Nacionalidad, Situación de trabajo en España, Tipo de oferta, Estado de la oferta, Disponibilidad, Requisito de permiso, **Estado de la aplicación** (Recibida, En revisión, Enviada a la empresa, Entrevista, Contratado, Descartado) y **Motivo de descarte** (Perfil no encaja, Permiso de trabajo, La empresa eligió a otro, Otro). Además, dos columnas **opcionales** que van en la **misma fila** que su programa: **Categoría del programa** y **Idioma del programa** (`en`/`es`). |

**Hojas y columnas del match (v25, todas opcionales).** Cinco hojas nuevas que el script solo **lee** (`HOJAS_MATCH` en `Code.gs`): **Países** (País, Grupo: UE, EEE, Suiza, Resto; más la fila «Unión Europea (UE/EEE)» con grupo «Grupo de países»), **Áreas** (Área, Subárea y, opcional, **Área (inglés)**: la app la lee aunque falte la tilde o cambien las mayúsculas, y la usa solo en el correo en inglés; sin ella se queda el nombre en español. El script no cambia: ya devuelve la hoja entera), **Afinidad** (Área A, Área B, Nivel: Directa, Afín, Lejana), **Reglas migratorias** (Situación de trabajo, Tipo de oferta, País o grupo de la oferta, Resultado, Motivo, Fecha de validación) y **Etiquetas** (la lista cerrada de habilidades). Y columnas **al final** de Alumnos (Etiquetas, Idiomas, Formación previa, Subáreas de experiencia) y de Ofertas (País de la oferta, Subárea, Etiquetas, Idiomas, Nivel de formación). La app las lee con `ALUMNO_OPC`, `OFERTA_OPC` y `HOJAS_MATCH` (`js/data/esquema.js`): si faltan, quedan vacías y el match las trata como «sin datos»; un script antiguo no envía `match` y la app usa las reglas de respaldo del código. Listas **no cambia**. Los CSV para importarlos están en `docs/importar-hoja/` (con `PASOS.md`) y son idénticos a los de `datos-mock/`.

**Perfil del puesto (v26).** `guardarOferta` pasa de 11 a **16 campos**: los 5 del perfil (`paisOferta`, `subarea`, `etiquetas`, `idiomas`, `nivelFormacion`) son **opcionales en la petición** (una app anterior no los envía y entonces no se tocan) y en el Sheet (si falta la columna y el valor está vacío, se omite; con valor, error `columna`). El script anuncia `perfilOferta` en `soporta`; la app solo envía el perfil si lo ve (`soportaPerfilOferta()` en `js/data/index.js`). Las hojas Países, Áreas y Etiquetas se **leen** en cada guardado (`leerApoyo`); sin la hoja, vacía o sin su columna, el campo se valida solo como texto. Al editar, un valor de perfil o de nacionalidad **sin cambios** no se compara con las listas. La nacionalidad se valida contra **Países (con filas de grupo) ∪ Listas > Nacionalidad**. La historia por plantillas (`js/util/historia.js`) lee solo seis campos (`CAMPOS_HISTORIA`) y sale solo con la casilla «Incluir historia» de Compartir.

Las hojas de rondas son **opcionales para la app**: si no existen en el Sheet, el script no las envía y la app funciona como antes (y explica qué falta). Los estados "Recibida" y "Descartado" tienen significado fijo (cómo nace una solicitud y cuándo lleva motivo); el resto de estados y motivos se pueden editar en Listas.

Las pantallas solo usan los nombres internos (`nombre`, `areaDestino`, `estado`…). Una fuente nueva solo tiene que devolver objetos con esas claves.

### 2.4 Match y compartir perfiles

Todo es **lectura y cálculo en el navegador**: no hay acciones nuevas en el script ni peticiones nuevas (usa las mismas `getAlumnos`, `getOfertas`, `getListas`, `getAplicaciones` de la capa de datos), así que no se ve afectado por la migración a Microsoft Graph.

- **`js/util/match.js`** (funciones puras; reglas exactas en [REGLAS-MATCH.md](REGLAS-MATCH.md)). `evaluar(alumno, oferta, ctx)` devuelve **8 criterios** `{ id, grupo, estado: 'ok' | 'revisar' | 'no', texto, peso, factor, sinDatos?, noAplica? }`, una `puntuacion` (`{ puntos, maximo, porcentaje, evaluados, sinDatos, incompleto }`) y una categoría (`encaja`, `reservas`, `no`) que deciden **solo los 4 criterios básicos** (área, tipo, nacionalidad, permiso). Un criterio **sin datos** (`sinDatos`) o que **no aplica** tiene `factor: null`: no entra en los puntos ni en el máximo, y un sin datos nunca es `no`. `ctx` es el contexto que sale de las hojas del Sheet (`crearContexto`; `contextoDe(listas)` lo calcula una vez); sin él (`CONTEXTO_VACIO`) se usan los respaldos del código (lista de países UE/EEE, reglas de permiso de siempre, sin Afinidad, Áreas ni Etiquetas). Una fila de las hojas con un valor que no existe se **ignora** y queda en `ctx.problemas` (la tarjeta lo avisa). `emparejar` y `ofertasParaAlumno` devuelven **todos** los elementos, ordenados (grupo, puntuación, más criterios con datos, nombre); nunca filtran. `avisosRequisitos` (que `rondas.js` reexporta) usa los mismos criterios de requisito y el mismo `ctx`, para que los avisos de «Añadir solicitud» y el match no se contradigan; los avisos de «aplica a todo» (`calcularAvisos`) también reciben el `ctx`.
- **Unión Europea y países.** Una oferta puede pedir el valor `Unión Europea (UE/EEE)` (fila de la lista Nacionalidad). La fuente de verdad de los países es la hoja **Países**; la lista de `match.js` (27 + «Chequia» + Islandia, Liechtenstein y Noruega) es solo el **respaldo** si la hoja no existe, y una prueba exige que esté escrita **igual** que la hoja y que Listas > Nacionalidad. Suiza queda fuera a propósito y se trata como «a revisar». Un país que no está en la hoja es **desconocido**: «sin datos», nunca «no cumple».
- **Reglas migratorias.** `buscarRegla` elige la fila de la situación más concreta (país > grupo > cualquiera, y a igual, la que nombra el tipo de oferta). Una regla validada hace más de 12 meses (`MESES_VIGENCIA`) se avisa y un «Cumple» pasa a «Revisar». Las pruebas fijan «hoy» (`crearContexto(datos, { hoy })`); las de pantalla usan la fecha real, así que **las reglas de `datos-mock/ReglasMigratorias.csv` (validadas el 2026-11-01) hay que renovarlas antes del 2027-11-01** (`match-datos.prueba.mjs` lo avisa con un mensaje claro).
- **`js/vistas/match.js`.** Las tarjetas «Alumnos que encajan» (ficha de la oferta, con casillas para elegir hasta 10) y «Ofertas que encajan» (ficha del alumno). Tres grupos plegables y «Ver más» de 15 en 15; cada fila lleva su puntuación («Encaje 82 %», «datos incompletos») y un «Por qué» con los 8 criterios (símbolo, nombre, palabra —Cumple, Revisar, No cumple, Sin datos o No aplica— y sus puntos; nunca solo color). El aviso fijo «Orientativo, verifica la situación real» está arriba de la tarjeta y dentro de cada «Por qué».
- **`js/util/compartir.js`.** Arma el texto. Solo lee campos de una lista cerrada; las notas de entrevista, el historial, los motivos de descarte y el «por qué» **no están en la lista**, así que no pueden salir. Cada dato va en una sola línea (un nombre con saltos de línea no puede inventar otro perfil), el enlace al CV solo si es `https`, y como mucho 10 perfiles.
- **`js/vistas/compartir.js`.** Ruta `#/oferta/ID/compartir` (los alumnos elegidos viven solo en memoria: al recargar hay que volver a elegirlos) y `#/alumno/ID/compartir` (el alumno va en la dirección). La vista previa es el **mismo texto** que recibe `navigator.share` y `navigator.clipboard.writeText` (una prueba lo comprueba), con respaldo `execCommand('copy')`. Si el navegador no tiene menú de compartir, el botón queda desactivado y se usa «Copiar». No se guarda nada: ni lo marcado ni lo compartido.
- **Pendiente antes de datos reales:** registro de lo compartido y consentimiento (ver §6, punto 13).

### 2.4 bis Programas agrupados (v23)

- **Dónde viven.** En la hoja Listas, no en el código: columna `Programa` (o `Máster`, que la app sigue aceptando), `Categoría del programa` e `Idioma del programa`. **No se toca el script**: `leerListas()` ya devuelve cualquier columna por su cabecera. El orden de las filas es el orden en Inicio, y el de las categorías, el de su primera aparición.
- **`js/data/tablas.js`.** `aListas(tabla, esquema, alias)` busca la columna de programas por «Programa» y, si no está, por «Máster». Devuelve `listas.programas = [{ nombre, categoria, idioma }]` (cada programa con lo que hay en SU fila; los repetidos cuentan una vez) y mantiene `listas.masters` como antes.
- **`js/data/index.js`.** `getMasters()` devuelve `{ nombre, categoria, idioma, enLista, alumnos }`: primero los de Listas (con 0 alumnos también) y, al final, los programas que algún alumno tiene y NO están en Listas (`enLista:false`).
- **`js/util/programas.js`.** `agruparProgramas()` (pura) hace las secciones. Un programa sin categoría o fuera de Listas va a «Otros programas», que sale al final y solo si hace falta.
- **`js/vistas/inicio.js`.** Una sección por categoría con el desplegable común. Empieza abierta la primera (y «Otros programas»); lo que la persona abre o cierra se recuerda en el móvil (`gad.inicio`, solo los nombres de las categorías abiertas).
- **Avisos (v24).** Van debajo de los programas (Inicio y lista del programa) con la clase `.aviso-alerta` (fondo `--act-bg`, texto `--act-fg`, negrita; 4,59:1); la ficha usa el mismo estilo. La lista del programa y la ficha del alumno dicen que el programa «no está en la hoja Listas» cuando es el caso. La app no falla.
- **Idioma del borrador (`js/util/correo.js`).** 1) columna `Idioma del programa` (en/es, English, Inglés, Español); 2) si está vacía o no se entiende, la palabra entera «inglés» o «English» en el nombre del programa; 3) español. El programa solo sirve para elegir el idioma: no aparece en el texto.
- **Pintar pantallas (v24).** Siempre con `reemplazar(contenedor, ...hijos)` de `js/util/dom.js`, que ignora `false`, `true`, `null`, `undefined` y el texto vacío. `replaceChildren` a pelo escribe un `false` como la palabra «false»; no se usa fuera de `dom.js` (una prueba lo exige).
- **Textos.** Lo que se ve dice «programa»; el campo interno sigue llamándose `master` y la ruta `#/master/<nombre>`, para no romper enlaces ni la hoja Alumnos (columna `Máster`).

### 2.5 Avisos de alumnos y borradores de correo (Fase 3, paquete 3A)

Todo es **cálculo y texto en el navegador**: no hay acciones nuevas en el script ni en el Sheet, ni peticiones nuevas (usa `getAlumnos`, `getOfertas`, `getRondas` y `getAplicaciones`), así que tampoco se ve afectado por la migración a Microsoft Graph.

- **`js/util/avisos.js`** (funciones puras). `calcularAvisos({ alumnos, ofertas, rondas, aplicaciones, hoy, umbrales })` devuelve `{ periodo, avisos }`; cada aviso es `{ id: 'A001|sin-solicitudes', tipo, idAlumno, motivo }` y el motivo lleva los números y la regla. «Sin solicitudes»: ofertas difundidas ≥ M y ninguna solicitud en el periodo. «Aplica a todo»: solicitudes ≥ S y ofertas distintas solicitadas / difundidas ≥ P %. El periodo es `[hoy − N días, hoy]` recortado a la primera ronda; se trabaja con texto `AAAA-MM-DD` (sin horas ni zonas horarias). Además: `validarUmbrales` (enteros entre límites, con códigos `vacio`, `entero`, `rango`), `umbralesSaneados` y las funciones de silencio (`estaSilenciado`, `repartir`).
- **`js/util/preferencias.js`.** `localStorage` con tres claves: `gad.avisos` (umbrales; no se guarda si son los de por defecto), `gad.firma` y `gad.silencios` (`{ "A001|sin-solicitudes": "2026-12-12" }`). Todo lo leído se sanea; si no hay almacenamiento (navegación privada) nada falla y guardar devuelve `false` (las pantallas lo dicen).
- **`js/vistas/avisos.js`, `ajustes-prefs.js`.** La tarjeta de Inicio (se repinta al volver a Inicio), la pantalla por tipo (`#/avisos/<tipo>`), la etiqueta de la lista del máster, la tarjeta de la ficha y las tarjetas de Ajustes (sin `<form>`, para no cruzarse con las pruebas y formularios que usan `form button[type=submit]`).
- **`js/util/correo.js`.** `borradorCorreo({ alumno, oferta, aplicacion, idioma, firma })` → `{ tipo, idioma, asunto, cuerpo, faltaFirma }` o `null` si el estado no tiene borrador. **Solo lee** `alumno.nombre`, `oferta.empresa`, `oferta.titulo`, `oferta.area` y `aplicacion.estado`. Cada dato se reduce a una línea (se quitan los caracteres de control y los separadores de línea Unicode) y a 120 caracteres como mucho. `enlaceCorreo` devuelve `mailto:?subject=…&body=…` con todo codificado (saltos como CRLF) o `null` por encima de 1.800 caracteres.
- **`js/vistas/correo.js`.** Ruta `#/aplicacion/ID/correo`. La vista previa es el **mismo texto** que va al portapapeles y al enlace de correo (una prueba lo comprueba).
- **Barra de estado (`index.html`).** `apple-mobile-web-app-status-bar-style` vale `black` (v22, experimento). Hay una sola etiqueta y un comentario `ESTILO_BARRA` con cómo revertir (`black-translucent`); una prueba lo exige. La cabecera suma `env(safe-area-inset-top)` (`--sat`), así que con `black` el margen pasa a 0 y con `black-translucent` vuelve a valer lo de antes sin tocar CSS. Solo se ve al reinstalar el icono.
- **Desplegables (`js/vistas/desplegable.js`, `js/vistas/plegable.js`).** `desplegable(props, summary, …cuerpo)` crea el `<details class="desplegable">` y mantiene `aria-expanded` en el `<summary>` con el evento `toggle` (asíncrono: las pruebas esperan un instante). La flecha estándar que gira y la zona de 44 px las pone el CSS (`.desplegable>summary`), una sola vez; ninguna zona define su propia flecha. Lo usan los grupos del match, «Por qué», los filtros de Buscar y Ofertas y `plegable({ id, clave, idTitulo, titulo }, …contenido)`, que añade a las secciones de Ajustes el recuerdo en `localStorage` (`gad.ajustes`, lista de claves abiertas; por defecto solo `conexion`). Una prueba exige que solo `desplegable.js` cree `<details>`. Ojo: el navegador no da medidas útiles a lo que hay dentro de un `<details>` cerrado.
- **Copiar (`copiarTexto` en `js/util/trabajo.js`).** Única función que toca el portapapeles. Escribe solo `text/plain` desde una cadena (`ClipboardItem` → `writeText` → `textarea` oculto). Una prueba comprueba, leyendo el código, que ningún otro archivo usa `navigator.clipboard` ni `execCommand`.

---

## 3. Cómo se conecta (la capa de datos)

`js/data/index.js` es la única puerta. Estas son sus funciones públicas:

| Función | Qué hace |
|---|---|
| `getAlumnos()`, `getOfertas()`, `getListas()`, `getMasters()`, `getRondas()`, `getAplicaciones()`, `getHistorial()`, `hayRondas()` | Leer. |
| `guardarEntrevista(id, notas, fecha, base)` | Escribir las 2 celdas de entrevista de un alumno. |
| `guardarOferta(id, oferta, anteriores)` | Crear (sin `id`) o editar una oferta. |
| `registrarRonda(idOferta, numero, fecha)` | Registrar que una oferta se reenvía a los alumnos. |
| `crearAplicacion(datos)` | Un alumno aplica a una ronda (nace "Recibida" con su primera línea de historial). |
| `cambiarEstado(id, cambio, anterior)` | Cambiar el estado de una solicitud y apuntarlo en el historial. |
| `conectar`, `usarDemo`, `olvidarAcceso`, `getModo` | Acceso. |
| `puedeEscribir`, `puedeEscribirOfertas`, `puedeEscribirRondas` | Qué permite la conexión actual. |

**Dos fuentes:**

- **demo** (`fuente-csv.js`): lee los CSV de `datos-mock/`. Solo lectura.
- **script** (`fuente-apps-script.js`): habla con Google. No hay vuelta automática a la demo si falla: se muestra el error, para no mezclar sin avisar datos de prueba con la demo.

**Cómo es una petición al script:**

- `POST` a la dirección del script (`https://script.google.com/macros/s/…/exec`), con cuerpo JSON en texto plano (`Content-Type: text/plain`), para que el navegador no haga una petición previa (Apps Script no la admite).
- El cuerpo lleva `action` y `key` (la clave). **La clave solo va en el cuerpo, nunca en la dirección.** Sin cookies (`credentials: 'omit'`) y sin cabecera de origen (`no-referrer`).
- Acciones: `ping`, `data`, `guardarEntrevista`, `guardarOferta`, `registrarRonda`, `crearAplicacion`, `cambiarEstado`.
- Tiempo máximo de espera: 25 segundos.
- La respuesta incluye `version` (la app exige que sea 1) y `soporta` (qué acciones de escritura sabe hacer ese script). Si el script es antiguo y no anuncia `guardarOferta`, la app no enseña los botones de ofertas y lo explica. Con las rondas pasa igual: el script solo anuncia `registrarRonda`, `crearAplicacion` y `cambiarEstado` si existen las 3 hojas, y la app solo enseña sus botones si las anuncia las tres.
- Los errores son códigos cortos (`clave`, `bloqueado`, `conflicto`, `lista`, `requerido`, `largo`…). Los textos para la persona están en la app, no en el script.

**Los datos solo están en memoria.** Nunca se guardan en el teléfono. En el teléfono (`localStorage`) solo quedan la dirección del script, la clave y el modo elegido.

**Concurrencia:**

- El script usa un cerrojo (`LockService`) para atender una petición de escritura cada vez.
- **Conflictos:** al editar, la app envía también lo que creía que había (`notasAnteriores` o `anteriores`). Si el Sheet ya no coincide, el script no escribe nada y devuelve `conflicto` con lo que hay. La app lo enseña y deja elegir. En ofertas, "Guardar mi versión" guarda solo los campos que tocó la persona y conserva lo que cambió la otra.
- **Altas sin duplicar (ofertas):** si la conexión se corta justo al crear una oferta, la app no sabe si llegó. Al reintentar, primero vuelve a leer el Sheet y busca una oferta nueva idéntica; si existe, no la crea otra vez.
- **Rondas y solicitudes:** aquí el script lo resuelve solo. Una ronda se pide con el número que la app propone (la siguiente a la última): si ya no lo es, el script responde `conflicto` con la ronda existente y, si tiene la misma fecha, la app entiende que ya estaba guardada. Una solicitud nueva responde `duplicado` (con la existente) si ya está esa combinación alumno + oferta + ronda. Un cambio de estado lleva el estado y el motivo que la app creía que había (`anterior`); si no coinciden, `conflicto` con la solicitud como está, y se deja elegir entre "Guardar mi versión" y "Quedarme con la actual". Si la otra persona hizo exactamente el mismo cambio, no hay nada que decidir.
- **Reintentos automáticos** (`llamarScript` en `fuente-apps-script.js`): si la petición no recibe respuesta (`red`), se repite **una vez** tras 0,6 s (un móvil que lleva rato quieto puede tener la conexión con Google "dormida" y fallar la primera vez); si el script responde `ocupado` (no llegó a escribir nada), se repite hasta **2 veces** con esperas de 1,5 y 3 s. Repetir es seguro porque todo lo que se guarda se reconoce si ya estaba (`duplicado`, conflicto idéntico, ronda con la misma fecha), **salvo el alta de una oferta**, que no se reintenta sola (se comprueba al pulsar Guardar otra vez, como antes). Los mensajes dicen cuántos intentos se hicieron.
- **Nombres:** en la app se dice **solicitud**; en el Sheet la hoja sigue llamándose **Aplicaciones**, la lista **Estado de la aplicación** y en el código y el script `aplicacion`. Las pantallas solo cambian el texto que se ve.
- **Pantalla completa en iPhone:** `#app` es `position:fixed` con `top/bottom/left/right:0` (no depende de `dvh`, que en una app instalada puede quedarse corto); la barra de pestañas suma `env(safe-area-inset-bottom)` a su relleno; el fondo de `html` es el de la barra, para que no asome ninguna franja de otro color; `viewport-fit=cover`. Chromium no tiene "safe area": `pantalla.prueba.mjs` la simula dándole a `--sab`, `--sat`, `--sal` y `--sar` el valor de un iPhone.
- **Después de guardar:** `llevarA()` (en `js/util/trabajo.js`) desplaza la pantalla con suavidad (o sin animación si el móvil pide menos movimiento) hasta el mensaje; no da foco a ningún cuadro, para no abrir el teclado.
- **Botones ocupados:** todo botón que llama al script (Guardar, "Guardar mi versión", "Quedarme con la actual"…) se desactiva al pulsarlo y dice "Guardando…" o "Cargando…" (`ocupar` en `js/util/trabajo.js`): una segunda pulsación no lanza otra petición. "Quedarme con la actual" recarga todos los datos (una sola petición) porque el script solo ofrece `data`; pedir solo Solicitudes e Historial exigiría una acción nueva en `Code.gs`.
- **Dos hojas a la vez:** crear una solicitud escribe en las hojas Aplicaciones y Historial, y cambiar un estado también. Google Sheets no tiene transacciones: el script **deshace lo ya escrito si falla la segunda escritura**, para no dejar una solicitud sin su historial. Está probado haciendo fallar cada una de las escrituras.

---

## 4. Qué puede escribir (permisos del script)

| Hoja | Puede | No puede |
|---|---|---|
| Alumnos | Escribir **solo** "Notas de entrevista" y "Fecha última entrevista" de un alumno cada vez. | Crear ni borrar alumnos. Tocar otra celda. |
| Ofertas | **Añadir una fila** (el ID lo genera el script: O011, O012…) o editar las 16 columnas de una oferta (11 + 5 del perfil del puesto). | Borrar filas. (Una oferta se cierra cambiando su estado.) |
| Rondas | **Añadir filas** (ID R001…, número de ronda calculado por el script). | Editar o borrar filas. |
| Aplicaciones | **Añadir filas** (ID AP001…) y cambiar **solo** las celdas "Estado" y "Motivo de descarte" de una solicitud. | Borrar filas. Cambiar otra columna (alumno, oferta, ronda, fecha, notas). |
| Historial | **Añadir filas** (ID H001…). | Editar o borrar filas. |
| Listas | Solo leer. | Escribir. |

Cada valor escrito se guarda como **texto plano** (formato de celda texto). Si un texto empieza por `=`, `+`, `-` o `@`, el script le añade un espacio delante para que el Sheet no lo lea como fórmula.

**Validaciones** (las aplican a la vez el script y la app; la del script es la que vale):

- Notas: hasta 2.000 caracteres, sin HTML, sin caracteres de control, fecha real y no futura.
- Rondas y solicitudes: el alumno, la oferta y la ronda tienen que existir; la fecha es real, no futura y no anterior a la de la oferta, la ronda o el último movimiento; el estado y el motivo tienen que estar en Listas; "Descartado" exige motivo y cualquier otro estado no lo admite; las notas, hasta 2.000 caracteres, sin HTML ni caracteres de control. Una oferta cerrada se admite (la app avisa).
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
| **Enlaces:** solo `https://` se abre, en otra pestaña y sin enviar de dónde vienes, y sin usuario ni contraseña dentro de la dirección. `http:`, `javascript:` y similares se muestran como texto. Un único validador (`js/util/enlaces.js`) lo decide para el CV, las ofertas y compartir perfiles. | `js/util/enlaces.js`, `ofertas.js`, `cv.js`, `compartir.js` |
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
6. **El script crea filas** en la hoja Ofertas y en las de rondas, solicitudes e historial (antes solo escribía dos celdas). Hay que hacer copia de seguridad del Sheet antes de usarlo.
7. **CV y fotos.** La clave no los protege: sus enlaces tendrían que ser privados.
   - **Solicitudes y descartes.** Quién fue descartado y por qué (por ejemplo, "Permiso de trabajo") es más sensible que una nota de entrevista. Hoy lo ve cualquiera con la clave. Con datos reales exigiría permisos por rol y revisión de protección de datos (ver 10.4).
8. **Sin historial propio de cambios.** Si algo se pisa por error, solo sirve el historial de versiones de Google Sheets.
9. **Historial de Git.** Siguen escritos en él tres enlaces antiguos del Sheet cuando estuvo publicado. Ya no funcionan (Google responde 401) y la clave y la dirección del script nunca estuvieron en el repositorio. Se decidió no reescribir el historial.
10. **CSP en una etiqueta `<meta>`.** Es una limitación de GitHub Pages: no se pueden poner cabeceras HTTP. Una etiqueta meta no puede imponer, por ejemplo, `frame-ancestors`.
11. **Sin conexión, en modo script, no se ven datos** (por diseño: no se guardan en el teléfono). Solo la demo funciona sin conexión.
12. **La primera petición tras un rato sin usar** el script puede tardar 1 a 3 segundos. En un iPhone, además, la primera petición tras un rato quieto puede perderse sin llegar a Google: la app la repite sola una vez (ver §3). No se ha podido reproducir en el simulador; la causa más probable es una conexión "dormida" y se comprueba a mano en el iPhone.
13. **Compartir perfiles.** El texto sale de la app (menú de compartir o portapapeles) y **ya no se puede recuperar ni controlar**: quien lo recibe puede reenviarlo. **La app no guarda un registro de lo compartido** (quién, qué perfiles, cuándo, a quién): registrarlo exigiría escribir en el Sheet, y se decidió no hacerlo en este paquete. **Requisito previo a usar datos reales**, junto con el consentimiento de cada persona (ver 10.4). Mitigaciones actuales: vista previa obligatoria, datos sensibles desmarcados y avisados, máximo de 10 perfiles y nunca notas, historial ni descartes.
14. **Match por nacionalidad y permiso.** Puede discriminar si se usa para descartar. Hoy solo ordena y explica, no oculta a nadie, y los datos que faltan son «a revisar». Con datos reales, revisarlo con protección de datos.

---

## 7. Pruebas

| Qué | Comprobaciones | Cómo ejecutarlas |
|---|---|---|
| El script (`Code.gs`) contra un simulador de Google | 439 | `node tests/apps-script/pruebas.mjs` |
| La app en un navegador real: acceso y clave | 72 | `npm install` (una vez, en la raíz), `npm test` (todas las pruebas y la del script, con resumen) |
| La app: notas de entrevista | 63 | (incluido en `npm test`) |
| La app: lista y ficha de ofertas | 106 | (incluido en `npm test`) |
| La app: formulario de ofertas | 123 | (incluido en `npm test`) |
| La app: funciones puras de rondas (orden, resúmenes, avisos y validación) | 71 | (incluido en `npm test`) |
| La app: funciones puras del match (UE/EEE, Suiza, estudiante, afinidad, categorías, nunca oculta, avisos coherentes) | 71 | (incluido en `npm test`) |
| La app: pantallas del match (alumnos y ofertas que encajan, "Ver más", orden y etiquetas en Añadir solicitud, con y sin la fila UE, 320 px, puntuación y los 8 criterios) | 56 | (incluido en `npm test`) |
| La app: lectura de las hojas y columnas nuevas del match (opcionales, vacías, raras; reglas mock vigentes) | 22 | (incluido en `npm test`) |
| La app: reglas del match (pesos, sin datos que no suma ni es «no cumple», etiquetas con lista cerrada, idiomas, formación, afinidad, reglas migratorias y su vigencia, países, datos vacíos, orden) | 138 | (incluido en `npm test`) |
| La app: casos del match con los datos mock (10 ofertas × 30 alumnos: grupos, primeros y semáforo de 13 casos) | 53 | (incluido en `npm test`) |
| La app: el match en pantalla (puntuación, «datos incompletos», aviso fijo, hojas que faltan o con filas raras, regla vieja) | 37 | (incluido en `npm test`) |
| La app: CSV para importar al Sheet (iguales a los de la demo, columnas con su nombre exacto, todo lo usado está en las listas, todo en `sw.js`) | 36 | (incluido en `npm test`) |
| La app: compartir perfiles (texto, "canarios" que nunca deben salir, vista previa = lo que se envía, Compartir, Copiar, sin menú, 320 px) | 81 | (incluido en `npm test`) |
| La app: enlaces (solo https y sin usuario@, el CV, las ofertas y compartir usan el mismo validador; 3 roturas a propósito detectadas) | 60 | (incluido en `npm test`) |
| La app: lectura de rondas y solicitudes | 108 | (incluido en `npm test`) |
| La app: registrar rondas, añadir solicitudes y cambiar su estado | 156 | (incluido en `npm test`) |
| La app: fallos al guardar (primer intento fallido, script ocupado, doble pulsación, botones "Guardando…", aviso flotante, pantalla que sube tras guardar) | 68 | (incluido en `npm test`) |
| La app: pestaña Ajustes, versión, buscar actualización y lista de archivos del service worker | 37 | (incluido en `npm test`) |
| La app: textos (vocabulario "solicitud", botones del conflicto, aviso de demostración) y que nada se salga a 320 px | 39 | (incluido en `npm test`) |
| La app: pantalla completa en iPhone (cuatro modelos, con y sin barra de inicio, vertical y horizontal; colores de `theme-color`, manifest, `html` y `body`; barra de estado `black`) | 128 | (incluido en `npm test`) |
| La app: Ajustes plegables (solo «Conexión» abierta, aria-expanded sin texto, se recuerda, teclado, datos guardados rotos, sin almacenamiento, 320 px) | 41 |
| La app: desplegable común (un solo componente, flecha que gira, 44 px, aria-expanded, en Ajustes, match, «Por qué» y filtros, 390 y 320 px) | 104 | (incluido en `npm test`) | (incluido en `npm test`) |
| La app: Copiar solo en texto plano (el código, un único `text/plain`, los tres respaldos, sin enlaces ni HTML, portapapeles real, primera línea sin «palabra:») | 52 | (incluido en `npm test`) |
| La app: cálculo de avisos y preferencias (bordes de fechas y umbrales, primera ronda, contratados, silencios, almacenamiento roto o ausente; sin navegador) | 98 | (incluido en `npm test`) |
| La app: Ajustes de avisos y firma (validación, errores por campo, Enter, sin almacenamiento, 320 px) | 66 | (incluido en `npm test`) |
| La app: avisos en pantalla (Inicio, lista, silenciar, máster, ficha, paso del tiempo, 320 px; con el reloj fijado) | 50 | (incluido en `npm test`) |
| La app: borradores de correo (texto es/en, «canarios» que nunca deben salir, enlace `mailto:` sin cabeceras colables, pantalla, Copiar, 320 px) | 110 | (incluido en `npm test`) |

- Las pruebas ejecutan **el mismo `Code.gs`** que se pega en Apps Script, dentro de un simulador. No tocan ningún Sheet de Google de verdad ni llevan claves ni direcciones reales: todo es inventado.
- Se complementan con **pruebas de mutación manuales**: se estropea a propósito una regla (por ejemplo "no comprobar duplicados") y se verifica que las pruebas fallan. Se han hecho con el script (16 variantes de entrevistas y ofertas (1 equivalente) y 34 de rondas; todas detectadas salvo una equivalente) y con la app (25 de entrevistas y ofertas, 29 de la lectura de rondas y 39 de su escritura (3 equivalentes), todas detectadas). En el paquete de correcciones: 32 variantes sobre fallos al guardar (31 detectadas; la que queda, `preventScroll` al volver el cursor al buscador, solo se nota en un iPhone) y 23 sobre Ajustes y versión (todas detectadas). En el paquete de pulido: 26 variantes sobre textos, desplazamiento tras guardar y pantalla completa (todas detectadas; ese cursor ya no se mueve, así que la variante de `preventScroll` desapareció). En el paquete de match y compartir: 32 variantes sobre las reglas del match (UE/EEE, Suiza, estudiante, categorías, orden, que nunca oculte a nadie), las pantallas y el texto compartido (CV solo `https`, notas que no deben colarse, máximo de 10, vista previa igual a lo enviado, datos sensibles desmarcados). Se detectaron 31; la que queda es equivalente (el botón «Compartir» se desactiva sin menú de compartir en dos sitios del código a la vez). Tres sobrevivieron al principio y se añadieron pruebas para ellas.
- **Fase 3 (v20):** 27 variantes sobre los avisos (bordes de fecha y de cada umbral, primera ronda, contratados, solicitudes sin fecha, silencio, claves de silencio, firma, rangos), los borradores (motivo, apellidos y situación de trabajo que no deben colarse, codificación del enlace, estados en proceso, idioma por defecto, Copiar igual a la vista previa, aviso de privacidad, botón en «Contratado») y las pantallas (silenciar, marca en la lista, Inicio al volver, firma, diagnóstico). **Se detectaron las 27.** **Fase 3, v21:** 17 variantes sobre «Copiar» (un tipo extra, textarea sin quitar, respaldos, texto distinto a la vista previa), los plegables (abiertas por defecto, no se recuerda, estado en texto, nombres raros, lista vacía), el interruptor de prueba (no se apaga solo, se guarda, empieza activado, no devuelve la altura) y los colores de la franja. Una sobrevivió (nombres raros guardados, que solo se notan al volver a guardar) y se añadió una prueba; **se detectaron las 17**. **Fase 3, v22:** 4 variantes sobre la primera línea de lo copiado («Asunto:» de vuelta), 8 sobre el desplegable (sin `aria-expanded`, una zona con `<details>` propio, flecha que no gira, cabecera baja, triángulo del navegador, texto «Abierto» de vuelta, Ajustes sin recordar) y 6 sobre la franja (barra translúcida, sin `ESTILO_BARRA`, dos etiquetas, interruptor de vuelta, cabecera sin margen superior). **Se detectaron todas** (una mutación sobre el texto de reserva «no hay» del Diagnóstico es equivalente: la etiqueta siempre existe; una prueba de «triángulo» sobre el estilo calculado no servía en Chromium y se cambió por una lectura del CSS).
- **Fase 3D (v23):** programas reales. `programas-datos.prueba.mjs` (21; sin navegador: cabecera «Programa»/«Máster», categoría e idioma en la misma fila, repetidos, agrupar, «Otros programas» y que todo módulo de `js/` esté en `sw.js`), `programas.prueba.mjs` (57: los 14 programas en Inicio también con 0 alumnos, 4 secciones con el desplegable común y su estado recordado, un programa con «/» o «&», un programa desconocido y una hoja Listas sin categorías, también desde el script) y 13 comprobaciones nuevas del idioma del borrador en `correo.prueba.mjs`. Se hicieron **20 roturas a propósito** (programas con 0 alumnos, programas desconocidos, cabecera «Máster», orden de categorías, «Otros» al principio, desplegable común, estado recordado, primera sección abierta, avisos de la lista y de la ficha, pie, «Programa» en Compartir, columna de idioma, respaldo por nombre, palabra entera, lista de programas en el correo, «Global Sports Marketing» por el nombre, `sw.js`, texto del aviso) y **las 20 las detecta alguna prueba**. El bloque Diagnóstico y sus pruebas se quitaron.
- **Fase 3E (v24):** `pantallas-sin-basura.prueba.mjs` (47: nadie usa `replaceChildren` a pelo, `reemplazar()` ignora lo que no es contenido y ninguna de unas 40 pantallas, conectadas o no, con un programa desconocido o no, enseña «false», «true», «null», «undefined» o «NaN» como texto) y 5 comprobaciones nuevas en `programas.prueba.mjs` (aviso debajo, rojo de acento y contraste de al menos 4,5:1 en Inicio, lista y ficha). **11 roturas a propósito, las 11 detectadas.**
- **Fase 3E-1 (v25):** 27 variantes sobre el match nuevo (un «sin datos» que suma o que sale «no cumple», pesos que no suman 100, un país desconocido que se da por conocido, una regla de estudiante que pasa a «no cumple», un país UE mal escrito en el código o en la hoja Países, la vigencia de 12 meses y su aviso, el dato contradictorio, la regla general para un país desconocido, una pareja de áreas sin Afinidad, etiquetas fuera de la lista, un rojo de perfil que manda a «No encaja», el orden sin puntuación, una columna nueva que falta, el script sin las hojas de reglas, un CSV que falta en `sw.js` o que difiere del de la demo, el aviso fijo, «sin datos» y «datos incompletos» en pantalla, lo legal primero en el resumen y los avisos sin el contexto de reglas), **todas detectadas**.
- **Fase 3E-2 (v26):** `tests/apps-script/pruebas.mjs` (bloque 26b: perfil de 16 campos, ofertas con y sin perfil, petición de 11 campos de una app antigua, validación contra Países, Áreas y Etiquetas, idiomas con formato, hojas de apoyo ausentes o vacías, columnas del perfil ausentes, nacionalidad = Países ∪ Listas, valores antiguos que no se tocan al editar), `ofertas-perfil.prueba.mjs` (formulario con perfil, avisos, hojas ausentes, script anterior sin `perfilOferta`, y una oferta creada desde la app que aparece bien en el match, sin recargar y recargando) y `historia.prueba.mjs` (la plantilla, qué campos lee —con un `Proxy` que lo anota—, que el código no nombra ningún campo sensible, la casilla desmarcada y **canarios** de situación migratoria, notas de entrevista, historial, motivos de descarte y «Por qué» que no pueden salir ni marcando todo). **28 roturas a propósito (validar o no etiquetas, país, subárea, idiomas y nivel; la nacionalidad solo contra Listas; un grupo como país; no anunciar perfilOferta; rechazar lo que no se toca; perfil obligatorio en la petición; columnas ausentes; cambios ajenos sin el perfil; fórmulas; hoja de apoyo vacía; la historia con «Por qué», situación migratoria o notas; la casilla marcada de serie o ignorada; enviar el perfil a un script anterior; borrar el perfil en memoria; reordenar etiquetas; sin avisos; historia.js fuera de sw.js), las 28 detectadas.**
- **Paquete UX/UI (v27):** solo presentación (no tocan el motor, `Code.gs` ni el Sheet). 5 pruebas nuevas y 5 adaptadas: `ux-inicio.prueba.mjs` (47: programas arriba y MBA primero, aviso de programa no reconocido sin silenciar y también sin rondas, datos y seguimiento distintos por forma, palabra, color y contraste, flecha de volver fija en 9 pantallas), `ux-match.prueba.mjs` (56: nada se sale del recuadro a 320 y 390 px con un nombre de 60 letras seguidas, color del % por grupo, línea de motivo comprobada contra el grupo, «Por qué» corto y «ver más», casillas de ≥ 44 px, ningún «0» suelto), `ux-compartir.prueba.mjs` (26: la historia de los 30 alumnos de ejemplo no repite lo de debajo y no lleva niveles ni «nativo»), `ux-general.prueba.mjs` (344: unas 20 pantallas a 390 y 320 px, con táctil ≥ 44 px, contraste ≥ 4,5, letra ≥ 12 px y solo de la escala, campos de 16 px y sin scroll lateral; `UX_RAPIDO=1` mira solo unas pocas, para las roturas), `ux-zonas.prueba.mjs` (52: sin zoom, zonas seguras simuladas —muesca 47 px, barra de inicio 34 px, laterales 44 px—, errores y estados vacíos) y las ya existentes `programas`, `programas-datos`, `historia`, `match-ui` y `match-pantalla`, adaptadas a lo nuevo. **85 roturas a propósito (19 de la parte A, 28 de la B y 38 de la C): 81 detectadas y 4 equivalentes** (`min-width:0` suelto, el `overflow` del grupo y `white-space:nowrap` en los puntos, que con `overflow-wrap:anywhere` no cambian nada, y un `font-size` de `.motivo` que otra regla ya tapaba y se borró). Un cambio de método: el «0» suelto no se veía en el código sino en el navegador; era `ctx.problemas.length && el(…)`, que escribe «0» como texto. Un test mira ahora todos los textos de las tarjetas del match.
- **Ajustes v28:** solo presentación (no tocan el motor, `Code.gs` ni el Sheet). `js/vistas/refrescar.js` (botón; `VISTAS_SIN_BOTON`, `hayFormularioAbierto`, `botonVisible`) y `refrescar()` en `js/data/index.js`; `reiniciarBuscar()` en `buscar.js` para reconstruir la búsqueda conservando texto y filtros; `criteriosQueFallan()` y `textoPuntuacion(p, categoria)` en `vistas/match.js`; un bloque `@media (orientation:landscape) and (max-height:500px)` al final de `css/app.css`. Pruebas nuevas: `ux-refrescar.prueba.mjs` (58: dónde se ve, un cambio del Sheet aparece, giro y un solo toque, fallo con los datos anteriores en memoria, clave mala, nada en `localStorage`/`sessionStorage`/caché/IndexedDB y lecturas `no-store`, scroll y búsqueda conservados), `match-textos.prueba.mjs` (18, sin navegador: foto `tests/app/fixtures/match-calculo-v27.json` de los 300 pares de ejemplo hecha ANTES de cambiar la redacción; mismo grupo, %, puntos y estados; los otros siete textos intactos; ningún texto repite su rótulo) y `ux-horizontal.prueba.mjs` (143: cuatro móviles en horizontal, zonas seguras, formularios y demo sin hueco, tabletas sin cambios, giro). Ampliadas: `ux-match.prueba.mjs` (110: «Afinidad» en gris, la línea con todos los criterios que fallan contra «Por qué», 320 px, sin «Idiomas · Revisar: Idiomas:»), `match-ui` y `match-pantalla` (aceptan «Afinidad»). **58 roturas a propósito (18 del botón, 16 del rótulo y los criterios, 11 de la redacción y 13 del horizontal): 56 detectadas y 2 equivalentes** (un `.filter(x => !x.noAplica)` que sobra porque «no aplica» ya es `ok`, y el `z-index` del botón flotante, que no cambia el orden de pintado). Los mensajes de los commits de las partes 1, 2 y 3 dicen 17, 17 y 12: el recuento bueno es este. Un hallazgo: las pruebas `ux-*` no estaban en `npm test`; ahora van `ux-refrescar`, `ux-horizontal` y `match-textos`, y las otras `ux-*` se siguen lanzando aparte. Las roturas que no se detectaban (umbral de «ok» en idiomas con un nivel sin constar, un 0,25 de cumplimiento) eran huecos reales de las pruebas: los datos de ejemplo solo dan 0, 0,5 y 1; se añadieron casos sintéticos.
- **Paquete de cierre v29:** sin cambios de funcionalidad ni de reglas (no tocan el cálculo del match, `Code.gs` ni las columnas del Sheet). (1) El error del botón «Actualizar datos» sale en dos frases cortas, con «Cerrar» (`textoError()` en `vistas/refrescar.js`) y el criterio de tipo se llama «Tipo» en la fila y en el detalle (una sola tabla de nombres en `vistas/match.js`). (2) `docs/importar-hoja/` trae `alumnos-demo-ampliada.csv` (50 alumnos, los 14 programas cubiertos) y `ofertas-demo-ampliada.csv` (18 ofertas con perfil), sin tocar `datos-mock/`. (3) Revisión de los documentos públicos (sin nombres reales ni URL de GitHub Pages; contradicciones y cifras viejas corregidas). (4) `docs/VISIBILIDAD-REPO.md`: las dos opciones para el repositorio, preparadas y sin ejecutar. Pruebas nuevas: `importar-demo-ampliada.prueba.mjs` (58, sin navegador: columnas y valores contra Listas, Países, Áreas y Etiquetas; los 30 alumnos y 10 ofertas de siempre idénticos; el match corre sobre los 900 pares con los tres grupos; todo ficticio) y `sin-secretos.prueba.mjs` (35, sin navegador: recorre todos los archivos del repositorio, los de Git y los nuevos, y comprueba que no hay claves ni direcciones de script reales, enlaces a Sheets o Drive, tokens, correos fuera de las pruebas, la URL de GitHub Pages ni el nombre del responsable, que el código solo nombra los dominios de su política de seguridad y que los CSV de datos solo llevan `example.com`; sus detectores se prueban con muestras inventadas). Ampliadas: `ux-refrescar` (75), `ux-match` (126), `match-textos` y `match-ui`. **64 roturas a propósito (16 del error del botón y el nombre «Tipo», 21 de los CSV ampliados y 27 de la prueba de secretos): 62 detectadas y 2 equivalentes** (en `sin-secretos`, quitar el detector de GitHub Pages o la excepción de la dirección de prueba en el código no cambia nada porque otra regla —los dominios permitidos y el patrón de dirección— sigue saltando). Un hallazgo: `programas.prueba.mjs` fallaba 2 de cada 8 veces ya en la v27 (leía el guardado justo después del clic); ahora espera al evento. Las pruebas `ux-*` siguen fuera de `npm test`, salvo `ux-refrescar`, `ux-horizontal` y las de v29.
- **Paquete de documentación (sin cambios en la app, el script ni el Sheet; sin subir versión):** `docs/PREGUNTAS-TI.md` reordenado (resumen con las 11 preguntas que bloquean el inicio y 39 complementarias por bloque, con la nueva sobre el art. 22 del RGPD y la IA de alto riesgo: 50 en total), `docs/PREPARAR-LALIGA.md` en listas cortas, README a menos de la mitad y `docs/FUNCIONAMIENTO.md` nuevo (rondas y solicitudes, avisos, borradores, compartir y el detalle de cada función). Prueba nueva `documentos.prueba.mjs` (63, sin navegador: ningún enlace roto entre documentos ni a sus apartados; 50 preguntas numeradas sin huecos y las 11 ★ arriba; el README pesa menos de 10 KB, sin versiones ni «Sheet»; lo movido está completo; las comprobaciones del script que citan los documentos son las reales). **36 roturas a propósito, las 36 detectadas** (quitar uno solo de los dos enlaces de PREPARAR-LALIGA a las preguntas no cambia nada porque queda el otro; quitados los dos, se detecta). `sin-secretos` vigila ahora diez documentos.
- Los comandos necesitan Node.js y, para las de navegador, Microsoft Edge (o `NAVEGADOR=chromium`). La app en sí no usa npm.

**Lo que no cubren:** la redirección real de Google (se comprobó a mano con el Sheet de prueba conectado), un iPhone real (el aspecto en iPhone lo comprueba a mano el responsable del proyecto), ni la carga con mucha gente.

---

## 8. Mantenimiento (versión actual)

- **Publicar un cambio de la app:** subir el número `CACHE` de `sw.js` **y** `VERSION` de `js/version.js` (el mismo número; una prueba lo comprueba), `git commit` y `git push` a `main`; GitHub Pages publica en 1 o 2 minutos. En el teléfono: pestaña **Ajustes**, "Buscar actualización" (compara la versión publicada con la que se está usando y, si hay una nueva, la carga sola). Si no funcionase: cerrar la app y abrirla dos veces.
- **Archivos nuevos:** añadirlos a la lista `FILES` de `sw.js` (una prueba avisa si falta alguno).
- **Cambiar el manifest o las etiquetas `apple-…` (incluido `status-bar-style`):** en el iPhone solo se ven al **borrar el icono y volver a añadirlo**, y eso borra en ese móvil lo guardado (acceso, firma, umbrales, silencios y secciones abiertas).
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
  - tablas `{ cabecera, filas }` de Alumnos, Ofertas, Listas, Rondas, Aplicaciones e Historial (`tablas.js` ya convierte a objetos);
  - `guardarEntrevista`, `guardarOferta`, `registrarRonda`, `crearAplicacion` y `cambiarEstado` con las mismas entradas y salidas; y
  - el elegirla en `js/data/index.js`.
- **Equivalencias de lo que hoy hace el script:**

| Hoy (script de Google) | Con Microsoft |
|---|---|
| Clave compartida | Token de la persona (Entra ID). |
| `LockService` y comparación con "anteriores" para detectar conflictos | Control de concurrencia propio de SharePoint (versión del elemento) o la misma comparación hecha desde la app. |
| Validación en el script | **Debe seguir existiendo en el servidor**, no solo en la app: reglas de listas, longitudes, fechas. Con listas de SharePoint, columnas de elección y restricciones; si no basta, una Azure Function o un flujo de Power Automate. |
| ID de oferta O011… generado por el script | Identificador de la lista o generado de forma única en servidor. |
| Historial de versiones de Google Sheets | Versionado de SharePoint (activar y definir cuántas versiones). |
| Rondas, solicitudes e historial en tres hojas, escritas con deshacer a mano | Tres listas de SharePoint relacionadas (con columnas de búsqueda). El **Historial** debería ser una lista en la que no se pueda editar ni borrar (solo añadir) y que la app escriba siempre junto con el cambio de estado; si no hay transacciones, una Azure Function o un flujo que haga las dos cosas a la vez. |
| Numeración (R001, AP001, H001) y comprobación de duplicados en el script | Identificadores y restricciones de unicidad (alumno + oferta + ronda) en el servidor. |

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
- **Aplicaciones, estados y motivos de descarte:** son datos sobre personas más delicados aún (quién fue descartado y por qué, sobre todo con motivos como el permiso de trabajo). Decidir quién los ve (¿cada responsable solo los suyos?), cuánto tiempo se conservan, y si el motivo de descarte se comunica o no a la persona. Los estados deben ser objetivos y revisables.

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
7. **Resto de bloques** (match, compartir perfiles) ya sobre la base nueva. Las rondas y solicitudes ya existen sobre el puente de Google y habrá que migrarlas con el resto.

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
13. ¿Pueden las listas de SharePoint impedir editar y borrar filas de una lista concreta (el historial de cambios de estado) y permitir solo añadirlas? ¿O hace falta una función intermedia?
14. ¿Quién debe ver las solicitudes y los motivos de descarte de cada alumno, y se pueden restringir a nivel de elemento?

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
