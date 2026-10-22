import {
  guardarEvaluacion,
  obtenerOpciones,
  obtenerPreguntas,
  obtenerVersionPublicadaPorId
} from '../repositories/quiz.repository.js';

export class ErrorValidacion extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const CATALOGO_SENALES = {
  digital: {
    titulo: 'Control digital',
    descripcion: 'Revisar mensajes, contraseñas o redes sin permiso puede limitar tu privacidad y autonomía.',
    recomendacion: 'Si es seguro, revisa tus contraseñas desde un dispositivo de confianza y evita guardar información sensible donde otra persona pueda verla.'
  },
  psicologica: {
    titulo: 'Violencia psicológica',
    descripcion: 'Las humillaciones, burlas e insultos pueden afectar tu bienestar y no son una parte normal de una relación respetuosa.',
    recomendacion: 'Hablar con una persona que te escuche sin juzgar puede ayudarte a reconocer el patrón y pensar qué apoyo deseas.'
  },
  aislamiento: {
    titulo: 'Aislamiento',
    descripcion: 'Alejarte de amistades o familiares puede reducir tus redes de apoyo y aumentar el control sobre tus decisiones.',
    recomendacion: 'Si puedes hacerlo con seguridad, mantén contacto con una persona de confianza y acuerden una forma discreta de pedir ayuda.'
  },
  autonomia: {
    titulo: 'Control de tu autonomía',
    descripcion: 'Controlar tus salidas, estudios o decisiones personales afecta tu libertad.',
    recomendacion: 'Recuerda que tienes derecho a tomar decisiones sobre tu vida. Puedes pedir orientación antes de decidir cualquier paso.'
  },
  sexual: {
    titulo: 'Violencia sexual',
    descripcion: 'Toda actividad sexual requiere consentimiento libre. Una relación previa nunca reemplaza tu consentimiento.',
    recomendacion: 'Busca atención especializada cuando te resulte seguro. Puedes pedir acompañamiento a una persona de confianza.'
  },
  amenazas: {
    titulo: 'Amenazas',
    descripcion: 'Amenazar con hacer daño busca causar miedo y controlar tus decisiones; es una señal de alto riesgo.',
    recomendacion: 'Evita confrontar a quien amenaza. Considera contactar un servicio especializado desde un lugar o dispositivo seguro.'
  },
  fisica: {
    titulo: 'Violencia física',
    descripcion: 'Empujones, golpes o lesiones son violencia aunque hayan ocurrido una sola vez.',
    recomendacion: 'Prioriza tu seguridad y busca atención o apoyo especializado. Si existe peligro inmediato, llama a emergencias.'
  },
  economica: {
    titulo: 'Violencia económica o patrimonial',
    descripcion: 'Controlar tu dinero, impedirte trabajar o dañar tus pertenencias puede limitar tu independencia.',
    recomendacion: 'Si no aumenta el riesgo, conserva documentos y contactos importantes en un lugar seguro y consulta un SLIM sobre tus opciones.'
  },
  escalamiento: {
    titulo: 'Aumento de las conductas',
    descripcion: 'Que las conductas sean más frecuentes o intensas puede indicar que el riesgo está aumentando.',
    recomendacion: 'No esperes a que la situación empeore para pedir orientación. Piensa con alguien de confianza en una forma segura de comunicarte.'
  },
  peligro_grave: {
    titulo: 'Señal de peligro grave',
    descripcion: 'La asfixia, la sujeción del cuello o las amenazas con armas requieren atención urgente.',
    recomendacion: 'Busca un lugar seguro y apoyo especializado. Si el peligro es inmediato, llama al 110 o a la FELCV.'
  },
  peligro_actual: {
    titulo: 'Temor por tu seguridad',
    descripcion: 'Sentir miedo de sufrir daño grave es una señal importante y merece ser tomada en serio.',
    recomendacion: 'Confía en tu percepción del riesgo. Si puedes hacerlo sin exponerte más, ve a un lugar seguro y pide ayuda.'
  }
};

function intensidad(puntaje) {
  if (puntaje >= 3) return 'Frecuente o intensa';
  if (puntaje === 2) return 'Repetida';
  return 'Identificada';
}

const PRIORIDAD = {
  peligro_actual: 11, peligro_grave: 10, sexual: 9, fisica: 8,
  amenazas: 7, escalamiento: 6, aislamiento: 5, digital: 4,
  economica: 3, psicologica: 2, autonomia: 1
};

const NOMBRES = {
  digital: 'control digital', psicologica: 'humillaciones', aislamiento: 'aislamiento',
  autonomia: 'control de tus decisiones', sexual: 'presión o coerción sexual',
  amenazas: 'amenazas', fisica: 'agresión física', economica: 'control económico',
  escalamiento: 'un aumento de las conductas',
  peligro_grave: 'una situación con asfixia, sujeción del cuello o armas',
  peligro_actual: 'temor por tu seguridad'
};

const TITULOS_CRITICOS = {
  sexual: 'La presión sexual que mencionaste requiere apoyo',
  amenazas: 'Las amenazas que mencionaste requieren atención',
  fisica: 'La agresión física que mencionaste merece apoyo',
  peligro_grave: 'Mencionaste una situación de peligro grave',
  peligro_actual: 'Dijiste que temes sufrir un daño grave'
};

function enumerar(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

export function construirOrientacion(selecciones, nivel, emergenciaInmediata = false) {
  const principales = [...selecciones]
    .filter(seleccion => seleccion.puntaje > 0 && CATALOGO_SENALES[seleccion.categoria])
    .sort((a, b) => Number(b.alertaInmediata) - Number(a.alertaInmediata) ||
      Number(b.alertaCritica) - Number(a.alertaCritica) ||
      (PRIORIDAD[b.categoria] || 0) - (PRIORIDAD[a.categoria] || 0) || b.puntaje - a.puntaje);
  const criticas = principales.filter(seleccion => seleccion.alertaCritica);
  const repetidas = principales.filter(seleccion => seleccion.puntaje >= 2);
  const nombres = principales.slice(0, 2).map(seleccion => NOMBRES[seleccion.categoria]);
  const adicionales = Math.max(0, principales.length - 2);
  const vistas = new Set();
  const senales = [];
  for (const seleccion of principales) {
    if (vistas.has(seleccion.categoria)) continue;
    vistas.add(seleccion.categoria);
    const contenido = CATALOGO_SENALES[seleccion.categoria];
    senales.push({
      categoria: seleccion.categoria,
      titulo: contenido.titulo,
      intensidad: intensidad(seleccion.puntaje),
      descripcion: contenido.descripcion
    });
    if (senales.length === 4) break;
  }

  let titulo;
  let resumen;
  let motivo;
  if (emergenciaInmediata) {
    titulo = 'Dijiste que podrías estar en peligro ahora';
    resumen = principales.length > 1
      ? `También mencionaste ${enumerar(principales.slice(1, 3).map(item => NOMBRES[item.categoria]))}. Tu seguridad tiene prioridad.`
      : 'Tu respuesta indica que necesitas priorizar tu seguridad en este momento.';
    motivo = 'Elegiste la opción que indica peligro actual. Esa respuesta activa la orientación urgente, cualquiera que sea el puntaje de las otras preguntas.';
  } else if (nivel === 'rojo' && criticas.length > 1) {
    titulo = 'Mencionaste varias señales de alto riesgo';
    resumen = `Tus respuestas incluyen ${enumerar(criticas.slice(0, 2).map(item => NOMBRES[item.categoria]))}. Buscar apoyo especializado puede ayudarte a decidir próximos pasos seguros.`;
    motivo = `Se identificaron ${criticas.length} señales críticas en tus respuestas. Cada una merece atención, aunque haya ocurrido una sola vez.`;
  } else if (nivel === 'rojo' && criticas.length === 1) {
    const principal = criticas[0];
    titulo = TITULOS_CRITICOS[principal.categoria] || 'Mencionaste una señal de alto riesgo';
    resumen = principales.length > 1
      ? `Además mencionaste ${enumerar(principales.filter(item => item !== principal).slice(0, 2).map(item => NOMBRES[item.categoria]))}. Mereces orientación y apoyo sin juicios.`
      : `${CATALOGO_SENALES[principal.categoria].descripcion} Mereces orientación y apoyo sin juicios.`;
    motivo = `La respuesta «${principal.texto}» en la pregunta sobre ${NOMBRES[principal.categoria]} activa este nivel aunque el puntaje total sea bajo.`;
  } else if (nivel === 'rojo') {
    titulo = 'Varias conductas frecuentes merecen apoyo';
    resumen = `Mencionaste ${enumerar(nombres)}${adicionales ? ` y ${adicionales} señal${adicionales === 1 ? '' : 'es'} más` : ''}. Considera buscar orientación especializada desde un lugar seguro.`;
    motivo = 'La combinación y frecuencia de las conductas seleccionadas alcanzó el nivel más alto de esta herramienta educativa.';
  } else if (nivel === 'naranja') {
    titulo = `Se repiten señales de ${enumerar(nombres)}`;
    resumen = `Mencionaste ${principales.length} señal${principales.length === 1 ? '' : 'es'}; ${repetidas.length} de ellas se repiten o son intensas. Buscar apoyo cercano puede ayudarte a pensar con calma en tu seguridad.`;
    motivo = 'La suma y frecuencia de las conductas seleccionadas sitúa este resultado en el nivel de riesgo alto.';
  } else if (nivel === 'amarillo') {
    titulo = `Vale la pena prestar atención a ${enumerar(nombres)}`;
    resumen = `Mencionaste ${principales.length} señal${principales.length === 1 ? '' : 'es'} que pueden afectar tu bienestar o autonomía. Puedes buscar orientación sin esperar a que ocurran más veces.`;
    motivo = 'Las respuestas seleccionadas superan el umbral de atención de esta herramienta educativa.';
  } else if (principales.length) {
    titulo = `Mencionaste ${enumerar(nombres)}`;
    resumen = 'Aunque estas respuestas no alcanzan un umbral numérico, lo que te preocupa merece ser escuchado.';
    motivo = 'Una señal aislada puede quedar por debajo del primer umbral. El color no invalida tu experiencia ni determina tu seguridad.';
  } else {
    titulo = 'No identificamos señales en estas respuestas';
    resumen = 'Esto no descarta otras experiencias o preocupaciones. Puedes pedir orientación siempre que la necesites.';
    motivo = 'Todas las respuestas seleccionadas indicaron ausencia de las conductas preguntadas.';
  }

  const recomendaciones = [];
  if (emergenciaInmediata) {
    recomendaciones.push({
      titulo: 'Busca seguridad inmediata',
      texto: 'Si puedes hacerlo sin aumentar el riesgo, ve a un lugar seguro y llama al 110 o a la FELCV. Evita confrontar a quien te pone en peligro.'
    });
  } else if (nivel === 'rojo') {
    recomendaciones.push({
      titulo: 'Busca apoyo especializado pronto',
      texto: 'Contacta a la FELCV, un SLIM o una persona de confianza desde un lugar seguro. Evita confrontar a quien te pone en riesgo.'
    });
  } else if (nivel === 'naranja') {
    recomendaciones.push({
      titulo: 'Prepara una forma segura de pedir ayuda',
      texto: 'Considera hablar con alguien de confianza y consultar un servicio especializado. Tú decides qué paso tomar y cuándo hacerlo.'
    });
  } else if (nivel === 'amarillo') {
    recomendaciones.push({
      titulo: 'Observa las señales y busca orientación',
      texto: 'Reconocer si estas conductas se repiten puede ayudarte. Puedes conversar con alguien que respete tus decisiones.'
    });
  } else {
    recomendaciones.push({
      titulo: 'Mantén cerca tus redes de apoyo',
      texto: 'Infórmate sobre relaciones respetuosas y recuerda que puedes pedir orientación si algo te preocupa.'
    });
  }
  for (const seleccion of principales) {
    const contenido = CATALOGO_SENALES[seleccion.categoria];
    if (!contenido || (emergenciaInmediata && seleccion.categoria === 'peligro_actual') ||
        recomendaciones.some(item => item.texto === contenido.recomendacion)) continue;
    recomendaciones.push({ titulo: `Sobre ${contenido.titulo.toLowerCase()}`, texto: contenido.recomendacion });
    if (recomendaciones.length === 3) break;
  }
  return { titulo, resumen, motivo, senales, recomendaciones };
}

// Los umbrales pertenecen a cada versión publicada y requieren revisión al editar el quiz.
export function clasificar(puntaje, alertaCritica, umbrales = { amarillo: 3, naranja: 7, rojo: 12 }) {
  if (alertaCritica || puntaje >= umbrales.rojo) return 'rojo';
  if (puntaje >= umbrales.naranja) return 'naranja';
  if (puntaje >= umbrales.amarillo) return 'amarillo';
  return 'verde';
}

export function umbralesValidos(version, puntajeMaximo) {
  const { umbralAmarillo, umbralNaranja, umbralRojo } = version;
  return [umbralAmarillo, umbralNaranja, umbralRojo].every(Number.isSafeInteger) &&
    0 < umbralAmarillo && umbralAmarillo < umbralNaranja &&
    umbralNaranja < umbralRojo && umbralRojo <= puntajeMaximo;
}

// Devuelve la suma de los puntajes más altos de cada pregunta, o null si el contenido es inválido.
export function calcularPuntajeMaximo(preguntas, opciones) {
  if (!preguntas.length) return null;
  const porPregunta = new Map();
  for (const opcion of opciones) {
    const lista = porPregunta.get(opcion.preguntaId) || [];
    lista.push(opcion);
    porPregunta.set(opcion.preguntaId, lista);
  }
  let puntajeMaximo = 0;
  for (const pregunta of preguntas) {
    const lista = porPregunta.get(pregunta.id) || [];
    if (typeof pregunta.categoria !== 'string' || !pregunta.categoria.trim() ||
        lista.length < 2 || lista.some(opcion =>
      !Number.isSafeInteger(opcion.puntaje) || opcion.puntaje < 0 || opcion.puntaje > 3)) return null;
    puntajeMaximo += Math.max(...lista.map(opcion => opcion.puntaje));
  }
  return puntajeMaximo;
}

export function contenidoValido(version, preguntas, opciones) {
  const puntajeMaximo = calcularPuntajeMaximo(preguntas, opciones);
  return puntajeMaximo !== null && umbralesValidos(version, puntajeMaximo);
}

export async function evaluar({ versionId, opcionIds, solicitudId }) {
  if (!Number.isSafeInteger(versionId) || versionId < 1 ||
      !Array.isArray(opcionIds) || opcionIds.length < 1 || opcionIds.length > 50 ||
      !opcionIds.every(id => Number.isSafeInteger(id) && id > 0) ||
      typeof solicitudId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitudId)) {
    throw new ErrorValidacion('Envía una versión y una opción válida por pregunta.');
  }

  const version = await obtenerVersionPublicadaPorId(versionId);
  if (!version) throw new ErrorValidacion('La versión del quiz ya no está disponible.');

  const [preguntas, opciones] = await Promise.all([
    obtenerPreguntas(versionId),
    obtenerOpciones(versionId)
  ]);
  if (!preguntas.length || !opciones.length) {
    const error = new Error('El quiz publicado no tiene contenido.');
    error.status = 503;
    throw error;
  }
  const umbrales = {
    amarillo: version.umbralAmarillo,
    naranja: version.umbralNaranja,
    rojo: version.umbralRojo
  };
  if (!contenidoValido(version, preguntas, opciones)) {
    const error = new Error('La versión publicada necesita opciones y umbrales válidos.');
    error.status = 503;
    throw error;
  }
  if (opcionIds.length !== preguntas.length || new Set(opcionIds).size !== opcionIds.length) {
    throw new ErrorValidacion('Responde cada pregunta exactamente una vez.');
  }

  const opcionesPorId = new Map(opciones.map(opcion => [opcion.id, opcion]));
  const preguntasPorId = new Map(preguntas.map(pregunta => [pregunta.id, pregunta]));
  const preguntasRespondidas = new Set();
  const selecciones = [];
  let puntaje = 0;
  let alertaCritica = false;
  let emergenciaInmediata = false;

  for (const id of opcionIds) {
    const opcion = opcionesPorId.get(id);
    if (!opcion || preguntasRespondidas.has(opcion.preguntaId)) {
      throw new ErrorValidacion('Las respuestas no corresponden al quiz publicado.');
    }
    preguntasRespondidas.add(opcion.preguntaId);
    puntaje += opcion.puntaje;
    alertaCritica ||= Boolean(opcion.alertaCritica);
    emergenciaInmediata ||= Boolean(opcion.alertaInmediata);
    selecciones.push({ ...opcion, categoria: preguntasPorId.get(opcion.preguntaId).categoria });
  }

  const nivel = clasificar(puntaje, alertaCritica, umbrales);
  const guardado = await guardarEvaluacion({ versionId, puntaje, nivel, alertaCritica, opcionIds, solicitudId });
  if (guardado.puntaje !== puntaje || guardado.nivel !== nivel || guardado.alertaCritica !== alertaCritica) {
    const error = new Error('El identificador del intento ya fue utilizado con otras respuestas.');
    error.status = 409;
    throw error;
  }
  return {
    versionId,
    ...guardado,
    puntajeMaximo: calcularPuntajeMaximo(preguntas, opciones),
    umbrales,
    emergenciaInmediata,
    orientacion: construirOrientacion(selecciones, nivel, emergenciaInmediata)
  };
}
