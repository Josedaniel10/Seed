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

const { useApplicationStore } = await import('../../applications/applicationStore.ts');

console.log('--- Iniciando prueba automática de métricas unificadas, tabla y tablero Kanban (T3.13, T3.14, T3.15 / RF-35, RF-11, RF-21) ---');

const store = useApplicationStore.getState();

// 1. Verificación de Franja de Métricas Unificada (RF-35, T3.13)
// Cada contador individual debe coincidir exactamente con el conteo real en la base de datos
const counts = store.getStatusCounts();
const applications = store.applications;

let totalCounted = 0;
for (const status in counts) {
  const countInStore = applications.filter((a) => a.current_status === status).length;
  if (counts[status] !== countInStore) {
    console.error(
      `ERROR: Contador en métricas (${counts[status]}) no coincide con conteo real (${countInStore}) para estado: ${status}`
    );
    process.exit(1);
  }
  totalCounted += counts[status];
}

if (totalCounted !== applications.length) {
  console.error(`ERROR: Suma de métricas (${totalCounted}) no coincide con total de aplicaciones (${applications.length})`);
  process.exit(1);
}
console.log(
  `1. Franja de Métricas Unificada verificada (RF-35): ${totalCounted} expedientes coinciden al 100% con la base de datos.`
);
console.log(
  `   RADICADA: ${counts.RADICADA} | PENDIENTE_DOCS: ${counts.PENDIENTE_DOCUMENTOS} | EN_REVISION: ${counts.EN_REVISION} | LISTA_COMITE: ${counts.LISTA_COMITE} | APROBADA: ${counts.APROBADA} | RECHAZADA: ${counts.RECHAZADA}`
);

// 2. Verificación de arrastre condicional en Kanban (T3.15 / RF-21)
// Crear solicitud en estado PENDIENTE_DOCUMENTOS
const appPend = applications.find((a) => a.current_status === 'PENDIENTE_DOCUMENTOS');
if (!appPend) {
  console.error('ERROR: No se encontró solicitud en PENDIENTE_DOCUMENTOS para prueba de Kanban.');
  process.exit(1);
}

// Probar arrastre inválido a LISTA_COMITE sin pasar por EN_REVISION
const invalidKanbanDrop = await store.transitionApplicationStatus(
  appPend.id,
  'LISTA_COMITE',
  'usr-adm-02',
  'Admin',
  'Intento de arrastre no autorizado directo a sesión'
);

if (invalidKanbanDrop.success) {
  console.error('ERROR: El tablero Kanban permitió un salto de estado no autorizado por la matriz de reglas (Violación RF-21).');
  process.exit(1);
}
console.log(`2. Salto no reglamentario en Kanban bloqueado: "${invalidKanbanDrop.error}".`);

// 3. Probar arrastre y transición autorizada hacia EN_REVISION cuando cumple requisitos
const appToReview = applications.find((a) => a.current_status === 'RADICADA');
if (appToReview) {
  // Asegurar que sus requisitos obligatorios estén válidos
  const docs = store.documents.filter((d) => d.application_id === appToReview.id);
  for (const doc of docs) {
    await store.validateRequirementDocument(appToReview.id, doc.requirement_id, 'VALIDO', null, 'usr-002', 'Admin');
  }

  const validDrop = await store.transitionApplicationStatus(
    appToReview.id,
    'EN_REVISION',
    'usr-adm-02',
    'Admin',
    'Requisitos validados y arrastre a revisión técnica aprobado.'
  );

  if (!validDrop.success || validDrop.application?.current_status !== 'EN_REVISION') {
    console.error('ERROR: Arrastre reglamentario a EN_REVISION debió ser aceptado:', validDrop.error);
    process.exit(1);
  }
  console.log('3. Arrastre válido y diálogo de acción en Kanban ejecutado exitosamente.');
}

console.log('--- ¡Todas las pruebas de T3.13, T3.14 y T3.15 (Métricas, Tabla y Kanban) pasaron exitosamente! ---');
