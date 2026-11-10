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

console.log('--- Iniciando prueba automática de programación de sesiones y conformación de agenda (T4.1, T4.2, T4.3 / RF-24, RF-25, RF-26, RN-04) ---');

const sessionsStore = useCommitteeSessionsStore.getState();
const appStore = useApplicationStore.getState();

// 1. Probar Creación y Programación de Sesión con Consecutivo Anual (T4.1 / RF-24)
const createRes = await sessionsStore.createSession(
  {
    session_type: 'ORDINARIA',
    scheduled_at: '2026-12-05T09:00:00Z',
    location_or_url: 'Sala de Juntas de Vicerrectoría',
    quorum_required: 4,
  },
  'usr-004',
  'Secretaria Técnica'
);

if (!createRes.success || !createRes.session) {
  console.error('ERROR al programar sesión:', createRes.error);
  process.exit(1);
}

const newSession = createRes.session;
console.log(`1. Sesión programada exitosamente: "${newSession.session_number}" | Tipo: ${newSession.session_type} | Quórum requerido: ${newSession.quorum_required}`);

if (!newSession.session_number.includes('2026')) {
  console.error('ERROR: El número de sesión no incluye el año calendario.');
  process.exit(1);
}

// 2. Probar Regla RN-04: Solo solicitudes en LISTA_COMITE pueden ingresar a la agenda
// Crear una solicitud en estado RADICADA (no elegible)
const unreadyAppRes = await appStore.createApplication({
  application_type_id: 'apt-004', // Prórroga
  applicant_id: 'usr-001',
  applicant_name: 'Dra. Carmen Morales',
  title: 'Solicitud No Elegible para Agenda Directa',
  abstract: 'Intento de inclusión sin concepto técnico favorable ni lista de comité.',
  research_group_id: 'grp-001',
  documents: [
    {
      requirement_id: 'req-007',
      file_name: 'Doc1.pdf',
      file_path: 'path',
      file_size_bytes: 1000,
      file_hash_sha256: '9999999999999999999999999999999999999999999999999999999999999999',
      mime_type: 'application/pdf',
    },
    {
      requirement_id: 'req-008',
      file_name: 'Doc2.pdf',
      file_path: 'path',
      file_size_bytes: 1000,
      file_hash_sha256: '8888888888888888888888888888888888888888888888888888888888888888',
      mime_type: 'application/pdf',
    },
  ],
});

const unreadyAppId = unreadyAppRes.application.id;

const invalidAgendaAdd = await sessionsStore.addApplicationToAgenda(
  newSession.id,
  unreadyAppId,
  'usr-003',
  'usr-004',
  'Secretaria Técnica'
);

if (invalidAgendaAdd.success) {
  console.error('ERROR: Se permitió agregar a la agenda una solicitud que no está en LISTA_COMITE (Violación RN-04).');
  process.exit(1);
}
console.log(`2. Regla RN-04 comprobada: Inclusión denegada a solicitud no elegible: "${invalidAgendaAdd.error}".`);

// 3. Probar inclusión de solicitud elegible en LISTA_COMITE (sol-005 de la semilla está en LISTA_COMITE)
const readyApp = appStore.requests.find((a) => a.current_status === 'LISTA_COMITE');
if (!readyApp) {
  console.error('ERROR: No se encontró solicitud en LISTA_COMITE.');
  process.exit(1);
}

const validAgendaAdd = await sessionsStore.addApplicationToAgenda(
  newSession.id,
  readyApp.id,
  'usr-003', // Ponente asignado
  'usr-004',
  'Secretaria Técnica'
);

if (!validAgendaAdd.success || !validAgendaAdd.agendaItem) {
  console.error('ERROR al agregar solicitud elegible a la agenda:', validAgendaAdd.error);
  process.exit(1);
}
console.log(`3. Expediente ${readyApp.filing_number} incorporado en agenda con orden #${validAgendaAdd.agendaItem.agenda_order} y ponente "${validAgendaAdd.agendaItem.speaker_name}".`);

// 4. Probar Cierre de Agenda y Convocatoria Formal (T4.3 / RF-26)
const closeRes = await sessionsStore.closeAgendaAndSummon(
  newSession.id,
  'usr-004',
  'Secretaria Técnica'
);

if (!closeRes.success || !closeRes.session?.is_agenda_closed) {
  console.error('ERROR al cerrar la agenda:', closeRes.error);
  process.exit(1);
}
console.log('4. Agenda formalmente cerrada y convocatoria ejecutada (is_agenda_closed: true).');

// 5. Probar que tras cerrar la agenda NO se admiten más expedientes (RN-04)
const attemptAddAfterClose = await sessionsStore.addApplicationToAgenda(
  newSession.id,
  readyApp.id,
  'usr-003',
  'usr-004',
  'Secretaria Técnica'
);

if (attemptAddAfterClose.success) {
  console.error('ERROR: Se permitió agregar expediente con la agenda cerrada (Violación RN-04).');
  process.exit(1);
}
console.log(`5. Regla RN-04 comprobada: Bloqueo post-cierre de agenda verificado: "${attemptAddAfterClose.error}".`);

console.log('--- ¡Todas las pruebas de T4.1, T4.2 y T4.3 (Sesiones y Agenda) pasaron exitosamente! ---');
