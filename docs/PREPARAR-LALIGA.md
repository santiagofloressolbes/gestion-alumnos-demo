# Qué se puede preparar hoy y qué depende de LaLiga y TI

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.**

Dos trabajos de la Fase 3 que **no llevan código todavía**. Para cada uno: lo que se puede dejar listo **hoy, sin datos reales**, y lo que **no se decide sin LaLiga y su equipo de TI**. Las preguntas para TI están en [PREGUNTAS-TI.md](PREGUNTAS-TI.md).

## 3B. Alimentar Aplicaciones desde Microsoft Forms

**Se puede preparar hoy:**
- Diseñar el formulario en papel o en un Forms de prueba (ID de alumno, ID de oferta, ronda, fecha).
- Definir la correspondencia columna a columna con la hoja Aplicaciones.
- Escribir las reglas de validación y de duplicados.
- Preparar un CSV de ejemplo para probar el importador.

**Depende de LaLiga y TI:**
- Si permiten Forms para esto, qué cuenta lo posee y dónde se guardan las respuestas.
- Si se puede conectar con Power Automate o con el Sheet.
- Cómo se identifica al alumno (correo corporativo frente a ID).
- La política de datos personales.

## 3C. Seguridad y migración a Microsoft con Entra ID

**Se puede preparar hoy:**
- Un inventario de qué datos son sensibles y de dónde vienen.
- Un diagrama de los flujos actuales (app, script y Sheet) y de los destinos posibles.
- Una lista de requisitos de seguridad (roles, registro de accesos, borrado).
- Un borrador de petición a TI.
- Mantener la capa de datos intercambiable, como ya está en `js/data/`.

**Depende de LaLiga y TI:**
- El registro de la aplicación en Entra ID, los permisos y el consentimiento del administrador.
- Dónde se aloja la web (SharePoint u otro) y el dominio.
- Si Microsoft Graph o SharePoint reemplazan al script.
- El cumplimiento del RGPD, la retención de datos y la evaluación de impacto (DPIA).
- Quién administra los roles.

## Cómo se usan estos documentos

1. Con datos ficticios, se avanza solo en lo de «se puede preparar hoy».
2. Antes de tocar nada real, se envían las preguntas de [PREGUNTAS-TI.md](PREGUNTAS-TI.md) y se espera respuesta por escrito.
3. Hasta entonces, **no se escribe código de 3B ni de 3C** y no se usa ningún dato real.
