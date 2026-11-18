# Cómo funciona la app, en detalle

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

El [README](../README.md) tiene el resumen. Aquí está el detalle de cada parte, para quien usa la app o la prueba. Las reglas exactas del match están en [REGLAS-MATCH.md](REGLAS-MATCH.md); lo técnico, en [TECNICO.md](TECNICO.md).

## Índice

1. [Programas, alumnos y búsqueda](#1-programas-alumnos-y-búsqueda)
2. [Ofertas](#2-ofertas)
3. [Rondas y solicitudes](#3-rondas-y-solicitudes)
4. [Alumnos que encajan](#4-alumnos-que-encajan)
5. [Compartir perfiles](#5-compartir-perfiles)
6. [Avisos de alumnos](#6-avisos-de-alumnos)
7. [Borradores de correo](#7-borradores-de-correo)
8. [Ajustes, conexión y actualización](#8-ajustes-conexión-y-actualización)

## 1. Programas, alumnos y búsqueda

- **Ver los programas y sus alumnos.** En Inicio los programas están arriba, agrupados en 4 secciones desplegables (**MBA** la primera y abierta, y después Másteres, LaLiga Executive Education y Formación para Jugadores). Salen **todos** los programas, aunque no tengan alumnos. Se elige uno y sale la lista de alumnos. La lista de programas y la categoría de cada uno se cambian en el Sheet (hoja Listas), sin tocar la app.
- **Ver la ficha de cada alumno.** Nacionalidad, situación de trabajo en España, experiencia, a qué área quiere ir y por qué, y un botón para ver su CV.
- **Buscar y filtrar alumnos.** En la pestaña Buscar se escribe un nombre, un área o un país, y se afina con filtros (área, nacionalidad, situación de trabajo, prácticas o empleo).
- **Apuntar notas de entrevista.** En la ficha de un alumno, el botón "Editar entrevista" guarda la nota y la fecha.

## 2. Ofertas

- **Ver las ofertas.** En la pestaña Ofertas se ve la lista (las más recientes primero) y se puede buscar y filtrar por estado, tipo y área. Cada oferta tiene su ficha.
- **Añadir y editar ofertas.** Con "Nueva oferta" y "Editar oferta". Cada oferta lleva su **perfil del puesto** (país, subárea, etiquetas, idiomas y nivel de formación), que el match compara con cada alumno. Las ofertas no se borran: cuando ya no valen, se cierran.

## 3. Rondas y solicitudes

> **Equivalencia de nombres.** En la app se dice **solicitud**; en el Sheet, esa misma cosa se sigue llamando **Aplicaciones** (la hoja) y **Estado de la aplicación** (la lista), y en el código y el script `aplicacion`. No hay que cambiar nada en el Sheet.

- Una **ronda** es cada vez que una oferta se reenvía a los alumnos. Una oferta puede tener varias: ronda 1, ronda 2…
- Una **solicitud** es un alumno que responde a una ronda. Si el mismo alumno responde a dos rondas, salen dos solicitudes.
- Cada solicitud tiene un **estado**: Recibida, En revisión, Enviada a la empresa, Entrevista, Contratado o Descartado. Si es Descartado, se indica el motivo (por ejemplo, "Permiso de trabajo").
- Cada cambio de estado se apunta en un **historial** con su fecha y una nota. El historial no se edita ni se borra.
- La app **avisa, sin impedir nada,** si la oferta está cerrada o si lo que pide (permiso de trabajo, nacionalidad) choca claramente con la situación del alumno.
- Si dos personas cambian lo mismo a la vez, la app lo detecta y enseña lo que hay antes de pisar nada.

- **Ver las rondas de una oferta.** En la ficha de la oferta salen sus rondas (cada vez que se reenvía a los alumnos) y, en cada una, los alumnos que han aplicado y cómo va cada uno.
- **Registrar una ronda y añadir solicitudes.** "Registrar nueva ronda" y, dentro de cada ronda, "Añadir solicitud": se busca al alumno, se elige y se guarda.
- **Cambiar el estado de una solicitud.** En su detalle, "Cambiar estado". Todo queda apuntado en un historial con fecha y nota, que no se borra.
- **Ver las solicitudes de un alumno.** En su ficha, en el apartado "Solicitudes".

## 4. Alumnos que encajan

En la ficha de la oferta, la tarjeta "Alumnos que encajan" reparte a **todos** los alumnos en tres grupos (encaja, encaja con reservas, encaja poco) y cada fila explica por qué, con su semáforo, su puntuación ("Encaje 82 %"; en "Encaja poco" se llama "Afinidad", en gris, porque solo dice cuánto se parece el perfil, no si puede ocupar la oferta) y los datos que faltan. En la ficha del alumno, "Ofertas que encajan" hace lo mismo al revés.

Para cada alumno se miran **ocho criterios** (área, subárea, habilidades, idiomas, formación, tipo, nacionalidad y permiso de trabajo), cada uno con su semáforo, su motivo y sus puntos. Lo que no consta no suma ni resta, y nadie desaparece de la lista. Siempre se ve el aviso **«Orientativo, verifica la situación real»**: es una ayuda para mirar, y si alguien puede trabajar o no lo decide siempre una persona. Los pesos, los estados y las reglas de cada criterio están en [REGLAS-MATCH.md](REGLAS-MATCH.md).

## 5. Compartir perfiles

- **Cómo se hace.** En la ficha de la oferta se marcan hasta 10 alumnos (o, en la ficha de un alumno, "Compartir perfil"), se ve una vista previa con el texto exacto y se envía con el menú de compartir del móvil o se copia.

Siempre pasa por una **vista previa** con el texto exacto que se enviará. Por defecto solo salen nombre, programa, área y qué busca. Nacionalidad, situación de trabajo, resumen de experiencia y enlace al CV (solo si es `https`) son **datos sensibles** y vienen desmarcados. Las notas de entrevista, el historial y los motivos de descarte **nunca** se incluyen. El máximo es de 10 alumnos por envío. Hay una casilla aparte, desmarcada, **«Incluir resumen del perfil»**: una línea armada con plantillas a partir de las subáreas, las habilidades, los idiomas y la formación (sin repetir el programa, el área ni lo que busca, que ya salen en sus líneas; los idiomas van **sin nivel ni «nativo»**, para no insinuar nacionalidad; nunca el «por qué» ni datos sensibles). La app no guarda nada de lo compartido.

## 6. Avisos de alumnos

- **Qué ve quien la usa.** En Inicio, debajo de los programas, la tarjeta **Avisos** (con borde naranja) cuenta los alumnos «sin solicitudes» y los que «han solicitado casi todas las ofertas». Al tocar uno se ve quién es y **por qué se avisa**, con los números. También sale una marca en la lista del máster y una tarjeta en la ficha. Solo informan: no bloquean nada. Se pueden **silenciar 30 días**. Aparte hay avisos de **datos** (en rojo, con un triángulo y la palabra «Datos»), por ejemplo un programa que no está en la lista de programas: **no se pueden silenciar**, salen aunque no haya rondas y se quitan arreglando el Sheet. Los de **seguimiento** (naranja, con un reloj) y los de datos se distinguen por la forma, la palabra y el color, no solo por el color.

Se calculan en el móvil con las rondas y las solicitudes (sin tocar el Sheet). Con los valores por defecto:

| Aviso | Se avisa cuando… |
|---|---|
| **Sin solicitudes** | En los últimos 30 días se enviaron al menos 3 ofertas y el alumno no ha hecho **ninguna** solicitud. No se avisa a quien ya está Contratado, y cuenta desde la primera ronda registrada si es más reciente. |
| **Ha solicitado casi todas las ofertas** | En los últimos 30 días ha hecho al menos 5 solicitudes y a un 80 % o más de las ofertas enviadas. Se añade cuántas de esas ofertas el match marca como «encaja poco», pero eso no decide nada. |

Los cuatro números (días, ofertas, solicitudes y porcentaje) se cambian en Ajustes. **Un aviso nunca bloquea nada** y siempre dice por qué se avisa. «Silenciar 30 días» lo oculta de los contadores hasta esa fecha; se guarda solo en ese móvil.

## 7. Borradores de correo

- **Cómo se hace.** En el detalle de una solicitud, **Borrador de correo** (si está en proceso o descartada): se elige español o inglés, se ve el texto exacto y se copia o se abre en la app de correo. No incluye notas, motivos de descarte, situación de trabajo ni estatus migratorio.

Hay dos: **en proceso** (Recibida, En revisión, Enviada a la empresa y Entrevista) y **descartado**, que dice con tacto que la solicitud no continúa e **invita a escribir** si quiere ir hacia el área de la oferta. Se escriben en español, o en inglés para el MBA en inglés, y se puede cambiar el idioma en la vista previa. En inglés, el área de la oferta sale con su nombre en inglés si la hoja Áreas tiene la columna opcional **Área (inglés)**; si no la tiene (o esa celda está vacía), sale el nombre en español. El texto solo usa el nombre de pila, el puesto, la empresa y el estado: **nunca** notas de entrevista, motivos de descarte, situación de trabajo ni estatus migratorio. La app no envía nada: se copia o se abre en la app de correo, sin destinatario.

## 8. Ajustes, conexión y actualización

- **Ajustar los avisos y la firma.** En **Ajustes**: los días, las ofertas y las solicitudes que cuentan para los avisos, y tu nombre para firmar los correos. Se guardan solo en ese móvil.
- **Ver la conexión y la versión de la app.** En la pestaña **Ajustes** (la cuarta de la barra de abajo): si estás en la demo o conectado al Sheet, "Olvidar acceso", el número de versión y el botón **Buscar actualización**, que carga la última versión sin tener que cerrar la app. Las secciones se pliegan y se despliegan con una flecha (solo «Conexión» empieza abierta, y lo que dejas abierto se recuerda en ese móvil).
- **Actualizar los datos sin cerrar la app.** El botón de las **dos flechas circulares**, arriba a la derecha, vuelve a leer el Sheet. Gira mientras carga y, si falla (sin conexión, clave que ya no vale…), lo dice y deja a la vista los datos de antes. **No se ve** en la demo ni en las pantallas donde estás escribiendo (formularios, notas de entrevista, borrador de correo), para no perder nada. No guarda ninguna copia de los datos en el móvil. No se actualiza solo: lo decides tú.
