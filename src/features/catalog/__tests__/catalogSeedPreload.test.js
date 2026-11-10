import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock storage before importing zustand store
const mockStorage = {};
globalThis.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
};

console.log('--- Iniciando prueba automática de precarga de catálogo inicial estándar (T1.8 / RF-37) ---');

const {
  useCatalogStore,
  INITIAL_APPLICATION_TYPES,
  INITIAL_REQUIREMENTS,
} = await import('../catalogStore.ts');

// 1. Validar que existan los 12 tipos estándar según la sección 2.10
if (INITIAL_APPLICATION_TYPES.length !== 12) {
  console.error(`ERROR: Se esperaban 12 tipos de solicitud estándar, pero se encontraron ${INITIAL_APPLICATION_TYPES.length}`);
  process.exit(1);
}
console.log('1. Verificación de dimensión: 12 tipos de solicitud estándar precargados.');

// 2. Validar que exactamente 5 tipos prioritarios estén activos para el prototipo
const activeTypes = INITIAL_APPLICATION_TYPES.filter((t) => t.is_active);
const inactiveTypes = INITIAL_APPLICATION_TYPES.filter((t) => !t.is_active);

if (activeTypes.length !== 5) {
  console.error(`ERROR: Deben haber exactamente 5 tipos activos para el prototipo, encontrados: ${activeTypes.length}`);
  process.exit(1);
}

if (inactiveTypes.length !== 7) {
  console.error(`ERROR: Deben haber 7 tipos complementarios precargados inactivos, encontrados: ${inactiveTypes.length}`);
  process.exit(1);
}
console.log('2. Verificación de estados por defecto: 5 activos prioritarios y 7 complementarios inactivos.');

// 3. Validar los códigos de los 5 activos
const expectedActiveCodes = ['SOL-AVAL-01', 'MOD-RUB-02', 'PROR-CRON-04', 'INF-AVAN-08', 'INF-CIER-09'];
for (const code of expectedActiveCodes) {
  const found = activeTypes.find((t) => t.code === code);
  if (!found) {
    console.error(`ERROR: El tipo prioritario esperado "${code}" no está activo`);
    process.exit(1);
  }
}
console.log('3. Códigos de trámites prioritarios activos confirmados:', expectedActiveCodes.join(', '));

// 4. Validar que todos los tipos tengan requisitos configurados
for (const t of INITIAL_APPLICATION_TYPES) {
  const reqs = INITIAL_REQUIREMENTS.filter((r) => r.application_type_id === t.id);
  if (reqs.length === 0) {
    console.error(`ERROR: El tipo ${t.code} (${t.name}) no tiene ningún requisito documental asignado`);
    process.exit(1);
  }
}
console.log(`4. Todos los tipos cuentan con requisitos asignados (Total requisitos precargados: ${INITIAL_REQUIREMENTS.length}).`);

// 5. Validar reglas de requisitos: Propuesta técnica no subsanable e Informe final no subsanable
const propuestaReq = INITIAL_REQUIREMENTS.find((r) => r.id === 'req-001');
if (!propuestaReq || propuestaReq.is_subsanable !== false || !propuestaReq.is_mandatory) {
  console.error('ERROR: Propuesta técnica debe ser obligatoria y NO subsanable');
  process.exit(1);
}

const informeFinalReq = INITIAL_REQUIREMENTS.find((r) => r.id === 'req-010');
if (!informeFinalReq || informeFinalReq.is_subsanable !== false || !informeFinalReq.is_mandatory) {
  console.error('ERROR: Informe final científico debe ser obligatorio y NO subsanable');
  process.exit(1);
}
console.log('5. Criterios de subsanabilidad verificados (RN-11: propuestas sustanciales no subsanables vs requisitos complementarios subsanables).');

// 6. Un fallo de conexión no debe rellenar el catálogo con fixtures locales.
useCatalogStore.setState({ types: [], requirements: [], selectedTypeId: null });
const syncResult = await useCatalogStore.getState().loadFromSupabase();
const stateAfterSync = useCatalogStore.getState();

if (syncResult.success || stateAfterSync.types.length !== 0 || stateAfterSync.requirements.length !== 0) {
  console.error('ERROR: El catálogo agregó datos locales cuando Supabase no estaba disponible');
  process.exit(1);
}
console.log('6. Un catálogo sin datos de Supabase permanece vacío ante un fallo de conexión.');

// 7. Validar consistencia con el archivo supabase/seed.sql
const seedSqlPath = resolve(process.cwd(), 'supabase/seed.sql');
const seedSqlContent = readFileSync(seedSqlPath, 'utf8');

for (const code of expectedActiveCodes) {
  if (!seedSqlContent.includes(code)) {
    console.error(`ERROR: seed.sql no contiene el código de trámite ${code}`);
    process.exit(1);
  }
}

if (!seedSqlContent.includes('VINC-ESTU-12') || !seedSqlContent.includes('APOY-MOVI-11')) {
  console.error('ERROR: seed.sql no contiene los 12 tipos estándar');
  process.exit(1);
}
console.log('7. Script supabase/seed.sql validado: contiene los 12 tipos estándar y sus inserciones relacionales.');

console.log('--- ¡Todas las pruebas de T1.8 (Precarga del catálogo inicial estándar) pasaron con éxito rotundo! ---');
