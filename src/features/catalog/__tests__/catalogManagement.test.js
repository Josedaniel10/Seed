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

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'catalog-test-key';
const remoteTypes = [];
const remoteRequirements = [];
let sequence = 0;
globalThis.fetch = async (input, options) => {
  const { p_action: action, p_id: id, p_data: data } = JSON.parse(options.body);
  if (action === 'TYPE_CREATE' && remoteTypes.some(type => type.code === data.code)) return Response.json({ message: 'Código duplicado' }, { status: 409 });
  let type = remoteTypes.find(item => item.id === id) ?? null;
  let requirement = remoteRequirements.find(item => item.id === id) ?? null;
  if (action === 'TYPE_CREATE') { type = { ...data, id: 'type-' + (++sequence), is_active: true, created_at: '2026-11-16' }; remoteTypes.push(type); }
  if (action === 'TYPE_UPDATE') Object.assign(type, data);
  if (action === 'REQUIREMENT_CREATE') { requirement = { description: null, template_url: null, ...data, id: 'req-' + (++sequence), is_active: true, created_at: '2026-11-16' }; remoteRequirements.push(requirement); }
  if (action === 'REQUIREMENT_UPDATE') Object.assign(requirement, data);
  return Response.json({ type, requirement, deleted: action.endsWith('DELETE') });
};
const { useCatalogStore } = await import('../catalogStore.ts');

console.log('--- Iniciando prueba automática de catálogo de trámites y requisitos (T1.7 / RF-05, RF-06, RN-10, RN-11) ---');

// 1. Verificar carga del catálogo estándar inicial
const initialTypes = useCatalogStore.getState().types;
const initialReqs = useCatalogStore.getState().requirements;

if (!initialTypes || initialTypes.length === 0) {
  console.error('ERROR: No se cargaron los tipos de solicitud iniciales.');
  process.exit(1);
}

if (!initialReqs || initialReqs.length === 0) {
  console.error('ERROR: No se cargaron los requisitos iniciales.');
  process.exit(1);
}

console.log(`1. Catálogo inicial verificado: ${initialTypes.length} tipos de trámite y ${initialReqs.length} requisitos predefinidos.`);

// 2. Crear un nuevo tipo de trámite (RF-05)
const newTypeData = {
  code: 'CONV-INT-06',
  name: 'Convocatoria Interna de Semilleros de Investigación',
  description: 'Trámite de postulación de propuestas de investigación formativa para semilleros estudiantiles.',
  requires_committee: true,
  display_order: 6,
};

const createTypeRes = await useCatalogStore.getState().createType(newTypeData);
if (!createTypeRes.success || !createTypeRes.type) {
  console.error('ERROR al crear tipo de trámite:', createTypeRes.error);
  process.exit(1);
}
const createdType = createTypeRes.type;
console.log(`2. Tipo de trámite creado exitosamente: [${createdType.code}] ${createdType.name}`);

// 3. Validar rechazo de código duplicado
const dupRes = await useCatalogStore.getState().createType({
  code: 'CONV-INT-06',
  name: 'Tipo Duplicado',
  description: 'Debe fallar',
});
if (dupRes.success) {
  console.error('ERROR: Se permitió registrar un tipo de trámite con código duplicado');
  process.exit(1);
}
console.log('3. Validación de código único verificada (Rechazado duplicado correctamente):', dupRes.error);

// 4. Agregar requisitos: Obligatorio no subsanable vs Subsanable (RN-10, RN-11)
// 4a. Requisito obligatorio NO subsanable (ej. Propuesta estructurada original)
const req1Res = await useCatalogStore.getState().addRequirement({
  application_type_id: createdType.id,
  name: 'Propuesta de Semillero en Formato Oficial',
  description: 'Documento original con formulación del semillero (causal no subsanable si no se presenta).',
  is_mandatory: true,
  is_subsanable: false, // RN-11
  allowed_formats: ['application/pdf'],
  max_size_mb: 10,
  cure_deadline_days: 0,
});

if (!req1Res.success || !req1Res.requirement) {
  console.error('ERROR al agregar requisito no subsanable:', req1Res.error);
  process.exit(1);
}
console.log('4a. Requisito obligatorio NO subsanable agregado correctamente:', req1Res.requirement.name, '| Subsanable:', req1Res.requirement.is_subsanable, '| Días subsanación:', req1Res.requirement.cure_deadline_days);

// 4b. Requisito obligatorio SUBSANABLE (ej. Carta de aval de tutor docente RN-09)
const req2Res = await useCatalogStore.getState().addRequirement({
  application_type_id: createdType.id,
  name: 'Carta de Aval del Docente Tutor de Semillero (RN-09)',
  description: 'Certificado firmado por el tutor garantizando acompañamiento pedagógico.',
  is_mandatory: true,
  is_subsanable: true, // RN-11: Falta subsanable
  allowed_formats: ['application/pdf'],
  max_size_mb: 5,
  cure_deadline_days: 5, // 5 días hábiles reglamentarios
});

if (!req2Res.success || !req2Res.requirement) {
  console.error('ERROR al agregar requisito subsanable:', req2Res.error);
  process.exit(1);
}
console.log('4b. Requisito obligatorio SUBSANABLE agregado correctamente:', req2Res.requirement.name, '| Plazo subsanación:', req2Res.requirement.cure_deadline_days, 'días.');

// 5. Actualizar requisito y verificar reglas
const updateReqRes = await useCatalogStore.getState().updateRequirement(req2Res.requirement.id, {
  cure_deadline_days: 7,
  max_size_mb: 8,
});
if (!updateReqRes.success || !updateReqRes.requirement || updateReqRes.requirement.cure_deadline_days !== 7) {
  console.error('ERROR al actualizar parámetros del requisito:', updateReqRes);
  process.exit(1);
}
console.log('5. Parámetros del requisito actualizados exitosamente (cure_deadline_days = 7).');

// 6. Conmutar estado activo/inactivo del tipo de trámite
const toggleRes = await useCatalogStore.getState().toggleTypeActive(createdType.id);
const toggledType = useCatalogStore.getState().types.find((t) => t.id === createdType.id);
if (!toggleRes.success || toggledType?.is_active !== false) {
  console.error('ERROR al alternar estado activo/inactivo');
  process.exit(1);
}
console.log('6. Conmutación de estado activo/inactivo verificada:', toggledType.is_active);

// 7. Eliminar requisito individual
const removeReqRes = await useCatalogStore.getState().removeRequirement(req1Res.requirement.id);
const remainingReqs = useCatalogStore.getState().requirements.filter((r) => r.application_type_id === createdType.id);
if (!removeReqRes.success || remainingReqs.length !== 1) {
  console.error('ERROR al eliminar requisito:', remainingReqs);
  process.exit(1);
}
console.log('7. Eliminación de requisito verificada. Queda', remainingReqs.length, 'requisito en este tipo.');

console.log('--- ¡Todas las pruebas automáticas de T1.7 (Catálogo y Requisitos) pasaron exitosamente! ---');
