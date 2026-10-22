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
