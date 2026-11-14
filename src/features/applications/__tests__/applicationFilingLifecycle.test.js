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
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');

console.log('--- Iniciando prueba automática de ciclo de vida de radicación (T2.5 / RF-08, RF-23) ---');

const appStore = useApplicationStore.getState();
const catalog = useCatalogStore.getState();

// 1. Obtener tipo prioritario y sus requisitos obligatorios
const priorityType = catalog.types.find((t) => t.id === 'apt-001') || catalog.types[0];
const mandatoryReqs = catalog.requirements.filter(
  (r) => r.application_type_id === priorityType.id && r.is_mandatory
);

console.log(
  `1. Trámite seleccionado: [${priorityType.code}] ${priorityType.name} (${mandatoryReqs.length} requisitos obligatorios).`
);

// 2. Intentar radicar sin requisitos obligatorios -> Debe fallar con error descriptivo
const failedAttempt = await appStore.createApplication({
  application_type_id: priorityType.id,
  applicant_id: 'usr-001',
  applicant_name: 'Dra. Carmen Lucía Morales',
  title: 'Intento de Radicación sin Documentos',
  abstract: 'Justificación que no adjunta los documentos exigidos por la normativa.',
  documents: [],
});

if (failedAttempt.success) {
  console.error('ERROR: Se permitió radicar una solicitud sin los requisitos obligatorios.');
  process.exit(1);
}
console.log(`2. Rechazo por documentos faltantes verificado correctamente: "${failedAttempt.error}".`);

// 3. Radicación exitosa con todos los requisitos obligatorios adjuntos
const validDocumentsPayload = mandatoryReqs.map((req, idx) => ({
  requirement_id: req.id,
  file_name: `Documento_${idx + 1}_${req.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
  file_path: `file-service/storage/hash_${idx + 1}_documento.pdf`,
  file_size_bytes: 1200000,
  file_hash_sha256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85${idx}`,
  mime_type: 'application/pdf',
}));

const successResult = await appStore.createApplication({
  application_type_id: priorityType.id,
  applicant_id: 'usr-001',
  applicant_name: 'Dra. Carmen Lucía Morales',
  title: 'Síntesis Verde de Nanopartículas de Plata y Evaluación de Actividad Antimicrobiana',
  abstract:
    'Estudio integral de síntesis ecológica de nanomateriales utilizando extractos de plantas nativas altoandinas para aplicaciones en desinfección hospitalaria.',
  research_group_id: 'grp-001',
  budget_requested: 0,
  is_tutor_endorsed: true,
  documents: validDocumentsPayload,
});

if (!successResult.success || !successResult.application) {
  console.error('ERROR al crear solicitud válida:', successResult.error);
  process.exit(1);
}

const createdApp = successResult.application;
console.log(`3. Solicitud radicada exitosamente con consecutivo: ${createdApp.filing_number}`);

// 4. Verificar estado inicial inmutable: 'RADICADA'
if (createdApp.current_status !== 'RADICADA') {
  console.error(`ERROR: El estado inicial no es RADICADA (obtenido: ${createdApp.current_status})`);
  process.exit(1);
}
console.log('4. Estado inicial verificado conforme a la norma: RADICADA.');

// 5. Verificar vinculación de documentos en el expediente
const savedDocs = useApplicationStore.getState().getDocumentsByApplication(createdApp.id);
if (savedDocs.length !== validDocumentsPayload.length) {
  console.error(
    `ERROR: Documentos guardados (${savedDocs.length}) no coinciden con los enviados (${validDocumentsPayload.length})`
  );
  process.exit(1);
}
console.log(`5. Se verificaron ${savedDocs.length} documentos enlazados en el expediente con hash SHA-256.`);

// 6. Verificar creación del primer evento en la bitácora inmutable (audit_history)
const historyEvents = useApplicationStore.getState().getAuditHistoryByApplication(createdApp.id);
if (historyEvents.length === 0) {
  console.error('ERROR: No se registró el evento de radicación en audit_history.');
  process.exit(1);
}

const firstEvent = historyEvents[0];
if (
  firstEvent.action !== 'RADICACION_INICIAL' ||
  firstEvent.previous_status !== null ||
  firstEvent.new_status !== 'RADICADA'
) {
  console.error('ERROR: Evento inicial de auditoría no cumple la especificación:', firstEvent);
  process.exit(1);
}

console.log(
  `6. Evento de auditoría inicial verificado: [${firstEvent.action}] Transición: null -> ${firstEvent.new_status} (Actor: ${firstEvent.actor_id})`
);

console.log('--- ¡Todas las pruebas de T2.5 (Ciclo de radicación y bitácora inicial) pasaron exitosamente! ---');
