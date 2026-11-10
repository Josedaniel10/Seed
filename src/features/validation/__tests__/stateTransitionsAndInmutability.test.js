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

const { useApplicationStore, ALLOWED_TRANSITIONS } = await import('../../applications/applicationStore.ts');

console.log('--- Iniciando prueba automática de transiciones reglamentarias e inmutabilidad (T3.4, T3.5 / RF-21, RN-01, RN-05, RNF-03) ---');

const store = useApplicationStore.getState();

// 1. Verificar matriz reglamentaria de estados
if (!ALLOWED_TRANSITIONS.RADICADA.includes('EN_REVISION')) {
  console.error('ERROR: Matriz no contempla RADICADA -> EN_REVISION');
  process.exit(1);
}

if (ALLOWED_TRANSITIONS.RADICADA.includes('LISTA_COMITE')) {
  console.error('ERROR: Matriz permite salto prohibido RADICADA -> LISTA_COMITE (Debe pasar por revisión técnica)');
  process.exit(1);
}

if (ALLOWED_TRANSITIONS.CERRADA.length !== 0) {
  console.error('ERROR: CERRADA debe ser un estado final inmutable sin transiciones permitidas (RN-01)');
  process.exit(1);
}
console.log('1. Matriz de transiciones reglamentarias verificada formalmente.');

// 2. Intentar salto no autorizado: RADICADA directamente a LISTA_COMITE
const appRadicada = store.requests.find((a) => a.current_status === 'RADICADA');
if (!appRadicada) {
  console.error('ERROR: No hay solicitud en estado RADICADA para la prueba.');
  process.exit(1);
}

const invalidJump = await store.transitionApplicationStatus(
  appRadicada.id,
  'LISTA_COMITE',
  'usr-004',
  'Secretario',
  'Salto inválido directo'
);

if (invalidJump.success) {
  console.error('ERROR: Se permitió un salto de estado no autorizado por la matriz (Violación RF-21).');
  process.exit(1);
}
console.log(`2. Salto no autorizado bloqueado correctamente: "${invalidJump.error}".`);

// 3. Probar rechazo sin justificación escrita obligatoria (RN-05)
const rejectWithoutReason = await store.transitionApplicationStatus(
  appRadicada.id,
  'RECHAZADA',
  'usr-002',
  'Admin',
  '' // Justificación vacía
);

if (rejectWithoutReason.success) {
  console.error('ERROR: Se permitió rechazar sin justificación motivada por escrito (Violación RN-05).');
  process.exit(1);
}
console.log('3. Regla RN-05 comprobada: Rechazo sin justificación escrito fue rechazado.');

// 4. Probar rechazo con justificación válida
const validRejection = await store.transitionApplicationStatus(
  appRadicada.id,
  'RECHAZADA',
  'usr-002',
  'Admin',
  'Incumplimiento normativo del artículo 4 del estatuto de investigaciones.'
);

if (!validRejection.success || validRejection.application?.current_status !== 'RECHAZADA') {
  console.error('ERROR: Rechazo motivado debió ser aceptado:', validRejection.error);
  process.exit(1);
}
console.log('4. Rechazo motivado por escrito ejecutado y asentado correctamente.');

// 5. Probar inmutabilidad de la bitácora de auditoría (RNF-03, T3.5)
try {
  store.assertAuditHistoryImmutable('aud-001');
  console.error('ERROR: No se impidió la mutación de la bitácora de auditoría.');
  process.exit(1);
} catch (err) {
  if (!err.message.includes('RNF-03')) {
    console.error('ERROR: Mensaje de inmutabilidad no contiene RNF-03:', err.message);
    process.exit(1);
  }
  console.log(`5. Inmutabilidad estricta (Trigger append-only) verificada: "${err.message}".`);
}

console.log('--- ¡Todas las pruebas de T3.4 y T3.5 (Transiciones e Inmutabilidad) pasaron exitosamente! ---');
