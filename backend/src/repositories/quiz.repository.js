import { pool } from '../db/pool.js';

export async function obtenerVersionPublicada() {
  const [rows] = await pool.execute(
    `SELECT id, nombre, umbral_amarillo AS umbralAmarillo,
            umbral_naranja AS umbralNaranja, umbral_rojo AS umbralRojo
       FROM versiones_quiz WHERE publicada = 1 ORDER BY id DESC LIMIT 1`
  );
  return rows[0] || null;
}

export async function obtenerVersionPublicadaPorId(id) {
  const [rows] = await pool.execute(
    `SELECT id, nombre, umbral_amarillo AS umbralAmarillo,
            umbral_naranja AS umbralNaranja, umbral_rojo AS umbralRojo
       FROM versiones_quiz WHERE id = ? AND publicada = 1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function obtenerPreguntas(versionId) {
  const [rows] = await pool.execute(
    `SELECT id, enunciado, categoria, orden
       FROM preguntas
      WHERE version_quiz_id = ? AND activa = 1
      ORDER BY orden, id`,
    [versionId]
  );
  return rows;
}

export async function obtenerOpciones(versionId) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.pregunta_id AS preguntaId, o.texto, o.orden,
            o.puntaje, o.alerta_critica AS alertaCritica,
            o.alerta_inmediata AS alertaInmediata
       FROM opciones o
       JOIN preguntas p ON p.id = o.pregunta_id
      WHERE p.version_quiz_id = ? AND p.activa = 1
      ORDER BY p.orden, o.orden, o.id`,
    [versionId]
  );
  return rows;
}

async function obtenerPorSolicitud(solicitudId) {
  const [rows] = await pool.execute(
    `SELECT puntaje, nivel, alerta_critica AS alertaCritica
       FROM resultados_quiz WHERE solicitud_id = ? LIMIT 1`, [solicitudId]
  );
  const fila = rows[0];
  return fila ? { puntaje: fila.puntaje, nivel: fila.nivel, alertaCritica: Boolean(fila.alertaCritica) } : null;
}

export async function guardarEvaluacion({ versionId, puntaje, nivel, alertaCritica, opcionIds, solicitudId }) {
  // La clave aleatoria identifica un intento, sin conservar respuestas individuales.
  const existente = await obtenerPorSolicitud(solicitudId);
  if (existente) return existente;
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.execute(
      `INSERT INTO resultados_quiz
         (version_quiz_id, fecha, puntaje, nivel, alerta_critica, solicitud_id)
       VALUES (?, CURRENT_DATE(), ?, ?, ?, ?)`,
      [versionId, puntaje, nivel, alertaCritica, solicitudId]
    );
    for (const opcionId of opcionIds) {
      await conexion.execute(
        `INSERT INTO estadisticas_respuestas (opcion_id, cantidad)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE cantidad = cantidad + 1`,
        [opcionId]
      );
    }
    await conexion.commit();
    return { puntaje, nivel, alertaCritica };
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const repetida = await obtenerPorSolicitud(solicitudId);
      if (repetida) return repetida;
    }
    throw error;
  } finally {
    conexion.release();
  }
}
