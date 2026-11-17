# Reglas del match (versión 29; las reglas no cambian desde la 25)

Este documento es la tabla exacta de lo que hace el match entre una oferta y un alumno. El código está en `js/util/match.js` y lo comprueban `tests/app/match.prueba.mjs`, `match-reglas.prueba.mjs` y `match-casos.prueba.mjs`.

## Principios

1. **Orienta y ordena; nunca oculta ni descarta a nadie.** Todos los alumnos (u ofertas) salen siempre, cada uno con su motivo.
2. **La decisión sobre si alguien puede trabajar es siempre humana.** La pantalla lo dice siempre: «Orientativo, verifica la situación real».
3. **Sin IA ni servicios externos.** Todo es una regla escrita aquí y editable en el Sheet. Las etiquetas coinciden por **texto exacto** (sin fijarse en mayúsculas ni tildes); no hay sinónimos ni aproximaciones.
4. **Un dato que falta o no se reconoce no es un «no cumple».** Se enseña como «Sin datos» (amarillo, «a revisar»), **no suma puntos** y no cuenta en el total.
5. **Compartir perfiles no cambia:** no saca situación migratoria, notas, historial ni descartes (el match no escribe nada ni envía nada).
6. **Cómo se ve (v27, solo presentación; las reglas no cambian).** El % de cada fila lleva el color de su grupo (verde «Encaja», ámbar «con reservas», rojo suave «No encaja») y siempre va escrito en texto. Debajo, **una línea con el criterio que decide el grupo**: en «No encaja», el «no» de área, tipo, nacionalidad o permiso; en «con reservas», lo primero que hay que revisar (lo de nacionalidad y permiso va antes); en «Encaja», el primer criterio que cumple. El detalle de los ocho criterios está en «Por qué», y las razones de nacionalidad y permiso largas se acortan con «ver más».

## Los ocho criterios

Cada criterio da un estado (semáforo) y un motivo escrito. Los cuatro primeros de la tabla de abajo (los de **grupo**) deciden en qué grupo cae el alumno; los otros cuatro (de **perfil**) matizan la puntuación.

| # | Criterio | Peso | Grupo | Qué compara |
|---|---|---|---|---|
| 1 | **Área** | 30 | básico | `Área` de la oferta con «Área a la que quiere ir» y «Área de experiencia» del alumno, usando la hoja **Afinidad**. |
| 2 | **Subárea** | 10 | perfil | `Subárea` de la oferta con «Subáreas de experiencia» del alumno, usando la hoja **Áreas**. |
| 3 | **Habilidades** | 20 | perfil | `Etiquetas` de la oferta con `Etiquetas` del alumno, usando la hoja **Etiquetas**. |
| 4 | **Idiomas** | 15 | perfil | `Idiomas` de la oferta con `Idiomas` del alumno (con nivel). |
| 5 | **Formación** | 5 | perfil | `Nivel de formación` de la oferta con «Formación previa» del alumno. |
| 6 | **Tipo** (prácticas o empleo) | 10 | básico | `Tipo` de la oferta con «Disponibilidad» del alumno. |
| 7 | **Nacionalidad** | 5 | básico | «Requisito de nacionalidad» de la oferta con las nacionalidades del alumno, usando la hoja **Países**. |
| 8 | **Permiso de trabajo** | 5 | básico | «Requisito de permiso de trabajo» de la oferta con la «Situación de trabajo en España» del alumno, usando la hoja **Reglas migratorias**. |

Los pesos suman **100** y son fijos (no se editan en el Sheet).

### Los estados de un criterio

| Se ve como | Semáforo | Suma | Cuándo |
|---|---|---|---|
| **Cumple** (✓) | verde | 100 % de su peso | Coincide o cumple. |
| **Revisar** (!) | amarillo | 50 % de su peso (o la fracción que corresponda) | Afín, parcial, o una duda que hay que mirar a mano. |
| **No cumple** (✗) | rojo | 0 (**sí cuenta** en el máximo) | No coincide. |
| **Sin datos** (?) | amarillo | **nada** (no entra en el total) | Falta el dato (vacío o desconocido) en la oferta o en el alumno. |
| **No aplica** (–) | verde | **nada** (no entra en el total) | La oferta no pide nada en ese criterio. |

## Reglas de cada criterio

### 1. Área (peso 30)

Se compara el área de la oferta (**O**) con «Área a la que quiere ir» (**D**) y «Área de experiencia» (**E**) del alumno. La primera línea que se cumple, gana:

| Condición | Estado |
|---|---|
| La oferta no indica área | Sin datos |
| D = O | Cumple |
| D vacío y E vacío | Sin datos |
| Afinidad(D, O) = **Directa** | Cumple |
| E = O | Revisar (50 %): «tiene experiencia en esa área» |
| Afinidad(D, O) = **Afín** | Revisar (50 %) |
| Afinidad(E, O) = Directa o Afín | Revisar (50 %) |
| La hoja Afinidad existe y la pareja (D, O) —o (E, O) si no hay D— **no está** en ella | **Sin datos** («la hoja Afinidad no dice cómo se relaciona…») |
| Cualquier otro caso (Lejana, o no hay hoja Afinidad) | No cumple |

La hoja **Afinidad** tiene una fila por pareja de áreas (`Área A`, `Área B`, `Nivel`: Directa, Afín o Lejana); el orden de la pareja da igual.

### 2. Subárea (peso 10)

| Condición | Estado |
|---|---|
| La oferta no indica subárea | No aplica |
| El alumno no tiene subáreas escritas | Sin datos |
| Una subárea del alumno = la de la oferta | Cumple |
| Otra subárea **de la misma área** (según la hoja **Áreas**) | Revisar (50 %) |
| Todas sus subáreas son de **otra** área | No cumple |
| La hoja Áreas no dice a qué área pertenece alguna | Sin datos |

### 3. Habilidades (peso 20)

Las etiquetas están en una **lista cerrada**: la hoja **Etiquetas**. Se separan con «;» (o con comas, que es como las separa Google al elegir varias de una lista).

| Condición | Estado |
|---|---|
| La oferta no pide etiquetas | No aplica |
| Todas las etiquetas de la oferta están fuera de la lista | Sin datos |
| El alumno no tiene ninguna etiqueta de la lista | Sin datos |
| Tiene **todas** las que pide la oferta | Cumple |
| Tiene **algunas** | Revisar; suma la fracción (p. ej. 2 de 3 = 67 % del peso) |
| No tiene **ninguna** | No cumple |

Una etiqueta que no está en la hoja Etiquetas se **ignora** (y el motivo lo dice); no se acepta por parecida. Sin hoja Etiquetas no hay lista que validar y coincide el texto exacto.

### 4. Idiomas (peso 15)

Formato: `Inglés C1; Español nativo`. El nivel es la última palabra: A1, A2, B1, B2, C1, C2 o Nativo (de menor a mayor). Se compara cada idioma que pide la oferta:

| Idioma que pide la oferta | Resultado de ese idioma |
|---|---|
| El alumno no lo tiene | 0 |
| Lo tiene y la oferta no pide nivel | 1 |
| Lo tiene, nivel igual o mayor | 1 |
| Lo tiene con nivel más bajo | 0,5 |
| Lo tiene, pero no consta su nivel y la oferta lo pide | no cuenta (sin dato) |

El criterio suma la **media** de los idiomas con dato. Estado: todos 1 → Cumple; todos 0 → No cumple; en otro caso → Revisar. Si el alumno no tiene idiomas escritos, o ninguno tiene nivel conocido, → Sin datos.

### 5. Formación (peso 5)

La oferta pide `Nivel de formación`: **Sin requisito, Grado, Máster o Doctorado**. De la «Formación previa» del alumno (texto libre) se busca la palabra del nivel más alto: «doctor…» → Doctorado; «máster», «MBA», «posgrado» → Máster; «grado», «licenciatura», «ingeniería», «diplomatura» → Grado.

| Condición | Estado |
|---|---|
| La oferta no lo pide o dice «Sin requisito» | No aplica |
| Nivel de la oferta que no se reconoce | Sin datos |
| No se reconoce ningún nivel en la formación del alumno | Sin datos |
| El alumno llega al nivel pedido o más | Cumple |
| Un nivel por debajo | Revisar (50 %) |
| Dos niveles por debajo | No cumple |

### 6. Tipo: prácticas o empleo (peso 10)

| Condición | Estado |
|---|---|
| La oferta no indica el tipo, o el alumno no indica qué busca | Sin datos |
| El alumno busca «Ambas», o lo mismo que la oferta | Cumple |
| Busca otra cosa | No cumple |

### 7. Nacionalidad (peso 5)

Usa la hoja **Países**: cada país con su **Grupo** (`UE`, `EEE`, `Suiza` o `Resto`) y una fila especial «Unión Europea (UE/EEE)» (grupo «Grupo de países»), que es el valor que puede pedir una oferta. «Chequia» y «República Checa» son las dos UE.

| Condición | Estado |
|---|---|
| La oferta no pide nacionalidad | No aplica |
| Pide «Unión Europea (UE/EEE)» y el alumno tiene un país UE o EEE | Cumple |
| …o su situación es «Ciudadano UE o español» | Cumple |
| …y tiene Suiza | Revisar (50 %): Suiza no es UE ni EEE, pero tiene acuerdo de libre circulación |
| …y no consta ninguna nacionalidad | Sin datos |
| …y alguna nacionalidad **no está en la hoja Países** | **Sin datos** (país desconocido, nunca «no cumple») |
| …y todas son países conocidos de fuera | No cumple |
| Pide un país concreto y el alumno lo tiene (principal o secundaria) | Cumple |
| …y no consta la nacionalidad, o es un país desconocido | Sin datos |
| …y tiene otro país conocido | No cumple |

Sin hoja Países se usa una lista de respaldo del código con los países UE/EEE (una prueba exige que sea idéntica a la hoja) y no se puede saber qué país es «desconocido».

### 8. Permiso de trabajo (peso 5)

Solo se mira si la oferta pide «Permiso de trabajo en vigor»; si no, **No aplica**. Entonces manda la hoja **Reglas migratorias**:

| Columna | Qué es |
|---|---|
| `Situación de trabajo` | Una de las situaciones de la lista «Situación de trabajo en España». |
| `Tipo de oferta` | Prácticas o Empleo. **Vacío = cualquiera.** |
| `País o grupo de la oferta` | Un país (España), un grupo (UE, EEE, Suiza, Resto) o **vacío = cualquiera / no consta**. |
| `Resultado` | **Cumple**, **Revisar** o **No cumple**. |
| `Motivo` | La frase que se enseña. `{alumno}` se cambia por el nombre. |
| `Fecha de validación` | Cuándo se comprobó la regla (AAAA-MM-DD o DD/MM/AAAA). |

**Qué fila vale:** la de la misma situación que sea **más concreta**: país > grupo > cualquiera, y a igual concreción, la que nombra el tipo de oferta. Si el país de la oferta no consta, solo valen las filas sin país. Si el país **consta pero no está en la hoja Países**, solo vale una fila que lo nombre tal cual; si no hay, queda **Sin datos**.

| Condición | Estado |
|---|---|
| La oferta no pide permiso | No aplica |
| Al alumno no le consta la situación | Sin datos |
| Ninguna fila vale | Sin datos (el motivo dice que falta la regla) |
| La fila vale | Su resultado |
| …pero es «No cumple» y el alumno tiene nacionalidad UE/EEE | Revisar (dato contradictorio) |
| …y la regla se validó hace **más de 12 meses** | Se añade «vuelve a validarla»; un «Cumple» baja a **Revisar** (50 %) |

Una fila con un `Resultado`, un `Grupo` o un `Nivel` que no existe se **ignora** y la pantalla lo avisa; nunca acaba en «No cumple». Sin hoja (o sin filas válidas) se usan estas **reglas de respaldo**:

| Situación | Resultado |
|---|---|
| Ciudadano UE o español | Cumple |
| Residente con permiso de trabajo | Cumple |
| Permiso de estudiante | Revisar (puede valer para unas prácticas) |
| Necesita permiso de trabajo | No cumple |

#### Las reglas de los datos mock (20 filas, validadas el 2026-11-01)

| Situación | Tipo | País o grupo | Resultado |
|---|---|---|---|
| Ciudadano UE o español | — | UE | Cumple |
| Ciudadano UE o español | — | EEE | Cumple |
| Ciudadano UE o español | — | Suiza | Revisar |
| Ciudadano UE o español | — | Resto | Revisar |
| Ciudadano UE o español | — | (no consta) | Cumple |
| Residente con permiso de trabajo | — | España | Cumple |
| Residente con permiso de trabajo | — | UE / EEE / Suiza / Resto | Revisar |
| Residente con permiso de trabajo | — | (no consta) | Cumple |
| Permiso de estudiante | Prácticas | cualquiera | Revisar (puede valer con convenio) |
| Permiso de estudiante | Empleo | cualquiera | Revisar (suele necesitar otra autorización) |
| Permiso de estudiante | — | cualquiera | Revisar |
| Necesita permiso de trabajo | — | España | No cumple |
| Necesita permiso de trabajo | — | (no consta) | No cumple |
| Necesita permiso de trabajo | — | UE / EEE / Suiza / Resto | Revisar (su situación es la de España) |

**«No cumple» solo sale con «Necesita permiso de trabajo» y una oferta de España (o sin país).** En las demás combinaciones, nunca. Una prueba lo recorre entero.

## Puntuación

```
puntos = suma de (peso × lo que suma) de los criterios CON datos que la oferta pide
máximo = suma de los pesos de esos mismos criterios
encaje = puntos / máximo, en %
```

- Un criterio **sin datos** o que **no aplica** no entra ni en los puntos ni en el máximo.
- Si hay criterios sin datos, la fila dice **«datos incompletos»** y, dentro de «Por qué», cuántos son.
- Si ningún criterio tiene datos, no hay puntuación («Sin puntuación: faltan datos»), no un 0 %.
- Cada criterio enseña sus puntos: «(15 de 30 puntos)», «(no suma)» o «(no cuenta)».

### «Encaje» y «Afinidad» (v28: solo se cambia el rótulo, no el cálculo)

El porcentaje se calcula **igual en los tres grupos**, con la fórmula de arriba. Lo que cambia es cómo se llama:

| Grupo | Rótulo | Color |
|---|---|---|
| Encaje y Encaje con reservas | **Encaje 82 %** | el del grupo (verde, ámbar) |
| No encaja | **Afinidad 64 %** | gris |

**Por qué en «No encaja» se llama «Afinidad».** El % suma lo que cumple cada criterio **que tiene datos**: las afinidades de perfil (área 30, subárea 10, habilidades 20, idiomas 15, formación 5 y tipo 10) **y** los dos requisitos (nacionalidad 5 y permiso 5). Un alumno cuyo grupo es «No encaja» ha fallado un criterio básico (área, prácticas o empleo, nacionalidad o permiso), pero puede tener un % alto porque cumple casi todo lo demás. Ese número dice **cuánto se parece su perfil a lo que pide la oferta, no si puede ocupar el puesto**, que ya decidió el grupo. Por eso no se llama «Encaje» ni va en verde, ámbar o rojo, y se ve en gris. El orden dentro del grupo no cambia: sigue siendo por ese %. (No hay que confundirlo con la hoja **Afinidad** del Sheet, que es la tabla de áreas afines: solo comparten el nombre.)

**Los criterios que fallan, en la fila.** En «No encaja» la fila nombra **todos** los criterios básicos en rojo, abreviados: «✗ No cumple: tipo, nacionalidad, permiso». En «Encaje con reservas» nombra lo que no cumple y lo que hay que revisar (también lo que no tiene datos): «✗ No cumple: subárea · ! Revisar: idiomas, permiso». Los nombres son: área, subárea, habilidades, idiomas, formación, tipo, nacionalidad y permiso, en el orden de «Por qué». Si solo falla uno, la fila sigue enseñando ese criterio con el comienzo de su razón. El detalle de cada uno está siempre en «Por qué».

## Grupos y orden

El **grupo** lo deciden solo los cuatro criterios básicos (área, tipo, nacionalidad y permiso):

| Grupo | Cuándo |
|---|---|
| **Encaja** | Los ocho criterios están en verde (o «no aplica»). |
| **Encaja con reservas** | Ningún básico en rojo, pero hay algo en amarillo, sin datos o un rojo de perfil (subárea, habilidades, idiomas o formación). |
| **No encaja** | Algún criterio básico en rojo. Los alumnos **se enseñan igualmente**. |

Dentro de cada grupo: **mayor encaje primero**; a igual encaje, el que tiene **más criterios con datos** (más pruebas); después, por nombre (o, desde el alumno, la oferta más reciente).

En la fila, el resumen enseña primero lo que decide el grupo, después lo legal por verificar (nacionalidad y permiso) y después lo demás.

## Datos vacíos

| Falta | Qué pasa |
|---|---|
| Las columnas nuevas de Alumnos u Ofertas | Valen vacías: los criterios de perfil salen «No aplica» (si la oferta no los pide) o «Sin datos» (si la oferta sí los pide y el alumno no los tiene). |
| Alguna hoja nueva (o el script no se actualizó) | Se usan las reglas de respaldo del código. |
| Una fila de una hoja con un valor que no existe | Se ignora y se avisa en la tarjeta. |

## Casos de prueba (datos mock)

`tests/app/match-casos.prueba.mjs` usa exactamente los **30 alumnos y 10 ofertas mock** que se importan al Sheet. Semáforo en el orden: Área · Subárea · Habilidades · Idiomas · Formación · Prácticas/empleo · Nacionalidad · Permiso (**V** verde, **A** amarillo, **R** rojo, **?** sin datos, **–** no lo pide).

| Oferta | Alumno | Grupo | Semáforo | Encaje | Por qué |
|---|---|---|---|---|---|
| O004 Becario/a de eventos | A025 Clara | Encaja | VVVVVV-- | 100 | Todo coincide; la oferta no pide nacionalidad ni permiso. |
| O010 Derecho deportivo | A007 Sofía | Encaja | VVVVVV-V | 100 | Todo coincide; residente con permiso en España. |
| O010 Derecho deportivo | A012 Rafael | Con reservas | VVAVVV-V | 89 | Solo tiene 1 de las 2 habilidades. |
| O001 Antipiratería | A027 Julia | Con reservas | VRAVVV-V | 79 | Sus subáreas son de otra área (no baja de grupo); 1 de 2 habilidades. |
| O001 Antipiratería | A026 Hugo | Con reservas | V?RVVV-V | 76 | Subárea sin rellenar (no suma ni resta); ninguna habilidad coincide. |
| O002 Becario/a de patrocinio | A008 Javier | Con reservas | VR?VVV-- | 86 | Marketing es **directa** con Comercial; sin habilidades escritas. |
| O003 Product manager junior | A001 Lucía | No encaja | VVAVVR-V | 82 | Busca prácticas y la oferta es de empleo (básico en rojo). |
| O005 Comunicación (pide UE/EEE) | A023 Ana | Con reservas | AVVAVVVV | 81 | Experiencia en Marketing pero quiere otra área; español B2 frente a C1. |
| O005 Comunicación (pide UE/EEE) | A011 Paula | No encaja | VVVVVRRR | 80 | Perfil perfecto, pero es de Chile y necesita permiso. |
| O006 Redacción (cerrada) | A011 Paula | Encaja | VVVVVV-- | 100 | Una oferta cerrada se enseña igualmente. |
| O007 Datos (pide EE. UU.) | A014 Tomás | No encaja | VVV?AVR- | 91 | Excelente perfil; sin idiomas escritos; la oferta pide nacionalidad estadounidense y es de Canadá. |
| O009 People & Culture | A015 Marta | Con reservas | VVAAVV-- | 81 | 1 de 2 habilidades; inglés B1 frente a B2. |
| O009 People & Culture | A005 Camila | No encaja | VVAVVR-- | 78 | Busca empleo y la oferta es de prácticas. |

Además, la prueba comprueba, para las 10 ofertas, cuántos alumnos salen en cada grupo, quién sale primero y que los alumnos con datos sin rellenar a propósito (A008 etiquetas, A014 idiomas, A020 formación, A026 subáreas) salen siempre «Sin datos», nunca en rojo.

## Qué se queda fuera de esta versión

- Pesos editables en el Sheet (son fijos).
- Sinónimos de etiquetas, aproximaciones o IA.
- «Historia» del alumno por plantillas y compartir con ella (versión 26; en la 27 es más corta y los idiomas salen sin nivel).
- Editar el perfil de puesto desde la app (versión 26; hoy se rellena en el Sheet).
- Desplegable de países en «Requisito de nacionalidad» desde la app (versión 26).
