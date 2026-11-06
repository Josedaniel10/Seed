const { validateDocumentFile, computeFileSha256 } = await import('../documentValidator.ts');

console.log('--- Iniciando prueba automática de validación estricta de documentos y SHA-256 (T2.3, T2.4 / RF-09, RNF-04) ---');

// 1. Aceptación de formatos válidos (PDF y DOCX) dentro del límite
const validPdf = validateDocumentFile('Propuesta_Investigacion_2026.pdf', 2 * 1024 * 1024);
if (!validPdf.valid) {
  console.error('ERROR: Archivo PDF válido fue rechazado:', validPdf.error);
  process.exit(1);
}

const validDocx = validateDocumentFile('Cronograma_Actividades.docx', 500 * 1024);
if (!validDocx.valid) {
  console.error('ERROR: Archivo DOCX válido fue rechazado:', validDocx.error);
  process.exit(1);
}
console.log('1. Archivos válidos (.pdf y .docx) aprobados correctamente.');

// 2. Rechazo de ejecutables y scripts por seguridad informática (RNF-04)
const executables = [
  'script_malicioso.exe',
  'ejecutable.bat',
  'automatizacion.sh',
  'codigo.js',
  'instalador.msi',
  'payload.py',
];

for (const exeName of executables) {
  const result = validateDocumentFile(exeName, 1024);
  if (result.valid) {
    console.error(`ERROR: Archivo ejecutable "${exeName}" fue aceptado indebidamente.`);
    process.exit(1);
  }
}
console.log('2. Todos los archivos ejecutables (.exe, .bat, .sh, .js, .msi, .py) fueron rechazados estrictamente.');

// 3. Rechazo de archivos que superen 10 MB (RNF-04)
const oversizedBytes = 11 * 1024 * 1024; // 11 MB
const oversizeResult = validateDocumentFile('Anexos_Pesados.pdf', oversizedBytes, 10);
if (oversizeResult.valid) {
  console.error('ERROR: Archivo de 11 MB fue aceptado cuando el límite es 10 MB.');
  process.exit(1);
}
console.log(`3. Archivo con sobrepeso rechazado con mensaje: "${oversizeResult.error}".`);

// 4. Rechazo de archivo vacío (0 bytes)
const emptyResult = validateDocumentFile('Vacio.pdf', 0);
if (emptyResult.valid) {
  console.error('ERROR: Archivo vacío de 0 bytes fue aceptado.');
  process.exit(1);
}
console.log('4. Archivo vacío rechazado correctamente.');

// 5. Cálculo y verificación de integridad criptográfica SHA-256
const sampleContent = 'UNIVERSIDAD - COMITE DE INVESTIGACIONES - DOCUMENTO DE PRUEBA 2026';
const hash1 = await computeFileSha256(sampleContent);
const hash2 = await computeFileSha256(sampleContent);

if (!hash1 || hash1.length !== 64) {
  console.error(`ERROR: Hash SHA-256 inválido: ${hash1}`);
  process.exit(1);
}

if (hash1 !== hash2) {
  console.error('ERROR: El cálculo de SHA-256 no es determinista.');
  process.exit(1);
}

const differentContent = sampleContent + ' MODIFICADO';
const hashDiff = await computeFileSha256(differentContent);

if (hash1 === hashDiff) {
  console.error('ERROR: Dos contenidos distintos generaron el mismo hash SHA-256.');
  process.exit(1);
}

console.log(`5. Cálculo de hash SHA-256 verificado: ${hash1.substring(0, 24)}... (64 caracteres hex).`);
console.log('--- ¡Todas las pruebas de T2.3 y T2.4 (Validación de documentos y SHA-256) pasaron exitosamente! ---');
