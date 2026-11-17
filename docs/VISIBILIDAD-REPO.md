# Visibilidad del repositorio: seguir público o pasar a privado

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

**Estado de este documento: preparado, NO ejecutado.** Describe dos opciones y qué cambia con cada una. Nadie ha cambiado la visibilidad del repositorio ni ninguna configuración de GitHub. La decisión es de quien mantiene el proyecto.

**Para quién es:** quien mantiene la app y tiene que decidir. Las condiciones de GitHub se comprobaron en su documentación oficial el 2026-11-17 y pueden cambiar: antes de ejecutar nada, vuelve a mirar los enlaces del final.

## 1. Dónde estamos hoy

- El repositorio es **público** y la app se sirve con **GitHub Pages**, que es público.
- Todo lo que contiene es **ficticio**: personas, empresas, ofertas y enlaces (`example.com`). No hay claves ni direcciones de un script real en el código (una prueba lo vigila: `tests/app/sin-secretos.prueba.mjs`).
- La dirección del script de Google y la clave **solo se guardan en el móvil de quien conecta la app** (en `localStorage`), nunca en el repositorio.
- Los datos reales **no se pueden usar** con este montaje ni siendo el repositorio privado: ver «Antes de usar alumnos reales» en `DECISIONES.md`. Esta decisión de visibilidad trata solo del montaje de demostración.

## 2. Resumen de las dos opciones

| | **A. Seguir público, con datos ficticios** | **B. Pasar a privado** |
|---|---|---|
| Código y documentos | Los ve cualquiera | Solo quien tenga acceso al repositorio |
| GitHub Pages (la web de la app) | Sigue igual, gratis | Depende del plan (ver 4) |
| Quién puede abrir la app | Cualquiera con la dirección (sin la clave no ve datos) | Igual de abierta si el plan lo permite: **el sitio sigue siendo público aunque el repositorio sea privado** |
| La app instalada en el iPhone | No cambia nada | Sigue igual mientras el sitio se sirva; si se despublica, deja de actualizarse (ver 5) |
| Coste | Ninguno | Plan de pago (Pro, Team o Enterprise Cloud) si se quiere mantener Pages |
| Riesgo principal | Que alguien suba por error un dato real o una clave y quede a la vista | Falsa sensación de privacidad: el sitio y su contenido siguen siendo públicos |
| Esfuerzo | Mantener la revisión (sección 3) | Cambiar el ajuste, elegir plan y comprobar el iPhone |

## 3. Opción A: seguir público con datos ficticios

**Qué cambia:** nada. Es la situación actual.

**Qué hay que seguir cuidando (lista de revisión):**

- [ ] Que el repositorio contenga **solo datos ficticios**: la prueba `importar-demo-ampliada.prueba.mjs` comprueba que los CSV de ejemplo no llevan correos, teléfonos ni enlaces que no sean `example.com`.
- [ ] Que **no haya claves ni direcciones de script reales** en ningún archivo: `sin-secretos.prueba.mjs` recorre todos los archivos del repositorio. Se ejecuta con `npm test`, antes de cada subida.
- [ ] Que los documentos no tengan nombres reales de personas ni enlaces internos (revisión de la v29; vuelve a hacerla cuando se añada algo).
- [ ] Que el **historial de Git** no contenga nada sensible. Hoy contiene tres enlaces antiguos de un Sheet que estuvo publicado; ya no funcionan (Google responde 401). El historial no se reescribe (decisión registrada en `DECISIONES.md`). Si apareciera una clave real en él, habría que **cambiar la clave** (Propiedades del script), no solo borrar el archivo.
- [ ] Que el aviso «Proyecto personal de demostración. No afiliado a LaLiga…» siga en el README, en los documentos y en la propia app.
- [ ] Recordar que los nombres de los 14 programas son los de la escuela: se usan solo para que los datos de ejemplo se parezcan a los reales, con el aviso de «no afiliado».

**Cómo se ejecuta:** no hay que hacer nada.

## 4. Opción B: pasar a privado

**Cómo se haría (no ejecutado):** en GitHub, `Settings` → `General` → al final, `Danger Zone` → `Change repository visibility` → `Make private`. Después, `Settings` → `Pages` para ver qué ha pasado con el sitio.

**Qué dice GitHub sobre Pages en un repositorio privado** (documentación oficial, comprobada el 2026-11-17):

1. **Pages desde un repositorio privado exige un plan de pago:** GitHub Pro (cuenta personal), GitHub Team o GitHub Enterprise Cloud (organizaciones). Con el plan gratuito (Free), Pages solo está disponible para repositorios públicos.
2. **Con Pro o Team, el sitio sigue siendo público.** Aunque el repositorio sea privado, el sitio de GitHub Pages es accesible por cualquiera que conozca la dirección. Pasar a privado **no oculta la app**, solo el código.
3. **Solo Enterprise Cloud permite un sitio privado:** hace falta una **organización** con Enterprise Cloud, y el acceso queda limitado a las personas con permiso de lectura en el repositorio. Un sitio privado no se puede volver público: habría que borrarlo y crearlo de nuevo.
4. **Si caduca o se cancela el plan de pago, el sitio deja de servirse.** Al bajar a Free, GitHub despublica los sitios de Pages de repositorios privados. Si más adelante se renueva el plan, el sitio se vuelve a desplegar solo; si no, hace falta un despliegue nuevo.
5. **En una cuenta Free, hacer privado el repositorio despublica el sitio en ese momento.** La dirección empezaría a dar «404» y la app dejaría de poder abrirse desde el navegador.

**Subopciones, según el plan:**

| Subopción | Repositorio | Sitio (la app) | Para quién tiene sentido |
|---|---|---|---|
| **B1. Free + privado** | Privado | **Despublicado** (404) | Si ya no hace falta la web, o si se aloja en otro sitio |
| **B2. Pro o Team + privado** | Privado | **Público** (sigue en la misma dirección) | Si solo importa que el código no sea público |
| **B3. Enterprise Cloud + privado** | Privado | **Privado** (solo con permiso de lectura) | Si el equipo ya tiene Enterprise Cloud; hay que **probar** que la app instalada en el iPhone funciona detrás del inicio de sesión de GitHub (no se ha probado) |
| **B4. Privado + otro alojamiento** | Privado | En otra dirección | Si se prefiere otro servicio para servir la web; cambia el origen (ver 5) |

## 5. La app instalada en el iPhone

La app se instala desde Safari («Añadir a pantalla de inicio») y funciona gracias a un *service worker* que guarda sus archivos en el móvil. La dirección del script de Google y la clave, junto con la firma, los umbrales de los avisos y los avisos silenciados, se guardan en el propio móvil, **ligados al dominio de la web** (`<usuario>.github.io`).

- **Opción A, o B2 (misma dirección y sitio público):** no cambia nada. La app instalada sigue abriendo y actualizándose.
- **B1 (sitio despublicado):** la app instalada **puede seguir abriéndose** con lo que tiene guardado, pero **no puede actualizarse**: «Buscar actualización» fallará y el aviso de «versión nueva» no saldrá. Cuánto tiempo conserva iOS esos archivos no está garantizado. La conexión con el Sheet seguiría funcionando mientras la app abra, porque el script de Google es independiente de GitHub.
- **B3 (sitio privado):** hay que comprobar con un iPhone real si la app instalada puede cargar y actualizarse detrás del inicio de sesión de GitHub. Hasta probarlo, no se puede dar por bueno.
- **B4 (otro dominio):** el navegador lo trata como **otra app**. Hay que **volver a instalarla** (y, para limpiar, borrar el icono antiguo) y **volver a escribir la dirección y la clave**: lo guardado en el móvil no se traslada. Conviene avisar con antelación a quien la use. Además, hay que revisar que `manifest.webmanifest` y el service worker no dependan de la ruta `/<repositorio>/` de GitHub Pages.

## 6. Qué revisar antes de decidir (sirve para las dos opciones)

- [ ] **Quién tiene copias:** hacer el repositorio privado **no borra** los *forks*, clones ni copias que ya existan, ni lo que haya guardado un buscador o un archivo web. Mirar en GitHub si hay *forks* y estrellas.
- [ ] **El historial de Git** (ver sección 3). Sigue siendo accesible para quien ya lo tenga.
- [ ] **El script de Google:** su dirección es pública por diseño (cualquiera que la conozca puede llamarlo; solo la clave protege). No depende de la visibilidad del repositorio. Si se sospecha que la clave se conoce, cambiarla en las propiedades del script.
- [ ] **La política de seguridad de `index.html`** (qué dominios puede contactar la app) y que en el código solo estén `script.google.com` y `script.googleusercontent.com`.
- [ ] **Los documentos** (`README.md` y `docs/`): que no prometan una dirección pública que dejaría de existir, y que describan bien dónde está alojada la app.
- [ ] **Datos reales:** ni A ni B los hacen aptos. Para usar alumnos reales, el camino está en `DECISIONES.md` («Al migrar a Microsoft» y «Antes de usar alumnos reales»).

## 7. Enlaces de la documentación de GitHub usados

Comprobados el 2026-11-17; vuelve a mirarlos antes de actuar.

- [Planes de GitHub (qué incluye cada uno, y Pages privado con Enterprise Cloud)](https://docs.github.com/get-started/learning-about-github/githubs-products)
- [Gestionar la publicación de sitios de GitHub Pages en una organización](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-publication-of-github-pages-sites-for-your-organization)
- [Cambiar la visibilidad de un repositorio](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [Bajar el plan de la cuenta (qué pasa con los sitios de Pages privados)](https://docs.github.com/en/billing/how-tos/manage-plan-and-licenses/downgrade-plan)
- [Despublicar un sitio de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/unpublishing-a-github-pages-site)
- [Errores 404 en sitios de GitHub Pages (volver a desplegar al renovar el plan)](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)
