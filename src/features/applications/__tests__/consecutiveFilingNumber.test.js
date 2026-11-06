// Mock de localStorage en globalThis para Node.js
const mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};

const { useApplicationStore } = await import('../applicationStore.ts');

console.log('--- Iniciando prueba automática de número consecutivo ininterrumpido (T2.2 / RF-08) ---');

// 1. Verificar consecutivo individual inicial
const store = useApplicationStore.getState();
const firstFilingNumber = await store.generateNextFilingNumber(2026);

if (!firstFilingNumber.startsWith('Radicado 2026-')) {
  console.error(`ERROR: Formato de radicado inválido: ${firstFilingNumber}`);
  process.exit(1);
}
console.log(`1. Generación individual verificada: ${firstFilingNumber}`);

// 2. Simulación de 10 radicaciones simultáneas concurrentes (Promise.all)
console.log('2. Ejecutando 10 solicitudes simultáneas concurrentes...');
const concurrentPromises = Array.from({ length: 10 }, () =>
  store.generateNextFilingNumber(2026)
);

const results = await Promise.all(concurrentPromises);

console.log('Resultados obtenidos:');
results.forEach((num, idx) => console.log(`   [Petición ${idx + 1}] -> ${num}`));

// 3. Verificar que NO haya colisiones (todos los radicados deben ser únicos)
const uniqueNumbers = new Set(results);
if (uniqueNumbers.size !== results.length) {
  console.error(
    `ERROR: Se detectaron colisiones en generación concurrente. Generados: ${results.length}, Únicos: ${uniqueNumbers.size}`
  );
  process.exit(1);
}
console.log('3. ¡Cero colisiones verificadas! Los 10 radicados concurrentes son estrictamente únicos.');

// 4. Verificar orden consecutivo ininterrumpido (sin saltos ni duplicados)
const sequenceNumbers = results.map((r) => parseInt(r.replace('Radicado 2026-', ''), 10));
for (let i = 1; i < sequenceNumbers.length; i++) {
  const diff = sequenceNumbers[i] - sequenceNumbers[i - 1];
  if (diff !== 1) {
    console.error(
      `ERROR: Secuencia interrumpida entre ${results[i - 1]} y ${results[i]}. Diferencia: ${diff}`
    );
    process.exit(1);
  }
}

console.log(
  `4. Secuencia estrictamente ininterrumpida comprobada: del ${results[0]} al ${results[results.length - 1]}.`
);
console.log('--- ¡Todas las pruebas automáticas de T2.2 (Consecutivo ininterrumpido sin colisiones) pasaron exitosamente! ---');
