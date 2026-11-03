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

const { useUserStore } = await import('../userStore.ts');

console.log('--- Iniciando prueba automática de gestión de usuarios y roles (T1.5 / RF-03) ---');

// 1. Verificar estado inicial
const state0 = useUserStore.getState();
const user1 = state0.users.find((u) => u.id === 'usr-001');
if (!user1 || user1.role !== 'investigador') {
  console.error('ERROR: Usuario usr-001 inicial no encontrado o rol incorrecto:', user1);
  process.exit(1);
}
console.log('1. Usuario inicial verificado:', user1.full_name, '| Rol inicial:', user1.role);

// 2. Modificar rol de investigador a secretario
const updateResult = useUserStore.getState().updateUserRole('usr-001', 'secretario');
if (!updateResult.success || !updateResult.updatedUser) {
  console.error('ERROR: Fallo al actualizar el rol');
  process.exit(1);
}
console.log('2. updateUserRole ejecutado exitosamente. Rol devuelto:', updateResult.updatedUser.role);

// 3. Verificar que el cambio se refleja DE INMEDIATO en el store
const stateAfterUpdate = useUserStore.getState();
const updatedUserInStore = stateAfterUpdate.users.find((u) => u.id === 'usr-001');
if (!updatedUserInStore || updatedUserInStore.role !== 'secretario') {
  console.error('ERROR: El cambio de rol NO se reflejó de inmediato en el store:', updatedUserInStore);
  process.exit(1);
}
console.log('3. REFLEJO INMEDIATO VERIFICADO: El usuario usr-001 ahora tiene rol:', updatedUserInStore.role);

// 4. Cambiar rol a admin y verificar nuevamente
useUserStore.getState().updateUserRole('usr-001', 'admin');
const stateAfterAdmin = useUserStore.getState();
const adminUserInStore = stateAfterAdmin.users.find((u) => u.id === 'usr-001');
if (!adminUserInStore || adminUserInStore.role !== 'admin') {
  console.error('ERROR: Fallo al cambiar a rol admin');
  process.exit(1);
}
console.log('4. Segundo cambio inmediato verificado: nuevo rol ->', adminUserInStore.role);

// 5. Conmutar estado activo / inactivo
const toggleRes = useUserStore.getState().toggleUserActive('usr-001');
const inactiveUser = useUserStore.getState().users.find((u) => u.id === 'usr-001');
if (inactiveUser?.is_active !== false) {
  console.error('ERROR: Fallo al desactivar usuario');
  process.exit(1);
}
console.log('5. Desactivación de usuario verificada. is_active:', inactiveUser.is_active);

console.log('--- ¡Todas las pruebas de cambio inmediato de roles T1.5 pasaron exitosamente! ---');
