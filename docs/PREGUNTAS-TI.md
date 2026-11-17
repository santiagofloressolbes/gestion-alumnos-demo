# Preguntas para el equipo de TI de LaLiga

> **Proyecto personal de demostración. Datos ficticios. No afiliado a LaLiga ni a LaLiga Business School.** Este documento es una lista de preguntas previa a cualquier uso con datos reales. No contiene datos reales, claves ni direcciones.

## Resumen

**Contexto.** Una aplicación web para móvil con la que quien gestiona la bolsa de empleo de un máster consulta fichas de alumnos, registra ofertas, rondas y solicitudes, y comparte perfiles. Hoy es una **demostración con datos ficticios**, conectada solo en pruebas a un Google Sheet privado mediante un script con clave compartida: **ese puente no vale con datos reales**. El destino previsto es Microsoft con inicio de sesión individual (cómo está hecha y qué se propone: [TECNICO.md](TECNICO.md); decisiones y riesgos: [../DECISIONES.md](../DECISIONES.md)).

**Datos que manejaría (todos sensibles con personas reales):** nombre, máster, nacionalidad, situación de trabajo en España, experiencia, enlace al CV, notas de entrevista, solicitudes, estado de cada proceso y motivo de descarte.

**Cómo usarlo:** responder en el hueco «Respuesta». Las 11 preguntas siguientes **bloquean el inicio**; sin ellas no se avanza. Van de más a menos urgentes. Después hay preguntas complementarias, agrupadas por bloque.

### Las 11 preguntas que bloquean el inicio

1. ★ ¿Quién es el responsable del tratamiento y quién el encargado? ¿Hay un delegado de protección de datos (DPO) al que consultar? Respuesta:
2. ★ ¿Es necesaria una evaluación de impacto (DPIA)? Hay datos de nacionalidad y situación migratoria, y decisiones que afectan a personas (descartes). Respuesta:
3. ★ ¿Se permite registrar una aplicación (web de una sola página, sin servidor propio) en el Entra ID de la organización? ¿Quién la registra y quién la administra después? Respuesta:
4. ★ ¿Es válido un flujo de inicio de sesión para aplicaciones de una sola página (código de autorización con PKCE, sin secreto en el cliente)? ¿Hay alguna política que lo impida? Respuesta:
5. ★ ¿Dónde guardar los datos: listas de SharePoint, un libro de Excel en SharePoint o una base de datos de la organización? ¿Cuál es la opción preferida por TI? Respuesta:
6. ★ GitHub Pages es público: ¿dónde se alojaría la web? (SharePoint, Azure Static Web Apps, servidor interno, otro). Respuesta:
7. ★ ¿Se permite que una aplicación web llame directamente a Microsoft Graph desde el navegador, o debe pasar por un servicio intermedio mantenido por TI? Respuesta:
8. ★ ¿Qué roles hacen falta? Por ejemplo: **lectura** (ver fichas), **gestión** (registrar ofertas, rondas y solicitudes), **entrevistas** (ver y escribir notas) y **administración**. ¿Quién decide quién tiene cada rol? Respuesta:
9. ★ ¿Qué debe registrarse: quién consultó una ficha, quién cambió un estado o una nota, quién compartió un perfil y con quién? Hoy la app **no registra nada** (clave compartida). Respuesta:
10. ★ ¿Se permite usar Microsoft Forms para recoger solicitudes de alumnos? ¿Qué cuenta posee el formulario y dónde se guardan las respuestas? Respuesta:
11. ★ ¿Qué revisión de seguridad independiente hace falta antes de abrirlo a más gente (pruebas de intrusión, revisión de código)? Respuesta:

---

## Preguntas complementarias

Ordenadas por bloque, de mayor a menor importancia y urgencia, y dentro de cada bloque también. La numeración continúa la de arriba.

### A. Protección de datos (RGPD)

12. ¿Se considera el match de alumnos con ofertas (la ordenación y la explicación de quién encaja) un **tratamiento automatizado de decisiones**, a efectos del art. 22 del RGPD, o un **sistema de IA de alto riesgo** en selección de personal, según el reglamento europeo de IA? Hoy el match usa reglas fijas (sin aprendizaje automático), solo ordena y explica, no descarta a nadie y la decisión la toma siempre una persona. **Esta pregunta no se da por resuelta:** se consultará con el DPO o con un abogado. Respuesta:
13. ¿Se permite el **match por nacionalidad y permiso de trabajo**? Hoy solo ordena y explica, sin descartar a nadie, pero podría discriminar. Respuesta:
14. ¿Cuál es la base legal para tratar estos datos y para compartir perfiles con empresas? ¿Hace falta consentimiento expreso de cada alumno y cómo se recoge y se registra? Respuesta:
15. ¿Está permitido guardar notas de entrevista en esta herramienta? ¿Qué categorías de dato no deben registrarse nunca? Respuesta:
16. ¿Durante cuánto tiempo se conservan las fichas, las notas de entrevista y los descartes, y cómo se borran (y se atiende un derecho de supresión)? Respuesta:
17. ¿Dónde se almacenan los datos (región de la UE) y quiénes son los subencargados? Respuesta:
18. ¿Qué procedimiento hay ante una brecha de seguridad y en qué plazo debe avisarse? Respuesta:

### B. Identidad: Entra ID

19. ¿Se exige autenticación multifactor y acceso condicional (dispositivos gestionados, ubicación)? ¿Funciona en iPhone con la app añadida a la pantalla de inicio? Respuesta:
20. ¿Qué permisos delegados de Microsoft Graph se aprobarían y cuáles necesitan consentimiento del administrador? ¿Se acepta solo el mínimo (leer y escribir en un sitio concreto, nunca en todo el directorio)? Respuesta:
21. ¿Qué inquilino (tenant) se usaría: el de LaLiga, el de la escuela o uno de invitados? ¿Podrían entrar usuarios externos a la organización (por ejemplo, profesorado de la escuela)? Respuesta:
22. ¿Qué ocurre al dar de baja a una persona: pierde el acceso de inmediato? Respuesta:
23. ¿Cuánto dura la sesión y el refresco de tokens? ¿Dónde puede guardarse el token en el móvil (memoria, almacenamiento del navegador) según su política? Respuesta:

### C. Alojamiento (hosting)

24. ¿Debe estar detrás de la red de la organización o de una VPN, o basta el inicio de sesión? Respuesta:
25. ¿Se aceptan las cabeceras de seguridad que la app necesita (política de contenido estricta, sin scripts externos)? ¿Y los dominios de Microsoft imprescindibles (`login.microsoftonline.com`, `graph.microsoft.com`)? Respuesta:
26. ¿Qué dirección y dominio tendría, y quién gestiona el certificado? Respuesta:
27. ¿Cómo se publicarían las versiones nuevas y quién las aprueba (revisión de código, entorno de pruebas)? Respuesta:
28. ¿Se permite el uso offline de la app (service worker) con datos solo en memoria? Respuesta:

### D. SharePoint (y Excel en SharePoint)

29. ¿Cómo se darían permisos por persona o por grupo (quién ve qué alumnos y qué solicitudes)? Respuesta:
30. ¿Dónde alojar los CV y las fotos reales, con enlaces privados y permisos por persona (nunca enlaces públicos)? Respuesta:
31. ¿En qué sitio o biblioteca vivirían, y quién es el propietario del sitio? Respuesta:
32. ¿Hay historial de versiones y papelera con retención suficiente para deshacer un error? ¿Quién puede restaurar? Respuesta:
33. ¿Qué plan de copias de seguridad cubre estos datos y con qué frecuencia? Respuesta:

### E. Roles y permisos

34. ¿Quién puede ver el motivo de un descarte y las notas de entrevista? Respuesta:
35. ¿Quién puede compartir perfiles fuera de la organización y con qué límites? Respuesta:
36. ¿Puede cada persona ver solo los alumnos de su máster o de su promoción? Respuesta:

### F. Registro de accesos y auditoría

37. ¿Dónde se guardan esos registros, quién puede leerlos y durante cuánto tiempo? Respuesta:
38. ¿Se integran con las herramientas de seguridad de TI (registro de auditoría de Microsoft 365, SIEM)? Respuesta:
39. ¿Se necesita una revisión periódica de accesos y de permisos concedidos? Respuesta:

### G. Seguridad y puesta en marcha

40. ¿Cómo se retira el puente de pruebas de Google (borrar script y Sheet) y se comprueba que no queda ningún dato real fuera? Respuesta:
41. ¿Qué plan existe para un móvil perdido o robado con la app instalada? Respuesta:
42. ¿Quién da soporte y quién mantiene la aplicación después de la puesta en marcha? ¿Existe un acuerdo de nivel de servicio? Respuesta:
43. ¿Hay un entorno de pruebas aparte de producción, con datos ficticios? Respuesta:

### H. Microsoft Graph

44. ¿Qué límites de peticiones y qué latencia son aceptables? (La app carga todas las tablas al abrir.) Respuesta:
45. ¿Cómo se gestionan los cambios simultáneos en la misma fila (control de versiones, ETag)? La app hoy detecta conflictos y no pisa en silencio. Respuesta:
46. ¿Quién recibe los avisos de cambios de la API o de caducidad de permisos? Respuesta:

### I. Microsoft Forms y Power Automate (alimentar la hoja Aplicaciones)

47. ¿Cómo se identifica al alumno que responde: por su cuenta corporativa (inicio de sesión obligatorio) o escribiendo un identificador? Respuesta:
48. ¿Se pueden bloquear los duplicados (un alumno, una oferta, una ronda) y validar los datos antes de que lleguen a la hoja? Respuesta:
49. ¿Se puede conectar Forms con una lista o libro de SharePoint mediante Power Automate? ¿Hay licencias y quién mantiene el flujo? Respuesta:
50. ¿Quién ve las respuestas en bruto y durante cuánto tiempo se conservan en Forms? Respuesta:

---

**Responsable del documento:** quien impulsa el proyecto. **Estado:** borrador de preguntas, sin respuestas. **Fecha de la primera versión:** 2026-11-12. **Última reordenación:** 2026-11-17 (50 preguntas: las 11 que bloquean el inicio, arriba, y 39 complementarias).
