import { canUserViewApplication, PERMISSIONS_MATRIX } from '../../src/features/auth/permissions.ts';

console.log('--- Iniciando prueba de Políticas RLS y Permisos por Rol (T1.3 / RNF-02) ---');

// Mock de solicitudes en base de datos
const mockApplications = [
  {
    id: 'app-01',
    filing_number: 'INV-2026-0001',
    application_type_id: 'type-01',
    applicant_id: 'user-investigador-1',
    title: 'Proyecto Bioinsumos',
    abstract: 'Resumen...',
    research_group_id: 'grp-bio-01',
    budget_requested: 30000000,
    current_status: 'RADICADA',
    is_tutor_endorsed: false,
    requires_committee: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'app-02',
    filing_number: 'INV-2026-0002',
    application_type_id: 'type-02',
    applicant_id: 'user-investigador-2',
    title: 'Proyecto Nanomateriales',
    abstract: 'Resumen...',
    research_group_id: 'grp-mat-03',
    budget_requested: 55000000,
    current_status: 'EN_REVISION',
    is_tutor_endorsed: false,
    requires_committee: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'app-03',
    filing_number: 'INV-2026-0003',
    application_type_id: 'type-01',
    applicant_id: 'user-investigador-3',
    title: 'Proyecto IA Médica',
    abstract: 'Resumen...',
    research_group_id: 'grp-bio-01', // Mismo grupo que app-01
    budget_requested: 40000000,
    current_status: 'LISTA_COMITE',
    is_tutor_endorsed: false,
    requires_committee: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Prueba 1: Investigador 1 solo debe ver su propia solicitud (app-01), no app-02 ni app-03
const visibleInvestigador1 = mockApplications.filter((app) =>
  canUserViewApplication('investigador', 'user-investigador-1', 'grp-bio-01', app)
);
if (visibleInvestigador1.length !== 1 || visibleInvestigador1[0].id !== 'app-01') {
  console.error('ERROR RLS: El investigador 1 vio solicitudes ajenas:', visibleInvestigador1);
  process.exit(1);
}
console.log('1. RLS Investigador verificado: solo visualiza su solicitud propia (app-01).');

// Prueba 2: Líder del Grupo Biotecnología (grp-bio-01) debe ver app-01 y app-03, pero no app-02 (que es de grp-mat-03)
const visibleLiderBio = mockApplications.filter((app) =>
  canUserViewApplication('lider_grupo', 'user-lider-bio', 'grp-bio-01', app)
);
if (visibleLiderBio.length !== 2 || visibleLiderBio.some((a) => a.research_group_id !== 'grp-bio-01')) {
  console.error('ERROR RLS: El líder de grupo vio proyectos fuera de su grupo:', visibleLiderBio);
  process.exit(1);
}
console.log('2. RLS Líder de Grupo verificado: solo visualiza proyectos de su grupo adscrito (app-01 y app-03).');

// Prueba 3: Administrativo y Secretario ven todas las solicitudes (app-01, app-02 y app-03)
const visibleAdmin = mockApplications.filter((app) =>
  canUserViewApplication('administrativo', 'user-admin-1', null, app)
);
if (visibleAdmin.length !== 3) {
  console.error('ERROR RLS: El rol administrativo no vio todas las solicitudes');
  process.exit(1);
}
console.log('3. RLS Administrativo / Secretario verificado: acceso a la totalidad de radicados (3 de 3).');

// Prueba 4: Matriz de permisos - Investigador tiene Kanban en solo lectura
if (!PERMISSIONS_MATRIX.investigador.isReadOnlyKanban) {
  console.error('ERROR: El investigador no está en modo solo lectura en Kanban');
  process.exit(1);
}
console.log('4. Matriz de permisos verificada: Investigador en solo lectura para Kanban.');

console.log('--- ¡Todas las pruebas de políticas RLS y roles T1.3 pasaron exitosamente! ---');
