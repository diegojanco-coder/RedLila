// Solo conserva contadores de IP en memoria durante una ventana corta.
// El proxy de producción debe aplicar un límite adicional antes de Node.
const ventanaMs = 10 * 60 * 1000;
// Permite una clase que comparta IP; el proxy puede aplicar un límite más fino.
const maximo = 120;
const intentos = new Map();

setInterval(() => {
  const ahora = Date.now();
  for (const [ip, dato] of intentos) {
    if (dato.vence <= ahora) intentos.delete(ip);
  }
}, ventanaMs).unref();

export function limitarResultados(req, res, next) {
  const ip = req.ip;
  const ahora = Date.now();
  let dato = intentos.get(ip);
  if (!dato || dato.vence <= ahora) dato = { cantidad: 0, vence: ahora + ventanaMs };
  dato.cantidad += 1;
  intentos.set(ip, dato);
  if (dato.cantidad > maximo) {
    res.set('Retry-After', String(Math.ceil((dato.vence - ahora) / 1000)));
    return res.status(429).json({ error: 'Demasiados intentos. Vuelve a probar en unos minutos.' });
  }
  next();
}
