# Cómo poner en el Sheet los datos nuevos del match (versión 25)

Todo son datos ficticios, para probar y juzgar el match en el iPhone. En el cierre se regenerarán con los programas y las personas reales.

**No hace falta tocar la hoja Listas** (ni una fila). Todo va en hojas nuevas o en columnas añadidas al final de Alumnos y Ofertas.

Los archivos están en esta carpeta (`docs/importar-sheet/`). Los nombres son los de las hojas: Google le pone a la hoja nueva el nombre del archivo.

## A. Cinco hojas nuevas

Para cada uno de estos cinco archivos, repite los mismos pasos 1 a 4:

- `Países.csv`
- `Áreas.csv`
- `Afinidad.csv`
- `Reglas migratorias.csv`
- `Etiquetas.csv`

1. En el Sheet, abre **Archivo > Importar**.
2. En la pestaña **Subir**, arrastra el archivo (o elígelo con «Seleccionar un archivo de tu dispositivo»).
3. En «Ubicación de importación» elige **Insertar hoja(s) nueva(s)**. Deja lo demás como viene y pulsa **Importar datos**.
4. Mira el nombre de la pestaña nueva: tiene que ser **exactamente** el del archivo, sin «.csv» y con su tilde (Países, Áreas, Afinidad, Reglas migratorias, Etiquetas). Si es otro, haz clic derecho en la pestaña, **Cambiar nombre**, y escríbelo igual.

## B. Las columnas nuevas de Alumnos

5. Importa `Alumnos - columnas nuevas.csv` igual que antes (pasos 1 a 3). Quedará una hoja temporal llamada «Alumnos - columnas nuevas».
6. Comprueba que los alumnos están en el mismo orden: en esa hoja temporal, en la celda G1, escribe `=SUMPRODUCT(--(A2:A31<>Alumnos!A2:A31))`. Tiene que salir **0**. Si sale otro número, no sigas: avísame.
7. En la hoja temporal, selecciona de **B1** a **E31** y cópialo (Ctrl+C o Cmd+C).
8. Ve a la hoja **Alumnos**, haz clic en la primera celda vacía a la derecha de «Disponibilidad» (la **R1**) y pega.
9. Borra la hoja temporal (clic derecho en su pestaña > **Eliminar**).

## C. Las columnas nuevas de Ofertas

10. Importa `Ofertas - columnas nuevas.csv` igual (pasos 1 a 3).
11. En la hoja temporal, en la celda H1, escribe `=SUMPRODUCT(--(A2:A11<>Ofertas!A2:A11))`. Tiene que salir **0**.
12. Selecciona de **B1** a **F11**, cópialo, ve a **Ofertas**, haz clic en la primera celda vacía a la derecha de «Enlace o descripción» (la **M1**) y pega. Borra la hoja temporal.

## D. Listas desplegables (para no escribir las etiquetas a mano)

La app solo reconoce las etiquetas que están en la hoja **Etiquetas**. Para elegirlas desde una lista en vez de teclearlas:

13. En **Alumnos**, selecciona la columna **Etiquetas** desde la fila 2 (clic en R2 y, sin soltar, hasta el final de la columna). Abre **Datos > Validación de datos > Agregar regla**.
14. En «Criterios» elige **Menú desplegable (de un intervalo)** y escribe `Etiquetas!A2:A`. Si ves la casilla **Permitir seleccionar varios elementos**, márcala. Pulsa **Listo**.
15. Haz lo mismo en **Ofertas** con la columna **Etiquetas**.
16. En **Ofertas**, con el mismo método, pon también: **País de la oferta** (intervalo `Países!A2:A`) y **Subárea** (intervalo `Áreas!B2:B`). En **Nivel de formación** elige «Menú desplegable» (con valores escritos) y escribe: Sin requisito, Grado, Máster, Doctorado.

Es normal que las celdas con varias etiquetas separadas por «;» salgan con un triangulito rojo: Google solo comprueba una etiqueta por celda. La app comprueba cada una contra la hoja Etiquetas, así que no pasa nada. Si eliges varias con la lista, Google las separa con comas y la app también lo entiende.

## E. Actualizar el script (para que la app vea las hojas nuevas)

17. En Apps Script, abre `Code.gs`, borra todo, pega el contenido nuevo de `docs/apps-script/Code.gs` y pulsa **Guardar**.
18. **Implementar > Gestionar implementaciones**, el lápiz, «Versión» > **Nueva versión** > **Implementar**. La dirección no cambia.

Sin este paso la app sigue funcionando, pero con las reglas de siempre (no ve las hojas nuevas).

## F. Comprobarlo en el iPhone

19. En la app, **Ajustes > Buscar actualización** (debe poner «Versión 25»). Abre una oferta: verás a los alumnos con su porcentaje de encaje, el semáforo de cada criterio dentro de «Por qué» y el aviso «Orientativo, verifica la situación real».
