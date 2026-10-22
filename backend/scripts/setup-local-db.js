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
