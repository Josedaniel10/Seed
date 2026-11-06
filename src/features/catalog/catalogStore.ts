import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ApplicationType, Requirement } from '../../types/database.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';

/**
 * Catálogo estándar precargado de tipos de trámite y requisitos
 * Basado rigurosamente en la sección 2.10 del plan de desarrollo (T1.7, T1.8 / RF-05, RF-06, RF-37, RN-10, RN-11).
 * Para el prototipo se activan los 5 tipos prioritarios (1, 2, 4, 8, 9).
 * Los 7 tipos adicionales quedan precargados pero en estado inactivo (is_active: false)
 * hasta que el administrador institucional decida habilitarlos desde la interfaz.
 */
export const INITIAL_APPLICATION_TYPES: ApplicationType[] = [
  // 1. Presentación de Proyecto (Aval) - Activo para prototipo
  {
    id: 'apt-001',
    code: 'SOL-AVAL-01',
    name: 'Presentación de Proyecto de Investigación (Aval Institucional)',
    description:
      'Solicitud de aval académico e institucional para nuevos proyectos de investigación docente o de semilleros para convocatorias internas o externas.',
    requires_committee: true,
    is_active: true,
    display_order: 1,
    created_at: '2026-01-10T08:00:00Z',
  },
  // 2. Modificación de Rubro Presupuestal (> 20%) - Activo para prototipo
  {
    id: 'apt-002',
    code: 'MOD-RUB-02',
    name: 'Modificación de Rubro Presupuestal (> 20%)',
    description:
      'Trámite para redistribución de rubros presupuestales asignados cuando la variación supera el 20% del rubro original reglamentario. Exige concepto del comité.',
    requires_committee: true,
    is_active: true,
    display_order: 2,
    created_at: '2026-01-12T09:00:00Z',
  },
  // 3. Cambio de Participantes o Investigador Principal - Precargado inactivo
  {
    id: 'apt-003',
    code: 'CAMB-PART-03',
    name: 'Cambio de Participantes o Investigador Principal',
    description:
      'Trámite para formalizar el ingreso, retiro o relevo de investigadores principales o coinvestigadores en proyectos avalados en ejecución.',
    requires_committee: true,
    is_active: false,
    display_order: 3,
    created_at: '2026-01-13T09:30:00Z',
  },
  // 4. Prórroga de Cronograma - Activo para prototipo
  {
    id: 'apt-004',
    code: 'PROR-CRON-04',
    name: 'Prórroga de Cronograma y Tiempo de Ejecución',
    description:
      'Solicitud formal de ampliación de plazo para cumplimiento de objetivos y entregables de proyectos en ejecución activa.',
    requires_committee: true,
    is_active: true,
    display_order: 4,
    created_at: '2026-01-14T10:00:00Z',
  },
  // 5. Cambio de Horas de Dedicación - Precargado inactivo
  {
    id: 'apt-005',
    code: 'CAMB-HORA-05',
    name: 'Modificación de Horas de Dedicación Docente',
    description:
      'Ajuste formal del plan de trabajo semestral y horas de dedicación asignadas a proyectos de investigación avalados.',
    requires_committee: true,
    is_active: false,
    display_order: 5,
    created_at: '2026-01-15T10:30:00Z',
  },
  // 6. Aplazamiento de la Ejecución - Precargado inactivo
  {
    id: 'apt-006',
    code: 'APLAZ-EJEC-06',
    name: 'Aplazamiento Temporal de la Ejecución',
    description:
      'Solicitud justificada de suspensión temporal del cronograma de investigación por contingencias técnicas o fuerza mayor.',
    requires_committee: true,
    is_active: false,
    display_order: 6,
    created_at: '2026-01-15T11:00:00Z',
  },
  // 7. Cambio de Productos o Compromisos - Precargado inactivo
  {
    id: 'apt-007',
    code: 'CAMB-PROD-07',
    name: 'Modificación de Productos o Compromisos Científicos',
    description:
      'Sustitución fundamentada de entregables comprometidos por productos científicos equivalentes de igual o superior impacto.',
    requires_committee: true,
    is_active: false,
    display_order: 7,
    created_at: '2026-01-15T11:30:00Z',
  },
  // 8. Informe de Avance Periódico - Activo para prototipo (Trámite administrativo directo)
  {
    id: 'apt-008',
    code: 'INF-AVAN-08',
    name: 'Informe de Avance Periódico y Cumplimiento',
    description:
      'Reporte semestral o por hitos sobre avances técnicos, financieros y productos generados. Es resuelto directamente por el responsable técnico.',
    requires_committee: false,
    is_active: true,
    display_order: 8,
    created_at: '2026-01-16T11:00:00Z',
  },
  // 9. Informe Final y Liquidación - Activo para prototipo
  {
    id: 'apt-009',
    code: 'INF-CIER-09',
    name: 'Informe Final, Liquidación y Cierre de Proyecto',
    description:
      'Evaluación y dictamen definitivo sobre el cumplimiento integral de compromisos, productos científicos y cierre formal del expediente.',
    requires_committee: true,
    is_active: true,
    display_order: 9,
    created_at: '2026-01-18T12:00:00Z',
  },
  // 10. Aval de Convenio o Contrato Externo - Precargado inactivo
  {
    id: 'apt-010',
    code: 'AVAL-CONV-10',
    name: 'Aval de Convenio o Contrato de Cooperación Externa',
    description:
      'Aval institucional para articulación con entidades externas, fondos de cooperación internacional o convenios interinstitucionales.',
    requires_committee: true,
    is_active: false,
    display_order: 10,
    created_at: '2026-01-19T13:00:00Z',
  },
  // 11. Apoyo a Movilidad o Eventos - Precargado inactivo
  {
    id: 'apt-011',
    code: 'APOY-MOVI-11',
    name: 'Apoyo Institucional a Movilidad o Participación en Eventos',
    description:
      'Solicitud de aval y apoyo financiero institucional para presentación de ponencias en congresos científicos o pasantías de investigación.',
    requires_committee: true,
    is_active: false,
    display_order: 11,
    created_at: '2026-01-20T14:00:00Z',
  },
  // 12. Vinculación de Estudiantes o Monitores - Precargado inactivo
  {
    id: 'apt-012',
    code: 'VINC-ESTU-12',
    name: 'Vinculación de Estudiantes o Monitores de Investigación',
    description:
      'Formalización de vinculación de estudiantes de pregrado, posgrado o semilleros de investigación adscritos a proyectos institucionales.',
    requires_committee: true,
    is_active: false,
    display_order: 12,
    created_at: '2026-01-21T15:00:00Z',
  },
];

export const INITIAL_REQUIREMENTS: Requirement[] = [
  // ==========================================
  // 1. Requisitos para SOL-AVAL-01 (Aval Institucional)
  // ==========================================
  {
    id: 'req-001',
    application_type_id: 'apt-001',
    name: 'Propuesta Técnica Completa en Formato Institucional',
    description: 'Documento en plantilla institucional con planteamiento del problema, objetivos, marco teórico, metodología y bibliografía.',
    is_mandatory: true,
    is_subsanable: false, // Causal no subsanable (documento sustancial del proyecto)
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: '/templates/formato_propuesta_investigacion.pdf',
    cure_deadline_days: 0,
    created_at: '2026-01-10T08:30:00Z',
  },
  {
    id: 'req-002',
    application_type_id: 'apt-001',
    name: 'Presupuesto Detallado y Cronograma Financiero',
    description: 'Discriminación de gastos por rubros (personal, insumos, viajes, publicaciones) en formato de cálculo estandarizado.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    max_size_mb: 10,
    template_url: '/templates/formato_presupuesto_cronograma.xlsx',
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:35:00Z',
  },
  {
    id: 'req-003',
    application_type_id: 'apt-001',
    name: 'Carta de Aval del Líder del Grupo de Investigación',
    description: 'Aval firmado por el líder del grupo garantizando pertinencia con la línea de investigación declarada.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: '/templates/formato_aval_lider_grupo.pdf',
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:40:00Z',
  },
  {
    id: 'req-004',
    application_type_id: 'apt-001',
    name: 'Aval del Docente Tutor (Obligatorio para Estudiantes/Monitores)',
    description: 'Obligatorio si el solicitante es estudiante o monitor, certificando acompañamiento y supervisión docente.',
    is_mandatory: false,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: '/templates/formato_aval_tutor_docente.pdf',
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:45:00Z',
  },
  {
    id: 'req-012',
    application_type_id: 'apt-001',
    name: 'Aval del Comité de Ética o Bioética Institucional',
    description: 'Obligatorio si el proyecto contempla experimentación con seres humanos, animales o muestras biológicas protegidas.',
    is_mandatory: false,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 10,
    created_at: '2026-01-10T08:50:00Z',
  },
  {
    id: 'req-013',
    application_type_id: 'apt-001',
    name: 'Declaración de Honestidad y Originalidad Creativa',
    description: 'Certificación jurada suscrita por el equipo investigador sobre autoría original del manuscrito técnico.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:55:00Z',
  },

  // ==========================================
  // 2. Requisitos para MOD-RUB-02 (Modificación de rubro >20%)
  // ==========================================
  {
    id: 'req-005',
    application_type_id: 'apt-002',
    name: 'Justificación Técnica de Modificación Presupuestal',
    description: 'Memoria explicativa con razones académicas o de mercado que motivan el traslado presupuestal superior al 20%.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-12T09:30:00Z',
  },
  {
    id: 'req-006',
    application_type_id: 'apt-002',
    name: 'Cuadro Comparativo de Rubros Aprobados vs. Propuestos',
    description: 'Tabla comparativa detallada mostrando origen de los fondos, destino, montos en COP y porcentajes de variación.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-12T09:35:00Z',
  },

  // ==========================================
  // 3. Requisitos para CAMB-PART-03 (Cambio de Participantes)
  // ==========================================
  {
    id: 'req-014',
    application_type_id: 'apt-003',
    name: 'Solicitud Formal del Investigador Principal con Justificación',
    description: 'Exposición motivada del investigador principal detallando las razones del relevo o incorporación.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-13T10:00:00Z',
  },
  {
    id: 'req-015',
    application_type_id: 'apt-003',
    name: 'Hoja de Vida y Carta de Aceptación del Nuevo Investigador',
    description: 'Constancia de aceptación expresa de compromisos del proyecto y trayectoria académica del participante entrante.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-13T10:05:00Z',
  },
  {
    id: 'req-016',
    application_type_id: 'apt-003',
    name: 'Acta de Cesión o Carta de Renuncia del Investigador Saliente',
    description: 'Documento formal donde el investigador saliente certifica la entrega de información y renuncia voluntaria al proyecto.',
    is_mandatory: false,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-13T10:10:00Z',
  },

  // ==========================================
  // 4. Requisitos para PROR-CRON-04 (Prórroga)
  // ==========================================
  {
    id: 'req-007',
    application_type_id: 'apt-004',
    name: 'Informe de Estado Actual y Justificación Detallada de Prórroga',
    description: 'Exposición fundamentada de imprevistos o necesidades técnicas que sustentan la ampliación del plazo de ejecución.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-14T10:30:00Z',
  },
  {
    id: 'req-008',
    application_type_id: 'apt-004',
    name: 'Cronograma de Trabajo Ajustado y Plan de Entregables',
    description: 'Nuevo diagrama de Gantt detallando actividades reprogramadas, porcentaje ejecutado y fechas límite proyectadas.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-14T10:35:00Z',
  },

  // ==========================================
  // 5. Requisitos para CAMB-HORA-05 (Horas de Dedicación)
  // ==========================================
  {
    id: 'req-017',
    application_type_id: 'apt-005',
    name: 'Solicitud Formal de Ajuste de Dedicación Horaria',
    description: 'Documento justificando la redistribución de horas docentes en el plan semestral institucional.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-15T10:35:00Z',
  },
  {
    id: 'req-018',
    application_type_id: 'apt-005',
    name: 'Aval del Consejo de Facultad o Decanatura',
    description: 'Constancia oficial de la unidad académica ratificando la disponibilidad de descarga horaria del docente.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-15T10:40:00Z',
  },

  // ==========================================
  // 6. Requisitos para APLAZ-EJEC-06 (Aplazamiento)
  // ==========================================
  {
    id: 'req-020',
    application_type_id: 'apt-006',
    name: 'Solicitud Justificada de Aplazamiento Temporal',
    description: 'Memoria sustentatoria con soporte documental de las causales de fuerza mayor que impiden el avance regular.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-15T11:05:00Z',
  },
  {
    id: 'req-021',
    application_type_id: 'apt-006',
    name: 'Informe Técnico del Estado del Proyecto a la Fecha de Suspensión',
    description: 'Inventario de productos alcanzados, saldo presupuestal disponible y plan de reactivación proyectado.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-15T11:10:00Z',
  },

  // ==========================================
  // 7. Requisitos para CAMB-PROD-07 (Cambio de Productos)
  // ==========================================
  {
    id: 'req-022',
    application_type_id: 'apt-007',
    name: 'Justificación Académica del Cambio de Entregable',
    description: 'Fundamentación científica de la inviabilidad del producto original o conveniencia del producto alternativo.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-15T11:35:00Z',
  },
  {
    id: 'req-023',
    application_type_id: 'apt-007',
    name: 'Propuesta Técnica del Producto Científico Equivalente',
    description: 'Ficha técnica del nuevo producto que garantice tipología homologable según MinCiencias.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-15T11:40:00Z',
  },

  // ==========================================
  // 8. Requisitos para INF-AVAN-08 (Informe de Avance)
  // ==========================================
  {
    id: 'req-009',
    application_type_id: 'apt-008',
    name: 'Formulario de Informe de Avance Técnico y Financiero',
    description: 'Balance porcentual de cumplimiento de metas y ejecución presupuestal a la fecha de corte.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-16T11:30:00Z',
  },
  {
    id: 'req-024',
    application_type_id: 'apt-008',
    name: 'Evidencias Documentales de Avance de Objetivos',
    description: 'Borradores de artículos, bases de datos o informes de laboratorio que soportan las actividades declaradas.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-16T11:35:00Z',
  },

  // ==========================================
  // 9. Requisitos para INF-CIER-09 (Informe Final y Cierre)
  // ==========================================
  {
    id: 'req-010',
    application_type_id: 'apt-009',
    name: 'Informe Final Científico y Productos de Investigación',
    description: 'Manuscrito final con resultados, publicaciones aceptadas, ponencias o patentes generadas.',
    is_mandatory: true,
    is_subsanable: false, // No subsanable si no se entrega el informe
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 0,
    created_at: '2026-01-18T12:30:00Z',
  },
  {
    id: 'req-011',
    application_type_id: 'apt-009',
    name: 'Paz y Salvo Financiero de Liquidación Presupuestal',
    description: 'Certificado de ejecución del 100% de los recursos emitido por la Dirección Financiera.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 8,
    created_at: '2026-01-18T12:35:00Z',
  },
  {
    id: 'req-025',
    application_type_id: 'apt-009',
    name: 'Certificado de Depósito en Repositorio Institucional',
    description: 'Constancia de depósito de datasets y documentos finales en la biblioteca universitaria.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-18T12:40:00Z',
  },

  // ==========================================
  // 10. Requisitos para AVAL-CONV-10 (Convenios Externos)
  // ==========================================
  {
    id: 'req-026',
    application_type_id: 'apt-010',
    name: 'Minuta del Convenio o Contrato de Cooperación',
    description: 'Texto acordado del instrumento jurídico interinstitucional con cláusulas de propiedad intelectual.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-19T13:30:00Z',
  },
  {
    id: 'req-027',
    application_type_id: 'apt-010',
    name: 'Carta de Intención o Aval del Representante Legal Externo',
    description: 'Documento suscrito por la contraparte institucional formalizando su voluntad de coejecución.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-19T13:35:00Z',
  },

  // ==========================================
  // 11. Requisitos para APOY-MOVI-11 (Movilidad y Eventos)
  // ==========================================
  {
    id: 'req-029',
    application_type_id: 'apt-011',
    name: 'Carta Oficial de Aceptación de la Ponencia o Conferencia',
    description: 'Certificación del comité organizador del congreso o evento académico acreditando la ponencia.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-20T14:30:00Z',
  },
  {
    id: 'req-030',
    application_type_id: 'apt-011',
    name: 'Presupuesto Detallado de Movilidad e Inscripción',
    description: 'Cotizaciones de tiquetes aéreos, viáticos institucionales y valor de matrícula al certamen.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-20T14:35:00Z',
  },

  // ==========================================
  // 12. Requisitos para VINC-ESTU-12 (Vinculación de Estudiantes)
  // ==========================================
  {
    id: 'req-033',
    application_type_id: 'apt-012',
    name: 'Solicitud de Vinculación y Carta de Motivación del Estudiante',
    description: 'Manifestación de interés académico del estudiante indicando modalidad (semillero, tesis o pasantía).',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-21T15:30:00Z',
  },
  {
    id: 'req-034',
    application_type_id: 'apt-012',
    name: 'Carta de Aval y Compromiso del Docente Tutor / Investigador Principal',
    description: 'Declaración del docente tutor asumiendo la dirección y seguimiento formativo del estudiante.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-21T15:35:00Z',
  },
  {
    id: 'req-035',
    application_type_id: 'apt-012',
    name: 'Historial Académico o Certificado de Matrícula Vigente',
    description: 'Certificado de notas o constancia de matrícula regular emitido por la oficina de admisiones.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-21T15:40:00Z',
  },
];

interface CatalogState {
  types: ApplicationType[];
  requirements: Requirement[];
  selectedTypeId: string | null;
  searchQuery: string;
  filterStatus: 'ALL' | 'ACTIVE' | 'INACTIVE';

  // Filters & selection
  setSelectedTypeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;

  // Type Actions (RF-05)
  createType: (type: {
    code: string;
    name: string;
    description?: string;
    requires_committee?: boolean;
    display_order?: number;
  }) => { success: boolean; type?: ApplicationType; error?: string };

  updateType: (
    id: string,
    updates: Partial<Omit<ApplicationType, 'id' | 'created_at'>>
  ) => { success: boolean; error?: string };

  toggleTypeActive: (id: string) => { success: boolean; is_active?: boolean; error?: string };

  deleteType: (id: string) => { success: boolean; error?: string };

  // Requirement Actions (RF-06)
  addRequirement: (req: {
    application_type_id: string;
    name: string;
    description?: string;
    is_mandatory?: boolean;
    is_subsanable?: boolean;
    cure_deadline_days?: number;
    max_size_mb?: number;
    allowed_formats?: string[];
    template_url?: string;
  }) => { success: boolean; requirement?: Requirement; error?: string };

  updateRequirement: (
    id: string,
    updates: Partial<Omit<Requirement, 'id' | 'created_at'>>
  ) => { success: boolean; requirement?: Requirement; error?: string };

  removeRequirement: (id: string) => { success: boolean; error?: string };

  // Precarga y restauración del estándar inicial (T1.8 / RF-37)
  resetToStandardCatalog: () => void;

  // Sincronización Supabase
  syncWithSupabase: () => Promise<{
    success: boolean;
    error?: string;
    typesCount?: number;
    reqsCount?: number;
  }>;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      types: INITIAL_APPLICATION_TYPES,
      requirements: INITIAL_REQUIREMENTS,
      selectedTypeId: 'apt-001',
      searchQuery: '',
      filterStatus: 'ALL',

      setSelectedTypeId: (id) => set({ selectedTypeId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterStatus: (status) => set({ filterStatus: status }),

      createType: (data) => {
        const cleanCode = data.code.trim().toUpperCase();
        const existing = get().types.find((t) => t.code.toUpperCase() === cleanCode);

        if (existing) {
          return { success: false, error: `Ya existe un tipo de trámite con el código "${cleanCode}"` };
        }

        const newType: ApplicationType = {
          id: `apt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
          code: cleanCode,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          requires_committee: data.requires_committee ?? true,
          is_active: true,
          display_order: data.display_order ?? get().types.length + 1,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          types: [...state.types, newType],
          selectedTypeId: newType.id,
        }));

        // Sincronización en segundo plano con Supabase si está disponible
        const client = getSupabaseClient();
        if (client) {
          client.from('application_types').insert({
            code: newType.code,
            name: newType.name,
            description: newType.description,
            requires_committee: newType.requires_committee,
            is_active: newType.is_active,
            display_order: newType.display_order,
          }).then();
        }

        return { success: true, type: newType };
      },

      updateType: (id, updates) => {
        const currentTypes = get().types;
        const index = currentTypes.findIndex((t) => t.id === id);
        if (index === -1) {
          return { success: false, error: 'Tipo de solicitud no encontrado' };
        }

        // Si se actualiza el código, verificar que no colisione
        if (updates.code) {
          const cleanCode = updates.code.trim().toUpperCase();
          const collision = currentTypes.find((t) => t.id !== id && t.code.toUpperCase() === cleanCode);
          if (collision) {
            return { success: false, error: `El código "${cleanCode}" ya está en uso por otro tipo de solicitud` };
          }
          updates.code = cleanCode;
        }

        const updatedType = { ...currentTypes[index], ...updates };
        const newTypes = [...currentTypes];
        newTypes[index] = updatedType;

        set({ types: newTypes });

        const client = getSupabaseClient();
        if (client) {
          client.from('application_types').update(updates).eq('id', id).then();
        }

        return { success: true };
      },

      toggleTypeActive: (id) => {
        const target = get().types.find((t) => t.id === id);
        if (!target) return { success: false, error: 'Tipo no encontrado' };

        const newStatus = !target.is_active;
        const res = get().updateType(id, { is_active: newStatus });
        return { success: res.success, is_active: newStatus, error: res.error };
      },

      deleteType: (id) => {
        // En un catálogo institucional, preferir borrado lógico o deshabilitación
        const hasReqs = get().requirements.some((r) => r.application_type_id === id);
        if (hasReqs) {
          return {
            success: false,
            error: 'No se puede eliminar un tipo de solicitud que tiene requisitos asociados. Desactívelo en su lugar.',
          };
        }

        set((state) => ({
          types: state.types.filter((t) => t.id !== id),
          selectedTypeId: state.selectedTypeId === id ? (state.types[0]?.id ?? null) : state.selectedTypeId,
        }));

        const client = getSupabaseClient();
        if (client) {
          client.from('application_types').delete().eq('id', id).then();
        }

        return { success: true };
      },

      addRequirement: (data) => {
        const typeExists = get().types.some((t) => t.id === data.application_type_id);
        if (!typeExists) {
          return { success: false, error: 'El tipo de solicitud especificado no existe' };
        }

        const newReq: Requirement = {
          id: `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
          application_type_id: data.application_type_id,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          is_mandatory: data.is_mandatory ?? true,
          is_subsanable: data.is_subsanable ?? true,
          cure_deadline_days: data.is_subsanable ? (data.cure_deadline_days ?? 5) : 0,
          max_size_mb: data.max_size_mb ?? 10,
          allowed_formats: data.allowed_formats ?? ['application/pdf'],
          template_url: data.template_url?.trim() || null,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          requirements: [...state.requirements, newReq],
        }));

        const client = getSupabaseClient();
        if (client) {
          client.from('requirements').insert({
            application_type_id: newReq.application_type_id,
            name: newReq.name,
            description: newReq.description,
            is_mandatory: newReq.is_mandatory,
            is_subsanable: newReq.is_subsanable,
            cure_deadline_days: newReq.cure_deadline_days,
            max_size_mb: newReq.max_size_mb,
            allowed_formats: newReq.allowed_formats,
            template_url: newReq.template_url,
          }).then();
        }

        return { success: true, requirement: newReq };
      },

      updateRequirement: (id, updates) => {
        const reqs = get().requirements;
        const index = reqs.findIndex((r) => r.id === id);
        if (index === -1) {
          return { success: false, error: 'Requisito no encontrado' };
        }

        // Si pasa a no subsanable, fijar días en 0
        if (updates.is_subsanable === false) {
          updates.cure_deadline_days = 0;
        }

        const updatedReq = { ...reqs[index], ...updates };
        const newReqs = [...reqs];
        newReqs[index] = updatedReq;

        set({ requirements: newReqs });

        const client = getSupabaseClient();
        if (client) {
          client.from('requirements').update(updates).eq('id', id).then();
        }

        return { success: true, requirement: updatedReq };
      },

      removeRequirement: (id) => {
        set((state) => ({
          requirements: state.requirements.filter((r) => r.id !== id),
        }));

        const client = getSupabaseClient();
        if (client) {
          client.from('requirements').delete().eq('id', id).then();
        }

        return { success: true };
      },

      resetToStandardCatalog: () => {
        set({
          types: INITIAL_APPLICATION_TYPES,
          requirements: INITIAL_REQUIREMENTS,
          selectedTypeId: 'apt-001',
        });
      },

      syncWithSupabase: async () => {
        const client = getSupabaseClient();
        if (!client) {
          return { success: false, error: 'Supabase no está configurado (falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY)' };
        }

        try {
          const [typesRes, reqsRes] = await Promise.all([
            client.from('application_types').select('*').order('display_order', { ascending: true }),
            client.from('requirements').select('*'),
          ]);

          if (typesRes.error) throw typesRes.error;
          if (reqsRes.error) throw reqsRes.error;

          const typesData = typesRes.data as ApplicationType[];
          const reqsData = reqsRes.data as Requirement[];

          if (typesData && typesData.length > 0) {
            set({
              types: typesData,
              requirements: reqsData || [],
              selectedTypeId: typesData[0].id,
            });
          }

          return {
            success: true,
            typesCount: typesData?.length ?? 0,
            reqsCount: reqsData?.length ?? 0,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido al sincronizar catálogo';
          return { success: false, error: msg };
        }
      },
    }),
    {
      name: 'seed_catalog_store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // Si no existe versión 2 o tiene menos de los 12 tipos estándar, cargar el catálogo completo
        if (version < 2 || !persistedState?.types || persistedState.types.length < 12) {
          return {
            ...persistedState,
            types: INITIAL_APPLICATION_TYPES,
            requirements: INITIAL_REQUIREMENTS,
            selectedTypeId: 'apt-001',
          };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage: Storage }).localStorage) {
          return (globalThis as unknown as { localStorage: Storage }).localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
