# Decisiones del proyecto

Última actualización: 2026-10-31. Fase 1: solo lectura, solo datos de prueba (ficticios).

## Decididas

| Tema | Decisión | Por qué |
|---|---|---|
| Datos | Solo datos ficticios. Avatares con iniciales, sin fotos de personas reales. | Privacidad: el repositorio y la web son públicos. |
| Claves | Ninguna clave, token ni contraseña en el código ni en el repo. | Repo público. |
| Tecnología | HTML, CSS y JavaScript puros, sin instalar ni compilar nada. Módulos JS. Sin librerías ni CDN. | Lo más simple; se publica tal cual en GitHub Pages. |
| Rutas | Con `#` (por ejemplo `#/master/MBA en inglés`). | GitHub Pages no entiende rutas de servidor. |
| Acceso a datos | Todo pasa por `js/data/` (`getAlumnos`, `getOfertas`, `getListas`, `getMasters`). Las pantallas nunca leen archivos ni Google directamente. | Migrar a Microsoft Graph tocando pocas piezas: un archivo nuevo en `js/data/` y una línea en `config.js`. |
| Fuente actual | Google Sheet "Alumnos LBS – MOCK" publicado como CSV (una hoja por enlace). Si falla, datos de respaldo de `datos-mock/`, con aviso en pantalla. | No necesita claves; vale solo con datos de prueba. |
| Solo lectura | La app no edita nada. | Alcance de la Fase 1. |
| Diseño | Tema LaLiga con los mismos valores que la app de gastos. Open Sans en el repo. Márgenes de 24 px, tarjetas de 24 px de radio, botones de 44 px como mínimo. | Coherencia con tu app de gastos. |
| Contraste | El rojo `#D63B45` solo como fondo (con texto blanco, 4,59:1). Como texto de color se usa `#FF6B73`. | Como texto sobre tarjeta el rojo da 3,44:1 y no pasa 4,5:1. |
| Sin zoom | Se cancelan los gestos de pellizco y se usa `touch-action: manipulation`. El viewport no lleva `user-scalable`. | Igual que gastos; comprobado en iPhone. |
| Textos de los datos | Siempre se escriben como texto (nunca `innerHTML`). | Una celda con código no puede ejecutarse. |
| Buscadores | `noindex` en `index.html` y `robots.txt`. | Evita que salga en Google. No hace la app privada. |
| Caché | Cada cambio en archivos de la app: subir `CACHE` en `sw.js`. Los datos van primero por red. | Que el móvil cargue siempre la versión nueva. |
| CV de ejemplo | Los enlaces `example.com/cv/…` se desvían a una página "CV de ejemplo" dentro de la app (Paso 5), sin tocar el Sheet. | Pedido por Santiago. |
| Disponibilidad | Tres valores: Prácticas, Empleo, Ambas. | Ya estaban en los datos de prueba. |

## Pendiente (sin código todavía): Sheet privado y acceso con clave

**Estado:** solo plan. No empezar hasta que Santiago diga "adelante".

**Objetivo:** el Sheet deja de estar publicado en la web. Los datos solo salen con una clave.

**Cómo funciona la app de gastos (referencia):** el Sheet es privado. Un script de Apps Script, pegado en el Sheet, comprueba una clave que envía la app. La dirección del script y la clave se guardan solo en el móvil (localStorage) y no están en el repo.

**Plan de aplicación:**
1. Un `Code.gs` de solo lectura (`ping` y `data`: Alumnos, Ofertas y Listas), guardado como plantilla **sin clave** en `docs/apps-script/`.
   - La clave va en Propiedades del script, no en el código.
   - Bloqueo temporal tras varios intentos fallidos.
2. Un archivo nuevo `js/data/fuente-apps-script.js`, con las mismas funciones que la fuente actual.
3. Una pantalla de "Acceso" (dirección del script y clave, se piden una vez) y botón para olvidar el acceso.
4. Quitar de `config.js` los enlaces del Sheet publicado. Los datos de prueba pasan a un "modo demo" claramente rotulado.
5. La app no guarda datos en el móvil, solo la dirección y la clave.

**Qué tendría que hacer Santiago:**
1. Dejar de publicar las 3 hojas (Archivo, Compartir, Publicar en la web, Detener publicación).
2. Extensiones, Apps Script: pegar el `Code.gs`.
3. En Propiedades del script: añadir `CLAVE` con una frase larga (4 palabras o más) que no use en otro sitio.
4. Implementar, Nueva implementación, Aplicación web (ejecutar como él; acceso: cualquier usuario). Copiar la dirección terminada en `/exec`.
5. Escribir la dirección y la clave en la app desde el móvil. No pegarlas en chats ni en el repo.
6. Probar con una clave mala y comprobar el bloqueo.
7. Los cambios futuros del script: "Nueva versión" de la misma implementación (no una nueva).

**Riesgos conocidos:**
- **Cuenta personal:** el script se ejecuta con una cuenta de Gmail personal. Con alumnos **reales**, probablemente choca con la política de datos de la escuela y con el RGPD. Pedir visto bueno antes.
- **Clave única compartida:** no distingue personas, no se revoca por persona y no deja registro de quién consultó qué.
- **Fuerza bruta:** la dirección del script es pública. Hacen falta clave larga y bloqueo.
- **Móvil perdido:** la clave está en el móvil.
- **CV y fotos:** la clave no los protege. Sus enlaces tendrían que ser privados (Fase 2).
- **Historial de Git:** los enlaces del Sheet publicado ya están en el historial público. Dejan de funcionar al detener la publicación.
- **Microsoft:** el destino correcto es un inicio de sesión individual (Entra ID) con SharePoint o Excel, con permisos por persona y registro. Requiere a IT de LaLiga. La capa de datos ya lo permite; cambiaría la pantalla de Acceso.

**Recomendación:** usar este mecanismo solo con datos de prueba. Para datos reales, pasar a Microsoft con inicio de sesión, no a una clave compartida en una cuenta personal.

## Antes de usar alumnos reales (lista de comprobación)
- [ ] Visto bueno de la escuela (protección de datos).
- [ ] Dejar de publicar el Sheet de prueba y no usar nunca "Publicar en la web" con datos reales.
- [ ] Repositorio sin datos reales ni enlaces a datos reales.
- [ ] Inicio de sesión individual (Microsoft) o, como mínimo, el plan de clave de arriba.
- [ ] CV y fotos con enlaces privados.
