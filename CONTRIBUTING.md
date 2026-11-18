# Cómo trabajar en este repositorio

**Proyecto de demostración con datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

Este documento es para quien mantiene la app. Por ahora **no se aceptan contribuciones externas**: el código se publica solo para consulta y evaluación (mira [AVISO-DERECHOS.md](AVISO-DERECHOS.md)).

## Requisitos

- Node 24 o superior. La app no usa npm ni se compila: las herramientas de este repositorio son solo para desarrollo.
- Un navegador para las pruebas: Microsoft Edge (ya viene en Windows) o el Chromium de Playwright.

## Ejecutar las pruebas

```
npm install
npx playwright install chromium     # solo si no usas Edge
npm test                            # todas las pruebas, con un resumen al final
npm run lint                        # ESLint
npm run format:check                # Prettier, sin cambiar nada (npm run format aplica el formato)
```

- `npm test` ejecuta **todas** las pruebas y no se detiene en la primera que falla.
- Por defecto las pruebas usan Edge. Con Chromium: `NAVEGADOR=chromium npm test` (en PowerShell: `$env:NAVEGADOR='chromium'; npm test`).
- Una sola prueba: `node tests/app/acceso.prueba.mjs`. El script de Google se prueba con `node tests/apps-script/pruebas.mjs`.
- Las pruebas usan un Google simulado: no hacen falta claves ni direcciones reales, y no se deben escribir nunca en el repositorio.

## Mensajes de commit

Una línea de resumen y, si hace falta, un cuerpo con el detalle:

```
tipo(ámbito): resumen en imperativo, en español, sin punto final
```

- Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `ci`.
- Ámbito opcional: `seguridad`, `match`, `ofertas`, `rondas`, `docs`…
- Un commit por cambio con sentido, con la suite completa en verde.
- No se reescribe el historial publicado.

## Código

- **Idioma:** los identificadores van en español, en `camelCase` y sin tildes ni eñes (`enlaceCV`, `solicitantesDeOferta`). Los textos que ve la persona van en español.
- **Vocabulario:** una prueba (`vocabulario`) prohíbe palabras internas en los textos visibles. Mira sus listas antes de escribir un texto nuevo.
- **Sin `innerHTML`:** el DOM se construye con `el()` y `reemplazar()` (`js/util/dom.js`). El texto de los datos siempre se escribe como texto.
- **Formato:** Prettier se aplica a `js/` y `sw.js`. No se formatean `Code.gs`, las hojas CSV ni el CSS.
- **Sin dependencias en la app:** nada de librerías externas ni de recursos de otros dominios (la política de seguridad de `index.html` lo impediría).

## Subir de versión

Cada cambio en los archivos de la app necesita una versión nueva para que el móvil cargue la actual:

1. Cambia el número en `js/version.js` (`VERSION`).
2. Cambia el mismo número al final de `CACHE` en `sw.js`.
3. Si añades un archivo a la app, añádelo también a `FILES` en `sw.js`.

Una prueba comprueba que los dos números coinciden.

## Roturas a propósito

Cuando se añade una protección (un validador, una política de seguridad), se comprueba que la prueba **falla** si se rompe a propósito la protección, y se vuelve a dejar bien. La lista de las que ya existen está en [docs/TECNICO.md](docs/TECNICO.md).
