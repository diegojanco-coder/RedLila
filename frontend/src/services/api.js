const base = import.meta.env.VITE_API_BASE_URL || '';
const tiempoMaximoMs = 10000;

async function solicitar(ruta, opciones = {}) {
  const controller = new AbortController();
  const cancelacionExterna = () => controller.abort();
  let vencioTiempo = false;
  if (opciones.signal?.aborted) controller.abort();
  else opciones.signal?.addEventListener('abort', cancelacionExterna, { once: true });
  const temporizador = setTimeout(() => {
    vencioTiempo = true;
    controller.abort();
  }, tiempoMaximoMs);

  try {
    const respuesta = await fetch(`${base}${ruta}`, {
      ...opciones,
      signal: controller.signal,
      headers: { ...(opciones.body ? { 'Content-Type': 'application/json' } : {}), ...opciones.headers },
      cache: 'no-store'
    });
    let datos;
    try { datos = await respuesta.json(); }
    catch {
      if (respuesta.status === 429) throw new Error('Demasiados intentos. Vuelve a probar en unos minutos.');
      if (!respuesta.ok) throw new Error('El servicio no está disponible en este momento.');
      throw new Error('El servicio devolvió una respuesta ilegible.');
    }
    if (!respuesta.ok) throw new Error(datos?.error || 'No se pudo completar la solicitud.');
    return datos;
  } catch (error) {
    if (vencioTiempo) throw new Error('El servicio tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.');
    if (opciones.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con el servicio.');
    throw error;
  } finally {
    clearTimeout(temporizador);
    opciones.signal?.removeEventListener('abort', cancelacionExterna);
  }
}

const enteroPositivo = valor => Number.isSafeInteger(valor) && valor > 0;

export async function obtenerQuiz(signal) {
  const datos = await solicitar('/api/quiz/preguntas', { signal });
  if (!enteroPositivo(datos?.version?.id) || !Array.isArray(datos.preguntas) ||
      datos.preguntas.length === 0 || datos.preguntas.some(pregunta =>
        !enteroPositivo(pregunta.id) || typeof pregunta.enunciado !== 'string' ||
        !Array.isArray(pregunta.opciones) || pregunta.opciones.length < 2 ||
        pregunta.opciones.some(opcion => !enteroPositivo(opcion.id) || typeof opcion.texto !== 'string'))) {
    throw new Error('Las preguntas recibidas están incompletas. Inténtalo más tarde.');
  }
  return datos;
}

export async function enviarRespuestas(versionId, opcionIds, solicitudId) {
  const datos = await solicitar('/api/quiz/resultados', {
    method: 'POST', body: JSON.stringify({ versionId, opcionIds, solicitudId })
  });
  if (!['verde', 'amarillo', 'naranja', 'rojo'].includes(datos?.nivel) ||
      !Number.isSafeInteger(datos.puntaje) || typeof datos.alertaCritica !== 'boolean' ||
      typeof datos.emergenciaInmediata !== 'boolean' ||
      typeof datos.orientacion?.titulo !== 'string' ||
      typeof datos.orientacion?.resumen !== 'string' ||
      typeof datos.orientacion?.motivo !== 'string' ||
      !Array.isArray(datos.orientacion.senales) ||
      !Array.isArray(datos.orientacion.recomendaciones)) {
    throw new Error('El servicio devolvió un resultado incompleto. Inténtalo de nuevo.');
  }
  return datos;
}

export async function obtenerAyuda(signal) {
  const datos = await solicitar('/api/ayuda', { signal });
  if (!Array.isArray(datos?.lineas) || datos.lineas.some(linea =>
    typeof linea.institucion !== 'string' || typeof linea.departamento !== 'string' ||
    typeof linea.numeroMarcacion !== 'string' || !['telefono', 'whatsapp'].includes(linea.canal) ||
    typeof linea.fuenteUrl !== 'string')) {
    throw new Error('El directorio recibido está incompleto.');
  }
  return datos;
}
