-- Aplicar una sola vez sobre la instalación original de RedLila.
USE redlila;
ALTER TABLE lineas_ayuda
  ADD COLUMN canal ENUM('telefono','whatsapp') NOT NULL DEFAULT 'telefono' AFTER numero_marcacion,
  ADD COLUMN departamento VARCHAR(40) NOT NULL DEFAULT 'Nacional' AFTER alcance,
  ADD INDEX idx_lineas_departamento (departamento, activa);

UPDATE lineas_ayuda SET departamento = 'La Paz' WHERE id IN (3, 4);
UPDATE lineas_ayuda SET departamento = 'Cochabamba' WHERE id = 5;

INSERT INTO lineas_ayuda
  (id, institucion, telefono, numero_marcacion, canal, alcance, departamento, tipo_ayuda, fuente_url, verificada_en, orden) VALUES
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
