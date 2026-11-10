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

const { useApplicationStore } = await import('../../applications/applicationStore.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');

console.log('--- Iniciando prueba automática de generación de reportes analíticos consolidados y exportables (T5.8 / RF-36) ---');

const appStore = useApplicationStore.getState();
const catalogStore = useCatalogStore.getState();

const applications = appStore.requests;
const types = catalogStore.types;

// 1. Calcular métricas cuantitativas consolidadas del periodo
const totalApplications = applications.length;
const approvedCount = applications.filter((a) => a.current_status === 'APROBADA').length;
const approvedWithAdjustmentsCount = applications.filter(
  (a) => a.current_status === 'APROBADA_CON_AJUSTES'
).length;
const rejectedCount = applications.filter((a) => a.current_status === 'RECHAZADA').length;
const inProgressCount = applications.filter(
  (a) =>
    a.current_status === 'RADICADA' ||
    a.current_status === 'PENDIENTE_DOCUMENTOS' ||
    a.current_status === 'EN_REVISION' ||
    a.current_status === 'LISTA_COMITE'
).length;

if (totalApplications === 0) {
  console.error('ERROR: No hay solicitudes para generar reporte.');
  process.exit(1);
}

const approvalRate = Math.round(
  ((approvedCount + approvedWithAdjustmentsCount) / (totalApplications || 1)) * 100
);

console.log(
  `1. Métricas consolidadas calculadas: Total: ${totalApplications} | Aprobadas: ${approvedCount} | Rechazadas: ${rejectedCount} | En curso: ${inProgressCount} | Tasa de Aprobación: ${approvalRate}%.`
);

// 2. Desglose analítico por tipo de solicitud
const breakdownByType = types
  .filter((t) => t.is_active)
  .map((t) => {
    const appsOfType = applications.filter((a) => a.application_type_id === t.id);
    const approved = appsOfType.filter(
      (a) => a.current_status === 'APROBADA' || a.current_status === 'APROBADA_CON_AJUSTES'
    ).length;
    const rejected = appsOfType.filter((a) => a.current_status === 'RECHAZADA').length;
    const pending = appsOfType.length - approved - rejected;

    return {
      typeCode: t.code,
      typeName: t.name,
      total: appsOfType.length,
      approved,
      rejected,
      pending,
    };
  });

console.log(`2. Desglose generado para ${breakdownByType.length} tipos de trámites prioritarios activos.`);

// 3. Simulación de exportación a CSV (RF-36)
const csvHeader = 'Codigo,Nombre_Tramite,Total_Radicadas,Aprobadas,Rechazadas,En_Tramite\n';
const csvRows = breakdownByType
  .map(
    (b) =>
      `"${b.typeCode}","${b.typeName}",${b.total},${b.approved},${b.rejected},${b.pending}`
  )
  .join('\n');
const fullCsv = csvHeader + csvRows;

if (!fullCsv.includes('SOL-AVAL-01') || !fullCsv.includes('Total_Radicadas')) {
  console.error('ERROR: Formato CSV de reporte incompleto.');
  process.exit(1);
}
console.log('3. Exportación a CSV analítico consolidado estructurado y validado exitosamente.');

console.log('--- ¡Todas las pruebas de T5.8 (Reportes Analíticos Consolidados) pasaron exitosamente! ---');
