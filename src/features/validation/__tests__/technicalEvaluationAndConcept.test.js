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

console.log('--- Iniciando prueba automática de evaluación técnica, conceptos y plazos (T3.9, T3.10, T3.11, T3.12 / RF-17, RF-18, RF-19, RF-20, RF-22) ---');

const store = useApplicationStore.getState();

// Solicitud en revisión: sol-003
const appId = 'sol-003';

// 1. Registro de observación técnica clasificada (RF-17)
const obsRes = await store.addTechnicalObservation(
  appId,
  'usr-003',
  'Dr. Alejandro Restrepo',
  'AJUSTE_OBLIGATORIO',
  'Se debe incluir la certificación de calibración vigente de los equipos de cromatografía.'
);

if (!obsRes.success || !obsRes.observation) {
  console.error('ERROR al registrar observación técnica:', obsRes.error);
  process.exit(1);
}
const obsId = obsRes.observation.id;
console.log(`1. Observación técnica clasificada registrada: [${obsRes.observation.category}] "${obsRes.observation.content.substring(0, 45)}..."`);

// 2. Respuesta formal del investigador y resolución (RF-18)
const respRes = await store.respondToObservation(
  obsId,
  'Se anexó la certificación emitida por el laboratorio central de metrología con fecha enero 2026.',
  'usr-001',
  'Dra. Carmen Morales'
);

if (!respRes.success || !respRes.observation?.is_resolved) {
  console.error('ERROR al responder a la observación técnica:', respRes.error);
  process.exit(1);
}
console.log('2. Respuesta formal de ajustes y resolución de observación verificada exitosamente.');

// 3. Monitor de seguimiento de plazos y vencimientos (RF-22, T3.12)
const deadlineStatus = store.getDeadlineStatus(appId);
if (deadlineStatus.daysRemaining === undefined || typeof deadlineStatus.isOverdue !== 'boolean') {
  console.error('ERROR: Monitor de plazos devolvió estructura inválida:', deadlineStatus);
  process.exit(1);
}
console.log(`3. Monitor de plazos verificado: ${deadlineStatus.description} (Días restantes: ${deadlineStatus.daysRemaining}, Vencida: ${deadlineStatus.isOverdue})`);

// 4. Emisión de concepto sin justificación -> Debe ser rechazado (RN-05)
const conceptNoReason = await store.submitReviewerConcept(
  appId,
  'usr-003',
  'Dr. Alejandro Restrepo',
  'FAVORABLE',
  '' // Sin justificación
);

if (conceptNoReason.success) {
  console.error('ERROR: Se permitió emitir concepto técnico sin justificación motivada (Violación RN-05).');
  process.exit(1);
}
console.log('4. Regla RN-05 comprobada: Concepto técnico sin justificación escrita fue rechazado.');

// 5. Emisión de concepto favorable y pase a LISTA_COMITE (RF-19, RF-20, T3.11)
const validConcept = await store.submitReviewerConcept(
  appId,
  'usr-003',
  'Dr. Alejandro Restrepo',
  'FAVORABLE',
  'La propuesta técnica y metodológica cumple a cabalidad con los estándares de rigor científico institucional.'
);

if (!validConcept.success || validConcept.application?.current_status !== 'LISTA_COMITE') {
  console.error(
    `ERROR: Concepto favorable debió transitar la solicitud a LISTA_COMITE (RF-20). Obtenido: ${validConcept.application?.current_status}`
  );
  process.exit(1);
}
console.log('5. Regla RF-20 comprobada: Emisión de concepto favorable transitó la solicitud a "LISTA_COMITE".');

// 6. Verificar que la decisión y concepto quedaron registrados en el historial inmutable
const history = store.getAuditHistoryByApplication(appId);
const lastEvent = history[history.length - 1];
if (lastEvent.action !== 'TRANSICION_ESTADO_LISTA_COMITE') {
  console.error('ERROR: El historial no registró la transición a LISTA_COMITE:', lastEvent);
  process.exit(1);
}
console.log(`6. Registro en bitácora inmutable verificado: [${lastEvent.action}]`);

console.log('--- ¡Todas las pruebas de T3.9, T3.10, T3.11 y T3.12 (Evaluación técnica y conceptos) pasaron exitosamente! ---');
