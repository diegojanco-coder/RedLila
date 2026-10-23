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
// Cabeceras defensivas sin dependencias adicionales. Protegen la SPA frente a
// contenido incrustado, MIME sniffing y ejecución de recursos ajenos.
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  next();
});

const origenesPermitidos = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(origen => origen.trim()).filter(Boolean);
app.use(cors({
  origin(origen, callback) {
    // Las navegaciones y peticiones desde el mismo origen no envían Origin.
    if (!origen || origenesPermitidos.includes(origen)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
}));
app.use(express.json({ limit: '10kb' }));

// Límite general en memoria para reducir scraping y denegación de servicio.
const solicitudes = new Map();
const ventanaApiMs = 10 * 60 * 1000;
const maximoApi = 300;
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, dato] of solicitudes) if (dato.vence <= ahora) solicitudes.delete(ip);
}, ventanaApiMs).unref();
app.use('/api', (req, res, next) => {
  const ahora = Date.now();
  let dato = solicitudes.get(req.ip);
  if (!dato || dato.vence <= ahora) dato = { cantidad: 0, vence: ahora + ventanaApiMs };
  dato.cantidad += 1;
  solicitudes.set(req.ip, dato);
  if (dato.cantidad > maximoApi) {
    res.set('Retry-After', String(Math.ceil((dato.vence - ahora) / 1000)));
    return res.status(429).json({ error: 'Demasiadas solicitudes. Vuelve a intentar en unos minutos.' });
  }
  next();
});

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
