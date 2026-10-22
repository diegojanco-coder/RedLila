import test from 'node:test';
import assert from 'node:assert/strict';
import { limitarResultados } from '../src/middleware/limite-resultados.js';

test('limita envíos repetidos sin escribir en la base de datos', () => {
  let aprobadas = 0;
  const req = { ip: 'ip-de-prueba-unica' };
  const res = {
    headers: {},
    set(nombre, valor) { this.headers[nombre] = valor; return this; },
    status(codigo) { this.codigo = codigo; return this; },
    json(cuerpo) { this.cuerpo = cuerpo; return this; }
  };
  for (let indice = 0; indice < 120; indice += 1) {
    limitarResultados(req, res, () => { aprobadas += 1; });
  }
  limitarResultados(req, res, () => { aprobadas += 1; });
  assert.equal(aprobadas, 120);
  assert.equal(res.codigo, 429);
  assert.ok(Number(res.headers['Retry-After']) > 0);
});
