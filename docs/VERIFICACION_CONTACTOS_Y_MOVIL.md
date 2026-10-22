# RedLila: verificación de contactos, contenido y teléfono

**Revisión documental:** 22 de octubre de 2026. **Estado:** pendiente de confirmación operativa y prueba en un teléfono físico.

## 1. Contactos publicados

La revisión de fuentes oficiales confirma que los números listados aparecen en publicaciones institucionales. Esto **no confirma** que una llamada sea atendida hoy ni que un chat de WhatsApp siga activo. `verificada_en` en la base de datos registra la consulta de la fuente, no una llamada de comprobación.

| Servicio en RedLila | Número | Fuente documental | Comprobación operativa |
| --- | --- | --- | --- |
| Policía, nacional | 110 | [Policía Boliviana](https://www.policia.bo/infopol/) | Pendiente |
| FELCV, nacional | 800 14 0348 | [Portafolio policial 2023, p. 37](https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf) y [publicación policial de 2024](https://www.policia.bo/%F0%9D%97%9F%F0%9D%97%94-%F0%9D%97%A3%F0%9D%97%A2%F0%9D%97%9F%F0%9D%97%9C%F0%9D%97%96i%F0%9D%97%94-%F0%9D%97%95%F0%9D%97%A2%F0%9D%97%9F%F0%9D%97%9C%F0%9D%97%A9%F0%9D%97%9C%F0%9D%97%94%F0%9D%97%A1-50/) | Pendiente |
| PAIF/SLIM La Paz | 156; 800 10 4100 | [Gobierno Municipal de La Paz](https://lapaz.bo/paif-de-emergencia-linea-156/) | Pendiente |
| SLIM Cochabamba | 71742126 | [Observatorio Municipal de Cochabamba](https://observatorioviolencia.cochabamba.bo/servicios) | Pendiente |
| FELCV Chuquisaca | WhatsApp 72042698 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Cochabamba, eje sur | WhatsApp 71270447 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Oruro | WhatsApp 62805818 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Potosí | WhatsApp 72042570 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Tarija | WhatsApp 78241690 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Santa Cruz | WhatsApp 72042264 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Beni | WhatsApp 72042709 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Pando | WhatsApp 72042740 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |

El directorio local responde con 13 contactos. Se comprobaron la cobertura de los nueve departamentos y la construcción de los enlaces `tel:` y `https://wa.me/591…` a partir de los datos de la API. Abrir un enlace no demuestra que el destino responda.

### Confirmación directa pendiente

Contactar a la FELCV por sus canales institucionales y solicitar la lista vigente de líneas nacionales y WhatsApp departamentales, sus horarios y zonas de cobertura. Preguntar por cada número de la tabla, especialmente los ocho WhatsApp regionales. Confirmar 110 con la Policía y los números SLIM con cada municipio. Anotar fecha, nombre/cargo de quien confirma y fuente recibida. Si alguno cambia, actualizar `lineas_ayuda` en MySQL y los dos contactos esenciales de `frontend/src/data/lineasRespaldo.js` cuando corresponda. No probar números de emergencia con llamadas simuladas o sin una necesidad real; usar una consulta administrativa a la institución.

## 2. Revisión del Violentómetro

Las siete preguntas cubren vigilancia digital, humillación, aislamiento, control, coerción sexual, amenazas y agresión física. Son señales coherentes con la descripción de violencia de pareja de la [OMS](https://www.who.int/es/news-room/fact-sheets/detail/violence-against-women), que incluye maltrato psicológico, coacción sexual y conductas de control. Cada pregunta tiene cuatro frecuencias con puntajes de 0 a 3. Una respuesta distinta de «Nunca» en coerción sexual, amenazas o agresión física activa el nivel rojo. Los otros niveles se asignan con umbrales 3, 7 y 12 puntos.

**Revisión profesional pendiente:** pedir a una psicóloga, trabajadora social o especialista de un servicio de atención a mujeres que revise la redacción, la mezcla de conductas en las preguntas 6 y 7, las cuatro frecuencias, los umbrales y los mensajes de resultado. Estos puntos son decisiones educativas del proyecto; no se han validado como escala clínica ni como evaluación individual de riesgo. Registrar nombre, fecha y cambios acordados antes de afirmar que el instrumento fue revisado por una especialista.

## 3. Prueba en teléfono físico

La web local responde con HTTP 200 en Inicio, Quiz, Ayuda y el API. Esa comprobación no sustituye la prueba táctil. El script local actual inicia Vite solo en `127.0.0.1`, por lo que **no** se puede abrir directamente desde otro dispositivo. Para probarla en la red local hay que detener ese proceso, iniciar Vite con `--host 0.0.0.0`, permitir el puerto 5173 en el firewall y abrir `http://IP_DEL_COMPUTADOR:5173/` desde un teléfono en la misma red. `localhost` en el teléfono apunta al propio teléfono. La alternativa más sencilla es hacer la prueba después del despliegue HTTPS.

Marcar cada paso en **Android y/o iPhone**, indicando modelo, navegador, fecha y resultado:

- [ ] Inicio: texto legible sin desplazamiento horizontal; menú y botones se pueden tocar.
- [ ] Quiz: cargar las siete preguntas desde la API, seleccionar una opción por pregunta, usar «Anterior» y terminar; comprobar que aparece un resultado. Repetir con una respuesta de alto riesgo y verificar que aparece rojo.
- [ ] Ayuda: filtrar los nueve departamentos y comprobar que los contactos nacionales permanecen visibles; probar el directorio sin conexión para ver el respaldo nacional.
- [ ] Enlaces `tel:`: pulsar un contacto y comprobar que el teléfono ofrece abrir el marcador con el número correcto. **Cancelar antes de llamar**, salvo que exista una necesidad real de ayuda.
- [ ] Enlaces WhatsApp: pulsar un contacto y comprobar que se abre la ficha/chat del número correcto; no enviar mensajes de prueba a los servicios de emergencia.
- [ ] «Salir rápido»: pulsarlo desde Inicio, Quiz, Resultados y Ayuda; debe reemplazar la pestaña por Google de inmediato. Verificar manualmente que el historial anterior del navegador puede seguir existiendo, como advierte la página.
- [ ] Girar la pantalla, usar zoom de texto y revisar que el contenido y los botones sigan accesibles.

**Resultado de prueba física:** pendiente. Registrar aquí las observaciones y corregir cualquier fallo antes de publicar la URL del concurso.
