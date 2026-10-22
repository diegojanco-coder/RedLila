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
