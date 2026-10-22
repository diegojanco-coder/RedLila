import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:5173';
const rootPassword = (await readFile(new URL('../../runtime/mysql-root-password.txt', import.meta.url), 'utf8')).trim();
const admin = await mysql.createConnection({
  host: '127.0.0.1', port: 3306, user: 'root', password: rootPassword, database: 'redlila'
});
const solicitudes = new Map();

async function json(ruta, opciones) {
  const respuesta = await fetch(base + ruta, opciones);
  const datos = await respuesta.json();
  assert.equal(respuesta.status, 200, `${ruta}: ${JSON.stringify(datos)}`);
  return datos;
}

async function limpiarIntentos() {
  if (!solicitudes.size) return;
  const ids = [...solicitudes.keys()];
  const [registros] = await admin.query(
    `SELECT id, solicitud_id AS solicitudId FROM resultados_quiz
      WHERE solicitud_id IN (${ids.map(() => '?').join(',')})`, ids
  );
  const cantidades = new Map();
  for (const registro of registros) {
    for (const opcionId of solicitudes.get(registro.solicitudId)) {
      cantidades.set(opcionId, (cantidades.get(opcionId) || 0) + 1);
    }
  }
  await admin.beginTransaction();
  try {
    for (const [opcionId, cantidad] of cantidades) {
      const [actualizado] = await admin.query(
        `UPDATE estadisticas_respuestas SET cantidad = cantidad - ?
          WHERE opcion_id = ? AND cantidad >= ?`, [cantidad, opcionId, cantidad]
      );
      assert.equal(actualizado.affectedRows, 1, 'No se pudo revertir una estadística de prueba.');
    }
    if (registros.length) {
      const [borrado] = await admin.query(
        `DELETE FROM resultados_quiz WHERE id IN (${registros.map(() => '?').join(',')})`,
        registros.map(registro => registro.id)
      );
      assert.equal(borrado.affectedRows, registros.length);
    }
    await admin.commit();
  } catch (error) {
    await admin.rollback();
    throw error;
  }
}

try {
  const salud = await json('/api/salud');
  assert.equal(salud.estado, 'ok');

  const quiz = await json('/api/quiz/preguntas');
  assert.equal(quiz.preguntas.length, 11);
  assert.deepEqual(Object.keys(quiz.preguntas[0].opciones[0]).sort(), ['id', 'texto']);

  const ayuda = await json('/api/ayuda');
  assert.equal(ayuda.lineas.length, 13);
  assert.equal(new Set(ayuda.lineas.filter(linea => linea.departamento !== 'Nacional').map(linea => linea.departamento)).size, 9);

  const normales = quiz.preguntas.map(pregunta => pregunta.opciones[0].id);
  const atencion = [...normales];
  atencion[0] = quiz.preguntas[0].opciones[3].id;
  atencion[1] = quiz.preguntas[1].opciones[1].id;
  const riesgoAlto = [...normales];
  riesgoAlto[0] = quiz.preguntas[0].opciones[3].id;
  riesgoAlto[1] = quiz.preguntas[1].opciones[3].id;
  riesgoAlto[2] = quiz.preguntas[2].opciones[3].id;
  const critica = [...normales];
  critica[4] = quiz.preguntas[4].opciones[1].id;
  const inmediata = [...normales];
  inmediata[10] = quiz.preguntas[10].opciones[3].id;
  const verdeId = randomUUID();
  const amarilloId = randomUUID();
  const naranjaId = randomUUID();
  const rojoId = randomUUID();
  const inmediatoId = randomUUID();
  solicitudes.set(verdeId, normales);
  solicitudes.set(amarilloId, atencion);
  solicitudes.set(naranjaId, riesgoAlto);
  solicitudes.set(rojoId, critica);
  solicitudes.set(inmediatoId, inmediata);
  const enviar = (opcionIds, solicitudId) => json('/api/quiz/resultados', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionId: quiz.version.id, opcionIds, solicitudId })
  });

  const verde = await enviar(normales, verdeId);
  const amarillo = await enviar(atencion, amarilloId);
  const naranja = await enviar(riesgoAlto, naranjaId);
  const rojo = await enviar(critica, rojoId);
  const inmediato = await enviar(inmediata, inmediatoId);
  const repetido = await enviar(normales, verdeId);
  assert.equal(verde.nivel, 'verde');
  assert.equal(amarillo.nivel, 'amarillo');
  assert.equal(naranja.nivel, 'naranja');
  assert.equal(rojo.nivel, 'rojo');
  assert.equal(rojo.alertaCritica, true);
  assert.match(rojo.orientacion.titulo, /presión sexual/i);
  assert.match(rojo.orientacion.motivo, /Ocurrió una vez/i);
  assert.equal(rojo.orientacion.senales[0].categoria, 'sexual');
  assert.ok(rojo.orientacion.recomendaciones.length >= 2);
  assert.equal(inmediato.nivel, 'rojo');
  assert.equal(inmediato.emergenciaInmediata, true);
  assert.notEqual(inmediato.orientacion.titulo, rojo.orientacion.titulo);
  assert.match(inmediato.orientacion.titulo, /peligro ahora/i);
  assert.match(inmediato.orientacion.recomendaciones[0].texto, /110/);
  assert.deepEqual(repetido, verde, 'El reintento debe devolver el mismo resultado.');
  const [[{ cantidad }]] = await admin.query(
    'SELECT COUNT(*) AS cantidad FROM resultados_quiz WHERE solicitud_id IN (?, ?, ?, ?, ?)',
    [verdeId, amarilloId, naranjaId, rojoId, inmediatoId]
  );
  assert.equal(cantidad, 5, 'El reintento no debe crear otro resultado.');
  console.log('Flujo completo verificado: cuatro niveles, peligro actual, MySQL e idempotencia.');
} finally {
  try { await limpiarIntentos(); }
  finally { await admin.end(); }
}
