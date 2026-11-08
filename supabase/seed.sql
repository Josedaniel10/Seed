-- Seed: Catálogo inicial estándar precargado de tipos de solicitud y requisitos
-- Estándar para comités de investigación universitarios colombianos (T1.7, T1.8 / RF-05, RF-06, RF-37, RN-10, RN-11)
-- Basado en la sección 2.10 del plan de desarrollo: 5 tipos prioritarios activos para el prototipo (1, 2, 4, 8, 9)
-- y 7 tipos complementarios precargados en estado inactivo (is_active: false) editables por el administrador.

-- 1. Insertar los 12 Tipos de Solicitud de Investigación Estándar
INSERT INTO application_types (id, code, name, description, requires_committee, is_active, display_order)
VALUES
  -- 1. Presentación de proyecto (aval) - Activo para prototipo
  (
    'a0000000-0000-0000-0000-000000000001',
    'SOL-AVAL-01',
    'Presentación de Proyecto de Investigación (Aval Institucional)',
    'Solicitud de aval académico e institucional para nuevos proyectos de investigación docente o de semilleros para convocatorias internas o externas.',
    true,
    true,
    1
  ),
  -- 2. Modificación de rubro presupuestal (> 20%) - Activo para prototipo
  (
    'a0000000-0000-0000-0000-000000000002',
    'MOD-RUB-02',
    'Modificación de Rubro Presupuestal (> 20%)',
    'Trámite para redistribución de rubros presupuestales asignados cuando la variación supera el 20% del rubro original reglamentario. Exige concepto del comité.',
    true,
    true,
    2
  ),
  -- 3. Cambio de participantes o investigador principal - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000003',
    'CAMB-PART-03',
    'Cambio de Participantes o Investigador Principal',
    'Trámite para formalizar el ingreso, retiro o relevo de investigadores principales o coinvestigadores en proyectos avalados en ejecución.',
    true,
    false,
    3
  ),
  -- 4. Prórroga de cronograma - Activo para prototipo
  (
    'a0000000-0000-0000-0000-000000000004',
    'PROR-CRON-04',
    'Prórroga de Cronograma y Tiempo de Ejecución',
    'Solicitud formal de ampliación de plazo para cumplimiento de objetivos y entregables de proyectos en ejecución activa.',
    true,
    true,
    4
  ),
  -- 5. Cambio de horas de dedicación - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000005',
    'CAMB-HORA-05',
    'Modificación de Horas de Dedicación Docente',
    'Ajuste formal del plan de trabajo semestral y horas de dedicación asignadas a proyectos de investigación avalados.',
    true,
    false,
    5
  ),
  -- 6. Aplazamiento de la ejecución - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000006',
    'APLAZ-EJEC-06',
    'Aplazamiento Temporal de la Ejecución',
    'Solicitud justificada de suspensión temporal del cronograma de investigación por contingencias técnicas o fuerza mayor.',
    true,
    false,
    6
  ),
  -- 7. Cambio de productos o compromisos - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000007',
    'CAMB-PROD-07',
    'Modificación de Productos o Compromisos Científicos',
    'Sustitución fundamentada de entregables comprometidos por productos científicos equivalentes de igual o superior impacto.',
    true,
    false,
    7
  ),
  -- 8. Informe de avance periódico - Activo para prototipo (Trámite administrativo directo)
  (
    'a0000000-0000-0000-0000-000000000008',
    'INF-AVAN-08',
    'Informe de Avance Periódico y Cumplimiento',
    'Reporte semestral o por hitos sobre avances técnicos, financieros y productos generados. Es resuelto directamente por el responsable técnico.',
    false,
    true,
    8
  ),
  -- 9. Informe final y liquidación - Activo para prototipo
  (
    'a0000000-0000-0000-0000-000000000009',
    'INF-CIER-09',
    'Informe Final, Liquidación y Cierre de Proyecto',
    'Evaluación y dictamen definitivo sobre el cumplimiento integral de compromisos, productos científicos y cierre formal del expediente.',
    true,
    true,
    9
  ),
  -- 10. Aval de convenio o contrato externo - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000010',
    'AVAL-CONV-10',
    'Aval de Convenio o Contrato de Cooperación Externa',
    'Aval institucional para articulación con entidades externas, fondos de cooperación internacional o convenios interinstitucionales.',
    true,
    false,
    10
  ),
  -- 11. Apoyo a movilidad o eventos - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000011',
    'APOY-MOVI-11',
    'Apoyo Institucional a Movilidad o Participación en Eventos',
    'Solicitud de aval y apoyo financiero institucional para presentación de ponencias en congresos científicos o pasantías de investigación.',
    true,
    false,
    11
  ),
  -- 12. Vinculación de estudiantes o monitores - Precargado inactivo
  (
    'a0000000-0000-0000-0000-000000000012',
    'VINC-ESTU-12',
    'Vinculación de Estudiantes o Monitores de Investigación',
    'Formalización de vinculación de estudiantes de pregrado, posgrado o semilleros de investigación adscritos a proyectos institucionales.',
    true,
    false,
    12
  )
ON CONFLICT (code) DO NOTHING;

-- 2. Insertar Requisitos Específicos por Tipo de Trámite (RN-10, RN-11)
INSERT INTO requirements (id, application_type_id, name, description, is_mandatory, is_subsanable, allowed_formats, max_size_mb, template_url, cure_deadline_days)
VALUES
  -- 2.1 Requisitos para SOL-AVAL-01 (Aval Institucional)
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Propuesta Técnica Completa en Formato Institucional',
    'Documento en plantilla institucional con planteamiento del problema, objetivos, marco teórico, metodología y bibliografía.',
    true,
    false, -- RN-11: No subsanable (documento sustancial del proyecto)
    ARRAY['application/pdf'],
    10,
    '/templates/formato_propuesta_investigacion.pdf',
    0
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Presupuesto Detallado y Cronograma Financiero',
    'Discriminación de gastos por rubros (personal, insumos, viajes, publicaciones) en formato de cálculo estandarizado.',
    true,
    true,
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    10,
    '/templates/formato_presupuesto_cronograma.xlsx',
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Carta de Aval del Líder del Grupo de Investigación',
    'Aval firmado por el líder del grupo garantizando pertinencia con la línea de investigación declarada.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    '/templates/formato_aval_lider_grupo.pdf',
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Aval del Docente Tutor (Obligatorio para Estudiantes/Monitores)',
    'Obligatorio si el solicitante es estudiante o monitor, certificando acompañamiento y supervisión docente.',
    false,
    true,
    ARRAY['application/pdf'],
    5,
    '/templates/formato_aval_tutor_docente.pdf',
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000001',
    'Aval del Comité de Ética o Bioética Institucional',
    'Obligatorio si el proyecto contempla experimentación con seres humanos, animales o muestras biológicas protegidas.',
    false,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    10
  ),
  (
    'b0000000-0000-0000-0000-000000000013',
    'a0000000-0000-0000-0000-000000000001',
    'Declaración de Honestidad y Originalidad Creativa',
    'Certificación jurada suscrita por el equipo investigador sobre autoría original del manuscrito técnico.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.2 Requisitos para MOD-RUB-02 (Modificación presupuestal >20%)
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',
    'Justificación Técnica de Modificación Presupuestal',
    'Memoria explicativa con razones académicas o de mercado que motivan el traslado presupuestal superior al 20%.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000002',
    'Cuadro Comparativo de Rubros Aprobados vs. Propuestos',
    'Tabla comparativa detallada mostrando origen de los fondos, destino, montos en COP y porcentajes de variación.',
    true,
    true,
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    5,
    NULL,
    5
  ),

  -- 2.3 Requisitos para CAMB-PART-03 (Cambio de participantes)
  (
    'b0000000-0000-0000-0000-000000000014',
    'a0000000-0000-0000-0000-000000000003',
    'Solicitud Formal del Investigador Principal con Justificación',
    'Exposición motivada del investigador principal detallando las razones del relevo o incorporación.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000015',
    'a0000000-0000-0000-0000-000000000003',
    'Hoja de Vida y Carta de Aceptación del Nuevo Investigador',
    'Constancia de aceptación expresa de compromisos del proyecto y trayectoria académica del participante entrante.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.4 Requisitos para PROR-CRON-04 (Prórroga)
  (
    'b0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000004',
    'Informe de Estado Actual y Justificación Detallada de Prórroga',
    'Exposición fundamentada de imprevistos o necesidades técnicas que sustentan la ampliación del plazo de ejecución.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000004',
    'Cronograma de Trabajo Ajustado y Plan de Entregables',
    'Nuevo diagrama de Gantt detallando actividades reprogramadas, porcentaje ejecutado y fechas límite proyectadas.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.5 Requisitos para CAMB-HORA-05 (Horas de dedicación)
  (
    'b0000000-0000-0000-0000-000000000017',
    'a0000000-0000-0000-0000-000000000005',
    'Solicitud Formal de Ajuste de Dedicación Horaria',
    'Documento justificando la redistribución de horas docentes en el plan semestral institucional.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000018',
    'a0000000-0000-0000-0000-000000000005',
    'Aval del Consejo de Facultad o Decanatura',
    'Constancia oficial de la unidad académica ratificando la disponibilidad de descarga horaria del docente.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.6 Requisitos para APLAZ-EJEC-06 (Aplazamiento)
  (
    'b0000000-0000-0000-0000-000000000020',
    'a0000000-0000-0000-0000-000000000006',
    'Solicitud Justificada de Aplazamiento Temporal',
    'Memoria sustentatoria con soporte documental de las causales de fuerza mayor que impiden el avance regular.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000021',
    'a0000000-0000-0000-0000-000000000006',
    'Informe Técnico del Estado del Proyecto a la Fecha de Suspensión',
    'Inventario de productos alcanzados, saldo presupuestal disponible y plan de reactivación proyectado.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),

  -- 2.7 Requisitos para CAMB-PROD-07 (Cambio de productos)
  (
    'b0000000-0000-0000-0000-000000000022',
    'a0000000-0000-0000-0000-000000000007',
    'Justificación Académica del Cambio de Entregable',
    'Fundamentación científica de la inviabilidad del producto original o conveniencia del producto alternativo.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.8 Requisitos para INF-AVAN-08 (Informe de avance)
  (
    'b0000000-0000-0000-0000-000000000009',
    'a0000000-0000-0000-0000-000000000008',
    'Formulario de Informe de Avance Técnico y Financiero',
    'Balance porcentual de cumplimiento de metas y ejecución presupuestal a la fecha de corte.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000024',
    'a0000000-0000-0000-0000-000000000008',
    'Evidencias Documentales de Avance de Objetivos',
    'Borradores de artículos, bases de datos o informes de laboratorio que soportan las actividades declaradas.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),

  -- 2.9 Requisitos para INF-CIER-09 (Informe final y cierre)
  (
    'b0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000009',
    'Informe Final Científico y Productos de Investigación',
    'Manuscrito final con resultados, publicaciones aceptadas, ponencias o patentes generadas.',
    true,
    false, -- No subsanable si no se entrega
    ARRAY['application/pdf'],
    10,
    NULL,
    0
  ),
  (
    'b0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000009',
    'Paz y Salvo Financiero de Liquidación Presupuestal',
    'Certificado de ejecución del 100% de los recursos emitido por la Dirección Financiera.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    8
  ),
  (
    'b0000000-0000-0000-0000-000000000025',
    'a0000000-0000-0000-0000-000000000009',
    'Certificado de Depósito en Repositorio Institucional',
    'Constancia de depósito de datasets y documentos finales en la biblioteca universitaria.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.10 Requisitos para AVAL-CONV-10 (Convenios Externos)
  (
    'b0000000-0000-0000-0000-000000000026',
    'a0000000-0000-0000-0000-000000000010',
    'Minuta del Convenio o Contrato de Cooperación',
    'Texto acordado del instrumento jurídico interinstitucional con cláusulas de propiedad intelectual.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000027',
    'a0000000-0000-0000-0000-000000000010',
    'Carta de Intención o Aval del Representante Legal Externo',
    'Documento suscrito por la contraparte institucional formalizando su voluntad de coejecución.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.11 Requisitos para APOY-MOVI-11 (Movilidad y Eventos)
  (
    'b0000000-0000-0000-0000-000000000029',
    'a0000000-0000-0000-0000-000000000011',
    'Carta Oficial de Aceptación de la Ponencia o Conferencia',
    'Certificación del comité organizador del congreso o evento académico acreditando la ponencia.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000030',
    'a0000000-0000-0000-0000-000000000011',
    'Presupuesto Detallado de Movilidad e Inscripción',
    'Cotizaciones de tiquetes aéreos, viáticos institucionales y valor de matrícula al certamen.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.12 Requisitos para VINC-ESTU-12 (Vinculación de Estudiantes)
  (
    'b0000000-0000-0000-0000-000000000033',
    'a0000000-0000-0000-0000-000000000012',
    'Solicitud de Vinculación y Carta de Motivación del Estudiante',
    'Manifestación de interés académico del estudiante indicando modalidad (semillero, tesis o pasantía).',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000034',
    'a0000000-0000-0000-0000-000000000012',
    'Carta de Aval y Compromiso del Docente Tutor / Investigador Principal',
    'Declaración del docente tutor asumiendo la dirección y seguimiento formativo del estudiante.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Cuenta de Administrador Principal Institucional (admin@seed.com / admin123)
-- Perfil base y roles preconfigurados para Supabase
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  academic_program,
  academic_link,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@seed.com',
  'Administrador Principal Seed',
  'admin',
  'Dirección de Investigaciones y Tecnología',
  'Personal administrativo',
  true
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = 'admin',
    is_active = true;

-- Asignación de rol 'admin' en user_roles
INSERT INTO user_roles (user_id, role, is_active)
SELECT id, 'admin', true
FROM profiles
WHERE email = 'admin@seed.com'
ON CONFLICT (user_id, role) DO NOTHING;
