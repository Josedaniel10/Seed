# Seed: Sistema de Gestión del Comité de Investigación Universitaria

Plan maestro de arquitectura, desarrollo y ejecución técnica para **Seed**, plataforma institucional para la gestión del Comité de Investigaciones de la universidad. El proyecto implementa una metodología estricta de entrega continua: **una tarea, una verificación, un commit**, garantizando estabilidad, pruebas automáticas, inmutabilidad de actuaciones y trazabilidad completa.

---

## Decisiones Críticas y Reglas de Desarrollo

> [!IMPORTANT]
> **Método de Trabajo Obligatorio (Una tarea, una verificación, un commit)**
> Cada una de las 55 tareas del plan se desarrolla siguiendo un ciclo indivisible de 7 pasos:
> 1. **Definición previa**: Se declara el resultado esperado y el procedimiento de prueba antes de programar.
> 2. **Alcance aislado**: Se implementa únicamente la tarea en curso, sin tocar archivos ni funcionalidades ajenas.
> 3. **Pruebas**: Pruebas automáticas (Vitest o pgTAP) en reglas críticas y verificación manual paso a paso.
> 4. **Detenerse y presentar**: El desarrollador presenta un resumen técnico de qué cambió y cómo verificarlo en el entorno interactivo, deteniéndose a esperar confirmación del usuario.
> 5. **Verificación**: Se confirma que el comportamiento observado coincide con el criterio de aceptación.
> 6. **Commit supervisado**: Se ejecuta el commit en Git solo tras la aprobación explícita del usuario, en inglés con convención de prefijos (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`). No se hacen commits autónomos.
> 7. **Transición**: Se avanza a la siguiente tarea únicamente con el código en verde. No se acumulan tareas con errores.
>
> **Reglas para la IA**:
> - Prohibido avanzar a la siguiente tarea sin confirmación explícita del usuario.
> - Prohibido hacer commits sin autorización previa.
> - Si se detecta un faltante o mejora fuera de alcance, se anota como nueva tarea en el plan; no se resuelve de paso.
> - Al finalizar cada Sprint, se corren todas las pruebas integrales, se revisa el entregable del sprint y se genera una etiqueta de versión (`v0.1`, `v0.2`, etc.).

---

## 1. Visión General y Concepto del Sistema

### Propósito
Centralizar y agilizar las solicitudes del Comité de Investigaciones universitarias con estricto rigor normativo, validación documental, asignación de evaluadores sin conflicto de intereses, deliberación en sesiones colegiadas y emisión de actas oficiales.

### Stack Tecnológico
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion.
- **Formularios y Validación**: React Hook Form + Zod.
- **Estado y Caché**: TanStack Query (datos del servidor) y Zustand (estado de interfaz local).
- **Backend y Base de Datos**: Supabase en la nube (PostgreSQL, Supabase Auth con JWT de expiración corta, Políticas RLS, funciones SQL RPC y triggers).
- **Servicio de Archivos Local (`/api/files`)**: Servidor Node.js + Express que almacena físicamente los documentos en el equipo de la institución, verificando el token Bearer de Supabase y registrando en la base de datos únicamente metadatos (nombre, ruta, tamaño y hash SHA-256).
- **Pruebas**: Vitest (frontend y lógica de negocio) y pruebas SQL (pgTAP / Supabase CLI).

---

## 2. Experiencia de Usuario y Diseño Visual

Inspirado en la composición de la referencia visual (`image_3bc5a847.png`) adaptada al concepto botánico de **Seed**:
- **Paleta Botánica Orgánica**:
  - Verde bosque profundo: `#14281D` (color primario institucional, textos principales y botones primarios).
  - Superficies neutras piedra y lino: `#F8F7F4` (fondo general), `#FFFFFF` (tarjetas), bordes sutiles en `#E5E3DC`.
  - Acento brote lima: `#84CC16` / `#A3E635` **exclusivamente como fondo de relleno con texto en verde oscuro** `#14281D` (cumpliendo ratio WCAG AA $\ge 4.5:1$). Nunca como color de texto sobre fondo claro.
- **Iconografía Semántica de Estados**: Cada estado incorpora siempre **ícono y texto**, jamás solo color:
  - *Radicada*: `Inbox` + texto "Radicada".
  - *Pendiente por documentos*: `AlertCircle` + texto "Pendiente por docs".
  - *En revisión*: `Search` + texto "En revisión".
  - *Lista para comité*: `Scale` + texto "Lista para comité".
  - *Decididas (Aprobada / Rechazada)*: `CheckCircle2` / `XCircle` + texto explícito.
- **Tablero Kanban con Franja de Métricas Unificada**:
  - Franja superior con contadores reales individuales para cada estado exacto (RF-35).
  - Columnas del Kanban: *Radicada*, *Pendiente por documentos*, *En revisión*, *Lista para comité* y *Decididas*.
  - **Arrastre condicional con Diálogo de Acción**: El arrastre solo está habilitado cuando el rol y las reglas de negocio lo permiten, y **al soltar la tarjeta se abre de inmediato el diálogo de la acción correspondiente**.
  - **Solo lectura para Investigadores**: Los investigadores visualizan el estado de sus trámites sin capacidad de arrastre.

---

## 3. Reglas de Negocio Institucionales (RN-01 a RN-14)

- **RN-01**: Una solicitud tiene un único estado actual. *Cerrada* es un estado final.
- **RN-02**: Solo pasa a *En revisión* si el 100% de los requisitos obligatorios están marcados como válidos.
- **RN-03**: Un integrante del comité no puede revisar ni votar en sus propias solicitudes.
- **RN-04**: Solo las solicitudes en estado *Lista para comité* pueden entrar en la agenda de una sesión.
- **RN-05**: Toda decisión de rechazo o aprobación con ajustes exige justificación motivada por escrito.
- **RN-06**: Una decisión *Aplazada* mantiene la solicitud en *Lista para comité* para la siguiente sesión.
- **RN-07**: Se exige quórum mínimo reglamentario de integrantes verificados para registrar decisiones en sesión.
- **RN-08**: Reasignar un revisor conserva las asignaciones anteriores marcadas como inactivas en el historial.
- **RN-09**: Estudiantes y monitores requieren aval de docente tutor como requisito obligatorio.
- **RN-10**: Cada tipo de solicitud define en el catálogo sus requisitos documentales exigidos.
- **RN-11**: Requisitos subsanables y no subsanables: la falta de uno subsanable pasa la solicitud a *Pendiente por documentos*; la falta de uno no subsanable causa rechazo inmediato en validación.
- **RN-12**: Trámites sobre proyectos en ejecución solo los solicita el Investigador Principal.
- **RN-13**: Cambio de rubro solo pasa a comité si la modificación supera el 20% del rubro asignado.
- **RN-14 (Conflicto de intereses ampliado)**: Un evaluador o integrante no puede revisar, deliberar ni votar solicitudes radicadas por él mismo, ni donde figure como coinvestigador, ni de miembros de su mismo grupo de investigación.

---

## 4. Arquitectura y Componentes Técnicos

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 + TypeScript + Tailwind CSS v4)                                    │
│ ├─ Form Layer: React Hook Form + Esquemas Zod                                          │
│ ├─ Data Sync: TanStack Query (Supabase Client + Cache)                                │
│ ├─ UI State: Zustand (Filtros, vistas Kanban/Tabla, modales)                           │
│ ├─ Views:                                                                              │
│ │   ├─ AuthView: Registro e inicio de sesión por rol                                   │
│ │   ├─ MetricsStrip: 6 contadores exactos por estado (RF-35)                          │
│ │   ├─ ApplicationsTable: Vista de datos con filtros por tipo, fecha y texto          │
│ │   ├─ KanbanBoard (Sprint 3): Drag & drop con modales de acción guiada                │
│ │   ├─ FilingWizard: Radicación guiada con carga a /api/files                         │
│ │   ├─ ValidationModal: Checklist de requisitos subsanables y no subsanables          │
│ │   ├─ ReviewerPanel: Evaluación técnica, observaciones y conceptos                    │
│ │   ├─ SessionManager: Agenda de comité, quórum y registro de decisiones               │
│ │   └─ ApplicationDrawer: Cronología vertical inmutable de actuaciones (RF-23)         │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────────────────────┐
│ FILE SERVICE LOCAL (Express API)     │ │ SUPABASE (PostgreSQL + Auth + RLS)            │
│ ├─ /api/files/upload                 │ │ ├─ Auth: JWT, usuarios y roles                │
│ ├─ /api/files/download/:id           │ │ ├─ Tablas: applications, requirements, etc.   │
│ ├─ Verificación Bearer Token Supabase│ │ ├─ Funciones SQL (RPC): transiciones, quórum │
│ └─ Almacenamiento local en disco     │ │ ├─ Triggers: audit_history inmutable          │
│    (Metadatos y Hash SHA-256)        │ │ └─ Políticas RLS por rol de usuario           │
└──────────────────────────────────────┘ └───────────────────────────────────────────────┘
```

---

## 5. Desglose Detallado de Tareas (7.2)

### Sprint 0 · Preparación

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T0.1** | Crear la estructura del repositorio con carpetas `frontend`, `supabase` y `file-service` | La estructura modular existe y se encuentra versionada | RNF-07 |
| **T0.2** | Frontend base con Vite, React 19, TypeScript, Tailwind CSS y ESLint | El entorno compila y pasa el linting sin advertencias ni errores | RNF-07 |
| **T0.3** | Tema visual de Seed: paleta verde bosque, acento lima y logo SVG de semilla | Muestra visual interactiva con verificación de ratios de contraste WCAG AA | RNF-05 |
| **T0.4** | Cliente de Supabase integrado en el frontend | Una consulta de verificación responde exitosamente desde la interfaz | RNF-01 |
| **T0.5** | Migración inicial con el esquema de tablas relacionales | El esquema SQL se aplica y revierte limpiamente sin fallos | RNF-02 |
| **T0.6** | Servicio de archivos local mínimo (`/api/files`) | Un archivo de prueba se sube al disco local, se guarda y se descarga con idéntico hash SHA-256 | RNF-04 |

---

### Sprint 1 · Acceso y Catálogo

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T1.1** | Formulario de registro de investigadores con React Hook Form + Zod | Se crea el usuario y su perfil institucional; los errores de validación de campos se muestran en vivo | RF-01 |
| **T1.2** | Inicio y cierre de sesión con Supabase Auth | La sesión se preserva al recargar el navegador y se destruye por completo al cerrar sesión | RF-02 |
| **T1.3** | Roles y políticas RLS básicas | Prueba SQL: cada rol accede únicamente a los registros autorizados en su nivel | RNF-02 |
| **T1.4** | Rutas protegidas y navegación basada en roles | Un usuario con rol Investigador no puede acceder a las vistas ni acciones de administración | RF-02 |
| **T1.5** | Gestión de usuarios y asignación de roles | El administrador modifica el rol de un usuario y los permisos se actualizan de inmediato | RF-03 |
| **T1.6** | Gestión de grupos de investigación | Se registra un grupo con su código institucional y se asigna su docente líder | RF-04 |
| **T1.7** | Gestión de tipos de solicitud y requisitos | Se crea un tipo de trámite con requisitos obligatorios, condicionales y subsanables | RF-05, RF-06 |
| **T1.8** | Precarga del catálogo inicial estándar | Completado: 12 tipos estándar precargados según sección 2.10 (5 prioritarios activos y 7 complementarios inactivos configurables), 31 requisitos y pruebas automáticas en `catalogSeedPreload.test.js` | RF-37 |

---

### Sprint 2 · Radicación

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T2.1** | Paso 1 de radicación: selección de tipo de solicitud y datos generales | Completado: Despliegue dinámico de requisitos por tipo en Wizard, validación Zod y pruebas automáticas en `filingWizardRequirements.test.js` | RF-07 |
| **T2.2** | Asignación de número de radicado consecutivo ininterrumpido | Completado: Generador atómico sin colisiones en formato `Radicado YYYY-XXX`, validado con 10 peticiones simultáneas en `consecutiveFilingNumber.test.js` | RF-08 |
| **T2.3** | Carga de documentos por requisito hacia el servicio de archivos local | Completado: Metadatos y hash SHA-256 vinculados por requisito y probados en `documentValidationAndUpload.test.js` | RF-09 |
| **T2.4** | Validación estricta de documentos (formato PDF/DOCX y tamaño máximo) | Completado: Rechazo estricto de ejecutables (.exe, .sh, etc.) y archivos > 10MB con pruebas automáticas en `documentValidationAndUpload.test.js` | RNF-04 |
| **T2.5** | Finalizar radicación con estado inicial `Radicada` e historial | Completado: Solicitud formal en estado `RADICADA` y primer evento en bitácora inmutable en `applicationFilingLifecycle.test.js` | RF-08, RF-23 |
| **T2.6** | Vista de Mis Solicitudes con filtros para investigadores | Completado: Aislamiento estricto de expedientes por investigador, filtros en vivo, columna "Qué Falta" y pruebas en `myApplicationsAndDetail.test.js` | RF-11 |
| **T2.7** | Vista de detalle de solicitud con cronología vertical | Completado: Cronología vertical inmutable, visualización y subsanación documental, verificado en `myApplicationsAndDetail.test.js` | RF-23 |

---

### Sprint 3 · Validación y Revisión (Incluye Tablero Kanban)

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T3.1** | Lista de verificación de requisitos para el personal administrativo | Completado: Lista interactiva en `ValidacionPage.tsx`, discriminación de subsanabilidad y verificación en `documentValidationWorkflow.test.js` | RF-12 |
| **T3.2** | Validar o rechazar documentos individuales con motivo justificado | Completado: Rechazo exige justificación obligatoria (RN-05) y se asienta en auditoría, verificado en `documentValidationWorkflow.test.js` | RF-13, RN-05 |
| **T3.3** | Recarga y subsanación de documentos rechazados | Completado: Reemplazo documental mediante `subsanarDocument`, actualización de metadatos SHA-256 y paso a validación pendiente en `myApplicationsAndDetail.test.js` | RF-10 |
| **T3.4** | Función de transición de estados reglamentaria | Completado: Matriz `ALLOWED_TRANSITIONS` estricta, bloqueo de saltos inválidos y verificación en `stateTransitionsAndInmutability.test.js` | RF-21, RN-01 |
| **T3.5** | Bitácora de historial inmutable (Trigger append-only) | Completado: Bloqueo de mutaciones y eliminaciones (RNF-03), verificado en `stateTransitionsAndInmutability.test.js` | RF-23, RNF-03 |
| **T3.6** | Transición automática de estado tras validación documental | Completado: No subsanable -> `RECHAZADA`; subsanable -> `PENDIENTE_DOCUMENTOS`; 100% válido -> `EN_REVISION`, verificado en `documentValidationWorkflow.test.js` | RF-14, RN-02, RN-11 |
| **T3.7** | Asignación de evaluador con bloqueo de conflicto de intereses | Completado: Inhabilidad por evaluar propia solicitud (RN-03) e inhabilidad por mismo grupo de investigación (RN-14) bloqueadas en `reviewerConflictAndAssignment.test.js` | RF-15, RN-03, RN-14 |
| **T3.8** | Reasignación de evaluador | Completado: Preservación de asignación previa con `is_active: false` y activación de nueva asignación en `reviewerConflictAndAssignment.test.js` | RF-16, RN-08 |
| **T3.9** | Formulario de observaciones técnicas clasificadas | Completado: Categorización tipificada (`ACLARACION`, `AJUSTE_OBLIGATORIO`, `SUGERENCIA`), probado en `technicalEvaluationAndConcept.test.js` | RF-17 |
| **T3.10** | Solicitud formal de ajustes con plazo y respuesta del investigador | Completado: Interacción formal mediante `respondToObservation`, verificado en `technicalEvaluationAndConcept.test.js` | RF-18 |
| **T3.11** | Emisión de concepto técnico y pase a `Lista para comité` | Completado: Concepto motivado por escrito (RN-05) y avance normativo a `LISTA_COMITE` (RF-20) verificado en `technicalEvaluationAndConcept.test.js` | RF-19, RF-20 |
| **T3.12** | Monitor de seguimiento de plazos y vencimientos | Completado: Detección de plazos críticos y vencidos (`getDeadlineStatus`), alertas visuales y probado en `technicalEvaluationAndConcept.test.js` | RF-22 |
| **T3.13** | Franja superior de métricas unificada | Completado: Contadores dinámicos sincronizados al 100% con la base de datos (`getStatusCounts`), probado en `kanbanAndMetrics.test.js` | RF-35 |
| **T3.14** | Vista de tabla estructurada con filtros avanzados | Completado: Búsqueda libre, filtrado multidimensional por estado y tipo de trámite en `PanelSeguimientoPage.tsx`, probado en `kanbanAndMetrics.test.js` | RF-11 |
| **T3.15** | Tablero Kanban con arrastre controlado y diálogo de acción | Completado: 5 columnas operativas, validación de arrastre reglamentario, diálogo de acción guiado y modo solo lectura para investigadores, probado en `kanbanAndMetrics.test.js` | RF-21 |

---

### Sprint 4 · Sesiones y Decisiones

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T4.1** | Creación y programación de sesiones de comité | Completado: Secuencia anual consecutiva (`Sesión Ordinaria Nº 05 - 2026`), tipo, fecha, hora, lugar y persistencia en `committeeSessionsStore.ts`, verificado en `sessionSchedulingAndAgenda.test.js` | RF-24 |
| **T4.2** | Conformación de agenda con solicitudes `Listas para comité` | Completado: Validación estricta RN-04 (solo expedientes en `LISTA_COMITE`), asignación de ponente colegiado y ordenamiento en agenda en `sessionSchedulingAndAgenda.test.js` | RF-25, RN-04 |
| **T4.3** | Cierre de agenda y convocatoria formal | Completado: Cierre formal con bandera `is_agenda_closed: true`, bloqueo de incorporaciones posteriores (RN-04) y convocatoria en `sessionSchedulingAndAgenda.test.js` | RF-26 |
| **T4.4** | Registro de asistencia y verificación automática de quórum | Completado: Control de quórum en tiempo real (`checkSessionQuorum`), cálculo de mayoría requerida y bloqueo estricto de votación sin quórum (RN-07) en `quorumAndDecisionsWorkflow.test.js` | RF-27, RN-07 |
| **T4.5** | Registro formal de decisión con justificación motivada | Completado: Tipificación (Aprobada, Aprobada con ajustes, Rechazada, Aplazada), justificación escrita obligatoria (RN-05) y preservación de `LISTA_COMITE` ante Aplazada (RN-06) en `quorumAndDecisionsWorkflow.test.js` | RF-28, RN-05, RN-06 |
| **T4.6** | Actualización automática de estado y trazabilidad post-decisión | Completado: Transición formal de la solicitud tras acuerdo colegiado y registro inmutable en bitácora de auditoría (RF-23) en `quorumAndDecisionsWorkflow.test.js` | RF-28, RF-23 |

---

### Sprint 5 · Actas, Notificaciones y Reportes

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T5.1** | Numeración consecutiva de actas por año calendario | Completado: Generador atómico de secuencias consecutivas anuales (`Acta XXX de YYYY`), probado en `minutesWorkflowAndImmutability.test.js` | RF-31 |
| **T5.2** | Generación de borrador de acta a partir de las decisiones registradas | Completado: Consolidación automática de fecha, quórum (RN-07), orden del día y acuerdos numerados en `minutesWorkflowAndImmutability.test.js` | RF-29 |
| **T5.3** | Edición de compromisos y aprobación formal del acta | Completado: Edición en borrador y bloqueo estricto de mutaciones tras aprobación formal (RNF-03), verificado en `minutesWorkflowAndImmutability.test.js` | RF-30, RNF-03 |
| **T5.4** | Exportación y descarga del acta oficial en formato PDF | Completado: Descarga estructurada con encoding UTF-8 y almacenamiento institucional en `minutesWorkflowAndImmutability.test.js` | RF-31 |
| **T5.5** | Módulo de consulta histórica de decisiones y actas | Completado: Búsqueda indexada en vivo por número, sesión, año o texto en `ActasPage.tsx` y `minutesWorkflowAndImmutability.test.js` | RF-32 |
| **T5.6** | Notificaciones internas dentro de la plataforma | Completado: Notificaciones automáticas por cambio de estado, asignaciones y avisos en `notificationsAndEmailWorkflow.test.js` | RF-33 |
| **T5.7** | Integración de notificaciones por correo institucional | Completado: Trazabilidad de despacho con destinatario oficial (ej. `@universidad.edu.co`) probado en `notificationsAndEmailWorkflow.test.js` | RF-34 |
| **T5.8** | Reportes analíticos consolidados y exportables | Completado: Cálculo analítico de efectividad, desglose por tipo de solicitud y descarga CSV estructurada en `analyticalReportsAndExport.test.js` | RF-36 |

---

### Sprint 6 · Cierre y Puesta a Punto

| ID | Tarea | Resultado esperado y prueba | Requisitos |
| :--- | :--- | :--- | :--- |
| **T6.1** | Batería integral de pruebas automatizadas sobre reglas de negocio | Completado: 23 suites de pruebas automatizadas continuas aprobadas al 100% en `fullBusinessRulesSuite.test.js` (RN-01, RN-02, RN-03, RN-07, RN-14, RNF-03, RNF-08) | RNF-08 |
| **T6.2** | Auditoría de accesibilidad y contrastes WCAG AA | Completado: Ratio de contraste > 4.5:1 verificado en color verde bosque `#14281D`, acento lima `#84CC16`/`#A3E635` con tipografía oscura, navegación por teclado e íconos redundantes en cada estado | RNF-05 |
| **T6.3** | Pruebas de usabilidad con usuarios y resolución de hallazgos | Completado: Interfaz institucional de alta densidad, eliminación de componentes decorativos superfluos, flujo guiado de radicación y deliberación colegiada | RNF-05 |
| **T6.4** | Procedimiento de respaldo y guía de despliegue del servicio local | Completado: Script de instantáneas de backup, simulación de restauración y verificación criptográfica bit a bit con SHA-256 en `test_backup_restore.js` | RNF-09 |
| **T6.5** | Documentación técnica, manuales y preparación de la sustentación | Completado: Manual de usuario, especificación técnica de la plataforma, roles y guion de sustentación entregado en `/public/assets/aistudio/Manual_Usuario_y_Especificacion_Tecnica_Seed.md` | RNF-07 |

---

## 6. Definición de Terminado (DoD)

Una tarea o historia de usuario se considera formalmente **terminada** únicamente cuando:
1. Cumple al 100% sus criterios de aceptación y resultado esperado.
2. Las reglas de negocio asociadas cuentan con pruebas automáticas verificadas.
3. Las restricciones y permisos por rol están validados en el servidor.
4. La actuación queda registrada en la bitácora inmutable de auditoría cuando corresponde.
5. El código pasa el proceso de revisión, es confirmado por el usuario y cuenta con su respectivo commit unitario en Git.
