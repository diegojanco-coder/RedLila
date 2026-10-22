-- Nueva versión del Violentómetro con categorías y orientación personalizada.
-- Conserva la versión anterior y sus resultados para no alterar estadísticas históricas.
USE redlila;

ALTER TABLE preguntas
  ADD COLUMN categoria VARCHAR(32) NOT NULL DEFAULT 'general' AFTER enunciado;

ALTER TABLE opciones
  ADD COLUMN alerta_inmediata BOOLEAN NOT NULL DEFAULT FALSE AFTER alerta_critica;

START TRANSACTION;

UPDATE versiones_quiz SET publicada = FALSE WHERE publicada = TRUE;

INSERT INTO versiones_quiz
  (id, nombre, publicada, umbral_amarillo, umbral_naranja, umbral_rojo)
VALUES
  (2, 'Violentómetro educativo personalizado, versión 2', TRUE, 4, 9, 16);

INSERT INTO preguntas (id, version_quiz_id, enunciado, categoria, orden) VALUES
  (101, 2, '¿Tu pareja o alguien cercano revisa tu teléfono, mensajes o redes sin tu consentimiento?', 'digital', 1),
  (102, 2, '¿Te humilla, ridiculiza o hace comentarios que te hacen sentir inferior?', 'psicologica', 2),
  (103, 2, '¿Intenta alejarte de amistades, familiares o personas de apoyo?', 'aislamiento', 3),
  (104, 2, '¿Controla tus salidas, estudios, actividades o decisiones personales?', 'autonomia', 4),
  (105, 2, '¿Te presiona o fuerza a realizar actos sexuales que no deseas?', 'sexual', 5),
  (106, 2, '¿Te amenaza con hacerte daño a ti, a otras personas o a sí misma si no haces lo que quiere?', 'amenazas', 6),
  (107, 2, '¿Te ha empujado, golpeado, pateado o causado alguna lesión física?', 'fisica', 7),
  (108, 2, '¿Controla tus ingresos, te quita dinero, te impide trabajar o daña tus pertenencias?', 'economica', 8),
  (109, 2, '¿Las conductas que te preocupan han aumentado en frecuencia o intensidad recientemente?', 'escalamiento', 9),
  (110, 2, '¿Te ha sujetado del cuello, intentado asfixiarte o amenazado con un arma?', 'peligro_grave', 10),
  (111, 2, '¿Sientes miedo de que pueda hacerte daño grave o crees que estás en peligro ahora?', 'peligro_actual', 11);

INSERT INTO opciones
  (id, pregunta_id, texto, orden, puntaje, alerta_critica, alerta_inmediata) VALUES
  (101, 101, 'Nunca', 1, 0, FALSE, FALSE),
  (102, 101, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (103, 101, 'Ocurre a veces', 3, 2, FALSE, FALSE),
  (104, 101, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (105, 102, 'Nunca', 1, 0, FALSE, FALSE),
  (106, 102, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (107, 102, 'Ocurre a veces', 3, 2, FALSE, FALSE),
  (108, 102, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (109, 103, 'Nunca', 1, 0, FALSE, FALSE),
  (110, 103, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (111, 103, 'Ocurre a veces', 3, 2, FALSE, FALSE),
  (112, 103, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (113, 104, 'Nunca', 1, 0, FALSE, FALSE),
  (114, 104, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (115, 104, 'Ocurre a veces', 3, 2, FALSE, FALSE),
  (116, 104, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (117, 105, 'Nunca', 1, 0, FALSE, FALSE),
  (118, 105, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (119, 105, 'Ocurre a veces', 3, 2, TRUE, FALSE),
  (120, 105, 'Ocurre con frecuencia', 4, 3, TRUE, FALSE),
  (121, 106, 'Nunca', 1, 0, FALSE, FALSE),
  (122, 106, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (123, 106, 'Ocurre a veces', 3, 2, TRUE, FALSE),
  (124, 106, 'Ocurre con frecuencia', 4, 3, TRUE, FALSE),
  (125, 107, 'Nunca', 1, 0, FALSE, FALSE),
  (126, 107, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (127, 107, 'Ocurre a veces', 3, 2, TRUE, FALSE),
  (128, 107, 'Ocurre con frecuencia', 4, 3, TRUE, FALSE),
  (129, 108, 'Nunca', 1, 0, FALSE, FALSE),
  (130, 108, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (131, 108, 'Ocurre a veces', 3, 2, FALSE, FALSE),
  (132, 108, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (133, 109, 'No han aumentado', 1, 0, FALSE, FALSE),
  (134, 109, 'Aumentaron un poco', 2, 1, FALSE, FALSE),
  (135, 109, 'Aumentaron claramente', 3, 2, FALSE, FALSE),
  (136, 109, 'Aumentaron mucho o muy rápido', 4, 3, FALSE, FALSE),
  (137, 110, 'Nunca', 1, 0, FALSE, FALSE),
  (138, 110, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (139, 110, 'Ocurrió más de una vez', 3, 2, TRUE, FALSE),
  (140, 110, 'Ocurrió recientemente o con frecuencia', 4, 3, TRUE, FALSE),
  (141, 111, 'No siento ese peligro', 1, 0, FALSE, FALSE),
  (142, 111, 'A veces me preocupa', 2, 1, FALSE, FALSE),
  (143, 111, 'Sí, temo que pueda hacerme daño grave', 3, 2, TRUE, FALSE),
  (144, 111, 'Sí, creo que estoy en peligro ahora', 4, 3, TRUE, TRUE);

COMMIT;
