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
await new Promise((r) => setTimeout(r, 20));
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

// 5. Registrar un nuevo investigador y loguearse con sus credenciales creadas
const newUserData = {
  fullName: 'Dr. Alejandro Peña',
  email: 'apena@universidad.edu.co',
  password: 'Password999*',
  confirmPassword: 'Password999*',
  academicLink: 'docente_planta',
  academicProgram: 'Química Aplicada',
  researchGroupId: 'grp-bio-01',
};

const regRes = await useAuthStore.getState().registerUser(newUserData);
if (!regRes.success || !regRes.profile) {
  console.error('ERROR al registrar nuevo usuario:', regRes.error);
  process.exit(1);
}
console.log('5. Nuevo usuario registrado:', regRes.profile.full_name, '| Email:', regRes.profile.email);

// Iniciar sesión con este usuario recién creado
const loginNewUserRes = await useAuthStore.getState().login('apena@universidad.edu.co', 'Password999*');
if (!loginNewUserRes.success) {
  console.error('ERROR al iniciar sesión con usuario recién creado:', loginNewUserRes.error);
  process.exit(1);
}
const stateNewUser = useAuthStore.getState();
if (!stateNewUser.isAuthenticated || stateNewUser.profile?.email !== 'apena@universidad.edu.co') {
  console.error('ERROR: El usuario recién registrado no se autenticó');
  process.exit(1);
}
console.log('6. Login con usuario recién registrado: ¡ÉXITO TOTAL!', stateNewUser.profile.full_name);

console.log('--- ¡Todas las pruebas de sesión y persistencia T1.2 pasaron exitosamente! ---');

