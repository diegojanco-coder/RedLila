# RedLila

Plataforma web educativa e interactiva contra la violencia hacia la mujer. Incluye una sección informativa con fuentes, un Violentómetro Digital, un directorio con contactos nacionales y regionales para los nueve departamentos de Bolivia, y un botón de salida rápida. **«No estás sola. Tu voz importa y mereces vivir sin violencia.»** El resultado orienta y no constituye un diagnóstico.

El frontend incluye dos ilustraciones locales en WebP y animaciones discretas; respeta la preferencia del dispositivo por reducir movimiento.

## Requisitos

- Node.js 20 o superior y npm.
- MySQL 8 (local o administrado).

## Arranque local

En esta computadora, la instalación local está en `runtime/`. Desde la raíz del proyecto ejecuta `./scripts/start-local.ps1` en PowerShell y abre `http://localhost:5173/`. El script inicia MySQL, API y frontend en segundo plano y deja registros en `runtime/`.

La base local de esta computadora incluye la ampliación departamental, las estadísticas anónimas, la protección de envíos y la orientación personalizada. Para actualizar una instalación anterior, ejecuta una sola vez y en orden `SOURCE backend/seeds/002_departamentos.sql;`, `SOURCE backend/seeds/003_estadisticas_respuestas.sql;`, `SOURCE backend/seeds/004_protecciones.sql;` y `SOURCE backend/seeds/005_orientacion_personalizada.sql;` según lo que aún falte en esa instalación. En una instalación nueva, usa únicamente `001_completo.sql`, que ya contiene todo el esquema actualizado.

Si preparas otra computadora desde cero:

1. Abre MySQL con `mysql -u root -p`. Desde el prompt de MySQL ejecuta `SOURCE backend/seeds/001_completo.sql;` estando en la carpeta raíz del proyecto.
2. En MySQL crea el usuario de aplicación y otorga permisos mínimos: `CREATE USER 'redlila'@'127.0.0.1' IDENTIFIED BY 'una_clave_segura';`, `GRANT SELECT ON redlila.* TO 'redlila'@'127.0.0.1';`, `GRANT INSERT ON redlila.resultados_quiz TO 'redlila'@'127.0.0.1';` y `GRANT INSERT, UPDATE ON redlila.estadisticas_respuestas TO 'redlila'@'127.0.0.1';`.
3. Copia `backend/.env.example` a `backend/.env` y coloca esa clave en `DB_PASSWORD`. Ejecuta `cd backend`, `npm install` y `npm run dev`.
4. En otra terminal, ejecuta `cd frontend`, `npm install` y `npm run dev`. Abre `http://localhost:5173`.

Las credenciales locales generadas para esta computadora están en `backend/.env`; la clave administrativa está en `runtime/mysql-root-password.txt`. Ambos archivos quedan fuera del código versionado.

El servidor Vite redirige `/api` a `http://localhost:3001`. El frontend usa `/api` en el mismo origen por defecto. Si alojas la API en otro dominio, ajusta `VITE_API_BASE_URL` antes de compilar y configura `CORS_ORIGIN` con el origen público exacto. DM Sans y Manrope se incluyen como archivos del frontend; la visita no necesita consultar Google Fonts.

## Comprobación

- Backend: `cd backend && npm test`.
- Actualización local de la versión personalizada: `cd backend && npm run migrate:local-005`.
- Flujo completo local: `cd backend && npm run smoke:local`. La prueba usa identificadores únicos, comprueba el reintento y revierte sus registros y contadores estadísticos.
- Frontend: `cd frontend && npm run build`.
- API: `GET /api/salud`, `GET /api/quiz/preguntas`, `GET /api/ayuda`.
- El quiz debe devolver 11 preguntas y resultados explicados para los niveles verde, amarillo, naranja y rojo, incluida la prioridad por peligro actual.
- El directorio debe devolver 13 contactos: 2 nacionales y 11 regionales o municipales, con cobertura de La Paz, Oruro, Potosí, Cochabamba, Chuquisaca, Tarija, Santa Cruz, Beni y Pando.

## Privacidad y operación

No se solicitan cuentas ni se almacenan respuestas individuales. El resultado se guarda con fecha, nivel, puntaje y un identificador aleatorio del intento para evitar duplicados; ese identificador no contiene datos personales. Cada opción elegida aumenta un contador acumulado en `estadisticas_respuestas`; la aplicación no persiste la combinación de opciones asociada a un resultado. Las señales y recomendaciones se calculan durante la solicitud y permanecen solo en memoria React. El resultado visible desaparece al recargar o salir de su pantalla. La API mantiene en memoria temporalmente la dirección IP para limitar envíos abusivos; no la guarda en MySQL. Configura el servidor web sin registros de cuerpos de solicitudes y con una política de retención corta para `resultados_quiz`. El botón de escape reemplaza la página actual por Google, pero no puede borrar otras entradas del historial.

La prueba `smoke:local` anterior a la migración 004 podía dejar incrementos en `estadisticas_respuestas`. La versión actual revierte sus datos al terminar. Los conteos históricos no se modifican automáticamente porque no se puede distinguir con seguridad una elección de prueba de una elección real.

La sección informativa enlaza materiales de la [OMS](https://www.who.int/es/news-room/fact-sheets/detail/violence-against-women) y el texto de la [Ley N.º 348 publicado por UNFPA Bolivia](https://bolivia.unfpa.org/es/publicaciones/ley-integral-para-garantizar-a-las-mujeres-una-vida-libre-de-violencia-ley-n%C2%BA-348-del-9). El contenido de RedLila es educativo y no reemplaza la atención profesional.

Las líneas nacionales y municipales se presentan como llamadas; los números regionales de la FELCV publicados como WhatsApp se abren como chat. El portafolio policial usado para esos contactos es de 2023. Antes de publicar para uso público, confirma con las instituciones que cada contacto y su horario siguen operativos y vuelve a revisarlos periódicamente. El campo `verificada_en` registra la fecha de consulta de la fuente, no una llamada de prueba. La redacción de las preguntas y los umbrales del Violentómetro también requieren revisión de una persona especialista antes de presentarse como orientación validada.

La [revisión documental de contactos y el protocolo de prueba en teléfono](docs/VERIFICACION_CONTACTOS_Y_MOVIL.md) detallan qué se comprobó y qué requiere confirmación directa.

Para producción, usa [deploy/nginx.conf.example](deploy/nginx.conf.example) como plantilla: sustituye dominio, ruta de `frontend/dist` y certificados; comprueba que `/quiz`, `/ayuda` y `/resultados` carguen al recargar la página. Sirve HTTPS y dirige `/api` a Node. Configura `CORS_ORIGIN` con el dominio público, `TRUST_PROXY=loopback` solo si Nginx conecta localmente con Node y conserva las credenciales en el servidor. Comprueba los contactos institucionales por sus canales oficiales antes de publicar y registra la fecha de esa comprobación.

Para Railway, el proyecto incluye un `Dockerfile` que publica frontend y backend desde el mismo dominio. Consulta la [guía de despliegue en Railway](deploy/RAILWAY.md) para crear MySQL, vincular las variables y verificar la URL pública.

También incluye `render.yaml` para publicar la aplicación en un servicio gratuito de Render. Usa una base TiDB Cloud Starter compatible con MySQL y configura las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `INIT_DB=true` durante la primera carga. Cuando `/api/salud` responda correctamente, cambia `INIT_DB` a `false`.
