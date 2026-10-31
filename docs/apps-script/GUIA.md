# Guía: poner en marcha el script (Apps Script)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

El script es un "portero" que vive dentro de tu Google Sheet de prueba. La app le pide los datos y le manda las notas de entrevista. Solo atiende si la petición trae la clave correcta.

**Solo para datos de prueba.** Con alumnos reales no se usa (ver `DECISIONES.md`).

## Qué puede y qué no puede hacer

| Puede | No puede |
|---|---|
| Leer las hojas Alumnos, Ofertas y Listas. | Crear ni borrar filas. |
| Escribir **solo** en "Notas de entrevista" y "Fecha última entrevista" de la hoja Alumnos, en la fila del alumno indicado. | Tocar ninguna otra celda, hoja ni archivo de tu Drive. |
| Rechazar textos con HTML, demasiado largos (más de 2.000 caracteres) o con fechas futuras. | Enviar correos ni conectarse a otras páginas. |

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
   - Abajo, en "Registro de ejecución", debe salir: clave `ok (N caracteres)`, hojas Alumnos 30 filas, Ofertas 10 filas, Listas 17 filas, las 3 columnas `ok` y `bloqueado: false`. **La clave no se muestra.**
6. **Publica el script como aplicación web.**
   - Arriba a la derecha: Implementar, Nueva implementación.
   - Pulsa el engranaje junto a "Seleccionar tipo" y elige "Aplicación web".
   - Descripción: `v1`. **Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.** (Parece raro, pero es lo normal: la dirección no pide cuenta de Google, la protección es la clave. El Sheet sigue privado.)
   - Pulsa "Implementar" y copia la **URL de la aplicación web** (termina en `/exec`). Guárdala tú; no me la pegues.
7. **Comprueba la dirección.** Pégala en una pestaña nueva del navegador. Debe salir solo el texto "Puente de datos de prueba. Usa la app para conectarte." Si sale una página de error o te pide iniciar sesión, algo del paso 6 está mal.
8. **Comprueba que el Sheet sigue privado.** En el Sheet, botón Compartir: debe poner "Restringido" (solo tú). **No** actives "Publicar en la web" para nada.
9. **Avísame de que has llegado hasta aquí**, sin pegarme la clave ni la dirección. En el siguiente paso la app aprenderá a conectarse.

**Sobre "Publicar en la web":** el Sheet ya no debe estar publicado. Mientras la app no sepa conectarse al script (siguiente paso del proyecto), seguirá mostrando los datos de respaldo de `datos-mock/`. Es normal.

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
| `no-encontrado` / `id-duplicado` | El ID no existe o está repetido en la hoja. | Revisa la columna "ID alumno". |
| `largo`, `html`, `caracteres`, `fecha`, `fecha-futura` | La nota o la fecha no es válida. | Corrige el texto. |
| `conflicto` | Alguien cambió esa entrevista mientras la editabas. | La app te enseñará lo que hay ahora. |
| `ocupado` | El script estaba atendiendo otra petición. | Reintenta en unos segundos. |
| `servidor` | Fallo interno. | Mira en el editor, Ejecuciones, el detalle. |

## Cómo se ha probado

En `tests/apps-script/` hay un simulador de Google y 128 comprobaciones que ejecutan este mismo `Code.gs`: clave buena y mala, bloqueo, textos con HTML, límites de longitud y fecha, fórmulas, conflictos y que **solo** cambian las 2 celdas. Para repetirlas: `node tests/apps-script/pruebas.mjs`.

## Límites que conviene saber

- Solo hay una clave para todos: no distingue personas y no se puede quitar el acceso a una sola.
- El script se ejecuta con tu cuenta de Google. Por eso es solo para datos de prueba.
- La primera petición tras un rato sin usar puede tardar 1 a 3 segundos.
- Si dos personas editan a la vez, la segunda recibe un `conflicto` en vez de pisar el texto de la primera.
