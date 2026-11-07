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

const { useNotificationsStore } = await import('../notificationsStore.ts');

console.log('--- Iniciando prueba automática de notificaciones internas y correo institucional (T5.6, T5.7 / RF-33, RF-34) ---');

const notifStore = useNotificationsStore.getState();

// 1. Probar emisión de notificación interna (T5.6 / RF-33)
const newNotif = notifStore.addNotification({
  user_id: 'usr-001',
  type: 'DECISION_COMITE',
  title: 'Decisión Oficial de Aval Emitida',
  message: 'El Comité de Investigaciones aprobó su solicitud de Aval Institucional para el Radicado 2026-001.',
  application_id: 'sol-001',
  filing_number: 'Radicado 2026-001',
  email_recipient: 'investigador@universidad.edu.co',
});

if (!newNotif || !newNotif.id) {
  console.error('ERROR: No se generó la notificación interna.');
  process.exit(1);
}
console.log(`1. Notificación interna registrada exitosamente: ID: ${newNotif.id} | Tipo: ${newNotif.type} | Para: ${newNotif.user_id}`);

// 2. Verificar simulación de despacho de correo institucional (T5.7 / RF-34)
const notifsAfterAdd = useNotificationsStore.getState().notifications;
const savedNotif = notifsAfterAdd.find((n) => n.id === newNotif.id);

if (!savedNotif || savedNotif.email_sent !== true) {
  console.error('ERROR: El correo institucional simulado no fue despachado (Violación RF-34).');
  process.exit(1);
}
console.log(`2. Integración de correo institucional (RF-34): Notificación enviada a "${savedNotif.email_recipient}" con éxito.`);

// 3. Probar conteo de no leídas y marcado como leída
const unreadBefore = useNotificationsStore.getState().getUnreadCountByUser('usr-001');
if (unreadBefore === 0) {
  console.error('ERROR: El conteo de no leídas debió ser mayor a 0.');
  process.exit(1);
}
console.log(`3. Conteo de notificaciones no leídas para usr-001: ${unreadBefore}.`);

useNotificationsStore.getState().markAsRead(newNotif.id);
const notifAfterRead = useNotificationsStore.getState().notifications.find((n) => n.id === newNotif.id);
if (!notifAfterRead || notifAfterRead.is_read !== true) {
  console.error('ERROR: La notificación no quedó marcada como leída.');
  process.exit(1);
}
console.log('4. Notificación individual marcada como leída con éxito.');

// 4. Probar marcar todas como leídas
useNotificationsStore.getState().markAllAsRead('usr-001');
const unreadAfterAll = useNotificationsStore.getState().getUnreadCountByUser('usr-001');
if (unreadAfterAll !== 0) {
  console.error(`ERROR: Todas debieron estar leídas, pero quedaron: ${unreadAfterAll}.`);
  process.exit(1);
}
console.log('5. Marcar todas como leídas verificado: 0 pendientes.');

console.log('--- ¡Todas las pruebas de T5.6 y T5.7 (Notificaciones y Correo) pasaron exitosamente! ---');
