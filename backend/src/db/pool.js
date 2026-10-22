import 'dotenv/config';
import mysql from 'mysql2/promise';

// Un pool evita abrir una conexión nueva por cada solicitud.
export const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'redlila',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'redlila',
  charset: 'utf8mb4',
  // Bases administradas como TiDB Cloud exigen conexiones cifradas.
  ...(process.env.DB_SSL === 'true' ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {})
};

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 30,
  connectTimeout: 5000
});
