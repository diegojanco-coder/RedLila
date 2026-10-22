import { Router } from 'express';
import { obtenerLineasActivas } from '../repositories/ayuda.repository.js';

export const ayudaRouter = Router();

ayudaRouter.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ lineas: await obtenerLineasActivas() });
  } catch (error) { next(error); }
});
