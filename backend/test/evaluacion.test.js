import test from 'node:test';
import assert from 'node:assert/strict';
import { clasificar, construirOrientacion, contenidoValido, evaluar, umbralesValidos } from '../src/services/evaluacion.service.js';

test('clasifica los límites de cada nivel', () => {
  assert.equal(clasificar(0, false), 'verde');
  assert.equal(clasificar(3, false), 'amarillo');
  assert.equal(clasificar(7, false), 'naranja');
  assert.equal(clasificar(12, false), 'rojo');
});

test('una señal crítica tiene prioridad incluso con puntaje bajo', () => {
  assert.equal(clasificar(1, true), 'rojo');
});

test('cada versión puede definir umbrales propios', () => {
  const umbrales = { amarillo: 5, naranja: 10, rojo: 15 };
  assert.equal(clasificar(4, false, umbrales), 'verde');
  assert.equal(clasificar(5, false, umbrales), 'amarillo');
  assert.equal(clasificar(10, false, umbrales), 'naranja');
  assert.equal(clasificar(15, false, umbrales), 'rojo');
  assert.equal(clasificar(1, true, umbrales), 'rojo');
});

test('detecta umbrales incompatibles con la cantidad de preguntas', () => {
  assert.equal(umbralesValidos({ umbralAmarillo: 3, umbralNaranja: 7, umbralRojo: 12 }, 21), true);
  assert.equal(umbralesValidos({ umbralAmarillo: 3, umbralNaranja: 7, umbralRojo: 12 }, 9), false);
  assert.equal(umbralesValidos({ umbralAmarillo: 7, umbralNaranja: 3, umbralRojo: 12 }, 21), false);
});

test('detecta preguntas sin opciones suficientes o umbrales inalcanzables', () => {
  const version = { umbralAmarillo: 1, umbralNaranja: 2, umbralRojo: 3 };
  const preguntas = [{ id: 1, categoria: 'digital' }];
  assert.equal(contenidoValido(version, preguntas, [{ preguntaId: 1, puntaje: 0 }]), false);
  assert.equal(contenidoValido(version, preguntas, [
    { preguntaId: 1, puntaje: 0 }, { preguntaId: 1, puntaje: 2 }
  ]), false);
  assert.equal(contenidoValido(version, preguntas, [
    { preguntaId: 1, puntaje: 0 }, { preguntaId: 1, puntaje: 3 }
  ]), true);
});

test('crea una orientación explicable con las señales de mayor prioridad', () => {
  const orientacion = construirOrientacion([
    { categoria: 'digital', texto: 'Ocurre a veces', puntaje: 2, alertaCritica: false, alertaInmediata: false },
    { categoria: 'amenazas', texto: 'Ocurrió una vez', puntaje: 1, alertaCritica: true, alertaInmediata: false }
  ], 'rojo', false);
  assert.equal(orientacion.senales[0].categoria, 'amenazas');
  assert.match(orientacion.titulo, /amenazas/i);
  assert.match(orientacion.resumen, /control digital/i);
  assert.match(orientacion.motivo, /Ocurrió una vez/i);
  assert.ok(orientacion.recomendaciones.length >= 2);
});

test('prioriza una recomendación de seguridad cuando existe peligro actual', () => {
  const orientacion = construirOrientacion([
    { categoria: 'peligro_actual', texto: 'Sí, creo que estoy en peligro ahora', puntaje: 3, alertaCritica: true, alertaInmediata: true }
  ], 'rojo', true);
  assert.match(orientacion.titulo, /peligro ahora/i);
  assert.match(orientacion.motivo, /peligro actual/i);
  assert.match(orientacion.recomendaciones[0].texto, /110/);
});

test('dos respuestas rojas diferentes reciben motivos y títulos diferentes', () => {
  const sexual = construirOrientacion([
    { categoria: 'sexual', texto: 'Ocurrió una vez', puntaje: 1, alertaCritica: true, alertaInmediata: false }
  ], 'rojo', false);
  const fisica = construirOrientacion([
    { categoria: 'fisica', texto: 'Ocurrió una vez', puntaje: 1, alertaCritica: true, alertaInmediata: false }
  ], 'rojo', false);
  assert.notEqual(sexual.titulo, fisica.titulo);
  assert.match(sexual.resumen, /consentimiento/i);
  assert.match(fisica.resumen, /Empujones/i);
  assert.match(fisica.motivo, /agresión física/i);
});

test('una señal leve conserva su explicación aunque quede bajo el primer umbral', () => {
  const orientacion = construirOrientacion([
    { categoria: 'digital', texto: 'Ocurrió una vez', puntaje: 1, alertaCritica: false, alertaInmediata: false }
  ], 'verde', false);
  assert.match(orientacion.titulo, /control digital/i);
  assert.match(orientacion.motivo, /señal aislada/i);
  assert.equal(orientacion.senales.length, 1);
});

test('rechaza un intento sin identificador válido antes de consultar MySQL', async () => {
  await assert.rejects(
    evaluar({ versionId: 1, opcionIds: [1], solicitudId: 'repetido' }),
    error => error.status === 400
  );
});
