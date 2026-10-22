import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { quizRouter } from './routes/quiz.routes.js';
import { ayudaRouter } from './routes/ayuda.routes.js';
import { pool } from './db/pool.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inicializarBaseProduccion } from '../scripts/init-production-db.js';

export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) {
  const valor = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(valor) ? Number(valor) : valor);
}
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok' });
  } catch {
    res.status(503).json({ estado: 'no_disponible' });
  }
});
app.use('/api/quiz', quizRouter);
app.use('/api/ayuda', ayudaRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// En producción un solo servicio entrega la SPA y la API desde el mismo origen.
if (process.env.SERVE_FRONTEND === 'true') {
  const carpetaPublica = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  app.use(express.static(carpetaPublica, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(carpetaPublica, 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
}
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ error: 'JSON inválido.' });
  }
  const status = error.status || 500;
  if (status >= 500) console.error('Error del servidor:', error);
  res.status(status).json({ error: status >= 500 ? 'Servicio temporalmente no disponible.' : error.message });
});

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 3001);
  if (process.env.INIT_DB === 'true') {
    inicializarBaseProduccion()
      .then(() => app.listen(port, () => console.log(`RedLila en puerto ${port}`)))
      .catch(error => {
        console.error('No se pudo inicializar la base de datos:', error.message);
        process.exitCode = 1;
      });
  } else {
    app.listen(port, () => console.log(`RedLila en puerto ${port}`));
  }
}
