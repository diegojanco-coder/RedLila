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
