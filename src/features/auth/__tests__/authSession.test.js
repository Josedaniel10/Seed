// Mock simple de localStorage en globalThis antes de inicializar Zustand
const mockStorage = {};
const mockLocalStorage = {
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
globalThis.localStorage = mockLocalStorage;

// Ahora importar authStore
const { useAuthStore } = await import('../authStore.ts');

console.log('--- Iniciando prueba automática de sesión y persistencia (T1.2 / RF-02) ---');

// 1. Estado inicial
const stateInitial = useAuthStore.getState();
if (stateInitial.isAuthenticated || stateInitial.profile !== null) {
  console.error('ERROR: El estado inicial no está limpio');
  process.exit(1);
}
console.log('1. Estado inicial verificado: no autenticado.');

// 2. Iniciar sesión con un rol específico (Secretario)
const loginRes = await useAuthStore
  .getState()
  .login('secretario@universidad.edu.co', 'Password123*', 'secretario', 'Dra. Patricia Salamanca');

if (!loginRes.success) {
  console.error('ERROR en login:', loginRes.error);
  process.exit(1);
}

const stateAfterLogin = useAuthStore.getState();
if (!stateAfterLogin.isAuthenticated || !stateAfterLogin.profile || stateAfterLogin.profile.role !== 'secretario') {
  console.error('ERROR: La sesión no se estableció correctamente en el store');
  process.exit(1);
}
console.log('2. Inicio de sesión exitoso con rol:', stateAfterLogin.profile.role, 'y usuario:', stateAfterLogin.profile.full_name);

// 3. Simular recarga de página: serializar a storage y reconstruir
const serialized = globalThis.localStorage.getItem('seed_auth_session');
if (!serialized) {
  console.error('ERROR: La sesión no fue guardada en el almacenamiento local persistente');
  process.exit(1);
}
const parsed = JSON.parse(serialized);
if (!parsed.state.isAuthenticated || parsed.state.profile.role !== 'secretario') {
  console.error('ERROR: La sesión persistida no contiene los datos correctos');
  process.exit(1);
}
console.log('3. Sesión verificada en almacenamiento persistente tras simulación de recarga.');

// 4. Cerrar sesión
await useAuthStore.getState().logout();
const stateAfterLogout = useAuthStore.getState();
if (stateAfterLogout.isAuthenticated || stateAfterLogout.profile !== null || stateAfterLogout.token !== null) {
  console.error('ERROR: La sesión no se limpió en el store tras logout');
  process.exit(1);
}

const storageAfterLogout = globalThis.localStorage.getItem('seed_auth_session');
if (storageAfterLogout) {
  const parsedAfter = JSON.parse(storageAfterLogout);
  if (parsedAfter.state?.isAuthenticated || parsedAfter.state?.profile) {
    console.error('ERROR: El almacenamiento aún contiene sesión tras logout');
    process.exit(1);
  }
}
console.log('4. Cierre de sesión exitoso: store y almacenamiento completamente limpios.');
console.log('--- ¡Todas las pruebas de sesión y persistencia T1.2 pasaron exitosamente! ---');
