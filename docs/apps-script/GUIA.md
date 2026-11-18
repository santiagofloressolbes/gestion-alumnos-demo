# Guía: poner en marcha el script (Apps Script)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

El script es un "portero" que vive dentro de tu Google Sheet de prueba. La app le pide los datos y le manda las notas de entrevista. Solo atiende si la petición trae la clave correcta.

**Solo para datos de prueba.** Con alumnos reales no se usa (ver `DECISIONES.md`).

## Qué puede y qué no puede hacer

| Puede | No puede |
|---|---|
| Leer las hojas Alumnos, Ofertas y Listas. | Crear ni borrar alumnos. |
| Hoja Alumnos: escribir **solo** "Notas de entrevista" y "Fecha última entrevista", en la fila del alumno indicado. | Borrar ninguna fila. |
| Hoja Ofertas: **añadir una fila nueva** (con ID que pone el script: O011, O012…) o editar los campos de una oferta (los 11 de siempre y, desde la versión 26, los 5 del perfil del puesto). | Tocar ninguna otra hoja (Listas solo se lee) ni archivo de tu Drive. |
| Hojas Rondas, Aplicaciones e Historial: **añadir filas** (con ID que pone el script: R001, AP001, H001…) y cambiar el **estado y el motivo** de una solicitud. | Cambiar ni borrar filas de Rondas o de Historial, ni otras columnas de Solicitudes. |
| Rechazar textos con HTML, demasiado largos, con fechas futuras o con valores que no estén en Listas. | Enviar correos ni conectarse a otras páginas. |

## Reglas de oro

- **La clave nunca va en el código, ni en el repo, ni en un chat.** Solo vive en las Propiedades del script y en tu móvil.
- **La dirección del script (`…/exec`) tampoco se pega en chats ni en el repo.**
- Si crees que se ha filtrado la clave: cámbiala (ver "Cambiar la clave").

## Puesta en marcha (una sola vez)

1. **Haz una copia de seguridad del Sheet.** En el Sheet: Archivo, Hacer una copia. Guárdala con el nombre "COPIA SEGURIDAD".
2. **Abre el editor del script.** En el Sheet: Extensiones, Apps Script. Se abre una pestaña nueva.
3. **Pega el código.**
   - Abre el archivo `docs/apps-script/Code.gs` de este proyecto y copia todo (Ctrl+A, Ctrl+C).
   - En el editor de Apps Script, borra lo que haya (Ctrl+A, Supr) y pega (Ctrl+V).
   - Pulsa el icono del disquete (Guardar). Si te pide un nombre, pon "Puente alumnos demo".
4. **Pon la clave.**
   - A la izquierda, pulsa el engranaje (Configuración del proyecto).
   - Baja hasta "Propiedades del script" y pulsa "Editar propiedades del script".
   - Pulsa "Añadir propiedad del script". En **Propiedad** escribe `CLAVE` (en mayúsculas). En **Valor** escribe tu clave y pulsa "Guardar propiedades del script".
   - **Cómo es una buena clave:** una frase larga de 4 o 5 palabras sin relación entre sí, de al menos 16 caracteres, que no uses en ningún otro sitio. Guárdala en tu gestor de contraseñas. El móvil te pedirá escribirla una vez.
5. **Comprueba que está todo bien.**
   - Vuelve al editor (icono `< >` a la izquierda).
   - Arriba, en el desplegable de funciones, elige `comprobarConfiguracion` y pulsa "Ejecutar".
   - Google te pide permiso la primera vez: "Revisar permisos", elige tu cuenta. Si dice "Google no ha verificado esta aplicación", pulsa "Configuración avanzada", luego "Ir a Puente alumnos demo (no seguro)" y "Permitir". Es normal: el script es tuyo y solo pide acceso a este Sheet.
   - Abajo, en "Registro de ejecución", debe salir: clave `ok (N caracteres)`, hojas Alumnos 30 filas, Ofertas 10 filas, Listas 18 filas, las 3 columnas `ok` y `bloqueado: false`. **La clave no se muestra.**
6. **Publica el script como aplicación web.**
   - Arriba a la derecha: Implementar, Nueva implementación.
   - Pulsa el engranaje junto a "Seleccionar tipo" y elige "Aplicación web".
   - Descripción: `v1`. **Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.** (Parece raro, pero es lo normal: la dirección no pide cuenta de Google, la protección es la clave. El Sheet sigue privado.)
   - Pulsa "Implementar" y copia la **URL de la aplicación web** (termina en `/exec`). Guárdala tú; no me la pegues.
7. **Comprueba la dirección.** Pégala en una pestaña nueva del navegador. Debe salir solo el texto "Puente de datos de prueba. Usa la app para conectarte." Si sale una página de error o te pide iniciar sesión, algo del paso 6 está mal.
8. **Comprueba que el Sheet sigue privado.** En el Sheet, botón Compartir: debe poner "Restringido" (solo tú). **No** actives "Publicar en la web" para nada.
9. **Conecta la app.** En la app, pantalla Acceso: escribe la dirección y la clave y pulsa "Conectar". Deben salir los másteres y el Sheet no se toca. Nunca pegues la dirección ni la clave en chats.

**Sobre "Publicar en la web":** el Sheet no debe estar publicado. La app ya no lo necesita: solo habla con el script. Si dejas de usar el script, la app no cambia sola a la demo; la demo se elige a mano en Acceso.

## Mantenimiento

**Cambiar la clave.** Configuración del proyecto, Propiedades del script, edita el valor de `CLAVE` y guarda. Después, en la app: "Olvidar acceso" y vuelve a entrar con la nueva.

**Me he bloqueado** (5 fallos seguidos bloquean 15 minutos, también con la clave buena). Espera 15 minutos, o en el editor elige la función `desbloquear` y pulsa "Ejecutar".

**Actualizar el código del script.** Pega el nuevo `Code.gs`, guarda y pulsa Implementar, Gestionar implementaciones, el lápiz, y en "Versión" elige **"Nueva versión"**, Implementar. **No crees una implementación nueva:** cambiaría la dirección y la app dejaría de encontrarla.

**Dejar de usar el script.** Implementar, Gestionar implementaciones, Archivar. La dirección deja de funcionar al instante.

## Qué significan los errores

| Código | Qué significa | Qué hacer |
|---|---|---|
| `clave` | La clave no es correcta. | Revisa que la escribas igual que en las Propiedades. |
| `bloqueado` | Demasiados intentos fallidos. | Espera 15 minutos o ejecuta `desbloquear`. |
| `config` | Falta la propiedad `CLAVE` o tiene menos de 16 caracteres. | Paso 4. |
| `hoja` / `columna` | Falta una hoja o una columna (por ejemplo, la han renombrado). | Devuelve el nombre original. |
| `no-encontrado` / `id-duplicado` | El ID no existe o está repetido en la hoja (la respuesta dice si es el alumno, la oferta, la ronda o la solicitud). | Revisa la columna de ID de esa hoja. |
| `largo`, `html`, `caracteres`, `fecha`, `fecha-futura` | La nota, la fecha o un campo de la oferta no es válido. | Corrige el texto. |
| `requerido`, `lista`, `enlace` | Falta un campo obligatorio de la oferta, el valor no está en la hoja Listas, o el enlace empieza por `http:`, `javascript:`… | Rellena el campo, elige un valor de la lista o usa `https://`. |
| `conflicto` | Alguien cambió esa entrevista, oferta o solicitud mientras la editabas, o ya existe la ronda que ibas a registrar. | La app te enseñará lo que hay ahora. |
| `duplicado` | Ese alumno ya tiene solicitud en esa ronda de esa oferta. | La app te enseñará la solicitud que ya existe. |
| `fecha-anterior` | La fecha es anterior a la de la oferta, la ronda o el último cambio. | Elige una fecha igual o posterior. |
| `motivo-sobra` | Se envió un motivo de descarte con un estado que no es "Descartado". | Deja el motivo vacío. |
| `ocupado` | El script estaba atendiendo otra petición. | Reintenta en unos segundos. |
| `servidor` | Fallo interno. | Mira en el editor, Ejecuciones, el detalle. |

## La versión 20 de la app no cambia el script ni el Sheet

Los avisos de alumnos, los borradores de correo y la firma se calculan **dentro de la app**, con los datos que ya llegan. **No hace falta** pegar un `Code.gs` nuevo, ni crear hojas, ni añadir columnas o listas. Los umbrales de los avisos, la firma y los avisos silenciados se guardan solo en el móvil (no en el Sheet), así que cada móvil tiene los suyos.

## Cómo se ha probado

En `tests/apps-script/` hay un simulador de Google y 439 comprobaciones que ejecutan este mismo `Code.gs`: clave buena y mala, bloqueo, textos con HTML, límites de longitud y fecha, fórmulas, conflictos y que **solo** cambian las celdas previstas (2 en una entrevista; en una oferta, las 12 de la fila nueva (17 con el perfil del puesto) o solo las que cambias; en una solicitud nueva, 8 celdas más 7 de su historial). También comprueban que, si Google falla a mitad de guardar, se deshace todo y no queda una solicitud sin su historial. Para repetirlas: `node tests/apps-script/pruebas.mjs`.

## Límites que conviene saber

- Solo hay una clave para todos: no distingue personas y no se puede quitar el acceso a una sola.
- El script se ejecuta con tu cuenta de Google. Por eso es solo para datos de prueba.
- La primera petición tras un rato sin usar puede tardar 1 a 3 segundos.
- Si dos personas editan a la vez, la segunda recibe un `conflicto` en vez de pisar el texto de la primera.

## Actualizar a la versión con ofertas (si ya tenías el script en marcha)

La versión nueva de `Code.gs` también guarda ofertas. Haz esto una vez, en este orden:

1. **Copia de seguridad.** En el Sheet: Archivo, Hacer una copia. Nómbrala "COPIA SEGURIDAD ofertas". El script ahora **puede crear filas** en la hoja Ofertas.
2. **Añade la columna a Listas.** Abre la hoja Listas. En la primera fila libre a la derecha de "Disponibilidad", escribe como encabezado: `Requisito de permiso`. Debajo, en dos filas, escribe exactamente: `Permiso de trabajo en vigor` y `No requerido`. Mismo texto, mayúsculas y tildes.
3. **Pega el código nuevo.** Extensiones, Apps Script. Selecciona todo el código viejo (Ctrl+A), bórralo, pega el nuevo `Code.gs` y guarda (disquete). **No toques la propiedad `CLAVE`.**
4. **Comprueba.** En el desplegable de funciones elige `comprobarConfiguracion` y pulsa "Ejecutar". Debe salir todo `ok`: las columnas de Ofertas y las listas (incluida "Requisito de permiso"). Si pone `FALTA LA COLUMNA EN LISTAS`, revisa el paso 2.
5. **Publica una nueva versión de la MISMA implementación.** Implementar, Gestionar implementaciones, el lápiz, en "Versión" elige **"Nueva versión"**, Implementar. **No crees una implementación nueva:** cambiaría la dirección y la app dejaría de encontrarla.
6. **Avísame** de que has llegado hasta aquí (sin pegar la clave ni la dirección). La app seguirá funcionando igual hasta el siguiente paso.

## Actualizar a la versión con rondas y solicitudes (si ya tenías el script en marcha)

> **Equivalencia de nombres.** En la app se dice **solicitud**; en el Sheet, esa misma cosa se sigue llamando **Aplicaciones** (la hoja) y **Estado de la aplicación** (la lista), y en el código y el script `aplicacion`. No hay que cambiar nada en el Sheet.

La versión nueva de `Code.gs` también guarda **rondas de difusión**, **solicitudes** de alumnos a una oferta y su **historial**. Hace falta crear 3 hojas y 2 listas. Haz esto una vez, en este orden, y no pases al siguiente hasta terminar el anterior:

1. **Copia de seguridad.** En el Sheet: Archivo, Hacer una copia. Nómbrala "COPIA SEGURIDAD rondas". El script ahora **puede añadir filas** en 3 hojas más.
2. **Crea las 3 hojas con los datos de ejemplo.** Se hace igual con cada uno de estos tres archivos de la carpeta `datos-mock` de tu ordenador (`C:\dev\alumnos-laliga-app\datos-mock`): `Rondas.csv`, `Aplicaciones.csv` y `Historial.csv`.
   1. En el Sheet: Archivo, Importar, pestaña "Subir", y arrastra el archivo (o "Explorar").
   2. En "Ubicación de importación" elige **"Insertar hoja(s) nueva(s)"**.
   3. En "Tipo de separador" deja "Detectar automáticamente".
   4. **Desmarca** "Convertir texto en números, fechas y fórmulas".
   5. Pulsa "Importar datos".
   6. Comprueba que la pestaña nueva se llama **exactamente** `Rondas`, `Aplicaciones` o `Historial` (si pone otra cosa, haz clic derecho en la pestaña, Cambiar nombre).

   Quedan 5 filas en Rondas, 12 en Aplicaciones y 36 en Historial. Los datos de ejemplo usan alumnos A001 a A028 y las ofertas O002, O003 y O006 de la demo; si cambiaste esos IDs en tu Sheet, dímelo antes de seguir.

   **Si no quieres los datos de ejemplo:** en cada hoja nueva borra las filas desde la 2 hacia abajo y deja la primera (los encabezados).
3. **Añade las dos listas nuevas a Listas.** Abre la hoja Listas. A la derecha de "Requisito de permiso", en la primera fila, escribe como encabezados `Estado de la aplicación` y `Motivo de descarte`. Debajo escribe exactamente (mismas mayúsculas y tildes):
   - **Estado de la aplicación:** `Recibida`, `En revisión`, `Enviada a la empresa`, `Entrevista`, `Contratado`, `Descartado` (6 filas).
   - **Motivo de descarte:** `Perfil no encaja`, `Permiso de trabajo`, `La empresa eligió a otro`, `Otro` (4 filas).

   **No cambies el nombre de "Recibida" ni de "Descartado":** el script los usa para saber cuándo nace una solicitud y cuándo lleva motivo. Los demás estados y motivos sí puedes editarlos.
4. **Pega el código nuevo.** Extensiones, Apps Script. Selecciona todo el código viejo (Ctrl+A), bórralo, pega el nuevo `Code.gs` y guarda (disquete). **No toques la propiedad `CLAVE`.**
5. **Comprueba.** En el desplegable de funciones elige `comprobarConfiguracion` y pulsa "Ejecutar". En el registro debe salir todo `ok`: `rondas: listas (se anuncian a la app)`, las hojas Rondas 5 filas, Aplicaciones 12 filas e Historial 36 filas (o 0 si borraste los ejemplos), las 19 columnas de `columnasRondas`, las dos listas nuevas y `estados` con Recibida y Descartado. Si algo dice `FALTA`, vuelve al paso que corresponda.
6. **Publica una nueva versión de la MISMA implementación.** Implementar, Gestionar implementaciones, el lápiz, en "Versión" elige **"Nueva versión"**, Implementar. **No crees una implementación nueva:** cambiaría la dirección y la app dejaría de encontrarla.
7. **Prueba en la app.** Cierra la app del móvil y ábrela dos veces (para que cargue la versión nueva). En la pestaña Ofertas, abre una oferta: deben salir sus rondas. Si no ves los botones "Registrar nueva ronda" o "Añadir solicitud", la app te dirá si falta alguna hoja o si el script es de una versión anterior.

## Añadir «Unión Europea (UE/EEE)» a la lista Nacionalidad (opcional, para el match)

Sirve para que una oferta pueda pedir «nacionalidad de la UE o del EEE» sin elegir un país concreto. **No cambia el script ni hay que publicar nada:** es solo una fila más en la hoja Listas. Si no la añades, la app funciona igual (solo que en el formulario de ofertas no podrás elegir esa opción).

1. Abre el Sheet y la pestaña **Listas**.
2. Busca la columna **Nacionalidad** (la que empieza con `Alemania`, `Argentina`…).
3. Baja hasta la primera celda vacía, justo debajo del último país.
4. Escribe exactamente, con esas mayúsculas, la tilde de «Unión» y los paréntesis: `Unión Europea (UE/EEE)`. Pulsa Intro.
5. Comprueba que no se ha quedado ninguna celda vacía entre los países y la nueva fila.
6. En la app, cierra y abre dos veces (o Ajustes, «Buscar actualización»). En una oferta, «Editar oferta», el desplegable «Nacionalidad requerida» debe ofrecer la nueva opción.

**Cómo se usa.** En una oferta que pida «Unión Europea (UE/EEE)», cumple quien tenga alguna nacionalidad de la UE o del EEE (la principal o la secundaria) **o** tenga la situación «Ciudadano UE o español». **Suiza no cuenta** (no es de la UE ni del EEE): la app lo marca «a revisar» con un aviso. Los países se escriben como en la lista (por ejemplo `Países Bajos`, `República Checa`); si falta alguno, el alumno saldrá «a revisar», nunca descartado.

**Si empiezas desde cero** con la carpeta `datos-mock`, `Listas.csv` ya trae esa fila (la hoja Listas queda con 18 filas) y la oferta de ejemplo O005 pide «Unión Europea (UE/EEE)».


---

## Programas agrupados en Inicio (versión 23)

**No cambia el script ni hay que publicar nada:** la lista de programas, su categoría y su idioma se leen de la hoja Listas, que el script ya entrega entera.

1. Abre el Sheet y la pestaña **Listas**.
2. La columna de programas puede llamarse **`Programa`** o **`Máster`** (la app acepta las dos). Escribe ahí un programa por fila, con el nombre exacto, sin celdas vacías entre medias. El orden de las filas es el orden en Inicio.
3. A la derecha de la última columna, en la primera fila, escribe el encabezado **`Categoría del programa`**. En la fila de cada programa, escribe su categoría (por ejemplo `Másteres`, `MBA`, `LaLiga Executive Education`, `Formación para Jugadores`), escrita siempre igual. Las categorías salen en Inicio en el orden en que aparecen.
4. A su derecha, escribe el encabezado **`Idioma del programa`**. Pon `en` en los programas cuyo correo de seguimiento deba salir en inglés. Vacío o `es`: español. (Si se deja vacío, vale la palabra «inglés» o «English» en el nombre del programa).
5. En la hoja **Alumnos**, la columna `Máster` lleva el programa de cada persona, escrito **igual** que en Listas. Si no coincide, Inicio lo enseña en «Otros programas», la ficha avisa y la tarjeta **Avisos** de Inicio saca un aviso rojo de **datos** («Programa no reconocido») que no se puede silenciar y desaparece solo cuando lo arreglas en el Sheet. Las categorías salen con **MBA la primera**.
6. Las columnas de categoría e idioma van en la **misma fila** que su programa. Si una fila queda sin categoría, ese programa sale en «Otros programas».
7. En la app, «Ajustes» → «Buscar actualización» (o cierra y abre dos veces) y comprueba Inicio.

---

## Hojas de reglas del match (versión 25)

**La hoja Áreas puede llevar una columna opcional «Área (inglés)»** (para el correo en inglés). El script no cambia: ya devuelve la hoja entera y la app lee esa columna si existe.

**El script cambia solo para LEER cinco hojas nuevas** (Países, Áreas, Afinidad, Reglas migratorias y Etiquetas). No escribe nada nuevo, no cambia el guardado de ofertas ni de entrevistas y no toca Listas. La dirección y la clave no cambian.

Los datos para el Sheet y los pasos están en `docs/importar-sheet/` (`PASOS.md`). El script se actualiza así:

1. Abre el proyecto en Apps Script y el archivo `Code.gs`.
2. Borra todo su contenido y pega el de `docs/apps-script/Code.gs`. **Guardar.** (Si usas una copia con tu clave en otro archivo, no la pegues ahí: la clave vive en las propiedades del script, no en el código.)
3. **Implementar → Gestionar implementaciones →** el lápiz → «Versión»: **Nueva versión** → **Implementar**. No crees una implementación nueva: cambiaría la dirección.
4. En la app, «Ajustes» → «Buscar actualización».

Si no actualizas el script, la app sigue funcionando con las reglas de siempre (no ve las hojas nuevas). Si una de las hojas no existe o está vacía, el script no la envía y la app usa sus reglas de respaldo.

## Perfil del puesto en las ofertas (versión 26)

**El script cambia para GUARDAR cinco datos más de cada oferta:** País de la oferta, Subárea, Etiquetas, Idiomas y Nivel de formación (las columnas que ya añadiste en la versión 25). Sigue sin borrar filas, la dirección y la clave no cambian y no hace falta tocar Listas ni ninguna otra hoja.

Qué valida el script al guardar:
- **Etiquetas**: cada una tiene que estar en la hoja **Etiquetas** (máximo 8). **País**: en la hoja **Países** (las filas de grupo, como «Unión Europea (UE/EEE)», no son un país). **Subárea**: en la hoja **Áreas**.
- **Idiomas**: «Inglés B2; Español nativo» (idioma y, si se quiere, nivel A1–C2 o nativo; máximo 6, sin repetir). **Nivel de formación**: Sin requisito, Grado, Máster o Doctorado.
- **Requisito de nacionalidad**: vale lo que esté en la hoja **Países** (también las filas de grupo) **o** en Listas > Nacionalidad. Ya no hace falta añadir «Unión Europea (UE/EEE)» a Listas.
- Si una de esas hojas **no existe** (o está vacía), el campo se guarda como texto sin compararlo con ninguna lista. Los idiomas y el nivel se validan siempre.
- Al **editar**, un valor antiguo que no se toca no se rechaza aunque ya no esté en la lista; solo se comprueba lo que cambias.

Pasos (una sola vez):
1. **Copia de seguridad.** En el Sheet: Archivo, Hacer una copia ("COPIA SEGURIDAD 3E-2").
2. **Pega el código nuevo.** Extensiones, Apps Script, `Code.gs`: Ctrl+A, bórralo, pega el de `docs/apps-script/Code.gs` y guarda. **No toques la propiedad `CLAVE`.**
3. **Comprueba.** Elige `comprobarConfiguracion` y pulsa «Ejecutar». Las 16 columnas de Ofertas deben salir `ok` y `apoyoPerfil` debe contar los valores de Países, Áreas y Etiquetas.
4. **Publica una nueva versión de la MISMA implementación.** Implementar, Gestionar implementaciones, el lápiz, Versión «Nueva versión», Implementar. No crees una implementación nueva.
5. En la app, «Ajustes» → «Buscar actualización».

Si no actualizas el script, la app avisa en el formulario de oferta («El perfil del puesto no se puede guardar todavía») y guarda las ofertas sin esos datos, sin tocar los que ya tengan.

## Actualizar los datos sin cerrar la app (versión 28)

**El script y el Sheet no cambian.** Si editas el Sheet con la app abierta, toca el botón de las **dos flechas circulares** (arriba a la derecha) y la app vuelve a leerlo: no hace falta cerrarla. Gira mientras carga; si falla, dice por qué y se siguen viendo los datos de antes. No aparece en la demo ni en las pantallas donde estás escribiendo (formularios, notas de entrevista, borrador de correo), para que no pierdas lo escrito. No se actualiza sola, y no guarda ninguna copia de los datos en el móvil.
