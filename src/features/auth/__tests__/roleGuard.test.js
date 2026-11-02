import { checkRoleAccess } from '../RoleGuard.tsx';

console.log('--- Iniciando prueba automática de rutas protegidas y navegación por rol (T1.4 / RF-02) ---');

// Rutas con sus roles autorizados
const ADMIN_ROUTE_ROLES = ['admin'];
const DOC_VALIDATION_ROLES = ['administrativo', 'secretario', 'admin'];
const COMMITTEE_SESSION_ROLES = ['integrante_comite', 'secretario', 'administrativo', 'admin'];
const RESEARCHER_ROLES = ['investigador', 'admin'];

// 1. Caso crítico: Un investigador intenta ingresar a la pantalla de administración
const resAdminAsInvestigador = checkRoleAccess('investigador', ADMIN_ROUTE_ROLES);
if (resAdminAsInvestigador.allowed) {
  console.error('ERROR CRÍTICO: Se permitió el acceso de un investigador a pantallas de administración');
  process.exit(1);
}
console.log('1. Acceso de Investigador a pantalla de Administración: BLOQUEADO exitosamente ->', resAdminAsInvestigador.reason);

// 2. Un investigador ingresa a radicación / mis solicitudes
const resFilingAsInvestigador = checkRoleAccess('investigador', RESEARCHER_ROLES);
if (!resFilingAsInvestigador.allowed) {
  console.error('ERROR: Se bloqueó al investigador en su propio módulo');
  process.exit(1);
}
console.log('2. Acceso de Investigador a sus módulos autorizados: PERMITIDO.');

// 3. Usuario sin sesión intenta ingresar
const resUnauthenticated = checkRoleAccess(null, ADMIN_ROUTE_ROLES);
if (resUnauthenticated.allowed) {
  console.error('ERROR: Se permitió acceso sin autenticación');
  process.exit(1);
}
console.log('3. Acceso sin autenticación: BLOQUEADO exitosamente ->', resUnauthenticated.reason);

// 4. Administrador ingresa a pantallas de administración
const resAdminAsAdmin = checkRoleAccess('admin', ADMIN_ROUTE_ROLES);
if (!resAdminAsAdmin.allowed) {
  console.error('ERROR: Se bloqueó al administrador en administración');
  process.exit(1);
}
console.log('4. Acceso de Administrador a pantallas de administración: PERMITIDO.');

// 5. Administrativo ingresa a validación documental
const resDocValidation = checkRoleAccess('administrativo', DOC_VALIDATION_ROLES);
if (!resDocValidation.allowed) {
  console.error('ERROR: Se bloqueó al administrativo en validación documental');
  process.exit(1);
}
console.log('5. Acceso de Administrativo a validación documental: PERMITIDO.');

console.log('--- ¡Todas las pruebas de rutas protegidas T1.4 pasaron exitosamente! ---');
