# Seed: plan de desarrollo del Sistema de Gestión del Comité de Investigación

Nov 2, 2026 · @José

El plan lleva el sistema de prototipo a producto funcional en 6 sprints, con 37 requisitos funcionales, 10 no funcionales y 13 reglas de negocio. Seed se construye sobre Supabase en la nube, con los documentos guardados en local, y el catálogo de tipos de solicitud parte del estándar de las universidades colombianas, pero el cliente puede editarlo.

## 1. Stack tecnológico propuesto

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Interfaz | React + TypeScript + Vite + Tailwind CSS | Componentes reutilizables y tipado |
| Formularios y validación | React Hook Form + Zod | Radicación, observaciones y decisiones, con las mismas reglas de validación en todos los formularios |
| Estado de la interfaz | Zustand, solo si hace falta | Estado compartido entre componentes (filtros, borradores); el resto lo maneja TanStack Query |
| Datos del cliente | TanStack Query + supabase-js | Caché y consultas directas a Supabase |
| Backend y base de datos | Supabase (nube) con PostgreSQL | Base de datos, autenticación y tiempo real en un solo servicio |
| Reglas de negocio | Funciones SQL (RPC), triggers y políticas RLS | Transiciones de estado, conflicto de intereses y permisos se aplican en la base de datos |
| Autenticación | Supabase Auth (correo y contraseña) | Sin manejar contraseñas ni tokens propios |
| Archivos | Servicio de archivos local (Node.js + Express) con una carpeta en el equipo de la institución | Los documentos se guardan en local; en Supabase solo quedan los metadatos (nombre, ruta, tamaño, hash) |
| Notificaciones | Supabase Realtime (en la plataforma); Edge Functions + SMTP (correo) | Avisos inmediatos dentro y fuera de la plataforma |
| Actas en PDF | Generación en el navegador o en una Edge Function | El PDF resultante se guarda con el servicio de archivos |
| Pruebas | Vitest + pruebas SQL (pgTAP, con Supabase CLI en desarrollo) | Unitarias y de reglas de negocio y permisos |
| Gestión | GitHub + Trello (Scrum) | Tablero y control de versiones |

## 2. Requisitos funcionales

Prioridad: Alta = indispensable para el flujo principal; Media = completa el proceso; Baja = mejora.

### 2.1 Usuarios y acceso

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-01 | Registro de investigadores (nombre, correo institucional, vínculo, programa, grupo) | Alta | HU-01 |
| RF-02 | Inicio y cierre de sesión con control por rol | Alta | HU-01 |
| RF-03 | Gestión de usuarios por el administrador (activar, desactivar, asignar roles, definir integrantes del comité) | Media |  |
| RF-04 | Gestión de grupos de investigación y su líder | Media |  |

### 2.2 Catálogo de solicitudes

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-05 | Gestión de tipos de solicitud (crear, editar, desactivar), con indicador de si pasan a comité | Alta |  |
| RF-06 | Gestión de requisitos por tipo (obligatorio o condicional, subsanable o no subsanable, formato, plantilla) | Alta |  |
| RF-37 | Catálogo inicial precargado con los tipos y requisitos estándar (sección 2.10), editable por el cliente | Alta |  |

### 2.3 Radicación

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-07 | Selección del tipo de solicitud al radicar | Alta | HU-02 |
| RF-08 | Radicación con número de radicado consecutivo y estado inicial "Radicada" | Alta | HU-02 |
| RF-09 | Carga de documentos asociados a cada requisito, guardados en el almacenamiento local | Alta | HU-02 |
| RF-10 | Recarga de documentos rechazados o corregidos | Alta | HU-02 |
| RF-11 | Listado de mis solicitudes con filtros por estado, tipo y fecha | Alta | HU-06 |

### 2.4 Validación de requisitos

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-12 | Lista de verificación de requisitos por solicitud | Alta | HU-03 |
| RF-13 | Marcar cada documento como válido o rechazado, con motivo | Alta | HU-03 |
| RF-14 | Cambio automático a "Pendiente por documentos" o "En revisión" según el resultado | Alta | HU-03 |

### 2.5 Revisión

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-15 | Asignación de revisor con fecha límite y bloqueo por conflicto de intereses | Alta | HU-04 |
| RF-16 | Reasignación de revisor conservando las asignaciones anteriores | Media | HU-04 |
| RF-17 | Observaciones clasificadas: aclaración, ajuste obligatorio o sugerencia | Alta | HU-05 |
| RF-18 | Solicitud de ajustes con fecha límite y respuesta del investigador | Alta | HU-05 |
| RF-19 | Concepto del revisor: favorable, favorable con ajustes o no favorable | Alta | HU-05 |
| RF-20 | Marcar la solicitud como "Lista para comité" | Alta | HU-05 |

### 2.6 Estados, fechas e historial

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-21 | Control de estados con transiciones válidas (sección 4) | Alta |  |
| RF-22 | Seguimiento de plazos: alertas de solicitudes vencidas o próximas a vencer | Media |  |
| RF-23 | Historial de actuaciones: quién, qué, cuándo, estado anterior y nuevo | Alta | HU-06 |

### 2.7 Sesiones del comité

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-24 | Crear sesión (tipo, fecha, hora, lugar o enlace) | Alta | HU-07 |
| RF-25 | Agenda: consolidar solicitudes "Listas para comité" con orden y ponente | Alta | HU-07 |
| RF-26 | Cierre de agenda y convocatoria a los integrantes | Media | HU-07 |
| RF-27 | Registro de asistencia y verificación de quórum | Media | HU-08 |
| RF-28 | Registro de decisión por solicitud (aprobada, aprobada con ajustes, rechazada, aplazada) con justificación | Alta | HU-08 |

### 2.8 Actas y consulta de decisiones

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-29 | Generación automática del acta en borrador desde las decisiones | Alta | HU-09 |
| RF-30 | Edición del borrador (proposiciones, compromisos) y aprobación del acta | Media | HU-09 |
| RF-31 | Numeración consecutiva por año y descarga en PDF | Media | HU-09 |
| RF-32 | Consulta de decisiones y actas anteriores, con búsqueda por radicado, investigador o sesión | Media |  |

### 2.9 Notificaciones y reportes

| ID | Requisito | Prioridad | HU |
| --- | --- | --- | --- |
| RF-33 | Notificaciones dentro de la plataforma (cambios de estado, asignaciones, ajustes) | Media | HU-10 |
| RF-34 | Notificaciones por correo electrónico | Baja | HU-10 |
| RF-35 | Tablero con contadores por estado, calculados con datos reales | Media |  |
| RF-36 | Reportes por estado, tipo, periodo y tiempos de respuesta, exportables | Baja |  |

### 2.10 Catálogo inicial de tipos de solicitud y requisitos

El catálogo parte de lo que piden hoy las universidades colombianas para gestionar sus proyectos de investigación. Como cada institución lo define en su reglamento, el cliente puede editarlo desde la plataforma (RF-05 y RF-06).

| Tipo de solicitud | Cuándo se usa | Requisitos típicos | ¿Pasa a comité? (sugerido) |
| --- | --- | --- | --- |
| 1. Presentación de proyecto (aval) | Formalizar un proyecto nuevo | Propuesta, cronograma, presupuesto, acta del comité de programa o facultad que lo recomienda, acta del Consejo de Facultad con la dedicación horaria, declaración de honestidad creativa, aval de ética o bioética (si aplica), carta de invitación y acto de aprobación de la entidad externa (si aplica) | Sí |
| 2. Cambio de rubro presupuestal | Mover recursos entre rubros | Solicitud, justificación, presupuesto ajustado | Solo si supera el 20 % del rubro |
| 3. Cambio de participantes | Ingreso, retiro o cambio de investigador principal | Solicitud del investigador principal, justificación, vinculación a un grupo avalado, carta de aceptación | Sí |
| 4. Prórroga | Más tiempo para ejecutar el proyecto o entregar el informe final | Informe técnico parcial, justificación detallada que indique el tipo de prórroga, plan de actividades (cronograma ajustado, ejecución presupuestal y fecha de entrega de productos) | Sí |
| 5. Cambio de horas de dedicación | Ajustar las horas en el plan de trabajo | Solicitud, aval del Consejo de Facultad o del decano, plan de trabajo | Sí |
| 6. Aplazamiento de la ejecución | Posponer el inicio o la ejecución | Solicitud, justificación, informe del estado del proyecto | Sí |
| 7. Cambio de productos o compromisos | Sustituir un producto comprometido | Solicitud, justificación, propuesta del producto equivalente | Sí |
| 8. Informe de avance | Seguimiento periódico: a mitad del proyecto, o cada 6 meses si dura más de 12 | Informe en el formato establecido | No, lo revisa el responsable |
| 9. Informe final y cierre | Al terminar la ejecución | Informe final, evidencia de los productos, paz y salvos (activos fijos, biblioteca, gestión tecnológica) | Sí |
| 10. Aval de convenio o contrato | Proyecto con una entidad externa | Convenio o contrato, carta firmada por el representante legal, aportes en especie o en efectivo | Sí |
| 11. Apoyo a movilidad o eventos | Ponencias y participación en eventos | Carta de aceptación, información del evento, presupuesto, aval del programa | Sí |
| 12. Vinculación de estudiantes o monitores | Semilleros y apoyo a proyectos | Carta del estudiante, aval del docente tutor, plan de actividades | Sí |

Cada requisito del catálogo guarda estos atributos:

- Obligatorio o condicional (“si aplica”, como el aval de ética).
- Subsanable o no subsanable: uno subsanable puede corregirse dentro de un plazo; uno no subsanable obliga a radicar de nuevo.
- Formato permitido (PDF o DOCX).
- Plantilla descargable, cuando la institución define un formato propio.
- Plazo para subsanar.

Para el prototipo se activan 5 tipos: presentación de proyecto, cambio de rubro, prórroga, informe de avance e informe final. Los demás quedan cargados pero desactivados hasta que el cliente los habilite.

El tipo 12 no viene de las fuentes: lo propusimos para cubrir a estudiantes y monitores, que están en el alcance. Los requisitos de los tipos 2, 3, 5, 6, 7, 10 y 11 son una síntesis razonable, no una lista oficial, y el acta de la Universidad Distrital es de 2010. El reglamento vigente del cliente tiene la última palabra.

Fuentes consultadas:

- [Universidad Cooperativa de Colombia, términos de referencia para solicitudes de formalización de proyectos estratégicos 2023](https://ucc.edu.co/investigacion-sinfoni/SiteAssets/Lists/Lista%20de%20convocatorias/NewForm/2%20T.R.%20Convocatoria%20InvitacionExterna%202023.pdf): requisitos del proyecto, solicitudes administrativas, informes de avance y final, paz y salvos, y la distinción entre requisitos subsanables y no subsanables.
- [Universidad Distrital, Comité de Investigaciones, Acta 003 de 2010](https://odi.udistrital.edu.co/sites/cidc/files/actas/2021-05/acta_No_03.pdf): requisitos de prórroga y casos como aplazamiento, cambio de productos, convenios, cambio de investigador principal y movilidad.

## 3. Requisitos no funcionales

| ID | Categoría | Requisito |
| --- | --- | --- |
| RNF-01 | Seguridad | Autenticación con Supabase Auth y sesiones con tokens de expiración corta |
| RNF-02 | Seguridad | Control de acceso por rol con políticas RLS en la base de datos, no solo en la interfaz; el servicio de archivos verifica el token y los permisos antes de entregar un documento |
| RNF-03 | Integridad | El historial de actuaciones y las actas aprobadas no se pueden editar ni borrar |
| RNF-04 | Archivos | Solo PDF y DOCX, con tamaño máximo definido (sugerido: 10 MB) |
| RNF-05 | Usabilidad | Interfaz responsive, utilizable en computador y celular |
| RNF-06 | Rendimiento | Listados paginados; respuesta menor a 2 segundos con cientos de solicitudes |
| RNF-07 | Mantenibilidad | Código en TypeScript, organizado por módulos, con validación centralizada |
| RNF-08 | Calidad | Pruebas automáticas de las reglas de negocio críticas (transiciones, conflicto de intereses, quórum) |
| RNF-09 | Disponibilidad | Los documentos viven en un equipo local: copia de seguridad periódica de su carpeta en otra ubicación, y exportación periódica de la base de datos |
| RNF-10 | Trazabilidad | Toda acción relevante queda registrada con usuario y fecha |

## 4. Reglas de negocio

| ID | Regla |
| --- | --- |
| RN-01 | Una solicitud tiene un único estado actual. “Cerrada” es un estado final |
| RN-02 | Solo pasa a “En revisión” si todos los requisitos obligatorios están en estado válido |
| RN-03 | Un integrante del comité no puede revisar ni decidir sus propias solicitudes |
| RN-04 | Solo las solicitudes “Listas para comité” pueden entrar a una agenda |
| RN-05 | Rechazar o aprobar con ajustes exige una justificación |
| RN-06 | Una decisión “aplazada” deja la solicitud en “Lista para comité” para la siguiente sesión |
| RN-07 | Hay un quórum mínimo para registrar decisiones (valor por definir según el reglamento) |
| RN-08 | Reasignar un revisor conserva las asignaciones anteriores, marcadas como inactivas |
| RN-09 | Los estudiantes y monitores requieren el aval de un docente tutor como documento obligatorio |
| RN-10 | Cada tipo de solicitud define sus propios requisitos documentales |
| RN-11 | Cada requisito es subsanable o no subsanable. Si falta uno subsanable, la solicitud queda “Pendiente por documentos” con un plazo; si falta uno no subsanable, se rechaza en la validación y debe radicarse de nuevo |
| RN-12 | Los trámites sobre un proyecto en ejecución solo los solicita su investigador principal. Iniciada la ejecución no se agregan investigadores, salvo para reemplazar a uno que se retiró (regla configurable) |
| RN-13 | Un cambio de rubro solo pasa a comité si supera el umbral configurado (20 % del rubro en el estándar); por debajo, se resuelve sin sesión |

Transiciones válidas entre estados:

```
Radicada                → Pendiente por documentos | En revisión | Rechazada (requisito no subsanable)
Pendiente por documentos → En revisión
En revisión             → Pendiente por documentos (ajuste solicitado) | Lista para comité
Lista para comité       → Aprobada | Aprobada con ajustes | Rechazada
Aprobada                → Cerrada
Aprobada con ajustes    → Cerrada (cuando los ajustes se verifican)
Rechazada               → Cerrada
```

Decisión de diseño: cuando el revisor pide ajustes durante la revisión, la solicitud vuelve a "Pendiente por documentos" para no añadir estados fuera de los siete del tablero.

## 5. Roles y permisos

| Acción | Investigador | Administrativo | Integrante | Secretario(a) | Líder | Admin sistema |
| --- | --- | --- | --- | --- | --- | --- |
| Radicar y ver mis solicitudes | Sí |  |  |  |  |  |
| Validar documentos |  | Sí |  | Sí |  |  |
| Asignar revisor |  |  |  | Sí |  |  |
| Revisar y dejar observaciones |  |  | Sí (asignadas) | Sí |  |  |
| Ver todas las solicitudes |  | Sí |  | Sí | Solo su grupo |  |
| Crear sesión y agenda |  |  |  | Sí |  |  |
| Registrar decisiones y generar acta |  |  |  | Sí |  |  |
| Ver tablero y reportes |  |  | Sí | Sí | Su grupo | Sí |
| Gestionar usuarios y catálogos |  |  |  |  |  | Sí |

## 6. Arquitectura y estructura

La interfaz habla directamente con Supabase (en la nube) para los datos, la autenticación y las reglas, que viven en la base de datos como funciones SQL, triggers y políticas RLS. Los documentos no van a Supabase: un pequeño servicio de archivos, instalado en un equipo local de la institución, los recibe y los guarda en una carpeta. Hace falta porque el navegador no puede escribir por sí solo en el disco de otro equipo.

Carga y descarga de un documento:

1. La interfaz envía el archivo al servicio de archivos junto con el token de sesión de Supabase.
2. El servicio usa ese mismo token para registrar el documento en Supabase; las políticas RLS deciden si el usuario puede hacerlo.
3. Si Supabase lo acepta, el servicio guarda el archivo en la carpeta local y completa los metadatos (ruta, tamaño y hash).
4. Para descargar, el servicio consulta de nuevo el documento con el token del usuario y entrega el archivo solo si Supabase lo devuelve.

Como el servicio corre en un equipo local, los usuarios deben poder alcanzarlo (misma red de la institución o VPN), y el equipo debe estar encendido para cargar o ver documentos.

```
seed/
  frontend/src/
    features/        una carpeta por módulo (componentes, formularios, hooks, consultas)
    stores/          estados compartidos con Zustand, solo los necesarios
    components/      elementos reutilizables
    routes/          rutas y protección por rol
    lib/             cliente de Supabase, TanStack Query, utilidades

  supabase/          proyecto en la nube, versionado en GitHub
    migrations/      tablas, relaciones, secuencias (radicado y acta) y políticas RLS
    functions/       Edge Functions: enviar-correo (y generar-acta-pdf si va en el servidor)
    seed.sql         catálogo inicial de tipos de solicitud y requisitos
    tests/           pruebas SQL de reglas de negocio y permisos

  file-service/      servicio de archivos local (Node.js + Express)
    src/             rutas de carga y descarga, verificación del token
    storage/         carpeta de documentos, fuera del repositorio

Funciones SQL (RPC): radicar_solicitud, cambiar_estado, asignar_revisor,
                     registrar_decision, generar_acta
Triggers:            historial de actuaciones (solo inserción) y
                     validación de transiciones de estado
```

## 7. Plan por sprints

La duración sugerida es de 1 a 2 semanas por sprint, a ajustar según el calendario del semestre.

| Sprint | Objetivo | Entregables | Requisitos | HU |
| --- | --- | --- | --- | --- |
| 0 | Preparación | Repositorios, proyecto de Supabase en la nube, servicio de archivos local, esquema de base de datos con políticas RLS, diseño de interfaces, tablero Scrum | RNF-07 |  |
| 1 | Acceso y catálogo | Registro, login con roles, gestión de usuarios, grupos, tipos de solicitud y requisitos con el catálogo inicial precargado | RF-01 a RF-06, RF-37, RNF-01, RNF-02 | HU-01 |
| 2 | Radicación | Radicar con formularios (React Hook Form), carga de documentos al servicio de archivos local, listado de mis solicitudes | RF-07 a RF-11, RNF-04 | HU-02, HU-06 |
| 3 | Validación y revisión | Lista de verificación, asignación, observaciones, ajustes, conceptos, estados e historial | RF-12 a RF-23, RNF-03 | HU-03, HU-04, HU-05 |
| 4 | Sesiones y decisiones | Sesiones, agenda, asistencia y quórum, decisiones | RF-24 a RF-28 | HU-07, HU-08 |
| 5 | Actas, notificaciones y tablero | Acta en borrador y PDF, consulta de decisiones, notificaciones, tablero, reportes | RF-29 a RF-36 | HU-09, HU-10 |
| 6 | Cierre | Pruebas con usuarios, correcciones, documentación y sustentación | RNF-05, RNF-06, RNF-08, RNF-09 | Todas |

Si el tiempo se acorta, los recortes naturales son RF-34 (correo), RF-36 (reportes) y RF-22 (alertas de plazos): el flujo principal funciona sin ellos.

## 8. Definición de terminado

Una historia de usuario se considera terminada cuando:

- Cumple todos sus criterios de aceptación.
- Las reglas de negocio involucradas tienen pruebas automáticas.
- Los permisos por rol están verificados en el servidor.
- La acción queda registrada en el historial cuando corresponde.
- Está revisada por otro integrante y unida a la rama principal.

## 9. Riesgos

| Riesgo | Efecto | Respuesta |
| --- | --- | --- |
| Reglamento real distinto a los supuestos (tipos, requisitos, quórum) | Retrabajo en catálogo y reglas | Mantener el catálogo y el quórum configurables |
| Tiempo insuficiente | Funcionalidades incompletas | Priorizar el flujo principal (sprints 1 a 4) |
| Complejidad del acta en PDF | Retraso en el sprint 5 | Empezar con plantilla simple y mejorar después |
| Cifras del tablero inconsistentes (35 recibidas frente a 47 en la suma de estados) | Datos incoherentes en la sustentación | Definir la regla de conteo y calcularlo con datos reales |
| Trabajo en equipo desordenado | Conflictos de código | Ramas por funcionalidad y revisión antes de unir |
| Documentos guardados solo en un equipo local | Pérdida de los documentos si el equipo falla | Copias de seguridad periódicas de la carpeta (RNF-09) |
| Servicio de archivos inaccesible o apagado | No se pueden cargar ni ver documentos | Instalarlo en un equipo siempre encendido y accesible desde la red de la institución |
| Políticas RLS mal configuradas | Un usuario ve datos que no le corresponden | Pruebas SQL por cada rol antes de cerrar cada sprint |
