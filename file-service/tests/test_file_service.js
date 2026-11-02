import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { saveFileLocally, readFileLocally, validateFile, computeSha256, STORAGE_DIR } from '../src/fileService.ts';

console.log('--- Iniciando prueba del servicio local de archivos (T0.6 / RNF-04) ---');

// 1. Crear documento de prueba representativo
const testDocumentName = 'propuesta_investigacion_prueba.pdf';
const testContent = Buffer.from(
  'SEED: Universidad - Comité de Investigaciones. Propuesta de proyecto de prueba para validación de hash SHA-256 e integridad física en disco local.'
);
const expectedInitialHash = crypto.createHash('sha256').update(testContent).digest('hex');
console.log('1. Hash inicial calculado:', expectedInitialHash);

// 2. Subir y guardar el archivo en la carpeta local
const saveResult = saveFileLocally(testDocumentName, testContent, 'application/pdf');
if (!saveResult.success || !saveResult.metadata) {
  console.error('ERROR al guardar el archivo:', saveResult.error);
  process.exit(1);
}
console.log('2. Archivo guardado físicamente en:', saveResult.metadata.filePath);

// 3. Verificar que el archivo existe en el disco
if (!fs.existsSync(saveResult.metadata.filePath)) {
  console.error('ERROR: El archivo no existe físicamente en el disco');
  process.exit(1);
}
console.log('3. Archivo verificado en disco local con éxito.');

// 4. Descargar / leer el archivo y recalcular su hash
const readResult = readFileLocally(saveResult.metadata.filePath);
if (!readResult.success || !readResult.buffer || !readResult.hashSha256) {
  console.error('ERROR al leer el archivo guardado:', readResult.error);
  process.exit(1);
}
console.log('4. Hash del archivo recuperado:', readResult.hashSha256);

// 5. Comparar ambos hashes
if (expectedInitialHash !== readResult.hashSha256) {
  console.error(
    `ERROR DE INTEGRIDAD: El hash no coincide.\nInicial:     ${expectedInitialHash}\nRecuperado: ${readResult.hashSha256}`
  );
  process.exit(1);
}
console.log('5. Verificación de integridad: ¡Los hashes coinciden al 100%!');

// 6. Prueba de validación RNF-04: Rechazo de archivos ejecutables .exe
const exeValidation = validateFile('malware.exe', 'application/x-msdownload', 1024);
if (exeValidation.valid) {
  console.error('ERROR: No se rechazó el archivo .exe');
  process.exit(1);
}
console.log('6. Validación de formato: .exe rechazado correctamente ->', exeValidation.error);

// 7. Prueba de validación RNF-04: Rechazo de archivos mayores a 10 MB
const oversizedBytes = 11 * 1024 * 1024; // 11 MB
const sizeValidation = validateFile('gran_archivo.pdf', 'application/pdf', oversizedBytes);
if (sizeValidation.valid) {
  console.error('ERROR: No se rechazó el archivo de más de 10 MB');
  process.exit(1);
}
console.log('7. Validación de tamaño: archivo de 11 MB rechazado correctamente ->', sizeValidation.error);

console.log('--- ¡Todas las pruebas del servicio de archivos T0.6 pasaron exitosamente! ---');
