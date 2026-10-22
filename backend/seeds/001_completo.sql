-- Ejecutar una vez en MySQL 8. Los teléfonos son contactos publicados por
-- instituciones; comprobar su vigencia operativa antes de publicar la web.
CREATE DATABASE IF NOT EXISTS redlila CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE redlila;

CREATE TABLE IF NOT EXISTS versiones_quiz (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  publicada BOOLEAN NOT NULL DEFAULT FALSE,
  umbral_amarillo SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  umbral_naranja SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  umbral_rojo SMALLINT UNSIGNED NOT NULL DEFAULT 12,
  creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS preguntas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  version_quiz_id BIGINT UNSIGNED NOT NULL,
  enunciado VARCHAR(500) NOT NULL,
  categoria VARCHAR(32) NOT NULL DEFAULT 'general',
  orden SMALLINT UNSIGNED NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_pregunta_version FOREIGN KEY (version_quiz_id) REFERENCES versiones_quiz(id),
  UNIQUE KEY uq_pregunta_orden (version_quiz_id, orden),
  INDEX idx_preguntas_activas (version_quiz_id, activa, orden)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS opciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pregunta_id BIGINT UNSIGNED NOT NULL,
  texto VARCHAR(300) NOT NULL,
  orden TINYINT UNSIGNED NOT NULL,
  puntaje TINYINT UNSIGNED NOT NULL,
  alerta_critica BOOLEAN NOT NULL DEFAULT FALSE,
  alerta_inmediata BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_opcion_pregunta FOREIGN KEY (pregunta_id) REFERENCES preguntas(id),
  CONSTRAINT chk_puntaje CHECK (puntaje BETWEEN 0 AND 3),
  UNIQUE KEY uq_opcion_orden (pregunta_id, orden)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resultados_quiz (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  version_quiz_id BIGINT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  puntaje SMALLINT UNSIGNED NOT NULL,
  nivel ENUM('verde','amarillo','naranja','rojo') NOT NULL,
  alerta_critica BOOLEAN NOT NULL DEFAULT FALSE,
  solicitud_id CHAR(36) NULL,
  CONSTRAINT fk_resultado_version FOREIGN KEY (version_quiz_id) REFERENCES versiones_quiz(id),
  INDEX idx_resultados_fecha_nivel (fecha, nivel),
  UNIQUE KEY uq_resultado_solicitud (solicitud_id)
) ENGINE=InnoDB;

-- Acumula elecciones por opción sin guardar el conjunto de respuestas de una usuaria.
CREATE TABLE IF NOT EXISTS estadisticas_respuestas (
  opcion_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  cantidad BIGINT UNSIGNED NOT NULL DEFAULT 0,
  actualizada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_estadistica_opcion FOREIGN KEY (opcion_id) REFERENCES opciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lineas_ayuda (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  institucion VARCHAR(120) NOT NULL,
  telefono VARCHAR(32) NOT NULL,
  numero_marcacion VARCHAR(32) NOT NULL,
  canal ENUM('telefono','whatsapp') NOT NULL DEFAULT 'telefono',
  alcance VARCHAR(100) NOT NULL,
  departamento VARCHAR(40) NOT NULL DEFAULT 'Nacional',
  tipo_ayuda VARCHAR(150) NOT NULL,
  fuente_url VARCHAR(500) NOT NULL,
  verificada_en DATE NOT NULL,
  orden SMALLINT UNSIGNED NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX idx_lineas_activas (activa, orden),
  INDEX idx_lineas_departamento (departamento, activa)
) ENGINE=InnoDB;

START TRANSACTION;
INSERT IGNORE INTO versiones_quiz
  (id, nombre, publicada, umbral_amarillo, umbral_naranja, umbral_rojo) VALUES
  (1, 'Violentómetro educativo personalizado, versión 2', TRUE, 4, 9, 16);

-- Señales educativas organizadas por categoría para explicar el resultado.
INSERT IGNORE INTO preguntas (id, version_quiz_id, enunciado, categoria, orden) VALUES
  (1, 1, '¿Tu pareja o alguien cercano revisa tu teléfono, mensajes o redes sin tu consentimiento?', 'digital', 1),
  (2, 1, '¿Te humilla, ridiculiza o hace comentarios que te hacen sentir inferior?', 'psicologica', 2),
  (3, 1, '¿Intenta alejarte de amistades, familiares o personas de apoyo?', 'aislamiento', 3),
  (4, 1, '¿Controla tus salidas, estudios, actividades o decisiones personales?', 'autonomia', 4),
  (5, 1, '¿Te presiona o fuerza a realizar actos sexuales que no deseas?', 'sexual', 5),
  (6, 1, '¿Te amenaza con hacerte daño a ti, a otras personas o a sí misma si no haces lo que quiere?', 'amenazas', 6),
  (7, 1, '¿Te ha empujado, golpeado, pateado o causado alguna lesión física?', 'fisica', 7),
  (8, 1, '¿Controla tus ingresos, te quita dinero, te impide trabajar o daña tus pertenencias?', 'economica', 8),
  (9, 1, '¿Las conductas que te preocupan han aumentado en frecuencia o intensidad recientemente?', 'escalamiento', 9),
  (10, 1, '¿Te ha sujetado del cuello, intentado asfixiarte o amenazado con un arma?', 'peligro_grave', 10),
  (11, 1, '¿Sientes miedo de que pueda hacerte daño grave o crees que estás en peligro ahora?', 'peligro_actual', 11);

INSERT IGNORE INTO opciones
  (id, pregunta_id, texto, orden, puntaje, alerta_critica, alerta_inmediata) VALUES
  (1, 1, 'Nunca', 1, 0, FALSE, FALSE), (2, 1, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (3, 1, 'Ocurre a veces', 3, 2, FALSE, FALSE), (4, 1, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (5, 2, 'Nunca', 1, 0, FALSE, FALSE), (6, 2, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (7, 2, 'Ocurre a veces', 3, 2, FALSE, FALSE), (8, 2, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (9, 3, 'Nunca', 1, 0, FALSE, FALSE), (10, 3, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (11, 3, 'Ocurre a veces', 3, 2, FALSE, FALSE), (12, 3, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (13, 4, 'Nunca', 1, 0, FALSE, FALSE), (14, 4, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (15, 4, 'Ocurre a veces', 3, 2, FALSE, FALSE), (16, 4, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (17, 5, 'Nunca', 1, 0, FALSE, FALSE), (18, 5, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (19, 5, 'Ocurre a veces', 3, 2, TRUE, FALSE), (20, 5, 'Ocurre con frecuencia', 4, 3, TRUE, FALSE),
  (21, 6, 'Nunca', 1, 0, FALSE, FALSE), (22, 6, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (23, 6, 'Ocurre a veces', 3, 2, TRUE, FALSE), (24, 6, 'Ocurre con frecuencia', 4, 3, TRUE, FALSE),
  (25, 7, 'Nunca', 1, 0, FALSE, FALSE), (26, 7, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (27, 7, 'Ocurre a veces', 3, 2, TRUE, FALSE), (28, 7, 'Ocurre con frecuencia', 4, 3, TRUE, FALSE),
  (29, 8, 'Nunca', 1, 0, FALSE, FALSE), (30, 8, 'Ocurrió una vez', 2, 1, FALSE, FALSE),
  (31, 8, 'Ocurre a veces', 3, 2, FALSE, FALSE), (32, 8, 'Ocurre con frecuencia', 4, 3, FALSE, FALSE),
  (33, 9, 'No han aumentado', 1, 0, FALSE, FALSE), (34, 9, 'Aumentaron un poco', 2, 1, FALSE, FALSE),
  (35, 9, 'Aumentaron claramente', 3, 2, FALSE, FALSE), (36, 9, 'Aumentaron mucho o muy rápido', 4, 3, FALSE, FALSE),
  (37, 10, 'Nunca', 1, 0, FALSE, FALSE), (38, 10, 'Ocurrió una vez', 2, 1, TRUE, FALSE),
  (39, 10, 'Ocurrió más de una vez', 3, 2, TRUE, FALSE), (40, 10, 'Ocurrió recientemente o con frecuencia', 4, 3, TRUE, FALSE),
  (41, 11, 'No siento ese peligro', 1, 0, FALSE, FALSE), (42, 11, 'A veces me preocupa', 2, 1, FALSE, FALSE),
  (43, 11, 'Sí, temo que pueda hacerme daño grave', 3, 2, TRUE, FALSE),
  (44, 11, 'Sí, creo que estoy en peligro ahora', 4, 3, TRUE, TRUE);

-- verificada_en indica consulta de la fuente en línea, no prueba de llamada.
INSERT IGNORE INTO lineas_ayuda
  (id, institucion, telefono, numero_marcacion, canal, alcance, departamento, tipo_ayuda, fuente_url, verificada_en, orden) VALUES
  (1, 'Policía Boliviana', '110', '110', 'telefono', 'Bolivia', 'Nacional', 'Emergencias policiales',
   'https://www.policia.bo/', '2026-10-20', 1),
  (2, 'FELCV', '800 14 0348', '800140348', 'telefono', 'Bolivia', 'Nacional', 'Denuncias de violencia',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 2),
  (3, 'SLIM / PAIF La Paz', '156', '156', 'telefono', 'Municipio de La Paz', 'La Paz', 'Atención municipal de emergencia por violencia, 24 horas',
   'https://lapaz.bo/paif-de-emergencia-linea-156/', '2026-10-20', 3),
  (4, 'SLIM / PAIF La Paz', '800 10 4100', '800104100', 'telefono', 'Municipio de La Paz', 'La Paz', 'Atención municipal de emergencia por violencia, 24 horas',
   'https://lapaz.bo/paif-de-emergencia-linea-156/', '2026-10-20', 4),
  (5, 'SLIM Cochabamba', '71742126', '71742126', 'telefono', 'Municipio de Cochabamba', 'Cochabamba', 'Línea de emergencia del SLIM municipal',
   'https://observatorioviolencia.cochabamba.bo/servicios', '2026-10-20', 5),
  (6, 'FELCV Chuquisaca', '72042698', '72042698', 'whatsapp', 'Departamento de Chuquisaca', 'Chuquisaca', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 6),
  (7, 'FELCV Cochabamba', '71270447', '71270447', 'whatsapp', 'Eje Sur de Cochabamba', 'Cochabamba', 'Contacto regional FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 7),
  (8, 'FELCV Oruro', '62805818', '62805818', 'whatsapp', 'Departamento de Oruro', 'Oruro', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 8),
  (9, 'FELCV Potosí', '72042570', '72042570', 'whatsapp', 'Departamento de Potosí', 'Potosí', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 9),
  (10, 'FELCV Tarija', '78241690', '78241690', 'whatsapp', 'Departamento de Tarija', 'Tarija', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 10),
  (11, 'FELCV Santa Cruz', '72042264', '72042264', 'whatsapp', 'Departamento de Santa Cruz', 'Santa Cruz', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 11),
  (12, 'FELCV Beni', '72042709', '72042709', 'whatsapp', 'Departamento de Beni', 'Beni', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 12),
  (13, 'FELCV Pando', '72042740', '72042740', 'whatsapp', 'Departamento de Pando', 'Pando', 'Contacto departamental FELCV por WhatsApp',
   'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf', '2026-10-20', 13);
COMMIT;
