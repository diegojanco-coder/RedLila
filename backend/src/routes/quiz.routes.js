import { Router } from 'express';
import {
  obtenerOpciones,
  obtenerPreguntas,
  obtenerVersionPublicada
} from '../repositories/quiz.repository.js';
import { contenidoValido, evaluar } from '../services/evaluacion.service.js';
import { limitarResultados } from '../middleware/limite-resultados.js';

export const quizRouter = Router();

quizRouter.get('/preguntas', async (req, res, next) => {
  try {
    const version = await obtenerVersionPublicada();
    if (!version) return res.status(503).json({ error: 'El quiz aún no está disponible.' });
    const [preguntas, opciones] = await Promise.all([
      obtenerPreguntas(version.id), obtenerOpciones(version.id)
    ]);
    if (!contenidoValido(version, preguntas, opciones)) {
      return res.status(503).json({ error: 'El quiz aún no está disponible.' });
    }
    const items = preguntas.map(pregunta => ({
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      opciones: opciones
        .filter(opcion => opcion.preguntaId === pregunta.id)
        .map(({ id, texto }) => ({ id, texto }))
    }));
    res.set('Cache-Control', 'no-store');
    res.json({ version: { id: version.id, nombre: version.nombre }, preguntas: items });
  } catch (error) { next(error); }
});

quizRouter.post('/resultados', limitarResultados, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await evaluar(req.body || {}));
  } catch (error) { next(error); }
});
