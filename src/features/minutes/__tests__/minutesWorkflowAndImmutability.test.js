// Mock de localStorage para Node.js
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

const { useMinutesStore } = await import('../minutesStore.ts');
const { useCommitteeSessionsStore } = await import('../../sessions/committeeSessionsStore.ts');

console.log('--- Iniciando prueba automática de generación, numeración y aprobación de actas oficiales (T5.1, T5.2, T5.3, T5.4, T5.5 / RF-29, RF-30, RF-31, RF-32, RNF-03) ---');

const minutesStore = useMinutesStore.getState();
const sessionsStore = useCommitteeSessionsStore.getState();

// 1. Probar Generación de Consecutivo Anual (T5.1 / RF-31)
// El formato reglamentario debe ser "Acta XXX de YYYY"
const nextNum = await minutesStore.generateNextMinuteNumber(2026);
console.log(`1. Siguiente número consecutivo generado: "${nextNum}".`);

if (!nextNum.startsWith('Acta ') || !nextNum.includes('de 2026')) {
  console.error(`ERROR: Formato consecutivo inválido: "${nextNum}".`);
  process.exit(1);
}

// 2. Probar Generación de Borrador Consolidado a partir de Sesión (T5.2 / RF-29)
// Usar la sesión 04 existente
const draftRes = await minutesStore.generateDraftFromSession(
  'ses-2026-004',
  'usr-004',
  'Secretaria Técnica'
);

if (!draftRes.success || !draftRes.minute) {
  console.error('ERROR al generar borrador de acta:', draftRes.error);
  process.exit(1);
}

const createdMinute = draftRes.minute;
console.log(`2. Borrador de acta generado: "${createdMinute.minute_number}" para sesión "${createdMinute.session_id}".`);

if (!createdMinute.draft_content.includes('ASISTENCIA Y QUÓRUM') || !createdMinute.draft_content.includes('ACUERDOS')) {
  console.error('ERROR: El borrador generado no contiene las secciones requeridas de asistencia y acuerdos (RF-29).');
  process.exit(1);
}

// 3. Probar Edición del Borrador mientras no esté aprobado (T5.3 / RF-30)
const updatedContent = createdMinute.draft_content + '\n\nNOTA ADICIONAL: Compromiso de verificación complementaria aprobado.';
const updateRes = await minutesStore.updateDraftContent(
  createdMinute.id,
  updatedContent,
  'usr-004',
  'Secretaria Técnica'
);

if (!updateRes.success) {
  console.error('ERROR al actualizar borrador:', updateRes.error);
  process.exit(1);
}
console.log('3. Borrador actualizado exitosamente con ajustes de compromisos.');

// 4. Probar Aprobación Formal del Acta (T5.3 / RF-30, RNF-03)
const approveRes = await minutesStore.approveMinutes(
  createdMinute.id,
  'usr-003',
  'Presidente del Comité'
);

if (!approveRes.success || !approveRes.minute?.is_approved) {
  console.error('ERROR al aprobar acta formalmente:', approveRes.error);
  process.exit(1);
}
console.log(`4. Acta aprobada formalmente en fecha: ${approveRes.minute.approved_at} (is_approved: true).`);

// 5. Probar Inmutabilidad: Tras ser aprobada, está PROHIBIDO editar el acta (RNF-03)
const attemptEditApproved = await minutesStore.updateDraftContent(
  createdMinute.id,
  'Intento de modificación no autorizada de acta cerrada.',
  'usr-004',
  'Secretaria Técnica'
);

if (attemptEditApproved.success) {
  console.error('ERROR: Se permitió editar un acta que ya fue aprobada y firmada (Violación RNF-03).');
  process.exit(1);
}
console.log(`5. Inmutabilidad reglamentaria comprobada (RNF-03): Modificación bloqueada: "${attemptEditApproved.error}".`);

// 6. Probar Exportación a Documento Oficial (T5.4 / RF-31)
const exportRes = await minutesStore.exportMinutePdf(createdMinute.id);
if (!exportRes.success || !exportRes.pdfUrl) {
  console.error('ERROR al exportar documento oficial de acta:', exportRes.error);
  process.exit(1);
}
console.log(`6. Exportación generada exitosamente: Archivo "${exportRes.fileName}".`);

// 7. Probar Búsqueda Histórica de Actas (T5.5 / RF-32)
const searchResult = minutesStore.searchMinutes('Acta 003');
if (searchResult.length === 0) {
  console.error('ERROR: La búsqueda histórica no encontró el Acta 003 precargada.');
  process.exit(1);
}
console.log(`7. Búsqueda histórica verificada (RF-32): Encontradas ${searchResult.length} actas coincidentes.`);

console.log('--- ¡Todas las pruebas de T5.1 a T5.5 (Actas Oficiales) pasaron exitosamente! ---');
