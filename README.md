# Gestión de alumnos (demo)

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

## Qué es

Una aplicación para el móvil que ayuda a **consultar a los alumnos de un máster y a encontrarles prácticas o empleo**. Se abre desde el navegador y se puede instalar en la pantalla de inicio del teléfono como cualquier otra app.

**Todos los datos que se ven son inventados.** Los nombres de las personas, las empresas y las ofertas son de ejemplo. No hay ni una sola persona real dentro.

Dirección para probarla: https://santiagofloressolbes.github.io/gestion-alumnos-demo/

## Para qué sirve

La idea es que quien acompaña a los alumnos pueda, desde el móvil y en pocos toques:

- ver quién está en cada máster y qué busca cada persona;
- buscar a alguien por su área, su país o si necesita permiso de trabajo;
- apuntar las notas de una entrevista;
- llevar el control de las ofertas de prácticas y de empleo que van llegando;
- seguir qué alumnos aplican a cada oferta y en qué punto está cada candidatura.

## Qué hace hoy

| Qué | Cómo se usa |
|---|---|
| **Ver los másteres y sus alumnos** | En Inicio se elige un máster y sale la lista de alumnos. |
| **Ver la ficha de cada alumno** | Nacionalidad, situación de trabajo en España, experiencia, a qué área quiere ir y por qué, y un botón para ver su CV. |
| **Buscar y filtrar alumnos** | En la pestaña Buscar se escribe un nombre, un área o un país, y se afina con filtros (área, nacionalidad, situación de trabajo, prácticas o empleo). |
| **Apuntar notas de entrevista** | En la ficha de un alumno, el botón "Editar entrevista" guarda la nota y la fecha. |
| **Ver las ofertas** | En la pestaña Ofertas se ve la lista (las más recientes primero) y se puede buscar y filtrar por estado, tipo y área. Cada oferta tiene su ficha. |
| **Añadir y editar ofertas** | Con "Nueva oferta" y "Editar oferta". Las ofertas no se borran: cuando ya no valen, se cierran. |
| **Ver las rondas de una oferta** | En la ficha de la oferta salen sus rondas (cada vez que se reenvía a los alumnos) y, en cada una, los alumnos que han aplicado y cómo va cada uno. |
| **Registrar una ronda y añadir aplicaciones** | "Registrar ronda de difusión" y, dentro de cada ronda, "Añadir aplicación": se busca al alumno, se elige y se guarda. |
| **Cambiar el estado de una aplicación** | En su detalle, "Cambiar estado". Todo queda apuntado en un historial con fecha y nota, que no se borra. |
| **Ver las aplicaciones de un alumno** | En su ficha, en el apartado "Aplicaciones". |
| **Ver la conexión y la versión de la app** | En la pestaña **Ajustes** (la cuarta de la barra de abajo): si estás en la demo o conectado al Sheet, "Olvidar acceso", el número de versión y el botón **Buscar actualización**, que carga la última versión sin tener que cerrar la app. |

Guardar notas, ofertas, rondas y aplicaciones solo funciona cuando la app está **conectada a la hoja de cálculo de prueba** (ver más abajo). En la demo se puede mirar todo, pero no guardar nada.

## Qué NO hace todavía

Esto está pensado para crecer por partes. Aún no hay:

- **Borrar rondas, aplicaciones o su historial:** nada se borra desde la app. Si una aplicación ya no vale, se marca como "Descartado".
- **Recomendación automática** de a qué ofertas encaja cada alumno.
- **Compartir perfiles** con las empresas.
- **Inicio de sesión personal:** hoy todas las personas autorizadas usan la misma clave.
- **Crear, borrar o mover alumnos** desde la app. Eso se hace en la hoja de cálculo.
- **Fotos reales:** solo hay círculos con las iniciales.
- **Funcionar sin conexión con datos reales:** sin internet solo se puede ver la demo.

## Cómo funcionan las rondas y las aplicaciones

- Una **ronda** es cada vez que una oferta se reenvía a los alumnos. Una oferta puede tener varias: ronda 1, ronda 2…
- Una **aplicación** es un alumno que responde a una ronda. Si el mismo alumno responde a dos rondas, salen dos aplicaciones.
- Cada aplicación tiene un **estado**: Recibida, En revisión, Enviada a la empresa, Entrevista, Contratado o Descartado. Si es Descartado, se indica el motivo (por ejemplo, "Permiso de trabajo").
- Cada cambio de estado se apunta en un **historial** con su fecha y una nota. El historial no se edita ni se borra.
- La app **avisa, sin impedir nada,** si la oferta está cerrada o si lo que pide (permiso de trabajo, nacionalidad) choca claramente con la situación del alumno.
- Si dos personas cambian lo mismo a la vez, la app lo detecta y enseña lo que hay antes de pisar nada.

## Dos formas de usarla

Al abrir la app por primera vez, se elige una de las dos:

1. **Ver demo.** Muestra los datos de ejemplo que vienen con la app. Arriba aparece siempre el aviso **MODO DEMO** y no se puede guardar nada. No hace falta nada más.
2. **Conectar.** Hace falta una dirección y una clave que da quien administra la hoja de cálculo de prueba. Con ellas se ven los datos de esa hoja y se pueden guardar notas, ofertas, rondas y aplicaciones. La dirección y la clave quedan guardadas solo en ese teléfono, y se pueden olvidar con el botón "Olvidar acceso" de Inicio.

## Instalarla en el iPhone

1. Abre la dirección de arriba en **Safari**.
2. Pulsa el botón de compartir (el cuadrado con una flecha hacia arriba).
3. Elige **"Añadir a pantalla de inicio"**.
4. A partir de ahí se abre como una app más.

## Privacidad y avisos importantes

- **Solo datos de prueba.** No uses esta app con alumnos reales ni escribas información real en ella.
- **Es una demostración personal.** No es una app oficial ni está afiliada a LaLiga ni a LaLiga Business School. No lleva sus logos ni sus nombres comerciales.
- **No es privada por sí sola:** la página es pública, pero sin la clave no se ve ningún dato. Aun así, nada de lo que hay detrás está preparado para datos reales.
- **La clave es una para todos.** Si se pierde un móvil, hay que cambiar la clave. Quien administra la hoja sabe cómo (está explicado en la guía).
- **Los datos no se guardan en el teléfono.** Se piden cada vez y solo se muestran. Lo que escribes en un formulario tampoco se guarda hasta que pulsas Guardar.
- Para usarla con datos reales habría que montarla de nuevo dentro de la organización, con inicio de sesión personal, protección de datos y la aprobación del equipo de informática. Todo eso está explicado en el documento técnico.

## Quién lee qué

| Documento | Para quién | Qué cuenta |
|---|---|---|
| Este archivo (`README.md`) | Cualquier persona | Qué es la app, qué hace y qué no. |
| [docs/TECNICO.md](docs/TECNICO.md) | Informática (TI) y quien mantiene la app | Cómo está hecha, cómo se conecta, qué seguridad tiene, sus límites y qué hace falta para integrarla en LaLiga. |
| [docs/apps-script/GUIA.md](docs/apps-script/GUIA.md) | Quien administra la hoja de prueba | Paso a paso para poner en marcha la conexión con clave. |
| [DECISIONES.md](DECISIONES.md) | Quien mantiene la app | Qué se decidió, por qué, y los riesgos conocidos. |
