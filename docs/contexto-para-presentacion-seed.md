# Seed — Contexto del proyecto y sistema de diseño para crear una presentación

Fecha de revisión: 13 de noviembre de 2026.

Este documento puede adjuntarse completo a una IA que genere presentaciones, junto con el logo de Seed. Describe el producto y su implementación visible en el repositorio. Las indicaciones de composición de diapositivas son recomendaciones para trasladar esa identidad a una presentación; no son características adicionales de la aplicación.

## 1. Identidad y resumen ejecutivo

**Nombre:** Seed.

**Nombre descriptivo:** Sistema de Gestión del Comité de Investigación.

**Qué es:** una aplicación web institucional para gestionar solicitudes de investigación, desde la radicación y la validación documental hasta la evaluación por pares, la deliberación del comité y la generación de actas.

**Contexto de uso:** entorno universitario, grupos de investigación, investigadores, personal administrativo y órganos colegiados de investigación. No se ha confirmado en esta revisión el nombre de una universidad específica: no inventarlo ni asociar escudos institucionales.

**Propuesta de valor:** reunir en un mismo flujo los documentos, responsables, observaciones, estados y decisiones de cada solicitud, con reglas de acceso y trazabilidad.

**Descripción breve para una portada o introducción:**

> Seed acompaña la gestión de la investigación: organiza las solicitudes, guía su revisión y conserva la trazabilidad de las decisiones del comité.

**Textos de marca que ya aparecen en la aplicación:**

- «Las grandes ideas empiezan con una semilla.»
- «Un espacio para impulsar su investigación. Radique solicitudes, acompañe su avance y conecte con el comité.»
- «De la primera idea al siguiente logro.»
- «Seed · Gestión de la investigación».

El nombre y el símbolo de semilla permiten comunicar crecimiento, acompañamiento y desarrollo de ideas. Esta es una lectura de su identidad visual, no una declaración institucional de misión.

## 2. Problema y objetivos

El problema que aborda el producto puede explicarse como la necesidad de coordinar un proceso institucional con múltiples responsables y etapas: saber qué se presentó, qué falta, quién debe revisar, qué puede pasar a comité y cómo se documenta la decisión.

La aplicación está orientada a:

1. Centralizar solicitudes y sus soportes documentales.
2. Hacer explícitos los requisitos de cada tipo de trámite.
3. Facilitar la corrección de documentos y la respuesta a observaciones.
4. Coordinar la asignación y evaluación por pares.
5. Organizar sesiones, agendas, asistencia y decisiones.
6. Conservar el historial del expediente y las actas aprobadas.
7. Ofrecer seguimiento operativo e indicadores a los roles autorizados.

Estos son objetivos y beneficios esperados. No hay evidencia aportada aquí de reducción porcentual de tiempos, ahorro económico, número de usuarios reales o adopción institucional; no presentar esas cifras como resultados.

## 3. Usuarios y roles

Una cuenta puede tener varios roles y seleccionar su rol activo. El menú y la pantalla inicial se adaptan a ese rol; cambiarlo no concede permisos nuevos.

| Rol | Responsabilidad y experiencia principal |
| --- | --- |
| Investigador | Crear solicitudes, adjuntar requisitos, consultar sus expedientes, revisar pendientes y subsanar documentos u observaciones. |
| Personal administrativo | Atender la cola de validación documental, dictaminar soportes y consultar el panel de seguimiento. |
| Integrante del comité | Consultar sus revisiones asignadas, registrar evaluación técnica y participar en sesiones y consulta de actas. |
| Secretaría del comité | Coordinar seguimiento, asignaciones de pares, sesiones, agendas, registro de decisiones, actas y reportes. También tiene acceso a validación documental. |      
| Líder de investigación | Consultar el seguimiento relacionado con su grupo y las vistas de actas y reportes autorizadas. El catálogo contempla cartas de aval del líder como soporte documental. |
| Administrador del sistema | Gestionar usuarios y roles, grupos de investigación y catálogo de trámites y requisitos. Tiene acceso autorizado a reportes. |

No describir al administrador como una cuenta que automáticamente puede hacer cualquier operación de negocio. Los permisos se definen por función y los datos también se controlan en el backend. No afirmar que existe un módulo independiente de aprobación digital de avales del líder: el soporte identificado es documental.

## 4. Alcance funcional

### 4.1 Acceso y perfil

- Inicio de sesión y registro de investigadores.
- Perfil de usuario y vínculo con grupo de investigación.
- Selección entre roles ya asignados a la cuenta.
- Rutas protegidas y respuestas de acceso no autorizado.

### 4.2 Catálogo institucional

Los tipos de trámite y sus requisitos son configurables. Cada requisito puede indicar obligatoriedad, posibilidad de subsanación, formatos, tamaño máximo, plantilla y plazo de corrección.

El catálogo base del código contempla estas 12 categorías; la configuración de la instancia puede variar:

1. Presentación de proyecto de investigación / aval institucional.
2. Modificación de rubro presupuestal superior al 20 %.
3. Cambio de participantes o investigador principal.
4. Prórroga de cronograma y tiempo de ejecución.
5. Modificación de horas de dedicación docente.
6. Aplazamiento temporal de la ejecución.
7. Modificación de productos o compromisos científicos.
8. Informe de avance periódico y cumplimiento.
9. Informe final, liquidación y cierre de proyecto.
10. Aval de convenio o contrato de cooperación externa.
11. Apoyo institucional a movilidad o participación en eventos.
12. Vinculación de estudiantes o monitores de investigación.

Ejemplos de requisitos: propuesta técnica, presupuesto, carta de aval del líder, aval del tutor cuando corresponde, aval de ética cuando aplica, cronograma y evidencias de avance. No todos se exigen en todos los trámites.

### 4.3 Radicación guiada

El asistente de nueva solicitud tiene cuatro pasos reales:

1. **Tipo y Requisitos:** selección del trámite y consulta de requisitos.
2. **Datos Generales:** título, resumen o justificación, grupo y datos complementarios.
3. **Carga Documental:** soportes asociados a cada requisito.
4. **Revisión y Envío:** comprobación y confirmación de la radicación.

Se genera un radicado consecutivo anual. En el backend configurado, la radicación utiliza una operación transaccional que reúne expediente, documentos e historial y contempla reintentos para evitar duplicados.

El código admite PDF y Word (.pdf, .docx y .doc), con un límite general de carga de 10 MB por archivo. Algunos textos de interfaz mencionan solo PDF/DOCX; para una diapositiva general usar «soportes PDF y Word, con validación de tamaño y formato». Los requisitos del catálogo también modelan restricciones específicas.

### 4.4 Mis solicitudes y expediente

- Listado de solicitudes del investigador y búsqueda o filtrado.
- Estado actual y orientación sobre qué falta.
- Detalle con documentos, observaciones e historial.
- Carga de correcciones y respuesta a observaciones según permisos y etapa.

### 4.5 Validación documental

- Cola ordenada por antigüedad de radicación, con desempate estable.
- Dictamen individual de documentos y avance de requisitos obligatorios.
- Observaciones para soportes rechazados.
- Acción explícita de finalizar validación.
- El servidor determina el resultado a partir de los requisitos y documentos existentes.
- Si todo es conforme, el expediente avanza a revisión técnica.
- Si faltan soportes subsanables o requieren corrección, queda pendiente por documentos.
- Si falla un requisito esencial no subsanable, se rechaza.
- El cierre se registra con las versiones documentales atendidas y evita duplicar la misma ronda por un reintento.
- Las solicitudes que esperan correcciones se separan de la atención activa; vuelven a la cola cuando cambia una versión documental.

### 4.6 Asignación y evaluación técnica

- Secretaría asigna un revisor y una fecha límite.
- Se comprueban conflictos por autoría y pertenencia al mismo grupo.
- La reasignación conserva la asignación previa como histórica.
- El evaluador registra observaciones de aclaración, ajuste obligatorio o sugerencia.
- El investigador puede responder a observaciones.
- Se emite un concepto técnico motivado, con categorías favorable, favorable con ajustes o desfavorable.
- El concepto técnico y la decisión final del comité son hitos diferentes.

### 4.7 Panel de seguimiento

Incluye vista de tabla y tablero Kanban, búsqueda, filtros y métricas de seguimiento. El tablero agrupa el proceso en cinco columnas:

**Radicada → Pendiente por documentos → En revisión → Lista para comité → Decididas.**

Es una agrupación visual: las solicitudes no tienen que recorrer todas las columnas. La columna Decididas agrupa aprobadas, aprobadas con ajustes y rechazadas. El sistema comprueba permisos y transiciones; un arrastre no debe interpretarse como autorización para omitir validaciones o decisiones formales.

### 4.8 Sesiones y decisiones

- Programación de sesiones ordinarias o extraordinarias.
- Fecha, lugar o enlace y quórum requerido.
- Conformación y cierre de agenda con orden de asuntos y ponentes.
- Inclusión de solicitudes listas para comité.
- Registro de asistencia.
- Verificación de quórum general y elegibilidad por expediente, excluyendo conflictos de interés.
- Decisiones motivadas: aprobada, aprobada con ajustes, rechazada o aplazada.
- El aplazamiento conserva la solicitud lista para comité.
- Registro de constancias de no deliberación y sus motivos.

Explicar el quórum como «umbral requerido configurado para la sesión y comprobado antes de decidir». No afirmar que siempre se calcula automáticamente con una fórmula universal de mitad más uno: el modelo actual guarda un umbral configurable.

### 4.9 Actas

- Generación de borrador a partir de la información de la sesión.
- Consolidación de asistentes, agenda, decisiones y constancias.
- Campos editoriales para observaciones, compromisos y firmantes.
- Separación entre información de origen de la sesión y contenido editorial.
- Numeración anual de actas.
- Vista previa y exportación PDF, tanto de borradores como de actas aprobadas.
- Bloqueo de modificaciones tras la aprobación.

La presencia de nombres de firmantes o de un archivo cuyo nombre contenga «firmada» no demuestra una firma electrónica o digital criptográfica. Presentar «acta aprobada y exportable a PDF».

### 4.10 Notificaciones

La bandeja y la campana se alimentan de notificaciones persistidas en Supabase. Contemplan radicación, cambios de estado, ajustes requeridos, asignaciones, evaluación entregada, convocatorias, cambios de agenda, decisiones, no deliberación y aprobación de actas, según el destinatario.

La lectura se guarda por usuario. La sincronización utiliza Realtime y una actualización periódica de respaldo de 30 segundos. No se han implementado aquí envíos de correo ni recordatorios programados.

### 4.11 Reportes y administración

- Conteos de solicitudes y distribución por estados y tipos.
- Tasa de aprobación calculada sobre las solicitudes cargadas.
- Exportación consolidada a CSV, que puede abrirse en una hoja de cálculo.
- Gestión de usuarios, roles, grupos y catálogo.

No anunciar exportación nativa XLSX, analítica predictiva ni segmentación temporal plenamente verificada solo porque la interfaz muestre selectores de período. Para una demostración, comprobar el alcance de cada indicador y filtro con los datos disponibles.

## 5. Flujo y estados del expediente

**Flujo principal simplificado:**

Radicación → Validación documental → Asignación de par → Evaluación técnica → Agenda y sesión del comité → Decisión → Acta y cierre.

**Ramas relevantes:**

- Validación con faltantes subsanables → corrección documental → nueva validación.
- Requisito esencial no subsanable rechazado → rechazo.
- Revisión técnica con ajustes → atención de observaciones según el flujo permitido.
- Decisión aplazada o ausencia de condiciones para deliberar → conservación del expediente para tratamiento posterior.
- Aprobación con ajustes → verificación y avance permitido hasta aprobación o cierre.

| Estado de interfaz | Significado |
| --- | --- |
| Radicada | Solicitud ingresada con radicado, pendiente de atención documental. |
| Pendiente por documentos | Existen faltantes o correcciones subsanables. |
| En revisión técnica | Etapa de evaluación por pares. |
| Lista para comité | Habilitada para tratamiento en agenda. |
| Aprobada | Decisión favorable formal del comité. |
| Aprobada con ajustes | Decisión favorable sujeta a ajustes verificables. |
| Rechazada | Resultado desfavorable documental o colegiado. |
| Cerrada | Trámite finalizado y archivado. |

«Aplazada» es una decisión de sesión, no un noveno estado principal del expediente.

## 6. Reglas y atributos que diferencian el producto

1. **Requisitos por trámite:** la documentación depende del catálogo configurado.
2. **Subsanación diferenciada:** se distinguen requisitos corregibles y esenciales no subsanables.
3. **Responsabilidades por rol:** cada participante accede a operaciones y datos autorizados.
4. **Conflictos de interés:** controles al asignar pares y al establecer quién puede contar para deliberar sobre un expediente.
5. **Decisiones justificadas:** los resultados relevantes conservan motivación y responsable.
6. **Trazabilidad:** historial de eventos, revisión y cambios del expediente.
7. **Protección de registros aprobados:** actas aprobadas y registros de auditoría con restricciones de modificación.
8. **Persistencia transaccional:** operaciones críticas se resuelven en PostgreSQL mediante funciones y controles de servidor.
9. **Integridad documental:** el servicio de archivos calcula hashes SHA-256 de los soportes.
10. **Experiencia adaptable:** escritorio con navegación lateral y móvil con navegación inferior y paneles deslizables.

Son mecanismos implementados en el código y las migraciones, no una certificación externa de seguridad, accesibilidad o validez jurídica.

## 7. Arquitectura técnica

### Diagrama conceptual para la presentación

```text
Usuarios y roles
      ↓
Aplicación web React + TypeScript
      ├── Supabase Auth: autenticación
      ├── PostgreSQL en Supabase: datos, RLS, funciones y transacciones
      ├── Supabase Realtime: sincronización de notificaciones
      ├── Servicio de archivos Node.js: soportes locales y SHA-256
      └── Generación PDF / exportación CSV
```

| Capa | Tecnologías o decisiones identificadas |
| --- | --- |
| Interfaz | React 19, TypeScript, Vite. |
| Estilos | Tailwind CSS 4 y CSS específico; componentes propios reutilizables. |
| Navegación | React Router y rutas protegidas. |
| Estado | Zustand para los almacenes de dominio; TanStack Query para consultas como notificaciones. |
| Validación | Esquemas Zod y comprobaciones de formularios y documentos. |
| Identidad y datos | Supabase Auth y PostgreSQL con políticas de seguridad por fila (RLS). |
| Lógica crítica | Funciones SQL/RPC para radicación, validación, evaluación y operaciones del comité. |
| Archivos | Servicio Node.js conectado a Vite mediante un plugin; almacenamiento local en file-service/storage. |
| Exportación | jsPDF y jsPDF AutoTable para actas; CSV para reportes. |
| Iconos | Lucide React. |

La organización del frontend separa páginas, layouts, componentes UI y funcionalidades: autenticación, solicitudes, validación, sesiones, actas, notificaciones, reportes, catálogo, grupos y usuarios.

El repositorio contiene también dependencias y archivos de otras tecnologías. No presentar Firebase, Gemini, Drizzle o una API Express independiente como piezas centrales activas solo por su presencia en package.json. La integración principal observada en la aplicación actual es Supabase y el servicio local de archivos conectado a Vite.

Existen rutas locales con datos iniciales/de demostración y persistencia en el navegador en algunos almacenes. Las operaciones reales requieren Supabase configurado y migraciones aplicadas. El almacenamiento de archivos conectado al servidor Vite requiere resolver su operación en el despliegue final; una compilación estática por sí sola no publica ese servicio.

## 8. Estado de la evidencia y límites de las afirmaciones

Esta revisión es documental y de código: no ejecutó pruebas ni una verificación funcional en el entorno desplegado. El repositorio contiene suites de cliente y pruebas SQL de permisos, radicación, validación, revisión, comité, notificaciones y actas. La documentación del 11 de noviembre de 2026 registra verificaciones de validación documental y notificaciones, incluida sincronización en vivo. Eso es evidencia histórica del repositorio, no una validación nueva de esta revisión.

Para la presentación:

- Hablar de funcionalidades identificadas en la implementación y beneficios esperados.
- No usar conteos fijos de suites ni «100 % de cobertura» tomados de manuales antiguos como resultados actuales.
- No afirmar certificación WCAG AA, cumplimiento jurídico integral, invulnerabilidad o auditoría de seguridad externa.
- No confundir hash de integridad con cifrado o firma digital.
- No presentar la app como un sistema de evaluación por IA: el flujo revisado utiliza evaluación humana por pares y comité.
- No convertir registros de demostración en cifras de operación real.
- No inventar autores, universidad, URL pública, cronograma contractual, presupuesto o resultados de adopción.

## 9. Sistema de diseño actual

### 9.1 Dirección visual

La interfaz combina una identidad institucional sobria con referencias orgánicas al crecimiento. Predominan el verde bosque muy oscuro, el lima y las superficies claras cálidas. Usa tarjetas, contornos finos, esquinas redondeadas, iconos lineales y una densidad de información apropiada para tareas administrativas.

El área de trabajo es principalmente clara. El verde oscuro aparece en texto, navegación activa, botones y áreas de marca. El lima enfatiza momentos clave, contadores y el estado «Lista para comité». La pantalla de acceso tiene una composición más expresiva, con degradados y una semilla translúcida.

Los estilos actuales están repartidos entre CSS global, clases Tailwind y componentes. Lo siguiente documenta ese sistema existente; no supone que todos estos valores estén centralizados en un archivo de tokens.

### 9.2 Paleta principal exacta

| Color | HEX | Uso actual |
| --- | --- | --- |
| Verde bosque | **#14281D** | Color de marca principal; texto estructural, botones primarios y navegación activa. |
| Verde bosque en hover | **#1E3A2B** | Estado hover del botón primario. |
| Lima de énfasis | **#A3E635** | Botón accent, badges, estado listo para comité y contadores. |
| Lima del símbolo / hover | **#84CC16** | Brote del logo, borde del acento, hover y foco en autenticación. |
| Fondo cálido | **#F7F6F2** | Fondo principal de trabajo, campos y superficies secundarias. |
| Blanco | **#FFFFFF** | Tarjetas, cabecera, barra lateral y paneles. |
| Borde cálido | **#E5E3DC** | Divisiones y bordes de componentes. |
| Superficie hover | **#EFECE6** | Hover de superficies secundarias. |
| Tinta base | **#1E2924** | Texto base del body; muchos elementos concretos usan #14281D. |
| Superficie de acceso | **#FCFCF9** | Panel de formulario de autenticación. |
| Verde suave de navegación móvil | **#EDF4E5** | Fondo del tab activo en móvil. |

Para textos secundarios se usa la familia `stone` de Tailwind: stone-400 para indicaciones tenues, stone-500 para ayudas, stone-600 para texto secundario y stone-700 para etiquetas. El CSS móvil también fija **#78716C**, y autenticación usa **#57534E** y **#A8A29E**. Conservar estos neutros cálidos; evitar sustituir toda la interfaz por grises azulados.

### 9.3 Colores semánticos y estados

La tabla conserva los nombres de clases exactos del código para los colores de Tailwind. Los colores de marca sí se fijan mediante HEX.

| Estado | Fondo | Texto | Borde | Icono Lucide |
| --- | --- | --- | --- | --- |
| Radicada | stone-100 | stone-800 | stone-200 | Inbox |
| Pendiente por documentos | amber-100 | amber-900 | amber-300 | AlertCircle |
| En revisión técnica | emerald-100 | emerald-900 | emerald-300 | Search |
| Lista para comité | #A3E635 | #14281D, semibold | #84CC16 | Scale |
| Aprobada | #14281D | #F8F7F4 | #14281D | CheckCircle2 |
| Aprobada con ajustes | teal-100 | teal-900 | teal-300 | Clock |
| Rechazada | rose-100 | rose-900 | rose-300 | XCircle |
| Cerrada | stone-200 | stone-700 | stone-300 | CheckCircle2 |

Los badges genéricos de éxito, advertencia y peligro usan fondos emerald-50, amber-50 y rose-50, texto de la misma familia en tono 800 y borde en tono 200. Estos badges no tienen exactamente la misma intensidad que los badges de estado del expediente.

Mantener siempre texto e icono junto al color para comunicar el significado.

### 9.4 Tipografía

| Uso | Familia | Tratamiento observado |
| --- | --- | --- |
| Títulos y marca | **Plus Jakarta Sans** | Pesos 600–700 frecuentes; títulos con tracking de -0.02em. |
| Cuerpo, controles y tablas | **DM Sans** | Pesos 400–600; 700 en acciones o énfasis. |
| Fallback | system-ui, -apple-system, sans-serif | Si las fuentes externas no cargan. |

Ambas fuentes se cargan desde Google Fonts. El wordmark usa Plus Jakarta Sans, negrita y tracking de -0.03em.

Escalas observadas en la aplicación:

- Ayudas y metadatos: 10–11 px.
- Controles, navegación y datos compactos: 12 px.
- Texto secundario y formularios: 13–16 px, según contexto.
- Título del formulario de acceso: 28 px.
- Encabezado de marca en acceso: entre 34 y 50 px en escritorio; 28 px en móvil.
- Títulos de acceso con interlineado cercano a 1.14 y tracking más cerrado, hasta -0.05em.

**Adaptación a diapositivas:** conservar las familias y jerarquías, aumentando el tamaño para proyección. Recomendación: portada 40–54 pt; título de diapositiva 28–36 pt; cuerpo 20–24 pt; etiquetas y pies 14–16 pt. Estas medidas son recomendaciones para la presentación, no tamaños del CSS de la app.

### 9.5 Espaciado y estructura

- Ritmo frecuente de 4, 8, 12, 16, 20, 24 y 32 px.
- Tarjetas con contenido interior de 20 px en los componentes base.
- Cabecera de escritorio de 56 px y barra lateral de 240 px.
- Contenido principal con ancho máximo de 72 rem (aproximadamente 1152 px con raíz de 16 px).
- Padding principal de 16 px, 24 px o 32 px según el ancho de pantalla.
- Agrupación clara: encabezado de página, descripción, métricas/filtros y contenido operativo.
- Uso de grillas, tablas, tarjetas y columnas Kanban según el tipo de información.

### 9.6 Radios, bordes y profundidad

| Elemento | Tratamiento |
| --- | --- |
| Botón e input base | Radio de 8 px (`rounded-lg`). |
| Navegación y menús | Radio frecuente de 12 px (`rounded-xl`). |
| Tarjeta | Radio de 16 px (`rounded-2xl`), blanco, borde #E5E3DC y sombra muy tenue. |
| Badge genérico | Forma de píldora (`rounded-full`). |
| Badge de estado | Radio de 8 px, icono y borde. |
| Autenticación | Contenedor exterior de 36 px; paneles internos de 26 px; campos y botón principal de 13 px. |
| Panel inferior móvil | Esquinas superiores de 24 px. |

La profundidad es discreta: sombras pequeñas en componentes y mayor elevación en menús, overlays y la pantalla de acceso. El contenedor de acceso usa `0 24px 80px rgb(20 40 29 / 10%)`.

### 9.7 Botones

| Variante | Apariencia y uso |
| --- | --- |
| Primary | Fondo #14281D, texto blanco, borde del mismo verde; acción principal convencional. |
| Accent | Fondo #A3E635, texto #14281D, borde #84CC16; énfasis especial. |
| Secondary | Fondo #F7F6F2, texto #14281D, borde #E5E3DC. |
| Outline | Transparente, texto stone-700, borde stone-200. |
| Ghost | Sin fondo de reposo, texto stone-600, hover claro. |
| Danger | Fondo rose-50, texto rose-700, borde rose-200. |

Los botones permiten iconos a izquierda o derecha y un spinner durante la carga. El estado deshabilitado baja la opacidad al 50 %. En la app existen tamaños sm, md y lg; los textos base son de 12 o 14 px. El acceso usa una acción de ancho completo y altura mínima de 52 px.

### 9.8 Campos, filtros y retroalimentación

- Inputs de fondo #F7F6F2, borde cálido, texto verde oscuro y etiqueta visible.
- Al enfocar, el campo base pasa a blanco con borde y anillo verde.
- Error con borde rose, mensaje explícito y ayuda contextual.
- Barras de búsqueda y filtros sobre el contenido.
- Diálogos de confirmación para operaciones relevantes.
- Mensajes de carga, guardado, error y lista vacía.
- El avance de una operación se refleja después de confirmar el guardado cuando el flujo depende del backend.

### 9.9 Iconografía y elementos de marca

Se usa **Lucide React**, con iconos de trazo fino y coherente: FileText, ClipboardCheck, LayoutDashboard, Calendar, FileCheck, Users, Bell, Search, Scale y CheckCircle2, entre otros. Los tamaños habituales son de 14–18 px en controles y navegación.

El logo del repositorio es un símbolo vectorial orgánico de semilla y brote: verde #14281D, brote #84CC16 y núcleo claro #F7F6F2. El wordmark es «Seed».

**Para la IA:** utilizar el logo adjunto por el usuario como referencia definitiva. No redibujarlo, deformarlo, cambiar su proporción ni sustituirlo por un icono de planta genérico. Si la versión adjunta difiere del símbolo del repositorio, preservar el adjunto y mantener la paleta de la aplicación salvo instrucción expresa del usuario. No se encontró un manual formal de área de reserva o tamaño mínimo: no inventar esas medidas como normas oficiales.

### 9.10 Autenticación y recursos gráficos

La pantalla de acceso organiza dos paneles: marca oscura a la izquierda y formulario claro a la derecha. El fondo exterior combina manchas radiales suaves, con #DBE9CE, #DCE6DF y base #F0F0E9. El panel oscuro combina un radial #5D7857 con un degradado de #253E2D a #14281D.

La ilustración decorativa representa una semilla translúcida, con reflejos claros, brillo lima, formas orgánicas y órbitas circulares muy sutiles. El énfasis del título usa #C9EB99; los textos secundarios del panel usan verdes claros desaturados.

Estos recursos sirven como referencia para portada y cierre. En las diapositivas de contenido conviene conservar la claridad de las superficies de trabajo.

### 9.11 Movimiento

- Transiciones cortas de 150 ms en botones y componentes.
- Overlays con opacidad y desplazamiento de 300 ms.
- Entrada de campos con desvanecimiento y desplazamiento vertical de 6 px.
- Botones con pequeña reducción de escala al presionar.
- Consideración de `prefers-reduced-motion` para overlays y otros elementos.

Adaptación recomendada: transiciones de diapositiva discretas y apariciones simples. La presentación no necesita animación compleja para reproducir la identidad.

### 9.12 Comportamiento móvil y accesibilidad

Por debajo de 768 px:

- Cabecera móvil y barra inferior fija con icono y texto.
- Tab activo en verde suave y contador lima.
- Modales convertidos en paneles inferiores, con altura máxima aproximada del 85 % de la ventana.
- Tablas que pueden presentarse como tarjetas con etiquetas por campo.
- Métricas en carruseles horizontales y filtros en paneles.
- Objetivos táctiles de al menos 44 px y campos con texto de 16 px.
- Respeto de las áreas seguras del dispositivo.

El código incorpora etiquetas, mensajes, indicadores visuales y ajustes de movimiento. No presentar esto como una certificación completa de accesibilidad. En la presentación asegurar legibilidad, contraste y estados acompañados por texto.

### 9.13 Estilo de las actas PDF

Las actas usan una variante documental de la misma marca: verde bosque #14281D, verde #365F46, lima #A3E635, tinta #26352D, texto secundario #627268, borde #DCE4DE y superficie #F3F6F2. Sus colores de advertencia y observación son #805B24 y #923E44.

Esta variante sirve para mostrar consistencia entre producto y documento exportado; no reemplaza la paleta principal de interfaz.

## 10. Dirección recomendada para las diapositivas

Estas son decisiones propuestas para la presentación, derivadas de la app:

- Formato panorámico 16:9.
- Fondo principal #F7F6F2 y tarjetas blancas con bordes sutiles.
- Verde #14281D para títulos y estructura; lima #A3E635 para énfasis puntual.
- Portada y cierre con panel verde oscuro, logo y una referencia orgánica sutil a la semilla.
- Tipografía Plus Jakarta Sans en títulos y DM Sans en cuerpo.
- Composiciones amplias, con una idea central y hasta tres o cuatro puntos breves por diapositiva.
- Diagramas de flujo para el proceso; tarjetas para roles; matriz breve para estados; esquema por capas para arquitectura.
- Capturas reales cuando estén disponibles. Si se recrea una pantalla, marcarla como esquema ilustrativo, sin inventar datos de operación.
- Texto verde oscuro sobre lima. Evitar cuerpo de texto lima sobre blanco y blanco pequeño sobre lima.
- Gráficas únicamente con datos aportados y verificables; cuando no existan datos, mostrar capacidades o beneficios esperados.

## 11. Guion sugerido de 15 diapositivas

| N.º | Título sugerido | Mensaje central | Recurso visual |
| --- | --- | --- | --- |
| 1 | Seed: las grandes ideas empiezan con una semilla | Nombre y propósito institucional. | Logo y fondo de marca. |
| 2 | El reto de coordinar la investigación | Varios responsables, documentos y decisiones requieren un flujo común. | Etapas y puntos de coordinación, sin cifras inventadas. |
| 3 | Una plataforma para acompañar cada solicitud | Propuesta de valor y objetivos. | Expediente central conectado a responsables. |
| 4 | Seis roles, responsabilidades claras | Usuarios y acceso por función. | Seis tarjetas con iconos. |
| 5 | Un recorrido trazable | Flujo desde radicación hasta acta y cierre. | Diagrama con rama de subsanación. |
| 6 | Radicar con requisitos claros | Asistente de cuatro pasos y catálogo configurable. | Stepper y ejemplos de requisitos. |
| 7 | Validar documentos y orientar correcciones | Cola documental, dictámenes y resultados. | Tres salidas: revisión, corrección o rechazo. |
| 8 | Evaluación por pares con controles | Asignación, conflictos, observaciones y concepto. | Revisor, expediente y checklist. |
| 9 | Seguimiento visible del proceso | Tabla, Kanban y orientación de pendientes. | Cinco columnas y badges de estado. |
| 10 | Sesiones con condiciones para decidir | Agenda, asistencia, quórum y conflictos por expediente. | Agenda y control de elegibilidad. |
| 11 | Decisiones que quedan documentadas | Resultados motivados y conservación del historial. | Cuatro decisiones y conexión al expediente. |
| 12 | Actas y notificaciones | Borrador, aprobación, PDF y avisos por usuario. | Documento y campana; separar ambas capacidades. |
| 13 | Información para la gestión | Indicadores, CSV y administración del catálogo. | Tarjetas sin estadísticas ficticias. |
| 14 | Cómo está construido Seed | Arquitectura, persistencia y controles principales. | Capas técnicas con nombres breves. |
| 15 | De la primera idea al siguiente logro | Beneficios esperados y síntesis de valor. | Logo y tres beneficios concretos. |

Si la audiencia es técnica, añadir una diapositiva de reglas de negocio y otra de sistema de diseño. Si el tiempo es corto, unir decisiones con actas y reducir los módulos a grupos funcionales. El guion es una propuesta editorial, no una restricción del producto.

## 12. Prompt listo para entregar a la IA de presentaciones

Copiar el siguiente bloque y adjuntar este documento completo y el logo:

```text
Crea una presentación en español sobre Seed, el Sistema de Gestión del Comité de Investigación, usando el documento adjunto como fuente de contexto y el logo que adjunto como identidad oficial para esta presentación.

Audiencia por defecto: académica e institucional, con conocimientos básicos de tecnología. Objetivo: explicar el problema que aborda Seed, su propuesta de valor, los usuarios, el proceso completo, las funciones implementadas, sus controles y su arquitectura. Propón 15 diapositivas en formato 16:9 siguiendo el guion del documento, con notas de exposición para cada una.

Respeta el sistema visual actual: verde bosque #14281D, lima #A3E635, verde del símbolo #84CC16, fondo cálido #F7F6F2, superficies blancas y bordes #E5E3DC. Usa Plus Jakarta Sans para títulos y DM Sans para cuerpo. Conserva el logo sin modificar su proporción. Usa tarjetas de esquinas redondeadas, bordes finos, sombras discretas e iconos lineales de estilo Lucide. Lleva la identidad orgánica y los degradados suaves de la pantalla de acceso a la portada y el cierre.

Mantén una jerarquía apta para proyección, textos breves y una idea principal por diapositiva. Usa diagramas para el flujo y la arquitectura. Respeta el significado y los colores de los estados. Distingue el concepto del revisor de la decisión del comité, la decisión de aplazamiento del estado del expediente, y el acta aprobada de una firma digital.

No inventes universidad, autores, cifras, resultados de adopción, métricas de impacto, estadísticas operativas, certificaciones, funciones de inteligencia artificial, correo automático, exportación XLSX ni firmas digitales. Presenta los beneficios como esperados cuando no haya medición. Explica la arquitectura activa con React, TypeScript, Vite, Tailwind, Supabase/PostgreSQL y servicio local de archivos. No conviertas dependencias instaladas en capacidades del producto.

Si no cuentas con capturas reales, utiliza diagramas o recreaciones identificadas como ilustrativas. No presentes datos de ejemplo como datos institucionales. Usa las notas del presentador para ampliar detalles técnicos y límites; evita saturar las diapositivas.

Entrega una narrativa coherente que muestre cómo Seed conecta radicación, validación, revisión por pares, sesiones, decisiones, actas y seguimiento.
```

## 13. Fuentes internas consultadas

Estas referencias permiten contrastar el contenido; la IA que recibe este documento no necesita acceso al repositorio para utilizar el brief.

| Tema | Fuentes principales |
| --- | --- |
| Identidad y descripción | `metadata.json`, `index.html`, `src/components/SeedLogo.tsx`, `src/layouts/AuthLayout.tsx`. |
| Diseño | `src/index.css`, `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`, `StatusBadge.tsx`, `src/types/theme.ts`. |
| Navegación y permisos | `src/routes/AppRoutes.tsx`, `src/lib/permissions.ts`, `src/layouts/AppLayout.tsx`. |
| Catálogo y requisitos | `src/features/catalog/catalogStore.ts`, `src/types/database.ts`, `supabase/seed.sql`. |
| Radicación y estados | `src/features/requests/RequestSubmissionWizard.tsx`, `requestSchema.ts`, `requestStore.ts`, `documentValidator.ts`. |
| Validación documental | `docs/validacion-documental.md`, `src/features/validation/documentaryQueue.ts`, migración `20261111000005_finalize_documentary_validation.sql`. |
| Comité | `src/features/sessions/committeeSessionsStore.ts`, `requestQuorum.ts`, migraciones de persistencia del comité y no deliberación. |
| Actas y PDF | `src/features/minutes/minutesStore.ts`, `src/features/minutes/pdf/minutePdfTheme.ts` y componentes del módulo de actas. |
| Notificaciones | `docs/notificaciones.md`, `src/features/notifications/`, migración `20261111000004_persist_notifications.sql`. |
| Reportes y seguimiento | `src/pages/comite/ReportesPage.tsx`, `src/pages/gestion/PanelSeguimientoPage.tsx`. |
| Arquitectura y archivos | `package.json`, `src/App.tsx`, `vite.config.ts`, `file-service/README.md`, `file-service/src/fileService.ts`. |

El manual de usuario y los planes de `public/assets/aistudio/` aportan contexto histórico, pero en los puntos donde difieren se priorizaron el código y la documentación reciente. El símbolo de logo del repositorio también está disponible en `public/assets/seed-logo-32x32.svg`; para la presentación se debe priorizar el adjunto del usuario.
