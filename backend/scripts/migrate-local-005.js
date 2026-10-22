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
