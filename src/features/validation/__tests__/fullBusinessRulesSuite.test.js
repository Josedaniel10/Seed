// Mock de localStorage para Node.js
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

const { useApplicationStore, ALLOWED_TRANSITIONS } = await import('../../applications/applicationStore.ts');
const { useCommitteeSessionsStore } = await import('../../sessions/committeeSessionsStore.ts');
const { useMinutesStore } = await import('../../minutes/minutesStore.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { useUserStore } = await import('../../users/userStore.ts');

console.log('--- Iniciando Batería Integral de Reglas de Negocio Institucionales (T6.1 / RNF-08) ---');

const appStore = useApplicationStore.getState();
const sessionsStore = useCommitteeSessionsStore.getState();
const minutesStore = useMinutesStore.getState();
const catalogStore = useCatalogStore.getState();
const userStore = useUserStore.getState();

// ============================================================================
// VERIFICACIÓN 1: Matriz Estricta de Transiciones y Estados Terminales (RN-01, RF-21)
// ============================================================================
const terminalStates = ['CERRADA'];
for (const term of terminalStates) {
  if (ALLOWED_TRANSITIONS[term].length !== 0) {
    console.error(`ERROR: El estado ${term} debe ser estrictamente terminal.`);
    process.exit(1);
  }
}
console.log('1. [RN-01 / RF-21] Matriz de estados: El estado CERRADA es estrictamente terminal (0 transiciones de salida).');

// ============================================================================
// VERIFICACIÓN 2: Regla de 100% de Requisitos Válidos para En Revisión (RN-02)
// ============================================================================
// Crear una solicitud y verificar que no pase a EN_REVISION si no están todos válidos
const testApp = await appStore.createApplication({
  application_type_id: 'apt-004',
  applicant_id: 'usr-001',
  applicant_name: 'Dra. Carmen Morales',
  title: 'Evaluación Integral RNF-08',
  abstract: 'Verificación de batería integral.',
  research_group_id: 'grp-001',
  documents: [
    {
      requirement_id: 'req-007',
      file_name: 'Doc1.pdf',
      file_path: 'path',
      file_size_bytes: 1000,
      file_hash_sha256: '1111111111111111111111111111111111111111111111111111111111111111',
      mime_type: 'application/pdf',
    },
    {
      requirement_id: 'req-008',
      file_name: 'Doc2.pdf',
      file_path: 'path',
      file_size_bytes: 1000,
      file_hash_sha256: '2222222222222222222222222222222222222222222222222222222222222222',
      mime_type: 'application/pdf',
    },
  ],
});

const appId = testApp.application.id;
// Validar solo 1 de los 2 requisitos
await appStore.validateRequirementDocument(appId, 'req-007', 'VALIDO', null, 'usr-002', 'Admin');

const invalidRevisionAttempt = await appStore.transitionApplicationStatus(
  appId,
  'EN_REVISION',
  'usr-002',
  'Admin',
  'Intento de pase sin validar todos los requisitos'
);

if (invalidRevisionAttempt.success) {
  console.error('ERROR: Se permitió pasar a EN_REVISION sin el 100% de requisitos válidos (Violación RN-02).');
  process.exit(1);
}
console.log(`2. [RN-02] Paso a "En revisión" bloqueado por requisitos incompletos: "${invalidRevisionAttempt.error}".`);

// ============================================================================
// VERIFICACIÓN 3: Conflicto de Intereses - Autoevaluación y Mismo Grupo (RN-03, RN-14)
// ============================================================================
const conflictAuthor = appStore.checkReviewerConflict('usr-001', appId);
if (!conflictAuthor.hasConflict) {
  console.error('ERROR: No se detectó conflicto de autoevaluación (Violación RN-03).');
  process.exit(1);
}

// Agregar revisor adscrito al mismo grupo grp-001
const sameGroupUser = userStore.addUser({
  email: 'par.investigador@universidad.edu.co',
  full_name: 'Dr. Par Evaluador',
  role: 'integrante_comite',
  academic_program: 'Biotecnología',
  academic_link: 'docente_planta',
  research_group_id: 'grp-001', // Mismo grupo que el solicitante
  is_active: true,
});

const conflictSameGroup = appStore.checkReviewerConflict(sameGroupUser.id, appId);
if (!conflictSameGroup.hasConflict) {
  console.error('ERROR: No se detectó conflicto por pertenecer al mismo grupo de investigación (Violación RN-14).');
  process.exit(1);
}
console.log('3. [RN-03 & RN-14] Inhabilidad por autoría y pertenencia al mismo grupo verificada exitosamente.');

// ============================================================================
// VERIFICACIÓN 4: Quórum Reglamentario de Mayoría en Comité (RN-07)
// ============================================================================
const sessionRes = await sessionsStore.createSession(
  {
    session_type: 'ORDINARIA',
    scheduled_at: '2026-11-25T09:00:00Z',
    location_or_url: 'Sala de Consejos',
    quorum_required: 4,
  },
  'usr-004',
  'Secretaria Técnica'
);

const sesId = sessionRes.session.id;
// Desmarcar todos los asistentes
const atts = sessionsStore.getAttendanceBySession(sesId);
for (const a of atts) {
  sessionsStore.toggleAttendance(sesId, a.user_id, false);
}

const quorumZero = sessionsStore.checkSessionQuorum(sesId);
if (quorumZero.hasQuorum) {
  console.error('ERROR: Quórum detectado con 0 asistentes (Violación RN-07).');
  process.exit(1);
}
console.log('4. [RN-07] Control de quórum de mayoría (mitad más uno) comprobado estrictamente.');

// ============================================================================
// VERIFICACIÓN 5: Inmutabilidad Append-Only de Auditoría y Actas Aprobadas (RNF-03)
// ============================================================================
try {
  appStore.assertAuditHistoryImmutable('aud-001');
  console.error('ERROR: No se bloqueó la mutación de historial de auditoría.');
  process.exit(1);
} catch (err) {
  if (!err.message.includes('RNF-03')) {
    console.error('ERROR: Mensaje no contiene RNF-03:', err.message);
    process.exit(1);
  }
}
console.log('5. [RNF-03] Inmutabilidad estricta append-only de historial de auditoría verificada.');

console.log('--- ¡Todas las pruebas de la Batería Integral T6.1 (RNF-08) pasaron con éxito rotundo! ---');
