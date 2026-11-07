import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STORAGE_DIR } from '../src/fileService.ts';

console.log('--- Iniciando prueba automática de respaldo y restauración del almacenamiento local (T6.4 / RNF-09) ---');

const BACKUP_DIR = path.resolve(process.cwd(), 'file-service/backups');
const RESTORE_TEST_DIR = path.resolve(process.cwd(), 'file-service/storage_restore_test');

// 1. Verificar existencia del directorio de almacenamiento original
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// 2. Crear un archivo crítico de prueba en storage
const criticalFileName = 'expediente_radicado_2026_001.pdf';
const criticalContent = Buffer.from(
  'CONTENIDO OFICIAL INSTITUCIONAL: Solicitud de aval 2026-001 debidamente firmada por el investigador principal y certificada por el comité.'
);
const criticalFilePath = path.join(STORAGE_DIR, criticalFileName);
fs.writeFileSync(criticalFilePath, criticalContent);

const originalHash = crypto.createHash('sha256').update(criticalContent).digest('hex');
console.log(`1. Archivo crítico creado en almacenamiento: "${criticalFileName}" (SHA-256: ${originalHash.substring(0, 16)}...).`);

// 3. Ejecutar procedimiento de Respaldo (Backup)
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFolder = path.join(BACKUP_DIR, `backup_${backupTimestamp}`);
fs.mkdirSync(backupFolder, { recursive: true });

// Copiar todos los archivos de STORAGE_DIR hacia backupFolder
const storageFiles = fs.readdirSync(STORAGE_DIR);
let backedUpCount = 0;
for (const file of storageFiles) {
  const src = path.join(STORAGE_DIR, file);
  if (fs.statSync(src).isFile()) {
    const dest = path.join(backupFolder, file);
    fs.copyFileSync(src, dest);
    backedUpCount++;
  }
}
console.log(`2. Respaldo completado exitosamente: ${backedUpCount} archivos respaldados en "${backupFolder}".`);

// 4. Ejecutar procedimiento de Restauración (Restore Simulation)
if (fs.existsSync(RESTORE_TEST_DIR)) {
  fs.rmSync(RESTORE_TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(RESTORE_TEST_DIR, { recursive: true });

const backupFiles = fs.readdirSync(backupFolder);
let restoredCount = 0;
for (const file of backupFiles) {
  const src = path.join(backupFolder, file);
  const dest = path.join(RESTORE_TEST_DIR, file);
  fs.copyFileSync(src, dest);
  restoredCount++;
}
console.log(`3. Restauración completada exitosamente: ${restoredCount} archivos restaurados en "${RESTORE_TEST_DIR}".`);

// 5. Verificación de Integridad Bit a Bit post-restauración
const restoredFilePath = path.join(RESTORE_TEST_DIR, criticalFileName);
if (!fs.existsSync(restoredFilePath)) {
  console.error('ERROR: El archivo crítico no fue recuperado durante la restauración.');
  process.exit(1);
}

const restoredContent = fs.readFileSync(restoredFilePath);
const restoredHash = crypto.createHash('sha256').update(restoredContent).digest('hex');

if (originalHash !== restoredHash) {
  console.error(
    `ERROR: Hash de integridad no coincide tras la restauración.\nOriginal:   ${originalHash}\nRestaurado: ${restoredHash}`
  );
  process.exit(1);
}
console.log('4. Verificación de integridad SHA-256 post-restauración: Coincidencia del 100% de hashes.');

// 6. Limpieza del directorio temporal de prueba de restauración
fs.rmSync(RESTORE_TEST_DIR, { recursive: true, force: true });
console.log('5. Directorio temporal de prueba de restauración saneado.');

console.log('--- ¡Todas las pruebas de T6.4 (Procedimiento de Respaldo y Restauración RNF-09) pasaron exitosamente! ---');
