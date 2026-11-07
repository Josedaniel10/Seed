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

const { useCommitteeSessionsStore } = await import('../committeeSessionsStore.ts');
const { useApplicationStore } = await import('../../applications/applicationStore.ts');

console.log('--- Iniciando prueba automática de quórum, decisiones y trazabilidad post-decisión (T4.4, T4.5, T4.6 / RF-27, RF-28, RN-05, RN-06, RN-07) ---');

const sessionsStore = useCommitteeSessionsStore.getState();
const appStore = useApplicationStore.getState();

// Preparar sesión y solicitud para deliberación
const sessionRes = await sessionsStore.createSession(
  {
    session_type: 'ORDINARIA',
    scheduled_at: '2026-11-20T10:00:00Z',
    location_or_url: 'Sala de Consejos Académicos',
    quorum_required: 4, // 4 de 7 requeridos
  },
  'usr-004',
  'Secretaria Técnica'
);

const testSessionId = sessionRes.session.id;

// Obtener o preparar solicitud en LISTA_COMITE
const app = appStore.applications.find((a) => a.current_status === 'LISTA_COMITE');
if (!app) {
  console.error('ERROR: No hay solicitud en LISTA_COMITE.');
  process.exit(1);
}

// Incorporar a la agenda
await sessionsStore.addApplicationToAgenda(
  testSessionId,
  app.id,
  'usr-003',
  'usr-004',
  'Secretaria Técnica'
);

// 1. Probar RN-07: Bloqueo estricto de decisiones cuando NO hay quórum reglamentario
// Marcar a todos los asistentes como ausentes (asistentes = 0, requerido = 4)
const attendances = sessionsStore.getAttendanceBySession(testSessionId);
for (const att of attendances) {
  sessionsStore.toggleAttendance(testSessionId, att.user_id, false);
}

const quorumWithoutAttendees = sessionsStore.checkSessionQuorum(testSessionId);
if (quorumWithoutAttendees.hasQuorum) {
  console.error('ERROR: El sistema reportó quórum con 0 asistentes.');
  process.exit(1);
}
console.log(`1. Sin quórum verificado: ${quorumWithoutAttendees.attendedCount} de ${quorumWithoutAttendees.requiredCount} requeridos.`);

const attemptDecisionWithoutQuorum = await sessionsStore.registerSessionDecision(
  testSessionId,
  app.id,
  'APROBADA',
  'Justificación motivada pero sin quórum presente.',
  'usr-004',
  'Secretaria Técnica'
);

if (attemptDecisionWithoutQuorum.success) {
  console.error('ERROR: Se permitió registrar decisión sin quórum reglamentario (Violación RN-07).');
  process.exit(1);
}
console.log(`2. Regla RN-07 comprobada: Votación bloqueada por falta de quórum: "${attemptDecisionWithoutQuorum.error}".`);

// 2. Establecer quórum reglamentario (marcar 4 asistentes)
for (let i = 0; i < 4; i++) {
  sessionsStore.toggleAttendance(testSessionId, attendances[i].user_id, true);
}

const quorumWithAttendees = sessionsStore.checkSessionQuorum(testSessionId);
if (!quorumWithAttendees.hasQuorum) {
  console.error('ERROR: No se reconoció el quórum con 4 asistentes.');
  process.exit(1);
}
console.log(`3. Quórum reglamentario alcanzado: ${quorumWithAttendees.attendedCount} de ${quorumWithAttendees.requiredCount} requeridos.`);

// 3. Probar RN-05: Decisión exige justificación escrita obligatoria
const decisionWithoutJustification = await sessionsStore.registerSessionDecision(
  testSessionId,
  app.id,
  'APROBADA',
  '', // Sin motivación
  'usr-004',
  'Secretaria Técnica'
);

if (decisionWithoutJustification.success) {
  console.error('ERROR: Se permitió registrar decisión colegiada sin justificación escrita (Violación RN-05).');
  process.exit(1);
}
console.log(`4. Regla RN-05 comprobada: Bloqueo de decisión sin justificación motivada: "${decisionWithoutJustification.error}".`);

// 4. Probar RN-06: Decisión APLAZADA preserva la solicitud en LISTA_COMITE para la siguiente sesión
const aplazadaRes = await sessionsStore.registerSessionDecision(
  testSessionId,
  app.id,
  'APLAZADA',
  'Se aplaza la deliberación a solicitud del decano por falta de concepto financiero complementario.',
  'usr-004',
  'Secretaria Técnica'
);

if (!aplazadaRes.success) {
  console.error('ERROR al registrar decisión APLAZADA:', aplazadaRes.error);
  process.exit(1);
}

const appAfterAplazada = useApplicationStore.getState().getApplicationById(app.id);
if (appAfterAplazada.current_status !== 'LISTA_COMITE') {
  console.error(`ERROR: Decisión APLAZADA no preservó el estado LISTA_COMITE (RN-06). Estado actual: ${appAfterAplazada.current_status}`);
  process.exit(1);
}
console.log('5. Regla RN-06 comprobada: Decisión "APLAZADA" preservó el expediente en estado LISTA_COMITE para la siguiente sesión.');

// 5. Probar Decisión APROBADA y actualización automática de estado y trazabilidad post-decisión (T4.6 / RF-28, RF-23)
const aprobadaRes = await sessionsStore.registerSessionDecision(
  testSessionId,
  app.id,
  'APROBADA',
  'El comité de investigación aprueba por unanimidad el trámite con base en la sustentación del ponente.',
  'usr-004',
  'Secretaria Técnica'
);

if (!aprobadaRes.success) {
  console.error('ERROR al registrar decisión APROBADA:', aprobadaRes.error);
  process.exit(1);
}

const appAfterAprobada = useApplicationStore.getState().getApplicationById(app.id);
if (appAfterAprobada.current_status !== 'APROBADA') {
  console.error(`ERROR: La solicitud no transitó automáticamente a APROBADA (T4.6). Estado: ${appAfterAprobada.current_status}`);
  process.exit(1);
}
console.log(`6. Regla RF-28 comprobada: La solicitud transitó a estado "${appAfterAprobada.current_status}" tras decisión colegiada.`);

// 6. Verificar bitácora de auditoría inmutable (RF-23)
const auditEvents = useApplicationStore.getState().getAuditHistoryByApplication(app.id);
const decisionAudit = auditEvents.find((e) => e.new_status === 'APROBADA');
if (!decisionAudit) {
  console.error('ERROR: No se encontró evento de auditoría para la decisión del comité (Violación RF-23).');
  process.exit(1);
}
console.log(`7. Trazabilidad inmutable verificada (RF-23): Evento [${decisionAudit.action}] registrado en fecha ${decisionAudit.created_at}.`);

console.log('--- ¡Todas las pruebas de T4.4, T4.5 y T4.6 (Quórum, Decisiones y Trazabilidad) pasaron exitosamente! ---');
