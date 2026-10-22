-- Aplicar una vez a instalaciones anteriores. Ejecutar como administrador MySQL.
USE redlila;

CREATE TABLE IF NOT EXISTS estadisticas_respuestas (
  opcion_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  cantidad BIGINT UNSIGNED NOT NULL DEFAULT 0,
  actualizada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_estadistica_opcion FOREIGN KEY (opcion_id) REFERENCES opciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

GRANT SELECT, INSERT, UPDATE ON redlila.estadisticas_respuestas TO 'redlila'@'127.0.0.1';
