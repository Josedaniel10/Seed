-- Seed: Catálogo inicial estándar precargado de tipos de solicitud y requisitos
-- Estándar para comités de investigación universitarios (T1.7, T1.8 / RF-05, RF-06, RF-37, RN-10, RN-11)

-- 1. Insertar Tipos de Solicitud de Investigación
INSERT INTO application_types (id, code, name, description, requires_committee, is_active, display_order)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'SOL-AVAL-01',
    'Presentación de Proyecto de Investigación (Aval Institucional)',
    'Solicitud de aval académico e institucional para nuevos proyectos de investigación docente o de semilleros para convocatorias internas o externas.',
    true,
    true,
    1
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'MOD-RUB-02',
    'Modificación de Rubro Presupuestal (> 20%)',
    'Trámite para redistribución de rubros presupuestales asignados cuando la variación supera el 20% del rubro original (RN-13). Exige concepto del comité.',
    true,
    true,
    2
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'PROR-CRON-03',
    'Prórroga de Cronograma y Tiempo de Ejecución',
    'Solicitud formal de ampliación de plazo para cumplimiento de objetivos y entregables de proyectos en ejecución activa.',
    true,
    true,
    3
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'INF-AVAN-04',
    'Informe de Avance Periódico y Cumplimiento',
    'Reporte semestral o por hitos sobre avances técnicos, financieros y productos generados en el marco del proyecto.',
    false,
    true,
    4
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'INF-CIER-05',
    'Informe Final, Liquidación y Cierre de Proyecto',
    'Evaluación y dictamen definitivo sobre el cumplimiento integral de compromisos, productos científicos y cierre formal del expediente.',
    true,
    true,
    5
  )
ON CONFLICT (code) DO NOTHING;

-- 2. Insertar Requisitos Específicos por Tipo de Trámite (RN-10, RN-11)
-- 2.1 Requisitos para SOL-AVAL-01 (Aval Institucional)
INSERT INTO requirements (id, application_type_id, name, description, is_mandatory, is_subsanable, allowed_formats, max_size_mb, template_url, cure_deadline_days)
VALUES
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
    true, -- RN-11: Subsanable
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
    'Aval del Docente Tutor (Obligatorio para Estudiantes/Monitores RN-09)',
    'Obligatorio si el solicitante es estudiante o monitor, certificando acompañamiento y supervisión docente.',
    false, -- Condicional por perfil
    true,
    ARRAY['application/pdf'],
    5,
    '/templates/formato_aval_tutor_docente.pdf',
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

  -- 2.3 Requisitos para PROR-CRON-03 (Prórroga)
  (
    'b0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000003',
    'Informe de Estado Actual y Justificación de Prórroga',
    'Exposición fundamentada de imprevistos o necesidades técnicas que sustentan la ampliación del plazo.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000003',
    'Cronograma de Trabajo Ajustado',
    'Nuevo diagrama de Gantt o cronograma detallando actividades pendientes y fechas límite proyectadas.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    5
  ),

  -- 2.4 Requisitos para INF-AVAN-04 (Informe de avance)
  (
    'b0000000-0000-0000-0000-000000000009',
    'a0000000-0000-0000-0000-000000000004',
    'Formulario de Informe de Avance Técnico y Financiero',
    'Balance porcentual de cumplimiento de metas y ejecución presupuestal a la fecha de corte.',
    true,
    true,
    ARRAY['application/pdf'],
    10,
    NULL,
    5
  ),

  -- 2.5 Requisitos para INF-CIER-05 (Informe final y cierre)
  (
    'b0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000005',
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
    'a0000000-0000-0000-0000-000000000005',
    'Paz y Salvo Financiero de Liquidación Presupuestal',
    'Certificado de ejecución del 100% de los recursos emitido por la Dirección Financiera.',
    true,
    true,
    ARRAY['application/pdf'],
    5,
    NULL,
    8
  )
ON CONFLICT (id) DO NOTHING;
