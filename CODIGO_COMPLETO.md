# RedLila — código fuente completo

Archivos de código, documentación y configuración de ejemplo. Se excluyen credenciales, imágenes binarias, runtime, dependencias y compilados.

## backend/.env.example

```text
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=redlila
DB_PASSWORD=cambia_esta_clave
DB_NAME=redlila
CORS_ORIGIN=http://localhost:5173
# Si Nginx conecta desde este mismo equipo, usa TRUST_PROXY=loopback.
TRUST_PROXY=
SERVE_FRONTEND=false
# Solo durante el primer despliegue sobre una base vacía.
INIT_DB=false
```

## backend/package.json

```json
{
  "name": "redlila-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/app.js",
    "start": "node src/app.js",
    "setup:local-db": "node scripts/setup-local-db.js",
    "migrate:local-004": "node scripts/migrate-local-004.js",
    "migrate:local-005": "node scripts/migrate-local-005.js",
    "smoke:local": "node scripts/smoke-local.js",
    "test": "node --test"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.21.2",
    "mysql2": "^3.14.3"
  },
  "engines": { "node": ">=20" }
}
```

## backend/scripts/init-production-db.js

```js
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbConfig } from '../src/db/pool.js';

// La instancia MySQL administrada ya crea la base. El esquema y las semillas
// se cargan en esa base, sin necesitar permiso CREATE DATABASE.
export async function inicializarBaseProduccion() {
  const ruta = fileURLToPath(new URL('../seeds/001_completo.sql', import.meta.url));
  const contenido = await readFile(ruta, 'utf8');
  const sql = contenido
    .replace(/^CREATE DATABASE IF NOT EXISTS redlila[^;]*;\s*/m, '')
    .replace(/^USE redlila;\s*/m, '');

  const conexion = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
  try {
    await conexion.query(sql);
    console.log('Esquema y datos iniciales de RedLila verificados.');
  } finally {
    await conexion.end();
  }
}
```

## backend/scripts/migrate-local-004.js

```js
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const password = (await readFile(new URL('../../runtime/mysql-root-password.txt', import.meta.url), 'utf8')).trim();
const sql = await readFile(new URL('../seeds/004_protecciones.sql', import.meta.url), 'utf8');
const connection = await mysql.createConnection({
  host: '127.0.0.1', port: 3306, user: 'root', password,
  database: 'redlila', multipleStatements: true
});

try {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'redlila' AND
      ((TABLE_NAME = 'versiones_quiz' AND COLUMN_NAME = 'umbral_amarillo') OR
       (TABLE_NAME = 'resultados_quiz' AND COLUMN_NAME = 'solicitud_id'))`
  );
  if (rows.length === 2) {
    console.log('Migración 004 ya aplicada.');
  } else if (rows.length !== 0) {
    throw new Error('Migración 004 parcialmente aplicada; revisar el esquema antes de continuar.');
  } else {
    await connection.query(sql);
    console.log('Migración 004 aplicada.');
  }
} finally {
  await connection.end();
}
```

## backend/scripts/migrate-local-005.js

```js
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const password = (await readFile(new URL('../../runtime/mysql-root-password.txt', import.meta.url), 'utf8')).trim();
const sql = await readFile(new URL('../seeds/005_orientacion_personalizada.sql', import.meta.url), 'utf8');
const connection = await mysql.createConnection({
  host: '127.0.0.1', port: 3306, user: 'root', password,
  database: 'redlila', multipleStatements: true
});

try {
  const [columns] = await connection.query(
    `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'redlila' AND
      ((TABLE_NAME = 'preguntas' AND COLUMN_NAME = 'categoria') OR
       (TABLE_NAME = 'opciones' AND COLUMN_NAME = 'alerta_inmediata'))`
  );
  const [versions] = await connection.query('SELECT id FROM versiones_quiz WHERE id = 2');
  if (columns.length === 2 && versions.length === 1) {
    console.log('Migración 005 ya aplicada.');
  } else if (columns.length !== 0 || versions.length !== 0) {
    throw new Error('Migración 005 parcialmente aplicada; revisar el esquema antes de continuar.');
  } else {
    await connection.query(sql);
    console.log('Migración 005 aplicada.');
  }
} finally {
  await connection.end();
}
```

## backend/scripts/setup-local-db.js

```js
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.resolve(backend, '..');
const envPath = path.join(backend, '.env');
const rootSecretPath = path.join(project, 'runtime', 'mysql-root-password.txt');

try {
  await access(envPath);
  throw new Error('backend/.env ya existe; se evita sobrescribir credenciales.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const sql = await readFile(path.join(backend, 'seeds', '001_completo.sql'), 'utf8');
const connection = await mysql.createConnection({
  host: '127.0.0.1', port: 3306, user: 'root', password: '',
  charset: 'utf8mb4', multipleStatements: true
});

try {
  await connection.query(sql);
  const appPassword = randomBytes(30).toString('base64url');
  const rootPassword = randomBytes(30).toString('base64url');

  await connection.query("CREATE USER 'redlila'@'127.0.0.1' IDENTIFIED BY ?", [appPassword]);
  await connection.query("GRANT SELECT ON redlila.* TO 'redlila'@'127.0.0.1'");
  await connection.query("GRANT INSERT ON redlila.resultados_quiz TO 'redlila'@'127.0.0.1'");
  await connection.query("GRANT INSERT, UPDATE ON redlila.estadisticas_respuestas TO 'redlila'@'127.0.0.1'");

  await writeFile(envPath, [
    'PORT=3001', 'DB_HOST=127.0.0.1', 'DB_PORT=3306',
    'DB_USER=redlila', `DB_PASSWORD=${appPassword}`, 'DB_NAME=redlila',
    'CORS_ORIGIN=http://localhost:5173', ''
  ].join('\n'), { flag: 'wx' });
  await writeFile(rootSecretPath, `${rootPassword}\n`, { flag: 'wx' });
  await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [rootPassword]);
  console.log('Base RedLila cargada y cuenta de aplicación configurada.');
  console.log('Las credenciales se guardaron en archivos locales ignorados por Git.');
} finally {
  await connection.end();
}
```

## backend/scripts/smoke-local.js

```js
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:5173';
const rootPassword = (await readFile(new URL('../../runtime/mysql-root-password.txt', import.meta.url), 'utf8')).trim();
const admin = await mysql.createConnection({
  host: '127.0.0.1', port: 3306, user: 'root', password: rootPassword, database: 'redlila'
});
const solicitudes = new Map();

async function json(ruta, opciones) {
  const respuesta = await fetch(base + ruta, opciones);
  const datos = await respuesta.json();
  assert.equal(respuesta.status, 200, `${ruta}: ${JSON.stringify(datos)}`);
  return datos;
}

async function limpiarIntentos() {
  if (!solicitudes.size) return;
  const ids = [...solicitudes.keys()];
  const [registros] = await admin.query(
    `SELECT id, solicitud_id AS solicitudId FROM resultados_quiz
      WHERE solicitud_id IN (${ids.map(() => '?').join(',')})`, ids
  );
  const cantidades = new Map();
  for (const registro of registros) {
    for (const opcionId of solicitudes.get(registro.solicitudId)) {
      cantidades.set(opcionId, (cantidades.get(opcionId) || 0) + 1);
    }
  }
  await admin.beginTransaction();
  try {
    for (const [opcionId, cantidad] of cantidades) {
      const [actualizado] = await admin.query(
        `UPDATE estadisticas_respuestas SET cantidad = cantidad - ?
          WHERE opcion_id = ? AND cantidad >= ?`, [cantidad, opcionId, cantidad]
      );
      assert.equal(actualizado.affectedRows, 1, 'No se pudo revertir una estadística de prueba.');
    }
    if (registros.length) {
      const [borrado] = await admin.query(
        `DELETE FROM resultados_quiz WHERE id IN (${registros.map(() => '?').join(',')})`,
        registros.map(registro => registro.id)
      );
      assert.equal(borrado.affectedRows, registros.length);
    }
    await admin.commit();
  } catch (error) {
    await admin.rollback();
    throw error;
  }
}

try {
  const salud = await json('/api/salud');
  assert.equal(salud.estado, 'ok');

  const quiz = await json('/api/quiz/preguntas');
  assert.equal(quiz.preguntas.length, 11);
  assert.deepEqual(Object.keys(quiz.preguntas[0].opciones[0]).sort(), ['id', 'texto']);

  const ayuda = await json('/api/ayuda');
  assert.equal(ayuda.lineas.length, 13);
  assert.equal(new Set(ayuda.lineas.filter(linea => linea.departamento !== 'Nacional').map(linea => linea.departamento)).size, 9);

  const normales = quiz.preguntas.map(pregunta => pregunta.opciones[0].id);
  const atencion = [...normales];
  atencion[0] = quiz.preguntas[0].opciones[3].id;
  atencion[1] = quiz.preguntas[1].opciones[1].id;
  const riesgoAlto = [...normales];
  riesgoAlto[0] = quiz.preguntas[0].opciones[3].id;
  riesgoAlto[1] = quiz.preguntas[1].opciones[3].id;
  riesgoAlto[2] = quiz.preguntas[2].opciones[3].id;
  const critica = [...normales];
  critica[4] = quiz.preguntas[4].opciones[1].id;
  const inmediata = [...normales];
  inmediata[10] = quiz.preguntas[10].opciones[3].id;
  const verdeId = randomUUID();
  const amarilloId = randomUUID();
  const naranjaId = randomUUID();
  const rojoId = randomUUID();
  const inmediatoId = randomUUID();
  solicitudes.set(verdeId, normales);
  solicitudes.set(amarilloId, atencion);
  solicitudes.set(naranjaId, riesgoAlto);
  solicitudes.set(rojoId, critica);
  solicitudes.set(inmediatoId, inmediata);
  const enviar = (opcionIds, solicitudId) => json('/api/quiz/resultados', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionId: quiz.version.id, opcionIds, solicitudId })
  });

  const verde = await enviar(normales, verdeId);
  const amarillo = await enviar(atencion, amarilloId);
  const naranja = await enviar(riesgoAlto, naranjaId);
  const rojo = await enviar(critica, rojoId);
  const inmediato = await enviar(inmediata, inmediatoId);
  const repetido = await enviar(normales, verdeId);
  assert.equal(verde.nivel, 'verde');
  assert.equal(amarillo.nivel, 'amarillo');
  assert.equal(naranja.nivel, 'naranja');
  assert.equal(rojo.nivel, 'rojo');
  assert.equal(rojo.alertaCritica, true);
  assert.match(rojo.orientacion.titulo, /presión sexual/i);
  assert.match(rojo.orientacion.motivo, /Ocurrió una vez/i);
  assert.equal(rojo.orientacion.senales[0].categoria, 'sexual');
  assert.ok(rojo.orientacion.recomendaciones.length >= 2);
  assert.equal(inmediato.nivel, 'rojo');
  assert.equal(inmediato.emergenciaInmediata, true);
  assert.notEqual(inmediato.orientacion.titulo, rojo.orientacion.titulo);
  assert.match(inmediato.orientacion.titulo, /peligro ahora/i);
  assert.match(inmediato.orientacion.recomendaciones[0].texto, /110/);
  assert.deepEqual(repetido, verde, 'El reintento debe devolver el mismo resultado.');
  const [[{ cantidad }]] = await admin.query(
    'SELECT COUNT(*) AS cantidad FROM resultados_quiz WHERE solicitud_id IN (?, ?, ?, ?, ?)',
    [verdeId, amarilloId, naranjaId, rojoId, inmediatoId]
  );
  assert.equal(cantidad, 5, 'El reintento no debe crear otro resultado.');
  console.log('Flujo completo verificado: cuatro niveles, peligro actual, MySQL e idempotencia.');
} finally {
  try { await limpiarIntentos(); }
  finally { await admin.end(); }
}
```

## backend/seeds/001_completo.sql

```sql
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
```

## backend/seeds/002_departamentos.sql

```sql
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
```

## backend/seeds/003_estadisticas_respuestas.sql

```sql
-- Aplicar una vez a instalaciones anteriores. Ejecutar como administrador MySQL.
USE redlila;

CREATE TABLE IF NOT EXISTS estadisticas_respuestas (
  opcion_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  cantidad BIGINT UNSIGNED NOT NULL DEFAULT 0,
  actualizada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_estadistica_opcion FOREIGN KEY (opcion_id) REFERENCES opciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

GRANT SELECT, INSERT, UPDATE ON redlila.estadisticas_respuestas TO 'redlila'@'127.0.0.1';
```

## backend/seeds/004_protecciones.sql

```sql
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
```

## backend/seeds/005_orientacion_personalizada.sql

```sql
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
```

## backend/src/app.js

```js
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
```

## backend/src/db/pool.js

```js
import 'dotenv/config';
import mysql from 'mysql2/promise';

// Un pool evita abrir una conexión nueva por cada solicitud.
export const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'redlila',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'redlila',
  charset: 'utf8mb4'
};

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 30,
  connectTimeout: 5000
});
```

## backend/src/middleware/limite-resultados.js

```js
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
```

## backend/src/repositories/ayuda.repository.js

```js
import { pool } from '../db/pool.js';

export async function obtenerLineasActivas() {
  const [rows] = await pool.execute(
    `SELECT id, institucion, telefono, numero_marcacion AS numeroMarcacion,
            canal, alcance, departamento, tipo_ayuda AS tipoAyuda, fuente_url AS fuenteUrl,
            DATE_FORMAT(verificada_en, '%Y-%m-%d') AS verificadaEn
       FROM lineas_ayuda
      WHERE activa = 1
      ORDER BY orden, institucion`,
  );
  return rows;
}
```

## backend/src/repositories/quiz.repository.js

```js
import { pool } from '../db/pool.js';

export async function obtenerVersionPublicada() {
  const [rows] = await pool.execute(
    `SELECT id, nombre, umbral_amarillo AS umbralAmarillo,
            umbral_naranja AS umbralNaranja, umbral_rojo AS umbralRojo
       FROM versiones_quiz WHERE publicada = 1 ORDER BY id DESC LIMIT 1`
  );
  return rows[0] || null;
}

export async function obtenerVersionPublicadaPorId(id) {
  const [rows] = await pool.execute(
    `SELECT id, nombre, umbral_amarillo AS umbralAmarillo,
            umbral_naranja AS umbralNaranja, umbral_rojo AS umbralRojo
       FROM versiones_quiz WHERE id = ? AND publicada = 1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function obtenerPreguntas(versionId) {
  const [rows] = await pool.execute(
    `SELECT id, enunciado, categoria, orden
       FROM preguntas
      WHERE version_quiz_id = ? AND activa = 1
      ORDER BY orden, id`,
    [versionId]
  );
  return rows;
}

export async function obtenerOpciones(versionId) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.pregunta_id AS preguntaId, o.texto, o.orden,
            o.puntaje, o.alerta_critica AS alertaCritica,
            o.alerta_inmediata AS alertaInmediata
       FROM opciones o
       JOIN preguntas p ON p.id = o.pregunta_id
      WHERE p.version_quiz_id = ? AND p.activa = 1
      ORDER BY p.orden, o.orden, o.id`,
    [versionId]
  );
  return rows;
}

async function obtenerPorSolicitud(solicitudId) {
  const [rows] = await pool.execute(
    `SELECT puntaje, nivel, alerta_critica AS alertaCritica
       FROM resultados_quiz WHERE solicitud_id = ? LIMIT 1`, [solicitudId]
  );
  const fila = rows[0];
  return fila ? { puntaje: fila.puntaje, nivel: fila.nivel, alertaCritica: Boolean(fila.alertaCritica) } : null;
}

export async function guardarEvaluacion({ versionId, puntaje, nivel, alertaCritica, opcionIds, solicitudId }) {
  // La clave aleatoria identifica un intento, sin conservar respuestas individuales.
  const existente = await obtenerPorSolicitud(solicitudId);
  if (existente) return existente;
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.execute(
      `INSERT INTO resultados_quiz
         (version_quiz_id, fecha, puntaje, nivel, alerta_critica, solicitud_id)
       VALUES (?, CURRENT_DATE(), ?, ?, ?, ?)`,
      [versionId, puntaje, nivel, alertaCritica, solicitudId]
    );
    for (const opcionId of opcionIds) {
      await conexion.execute(
        `INSERT INTO estadisticas_respuestas (opcion_id, cantidad)
         VALUES (?, 1)
         ON DUPLICATE KEY UPDATE cantidad = cantidad + 1`,
        [opcionId]
      );
    }
    await conexion.commit();
    return { puntaje, nivel, alertaCritica };
  } catch (error) {
    await conexion.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const repetida = await obtenerPorSolicitud(solicitudId);
      if (repetida) return repetida;
    }
    throw error;
  } finally {
    conexion.release();
  }
}
```

## backend/src/routes/ayuda.routes.js

```js
import { Router } from 'express';
import { obtenerLineasActivas } from '../repositories/ayuda.repository.js';

export const ayudaRouter = Router();

ayudaRouter.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ lineas: await obtenerLineasActivas() });
  } catch (error) { next(error); }
});
```

## backend/src/routes/quiz.routes.js

```js
import { Router } from 'express';
import {
  obtenerOpciones,
  obtenerPreguntas,
  obtenerVersionPublicada
} from '../repositories/quiz.repository.js';
import { contenidoValido, evaluar } from '../services/evaluacion.service.js';
import { limitarResultados } from '../middleware/limite-resultados.js';

export const quizRouter = Router();

quizRouter.get('/preguntas', async (req, res, next) => {
  try {
    const version = await obtenerVersionPublicada();
    if (!version) return res.status(503).json({ error: 'El quiz aún no está disponible.' });
    const [preguntas, opciones] = await Promise.all([
      obtenerPreguntas(version.id), obtenerOpciones(version.id)
    ]);
    if (!contenidoValido(version, preguntas, opciones)) {
      return res.status(503).json({ error: 'El quiz aún no está disponible.' });
    }
    const items = preguntas.map(pregunta => ({
      id: pregunta.id,
      enunciado: pregunta.enunciado,
      opciones: opciones
        .filter(opcion => opcion.preguntaId === pregunta.id)
        .map(({ id, texto }) => ({ id, texto }))
    }));
    res.set('Cache-Control', 'no-store');
    res.json({ version: { id: version.id, nombre: version.nombre }, preguntas: items });
  } catch (error) { next(error); }
});

quizRouter.post('/resultados', limitarResultados, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await evaluar(req.body || {}));
  } catch (error) { next(error); }
});
```

## backend/src/services/evaluacion.service.js

```js
import {
  guardarEvaluacion,
  obtenerOpciones,
  obtenerPreguntas,
  obtenerVersionPublicadaPorId
} from '../repositories/quiz.repository.js';

export class ErrorValidacion extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const CATALOGO_SENALES = {
  digital: {
    titulo: 'Control digital',
    descripcion: 'Revisar mensajes, contraseñas o redes sin permiso puede limitar tu privacidad y autonomía.',
    recomendacion: 'Si es seguro, revisa tus contraseñas desde un dispositivo de confianza y evita guardar información sensible donde otra persona pueda verla.'
  },
  psicologica: {
    titulo: 'Violencia psicológica',
    descripcion: 'Las humillaciones, burlas e insultos pueden afectar tu bienestar y no son una parte normal de una relación respetuosa.',
    recomendacion: 'Hablar con una persona que te escuche sin juzgar puede ayudarte a reconocer el patrón y pensar qué apoyo deseas.'
  },
  aislamiento: {
    titulo: 'Aislamiento',
    descripcion: 'Alejarte de amistades o familiares puede reducir tus redes de apoyo y aumentar el control sobre tus decisiones.',
    recomendacion: 'Si puedes hacerlo con seguridad, mantén contacto con una persona de confianza y acuerden una forma discreta de pedir ayuda.'
  },
  autonomia: {
    titulo: 'Control de tu autonomía',
    descripcion: 'Controlar tus salidas, estudios o decisiones personales afecta tu libertad.',
    recomendacion: 'Recuerda que tienes derecho a tomar decisiones sobre tu vida. Puedes pedir orientación antes de decidir cualquier paso.'
  },
  sexual: {
    titulo: 'Violencia sexual',
    descripcion: 'Toda actividad sexual requiere consentimiento libre. Una relación previa nunca reemplaza tu consentimiento.',
    recomendacion: 'Busca atención especializada cuando te resulte seguro. Puedes pedir acompañamiento a una persona de confianza.'
  },
  amenazas: {
    titulo: 'Amenazas',
    descripcion: 'Amenazar con hacer daño busca causar miedo y controlar tus decisiones; es una señal de alto riesgo.',
    recomendacion: 'Evita confrontar a quien amenaza. Considera contactar un servicio especializado desde un lugar o dispositivo seguro.'
  },
  fisica: {
    titulo: 'Violencia física',
    descripcion: 'Empujones, golpes o lesiones son violencia aunque hayan ocurrido una sola vez.',
    recomendacion: 'Prioriza tu seguridad y busca atención o apoyo especializado. Si existe peligro inmediato, llama a emergencias.'
  },
  economica: {
    titulo: 'Violencia económica o patrimonial',
    descripcion: 'Controlar tu dinero, impedirte trabajar o dañar tus pertenencias puede limitar tu independencia.',
    recomendacion: 'Si no aumenta el riesgo, conserva documentos y contactos importantes en un lugar seguro y consulta un SLIM sobre tus opciones.'
  },
  escalamiento: {
    titulo: 'Aumento de las conductas',
    descripcion: 'Que las conductas sean más frecuentes o intensas puede indicar que el riesgo está aumentando.',
    recomendacion: 'No esperes a que la situación empeore para pedir orientación. Piensa con alguien de confianza en una forma segura de comunicarte.'
  },
  peligro_grave: {
    titulo: 'Señal de peligro grave',
    descripcion: 'La asfixia, la sujeción del cuello o las amenazas con armas requieren atención urgente.',
    recomendacion: 'Busca un lugar seguro y apoyo especializado. Si el peligro es inmediato, llama al 110 o a la FELCV.'
  },
  peligro_actual: {
    titulo: 'Temor por tu seguridad',
    descripcion: 'Sentir miedo de sufrir daño grave es una señal importante y merece ser tomada en serio.',
    recomendacion: 'Confía en tu percepción del riesgo. Si puedes hacerlo sin exponerte más, ve a un lugar seguro y pide ayuda.'
  }
};

function intensidad(puntaje) {
  if (puntaje >= 3) return 'Frecuente o intensa';
  if (puntaje === 2) return 'Repetida';
  return 'Identificada';
}

const PRIORIDAD = {
  peligro_actual: 11, peligro_grave: 10, sexual: 9, fisica: 8,
  amenazas: 7, escalamiento: 6, aislamiento: 5, digital: 4,
  economica: 3, psicologica: 2, autonomia: 1
};

const NOMBRES = {
  digital: 'control digital', psicologica: 'humillaciones', aislamiento: 'aislamiento',
  autonomia: 'control de tus decisiones', sexual: 'presión o coerción sexual',
  amenazas: 'amenazas', fisica: 'agresión física', economica: 'control económico',
  escalamiento: 'un aumento de las conductas',
  peligro_grave: 'una situación con asfixia, sujeción del cuello o armas',
  peligro_actual: 'temor por tu seguridad'
};

const TITULOS_CRITICOS = {
  sexual: 'La presión sexual que mencionaste requiere apoyo',
  amenazas: 'Las amenazas que mencionaste requieren atención',
  fisica: 'La agresión física que mencionaste merece apoyo',
  peligro_grave: 'Mencionaste una situación de peligro grave',
  peligro_actual: 'Dijiste que temes sufrir un daño grave'
};

function enumerar(items) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

export function construirOrientacion(selecciones, nivel, emergenciaInmediata = false) {
  const principales = [...selecciones]
    .filter(seleccion => seleccion.puntaje > 0 && CATALOGO_SENALES[seleccion.categoria])
    .sort((a, b) => Number(b.alertaInmediata) - Number(a.alertaInmediata) ||
      Number(b.alertaCritica) - Number(a.alertaCritica) ||
      (PRIORIDAD[b.categoria] || 0) - (PRIORIDAD[a.categoria] || 0) || b.puntaje - a.puntaje);
  const criticas = principales.filter(seleccion => seleccion.alertaCritica);
  const repetidas = principales.filter(seleccion => seleccion.puntaje >= 2);
  const nombres = principales.slice(0, 2).map(seleccion => NOMBRES[seleccion.categoria]);
  const adicionales = Math.max(0, principales.length - 2);
  const vistas = new Set();
  const senales = [];
  for (const seleccion of principales) {
    if (vistas.has(seleccion.categoria)) continue;
    vistas.add(seleccion.categoria);
    const contenido = CATALOGO_SENALES[seleccion.categoria];
    senales.push({
      categoria: seleccion.categoria,
      titulo: contenido.titulo,
      intensidad: intensidad(seleccion.puntaje),
      descripcion: contenido.descripcion
    });
    if (senales.length === 4) break;
  }

  let titulo;
  let resumen;
  let motivo;
  if (emergenciaInmediata) {
    titulo = 'Dijiste que podrías estar en peligro ahora';
    resumen = principales.length > 1
      ? `También mencionaste ${enumerar(principales.slice(1, 3).map(item => NOMBRES[item.categoria]))}. Tu seguridad tiene prioridad.`
      : 'Tu respuesta indica que necesitas priorizar tu seguridad en este momento.';
    motivo = 'Elegiste la opción que indica peligro actual. Esa respuesta activa la orientación urgente, cualquiera que sea el puntaje de las otras preguntas.';
  } else if (nivel === 'rojo' && criticas.length > 1) {
    titulo = 'Mencionaste varias señales de alto riesgo';
    resumen = `Tus respuestas incluyen ${enumerar(criticas.slice(0, 2).map(item => NOMBRES[item.categoria]))}. Buscar apoyo especializado puede ayudarte a decidir próximos pasos seguros.`;
    motivo = `Se identificaron ${criticas.length} señales críticas en tus respuestas. Cada una merece atención, aunque haya ocurrido una sola vez.`;
  } else if (nivel === 'rojo' && criticas.length === 1) {
    const principal = criticas[0];
    titulo = TITULOS_CRITICOS[principal.categoria] || 'Mencionaste una señal de alto riesgo';
    resumen = principales.length > 1
      ? `Además mencionaste ${enumerar(principales.filter(item => item !== principal).slice(0, 2).map(item => NOMBRES[item.categoria]))}. Mereces orientación y apoyo sin juicios.`
      : `${CATALOGO_SENALES[principal.categoria].descripcion} Mereces orientación y apoyo sin juicios.`;
    motivo = `La respuesta «${principal.texto}» en la pregunta sobre ${NOMBRES[principal.categoria]} activa este nivel aunque el puntaje total sea bajo.`;
  } else if (nivel === 'rojo') {
    titulo = 'Varias conductas frecuentes merecen apoyo';
    resumen = `Mencionaste ${enumerar(nombres)}${adicionales ? ` y ${adicionales} señal${adicionales === 1 ? '' : 'es'} más` : ''}. Considera buscar orientación especializada desde un lugar seguro.`;
    motivo = 'La combinación y frecuencia de las conductas seleccionadas alcanzó el nivel más alto de esta herramienta educativa.';
  } else if (nivel === 'naranja') {
    titulo = `Se repiten señales de ${enumerar(nombres)}`;
    resumen = `Mencionaste ${principales.length} señal${principales.length === 1 ? '' : 'es'}; ${repetidas.length} de ellas se repiten o son intensas. Buscar apoyo cercano puede ayudarte a pensar con calma en tu seguridad.`;
    motivo = 'La suma y frecuencia de las conductas seleccionadas sitúa este resultado en el nivel de riesgo alto.';
  } else if (nivel === 'amarillo') {
    titulo = `Vale la pena prestar atención a ${enumerar(nombres)}`;
    resumen = `Mencionaste ${principales.length} señal${principales.length === 1 ? '' : 'es'} que pueden afectar tu bienestar o autonomía. Puedes buscar orientación sin esperar a que ocurran más veces.`;
    motivo = 'Las respuestas seleccionadas superan el umbral de atención de esta herramienta educativa.';
  } else if (principales.length) {
    titulo = `Mencionaste ${enumerar(nombres)}`;
    resumen = 'Aunque estas respuestas no alcanzan un umbral numérico, lo que te preocupa merece ser escuchado.';
    motivo = 'Una señal aislada puede quedar por debajo del primer umbral. El color no invalida tu experiencia ni determina tu seguridad.';
  } else {
    titulo = 'No identificamos señales en estas respuestas';
    resumen = 'Esto no descarta otras experiencias o preocupaciones. Puedes pedir orientación siempre que la necesites.';
    motivo = 'Todas las respuestas seleccionadas indicaron ausencia de las conductas preguntadas.';
  }

  const recomendaciones = [];
  if (emergenciaInmediata) {
    recomendaciones.push({
      titulo: 'Busca seguridad inmediata',
      texto: 'Si puedes hacerlo sin aumentar el riesgo, ve a un lugar seguro y llama al 110 o a la FELCV. Evita confrontar a quien te pone en peligro.'
    });
  } else if (nivel === 'rojo') {
    recomendaciones.push({
      titulo: 'Busca apoyo especializado pronto',
      texto: 'Contacta a la FELCV, un SLIM o una persona de confianza desde un lugar seguro. Evita confrontar a quien te pone en riesgo.'
    });
  } else if (nivel === 'naranja') {
    recomendaciones.push({
      titulo: 'Prepara una forma segura de pedir ayuda',
      texto: 'Considera hablar con alguien de confianza y consultar un servicio especializado. Tú decides qué paso tomar y cuándo hacerlo.'
    });
  } else if (nivel === 'amarillo') {
    recomendaciones.push({
      titulo: 'Observa las señales y busca orientación',
      texto: 'Reconocer si estas conductas se repiten puede ayudarte. Puedes conversar con alguien que respete tus decisiones.'
    });
  } else {
    recomendaciones.push({
      titulo: 'Mantén cerca tus redes de apoyo',
      texto: 'Infórmate sobre relaciones respetuosas y recuerda que puedes pedir orientación si algo te preocupa.'
    });
  }
  for (const seleccion of principales) {
    const contenido = CATALOGO_SENALES[seleccion.categoria];
    if (!contenido || (emergenciaInmediata && seleccion.categoria === 'peligro_actual') ||
        recomendaciones.some(item => item.texto === contenido.recomendacion)) continue;
    recomendaciones.push({ titulo: `Sobre ${contenido.titulo.toLowerCase()}`, texto: contenido.recomendacion });
    if (recomendaciones.length === 3) break;
  }
  return { titulo, resumen, motivo, senales, recomendaciones };
}

// Los umbrales pertenecen a cada versión publicada y requieren revisión al editar el quiz.
export function clasificar(puntaje, alertaCritica, umbrales = { amarillo: 3, naranja: 7, rojo: 12 }) {
  if (alertaCritica || puntaje >= umbrales.rojo) return 'rojo';
  if (puntaje >= umbrales.naranja) return 'naranja';
  if (puntaje >= umbrales.amarillo) return 'amarillo';
  return 'verde';
}

export function umbralesValidos(version, puntajeMaximo) {
  const { umbralAmarillo, umbralNaranja, umbralRojo } = version;
  return [umbralAmarillo, umbralNaranja, umbralRojo].every(Number.isSafeInteger) &&
    0 < umbralAmarillo && umbralAmarillo < umbralNaranja &&
    umbralNaranja < umbralRojo && umbralRojo <= puntajeMaximo;
}

export function contenidoValido(version, preguntas, opciones) {
  if (!preguntas.length) return false;
  const porPregunta = new Map();
  for (const opcion of opciones) {
    const lista = porPregunta.get(opcion.preguntaId) || [];
    lista.push(opcion);
    porPregunta.set(opcion.preguntaId, lista);
  }
  let puntajeMaximo = 0;
  for (const pregunta of preguntas) {
    const lista = porPregunta.get(pregunta.id) || [];
    if (typeof pregunta.categoria !== 'string' || !pregunta.categoria.trim() ||
        lista.length < 2 || lista.some(opcion =>
      !Number.isSafeInteger(opcion.puntaje) || opcion.puntaje < 0 || opcion.puntaje > 3)) return false;
    puntajeMaximo += Math.max(...lista.map(opcion => opcion.puntaje));
  }
  return umbralesValidos(version, puntajeMaximo);
}

export async function evaluar({ versionId, opcionIds, solicitudId }) {
  if (!Number.isSafeInteger(versionId) || versionId < 1 ||
      !Array.isArray(opcionIds) || opcionIds.length < 1 || opcionIds.length > 50 ||
      !opcionIds.every(id => Number.isSafeInteger(id) && id > 0) ||
      typeof solicitudId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitudId)) {
    throw new ErrorValidacion('Envía una versión y una opción válida por pregunta.');
  }

  const version = await obtenerVersionPublicadaPorId(versionId);
  if (!version) throw new ErrorValidacion('La versión del quiz ya no está disponible.');

  const [preguntas, opciones] = await Promise.all([
    obtenerPreguntas(versionId),
    obtenerOpciones(versionId)
  ]);
  if (!preguntas.length || !opciones.length) {
    const error = new Error('El quiz publicado no tiene contenido.');
    error.status = 503;
    throw error;
  }
  const umbrales = {
    amarillo: version.umbralAmarillo,
    naranja: version.umbralNaranja,
    rojo: version.umbralRojo
  };
  if (!contenidoValido(version, preguntas, opciones)) {
    const error = new Error('La versión publicada necesita opciones y umbrales válidos.');
    error.status = 503;
    throw error;
  }
  if (opcionIds.length !== preguntas.length || new Set(opcionIds).size !== opcionIds.length) {
    throw new ErrorValidacion('Responde cada pregunta exactamente una vez.');
  }

  const opcionesPorId = new Map(opciones.map(opcion => [opcion.id, opcion]));
  const preguntasPorId = new Map(preguntas.map(pregunta => [pregunta.id, pregunta]));
  const preguntasRespondidas = new Set();
  const selecciones = [];
  let puntaje = 0;
  let alertaCritica = false;
  let emergenciaInmediata = false;

  for (const id of opcionIds) {
    const opcion = opcionesPorId.get(id);
    if (!opcion || preguntasRespondidas.has(opcion.preguntaId)) {
      throw new ErrorValidacion('Las respuestas no corresponden al quiz publicado.');
    }
    preguntasRespondidas.add(opcion.preguntaId);
    puntaje += opcion.puntaje;
    alertaCritica ||= Boolean(opcion.alertaCritica);
    emergenciaInmediata ||= Boolean(opcion.alertaInmediata);
    selecciones.push({ ...opcion, categoria: preguntasPorId.get(opcion.preguntaId).categoria });
  }

  const nivel = clasificar(puntaje, alertaCritica, umbrales);
  const guardado = await guardarEvaluacion({ versionId, puntaje, nivel, alertaCritica, opcionIds, solicitudId });
  if (guardado.puntaje !== puntaje || guardado.nivel !== nivel || guardado.alertaCritica !== alertaCritica) {
    const error = new Error('El identificador del intento ya fue utilizado con otras respuestas.');
    error.status = 409;
    throw error;
  }
  return {
    versionId,
    ...guardado,
    emergenciaInmediata,
    orientacion: construirOrientacion(selecciones, nivel, emergenciaInmediata)
  };
}
```

## backend/test/evaluacion.test.js

```js
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
```

## backend/test/limite-resultados.test.js

```js
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
```

## deploy/RAILWAY.md

```md
# Publicación de RedLila en Railway

El `Dockerfile` de la raíz compila React y entrega la web y `/api` desde el mismo servicio Node. La base MySQL es un segundo servicio privado. No se suben `.env`, `runtime/` ni claves locales.

## Primera publicación

1. En [Railway](https://railway.com/) crea un proyecto **RedLila** y agrega una base **MySQL**. Espera a que figure como disponible.
2. Instala la [CLI oficial](https://docs.railway.com/cli): `npm i -g @railway/cli`. En la carpeta raíz de este proyecto ejecuta `railway login` y `railway link` para vincular el proyecto.
3. Agrega un servicio vacío llamado **RedLila** en ese proyecto. En sus variables configura referencias a las variables del servicio MySQL. Si la base se llama `MySQL`, agrega:

   ```text
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   INIT_DB=true
   TRUST_PROXY=1
   ```

   Ajusta `MySQL` si el servicio tiene otro nombre. `SERVE_FRONTEND=true` y `NODE_ENV=production` ya están en el `Dockerfile`. No copies la contraseña MySQL en el código ni en este archivo.
4. Desde la raíz ejecuta `railway up --service RedLila`. Al primer inicio, `INIT_DB=true` crea el esquema y carga el quiz y directorio en la base vacía. Las sentencias de semilla son repetibles y no borran resultados existentes.
5. En la configuración del servicio web agrega el **Healthcheck Path** `/api/salud` y genera un dominio público con `railway domain --service RedLila` o en **Settings → Networking**.
6. Verifica `https://TU-DOMINIO/api/salud`, el inicio, el quiz completo y el directorio desde un teléfono fuera de la red local. Confirma que la API responda `{"estado":"ok"}` y que el cuestionario muestre once preguntas.
7. Tras la primera carga, cambia `INIT_DB` a `false` en Railway. Railway redeplegará el servicio. Verifica de nuevo `/api/salud`.

Para actualizaciones del código, vuelve a ejecutar `railway up --service RedLila`. No vuelvas a usar el archivo SQL inicial sobre una base con cambios de contenido; utiliza una migración específica. La app responde en el puerto que Railway inyecta en `PORT`.

## Comprobaciones antes de compartir la URL

- Haz una prueba de extremo a extremo: cuatro niveles de resultado, directorio, enlaces `tel:` y WhatsApp y salida rápida.
- Confirma directamente con las instituciones los contactos publicados, en especial los números regionales tomados de un portafolio de 2023.
- Pide una revisión especializada de las preguntas y umbrales del Violentómetro antes de presentarlo como instrumento validado.
- Revisa el uso y los créditos de la cuenta Railway. Sus planes y límites pueden cambiar; consulta la [página oficial](https://docs.railway.com/pricing) antes de contratar un plan.

## Si falla el despliegue

- `503` en `/api/salud`: revisa las cinco variables `DB_*`, el estado de MySQL y los registros del servicio web.
- La web abre, pero el quiz no carga: comprueba `/api/quiz/preguntas` y que `INIT_DB=true` se haya ejecutado al menos una vez.
- No abre el dominio: comprueba que el servicio tiene dominio público y que escucha `PORT`.
```

## docs/VERIFICACION_CONTACTOS_Y_MOVIL.md

```md
# RedLila: verificación de contactos, contenido y teléfono

**Revisión documental:** 22 de octubre de 2026. **Estado:** pendiente de confirmación operativa y prueba en un teléfono físico.

## 1. Contactos publicados

La revisión de fuentes oficiales confirma que los números listados aparecen en publicaciones institucionales. Esto **no confirma** que una llamada sea atendida hoy ni que un chat de WhatsApp siga activo. `verificada_en` en la base de datos registra la consulta de la fuente, no una llamada de comprobación.

| Servicio en RedLila | Número | Fuente documental | Comprobación operativa |
| --- | --- | --- | --- |
| Policía, nacional | 110 | [Policía Boliviana](https://www.policia.bo/infopol/) | Pendiente |
| FELCV, nacional | 800 14 0348 | [Portafolio policial 2023, p. 37](https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf) y [publicación policial de 2024](https://www.policia.bo/%F0%9D%97%9F%F0%9D%97%94-%F0%9D%97%A3%F0%9D%97%A2%F0%9D%97%9F%F0%9D%97%9C%F0%9D%97%96i%F0%9D%97%94-%F0%9D%97%95%F0%9D%97%A2%F0%9D%97%9F%F0%9D%97%9C%F0%9D%97%A9%F0%9D%97%9C%F0%9D%97%94%F0%9D%97%A1-50/) | Pendiente |
| PAIF/SLIM La Paz | 156; 800 10 4100 | [Gobierno Municipal de La Paz](https://lapaz.bo/paif-de-emergencia-linea-156/) | Pendiente |
| SLIM Cochabamba | 71742126 | [Observatorio Municipal de Cochabamba](https://observatorioviolencia.cochabamba.bo/servicios) | Pendiente |
| FELCV Chuquisaca | WhatsApp 72042698 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Cochabamba, eje sur | WhatsApp 71270447 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Oruro | WhatsApp 62805818 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Potosí | WhatsApp 72042570 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Tarija | WhatsApp 78241690 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Santa Cruz | WhatsApp 72042264 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Beni | WhatsApp 72042709 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |
| FELCV Pando | WhatsApp 72042740 | Portafolio policial 2023, p. 37 | Pendiente; fuente de 2023 |

El directorio local responde con 13 contactos. Se comprobaron la cobertura de los nueve departamentos y la construcción de los enlaces `tel:` y `https://wa.me/591…` a partir de los datos de la API. Abrir un enlace no demuestra que el destino responda.

### Confirmación directa pendiente

Contactar a la FELCV por sus canales institucionales y solicitar la lista vigente de líneas nacionales y WhatsApp departamentales, sus horarios y zonas de cobertura. Preguntar por cada número de la tabla, especialmente los ocho WhatsApp regionales. Confirmar 110 con la Policía y los números SLIM con cada municipio. Anotar fecha, nombre/cargo de quien confirma y fuente recibida. Si alguno cambia, actualizar `lineas_ayuda` en MySQL y los dos contactos esenciales de `frontend/src/data/lineasRespaldo.js` cuando corresponda. No probar números de emergencia con llamadas simuladas o sin una necesidad real; usar una consulta administrativa a la institución.

## 2. Revisión del Violentómetro

Las siete preguntas cubren vigilancia digital, humillación, aislamiento, control, coerción sexual, amenazas y agresión física. Son señales coherentes con la descripción de violencia de pareja de la [OMS](https://www.who.int/es/news-room/fact-sheets/detail/violence-against-women), que incluye maltrato psicológico, coacción sexual y conductas de control. Cada pregunta tiene cuatro frecuencias con puntajes de 0 a 3. Una respuesta distinta de «Nunca» en coerción sexual, amenazas o agresión física activa el nivel rojo. Los otros niveles se asignan con umbrales 3, 7 y 12 puntos.

**Revisión profesional pendiente:** pedir a una psicóloga, trabajadora social o especialista de un servicio de atención a mujeres que revise la redacción, la mezcla de conductas en las preguntas 6 y 7, las cuatro frecuencias, los umbrales y los mensajes de resultado. Estos puntos son decisiones educativas del proyecto; no se han validado como escala clínica ni como evaluación individual de riesgo. Registrar nombre, fecha y cambios acordados antes de afirmar que el instrumento fue revisado por una especialista.

## 3. Prueba en teléfono físico

La web local responde con HTTP 200 en Inicio, Quiz, Ayuda y el API. Esa comprobación no sustituye la prueba táctil. El script local actual inicia Vite solo en `127.0.0.1`, por lo que **no** se puede abrir directamente desde otro dispositivo. Para probarla en la red local hay que detener ese proceso, iniciar Vite con `--host 0.0.0.0`, permitir el puerto 5173 en el firewall y abrir `http://IP_DEL_COMPUTADOR:5173/` desde un teléfono en la misma red. `localhost` en el teléfono apunta al propio teléfono. La alternativa más sencilla es hacer la prueba después del despliegue HTTPS.

Marcar cada paso en **Android y/o iPhone**, indicando modelo, navegador, fecha y resultado:

- [ ] Inicio: texto legible sin desplazamiento horizontal; menú y botones se pueden tocar.
- [ ] Quiz: cargar las siete preguntas desde la API, seleccionar una opción por pregunta, usar «Anterior» y terminar; comprobar que aparece un resultado. Repetir con una respuesta de alto riesgo y verificar que aparece rojo.
- [ ] Ayuda: filtrar los nueve departamentos y comprobar que los contactos nacionales permanecen visibles; probar el directorio sin conexión para ver el respaldo nacional.
- [ ] Enlaces `tel:`: pulsar un contacto y comprobar que el teléfono ofrece abrir el marcador con el número correcto. **Cancelar antes de llamar**, salvo que exista una necesidad real de ayuda.
- [ ] Enlaces WhatsApp: pulsar un contacto y comprobar que se abre la ficha/chat del número correcto; no enviar mensajes de prueba a los servicios de emergencia.
- [ ] «Salir rápido»: pulsarlo desde Inicio, Quiz, Resultados y Ayuda; debe reemplazar la pestaña por Google de inmediato. Verificar manualmente que el historial anterior del navegador puede seguir existiendo, como advierte la página.
- [ ] Girar la pantalla, usar zoom de texto y revisar que el contenido y los botones sigan accesibles.

**Resultado de prueba física:** pendiente. Registrar aquí las observaciones y corregir cualquier fallo antes de publicar la URL del concurso.
```

## frontend/.env.example

```text
# Déjalo vacío cuando Nginx publique /api en el mismo dominio que el frontend.
VITE_API_BASE_URL=
```

## frontend/index.html

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#fffafd" />
    <meta name="referrer" content="no-referrer" />
    <meta name="description" content="RedLila: plataforma web educativa e interactiva contra la violencia hacia la mujer, con Violentómetro Digital y ayuda en los nueve departamentos de Bolivia." />
    <title>RedLila | Plataforma web educativa e interactiva contra la violencia hacia la mujer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## frontend/package.json

```json
{
  "name": "redlila-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fontsource-variable/dm-sans": "^5.3.0",
    "@fontsource-variable/manrope": "^5.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.18.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.4.1",
    "vite": "^6.3.5"
  },
  "engines": {
    "node": ">=20"
  }
}
```

## frontend/src/App.jsx

```jsx
import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import EscapeButton from './components/EscapeButton.jsx';
import Icon from './components/Icon.jsx';
import Inicio from './pages/Inicio.jsx';
import Quiz from './pages/Quiz.jsx';
import Resultados from './pages/Resultados.jsx';
import Ayuda from './pages/Ayuda.jsx';
import Desarrolladores from './pages/Desarrolladores.jsx';
import Informacion from './pages/Informacion.jsx';

const enlaces = [
  ['/', 'Inicio'], ['/informacion', 'Información'], ['/quiz', 'Violentómetro'], ['/ayuda', 'Directorio'],
  ['/desarrolladores', 'Proyecto']
];

export default function App() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [resultadoTemporal, setResultadoTemporal] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/resultados') setResultadoTemporal(null);
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" aria-label="RedLila, ir al inicio" onClick={() => setMenuAbierto(false)}>
            <span className="brand-mark"><Icon name="heart" size={23} /></span>
            <span className="brand-word">Red<span>Lila</span><small>INFORMACIÓN · ORIENTACIÓN · APOYO</small></span>
          </NavLink>
          <button className="menu-toggle" type="button" aria-expanded={menuAbierto} aria-controls="navegacion-principal" onClick={() => setMenuAbierto(!menuAbierto)}>
            {menuAbierto ? 'Cerrar' : 'Menú'} <span aria-hidden="true">{menuAbierto ? '−' : '+'}</span>
          </button>
          <nav id="navegacion-principal" className={menuAbierto ? 'main-nav nav-open' : 'main-nav'} aria-label="Navegación principal">
            {enlaces.map(([ruta, etiqueta]) => (
              <NavLink key={ruta} to={ruta} end={ruta === '/'}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {etiqueta}
              </NavLink>
            ))}
            <a className="header-phone" href="tel:800140348"><Icon name="phone" size={17} /><span>800 14 0348</span></a>
          </nav>
        </div>
      </header>
      <main id="contenido" className="page-content">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/informacion" element={<Informacion />} />
          <Route path="/quiz" element={<Quiz onResultado={setResultadoTemporal} />} />
          <Route path="/resultados" element={<Resultados resultado={resultadoTemporal} />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/desarrolladores" element={<Desarrolladores />} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand"><span className="brand-mark"><Icon name="heart" size={20} /></span><div><strong>RedLila</strong><p>Información que acompaña. Apoyo que conecta.</p></div></div>
          <div className="footer-meta"><p>Plataforma web educativa contra la violencia hacia la mujer.</p><span>Proyecto académico · Bolivia · Diego Janco Paco</span></div>
        </div>
      </footer>
      <EscapeButton />
    </div>
  );
}
```

## frontend/src/components/EscapeButton.jsx

```jsx
export default function EscapeButton() {
  function escapar() {
    // La navegación sucede en el mismo gesto, sin espera de red ni confirmación.
    window.location.replace('https://www.google.com');
  }

  return (
    <button type="button" className="escape-button" onClick={escapar}
      aria-label="Salir rápidamente de RedLila y abrir Google">
      Salir rápido <span aria-hidden="true">↗</span>
    </button>
  );
}
```

## frontend/src/components/Icon.jsx

```jsx
const paths = {
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/><path d="M7.5 12h3l1.5-3 2.2 6 1.3-3h2"/></>,
  arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v16M8 7h8M8 11h8"/></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 6 6l1.6-1.9a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.6 2Z"/></>,
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
};

export default function Icon({ name, size = 20, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.sparkle}</svg>;
}
```

## frontend/src/components/LineaCard.jsx

```jsx
export default function LineaCard({ linea }) {
  const esWhatsApp = linea.canal === 'whatsapp';
  const destino = esWhatsApp
    ? `https://wa.me/591${linea.numeroMarcacion.replace(/\D/g, '')}`
    : `tel:${linea.numeroMarcacion}`;

  return (
    <article className="linea-card">
      <div>
        <div className="linea-meta"><span className="linea-scope">{linea.alcance}</span><span className={esWhatsApp ? 'channel channel-chat' : 'channel'}>{esWhatsApp ? 'WhatsApp' : 'Llamada'}</span></div>
        <h3>{linea.institucion}</h3>
        <p>{linea.tipoAyuda}</p>
        <p className="small">Fuente consultada: {linea.verificadaEn}</p>
      </div>
      <div className="linea-actions">
        <a className={esWhatsApp ? 'button button-chat' : 'button button-call'} href={destino}
          target={esWhatsApp ? '_blank' : undefined}
          rel={esWhatsApp ? 'noopener noreferrer' : undefined}
          aria-label={`${esWhatsApp ? 'Abrir WhatsApp de' : 'Llamar a'} ${linea.institucion}: ${linea.telefono}`}>
          {esWhatsApp ? 'Escribir al' : 'Llamar al'} {linea.telefono} <span aria-hidden="true">↗</span>
        </a>
        <a className="source-link" href={linea.fuenteUrl} target="_blank" rel="noopener noreferrer">
          Ver fuente oficial <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
```

## frontend/src/data/departamentos.js

```js
export const departamentos = [
  'La Paz', 'Oruro', 'Potosí', 'Cochabamba', 'Chuquisaca',
  'Tarija', 'Santa Cruz', 'Beni', 'Pando'
];
```

## frontend/src/data/lineasRespaldo.js

```js
// Solo contactos esenciales; se muestran si el directorio de la API no responde.
export const lineasRespaldo = [
  {
    id: 'respaldo-policia', institucion: 'Policía Boliviana',
    telefono: '110', numeroMarcacion: '110', canal: 'telefono',
    alcance: 'Bolivia', departamento: 'Nacional',
    tipoAyuda: 'Emergencias policiales',
    fuenteUrl: 'https://www.policia.bo/', verificadaEn: '2026-10-20'
  },
  {
    id: 'respaldo-felcv', institucion: 'FELCV',
    telefono: '800 14 0348', numeroMarcacion: '800140348', canal: 'telefono',
    alcance: 'Bolivia', departamento: 'Nacional',
    tipoAyuda: 'Denuncias de violencia',
    fuenteUrl: 'https://www.policia.bo/wp-content/uploads/2023/12/PORTAFOLIO-DE-SERVICIOS-OFICIAL-APROBADO-2023-ELVIN-1.pdf',
    verificadaEn: '2026-10-20'
  }
];
```

## frontend/src/main.jsx

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import './styles/main.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </React.StrictMode>
);
```

## frontend/src/pages/Ayuda.jsx

```jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LineaCard from '../components/LineaCard.jsx';
import { departamentos } from '../data/departamentos.js';
import { lineasRespaldo } from '../data/lineasRespaldo.js';
import { obtenerAyuda } from '../services/api.js';

export default function Ayuda() {
  const [parametros, setParametros] = useSearchParams();
  const elegido = parametros.get('departamento');
  const departamento = departamentos.includes(elegido) ? elegido : 'Todos';
  const [lineas, setLineas] = useState(lineasRespaldo);
  const [respaldo, setRespaldo] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    obtenerAyuda(controller.signal)
      .then(datos => {
        if (datos.lineas?.length) setLineas(datos.lineas);
        else setRespaldo(true);
      })
      .catch(error => { if (error.name !== 'AbortError') setRespaldo(true); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

  const nacionales = useMemo(() => lineas.filter(linea => linea.departamento === 'Nacional'), [lineas]);
  const regionales = useMemo(() => lineas.filter(linea => linea.departamento !== 'Nacional' && (departamento === 'Todos' || linea.departamento === departamento)), [lineas, departamento]);

  function cambiarDepartamento(evento) {
    const valor = evento.target.value;
    setParametros(valor === 'Todos' ? {} : { departamento: valor });
  }

  return (
    <section className="help-section" aria-labelledby="ayuda-titulo">
      <div className="page-intro"><p className="eyebrow">Directorio de apoyo · Bolivia</p><h1 id="ayuda-titulo">Encuentra ayuda cerca de ti</h1><p className="lead">Contactos nacionales y regionales para los nueve departamentos. Elige tu ubicación y revisa el canal de cada servicio antes de comunicarte.</p></div>
      {cargando && <p className="status-note" role="status">Actualizando contactos…</p>}
      {respaldo && <p className="callout" role="status">No se pudo actualizar el directorio. Se muestran las líneas nacionales guardadas en esta página.</p>}

      <div className="directory-header"><div><p className="eyebrow">Disponibles en todo el país</p><h2>Líneas nacionales</h2><p>En una emergencia inmediata, llama desde un lugar seguro.</p></div><span className="directory-count">{nacionales.length} contactos</span></div>
      <div className="lineas-lista">{nacionales.map(linea => <LineaCard key={linea.id} linea={linea} />)}</div>

      <div className="department-filter">
        <div><p className="eyebrow">Atención regional</p><h2>Elige tu departamento</h2><p>Los servicios locales pueden limitar su atención a su municipio o zona.</p></div>
        <div><label className="filter-label" htmlFor="departamento">Departamento</label><select id="departamento" value={departamento} onChange={cambiarDepartamento}><option value="Todos">Todos los departamentos</option>{departamentos.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
      </div>
      <div className="department-chips" aria-label="Accesos a departamentos">
        {departamentos.map(item => <button type="button" key={item} className={departamento === item ? 'chip active' : 'chip'} onClick={() => setParametros({ departamento: item })} aria-pressed={departamento === item}>{item}</button>)}
      </div>
      <div className="directory-header regional-heading"><div><p className="eyebrow">{departamento === 'Todos' ? 'Nueve departamentos' : departamento}</p><h2>Contactos regionales</h2></div><span className="directory-count">{regionales.length} contactos</span></div>
      {regionales.length ? <div className="lineas-lista">{regionales.map(linea => <LineaCard key={linea.id} linea={linea} />)}</div> : <p className="callout">{cargando ? 'Cargando contactos regionales…' : respaldo ? 'Los contactos regionales requieren conexión. Puedes usar las líneas nacionales mostradas arriba.' : 'No hay un contacto regional publicado para esta selección. Puedes usar las líneas nacionales mostradas arriba.'}</p>}
      <p className="small directory-note">Los números marcados como WhatsApp abren un chat, no una llamada. La disponibilidad y los horarios pueden variar. Comprueba el contacto en la fuente oficial antes de usarlo.</p>
    </section>
  );
}
```

## frontend/src/pages/Desarrolladores.jsx

```jsx
export default function Desarrolladores() {
  return (
    <section className="section dev-section" aria-labelledby="dev-titulo">
      <div className="page-intro"><p className="eyebrow">Sección D · Proyecto académico</p><h1 id="dev-titulo">Tecnología con propósito</h1><p className="lead">RedLila es una plataforma web educativa e interactiva contra la violencia hacia la mujer. Reúne un Violentómetro Digital y un directorio boliviano para facilitar el reconocimiento de señales y el acceso a apoyo.</p><p className="motivation">No estás sola. Tu voz importa y mereces vivir sin violencia.</p></div>
      <div className="feature-grid">
        <article className="feature-card"><span className="feature-number">01 / DESARROLLADOR</span><h3>Diego Janco Paco</h3><p>Estudiante de Diseño y Programación Web III · Carrera de Sistemas Informáticos · Instituto Técnico Nacional de Comercio “Federico Álvarez Plata” Nocturno.</p></article>
        <article className="feature-card"><span className="feature-number">02 / TECNOLOGÍA</span><h3>Arquitectura web</h3><p>React y Vite para la interfaz; Node.js y Express para la API; MySQL para preguntas, opciones, directorio y resultados agregados.</p></article>
        <article className="feature-card"><span className="feature-number">03 / PROPÓSITO</span><h3>Información y acceso</h3><p>Acercar orientación comprensible y contactos institucionales de Bolivia, sin solicitar una cuenta ni datos personales.</p></article>
      </div>
      <section className="project-features" aria-labelledby="funcionalidades-title"><h2 id="funcionalidades-title">Funcionalidades implementadas</h2><ul><li>Violentómetro interactivo con 11 preguntas y opciones recuperadas desde MySQL.</li><li>Evaluación explicable con cuatro niveles, señales por categoría y recomendaciones personalizadas.</li><li>Detección prioritaria de señales críticas y de una posible situación de peligro actual.</li><li>Registro estadístico anónimo por opción, sin conservar combinaciones individuales.</li><li>Directorio telefónico y de WhatsApp con filtros para los nueve departamentos.</li><li>Botón de salida rápida y diseño adaptable a dispositivos móviles.</li></ul></section>
      <div className="project-principles"><h2>Cómo cuidamos esta experiencia</h2><div><p><strong>Privacidad:</strong> las respuestas del cuestionario permanecen en memoria durante la sesión y se guarda solo un resumen anónimo.</p><p><strong>Claridad:</strong> el resultado es educativo y no constituye un diagnóstico.</p><p><strong>Acceso:</strong> diseño adaptable a teléfonos y directorio para los nueve departamentos.</p></div></div>
      <p className="small credits-line">Fuentes y créditos educativos: Organización Mundial de la Salud (OMS), Ley N.º 348 y recursos institucionales enlazados en la sección Información. Tipografías DM Sans y Manrope distribuidas con licencia abierta. Desarrollo y diseño: Diego Janco Paco.</p>
    </section>
  );
}
```

## frontend/src/pages/Informacion.jsx

```jsx
import { Link } from 'react-router-dom';

const formas = [
  ['Psicológica', 'Insultos, humillaciones, amenazas, vigilancia, aislamiento o control de tus decisiones.'],
  ['Física', 'Empujones, golpes, sujeciones u otras acciones que dañan o ponen en riesgo el cuerpo.'],
  ['Sexual', 'Cualquier acto o contacto sexual sin consentimiento libre. Una relación previa no equivale a consentimiento.'],
  ['Económica y patrimonial', 'Controlar tus ingresos, impedirte trabajar o estudiar, quitarte dinero o dañar tus pertenencias.'],
  ['Digital', 'Revisar dispositivos sin permiso, exigir contraseñas, vigilar tu ubicación o acosarte por medios digitales.']
];

const recomendaciones = [
  ['Prioriza tu seguridad', 'Si hay peligro inmediato, intenta llegar a un lugar seguro y contacta a emergencias cuando puedas hacerlo sin aumentar el riesgo.'],
  ['Busca una persona de confianza', 'Puedes contar lo que sucede a alguien que respete tus decisiones y te acompañe sin presionarte.'],
  ['Elige cómo pedir apoyo', 'Si compartir el teléfono no es seguro, considera usar un dispositivo de confianza o acudir personalmente a un servicio.'],
  ['Conserva información solo si es seguro', 'Guardar mensajes o anotar fechas puede servirte más adelante. No lo hagas si alguien revisa tu dispositivo o esto te expone a mayor peligro.'],
  ['Acude a servicios especializados', 'En Bolivia puedes consultar la FELCV, los Servicios Legales Integrales Municipales (SLIM) y los contactos de tu departamento.']
];

export default function Informacion() {
  return (
    <article className="info-page" aria-labelledby="info-title">
      <div className="info-intro-layout">
        <header className="page-intro">
          <p className="eyebrow">Sección B · Aprende y encuentra recursos</p>
          <h1 id="info-title">Información para reconocer la violencia</h1>
          <p className="lead">La violencia puede presentarse de distintas maneras y afectar la libertad, la seguridad y las decisiones de una mujer. Reconocer conductas dañinas puede ayudar a buscar orientación; ninguna situación es culpa de quien la vive.</p>
        </header>
        <figure className="info-intro-art">
          <img src="/images/redlila-apoyo.webp" width="1536" height="1024" alt="Ilustración de dos mujeres bolivianas conversando en un espacio de apoyo" decoding="async" />
          <figcaption>Hablar también puede ser un primer paso.</figcaption>
        </figure>
      </div>

      <section className="info-block" aria-labelledby="formas-title">
        <div className="section-heading"><p className="eyebrow">Identificar señales</p><h2 id="formas-title">Algunas formas de violencia</h2><p>Las formas pueden combinarse. Esta lista es educativa y no pretende evaluar ni diagnosticar una situación.</p></div>
        <div className="info-type-grid">
          {formas.map(([titulo, texto], indice) => <article className="info-type-card" key={titulo}><span className="feature-number">0{indice + 1}</span><h3>{titulo}</h3><p>{texto}</p></article>)}
        </div>
      </section>

      <section className="info-block" aria-labelledby="apoyo-title">
        <div className="section-heading"><p className="eyebrow">Opciones a tu ritmo</p><h2 id="apoyo-title">Si te preocupa algo que estás viviendo</h2><p>No tienes que tomar todas las decisiones hoy. Puedes escoger el paso que te resulte posible y seguro.</p></div>
        <div className="recommendation-list">
          {recomendaciones.map(([titulo, texto], indice) => <article className="recommendation-card" key={titulo}><span className="recommendation-index">{String(indice + 1).padStart(2, '0')}</span><div><h3>{titulo}</h3><p>{texto}</p></div></article>)}
        </div>
        <aside className="info-callout"><strong>Si estás en peligro inmediato:</strong> llama a la Policía al 110 desde un lugar seguro. También puedes revisar las <Link to="/ayuda">líneas nacionales y contactos regionales</Link>. La disponibilidad de los servicios puede variar.</aside>
      </section>

      <section className="info-block" aria-labelledby="derechos-title">
        <div className="section-heading"><p className="eyebrow">Marco de referencia</p><h2 id="derechos-title">Derechos y recursos en Bolivia</h2><p>La Ley N.º 348 establece mecanismos de prevención, atención, protección y reparación para las mujeres en situación de violencia. Consulta el texto y los materiales informativos en las fuentes enlazadas.</p></div>
        <div className="resource-grid">
          <a className="resource-card" href="https://bolivia.unfpa.org/es/publicaciones/ley-integral-para-garantizar-a-las-mujeres-una-vida-libre-de-violencia-ley-n%C2%BA-348-del-9" target="_blank" rel="noopener noreferrer"><span className="resource-label">LEGISLACIÓN · BOLIVIA</span><h3>Ley N.º 348</h3><p>Texto de la Ley Integral para Garantizar a las Mujeres una Vida Libre de Violencia, publicada por UNFPA Bolivia.</p><span className="resource-link">Consultar recurso ↗</span></a>
          <a className="resource-card" href="https://www.who.int/es/news-room/fact-sheets/detail/violence-against-women" target="_blank" rel="noopener noreferrer"><span className="resource-label">SALUD PÚBLICA · OMS</span><h3>Violencia contra la mujer</h3><p>Definiciones, formas de violencia, efectos en la salud y respuesta del sector sanitario.</p><span className="resource-link">Leer ficha informativa ↗</span></a>
          <Link className="resource-card resource-card-internal" to="/ayuda"><span className="resource-label">DIRECTORIO · BOLIVIA</span><h3>Contactos de apoyo</h3><p>Consulta líneas nacionales y recursos publicados para los nueve departamentos.</p><span className="resource-link">Abrir directorio ↗</span></Link>
        </div>
      </section>

      <section className="info-quiz-cta"><div><p className="eyebrow">Una herramienta educativa</p><h2>¿Quieres explorar el Violentómetro?</h2><p>Responde a tu ritmo. El resultado orienta y no reemplaza la atención especializada.</p></div><Link className="button button-primary" to="/quiz">Ir al Violentómetro <span aria-hidden="true">↗</span></Link></section>
      <p className="small info-disclaimer">RedLila es un proyecto académico. El contenido es informativo, no constituye asesoría legal, atención psicológica ni un diagnóstico. Las fuentes externas pueden actualizarse; consulta los servicios oficiales para información vigente.</p>
    </article>
  );
}
```

## frontend/src/pages/Inicio.jsx

```jsx
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { departamentos } from '../data/departamentos.js';
import { lineasRespaldo } from '../data/lineasRespaldo.js';

const pasos = [
  { numero: '01', titulo: 'Reconoce', texto: 'Identifica comportamientos de control, humillación, amenazas o agresión que pueden pasar desapercibidos.', icono: 'sparkle' },
  { numero: '02', titulo: 'Infórmate', texto: 'Accede a contenido claro sobre señales, derechos, prevención y alternativas para pedir apoyo.', icono: 'book' },
  { numero: '03', titulo: 'Conecta', texto: 'Consulta líneas nacionales y recursos de orientación en los nueve departamentos de Bolivia.', icono: 'phone' },
];

const niveles = [
  ['01', 'Señales de alerta', 'Reconocer a tiempo permite conversar y buscar orientación.', 'level-green'],
  ['02', 'Atención', 'El control y la intimidación pueden afectar tu libertad y bienestar.', 'level-yellow'],
  ['03', 'Riesgo alto', 'Amenazas y agresiones requieren apoyo y un plan de seguridad.', 'level-orange'],
  ['04', 'Emergencia', 'Si existe peligro inmediato, busca un lugar seguro y llama a emergencias.', 'level-red'],
];

export default function Inicio() {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="titulo-principal">
        <div className="hero-copy">
          <p className="eyebrow"><span className="signal-dot" /> Plataforma educativa · Bolivia</p>
          <h1 id="titulo-principal">Reconocer las señales es <span>el primer paso.</span></h1>
          <p className="hero-subtitle">Lucha contra la violencia hacia la mujer</p>
          <p className="lead">RedLila es un espacio para aprender, reflexionar y encontrar apoyo. Explora el Violentómetro Digital y conoce recursos disponibles en tu departamento.</p>
          <div className="button-row">
            <Link className="button button-primary" to="/quiz">Explorar el Violentómetro <Icon name="arrow" size={18} /></Link>
            <Link className="button button-secondary" to="/informacion">Conocer más</Link>
          </div>
          <div className="hero-trust"><span><Icon name="shield" size={17} /> No necesitas crear una cuenta</span><span><Icon name="heart" size={17} /> Avanza a tu propio ritmo</span></div>
          <p className="small safety-note">El botón «Salir rápido» abre Google de inmediato. El historial previo de tu navegador puede permanecer visible.</p>
        </div>

        <div className="hero-visual" aria-label="Vista previa ilustrativa del Violentómetro Digital">
          <div className="hero-orb" />
          <div className="preview-note note-privacy"><Icon name="shield" size={17} /><span><strong>Tu privacidad importa</strong><small>No solicitamos datos personales</small></span></div>
          <article className="preview-card">
            <div className="preview-top"><span className="preview-logo"><Icon name="heart" size={17} /></span><span>VISTA PREVIA · VIOLENTÓMETRO</span><span className="preview-dots">•••</span></div>
            <div className="preview-progress"><span /></div>
            <p className="preview-step">PREGUNTA 01 <span>DE 11</span></p>
            <h2>¿Respeta tus decisiones y tu espacio personal?</h2>
            <div className="preview-option"><i /> Sí, me siento respetada</div>
            <div className="preview-option"><i /> A veces tengo dudas</div>
            <div className="preview-option"><i /> No, suele decidir por mí</div>
            <div className="preview-foot"><span><Icon name="shield" size={15} /> Respuestas anónimas</span><span>01 / 11</span></div>
          </article>
          <div className="preview-note note-support"><span className="support-pulse" /><span><strong>Orientación paso a paso</strong><small>Información para decidir con calma</small></span></div>
          <div className="hero-caption">Un espacio para reconocer, informarte y conectar.</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Principios de RedLila">
        <span><Icon name="shield" size={19} /> Privacidad y respeto</span><i /><span><Icon name="book" size={19} /> Educación accesible</span><i /><span><Icon name="heart" size={19} /> Apoyo sin juicios</span>
      </section>

      <section className="story-section" aria-labelledby="historia-titulo">
        <div className="story-card">
          <div className="story-copy">
            <p className="eyebrow">Un mensaje para ti</p>
            <h2 id="historia-titulo">Tu historia merece ser escuchada.</h2>
            <p>Reconocer una señal, hablar con alguien de confianza o consultar un recurso puede ser un primer paso. Puedes hacerlo a tu ritmo y desde un lugar seguro.</p>
            <Link className="text-link" to="/informacion">Conoce las señales y tus opciones <Icon name="arrow" size={17} /></Link>
          </div>
          <img className="story-art" src="/images/redlila-mujeres.webp" width="1774" height="887" alt="Ilustración de tres mujeres bolivianas unidas" decoding="async" fetchPriority="low" />
        </div>
      </section>

      <section className="section steps-section" aria-labelledby="como-funciona">
        <div className="section-heading"><p className="eyebrow">RedLila te acompaña</p><h2 id="como-funciona">Un espacio para aprender y encontrar orientación</h2><p>La información puede ayudar a reconocer patrones y pensar en próximos pasos. Tú decides qué consultar y cuándo hacerlo.</p></div>
        <div className="feature-grid">
          {pasos.map(paso => <article className="feature-card" key={paso.numero}><span className="feature-icon"><Icon name={paso.icono} size={21} /></span><span className="feature-number">{paso.numero}</span><h3>{paso.titulo}</h3><p>{paso.texto}</p></article>)}
        </div>
      </section>

      <section className="section signals-section" aria-labelledby="senales-titulo">
        <div className="section-heading"><p className="eyebrow">Información para reconocer</p><h2 id="senales-titulo">La violencia puede comenzar con señales sutiles</h2><p>Controlar, aislar o intimidar también puede ser violencia. No tienes que esperar a que exista una agresión física para buscar orientación.</p></div>
        <div className="signal-grid">
          <article className="signal-card"><span>01 / CONTROL</span><h3>Vigilancia y restricciones</h3><p>Revisar tu teléfono, decidir con quién hablas o limitar tus actividades.</p></article>
          <article className="signal-card"><span>02 / AISLAMIENTO</span><h3>Alejarte de tu entorno</h3><p>Hacerte sentir culpable por ver a personas de confianza o pedir apoyo.</p></article>
          <article className="signal-card"><span>03 / VIOLENCIA PSICOLÓGICA</span><h3>Humillación e intimidación</h3><p>Insultos, amenazas, chantaje o conductas que buscan causar miedo.</p></article>
          <article className="signal-card"><span>04 / AGRESIÓN</span><h3>Daño físico o sexual</h3><p>Cualquier agresión merece atención. Si hay peligro inmediato, busca ayuda desde un lugar seguro.</p></article>
        </div>
        <Link className="text-link" to="/informacion">Explorar la sección informativa <Icon name="arrow" size={17} /></Link>
      </section>

      <section className="violentometer-section" aria-labelledby="niveles-titulo">
        <div className="violentometer-inner">
          <div className="section-heading"><p className="eyebrow">Violentómetro Digital</p><h2 id="niveles-titulo">Cada señal merece ser tomada en cuenta</h2><p>La herramienta organiza señales por nivel de alerta y ofrece una orientación educativa basada en tus respuestas.</p></div>
          <div className="level-list">{niveles.map(([num, titulo, texto, color]) => <article className={`level-row ${color}`} key={num}><span className="level-num">{num}</span><span className="level-indicator" /><div><h3>{titulo}</h3><p>{texto}</p></div><span className="level-arrow" aria-hidden="true">↗</span></article>)}</div>
          <div className="violentometer-bottom"><p>El resultado no es un diagnóstico profesional ni reemplaza la atención especializada.</p><Link className="button button-light" to="/quiz">Iniciar orientación <Icon name="arrow" size={18} /></Link></div>
        </div>
      </section>

      <section className="section departments-section" aria-labelledby="departamentos-titulo">
        <div className="section-heading"><p className="eyebrow">Red nacional de apoyo</p><h2 id="departamentos-titulo">Orientación en los nueve departamentos</h2><p>Consulta líneas nacionales y filtra el directorio por departamento. Los servicios y horarios pueden variar según la localidad.</p></div>
        <div className="department-grid">
          {departamentos.map((departamento, indice) => <Link className="department-link" key={departamento} to={`/ayuda?departamento=${encodeURIComponent(departamento)}`}><span className="department-index">{String(indice + 1).padStart(2, '0')}</span><span>{departamento}</span><Icon name="arrow" size={17} /></Link>)}
        </div>
        <div className="national-lines">{lineasRespaldo.map(linea => <a key={linea.id} href={`tel:${linea.numeroMarcacion}`} className="national-line"><span className="national-line-icon"><Icon name="phone" size={19} /></span><span><small>{linea.institucion}</small><strong>{linea.telefono}</strong></span><Icon name="arrow" size={17} /></a>)}</div>
        <p className="directory-link-wrap"><Link className="text-link" to="/ayuda">Ver directorio completo <Icon name="arrow" size={17} /></Link></p>
      </section>

      <section className="closing-quote"><span className="quote-mark">“</span><p>Tu voz importa. Mereces vivir con libertad, respeto y seguridad.</p><span>REDLILA · INFORMACIÓN, ORIENTACIÓN Y APOYO</span></section>
    </div>
  );
}
```

## frontend/src/pages/Quiz.jsx

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { enviarRespuestas, obtenerQuiz } from '../services/api.js';

function crearSolicitudId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let indice = 0; indice < bytes.length; indice += 1) {
      bytes[indice] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hexadecimal = [...bytes].map(valor => valor.toString(16).padStart(2, '0')).join('');
  return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
}

export default function Quiz({ onResultado }) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [solicitudId] = useState(crearSolicitudId);
  const leyendaRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    obtenerQuiz(controller.signal)
      .then(setQuiz)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (quiz?.preguntas?.length) leyendaRef.current?.focus();
  }, [quiz, indice]);

  if (cargando) return <section className="section"><p role="status">Cargando preguntas…</p></section>;
  if (!quiz) return <section className="section"><h1>El quiz no está disponible</h1><p role="alert">{error}</p><Link className="button button-secondary" to="/ayuda">Ver ayuda</Link></section>;

  const pregunta = quiz.preguntas[indice];
  const seleccionada = respuestas[pregunta.id];
  const ultima = indice === quiz.preguntas.length - 1;

  async function siguiente(evento) {
    evento.preventDefault();
    if (!seleccionada || enviando) return;
    if (!ultima) { setIndice(actual => actual + 1); setError(''); return; }
    setEnviando(true);
    setError('');
    try {
      const opcionIds = quiz.preguntas.map(item => respuestas[item.id]);
      const resultado = await enviarRespuestas(quiz.version.id, opcionIds, solicitudId);
      onResultado(resultado);
      navigate('/resultados', { replace: true });
    } catch (err) { setError(err.message); setEnviando(false); }
  }

  return (
    <section className="quiz-section" aria-labelledby="quiz-title">
      <div className="quiz-intro"><p className="eyebrow">Violentómetro digital</p><h1 id="quiz-title">Responde a tu ritmo</h1><p>Elige la opción que mejor describa tu situación. Puedes salir en cualquier momento.</p></div>
      <div className="quiz-card">
        <div className="progress-copy"><span>Pregunta {indice + 1} de {quiz.preguntas.length}</span><span>{Math.round((indice + 1) / quiz.preguntas.length * 100)}%</span></div>
        <div className="progress-track" role="progressbar" aria-valuemin="1" aria-valuemax={quiz.preguntas.length} aria-valuenow={indice + 1} aria-label="Progreso del cuestionario"><span style={{ width: `${(indice + 1) / quiz.preguntas.length * 100}%` }} /></div>
        <form onSubmit={siguiente}>
          <fieldset>
            <legend ref={leyendaRef} tabIndex={-1}>{pregunta.enunciado}</legend>
            <div className="options">
              {pregunta.opciones.map(opcion => (
                <label key={opcion.id} className={seleccionada === opcion.id ? 'option selected' : 'option'}>
                  <input type="radio" name={`pregunta-${pregunta.id}`} value={opcion.id}
                    checked={seleccionada === opcion.id}
                    onChange={() => setRespuestas(actual => ({ ...actual, [pregunta.id]: opcion.id }))} />
                  <span>{opcion.texto}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="quiz-actions">
            <button type="button" className="button button-secondary" disabled={indice === 0 || enviando} onClick={() => setIndice(actual => actual - 1)}>Anterior</button>
            <button type="submit" className="button button-primary" disabled={!seleccionada || enviando}>{enviando ? 'Evaluando…' : ultima ? 'Ver orientación' : 'Siguiente'}</button>
          </div>
        </form>
      </div>
      <p className="small center">Antes de enviar, tus respuestas se mantienen solo en memoria. Al finalizar, se suman conteos anónimos por opción y se guarda el nivel general; RedLila no conserva tu combinación de respuestas.</p>
    </section>
  );
}
```

## frontend/src/pages/Resultados.jsx

```jsx
import { Link } from 'react-router-dom';
import { lineasRespaldo } from '../data/lineasRespaldo.js';

const contenidos = {
  verde: 'Verde · orientación inicial',
  amarillo: 'Amarillo · atención',
  naranja: 'Naranja · riesgo alto',
  rojo: 'Rojo · peligro'
};
const escala = ['verde', 'amarillo', 'naranja', 'rojo'];

export default function Resultados({ resultado }) {
  if (!resultado || !contenidos[resultado.nivel]) {
    return <section className="section"><h1>El resultado ya no está disponible</h1><p>Por privacidad, RedLila no conserva tu resultado después de recargar o salir de esta pantalla. Puedes volver a realizar el cuestionario.</p><Link className="button button-primary" to="/quiz">Volver al quiz</Link></section>;
  }

  return (
    <section className={`results-section result-theme-${resultado.nivel}`} aria-labelledby="resultado-titulo">
      <p className="eyebrow">Orientación del Violentómetro</p>
      <div className="result-panel">
        <p className="result-level">{contenidos[resultado.nivel]}</p>
        <h1 id="resultado-titulo">{resultado.orientacion.titulo}</h1>
        <p className="lead">{resultado.orientacion.resumen}</p>
      </div>

      <div className="result-scale" aria-label={`Tu resultado está en el nivel ${resultado.nivel}`}>
        {escala.map(nivel => <span className={nivel === resultado.nivel ? `scale-${nivel} current` : `scale-${nivel}`} aria-current={nivel === resultado.nivel ? 'step' : undefined} key={nivel}>{nivel}</span>)}
      </div>

      <div className="result-reason"><strong>Por qué aparece esta orientación</strong><p>{resultado.orientacion.motivo}</p></div>

      {resultado.emergenciaInmediata && <div className="emergency-callout" role="alert"><strong>Indicaste que podrías estar en peligro ahora.</strong><span>Si puedes hacerlo sin aumentar el riesgo, ve a un lugar seguro y llama al 110 o a la FELCV. Evita confrontar a quien te pone en peligro.</span></div>}

      {resultado.orientacion.senales.length > 0 && <section className="result-detail" aria-labelledby="senales-detectadas">
        <div className="section-heading"><p className="eyebrow">Según tus respuestas</p><h2 id="senales-detectadas">Señales identificadas</h2><p>Estas explicaciones muestran por qué recibiste esta orientación.</p></div>
        <div className="result-signal-grid">
          {resultado.orientacion.senales.map(senal => <article className="result-signal-card" key={senal.categoria}><span>{senal.intensidad}</span><h3>{senal.titulo}</h3><p>{senal.descripcion}</p></article>)}
        </div>
      </section>}

      <section className="result-detail" aria-labelledby="recomendaciones-titulo">
        <div className="section-heading"><p className="eyebrow">Pasos posibles</p><h2 id="recomendaciones-titulo">Qué puedes considerar ahora</h2><p>Tú decides qué opción resulta posible y segura para ti.</p></div>
        <div className="result-recommendations">
          {resultado.orientacion.recomendaciones.map((recomendacion, indice) => <article className="recommendation-card" key={recomendacion.titulo}><span className="recommendation-index">{String(indice + 1).padStart(2, '0')}</span><div><h3>{recomendacion.titulo}</h3><p>{recomendacion.texto}</p></div></article>)}
        </div>
      </section>

      <article className="info-card result-about"><h2>Sobre este resultado</h2><p>Es una orientación educativa basada en tus respuestas. No es un diagnóstico ni predice lo que ocurrirá. Una ausencia de señales en este cuestionario tampoco descarta otras formas de violencia.</p></article>
      <div className="callout" role="note"><strong>Cuida tu privacidad.</strong> Si alguien supervisa tu dispositivo, usa «Salir rápido». Esa acción no elimina el historial anterior.</div>
      <div className="section-heading"><p className="eyebrow">{resultado.nivel === 'rojo' ? 'Apoyo inmediato' : 'Contactos de apoyo'}</p><h2>Líneas nacionales</h2></div>
      <div className="button-row">
        {lineasRespaldo.map(linea => <a key={linea.id} className="button button-call" href={`tel:${linea.numeroMarcacion}`}>Llamar a {linea.institucion}: {linea.telefono}</a>)}
      </div>
      <p className="small">La llamada solo se inicia al pulsar un enlace. Si no puedes llamar, <Link to="/ayuda">consulta contactos de tu departamento</Link>.</p>
    </section>
  );
}
```

## frontend/src/services/api.js

```js
const base = import.meta.env.VITE_API_BASE_URL || '';
const tiempoMaximoMs = 10000;

async function solicitar(ruta, opciones = {}) {
  const controller = new AbortController();
  const cancelacionExterna = () => controller.abort();
  let vencioTiempo = false;
  if (opciones.signal?.aborted) controller.abort();
  else opciones.signal?.addEventListener('abort', cancelacionExterna, { once: true });
  const temporizador = setTimeout(() => {
    vencioTiempo = true;
    controller.abort();
  }, tiempoMaximoMs);

  try {
    const respuesta = await fetch(`${base}${ruta}`, {
      ...opciones,
      signal: controller.signal,
      headers: { ...(opciones.body ? { 'Content-Type': 'application/json' } : {}), ...opciones.headers },
      cache: 'no-store'
    });
    let datos;
    try { datos = await respuesta.json(); }
    catch {
      if (respuesta.status === 429) throw new Error('Demasiados intentos. Vuelve a probar en unos minutos.');
      if (!respuesta.ok) throw new Error('El servicio no está disponible en este momento.');
      throw new Error('El servicio devolvió una respuesta ilegible.');
    }
    if (!respuesta.ok) throw new Error(datos?.error || 'No se pudo completar la solicitud.');
    return datos;
  } catch (error) {
    if (vencioTiempo) throw new Error('El servicio tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.');
    if (opciones.signal?.aborted) throw new DOMException('Solicitud cancelada', 'AbortError');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con el servicio.');
    throw error;
  } finally {
    clearTimeout(temporizador);
    opciones.signal?.removeEventListener('abort', cancelacionExterna);
  }
}

const enteroPositivo = valor => Number.isSafeInteger(valor) && valor > 0;

export async function obtenerQuiz(signal) {
  const datos = await solicitar('/api/quiz/preguntas', { signal });
  if (!enteroPositivo(datos?.version?.id) || !Array.isArray(datos.preguntas) ||
      datos.preguntas.length === 0 || datos.preguntas.some(pregunta =>
        !enteroPositivo(pregunta.id) || typeof pregunta.enunciado !== 'string' ||
        !Array.isArray(pregunta.opciones) || pregunta.opciones.length < 2 ||
        pregunta.opciones.some(opcion => !enteroPositivo(opcion.id) || typeof opcion.texto !== 'string'))) {
    throw new Error('Las preguntas recibidas están incompletas. Inténtalo más tarde.');
  }
  return datos;
}

export async function enviarRespuestas(versionId, opcionIds, solicitudId) {
  const datos = await solicitar('/api/quiz/resultados', {
    method: 'POST', body: JSON.stringify({ versionId, opcionIds, solicitudId })
  });
  if (!['verde', 'amarillo', 'naranja', 'rojo'].includes(datos?.nivel) ||
      !Number.isSafeInteger(datos.puntaje) || typeof datos.alertaCritica !== 'boolean' ||
      typeof datos.emergenciaInmediata !== 'boolean' ||
      typeof datos.orientacion?.titulo !== 'string' ||
      typeof datos.orientacion?.resumen !== 'string' ||
      typeof datos.orientacion?.motivo !== 'string' ||
      !Array.isArray(datos.orientacion.senales) ||
      !Array.isArray(datos.orientacion.recomendaciones)) {
    throw new Error('El servicio devolvió un resultado incompleto. Inténtalo de nuevo.');
  }
  return datos;
}

export async function obtenerAyuda(signal) {
  const datos = await solicitar('/api/ayuda', { signal });
  if (!Array.isArray(datos?.lineas) || datos.lineas.some(linea =>
    typeof linea.institucion !== 'string' || typeof linea.departamento !== 'string' ||
    typeof linea.numeroMarcacion !== 'string' || !['telefono', 'whatsapp'].includes(linea.canal) ||
    typeof linea.fuenteUrl !== 'string')) {
    throw new Error('El directorio recibido está incompleto.');
  }
  return datos;
}
```

## frontend/src/styles/main.css

```css
:root {
  font-family: 'DM Sans Variable', Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #291b31;
  background: #fffafd;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --paper: #fffafd;
  --white: #ffffff;
  --ink: #26152e;
  --muted: #6f6273;
  --purple: #6b28a1;
  --purple-dark: #321144;
  --lilac: #a968ce;
  --pale: #f1e5f8;
  --line: #eadff0;
  --green: #55aa85;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 100px; }
body { min-width: 320px; margin: 0; background: var(--paper); }
button, select, input { font: inherit; }
a { color: var(--purple); }
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #b188c8; outline-offset: 4px; }
::selection { color: #fff; background: #74508b; }
.app-shell { min-height: 100vh; display: flex; flex-direction: column; overflow: clip; }
.container { width: min(1160px, calc(100% - 2.5rem)); margin-inline: auto; }
.page-content { flex: 1; padding-top: 78px; }
.skip-link { position: fixed; top: -70px; left: 1rem; z-index: 100; padding: .7rem 1rem; color: #fff; background: var(--purple-dark); border-radius: .5rem; }
.skip-link:focus { top: .5rem; }
.site-header { position: fixed; inset: 0 0 auto; z-index: 30; border-bottom: 1px solid #eadff0d9; background: #fffbfeef; backdrop-filter: blur(16px); box-shadow: 0 10px 32px #6b28a10a; }
.header-inner { width: min(1240px, calc(100% - 3rem)); min-height: 78px; margin: auto; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
.brand { display: inline-flex; align-items: center; gap: .7rem; flex: none; text-decoration: none; color: var(--ink); }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; color: white; background: linear-gradient(145deg, #b267d4, #7132a0); box-shadow: 0 10px 28px #8f46b52b; }
.brand-word { display: block; font-family: 'Manrope Variable', sans-serif; font-size: 1.3rem; font-weight: 850; line-height: 1; letter-spacing: -.06em; }
.brand-word > span { color: #9b4ac0; }
.brand-word small { display: block; margin-top: .34rem; color: #8c808d; font-size: .48rem; font-weight: 800; letter-spacing: .12em; }
.main-nav { display: flex; align-items: center; gap: .12rem; }
.nav-link { min-height: 42px; display: inline-flex; align-items: center; padding: .6rem .78rem; border-radius: 99px; color: #685d6c; text-decoration: none; font-size: .88rem; font-weight: 650; transition: color .18s, background .18s; }
.nav-link:hover, .nav-link.active { color: var(--purple); background: #f2e5fa; }
.header-phone { min-height: 42px; display: inline-flex; align-items: center; gap: .5rem; padding: .55rem .85rem; margin-left: .55rem; border: 1px solid #e5d9e9; border-radius: 99px; color: var(--purple); text-decoration: none; font-size: .84rem; font-weight: 800; }
.menu-toggle { display: none; }
h1, h2, h3, p { margin-top: 0; }
h1, h2, h3 { font-family: 'Manrope Variable', 'DM Sans Variable', sans-serif; color: var(--ink); }
h1 { font-size: clamp(2.7rem, 5.2vw, 5rem); line-height: 1.04; letter-spacing: -.065em; font-weight: 800; }
h2 { font-size: clamp(1.9rem, 3.2vw, 3rem); line-height: 1.14; letter-spacing: -.05em; }
h3 { font-size: 1.15rem; }
p { color: var(--muted); line-height: 1.72; }
.lead { max-width: 590px; color: #6f6474; font-size: clamp(1.04rem, 1.6vw, 1.15rem); }
.eyebrow { margin-bottom: .8rem; color: #805197; font-size: .73rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
.small { color: #867b89; font-size: .85rem; }
.center { text-align: center; }
.signal-dot { display: inline-block; width: 8px; height: 8px; margin-right: .4rem; border-radius: 50%; background: #70b591; box-shadow: 0 0 0 4px #70b59122; vertical-align: middle; }
.button-row { display: flex; flex-wrap: wrap; gap: .75rem; }
.button { min-height: 50px; display: inline-flex; justify-content: center; align-items: center; gap: .55rem; padding: .8rem 1.2rem; border: 1px solid transparent; border-radius: 99px; text-decoration: none; text-align: center; cursor: pointer; font-weight: 750; line-height: 1.2; transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease; }
.button:hover:not(:disabled) { transform: translateY(-2px); }
.button:disabled { opacity: .5; cursor: not-allowed; }
.button-primary { color: white; background: var(--purple); box-shadow: 0 12px 34px #8d3fba29; }
.button-primary:hover:not(:disabled) { background: #552084; box-shadow: 0 16px 42px #8d3fba36; }
.button-secondary { border-color: #ded3e1; color: var(--purple); background: #fffdfa; }
.button-secondary:hover { border-color: #b69ac5; background: #f6eff8; }
.button-call { justify-content: space-between; color: white; background: var(--purple-dark); }
.button-chat { justify-content: space-between; color: #235d43; border-color: #a9d7bd; background: #e8f7ec; }
.button-chat:hover { background: #d8f0e0; }
.button-light { color: var(--purple-dark); background: #fffaf5; }
.button-light:hover { background: #efe3f2; }
.text-link { display: inline-flex; align-items: center; gap: .45rem; color: var(--purple); text-decoration: none; font-weight: 750; }
.text-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.home-page { background: var(--paper); }
.hero { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, .88fr); align-items: center; gap: clamp(2rem, 5vw, 5.2rem); min-height: 620px; padding: 5rem max(calc((100vw - 1160px) / 2), 3rem) 4rem; background-color: #fbf4ff; background-image: linear-gradient(#853aa80b 1px, transparent 1px), linear-gradient(90deg, #853aa80b 1px, transparent 1px); background-size: 44px 44px; }
.hero-copy { position: relative; z-index: 2; max-width: 650px; animation: rise-in .65s ease-out both; }
.hero-copy h1 span { display: block; color: #8339ad; }
.hero-subtitle { margin: -1.1rem 0 1.1rem; color: var(--ink); font-size: .9rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.hero-copy .lead { margin-bottom: 1.55rem; }
.hero-trust { display: flex; flex-wrap: wrap; gap: .7rem 1.4rem; margin-top: 1.4rem; color: #726879; font-size: .81rem; font-weight: 650; }
.hero-trust span { display: inline-flex; align-items: center; gap: .42rem; }
.hero-trust svg { color: #815197; }
.safety-note { max-width: 540px; margin-top: 1.3rem; }
.hero-visual { position: relative; min-height: 470px; display: grid; place-items: center; animation: rise-in .8s .12s ease-out both; }
.hero-orb { position: absolute; width: min(440px, 90%); aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle at 42% 37%, #f1d9fd, #ddb5f3 49%, #f7e9fd 72%); opacity: 1; filter: blur(2px); animation: orb-breathe 7s ease-in-out infinite; }
.preview-card { position: relative; z-index: 1; width: min(380px, 88%); padding: 1.3rem; border: 1px solid #fff; border-radius: 1.25rem; background: #fffffffc; box-shadow: 0 25px 72px #5e277c26; transform: rotate(-2deg); }
.preview-top { display: flex; align-items: center; gap: .55rem; color: #938898; font-size: .59rem; font-weight: 850; letter-spacing: .09em; }
.preview-logo { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 9px; color: white; background: #8e65a4; }
.preview-dots { margin-left: auto; letter-spacing: .1em; }
.preview-progress { height: 5px; margin: 1.25rem 0 1.15rem; overflow: hidden; border-radius: 99px; background: #eee8ef; }
.preview-progress span { display: block; width: 18%; height: 100%; border-radius: inherit; background: #9066a5; }
.preview-step { margin-bottom: .5rem; color: #9a899c; font-size: .67rem; font-weight: 850; letter-spacing: .1em; }
.preview-step span { color: #b9aebd; }
.preview-card h2 { margin-bottom: 1rem; font-size: 1.2rem; line-height: 1.4; letter-spacing: -.035em; }
.preview-option { display: flex; align-items: center; gap: .65rem; min-height: 43px; margin-top: .48rem; padding: .6rem .72rem; border: 1px solid #eee7ef; border-radius: .7rem; color: #706575; font-size: .77rem; }
.preview-option i { width: 14px; height: 14px; border: 1.5px solid #bba9c1; border-radius: 50%; }
.preview-option:first-of-type { border-color: #c6add0; background: #f8f2fa; color: var(--purple); }
.preview-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: .8rem; border-top: 1px solid #f0eaf0; color: #958a98; font-size: .67rem; }
.preview-foot span:first-child { display: inline-flex; align-items: center; gap: .3rem; }
.preview-note { position: absolute; z-index: 2; display: flex; align-items: center; gap: .65rem; padding: .8rem .95rem; border: 1px solid #fff; border-radius: .85rem; background: #fff; box-shadow: 0 15px 42px #5e277c1b; }
.preview-note > svg { color: #805197; }
.preview-note strong, .preview-note small { display: block; }
.preview-note strong { color: #49364f; font-size: .72rem; }
.preview-note small { margin-top: .2rem; color: #8a7f8d; font-size: .62rem; }
.note-privacy { top: 4%; right: -1%; }
.note-support { bottom: 9%; left: -2%; }
.support-pulse { width: 10px; height: 10px; border-radius: 50%; background: #67ae88; box-shadow: 0 0 0 5px #67ae8823; }
.hero-caption { position: absolute; bottom: -1.2rem; color: #94889a; font-size: .7rem; letter-spacing: .05em; }
.trust-strip { display: flex; justify-content: center; align-items: center; gap: clamp(1rem, 5vw, 4.5rem); min-height: 78px; padding: 1rem; border-block: 1px solid var(--line); background: #fff; color: #675a6c; }
.trust-strip span { display: inline-flex; align-items: center; gap: .55rem; font-size: .82rem; font-weight: 700; }
.trust-strip svg { color: #8a619d; }
.trust-strip i { width: 1px; height: 25px; background: #e6dce7; }
.story-section { width: min(1160px, calc(100% - 2.5rem)); margin: 4rem auto 0; }
.story-card { position: relative; display: flex; align-items: center; min-height: 350px; overflow: hidden; border: 1px solid #e6d0ed; border-radius: 1.5rem; background: #f7e8fa; box-shadow: 0 24px 60px #79379918; }
.story-card::after { position: absolute; z-index: 1; inset: 0; content: ''; background: linear-gradient(90deg, #fbf2fe 0%, #fbf2fef5 34%, #fbf2fe00 67%); pointer-events: none; }
.story-copy { position: relative; z-index: 2; width: min(48%, 510px); padding: clamp(1.5rem, 4vw, 3rem); }
.story-copy h2 { max-width: 450px; margin-bottom: .85rem; font-size: clamp(1.9rem, 3vw, 2.9rem); }
.story-copy p:not(.eyebrow) { max-width: 440px; color: #624d68; }
.story-art { position: absolute; inset: 0 0 0 auto; width: 76%; height: 100%; object-fit: cover; object-position: right center; }
.story-copy .text-link { margin-top: .25rem; }
.section { width: min(1160px, calc(100% - 2.5rem)); margin-inline: auto; padding: 5.2rem 0; }
.section-heading { max-width: 720px; margin-bottom: 2rem; }
.section-heading h2 { margin-bottom: .75rem; }
.section-heading > p:last-child { margin-bottom: 0; }
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.feature-card { position: relative; min-height: 220px; padding: 1.55rem; border: 1px solid #eadff0; border-radius: 1.05rem; background: #fff; box-shadow: 0 16px 42px #73349410; transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
.feature-card:hover { transform: translateY(-5px); border-color: #c8a9d5; box-shadow: 0 24px 50px #7334941c; }
.feature-icon { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 1.4rem; border-radius: 13px; color: #815197; background: #f0e8f3; }
.feature-number { position: absolute; top: 1.75rem; right: 1.5rem; color: #b3a7b7; font-size: .76rem; font-weight: 850; letter-spacing: .1em; }
.feature-card h3 { margin: 0 0 .5rem; font-size: 1.25rem; }
.feature-card p { margin-bottom: 0; font-size: .93rem; }
.signals-section { border-top: 1px solid var(--line); }
.signal-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; }
.signal-card { min-height: 190px; padding: 1.2rem; border: 1px solid #eadff0; border-radius: .95rem; background: #fff; box-shadow: 0 14px 38px #7334940e; transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease; }
.signal-card:hover { transform: translateY(-4px); border-color: #d0b5db; box-shadow: 0 22px 42px #7334941a; }
.signal-card span { color: #8e68a1; font-size: .65rem; font-weight: 850; letter-spacing: .1em; }
.signal-card h3 { margin: .85rem 0 .4rem; font-size: 1.05rem; }
.signal-card p { margin-bottom: 0; font-size: .85rem; }
.signals-section > .text-link { margin-top: 1.25rem; }
.violentometer-section { padding: 5rem 1.25rem; color: white; background: radial-gradient(ellipse at 88% 10%, #8b45ad 0%, transparent 42%), linear-gradient(135deg, #4a2067, #643087 65%, #4b226a); }
.violentometer-inner { width: min(940px, 100%); margin-inline: auto; }
.violentometer-section .eyebrow { color: #d4b7e1; }
.violentometer-section h2 { max-width: 650px; color: white; }
.violentometer-section .section-heading > p:last-child { color: #d1c2d6; }
.level-list { display: grid; gap: .65rem; }
.level-row { display: grid; grid-template-columns: 40px 8px minmax(0, 1fr) 25px; align-items: center; gap: .9rem; padding: .9rem 1rem; border: 1px solid #ffffff25; border-radius: .85rem; background: #ffffff0d; transition: background .22s ease, transform .22s ease; }
.level-row:hover { transform: translateX(4px); background: #ffffff18; }
.level-num { color: #d8c4e1; font-size: .7rem; font-weight: 850; }
.level-indicator { width: 8px; height: 42px; border-radius: 99px; background: #64b990; }
.level-yellow .level-indicator { background: #edc95f; }.level-orange .level-indicator { background: #ed9865; }.level-red .level-indicator { background: #de657a; }
.level-row h3 { margin: 0 0 .2rem; color: white; font-size: 1rem; }
.level-row p { margin: 0; color: #d1c4d6; font-size: .83rem; }
.level-arrow { color: #cbb6d5; }
.violentometer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.35rem; }
.violentometer-bottom p { margin: 0; color: #d1c4d6; font-size: .8rem; }
.departments-section { border-top: 1px solid var(--line); }
.department-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; }
.department-link { min-height: 62px; display: grid; grid-template-columns: 34px 1fr 18px; align-items: center; gap: .65rem; padding: .85rem 1rem; border: 1px solid #eadff0; border-radius: .8rem; background: #fff; color: var(--ink); text-decoration: none; font-weight: 750; box-shadow: 0 12px 32px #7334940c; transition: border .18s, transform .18s, background .18s; }
.department-link:hover { transform: translateY(-2px); border-color: #bea5c9; background: #f8f1fa; }
.department-index { color: #997aa6; font-size: .7rem; font-weight: 850; }
.department-link svg { color: #8d6a9a; }
.national-lines { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; margin-top: 1.2rem; }
.national-line { display: flex; align-items: center; gap: .8rem; padding: 1rem; border: 1px solid #e9d9f0; border-radius: .85rem; color: var(--ink); background: #f7edfc; text-decoration: none; }
.national-line > svg { margin-left: auto; color: #8d6a9a; }
.national-line-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; color: #fff; background: #79508d; }
.national-line small, .national-line strong { display: block; }
.national-line small { color: #7a6e80; font-size: .7rem; }
.national-line strong { margin-top: .1rem; color: #4b3157; font-size: 1.02rem; }
.directory-link-wrap { margin: 1.1rem 0 0; text-align: center; }
.closing-quote { display: flex; flex-direction: column; align-items: center; padding: 4.8rem 1.5rem 5rem; color: white; text-align: center; background: #321b3d; }
.quote-mark { height: 44px; color: #b991ca; font-family: Georgia, serif; font-size: 5rem; line-height: .9; }
.closing-quote p { max-width: 760px; margin: 1rem auto 1.1rem; color: white; font-family: 'Manrope Variable', sans-serif; font-size: clamp(1.7rem, 4vw, 2.8rem); font-weight: 700; line-height: 1.25; letter-spacing: -.04em; }
.closing-quote > span:last-child { color: #c7b3d0; font-size: .65rem; font-weight: 800; letter-spacing: .16em; }
/* Inner application screens */
.quiz-section, .results-section, .help-section { width: min(930px, calc(100% - 2.5rem)); margin: 0 auto; padding: 3.3rem 0 5rem; }
.quiz-intro, .page-intro { max-width: 740px; margin-bottom: 2rem; }
.quiz-card { padding: 1.6rem; border: 1px solid #e8daf0; border-radius: 1.2rem; background: #fff; box-shadow: 0 19px 55px #7334941b; }
.progress-copy { display: flex; justify-content: space-between; color: #765b83; font-size: .88rem; font-weight: 750; }
.progress-track { height: .5rem; overflow: hidden; margin: .7rem 0 2rem; border-radius: 99px; background: #eee7f0; }
.progress-track span { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #805197, #c29bd3); }
fieldset { padding: 0; margin: 0; border: 0; }
legend { margin-bottom: 1.45rem; color: var(--ink); font-size: clamp(1.25rem, 3vw, 1.65rem); font-weight: 750; line-height: 1.38; }
.options { display: grid; gap: .75rem; }
.option { min-height: 58px; display: flex; align-items: center; gap: .8rem; padding: .85rem 1rem; border: 1px solid #e6dce8; border-radius: .8rem; background: #fff; cursor: pointer; }
.option:hover, .option.selected { border-color: #a984b9; background: #f6f0f8; }
.option input { width: 20px; height: 20px; flex: none; accent-color: #79508d; }
.option span { color: #45384a; }
.quiz-actions { display: flex; justify-content: space-between; gap: .8rem; margin-top: 1.7rem; }
.form-error { margin: 1rem 0 0; color: #a52e45; font-weight: 700; }
.result-theme-verde { --result-color: #176b4a; --result-deep: #104732; --result-light: #dff5e8; --result-border: #35a071; --result-shadow: #176b4a26; }
.result-theme-amarillo { --result-color: #765200; --result-deep: #57400b; --result-light: #fff0b5; --result-border: #d8a820; --result-shadow: #a7781026; }
.result-theme-naranja { --result-color: #a34719; --result-deep: #713010; --result-light: #ffe0ca; --result-border: #df783b; --result-shadow: #a347192b; }
.result-theme-rojo { --result-color: #a82643; --result-deep: #751b31; --result-light: #ffdce4; --result-border: #d84d68; --result-shadow: #a826432b; }
.result-panel { margin-bottom: 1rem; padding: clamp(1.4rem, 4vw, 2.1rem); border: 2px solid var(--result-border); border-left-width: 9px; border-radius: 1.15rem; background: radial-gradient(circle at 100% 0%, var(--result-light) 0%, transparent 65%), linear-gradient(135deg, #fff, var(--result-light)); box-shadow: 0 20px 52px var(--result-shadow); }
.result-panel h1 { color: var(--result-deep); font-size: clamp(1.85rem, 5vw, 3rem); }
.result-panel .lead { color: var(--result-deep); }
.result-panel p:last-child { margin-bottom: 0; }
.result-scale { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .4rem; margin: 0 0 1.35rem; }
.result-scale span { display: grid; place-items: center; min-height: 37px; border-radius: .6rem; color: #fff; font-size: .73rem; font-weight: 800; text-transform: capitalize; opacity: .53; }
.result-scale .current { opacity: 1; outline: 3px solid var(--result-color); outline-offset: 2px; box-shadow: 0 7px 20px var(--result-shadow); }
.scale-verde { background: #20845d; }.scale-amarillo { background: #9b7115; }.scale-naranja { background: #b55221; }.scale-rojo { background: #b52e4c; }
.result-reason { margin: 0 0 1.6rem; padding: 1rem 1.2rem; border: 1px solid var(--result-border); border-radius: .9rem; background: #fff; box-shadow: 0 12px 32px var(--result-shadow); }
.result-reason strong { display: block; margin-bottom: .35rem; color: var(--result-color); font-size: .84rem; letter-spacing: .02em; }
.result-reason p { margin: 0; font-size: .94rem; }
.result-level { display: inline-flex; padding: .42rem .7rem; border-radius: 99px; color: #fff; background: var(--result-color); font-size: .76rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.result-grid { display: grid; gap: 1rem; margin-bottom: 1.2rem; }
.info-card { padding: 1.45rem; border: 1px solid #eadff0; border-radius: 1rem; background: #fff; box-shadow: 0 14px 42px #7334940e; }
.info-card h2 { color: var(--ink); font-size: 1.25rem; }
.emergency-callout { display: grid; gap: .45rem; margin: 1.2rem 0 2rem; padding: 1.25rem 1.35rem; border: 2px solid #c7475d; border-radius: 1rem; color: #6f1626; background: #fff0f2; box-shadow: 0 16px 40px #a92f451a; }
.emergency-callout strong { font-family: 'Manrope Variable', sans-serif; font-size: 1.15rem; }
.emergency-callout span { line-height: 1.6; }
.result-detail { margin: 2.5rem 0; }
.result-detail .section-heading { margin-bottom: 1.15rem; }
.result-signal-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
.result-signal-card { padding: 1.2rem; border: 1px solid #e3d5e8; border-radius: 1rem; background: linear-gradient(145deg, #fff, #fbf5fd); box-shadow: 0 14px 36px #7334940d; }
.result-signal-card > span { display: inline-flex; padding: .3rem .55rem; border-radius: 99px; color: #754888; background: #eee2f3; font-size: .7rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.result-signal-card h3 { margin: .8rem 0 .4rem; font-size: 1.12rem; }
.result-signal-card p { margin: 0; font-size: .9rem; }
.result-recommendations { display: grid; gap: .75rem; }
.result-about { margin: 2rem 0 1.2rem; }
.result-about p { margin-bottom: 0; }
.callout { margin: 1rem 0 2rem; padding: 1rem 1.2rem; border: 1px solid #e0d3e6; border-radius: .85rem; background: #f2eaf5; color: #503b5b; line-height: 1.6; }
.help-section { width: min(1080px, calc(100% - 2.5rem)); }
.directory-header { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: .8rem; margin: 2rem 0 1rem; }
.directory-header h2 { margin-bottom: .3rem; }
.directory-header p:last-child { margin-bottom: 0; }
.directory-count { display: inline-flex; padding: .45rem .75rem; border: 1px solid #e4d9e7; border-radius: 99px; color: #72587e; font-size: .8rem; font-weight: 700; white-space: nowrap; }
.lineas-lista { display: grid; gap: 1rem; margin-bottom: 1.5rem; }
.linea-card { display: grid; gap: 1.2rem; padding: 1.35rem; border: 1px solid #eadff0; border-radius: 1.05rem; background: #fff; box-shadow: 0 14px 42px #7334940e; }
.linea-card h3 { margin: .8rem 0 .3rem; color: var(--ink); font-size: 1.25rem; }
.linea-card p { margin-bottom: .35rem; }
.linea-meta { display: flex; flex-wrap: wrap; gap: .45rem; }
.linea-scope, .channel { display: inline-flex; align-items: center; padding: .3rem .55rem; border-radius: .45rem; background: #f0e8f3; color: #725080; font-size: .72rem; font-weight: 800; }
.channel { background: #e9f4ed; color: #387454; }.channel-chat { background: #e9f4ed; color: #387454; }
.linea-actions { display: flex; flex-direction: column; align-items: stretch; gap: .75rem; }
.source-link { text-align: center; font-size: .86rem; }
.department-filter { display: grid; gap: 1rem; margin-top: 3.5rem; padding: 1.55rem; border: 1px solid #e9d9f0; border-radius: 1rem; background: #f7edfc; }
.department-filter h2 { margin-bottom: .4rem; }.department-filter p:last-child { margin-bottom: 0; }
.filter-label { display: block; margin-bottom: .45rem; color: #44354a; font-weight: 750; }
select { width: 100%; min-height: 49px; padding: .75rem .9rem; border: 1px solid #d9c9df; border-radius: .72rem; color: #413447; background: #fffefa; }
select option { color: #33233b; background: #fff; }
.department-chips { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1rem 0 2rem; }
.chip { min-height: 42px; padding: .56rem .85rem; border: 1px solid #dfd4e3; border-radius: 99px; color: #644c70; background: #fffefa; cursor: pointer; }
.chip:hover, .chip.active { border-color: #79508d; color: #fff; background: #79508d; }
.regional-heading { margin-top: 2rem; }.directory-note { max-width: 800px; margin-top: 1.5rem; }.status-note { color: #39825d; }
.dev-section { max-width: 1020px; margin: auto; }
.project-principles { display: grid; gap: 1rem; margin-top: 3rem; padding: 1.6rem; border: 1px solid #e7dfe8; border-radius: 1.2rem; background: #f5eff6; }
.project-principles h2 { font-size: 1.6rem; }.project-principles p:last-child { margin-bottom: 0; }.project-principles strong { color: #714984; }
.info-page { max-width: 1080px; margin-inline: auto; padding: 3.6rem 0 5rem; }
.info-intro-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(330px, .88fr); align-items: center; gap: clamp(1.5rem, 4vw, 3rem); margin-bottom: 2.2rem; }
.info-intro-layout .page-intro { margin-bottom: 0; }
.info-intro-layout h1 { font-size: clamp(2.6rem, 4.3vw, 4.2rem); }
.info-intro-art { position: relative; overflow: hidden; margin: 0; border-radius: 1.25rem; background: #eedaf4; box-shadow: 0 24px 56px #71349420; animation: rise-in .7s .1s ease-out both; }
.info-intro-art img { display: block; width: 100%; height: 350px; object-fit: cover; object-position: center; }
.info-intro-art figcaption { position: absolute; right: .9rem; bottom: .9rem; left: .9rem; width: fit-content; padding: .55rem .8rem; border-radius: .55rem; color: #fff; background: #321144dd; font-size: .77rem; font-weight: 750; }
.info-block { padding: 2.4rem 0; border-top: 1px solid var(--line); }
.info-type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
.info-type-card { padding: 1.3rem; border: 1px solid #eadff0; border-radius: 1rem; background: #fff; box-shadow: 0 14px 42px #7334940e; }
.info-type-card h3 { margin: .8rem 0 .45rem; color: var(--ink); }.info-type-card p { margin-bottom: 0; }
.recommendation-list { display: grid; gap: .75rem; }
.recommendation-card { display: grid; grid-template-columns: 45px 1fr; gap: .8rem; padding: 1.1rem; border: 1px solid #e8dfe9; border-radius: .9rem; background: #fffefa; }
.recommendation-index { color: #8d639e; font-weight: 850; letter-spacing: .1em; }.recommendation-card h3 { margin: 0 0 .35rem; color: var(--ink); }.recommendation-card p { margin: 0; }
.info-callout { margin-top: 1.2rem; padding: 1.2rem; border-left: 4px solid #8b62a0; border-radius: .6rem; background: #f1eaf4; color: #493851; line-height: 1.7; }
.resource-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .85rem; }
.resource-card { min-height: 230px; display: flex; flex-direction: column; align-items: flex-start; padding: 1.35rem; border: 1px solid #eadff0; border-radius: 1rem; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 14px 42px #7334940e; transition: border-color .18s ease, transform .18s ease, background .18s ease; }
.resource-card:hover { transform: translateY(-2px); border-color: #b99ac7; background: #faf5fb; }.resource-card h3 { margin: .7rem 0 .45rem; color: var(--ink); font-size: 1.25rem; }.resource-card p { flex: 1; }
.resource-label { color: #89619b; font-size: .7rem; font-weight: 850; letter-spacing: .13em; }.resource-link { color: #704784; font-size: .9rem; font-weight: 750; }.resource-card-internal { border-color: #c9b1d4; }
.info-quiz-cta { display: grid; gap: 1rem; align-items: center; padding: 1.5rem; border: 1px solid #e6d3ef; border-radius: 1.1rem; background: #f6eafb; }
.info-quiz-cta h2 { margin-bottom: .4rem; }.info-quiz-cta p:last-child { margin-bottom: 0; }.info-disclaimer, .credits-line { margin-top: 1.4rem; }
.project-features { margin-top: 2rem; padding: 1.5rem; border: 1px solid #e7dfe8; border-radius: 1rem; background: #fffefa; }.project-features h2 { font-size: 1.6rem; }.project-features li { padding: .3rem 0; color: #665b6b; line-height: 1.6; }
.site-footer { margin-top: auto; padding: 2.2rem 0 6rem; color: white; background: #291735; font-size: .88rem; }
.footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem 2rem; }
.footer-brand { display: flex; align-items: center; gap: .75rem; }.footer-brand strong { color: #fff; font-family: 'Manrope Variable', sans-serif; font-size: 1.25rem; }.footer-brand p, .footer-meta p { margin: .35rem 0; color: #d2c3d8; }.footer-meta { text-align: right; }.footer-meta span { color: #ae9db6; }
.escape-button { position: fixed; z-index: 50; right: max(1rem, env(safe-area-inset-right)); bottom: max(1rem, env(safe-area-inset-bottom)); min-height: 48px; padding: .7rem 1.05rem; border: 1px solid #ddd0e2; border-radius: 99px; background: #fffefa; color: #51335e; box-shadow: 0 8px 27px #30203c21; cursor: pointer; font-size: .84rem; font-weight: 850; }
.escape-button:hover { background: #f1e8f4; }
@keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes orb-breathe { 50% { transform: scale(1.035); } }
@media (max-width: 900px) {
  .hero { grid-template-columns: minmax(0, 1fr) minmax(300px, .82fr); gap: 1.5rem; padding-inline: 2rem; }
  .main-nav { gap: 0; }.nav-link { padding-inline: .56rem; font-size: .82rem; }.header-phone { margin-left: .25rem; padding-inline: .65rem; }
  .signal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .story-copy { width: 55%; }
  .info-intro-layout { grid-template-columns: minmax(0, 1fr) minmax(280px, .75fr); }
}
@media (max-width: 700px) {
  .page-content { padding-top: 70px; }
  .header-inner { width: calc(100% - 2rem); min-height: 70px; }
  .brand-mark { width: 37px; height: 37px; }.brand-word { font-size: 1.2rem; }.brand-word small { font-size: .43rem; }
  .menu-toggle { display: inline-flex; align-items: center; gap: .45rem; padding: .55rem .8rem; border: 1px solid #e4d9e7; border-radius: 99px; color: var(--purple); background: #fffefa; font-weight: 750; }
  .main-nav { position: absolute; top: calc(100% + 1px); inset-inline: 0; display: none; align-items: stretch; padding: .65rem 1rem 1rem; border-bottom: 1px solid #eadff0; background: #fffbfe; box-shadow: 0 16px 26px #73349412; }
  .main-nav.nav-open { display: flex; flex-direction: column; }
  .nav-link { min-height: 44px; padding-inline: .8rem; }.header-phone { justify-content: center; margin: .45rem 0 0; }
  .hero { grid-template-columns: 1fr; gap: 1.5rem; min-height: unset; padding: 3.2rem 1.25rem 3rem; }
  .hero-copy { width: min(600px, 100%); margin-inline: auto; }.hero-copy h1 { font-size: clamp(2.6rem, 10vw, 4.2rem); }
  .hero-visual { width: min(490px, 100%); min-height: 420px; margin: 0 auto; }.note-privacy { right: 0; }.note-support { left: 0; }
  .trust-strip { flex-wrap: wrap; gap: .8rem 1.1rem; padding: 1rem .75rem; }.trust-strip span { font-size: .72rem; }.trust-strip i { height: 20px; }
  .story-section { width: calc(100% - 2rem); margin-top: 2.7rem; }
  .story-card { display: flex; flex-direction: column; align-items: stretch; min-height: auto; }
  .story-card::after { display: none; }
  .story-copy { width: 100%; padding: 1.8rem; }
  .story-art { position: static; width: 100%; height: 260px; object-position: right 30%; }
  .section { width: calc(100% - 2rem); padding: 3.8rem 0; }
  .feature-grid, .department-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .violentometer-section { padding: 3.8rem 1rem; }.violentometer-bottom { align-items: flex-start; flex-direction: column; }
  .info-page { width: calc(100% - 2rem); padding-top: 2.6rem; }
  .info-intro-layout { grid-template-columns: 1fr; gap: 1.2rem; }
  .info-intro-art img { height: 300px; }
  .info-type-grid, .resource-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .national-lines { grid-template-columns: 1fr; }
  .result-signal-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .container, .header-inner { width: calc(100% - 1.5rem); }
  h1 { font-size: 2.65rem; }.hero-copy h1 { font-size: 2.8rem; }.hero-subtitle { margin-top: -.65rem; font-size: .74rem; }
  .hero-visual { min-height: 360px; }.preview-card { width: 88%; padding: 1.05rem; }.preview-card h2 { font-size: 1.06rem; }.preview-note { padding: .65rem .72rem; }.note-privacy { top: 0; }.note-support { bottom: 2%; }.preview-note strong { font-size: .65rem; }.preview-note small { font-size: .56rem; }.hero-caption { bottom: -1rem; font-size: .63rem; }
  .hero-trust { flex-direction: column; gap: .55rem; }.button-row .button { flex: 1 1 100%; }
  .trust-strip { justify-content: flex-start; }.trust-strip i { display: none; }.trust-strip span { width: calc(50% - .6rem); }
  .story-section { width: calc(100% - 1.5rem); }
  .story-copy { padding: 1.35rem; }.story-copy h2 { font-size: 1.9rem; }
  .story-art { height: 215px; }
  .feature-grid, .signal-grid, .department-grid, .info-type-grid, .resource-grid { grid-template-columns: 1fr; }
  .feature-card { min-height: auto; }.signal-card { min-height: auto; }.department-link { min-height: 56px; }
  .level-row { grid-template-columns: 27px 7px minmax(0, 1fr) 18px; gap: .6rem; padding: .8rem .7rem; }.level-row p { font-size: .76rem; }
  .quiz-section, .results-section, .help-section { width: calc(100% - 1.5rem); padding-top: 2.5rem; }.quiz-card { padding: 1.1rem; }.quiz-actions .button { flex: 1; padding-inline: .65rem; }
  .linea-card { padding: 1.05rem; }.linea-actions { width: 100%; }.department-filter { padding: 1.1rem; }
  .info-page { width: calc(100% - 1.5rem); }.info-block { padding: 1.8rem 0; }.info-quiz-cta { padding: 1.1rem; }
  .info-intro-art img { height: 245px; }
  .footer-inner { align-items: flex-start; flex-direction: column; }.footer-meta { text-align: left; }
  .escape-button { right: .65rem; bottom: max(.65rem, env(safe-area-inset-bottom)); min-height: 45px; padding: .62rem .85rem; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
```

## frontend/vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: { '/api': 'http://localhost:3001' }
  }
});
```

## README.md

```md
# RedLila

Plataforma web educativa e interactiva contra la violencia hacia la mujer. Incluye una sección informativa con fuentes, un Violentómetro Digital, un directorio con contactos nacionales y regionales para los nueve departamentos de Bolivia, y un botón de salida rápida. **«No estás sola. Tu voz importa y mereces vivir sin violencia.»** El resultado orienta y no constituye un diagnóstico.

El frontend incluye dos ilustraciones locales en WebP y animaciones discretas; respeta la preferencia del dispositivo por reducir movimiento.

## Requisitos

- Node.js 20 o superior y npm.
- MySQL 8 (local o administrado).

## Arranque local

En esta computadora, la instalación local está en `runtime/`. Desde la raíz del proyecto ejecuta `./scripts/start-local.ps1` en PowerShell y abre `http://localhost:5173/`. El script inicia MySQL, API y frontend en segundo plano y deja registros en `runtime/`.

La base local de esta computadora incluye la ampliación departamental, las estadísticas anónimas, la protección de envíos y la orientación personalizada. Para actualizar una instalación anterior, ejecuta una sola vez y en orden `SOURCE backend/seeds/002_departamentos.sql;`, `SOURCE backend/seeds/003_estadisticas_respuestas.sql;`, `SOURCE backend/seeds/004_protecciones.sql;` y `SOURCE backend/seeds/005_orientacion_personalizada.sql;` según lo que aún falte en esa instalación. En una instalación nueva, usa únicamente `001_completo.sql`, que ya contiene todo el esquema actualizado.

Si preparas otra computadora desde cero:

1. Abre MySQL con `mysql -u root -p`. Desde el prompt de MySQL ejecuta `SOURCE backend/seeds/001_completo.sql;` estando en la carpeta raíz del proyecto.
2. En MySQL crea el usuario de aplicación y otorga permisos mínimos: `CREATE USER 'redlila'@'127.0.0.1' IDENTIFIED BY 'una_clave_segura';`, `GRANT SELECT ON redlila.* TO 'redlila'@'127.0.0.1';`, `GRANT INSERT ON redlila.resultados_quiz TO 'redlila'@'127.0.0.1';` y `GRANT INSERT, UPDATE ON redlila.estadisticas_respuestas TO 'redlila'@'127.0.0.1';`.
3. Copia `backend/.env.example` a `backend/.env` y coloca esa clave en `DB_PASSWORD`. Ejecuta `cd backend`, `npm install` y `npm run dev`.
4. En otra terminal, ejecuta `cd frontend`, `npm install` y `npm run dev`. Abre `http://localhost:5173`.

Las credenciales locales generadas para esta computadora están en `backend/.env`; la clave administrativa está en `runtime/mysql-root-password.txt`. Ambos archivos quedan fuera del código versionado.

El servidor Vite redirige `/api` a `http://localhost:3001`. El frontend usa `/api` en el mismo origen por defecto. Si alojas la API en otro dominio, ajusta `VITE_API_BASE_URL` antes de compilar y configura `CORS_ORIGIN` con el origen público exacto. DM Sans y Manrope se incluyen como archivos del frontend; la visita no necesita consultar Google Fonts.

## Comprobación

- Backend: `cd backend && npm test`.
- Actualización local de la versión personalizada: `cd backend && npm run migrate:local-005`.
- Flujo completo local: `cd backend && npm run smoke:local`. La prueba usa identificadores únicos, comprueba el reintento y revierte sus registros y contadores estadísticos.
- Frontend: `cd frontend && npm run build`.
- API: `GET /api/salud`, `GET /api/quiz/preguntas`, `GET /api/ayuda`.
- El quiz debe devolver 11 preguntas y resultados explicados para los niveles verde, amarillo, naranja y rojo, incluida la prioridad por peligro actual.
- El directorio debe devolver 13 contactos: 2 nacionales y 11 regionales o municipales, con cobertura de La Paz, Oruro, Potosí, Cochabamba, Chuquisaca, Tarija, Santa Cruz, Beni y Pando.

## Privacidad y operación

No se solicitan cuentas ni se almacenan respuestas individuales. El resultado se guarda con fecha, nivel, puntaje y un identificador aleatorio del intento para evitar duplicados; ese identificador no contiene datos personales. Cada opción elegida aumenta un contador acumulado en `estadisticas_respuestas`; la aplicación no persiste la combinación de opciones asociada a un resultado. Las señales y recomendaciones se calculan durante la solicitud y permanecen solo en memoria React. El resultado visible desaparece al recargar o salir de su pantalla. La API mantiene en memoria temporalmente la dirección IP para limitar envíos abusivos; no la guarda en MySQL. Configura el servidor web sin registros de cuerpos de solicitudes y con una política de retención corta para `resultados_quiz`. El botón de escape reemplaza la página actual por Google, pero no puede borrar otras entradas del historial.

La prueba `smoke:local` anterior a la migración 004 podía dejar incrementos en `estadisticas_respuestas`. La versión actual revierte sus datos al terminar. Los conteos históricos no se modifican automáticamente porque no se puede distinguir con seguridad una elección de prueba de una elección real.

La sección informativa enlaza materiales de la [OMS](https://www.who.int/es/news-room/fact-sheets/detail/violence-against-women) y el texto de la [Ley N.º 348 publicado por UNFPA Bolivia](https://bolivia.unfpa.org/es/publicaciones/ley-integral-para-garantizar-a-las-mujeres-una-vida-libre-de-violencia-ley-n%C2%BA-348-del-9). El contenido de RedLila es educativo y no reemplaza la atención profesional.

Las líneas nacionales y municipales se presentan como llamadas; los números regionales de la FELCV publicados como WhatsApp se abren como chat. El portafolio policial usado para esos contactos es de 2023. Antes de publicar para uso público, confirma con las instituciones que cada contacto y su horario siguen operativos y vuelve a revisarlos periódicamente. El campo `verificada_en` registra la fecha de consulta de la fuente, no una llamada de prueba. La redacción de las preguntas y los umbrales del Violentómetro también requieren revisión de una persona especialista antes de presentarse como orientación validada.

La [revisión documental de contactos y el protocolo de prueba en teléfono](docs/VERIFICACION_CONTACTOS_Y_MOVIL.md) detallan qué se comprobó y qué requiere confirmación directa.

Para producción, usa [deploy/nginx.conf.example](deploy/nginx.conf.example) como plantilla: sustituye dominio, ruta de `frontend/dist` y certificados; comprueba que `/quiz`, `/ayuda` y `/resultados` carguen al recargar la página. Sirve HTTPS y dirige `/api` a Node. Configura `CORS_ORIGIN` con el dominio público, `TRUST_PROXY=loopback` solo si Nginx conecta localmente con Node y conserva las credenciales en el servidor. Comprueba los contactos institucionales por sus canales oficiales antes de publicar y registra la fecha de esa comprobación.

Para Railway, el proyecto incluye un `Dockerfile` que publica frontend y backend desde el mismo dominio. Consulta la [guía de despliegue en Railway](deploy/RAILWAY.md) para crear MySQL, vincular las variables y verificar la URL pública.
```

## scripts/generar-codigo-completo.mjs

```js
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const extensiones = new Set(['.css', '.html', '.js', '.jsx', '.json', '.md', '.mjs', '.ps1', '.sql']);
const excluidos = new Set(['CODIGO_COMPLETO.md', 'package-lock.json']);
const carpetasExcluidas = new Set(['dist', 'node_modules', 'runtime', '.git']);

async function recorrer(carpeta) {
  const encontrados = [];
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    if (entrada.isDirectory() && carpetasExcluidas.has(entrada.name)) continue;
    const ruta = resolve(carpeta, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...await recorrer(ruta));
    else if ((extensiones.has(extname(entrada.name)) || entrada.name === '.env.example') &&
      !excluidos.has(entrada.name) && entrada.name !== '.env') encontrados.push(ruta);
  }
  return encontrados;
}

const lenguajes = { '.css': 'css', '.html': 'html', '.js': 'js', '.jsx': 'jsx', '.json': 'json', '.md': 'md', '.mjs': 'js', '.ps1': 'powershell', '.sql': 'sql' };
const archivos = (await recorrer(raiz))
  .filter(ruta => !relative(raiz, ruta).startsWith('frontend\\public\\images'))
  .sort((a, b) => relative(raiz, a).localeCompare(relative(raiz, b)));

const partes = [
  '# RedLila — código fuente completo',
  '',
  'Archivos de código, documentación y configuración de ejemplo. Se excluyen credenciales, imágenes binarias, runtime, dependencias y compilados.',
  ''
];
for (const archivo of archivos) {
  const nombre = relative(raiz, archivo).replaceAll('\\', '/');
  const contenido = await readFile(archivo, 'utf8');
  partes.push(`## ${nombre}`, '', `\`\`\`${lenguajes[extname(archivo)] || 'text'}`, contenido.trimEnd(), '```', '');
}
await writeFile(resolve(raiz, 'CODIGO_COMPLETO.md'), partes.join('\n'), 'utf8');
console.log(`CODIGO_COMPLETO.md actualizado con ${archivos.length} archivos.`);
```

## scripts/start-local.ps1

```powershell
# Inicia la base local y los dos servidores de RedLila en ventanas ocultas.
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $projectRoot 'runtime'
$mysqlDir = Join-Path $runtime 'mysql-8.4.11-winx64'
$mysqlExe = Join-Path $mysqlDir 'bin/mysqld.exe'
$mysqlIni = Join-Path $runtime 'mysql.ini'
$backend = Join-Path $projectRoot 'backend'
$frontend = Join-Path $projectRoot 'frontend'
$nodeExe = (Get-Command node -ErrorAction Stop).Source

function Test-LocalPort([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $client.Connect('127.0.0.1', $port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-LocalPort([int]$port, [string]$name) {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-LocalPort $port) { Write-Host "${name}: listo en el puerto $port"; return }
    Start-Sleep -Milliseconds 500
  }
  throw "$name no respondió en el puerto $port. Consulta los registros en runtime/."
}

function Wait-RedLilaApi {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/salud' -TimeoutSec 5
      if ($health.estado -eq 'ok') { Write-Host 'API y MySQL: listos'; return }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw 'La API no responde con MySQL disponible. Consulta runtime/api-stderr.log.'
}

function Wait-RedLilaFrontend {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 5
      if ($response.StatusCode -eq 200 -and $response.Content.Contains('RedLila')) {
        Write-Host 'Frontend RedLila: listo en el puerto 5173'
        return
      }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw 'El frontend RedLila no responde. Consulta runtime/web-stderr.log.'
}

if (-not (Test-Path -LiteralPath $mysqlExe)) { throw 'Falta runtime/mysql-8.4.11-winx64/bin/mysqld.exe.' }
if (-not (Test-Path -LiteralPath $mysqlIni)) { throw 'Falta runtime/mysql.ini.' }
if (-not (Test-Path -LiteralPath (Join-Path $backend '.env'))) { throw 'Falta backend/.env.' }

if (-not (Test-LocalPort 3306)) {
  $mysqlProcess = Start-Process -FilePath $mysqlExe `
    -ArgumentList @("--defaults-file=`"$mysqlIni`"", '--console') `
    -WorkingDirectory $mysqlDir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtime 'mysql-stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'mysql-stderr.log')
  $mysqlProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'mysql.pid')
}
Wait-LocalPort 3306 'MySQL'

if (-not (Test-LocalPort 3001)) {
  $apiProcess = Start-Process -FilePath $nodeExe -ArgumentList 'src/app.js' `
    -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtime 'api-stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'api-stderr.log')
  $apiProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'api.pid')
}
Wait-RedLilaApi

if (-not (Test-LocalPort 5173)) {
  $vite = Join-Path $frontend 'node_modules/vite/bin/vite.js'
  $webProcess = Start-Process -FilePath $nodeExe `
    -ArgumentList @("`"$vite`"", '--host', '0.0.0.0') `
    -WorkingDirectory $frontend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtime 'web-stdout.log') `
    -RedirectStandardError (Join-Path $runtime 'web-stderr.log')
  $webProcess.Id | Set-Content -LiteralPath (Join-Path $runtime 'web.pid')
}
Wait-RedLilaFrontend
Write-Host 'RedLila disponible en http://localhost:5173/'
Write-Host 'Para un celular en la misma red, abre http://IP-DE-ESTA-PC:5173/'
```
