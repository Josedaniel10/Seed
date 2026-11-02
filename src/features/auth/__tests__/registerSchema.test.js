import { registerSchema } from '../schemas.ts';

console.log('--- Iniciando prueba automática de validación Zod para registro de investigadores (T1.1 / RF-01) ---');

// Caso 1: Datos válidos completos
const validData = {
  fullName: 'Dra. Valentina Ríos',
  email: 'vrios@universidad.edu.co',
  password: 'Password123*',
  confirmPassword: 'Password123*',
  academicLink: 'docente_planta',
  academicProgram: 'Ingeniería Ambiental',
  researchGroupId: 'grp-bio-01',
};

const validResult = registerSchema.safeParse(validData);
if (!validResult.success) {
  console.error('ERROR: Datos válidos fueron rechazados:', validResult.error);
  process.exit(1);
}
console.log('1. Registro válido aceptado correctamente.');

// Caso 2: Contraseñas no coincidentes
const mismatchData = {
  ...validData,
  confirmPassword: 'PasswordDiferente',
};
const mismatchResult = registerSchema.safeParse(mismatchData);
if (mismatchResult.success) {
  console.error('ERROR: Se aceptaron contraseñas distintas');
  process.exit(1);
}
const confirmErr = mismatchResult.error.issues.find((i) => i.path.includes('confirmPassword'));
if (!confirmErr || confirmErr.message !== 'Las contraseñas no coinciden') {
  console.error('ERROR: Mensaje de error inesperado en coincidencia de password:', confirmErr);
  process.exit(1);
}
console.log('2. Contraseñas no coincidentes rechazadas con mensaje:', confirmErr.message);

// Caso 3: Correo electrónico inválido
const invalidEmailData = {
  ...validData,
  email: 'correo-sin-arroba',
};
const invalidEmailResult = registerSchema.safeParse(invalidEmailData);
if (invalidEmailResult.success) {
  console.error('ERROR: Se aceptó un correo inválido');
  process.exit(1);
}
console.log('3. Correo inválido rechazado correctamente.');

// Caso 4: Nombre demasiado corto
const shortNameData = {
  ...validData,
  fullName: 'Al',
};
const shortNameResult = registerSchema.safeParse(shortNameData);
if (shortNameResult.success) {
  console.error('ERROR: Se aceptó un nombre de menos de 3 caracteres');
  process.exit(1);
}
console.log('4. Nombre menor a 3 caracteres rechazado correctamente.');

// Caso 5: Vínculo académico no permitido
const invalidLinkData = {
  ...validData,
  academicLink: 'rector',
};
const invalidLinkResult = registerSchema.safeParse(invalidLinkData);
if (invalidLinkResult.success) {
  console.error('ERROR: Se aceptó un vínculo académico inválido');
  process.exit(1);
}
console.log('5. Vínculo institucional inválido rechazado correctamente.');

console.log('--- ¡Todas las pruebas de validación Zod de T1.1 pasaron exitosamente! ---');
