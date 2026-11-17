# Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

## Qué es

Una aplicación para el móvil que ayuda a **consultar a los alumnos de los programas de LaLiga Business School y a encontrarles prácticas o empleo**. Se abre desde el navegador y se puede instalar en la pantalla de inicio del teléfono como cualquier otra app.

**Todos los datos que se ven son inventados.** Los nombres de las personas, las empresas y las ofertas son de ejemplo. No hay ni una sola persona real dentro.

La dirección para probarla te la da quien la administra.

## Para qué sirve

La idea es que quien acompaña a los alumnos pueda, desde el móvil y en pocos toques:

- ver quién está en cada programa y qué busca cada persona;
- buscar a alguien por su área, su país o si necesita permiso de trabajo;
- apuntar las notas de una entrevista;
- llevar el control de las ofertas de prácticas y de empleo que van llegando;
- seguir qué alumnos aplican a cada oferta y en qué punto está cada candidatura.

## Qué hace hoy

| Qué | Cómo se usa |
|---|---|
| **Ver los programas y sus alumnos** | En Inicio los programas están arriba, agrupados en 4 secciones desplegables (**MBA** la primera y abierta, y después Másteres, LaLiga Executive Education y Formación para Jugadores). Salen **todos** los programas, aunque no tengan alumnos. Se elige uno y sale la lista de alumnos. La lista de programas y la categoría de cada uno se cambian en el Sheet (hoja Listas), sin tocar la app. |
| **Ver la ficha de cada alumno** | Nacionalidad, situación de trabajo en España, experiencia, a qué área quiere ir y por qué, y un botón para ver su CV. |
| **Buscar y filtrar alumnos** | En la pestaña Buscar se escribe un nombre, un área o un país, y se afina con filtros (área, nacionalidad, situación de trabajo, prácticas o empleo). |
| **Apuntar notas de entrevista** | En la ficha de un alumno, el botón "Editar entrevista" guarda la nota y la fecha. |
| **Ver las ofertas** | En la pestaña Ofertas se ve la lista (las más recientes primero) y se puede buscar y filtrar por estado, tipo y área. Cada oferta tiene su ficha. |
| **Añadir y editar ofertas** | Con "Nueva oferta" y "Editar oferta". Cada oferta lleva su **perfil del puesto** (país, subárea, etiquetas, idiomas y nivel de formación), que el match compara con cada alumno. Las ofertas no se borran: cuando ya no valen, se cierran. |
| **Ver las rondas de una oferta** | En la ficha de la oferta salen sus rondas (cada vez que se reenvía a los alumnos) y, en cada una, los alumnos que han aplicado y cómo va cada uno. |
| **Registrar una ronda y añadir solicitudes** | "Registrar nueva ronda" y, dentro de cada ronda, "Añadir solicitud": se busca al alumno, se elige y se guarda. |
| **Cambiar el estado de una solicitud** | En su detalle, "Cambiar estado". Todo queda apuntado en un historial con fecha y nota, que no se borra. |
| **Ver las solicitudes de un alumno** | En su ficha, en el apartado "Solicitudes". |
| **Ver qué alumnos encajan con una oferta** | En la ficha de la oferta, la tarjeta "Alumnos que encajan" reparte a **todos** los alumnos en tres grupos (encaja, encaja con reservas, no encaja) y cada fila explica por qué, con su semáforo, su puntuación ("Encaje 82 %"; en "No encaja" se llama "Afinidad", en gris, porque solo dice cuánto se parece el perfil, no si puede ocupar la oferta) y los datos que faltan. En la ficha del alumno, "Ofertas que encajan" hace lo mismo al revés. |
| **Compartir perfiles** | En la ficha de la oferta se marcan hasta 10 alumnos (o, en la ficha de un alumno, "Compartir perfil"), se ve una vista previa con el texto exacto y se envía con el menú de compartir del móvil o se copia. |
| **Ver avisos sobre los alumnos** | En Inicio, debajo de los programas, la tarjeta **Avisos** (con borde naranja) cuenta los alumnos «sin solicitudes» y los que «aplican a todo». Al tocar uno se ve quién es y **por qué ha saltado**, con los números. También sale una marca en la lista del máster y una tarjeta en la ficha. Solo informan: no bloquean nada. Se pueden **silenciar 30 días**. Aparte hay avisos de **datos** (en rojo, con un triángulo y la palabra «Datos del Sheet»), por ejemplo un programa que no está en la hoja Listas: **no se pueden silenciar**, salen aunque no haya rondas y se quitan arreglando el Sheet. Los de **seguimiento** (naranja, con un reloj) y los de datos se distinguen por la forma, la palabra y el color, no solo por el color. |
| **Preparar un correo de seguimiento** | En el detalle de una solicitud, **Borrador de correo** (si está en proceso o descartada): se elige español o inglés, se ve el texto exacto y se copia o se abre en la app de correo. No incluye notas, motivos de descarte, situación de trabajo ni estatus migratorio. |
| **Ajustar los avisos y la firma** | En **Ajustes**: los días, las ofertas y las solicitudes que cuentan para los avisos, y tu nombre para firmar los correos. Se guardan solo en ese móvil. |
| **Ver la conexión y la versión de la app** | En la pestaña **Ajustes** (la cuarta de la barra de abajo): si estás en la demo o conectado al Sheet, "Olvidar acceso", el número de versión y el botón **Buscar actualización**, que carga la última versión sin tener que cerrar la app. Las secciones se pliegan y se despliegan con una flecha (solo «Conexión» empieza abierta, y lo que dejas abierto se recuerda en ese móvil). |
| **Actualizar los datos sin cerrar la app** | El botón de las **dos flechas circulares**, arriba a la derecha, vuelve a leer el Sheet (v28). Gira mientras carga y, si falla (sin conexión, clave que ya no vale…), lo dice y deja a la vista los datos de antes. **No se ve** en la demo ni en las pantallas donde estás escribiendo (formularios, notas de entrevista, borrador de correo), para no perder nada. No guarda ninguna copia de los datos en el móvil. No se actualiza solo: lo decides tú. |

Guardar notas, ofertas, rondas y solicitudes solo funciona cuando la app está **conectada a la hoja de cálculo de prueba** (ver más abajo). En la demo se puede mirar todo, pero no guardar nada.

## Qué NO hace todavía

Esto está pensado para crecer por partes. Aún no hay:

- **Borrar rondas, solicitudes o su historial:** nada se borra desde la app. Si una solicitud ya no vale, se marca como "Descartado".
- **Decidir por ti:** "Alumnos que encajan" solo ordena y explica; no descarta a nadie ni envía nada a las empresas.
- **Enviar correos:** los borradores se copian o se abren en tu app de correo; la app no envía nada ni guarda qué se mandó.
- **Anotar lo que se comparte:** la app no apunta quién compartió qué perfil ni con quién. Es un requisito antes de usar datos reales (ver DECISIONES).
- **Inicio de sesión personal:** hoy todas las personas autorizadas usan la misma clave.
- **Crear, borrar o mover alumnos** desde la app. Eso se hace en la hoja de cálculo.
- **Fotos reales:** solo hay círculos con las iniciales.
- **Funcionar sin conexión con datos reales:** sin internet solo se puede ver la demo.

## Cómo funcionan las rondas y las solicitudes

> **Equivalencia de nombres.** En la app se dice **solicitud**; en el Sheet, esa misma cosa se sigue llamando **Aplicaciones** (la hoja) y **Estado de la aplicación** (la lista), y en el código y el script `aplicacion`. No hay que cambiar nada en el Sheet.

- Una **ronda** es cada vez que una oferta se reenvía a los alumnos. Una oferta puede tener varias: ronda 1, ronda 2…
- Una **solicitud** es un alumno que responde a una ronda. Si el mismo alumno responde a dos rondas, salen dos solicitudes.
- Cada solicitud tiene un **estado**: Recibida, En revisión, Enviada a la empresa, Entrevista, Contratado o Descartado. Si es Descartado, se indica el motivo (por ejemplo, "Permiso de trabajo").
- Cada cambio de estado se apunta en un **historial** con su fecha y una nota. El historial no se edita ni se borra.
- La app **avisa, sin impedir nada,** si la oferta está cerrada o si lo que pide (permiso de trabajo, nacionalidad) choca claramente con la situación del alumno.
- Si dos personas cambian lo mismo a la vez, la app lo detecta y enseña lo que hay antes de pisar nada.

## Cómo funcionan "Alumnos que encajan" y "Compartir perfiles"

**Alumnos que encajan.** Para cada alumno se miran **ocho cosas** y se escribe el motivo de cada una, con un semáforo (verde cumple, amarillo afín o a revisar, rojo no coincide) y los puntos que da:

| Qué se mira | Peso | Cómo se decide |
|---|---|---|
| Área | 30 | Si la oferta es del área a la que **quiere ir**, encaja. Si solo tiene **experiencia** en ella, o es un área **afín** (hoja Afinidad), se revisa. |
| Subárea | 10 | Su experiencia en la subárea de la oferta (hoja Áreas). |
| Habilidades | 20 | Las etiquetas de la oferta frente a las del alumno (lista cerrada: hoja Etiquetas; coincidencia exacta, sin sinónimos). |
| Idiomas | 15 | Cada idioma con su nivel (A1 a C2 o nativo). |
| Formación | 5 | Grado, Máster o Doctorado que pide la oferta frente a su formación previa. |
| Tipo (prácticas o empleo) | 10 | Lo que busca el alumno frente al tipo de la oferta. |
| Nacionalidad | 5 | Si la oferta pide un país, el alumno debe tenerlo. Si pide **Unión Europea (UE/EEE)**, vale cualquier país de la UE o del EEE (hoja Países), o que su situación sea "Ciudadano UE o español". **Suiza se revisa a mano.** |
| Permiso de trabajo | 5 | Lo decide la hoja **Reglas migratorias** (situación, tipo de oferta y país de la oferta, con su fecha de validación; una regla de más de 12 meses se marca para revalidar). **"Permiso de estudiante" se revisa** y nunca se da por perdido. |

**Lo que no consta no suma ni resta.** Si falta un dato (un alumno sin idiomas escritos, un país que no está en la hoja Países…), ese criterio sale **"Sin datos"** (a revisar): no da puntos y **nunca cuenta como "no cumple"**. La puntuación («Encaje 82 %») se calcula solo sobre los criterios con datos, y la fila avisa «datos incompletos». Lo que la oferta no pide sale «No aplica».

Los alumnos se reparten en tres grupos según los cuatro criterios básicos (área, tipo, nacionalidad y permiso): "encaja", "encaja con reservas" y "no encaja"; dentro de cada grupo van ordenados por puntuación. Cada fila enseña el **% con el color de su grupo** (verde y ámbar; en «No encaja» se llama «Afinidad» y va en gris) y, en **una línea**, lo que falla (por ejemplo «✗ No cumple: tipo, nacionalidad, permiso» o, con un solo fallo, «✗ Área · No cumple»); el detalle completo está en «Por qué», y la razón migratoria larga se acorta con «ver más». **Nadie desaparece de la lista**, y los avisos de "Añadir solicitud" usan exactamente las mismas reglas. Siempre se ve el aviso **«Orientativo, verifica la situación real»**: es una ayuda para mirar, y si alguien puede trabajar o no lo decide siempre una persona. La tabla exacta está en [docs/REGLAS-MATCH.md](docs/REGLAS-MATCH.md).

**Compartir perfiles.** Siempre pasa por una **vista previa** con el texto exacto que se enviará. Por defecto solo salen nombre, programa, área y qué busca. Nacionalidad, situación de trabajo, resumen de experiencia y enlace al CV (solo si es `https`) son **datos sensibles** y vienen desmarcados. Las notas de entrevista, el historial y los motivos de descarte **nunca** se incluyen. El máximo es de 10 alumnos por envío. Hay una casilla aparte, desmarcada, **«Incluir historia»**: un párrafo corto armado con plantillas a partir de las subáreas, las habilidades, los idiomas y la formación (sin repetir el programa, el área ni lo que busca, que ya salen en sus líneas; los idiomas van **sin nivel ni «nativo»**, para no insinuar nacionalidad; nunca el «por qué» ni datos sensibles). La app no guarda nada de lo compartido.

## Cómo funcionan los avisos y los borradores de correo

**Avisos.** Se calculan en el móvil con las rondas y las solicitudes (sin tocar el Sheet). Con los valores por defecto:

| Aviso | Salta cuando… |
|---|---|
| **Sin solicitudes** | En los últimos 30 días se difundieron al menos 3 ofertas y el alumno no ha hecho **ninguna** solicitud. No salta a quien ya está Contratado, y cuenta desde la primera ronda registrada si es más reciente. |
| **Aplica a todo** | En los últimos 30 días ha hecho al menos 5 solicitudes y a un 80 % o más de las ofertas difundidas. Se añade cuántas de esas ofertas el match marca como «no encaja», pero eso no decide nada. |

Los cuatro números (días, ofertas, solicitudes y porcentaje) se cambian en Ajustes. **Un aviso nunca bloquea nada** y siempre dice por qué ha saltado. «Silenciar 30 días» lo oculta de los contadores hasta esa fecha; se guarda solo en ese móvil.

**Borradores de correo.** Hay dos: **en proceso** (Recibida, En revisión, Enviada a la empresa y Entrevista) y **descartado**, que dice con tacto que la solicitud no continúa e **invita a acercarse** si quiere ir hacia el área de la oferta. Se escriben en español, o en inglés para el MBA en inglés, y se puede cambiar el idioma en la vista previa. El texto solo usa el nombre de pila, el puesto, la empresa y el estado: **nunca** notas de entrevista, motivos de descarte, situación de trabajo ni estatus migratorio. La app no envía nada: se copia o se abre en la app de correo, sin destinatario.

## Dos formas de usarla

Al abrir la app por primera vez, se elige una de las dos:

1. **Ver demo.** Muestra los datos de ejemplo que vienen con la app. Arriba aparece siempre el aviso **MODO DEMO** y no se puede guardar nada. No hace falta nada más.
2. **Conectar.** Hace falta una dirección y una clave que da quien administra la hoja de cálculo de prueba. Con ellas se ven los datos de esa hoja y se pueden guardar notas, ofertas, rondas y solicitudes. La dirección y la clave quedan guardadas solo en ese teléfono, y se pueden olvidar con el botón "Olvidar acceso" de Inicio.

## Instalarla en el iPhone

1. Abre la dirección de la app (te la da quien la administra) en **Safari**.
2. Pulsa el botón de compartir (el cuadrado con una flecha hacia arriba).
3. Elige **"Añadir a pantalla de inicio"**.
4. A partir de ahí se abre como una app más.

## Privacidad y avisos importantes

- **Solo datos de prueba.** No uses esta app con alumnos reales ni escribas información real en ella.
- **Es una demostración personal.** No es una app oficial ni está afiliada a LaLiga ni a LaLiga Business School. No lleva sus logos ni sus nombres comerciales.
- **No es privada por sí sola:** la página es pública, pero sin la clave no se ve ningún dato. Aun así, nada de lo que hay detrás está preparado para datos reales.
- **La clave es una para todos.** Si se pierde un móvil, hay que cambiar la clave. Quien administra la hoja sabe cómo (está explicado en la guía).
- **Lo que compartes sale de la app.** Al enviar o copiar un perfil, el texto ya no se controla (quien lo recibe puede reenviarlo) y la app no deja registro. Con datos reales haría falta el permiso de cada persona y un registro de lo compartido.
- **Los datos no se guardan en el teléfono.** Se piden cada vez y solo se muestran. Lo que escribes en un formulario tampoco se guarda hasta que pulsas Guardar.
- Para usarla con datos reales habría que montarla de nuevo dentro de la organización, con inicio de sesión personal, protección de datos y la aprobación del equipo de informática. Todo eso está explicado en el documento técnico.

## Quién lee qué

| Documento | Para quién | Qué cuenta |
|---|---|---|
| Este archivo (`README.md`) | Cualquier persona | Qué es la app, qué hace y qué no. |
| [docs/TECNICO.md](docs/TECNICO.md) | Informática (TI) y quien mantiene la app | Cómo está hecha, cómo se conecta, qué seguridad tiene, sus límites y qué hace falta para integrarla en LaLiga. |
| [docs/apps-script/GUIA.md](docs/apps-script/GUIA.md) | Quien administra la hoja de prueba | Paso a paso para poner en marcha la conexión con clave. |
| [docs/PREPARAR-LALIGA.md](docs/PREPARAR-LALIGA.md) | Quien impulsa el proyecto | Qué se puede preparar hoy sin datos reales y qué depende de LaLiga y TI (Microsoft Forms y Entra ID). |
| [docs/PREGUNTAS-TI.md](docs/PREGUNTAS-TI.md) | Equipo de TI | Las preguntas que hay que contestar antes de usar datos reales. |
| [DECISIONES.md](DECISIONES.md) | Quien mantiene la app | Qué se decidió, por qué, y los riesgos conocidos. |
