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

const { useGroupsStore } = await import('../groupsStore.ts');
const { useUserStore } = await import('../../users/userStore.ts');

console.log('--- Iniciando prueba automática de gestión de grupos de investigación (T1.6 / RF-04) ---');

// 1. Estado inicial
const initialGroups = useGroupsStore.getState().groups;
if (!initialGroups || initialGroups.length === 0) {
  console.error('ERROR: No hay grupos de investigación iniciales cargados');
  process.exit(1);
}
console.log('1. Grupos iniciales verificados:', initialGroups.length, 'grupos activos.');

// 2. Crear un nuevo grupo de investigación
const newGroupData = {
  name: 'Grupo de Investigación en Energías Renovables y Transición Justa',
  code: 'G-ENE-06',
  faculty: 'Facultad de Ingeniería Mecánica y Eléctrica',
  leader_id: 'usr-001', // Dra. Carmen Lucía Morales
};

const createRes = useGroupsStore.getState().createGroup(newGroupData);
if (!createRes.success || !createRes.group) {
  console.error('ERROR al crear grupo:', createRes.error);
  process.exit(1);
}
const createdGroup = createRes.group;
console.log('2. Grupo de investigación creado exitosamente:', createdGroup.name, '| Código:', createdGroup.code);

// 3. Verificar asignación de líder verificable (RF-04)
if (createdGroup.leader_id !== 'usr-001') {
  console.error('ERROR: El líder asignado no coincide con usr-001');
  process.exit(1);
}
console.log('3. Líder verificado de forma verificable. leader_id:', createdGroup.leader_id);

// 4. Reasignar líder del grupo a otro investigador
const reassignRes = useGroupsStore.getState().assignGroupLeader(createdGroup.id, 'usr-006');
if (!reassignRes.success || !reassignRes.group || reassignRes.group.leader_id !== 'usr-006') {
  console.error('ERROR al reasignar líder de grupo:', reassignRes);
  process.exit(1);
}
console.log('4. Reasignación de líder verificada. Nuevo líder id:', reassignRes.group.leader_id);

// 5. Validar rechazo de código duplicado
const duplicateRes = useGroupsStore.getState().createGroup({
  name: 'Grupo Duplicado Test',
  code: 'G-ENE-06', // Mismo código
  faculty: 'Facultad de Ciencias',
  leader_id: 'usr-002',
});
if (duplicateRes.success) {
  console.error('ERROR: Se permitió crear un grupo con código duplicado');
  process.exit(1);
}
console.log('5. Validación de unicidad de código verificada: Rechazado duplicado correctamente ->', duplicateRes.error);

// 6. Conmutar estado activo / inactivo
const toggleRes = useGroupsStore.getState().toggleGroupActive(createdGroup.id);
const toggledGroup = useGroupsStore.getState().groups.find((g) => g.id === createdGroup.id);
if (toggledGroup?.is_active !== false) {
  console.error('ERROR al desactivar grupo');
  process.exit(1);
}
console.log('6. Conmutación de estado activo/inactivo verificada:', toggledGroup.is_active);

console.log('--- ¡Todas las pruebas de gestión de grupos T1.6 pasaron exitosamente! ---');
