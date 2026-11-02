# Seed: Sistema de Gestión del Comité de Investigación Universitaria

Plan de desarrollo e implementación técnica para **Seed**, una plataforma web institucional diseñada para gestionar de punta a punta las solicitudes de proyectos de investigación universitaria, integrando radicación, verificación documental, conceptos técnicos de pares evaluadores, sesiones del comité y actas con estricto apego a las 13 reglas de negocio y catálogo normativo.

---

## Decisiones Críticas Confirmadas

> [!IMPORTANT]
> A continuación se resumen las decisiones acordadas a partir de los requerimientos y respuestas del usuario:

- **Alcance Inicial Prioritario**: Flujo central completo en la primera fase (radicación guiada con validación de requisitos, revisión técnica con concepto favorable/ajustes/no favorable y tablero de control interactivo).
- **Identidad Visual "Seed"**: Verde bosque profundo (`#14281D`, `#1B382B`) como tono institucional primario, acentos brote lima (`#65A30D`, `#84CC16`) para estados activos e interacciones clave, y fondos piedra/arena cálidos (`#F7F6F2`, `#EFECE6`, `#E2DFD7`) con formas orgánicas curvas y logo minimalista de semilla en SVG.
- **Jerarquía de Vistas y Tablero**:
  - **Franja superior de métricas unificada**: Contadores reales por estado (RF-35) situados como banner analítico superior antes del tablero y la tabla (inspirado en la referencia visual adjunta).
  - **Vistas conmutables**: Alternancia entre **Tablero Kanban** y **Vista de Tabla / Hoja de Cálculo** con filtros multifactor (estado, tipo de trámite, investigador, fechas).
  - **Kanban con Drag & Drop controlado**: Restricción estricta de transiciones (RN-01 a RN-06). No se permite mover solicitudes a estados finales o de comité sin cumplir previamente los requisitos documentales o la sesión correspondiente.
  - **Línea de tiempo / Cronología integrada**: Historial de actuaciones (RF-23) visible directamente dentro del drawer/modal de detalle de cada solicitud, garantizando inmutabilidad y trazabilidad.
  - **Sesiones de Comité**: Módulo de sesiones con agenda estructurada, orden del día, ponentes y verificación de quórum (RN-07).
- **Estrategia de Persistencia**: Backend full-stack con base de datos relacional (PostgreSQL / Cloud SQL gestionado con Drizzle ORM) y servicio local de almacenamiento de documentos con metadatos (nombre, tamaño, tipo MIME, hash y ruta).

---

## 1. Visión General y Concepto Central

### Propósito del Sistema
Seed moderniza la gestión académica y administrativa del Comité de Investigaciones de la universidad, eliminando la dispersión en correos electrónicos y carpetas desconectadas. Centraliza la radicación consecutiva, el control estricto de documentos subsanables y no subsanables, la asignación de revisores sin conflicto de intereses, la deliberación en sesiones colegiadas y la expedición formal de decisiones y actas.

### Roles de Usuario
1. **Investigador(a) / Docente / Monitor**: Radica solicitudes de proyectos, carga y subsana requisitos documentales, y hace seguimiento en tiempo real al radicado.
2. **Administrativo(a) / Asistente de Investigación**: Verifica la lista de chequeo de documentos, aprueba o rechaza requisitos con observaciones y marca solicitudes como subsanables o "En revisión".
3. **Integrante del Comité / Par Evaluador**: Emite conceptos técnicos (favorable, favorable con ajustes, no favorable), formula aclaraciones u observaciones obligatorias y participa en las sesiones.
4. **Secretario(a) Técnico(a) del Comité**: Asigna revisores, programa sesiones ordinarias/extraordinarias, consolida la agenda con solicitudes "Listas para comité", registra decisiones y genera actas.
5. **Líder de Grupo de Investigación**: Supervisa las solicitudes radicadas por integrantes de su grupo y avala trámites.
6. **Administrador del Sistema**: Configura usuarios, roles, grupos y el catálogo dinámico de tipos de solicitud y requisitos.

---

## 2. Experiencia de Usuario y Diseño Visual

Inspirado en la composición de la imagen de referencia (`image_3bc5a847.png`) adaptada al concepto botánico y formal de **Seed**:

### Estética y Dirección Visual
- **Lenguaje Orgánico y Limpio**: Tarjetas con radios suaves (`rounded-2xl` y `rounded-xl`), divisores tenues de 1px (`rgba(27, 56, 43, 0.08)`), superficies claras con matiz piedra cálido (`#F8F7F4`), contrastando con el verde bosque profundo (`#14281D`).
- **Logo SVG Minimalista de Semilla**: Isotipo limpio de semilla germinando con un brote sutil trazado en vector SVG geométrico, integrado en la barra de navegación superior y el menú lateral.
- **Tipografía**: `Plus Jakarta Sans` para encabezados y navegación (moderna, abierta y legible) combinada con `DM Sans` para cuerpo de texto y `tabular-nums` / fuente monoespaciada limpia para radicados, fechas y cifras métricas.
- **Disciplina Anti-Slop (Frontend Design Constitution)**: Sin badges píldora redundantes tipo cápsula ni gradientes morados genéricos. Estados y metadatos mostrados con tipografía clara y separadores sutiles (`·`, `/`), reservando el color de acento brote lima para estados vivos y acciones prioritarias.

### Distribución de la Interfaz
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [🌱 Seed · Comité de Inv.]   🔍 Buscar radicado, proyecto o autor...    [👤 Rol / Perfil] │
├───────────────┬────────────────────────────────────────────────────────────────────────┤
│ 📂 Navegación │ Breadcrumbs: Solicitudes > Convocatoria 2026 > Tablero de Control      │
│               │                                                                        │
│ • Tablero     │ ┌──────────────┬──────────────┬──────────────┬───────────────────────┐ │
│ • Solicitudes │ │ Radicadas    │ En Revisión  │ Para Comité  │ Aprobadas / Cerradas  │ │
│ • Sesiones    │ │ 18           │ 7            │ 5            │ 24                    │ │
│ • Actas       │ │ ↑ 3 hoy      │ 2 con ajustes│ Próx. Jueves │ Tasa 85%              │ │
│ • Catálogo    │ └──────────────┴──────────────┴──────────────┴───────────────────────┘ │
│ • Usuarios    │                                                                        │
│               │ [ Tablero Kanban ]  [ Vista Tabla ]   [ Filtros: Tipo ▾ | Estado ▾ ]   │
│               │                                                                        │
│ ⚙️ Ajustes    │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│ ℹ️ Ayuda      │ │ Radicadas(4) │ │En Revisión(3)│ │Para Comité(2)│ │ Aprobadas(8)   │  │
│               │ │ ──────────── │ │ ──────────── │ │ ──────────── │ │ ────────────── │  │
│               │ │ [SEC-2026-01]│ │ [SEC-2026-04]│ │ [SEC-2026-08]│ │ [SEC-2026-02]  │  │
│               │ │ Bioinsumos   │ │ Nanomaterial │ │ IA en Salud  │ │ Robótica Móvil │  │
│               │ │ 📄 5/5 docs  │ │ ⚠️ 1 ajuste  │ │ ⚖️ Ponente:Dr│ │ ✅ Acta 002-26 │  │
│               │ └──────────────┘ └──────────────┘ └──────────────┘ └────────────────┘  │
└───────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Decisiones de Producto y Reglas de Negocio Implementadas

### Matriz de Transición de Estados y Validación (RN-01 a RN-13)
1. **Radicada**: Se asigna número único consecutivo (ej. `INV-2026-0042`). Solo pasa a *En revisión* si el 100% de los requisitos obligatorios están validados por el administrativo.
2. **Pendiente por documentos**: Se activa automáticamente cuando un requisito subsanable es rechazado con observación o cuando el revisor solicita ajustes técnicos. Se otorga plazo configurable de subsanación.
3. **Rechazada por requisitos**: Si falta un requisito no subsanable (RN-11), la solicitud queda rechazada administrativamente sin pasar a evaluación técnica.
4. **En revisión y Bloqueo por Conflicto de Intereses (RN-03 y RN-15)**:
   - El sistema impide asignar como revisor a un integrante que pertenezca al mismo grupo de investigación o sea autor/coautor del proyecto.
   - Historial de reasignaciones persistente (RN-08).
5. **Lista para comité (RN-04)**: Solo solicitudes con concepto favorable o favorable con ajustes subsanados pueden ser agregadas a la agenda de una sesión.
6. **Decisiones de Sesión (RN-05 a RN-07)**:
   - Registro de asistencia con verificación automática de quórum reglamentario antes de votar.
   - Opciones: Aprobada, Aprobada con ajustes, Rechazada o Aplazada (esta última mantiene la solicitud en *Lista para comité* para la siguiente sesión).
   - Generación automática de borrador de acta con firmas y extracto de acuerdos.

---

## 4. Arquitectura Técnica y Estrategia de Datos

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CLIENTE WEB (React 19 + TypeScript + Tailwind CSS v4 + Motion)                          │
│ ├─ UI Shell: Sidebar orgánico, Header institucional, Métricas resumen superiores       │
│ ├─ Features:                                                                            │
│ │   ├─ KanbanBoard (DnD controlado con validación de RN y restricciones de estado)     │
│ │   ├─ ApplicationsTable (Búsqueda, paginación, filtros por fecha, tipo, grupo)        │
│ │   ├─ FilingWizard (Radicación guiada con carga de PDF/DOCX y plantillas)             │
│ │   ├─ DocumentValidator (Checklist interactivo de requisitos obligatorios/condic.)    │
│ │   ├─ ReviewerPanel (Evaluación técnica, clasificación de observaciones y concepto)   │
│ │   ├─ SessionsModule (Programación, orden del día, quórum y registro de votos)        │
│ │   └─ ApplicationTimeline (Historial inmutable de actuaciones RF-23)                  │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │ JSON API REST / RPC
┌────────────────────────────────────────▼────────────────────────────────────────────────┐
│ BACKEND FULL-STACK (Express API Server + tsx)                                           │
│ ├─ /api/auth: Control de acceso por rol y perfil de usuario                             │
│ ├─ /api/applications: Radicación, transiciones de estado y cálculo de métricas         │
│ ├─ /api/catalog: Tipos de solicitud (los 5 tipos iniciales activos) y requisitos        │
│ ├─ /api/sessions: Sesiones, agenda de comité, quórum y actas                            │
│ ├─ /api/files: Servicio de archivos local (almacena en disco + valida hash y tipo MIME) │
│ └─ /api/history: Registro inmutable de actuaciones por radicado                         │
└────────────────────────────────────────┬────────────────────────────────────────────────┘
                                         │ Drizzle ORM (Node Postgres)
┌────────────────────────────────────────▼────────────────────────────────────────────────┐
│ BASE DE DATOS RELACIONAL (PostgreSQL / Cloud SQL)                                       │
│ ├─ users, research_groups, application_types, requirements                              │
│ ├─ applications, application_documents, reviewer_assignments                            │
│ ├─ observations, committee_sessions, session_agenda, session_decisions                  │
│ └─ audit_history (log inmutable append-only)                                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Catálogo Inicial Precargado (5 Tipos de Solicitud Activos para la Fase 1)
1. **Presentación de proyecto (aval institucional)**: Pasa a comité. Requisitos: Propuesta de investigación, cronograma, presupuesto detallado, acta del comité de facultad, declaración de honestidad creativa.
2. **Cambio de rubro presupuestal**: Pasa a comité solo si supera el 20% del rubro asignado (RN-13). Requisitos: Solicitud justificada, presupuesto ajustado comparativo.
3. **Prórroga de ejecución**: Pasa a comité. Requisitos: Informe técnico parcial de avance, justificación detallada, cronograma ajustado y fecha de productos.
4. **Informe de avance periódico**: Revisión administrativa y técnica (no requiere sesión de comité). Requisitos: Formato institucional de avance, soportes de ejecución.
5. **Informe final y cierre de proyecto**: Pasa a comité. Requisitos: Informe final consolidado, evidencias de productos de investigación, paz y salvos (laboratorios, activos, biblioteca).

---

## 5. Plan de Ejecución por Fases (Metodología por Sprints)

### Fase 1: Arquitectura Base, Shell Visual "Seed" y Flujo Central (Sprint 0 - 2)
- **Base Visual y Shell**: Implementación del diseño orgánico, paleta verde bosque y piedra, logo SVG de semilla, franja superior de contadores analíticos y navegación por rol.
- **Catálogo de Solicitudes y Requisitos**: Modelado de los 5 tipos prioritarios con especificación de documentos obligatorios, condicionales y subsanables.
- **Radicación de Proyectos (RF-07 a RF-11)**: Formulario paso a paso con asignación de número radicado consecutivo, subida de documentos simulada/almacenada localmente y estado inicial `Radicada`.
- **Tablero Kanban y Vista de Tabla**:
  - Franja de métricas en la parte superior.
  - Tablero de 5 columnas principales con drag & drop validado según reglas de transición.
  - Vista de tabla detallada con filtros dinámicos y exportación básica.
- **Drawer de Detalle de Solicitud con Historial (RF-23)**: Cronología vertical inmutable de todas las actuaciones realizadas sobre el radicado.

### Fase 2: Verificación Documental y Revisión por Pares (Sprint 3)
- **Lista de Chequeo Documental**: Interfaz para administrativos con opciones de aprobar, marcar subsanable o rechazar documento con motivo.
- **Módulo de Pares Evaluadores**: Asignación con control de conflicto de intereses, clasificación de observaciones (aclaración, ajuste obligatorio, sugerencia) y emisión de concepto técnico (favorable / favorable con ajustes / no favorable).

### Fase 3: Sesiones del Comité, Decisiones y Actas (Sprint 4 - 5)
- **Programación de Sesiones**: Convocatoria, consolidación de la agenda con solicitudes en estado *Lista para comité*.
- **Registro en Vivo de Sesión**: Verificación de quórum, asignación de ponente y votación de decisión (aprobada, aprobada con ajustes, rechazada, aplazada).
- **Generación de Actas**: Borrador dinámico estructurado con numeración anual y opción de descarga en PDF.

### Fase 4: Pruebas Integrales, Notificaciones y Cierre (Sprint 6)
- Pruebas automatizadas de reglas de negocio críticas (quórum, transiciones bloqueadas, conflicto de intereses).
- Sistema de notificaciones en plataforma para cambios de estado y requerimientos de ajustes.
- Afinamiento estético, accesibilidad WCAG AA y revisión de experiencia con usuarios.

---

## 6. Verificación y Criterios de Aceptación de la Fase 1
1. **Regla de arrastre en Kanban**: Un usuario no puede arrastrar una tarjeta de *Radicada* a *Aprobada* directamente; el sistema bloquea la acción y muestra un mensaje contextual explicativo.
2. **Cálculo de métricas en tiempo real**: Los contadores superiores reflejan exactamente la suma de solicitudes en cada estado.
3. **Carga y validación documental**: El formulario de radicación exige los documentos obligatorios según el tipo de solicitud seleccionado.
4. **Filtros cruzados**: La vista de tabla permite filtrar simultáneamente por estado, tipo de proyecto y búsqueda textual rápida.
5. **Compilación limpia**: Sin errores de TypeScript ni advertencias de linting en Vite.
