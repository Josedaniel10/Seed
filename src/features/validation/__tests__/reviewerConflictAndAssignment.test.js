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

const { useApplicationStore } = await import('../../applications/applicationStore.ts');
const { useUserStore } = await import('../../users/userStore.ts');

console.log('--- Iniciando prueba automática de conflicto de intereses y asignación de evaluadores (T3.7, T3.8 / RF-15, RF-16, RN-03, RN-08, RN-14) ---');

const store = useApplicationStore.getState();
const usersStore = useUserStore.getState();

// Crear una solicitud radicada por Dra. Carmen Morales (usr-001, grupo grp-001)
const appRes = await store.createApplication({
  application_type_id: 'apt-004',
  applicant_id: 'usr-001',
  applicant_name: 'Dra. Carmen Morales',
  title: 'Evaluación de Bioprocesos para Asignación de Pares',
  abstract: 'Prueba de asignación de revisores y conflicto de intereses.',
  research_group_id: 'grp-001',
  documents: [
    {
      requirement_id: 'req-007',
      file_name: 'Informe_Estado.pdf',
      file_path: 'file-service/storage/informe.pdf',
      file_size_bytes: 1000,
      file_hash_sha256: '6666666666666666666666666666666666666666666666666666666666666666',
      mime_type: 'application/pdf',
    },
    {
      requirement_id: 'req-008',
      file_name: 'Doc.pdf',
      file_path: 'path',
      file_size_bytes: 1000,
      file_hash_sha256: '7777777777777777777777777777777777777777777777777777777777777777',
      mime_type: 'application/pdf',
    },
  ],
});

const appId = appRes.application.id;

// 1. Probar RN-03: El evaluador no puede evaluar su propia solicitud
const selfConflict = store.checkReviewerConflict('usr-001', appId);
if (!selfConflict.hasConflict) {
  console.error('ERROR: No se detectó conflicto cuando el evaluador es el mismo autor (Violación RN-03).');
  process.exit(1);
}
console.log(`1. RN-03 comprobada: Inhabilidad por evaluar propia solicitud bloqueada: "${selfConflict.reason}".`);

// 2. Probar RN-14: El evaluador no puede evaluar a miembros de su mismo grupo de investigación
// Crear un usuario revisor adscrito al mismo grupo grp-001
const sameGroupReviewer = usersStore.addUser({
  email: 'docente.par@universidad.edu.co',
  full_name: 'Dr. Fernando Par',
  role: 'integrante_comite',
  academic_program: 'Ingeniería',
  academic_link: 'docente_planta',
  research_group_id: 'grp-001', // Mismo grupo que la solicitud
  is_active: true,
});

const groupConflict = store.checkReviewerConflict(sameGroupReviewer.id, appId);
if (!groupConflict.hasConflict) {
  console.error('ERROR: No se detectó conflicto entre miembros del mismo grupo (Violación RN-14).');
  process.exit(1);
}
console.log(`2. RN-14 comprobada: Inhabilidad por pertenecer al mismo grupo de investigación bloqueada: "${groupConflict.reason}".`);

// 3. Intento de asignar revisor con conflicto -> Debe ser rechazado por assignReviewer
const assignConflictResult = await store.assignReviewer(
  appId,
  sameGroupReviewer.id,
  '2026-03-01',
  'usr-004',
  'Secretario'
);

if (assignConflictResult.success) {
  console.error('ERROR: assignReviewer permitió asignar a un revisor con conflicto inhabilitante.');
  process.exit(1);
}
console.log('3. assignReviewer rechazó formalmente la asignación con conflicto de interés.');

// 4. Asignar revisor válido sin conflicto (usr-003, Ciencias Básicas)
const validReviewerId = 'usr-003';
const validAssign = await store.assignReviewer(
  appId,
  validReviewerId,
  '2026-03-01',
  'usr-004',
  'Secretario'
);

if (!validAssign.success || !validAssign.assignment) {
  console.error('ERROR al asignar revisor válido:', validAssign.error);
  process.exit(1);
}
const firstAsgId = validAssign.assignment.id;
console.log(`4. Revisor válido sin conflicto asignado exitosamente (ID: ${firstAsgId}).`);

// 5. Reasignación de evaluador (RN-08): Consérvese la previa como inactiva
// Crear otro revisor sin conflicto de otro grupo
const anotherReviewer = usersStore.addUser({
  email: 'dra.externa@universidad.edu.co',
  full_name: 'Dra. Helena Externa',
  role: 'integrante_comite',
  academic_program: 'Medicina',
  academic_link: 'docente_planta',
  research_group_id: 'grp-003',
  is_active: true,
});

const reassignResult = await store.assignReviewer(
  appId,
  anotherReviewer.id,
  '2026-03-10',
  'usr-004',
  'Secretario'
);

if (!reassignResult.success || !reassignResult.assignment) {
  console.error('ERROR al reasignar evaluador:', reassignResult.error);
  process.exit(1);
}

// Verificar que la asignación previa pasó a is_active: false (RN-08)
const allAsgs = useApplicationStore.getState().assignments.filter((a) => a.application_id === appId);
const prevAsg = allAsgs.find((a) => a.id === firstAsgId);
const newAsg = allAsgs.find((a) => a.id === reassignResult.assignment.id);

if (!prevAsg || prevAsg.is_active !== false) {
  console.error('ERROR: La asignación previa no quedó inactiva en el histórico (Violación RN-08).');
  process.exit(1);
}

if (!newAsg || newAsg.is_active !== true) {
  console.error('ERROR: La nueva asignación no quedó activa.');
  process.exit(1);
}

console.log('5. Regla RN-08 comprobada: Reasignación conservó la previa como inactiva y activó la nueva.');
console.log('--- ¡Todas las pruebas de T3.7 y T3.8 (Conflicto de intereses y asignación) pasaron exitosamente! ---');
