# Decisiones del proyecto

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

Última actualización: 2026-11-01. Fase 1 (lectura) terminada. Fase 2 en curso: hecho el primer bloque (acceso con clave y notas de entrevista); faltan ofertas, rondas y aplicaciones, match y compartir perfiles. Solo datos de prueba (ficticios).

## Decididas

| Tema | Decisión | Por qué |
|---|---|---|
| Datos | Solo datos ficticios. Avatares con iniciales, sin fotos de personas reales. | Privacidad: el repositorio y la web son públicos. |
| Claves | Ninguna clave, token ni contraseña en el código ni en el repo. La clave del script vive en las Propiedades del script; la dirección del script y la clave, solo en el móvil de cada persona. | Repo público. |
| Tecnología | HTML, CSS y JavaScript puros, sin instalar ni compilar nada. Módulos JS. Sin librerías ni CDN. | Lo más simple; se publica tal cual en GitHub Pages. |
| Rutas | Con `#` (por ejemplo `#/master/MBA en inglés`). La clave nunca va en la dirección de la página. | GitHub Pages no entiende rutas de servidor; las direcciones se copian y se quedan en el historial. |
| Acceso a datos | Todo pasa por `js/data/` (`getAlumnos`, `getOfertas`, `getListas`, `getMasters`, `guardarEntrevista`). Las pantallas nunca leen archivos ni Google directamente. | Migrar a Microsoft Graph tocando pocas piezas (ver "Al migrar a Microsoft"). |
| Fuentes | Dos: **script** (Google Apps Script con clave sobre un Sheet privado) y **demo** (`datos-mock/`). No hay vuelta automática a la demo si el script falla: se muestra el error. | No mezclar sin avisar datos de prueba con la demo. |
| Modo demo | Se elige a mano en la pantalla Acceso. Banner fijo "MODO DEMO" en todas las pantallas. No permite guardar nada. | Que nunca se confunda con los datos del Sheet. |
| Escritura | Antes (Fase 1): la app no editaba nada. **Ahora (Fase 2, bloque 1):** solo se escriben 2 campos, "Notas de entrevista" y "Fecha última entrevista", de un alumno cada vez, y solo en modo script. No se crean ni borran filas ni se toca otra celda. Lo imponen **a la vez** el script y la app. | Guardar notas desde el móvil sin abrir el resto de datos a cambios. |
| Notas | Una nota editable por alumno, hasta 2.000 caracteres, sin HTML. Fecha por defecto hoy, editable, sin fechas futuras. Si empieza por `-`, `=`, `+` o `@` se le añade un espacio delante (no se rechaza). Borrar = dejar nota vacía y confirmar. | El espacio evita que Google Sheets o Excel la lean como una fórmula. |
| Conflictos | Si otra persona cambió la entrevista mientras se editaba, el script devuelve `conflicto` y la app enseña lo que hay ahora. Nunca se pisa en silencio. La app lee las notas sin recortar para no inventar conflictos. | Varias personas pueden usar la misma clave. |
| Borradores | Lo que se escribe no se guarda en el móvil. Los datos de los alumnos tampoco: solo están en memoria. | Notas delicadas; un móvil perdido no debe llevar notas dentro. |
| Bloqueo | 5 claves malas seguidas bloquean 15 minutos (también para la clave buena). `desbloquear` en el editor lo quita. | La dirección del script es pública; frena la fuerza bruta. |
| Política de seguridad | `Content-Security-Policy` en `index.html`: solo código de la propia web; únicas conexiones externas permitidas, `script.google.com` y `script.googleusercontent.com`; fotos solo por https. Sin `innerHTML`, sin estilos en línea. | Si algún texto del Sheet colara código, no podría ejecutarse ni enviar datos fuera. |
| Diseño | Tema oscuro con acento rojo. Open Sans en el repo. Márgenes de 24 px, tarjetas de 24 px de radio, botones de 44 px como mínimo, letra de 16 px en formularios (el iPhone no amplía). | Coherencia con tu app de gastos; usable con el pulgar. |
| Contraste | El rojo `#D63B45` solo como fondo (con texto blanco, 4,59:1). Como texto de color se usa `#FF6B73`. | Como texto sobre tarjeta el rojo da 3,44:1 y no pasa 4,5:1. |
| Sin zoom | Se cancelan los gestos de pellizco y se usa `touch-action: manipulation`. El viewport no lleva `user-scalable`. | Igual que gastos; comprobado en iPhone. |
| Textos de los datos | Siempre se escriben como texto (nunca `innerHTML`). | Una celda con código no puede ejecutarse. |
| Buscadores | `noindex` en `index.html` y `robots.txt`. | Evita que salga en Google. No hace la app privada. |
| Búsqueda | El cuadro de texto no mira las notas de entrevista. | Datos delicados. |
| Caché | Cada cambio en archivos de la app: subir `CACHE` en `sw.js`. Las respuestas del script de Google no pasan por el service worker ni se guardan. | Que el móvil cargue siempre la versión nueva y no quede una copia de los datos. |
| Sin conexión | La app abre, pero en modo script los datos no se ven (hacen falta Google y la clave). Solo la demo funciona sin conexión. | Consecuencia de no guardar datos en el móvil. |
| CV de ejemplo | Los enlaces `example.com/cv/…` se desvían a una página "CV de ejemplo" dentro de la app, sin tocar el Sheet. | Pedido por Santiago. |
| Disponibilidad | Tres valores: Prácticas, Empleo, Ambas. En el filtro, "Prácticas" y "Empleo" incluyen también a los de "Ambas"; "Ambas" muestra solo a los de Ambas. | Quien busca prácticas también acepta a quien admite las dos. |
| Marca | Nombre público "Gestión de alumnos (demo)"; en el icono del móvil, "Alumnos (demo)". Sin logos ni siglas de LaLiga ni de la escuela. Icono genérico. Aviso visible al final de cada pantalla y en el README. Los nombres de los másteres se mantienen. | Que no parezca una app oficial. |
| Repositorio | Se llama `gestion-alumnos-demo` (antes tenía "laliga" en el nombre). Las rutas de la app son relativas, así que no dependen del nombre. | Marca neutra; cambiar el nombre cambia la dirección pública. |
| Plantilla del script | `docs/apps-script/Code.gs` se versiona (sin claves). Cualquier otro `Code.gs` está en `.gitignore`. | Que una copia con una clave nunca se suba por error. |
| Pruebas | `tests/apps-script/`: simulador de Google y 128 comprobaciones del `Code.gs`. `tests/app/`: pruebas de la app en un navegador real contra ese simulador (sin claves ni direcciones reales). | Probar el mismo código que se pega en Apps Script, sin tocar ningún Sheet real. |
| Historial de Git | No se reescribe. Los enlaces antiguos del Sheet que siguen en él ya no funcionan (401) y no hay claves. | Decisión de Santiago: no cambiar un repositorio público ya publicado sin un beneficio real de seguridad. |

## Mecanismo actual: Google Apps Script (puente temporal)

**Para qué sirve:** probar la app con un Sheet privado, con clave, y guardar notas desde el móvil. **Solo con datos de prueba. Con alumnos reales NO se usa.**

**Cómo funciona:**
- El Sheet es privado ("Restringido") y sin "Publicar en la web".
- Un script de Apps Script (`docs/apps-script/Code.gs`, guía en `docs/apps-script/GUIA.md`) vive dentro del Sheet y se ejecuta con la cuenta de Santiago. Solo atiende peticiones con la clave correcta.
- El script lee Alumnos, Ofertas y Listas, y escribe solo las 2 columnas de entrevista.
- La app guarda en el móvil solo la dirección del script y la clave (`localStorage`), y las olvida con "Olvidar acceso".

**Riesgos conocidos:**
- **Cuenta personal:** el script se ejecuta con una cuenta de Gmail personal. Con alumnos **reales**, probablemente choca con la política de datos de la escuela y con el RGPD. Pedir visto bueno antes.
- **Clave única compartida:** no distingue personas, no se revoca por persona y no deja registro de quién consultó o escribió qué. Dos personas con la misma clave aparecen como una.
- **Clave en el móvil:** está en el almacenamiento del navegador, sin cifrar. Quien use ese móvil desbloqueado puede usar la app. Un móvil perdido obliga a **cambiar la clave** (Propiedades del script).
- **Fuerza bruta y bloqueo:** la dirección es pública. Hacen falta clave larga (mínimo 16 caracteres, lo exige el script) y el bloqueo. A cambio, cualquiera que conozca la dirección puede **bloquear** a todos 15 minutos con claves malas.
- **Notas delicadas:** las notas de entrevista son datos sensibles incluso con alumnos ficticios como práctica. No escribir en ellas nada real.
- **CV y fotos:** la clave no los protege. Sus enlaces tendrían que ser privados.
- **Sin historial de cambios propio:** si una nota se pisa o borra por error, solo sirve el historial de versiones de Google Sheets. Hacer copia de seguridad del Sheet.
- **Historial de Git:** los 3 enlaces del Sheet que estuvo publicado siguen escritos en el historial público del repositorio. Ya no funcionan (Google responde 401 desde que se detuvo la publicación). La dirección del script y la clave **nunca** estuvieron en el repositorio (revisado en todo el historial).
- **Lo que el simulador no prueba:** el redirect real de Google. Se comprobó a mano con el Sheet real (Santiago, pasos 2 y 3).

## Al migrar a Microsoft

Este puente (Apps Script + clave compartida + cuenta personal de Google) es **temporal y solo para datos de prueba**. Con alumnos reales, el destino es Microsoft con inicio de sesión individual. Qué hay que hacer, en orden:

1. **Pedir a TI de la organización** el registro de la app en Microsoft Entra ID (antes Azure AD) y su visto bueno de seguridad y protección de datos. Sin esto no se debe empezar con datos reales.
2. **Cambiar la fuente de datos a Microsoft Graph y SharePoint (o Excel en SharePoint):**
   - Crear `js/data/fuente-graph.js` que devuelva lo mismo que `fuente-apps-script.js`: tablas `{ cabecera, filas }` para Alumnos, Ofertas y Listas (la conversión a objetos ya es común, en `tablas.js`), y una función para guardar la entrevista.
   - Elegirla en `js/data/index.js` (hoy decide entre `demo` y `script`).
   - Las pantallas (`js/vistas/`) no cambian: solo usan `getAlumnos()`, `getMasters()`, `guardarEntrevista()`, etc.
3. **Quitar la clave compartida** y usar **inicio de sesión individual (Entra ID)**:
   - Sustituir la pantalla de Acceso (`js/vistas/acceso.js`) por "Iniciar sesión con Microsoft".
   - Borrar `js/data/acceso.js` y `js/data/fuente-apps-script.js`, que guardan la dirección y la clave.
   - El permiso de escribir las notas pasa a ser **por persona** (SharePoint), no un "puedeEscribir" global.
   - Ajustar la política de seguridad de `index.html`: quitar `script.google.com` y `script.googleusercontent.com` y añadir solo los dominios de Microsoft imprescindibles (`login.microsoftonline.com`, `graph.microsoft.com`).
4. **Borrar el Apps Script y el Sheet de Google** cuando ya no hagan falta: en Apps Script, Implementar, Gestionar implementaciones, Archivar; y eliminar el Sheet (y la copia de seguridad). Quitar `docs/apps-script/` y `tests/apps-script/` del repositorio, o archivarlos.
5. **Decidir dónde viven los CV y las fotos reales:** carpeta de SharePoint con permisos por persona, no enlaces públicos ni `example.com`. Revisar `js/util/cv.js` (hoy desvía los enlaces de ejemplo a una página de la app). Mantener las fotos como iniciales hasta que haya consentimiento.
6. **Antes de usar alumnos reales:** completar la lista de abajo. Y mover la app a un alojamiento que decida la organización: GitHub Pages es público.

**Qué se conserva tal cual:** las pantallas, el esquema de columnas (`esquema.js`), los filtros, el diseño, el service worker, el modo demo y las pruebas de la lógica.

## Antes de usar alumnos reales (lista de comprobación)
- [ ] Visto bueno de la escuela (protección de datos, RGPD) y de TI.
- [ ] Migración a Microsoft con inicio de sesión individual (sección anterior). **No** usar el puente de Google con datos reales.
- [ ] Dejar de publicar el Sheet de prueba y no usar nunca "Publicar en la web" con datos reales.
- [ ] Repositorio sin datos reales ni enlaces a datos reales; la web alojada donde decida la organización, no en GitHub Pages público.
- [ ] CV y fotos con enlaces privados y permisos por persona.
- [ ] Decidir quién puede ver y escribir notas de entrevista, durante cuánto tiempo se guardan y cómo se borran.
- [ ] Revisión de seguridad independiente antes de abrirla a más gente.
