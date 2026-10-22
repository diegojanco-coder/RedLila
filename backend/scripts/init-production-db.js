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
