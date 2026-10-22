-- Aplicar una sola vez a instalaciones creadas antes de estas protecciones.
-- Las filas anteriores conservan solicitud_id NULL y no se modifican.
USE redlila;

ALTER TABLE versiones_quiz
  ADD COLUMN umbral_amarillo SMALLINT UNSIGNED NOT NULL DEFAULT 3 AFTER publicada,
  ADD COLUMN umbral_naranja SMALLINT UNSIGNED NOT NULL DEFAULT 7 AFTER umbral_amarillo,
  ADD COLUMN umbral_rojo SMALLINT UNSIGNED NOT NULL DEFAULT 12 AFTER umbral_naranja;

ALTER TABLE resultados_quiz
  ADD COLUMN alerta_critica BOOLEAN NOT NULL DEFAULT FALSE AFTER nivel,
  ADD COLUMN solicitud_id CHAR(36) NULL AFTER alerta_critica,
  ADD UNIQUE KEY uq_resultado_solicitud (solicitud_id);
