# Publicación de RedLila en Railway

El `Dockerfile` de la raíz compila React y entrega la web y `/api` desde el mismo servicio Node. La base MySQL es un segundo servicio privado. No se suben `.env`, `runtime/` ni claves locales.

## Primera publicación

1. En [Railway](https://railway.com/) crea un proyecto **RedLila** y agrega una base **MySQL**. Espera a que figure como disponible.
2. Instala la [CLI oficial](https://docs.railway.com/cli): `npm i -g @railway/cli`. En la carpeta raíz de este proyecto ejecuta `railway login` y `railway link` para vincular el proyecto.
3. Agrega un servicio vacío llamado **RedLila** en ese proyecto. En sus variables configura referencias a las variables del servicio MySQL. Si la base se llama `MySQL`, agrega:

   ```text
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   INIT_DB=true
   TRUST_PROXY=1
   ```

   Ajusta `MySQL` si el servicio tiene otro nombre. `SERVE_FRONTEND=true` y `NODE_ENV=production` ya están en el `Dockerfile`. No copies la contraseña MySQL en el código ni en este archivo.
4. Desde la raíz ejecuta `railway up --service RedLila`. Al primer inicio, `INIT_DB=true` crea el esquema y carga el quiz y directorio en la base vacía. Las sentencias de semilla son repetibles y no borran resultados existentes.
5. En la configuración del servicio web agrega el **Healthcheck Path** `/api/salud` y genera un dominio público con `railway domain --service RedLila` o en **Settings → Networking**.
6. Verifica `https://TU-DOMINIO/api/salud`, el inicio, el quiz completo y el directorio desde un teléfono fuera de la red local. Confirma que la API responda `{"estado":"ok"}` y que el cuestionario muestre once preguntas.
7. Tras la primera carga, cambia `INIT_DB` a `false` en Railway. Railway redeplegará el servicio. Verifica de nuevo `/api/salud`.

Para actualizaciones del código, vuelve a ejecutar `railway up --service RedLila`. No vuelvas a usar el archivo SQL inicial sobre una base con cambios de contenido; utiliza una migración específica. La app responde en el puerto que Railway inyecta en `PORT`.

## Comprobaciones antes de compartir la URL

- Haz una prueba de extremo a extremo: cuatro niveles de resultado, directorio, enlaces `tel:` y WhatsApp y salida rápida.
- Confirma directamente con las instituciones los contactos publicados, en especial los números regionales tomados de un portafolio de 2023.
- Pide una revisión especializada de las preguntas y umbrales del Violentómetro antes de presentarlo como instrumento validado.
- Revisa el uso y los créditos de la cuenta Railway. Sus planes y límites pueden cambiar; consulta la [página oficial](https://docs.railway.com/pricing) antes de contratar un plan.

## Si falla el despliegue

- `503` en `/api/salud`: revisa las cinco variables `DB_*`, el estado de MySQL y los registros del servicio web.
- La web abre, pero el quiz no carga: comprueba `/api/quiz/preguntas` y que `INIT_DB=true` se haya ejecutado al menos una vez.
- No abre el dominio: comprueba que el servicio tiene dominio público y que escucha `PORT`.
