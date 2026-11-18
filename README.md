# Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

## Qué es

Una aplicación para el móvil que ayuda a **consultar a los alumnos de los programas de LaLiga Business School y a encontrarles prácticas o empleo**. Se abre desde el navegador y se puede instalar en la pantalla de inicio del teléfono como cualquier otra app.

**Todos los datos que se ven son inventados.** Los nombres de las personas, las empresas y las ofertas son de ejemplo. No hay ni una sola persona real dentro. La dirección para probarla te la da quien la administra.

## Para qué sirve

Que quien acompaña a los alumnos pueda, desde el móvil y en pocos toques:

- ver quién está en cada programa y qué busca cada persona;
- buscar a alguien por su área, su país o si necesita permiso de trabajo;
- apuntar las notas de una entrevista;
- llevar el control de las ofertas de prácticas y de empleo que van llegando;
- seguir qué alumnos aplican a cada oferta y en qué punto está cada candidatura.

## Qué hace

Cada punto se explica en [docs/FUNCIONAMIENTO.md](docs/FUNCIONAMIENTO.md).

- **Programas y alumnos:** todos los programas agrupados en Inicio, con la lista y la ficha de cada alumno.
- **Buscar y filtrar** alumnos por nombre, área, país, situación de trabajo o prácticas y empleo.
- **Notas de entrevista** en la ficha de cada alumno.
- **Ofertas:** lista, ficha, alta y edición, con su perfil del puesto. Las ofertas no se borran: se cierran.
- **Rondas y solicitudes:** cada vez que una oferta se reenvía a los alumnos se registra una ronda; cada alumno que responde es una solicitud, con su estado y su historial.
- **Alumnos que encajan:** para cada oferta, ordena y explica a todos los alumnos en tres grupos (encaja, encaja con reservas, encaja poco), y al revés desde la ficha del alumno. Solo orienta: las reglas exactas están en [docs/REGLAS-MATCH.md](docs/REGLAS-MATCH.md).
- **Compartir perfiles** (hasta 10 por envío), siempre con vista previa del texto exacto.
- **Avisos** sobre alumnos sin solicitudes o que aplican a todo, y avisos de datos que corregir en la hoja de cálculo.
- **Borradores de correo** de seguimiento, en español o en inglés, que se copian o se abren en la app de correo.
- **Ajustes:** conexión, umbrales de los avisos, firma de los correos y búsqueda de actualizaciones.
- **Actualizar los datos sin cerrar la app:** el botón de las dos flechas circulares, arriba a la derecha, vuelve a leer la hoja de cálculo. No aparece en la demo ni donde estás escribiendo.

Guardar notas, ofertas, rondas y solicitudes solo funciona cuando la app está **conectada a la hoja de cálculo de prueba** (ver más abajo). En la demo se puede mirar todo, pero no guardar nada.

## Qué NO hace todavía

Esto está pensado para crecer por partes. Aún no hay:

- **Borrar rondas, solicitudes o su historial:** nada se borra desde la app. Si una solicitud ya no vale, se marca como "Descartado".
- **Decidir por ti:** "Alumnos que encajan" solo ordena y explica; no descarta a nadie ni envía nada a las empresas.
- **Enviar correos:** los borradores se copian o se abren en tu app de correo; la app no envía nada ni guarda qué se mandó.
- **Anotar lo que se comparte:** la app no apunta quién compartió qué perfil ni con quién. Es un requisito antes de usar datos reales (ver [DECISIONES.md](docs/DECISIONES.md)).
- **Inicio de sesión personal:** hoy todas las personas autorizadas usan la misma clave.
- **Crear, borrar o mover alumnos** desde la app. Eso se hace en la hoja de cálculo.
- **Fotos reales:** solo hay círculos con las iniciales.
- **Funcionar sin conexión con datos reales:** sin internet solo se puede ver la demo.

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
- **La clave es una para todos.** Si se pierde un móvil, hay que cambiar la clave. Quien administra la hoja de cálculo sabe cómo (está explicado en la guía).
- **Lo que compartes sale de la app.** Al enviar o copiar un perfil, el texto ya no se controla (quien lo recibe puede reenviarlo) y la app no deja registro. Con datos reales haría falta el permiso de cada persona y un registro de lo compartido.
- **Los datos de los alumnos no se guardan en el teléfono.** Se piden cada vez y solo se muestran. En el teléfono solo quedan la dirección y la clave del acceso y tus ajustes (firma, umbrales y avisos silenciados). Lo que escribes en un formulario tampoco se guarda hasta que pulsas Guardar.
- Para usarla con datos reales habría que montarla de nuevo dentro de la organización, con inicio de sesión personal, protección de datos y la aprobación del equipo de informática. Todo eso está explicado en el documento técnico.

## Derechos de uso

**Todos los derechos reservados.** El código se publica solo para consulta y evaluación; no se concede ninguna licencia de uso. Está explicado en [AVISO-DERECHOS.md](AVISO-DERECHOS.md). Para informar de un problema de seguridad, mira [SECURITY.md](SECURITY.md).

## Quién lee qué

| Documento | Para quién | Qué cuenta |
|---|---|---|
| Este archivo (`README.md`) | Cualquier persona | Qué es la app, qué hace y qué no. |
| [docs/FUNCIONAMIENTO.md](docs/FUNCIONAMIENTO.md) | Quien usa o prueba la app | Cómo funciona cada parte, en detalle: rondas y solicitudes, compartir, avisos y borradores de correo. |
| [docs/REGLAS-MATCH.md](docs/REGLAS-MATCH.md) | Quien quiere entender o revisar el match | Los ocho criterios, sus pesos y sus reglas exactas. |
| [docs/TECNICO.md](docs/TECNICO.md) | Informática (TI) y quien mantiene la app | Cómo está hecha, cómo se conecta, qué seguridad tiene, sus límites y qué hace falta para integrarla en LaLiga. |
| [docs/apps-script/GUIA.md](docs/apps-script/GUIA.md) | Quien administra la hoja de prueba | Paso a paso para poner en marcha la conexión con clave. |
| [docs/importar-hoja/PASOS.md](docs/importar-hoja/PASOS.md) | Quien administra la hoja de prueba | Cómo cargar en ella los datos de ejemplo del match. |
| [docs/PREPARAR-LALIGA.md](docs/PREPARAR-LALIGA.md) | Quien impulsa el proyecto | Qué se puede preparar hoy sin datos reales y qué depende de LaLiga y TI (Microsoft Forms y Entra ID). |
| [docs/PREGUNTAS-TI.md](docs/PREGUNTAS-TI.md) | Equipo de TI | Las preguntas que hay que contestar antes de usar datos reales: primero las 11 que bloquean el inicio. |
| [docs/VISIBILIDAD-REPO.md](docs/VISIBILIDAD-REPO.md) | Quien mantiene la app | Dos opciones para el repositorio (seguir público con datos ficticios o pasar a privado) y qué cambia con cada una. Preparado, sin ejecutar. |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Quien mantiene la app | Qué se decidió, por qué, y los riesgos conocidos. |
| [AVISO-DERECHOS.md](AVISO-DERECHOS.md) | Cualquier persona | Qué se puede y qué no se puede hacer con el código: todos los derechos reservados. |
| [SECURITY.md](SECURITY.md) | Quien encuentra un fallo de seguridad | Cómo informar de él de forma privada. |
