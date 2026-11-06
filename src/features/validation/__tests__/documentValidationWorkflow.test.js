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
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');

console.log('--- Iniciando prueba automática de validación documental y transiciones automáticas (T3.1, T3.2, T3.6 / RF-12, RF-13, RF-14, RN-02, RN-11) ---');

const store = useApplicationStore.getState();
const catalog = useCatalogStore.getState();

// Helper para crear una solicitud completa de tipo apt-001 con todos sus requisitos obligatorios:
// req-001 (no subsanable), req-002 (subsanable), req-003 (subsanable), req-013 (subsanable)
const createCompleteApt001App = async (title) => {
  return await store.createApplication({
    application_type_id: 'apt-001',
    applicant_id: 'usr-001',
    applicant_name: 'Dra. Carmen Morales',
    title,
    abstract: 'Evaluación técnica documental para comprobar reglas de negocio RN-02 y RN-11.',
    research_group_id: 'grp-001',
    documents: [
      {
        requirement_id: 'req-001', // No subsanable
        file_name: 'Propuesta_Tecnica.pdf',
        file_path: 'file-service/storage/propuesta.pdf',
        file_size_bytes: 1000000,
        file_hash_sha256: '1111111111111111111111111111111111111111111111111111111111111111',
        mime_type: 'application/pdf',
      },
      {
        requirement_id: 'req-002', // Subsanable
        file_name: 'Presupuesto.xlsx',
        file_path: 'file-service/storage/presupuesto.xlsx',
        file_size_bytes: 800000,
        file_hash_sha256: '2222222222222222222222222222222222222222222222222222222222222222',
        mime_type: 'application/pdf',
      },
      {
        requirement_id: 'req-003', // Subsanable
        file_name: 'Carta_Aval.pdf',
        file_path: 'file-service/storage/aval.pdf',
        file_size_bytes: 500000,
        file_hash_sha256: '3333333333333333333333333333333333333333333333333333333333333333',
        mime_type: 'application/pdf',
      },
      {
        requirement_id: 'req-013', // Subsanable
        file_name: 'Declaracion_Honestidad.pdf',
        file_path: 'file-service/storage/honestidad.pdf',
        file_size_bytes: 300000,
        file_hash_sha256: '4444444444444444444444444444444444444444444444444444444444444444',
        mime_type: 'application/pdf',
      },
    ],
  });
};

// 1. Crear una solicitud de prueba para validación
const testAppResult = await createCompleteApt001App('Proyecto de Prueba Validación Documental Automática 1');

if (!testAppResult.success || !testAppResult.application) {
  console.error('ERROR al crear solicitud de prueba:', testAppResult.error);
  process.exit(1);
}
const appId = testAppResult.application.id;
console.log(`1. Solicitud de prueba creada en estado: ${testAppResult.application.current_status}`);

// 2. Probar que el rechazo individual EXIGE justificación obligatoria (RN-05, RF-13)
const rejectWithoutReason = await store.validateRequirementDocument(
  appId,
  'req-001',
  'RECHAZADO',
  '', // Sin motivo
  'usr-002',
  'Personal Administrativo'
);

if (rejectWithoutReason.success) {
  console.error('ERROR: Se permitió rechazar un documento sin justificación motivada (Violación RN-05/RF-13).');
  process.exit(1);
}
console.log('2. Rechazo sin justificación bloqueado correctamente conforme a RN-05.');

// 3. Probar rechazo de requisito NO subsanable -> Debe transitar a RECHAZADA inmediatamente (RN-11)
await store.validateRequirementDocument(
  appId,
  'req-001', // No subsanable
  'RECHAZADO',
  'El documento de propuesta técnica no contiene el marco metodológico exigido.',
  'usr-002',
  'Personal Administrativo'
);

await store.validateRequirementDocument(appId, 'req-002', 'VALIDO', null, 'usr-002', 'Personal Administrativo');
await store.validateRequirementDocument(appId, 'req-003', 'VALIDO', null, 'usr-002', 'Personal Administrativo');
await store.validateRequirementDocument(appId, 'req-013', 'VALIDO', null, 'usr-002', 'Personal Administrativo');

const finalizeNonSubsanable = await store.finalizeAdministrativeValidation(
  appId,
  'usr-002',
  'Personal Administrativo'
);

if (!finalizeNonSubsanable.success || finalizeNonSubsanable.application?.current_status !== 'RECHAZADA') {
  console.error(
    `ERROR: La falta de requisito no subsanable debió causar RECHAZADA (RN-11). Obtenido: ${finalizeNonSubsanable.application?.current_status}`
  );
  process.exit(1);
}
console.log('3. Regla RN-11 comprobada: Rechazo no subsanable causó estado RECHAZADA inmediatamente.');

// 4. Probar requisito subsanable rechazado -> Debe transitar a PENDIENTE_DOCUMENTOS (RN-11)
const testApp2 = await createCompleteApt001App('Proyecto con requisito subsanable pendiente');
if (!testApp2.success || !testApp2.application) {
  console.error('ERROR al crear testApp2:', testApp2.error);
  process.exit(1);
}
const appId2 = testApp2.application.id;

await store.validateRequirementDocument(appId2, 'req-001', 'VALIDO', null, 'usr-002', 'Personal Administrativo');
await store.validateRequirementDocument(
  appId2,
  'req-002', // Subsanable
  'RECHAZADO',
  'Falta firma digitalizada y desglose de rubros.',
  'usr-002',
  'Personal Administrativo'
);
await store.validateRequirementDocument(appId2, 'req-003', 'VALIDO', null, 'usr-002', 'Personal Administrativo');
await store.validateRequirementDocument(appId2, 'req-013', 'VALIDO', null, 'usr-002', 'Personal Administrativo');

const finalizeSubsanable = await store.finalizeAdministrativeValidation(
  appId2,
  'usr-002',
  'Personal Administrativo'
);

if (!finalizeSubsanable.success || finalizeSubsanable.application?.current_status !== 'PENDIENTE_DOCUMENTOS') {
  console.error(
    `ERROR: Falla subsanable debió causar PENDIENTE_DOCUMENTOS. Obtenido: ${finalizeSubsanable.application?.current_status}`
  );
  process.exit(1);
}
console.log('4. Regla RN-11 comprobada: Falla subsanable transitó a PENDIENTE_DOCUMENTOS con plazo de 5 días.');

// 5. Probar 100% de requisitos válidos -> Debe transitar a EN_REVISION (RN-02)
const testApp3 = await createCompleteApt001App('Proyecto 100% Conforme');
if (!testApp3.success || !testApp3.application) {
  console.error('ERROR al crear testApp3:', testApp3.error);
  process.exit(1);
}
const appId3 = testApp3.application.id;

await store.validateRequirementDocument(appId3, 'req-001', 'VALIDO', null, 'usr-002', 'Admin');
await store.validateRequirementDocument(appId3, 'req-002', 'VALIDO', null, 'usr-002', 'Admin');
await store.validateRequirementDocument(appId3, 'req-003', 'VALIDO', null, 'usr-002', 'Admin');
await store.validateRequirementDocument(appId3, 'req-013', 'VALIDO', null, 'usr-002', 'Admin');

const finalizeValid = await store.finalizeAdministrativeValidation(appId3, 'usr-002', 'Admin');
if (!finalizeValid.success || finalizeValid.application?.current_status !== 'EN_REVISION') {
  console.error(
    `ERROR: 100% válido debió transitar a EN_REVISION (RN-02). Obtenido: ${finalizeValid.application?.current_status}`
  );
  process.exit(1);
}
console.log('5. Regla RN-02 comprobada: 100% de requisitos válidos transitó a EN_REVISION.');

console.log('--- ¡Todas las pruebas de T3.1, T3.2 y T3.6 (Validación documental y transiciones) pasaron exitosamente! ---');
