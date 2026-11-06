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

const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { step1TypeSchema, step2GeneralDataSchema } = await import('../filingSchema.ts');

console.log('--- Iniciando prueba automática de requisitos dinámicos y datos generales (T2.1 / RF-07) ---');

// 1. Obtener tipos activos del catálogo
const types = useCatalogStore.getState().types.filter((t) => t.is_active);
const requirements = useCatalogStore.getState().requirements;

if (!types || types.length === 0) {
  console.error('ERROR: No se encontraron tipos activos en el catálogo.');
  process.exit(1);
}

console.log(`1. Se verificaron ${types.length} tipos de trámite activos para radicación.`);

// 2. Probar despliegue dinámico de requisitos por cada tipo prioritario
for (const type of types) {
  const reqsForType = requirements.filter((r) => r.application_type_id === type.id);
  if (reqsForType.length === 0) {
    console.error(`ERROR: El tipo [${type.code}] ${type.name} no tiene requisitos asociados.`);
    process.exit(1);
  }
  const mandatoryCount = reqsForType.filter((r) => r.is_mandatory).length;
  console.log(
    `2. Tipo [${type.code}] desplegó dinámicamente ${reqsForType.length} requisitos (${mandatoryCount} obligatorios).`
  );
}

// 3. Validación Zod de selección de tipo (Paso 1)
const validStep1 = step1TypeSchema.safeParse({ application_type_id: types[0].id });
if (!validStep1.success) {
  console.error('ERROR: Validación de Paso 1 falló con tipo válido.');
  process.exit(1);
}

const invalidStep1 = step1TypeSchema.safeParse({ application_type_id: '' });
if (invalidStep1.success) {
  console.error('ERROR: Paso 1 no rechazó un tipo de solicitud vacío.');
  process.exit(1);
}
console.log('3. Validación Zod de Paso 1 (Selección de tipo) verificada correctamente.');

// 4. Validación Zod de datos generales (Paso 2)
const validStep2 = step2GeneralDataSchema.safeParse({
  title: 'Investigación sobre Genómica Funcional en Frutales Nativos',
  related_project: 'INV-2025-010',
  abstract: 'Este proyecto busca caracterizar perfiles de expresión genética bajo estrés hídrico.',
  research_group_id: 'grp-001',
  budget_requested: 25000000,
  is_tutor_endorsed: true,
});

if (!validStep2.success) {
  console.error('ERROR: Datos generales válidos fueron rechazados:', validStep2.error);
  process.exit(1);
}
console.log('4. Datos generales válidos aceptados correctamente.');

// 5. Validación de rechazo: título menor a 5 caracteres
const invalidTitle = step2GeneralDataSchema.safeParse({
  title: 'Abc',
  abstract: 'Justificación con más de veinte caracteres reglamentarios.',
});
if (invalidTitle.success) {
  console.error('ERROR: No se rechazó título corto.');
  process.exit(1);
}
console.log('5. Título menor a 5 caracteres rechazado correctamente.');

// 6. Validación de rechazo: justificación menor a 20 caracteres
const invalidAbstract = step2GeneralDataSchema.safeParse({
  title: 'Título Válido Institucional',
  abstract: 'Muy corto',
});
if (invalidAbstract.success) {
  console.error('ERROR: No se rechazó justificación corta.');
  process.exit(1);
}
console.log('6. Resumen menor a 20 caracteres rechazado correctamente.');

console.log('--- ¡Todas las pruebas automáticas de T2.1 (Requisitos dinámicos y Paso 1-2) pasaron exitosamente! ---');
