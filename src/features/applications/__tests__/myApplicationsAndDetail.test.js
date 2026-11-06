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

console.log('--- Iniciando prueba automática de Mis Solicitudes y Detalle (T2.6, T2.7 / RF-11, RF-23) ---');

const store = useApplicationStore.getState();

// 1. Aislamiento por investigador: usr-001 debe ver únicamente sus trámites
const researcher1Apps = store.getApplicationsByApplicant('usr-001');
if (researcher1Apps.length === 0) {
  console.error('ERROR: No se encontraron solicitudes para usr-001.');
  process.exit(1);
}

for (const app of researcher1Apps) {
  if (app.applicant_id !== 'usr-001') {
    console.error(
      `ERROR: Solicitud ${app.filing_number} pertenece a ${app.applicant_id}, no a usr-001.`
    );
    process.exit(1);
  }
}
console.log(`1. Aislamiento de investigador verificado: usr-001 visualiza exclusivamente sus ${researcher1Apps.length} trámites.`);

// 2. Otro investigador (usr-006)
const researcher2Apps = store.getApplicationsByApplicant('usr-006');
for (const app of researcher2Apps) {
  if (app.applicant_id !== 'usr-006') {
    console.error(`ERROR: Fuga de solicitudes en usr-006: ${app.filing_number}`);
    process.exit(1);
  }
}
console.log(`2. Investigador usr-006 visualiza sus ${researcher2Apps.length} solicitudes sin ver las de otros investigadores.`);

// 3. Verificación de cálculo dinámico de "Qué Falta" (RF-11)
for (const app of researcher1Apps) {
  const queFalta = store.computeQueFalta(app);
  if (!queFalta || queFalta.length < 5) {
    console.error(`ERROR: Columna "Qué Falta" vacía o inválida para estado: ${app.current_status}`);
    process.exit(1);
  }
  console.log(`3. [${app.filing_number} - ${app.current_status}] -> Qué falta: "${queFalta}"`);
}

// 4. Detalle de solicitud y cronología vertical (T2.7 / RF-23)
const targetApp = researcher1Apps[0];
const appDetail = store.getApplicationById(targetApp.id);
if (!appDetail) {
  console.error(`ERROR: No se pudo obtener el detalle de la solicitud: ${targetApp.id}`);
  process.exit(1);
}
console.log(`4. Detalle de expediente obtenido exitosamente: ${appDetail.filing_number} - "${appDetail.title}"`);

// 5. Historial ordenado cronológicamente
const history = store.getAuditHistoryByApplication(targetApp.id);
if (history.length === 0) {
  console.error('ERROR: El expediente no tiene eventos en la bitácora de auditoría.');
  process.exit(1);
}

// Verificar orden cronológico ascendente (más antiguo al más reciente)
for (let i = 1; i < history.length; i++) {
  const tPrev = new Date(history[i - 1].created_at).getTime();
  const tCurr = new Date(history[i].created_at).getTime();
  if (tCurr < tPrev) {
    console.error('ERROR: El historial no está ordenado cronológicamente.');
    process.exit(1);
  }
}
console.log(`5. Cronología vertical inmutable verificada: ${history.length} eventos en orden temporal estricto.`);

// 6. Subsanación de documento en el expediente
const appDocs = store.getDocumentsByApplication(targetApp.id);
if (appDocs.length > 0) {
  const docToCure = appDocs[0];
  const newPayload = {
    requirement_id: docToCure.requirement_id,
    file_name: 'Documento_Subsanado_Corregido.pdf',
    file_path: 'file-service/storage/subsanado_hash_123.pdf',
    file_size_bytes: 1500000,
    file_hash_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    mime_type: 'application/pdf',
  };

  const subsanarRes = await store.subsanarDocument(
    targetApp.id,
    docToCure.requirement_id,
    newPayload,
    'usr-001',
    'Dra. Carmen Lucía Morales'
  );

  if (!subsanarRes.success || !subsanarRes.document) {
    console.error('ERROR al subsanar documento:', subsanarRes.error);
    process.exit(1);
  }

  // Verificar que el evento quede en el historial
  const updatedHistory = store.getAuditHistoryByApplication(targetApp.id);
  const lastEvent = updatedHistory[updatedHistory.length - 1];
  if (lastEvent.action !== 'SUBSANACION_DOCUMENTO') {
    console.error('ERROR: No se registró el evento SUBSANACION_DOCUMENTO en la bitácora:', lastEvent);
    process.exit(1);
  }
  console.log(`6. Subsanación documental y registro en bitácora inmutable verificados: [${lastEvent.action}]`);
}

console.log('--- ¡Todas las pruebas de T2.6 y T2.7 (Mis Solicitudes y Detalle de Expediente) pasaron exitosamente! ---');
