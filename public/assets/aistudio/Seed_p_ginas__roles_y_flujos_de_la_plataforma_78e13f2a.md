# Seed: páginas, roles y flujos de la plataforma

Nov 4, 2026 · @José

Esta guía define qué páginas tiene Seed, qué ve y qué puede hacer cada rol, y cómo se mueve el usuario entre ellas. El agente de desarrollo debe seguirla en lugar de inventar pantallas, y trabajar con las tareas de la sección 7.2 del plan de desarrollo.

## 1. Reglas para el agente

- **App.tsx solo configura:** proveedores (Supabase, TanStack Query) y el enrutador. No contiene pantallas ni lógica.
- **Una página, un archivo:** cada página vive en `pages/`, y la lógica de cada módulo (consultas, formularios, reglas) en `features/`.
- **Sin información técnica en pantalla:** nada de IDs internos, JSON, nombres de columnas ni mensajes de error crudos de Supabase. Todo en español y en lenguaje del comité (por ejemplo, “Radicado 2026-014”, no “id: 3f9a…”).
- **Datos de prueba realistas:** nombres, tipos de solicitud y estados reales del proyecto, no “lorem ipsum” ni datos inventados al azar.
- **No crear pantallas que no estén aquí** sin preguntar antes.
- **Ocultar en la interfaz no es seguridad:** los permisos reales viven en Supabase (políticas RLS). La interfaz solo evita mostrar lo que el usuario no puede usar.

## 2. Roles y autenticación

### 2.1 Roles

| Código | Nombre | Qué hace |
| --- | --- | --- |
| `investigador` | Investigador | Radica solicitudes y atiende ajustes |
| `administrativo` | Personal administrativo | Valida que los documentos estén completos |
| `miembro_comite` | Integrante del comité | Revisa las solicitudes que se le asignan |
| `secretario` | Secretario(a) del comité | Asigna revisores, arma sesiones, registra decisiones y genera actas |
| `lider` | Líder de investigación | Consulta las solicitudes de su grupo |
| `admin` | Administrador del sistema | Gestiona usuarios, grupos y catálogo |

Un usuario puede tener varios roles (por ejemplo, un docente que es investigador e integrante del comité).

### 2.2 Cómo funciona el acceso

1. En `/registro` cualquiera puede crearse una cuenta, y **siempre queda con el rol `investigador`**. Nadie se asigna a sí mismo un rol del comité: los demás roles los asigna el administrador en `/admin/usuarios`. El primer administrador se crea con el seed de la base de datos.
2. En `/login` se inicia sesión con Supabase Auth (correo y contraseña).
3. Tras iniciar sesión se cargan el perfil y los roles del usuario y se guardan en un store de Zustand (`session.store`): usuario, roles y rol activo.
4. Si el usuario tiene más de un rol, la cabecera muestra un **selector de rol activo**. El menú y la página de inicio dependen del rol activo. El rol activo por defecto es el último que usó o, si no hay ninguno, `investigador`.
5. Cada ruta se envuelve en un componente `RutaProtegida` con la lista de roles permitidos:
   - sin sesión: redirige a `/login`;
   - con sesión pero sin el rol: redirige a `/sin-acceso`.
6. Al recargar la página se recupera primero la sesión y los roles, mostrando una pantalla de carga, para no “rebotar” al usuario a `/login` por error.
7. Al cerrar sesión se limpian el store y la caché de TanStack Query.

Un solo archivo (`lib/permisos.ts`) define qué rutas y qué opciones de menú tiene cada rol, para que no haya reglas de acceso repartidas por todo el código.

### 2.3 Inicio de cada rol

| Rol | Página de inicio tras el login |
| --- | --- |
| Investigador | `/mis-solicitudes` |
| Administrativo | `/validacion` |
| Integrante del comité | `/revisiones` |
| Secretario(a) | `/panel` |
| Líder de investigación | `/panel` (solo su grupo, solo lectura) |
| Administrador | `/admin/usuarios` |

## 3. Mapa de páginas

| Ruta | Página | Roles con acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión | Público |
| `/registro` | Registro de investigadores | Público |
| `/sin-acceso` | Acceso denegado | Con sesión |
| `/notificaciones` | Notificaciones | Todos |
| `/perfil` | Mi perfil | Todos |
| `/solicitudes/:id` | Detalle de la solicitud | Según permisos (sección 4.3) |
| `/mis-solicitudes` | Mis solicitudes | Investigador |
| `/solicitudes/nueva` | Asistente de radicación | Investigador |
| `/validacion` | Bandeja de validación | Administrativo, secretario |
| `/panel` | Panel de seguimiento (Kanban y tabla) | Secretario, administrativo, líder |
| `/revisiones` | Mis revisiones | Integrante del comité |
| `/asignaciones` | Asignación de revisores | Secretario |
| `/sesiones` | Lista de sesiones | Secretario, integrante (solo lectura) |
| `/sesiones/:id` | Detalle de la sesión | Secretario, integrante (solo lectura) |
| `/actas` | Actas y decisiones | Secretario, integrante, líder |
| `/reportes` | Reportes | Secretario, líder, administrador |
| `/admin/usuarios` | Usuarios y roles | Administrador |
| `/admin/grupos` | Grupos de investigación | Administrador |
| `/admin/catalogo` | Tipos de solicitud y requisitos | Administrador |

### Menú lateral por rol

Todas las páginas autenticadas comparten un mismo diseño: cabecera (logo de Seed, selector de rol, campana de notificaciones con contador, menú de usuario) y barra lateral con las opciones del rol activo.

| Rol | Opciones del menú |
| --- | --- |
| Investigador | Mis solicitudes · Nueva solicitud |
| Administrativo | Validación · Panel |
| Integrante del comité | Mis revisiones · Sesiones · Actas |
| Secretario(a) | Panel · Asignaciones · Sesiones · Actas · Reportes |
| Líder | Panel · Actas · Reportes |
| Administrador | Usuarios · Grupos · Catálogo |

## 4. Qué muestra cada página

### 4.1 Acceso

- **Inicio de sesión:** correo, contraseña, enlace a “Crear cuenta”.
- **Registro:** nombre, correo institucional, vínculo (docente, estudiante, monitor o administrativo), programa y grupo de investigación.

### 4.2 Investigador

- **Mis solicitudes:** tabla con radicado, tipo, título, estado, última actualización y una columna “Qué falta” (por ejemplo, “Cargar 2 documentos” o “Responder ajuste antes del 12/11”). Filtros por estado y tipo, y botón “Nueva solicitud”.
- **Asistente de radicación**, en 4 pasos que permiten volver atrás sin perder lo escrito:
  1. **Tipo:** tarjetas con el nombre y la descripción de cada tipo de solicitud.
  2. **Datos:** título, proyecto relacionado y resumen.
  3. **Documentos:** un cargador por cada requisito, indicando si es obligatorio o condicional y con la plantilla descargable si existe.
  4. **Revisión y envío:** resumen de lo ingresado y confirmación. Al enviar se genera el número de radicado.

### 4.3 Detalle de la solicitud (página compartida)

Es una sola página que usan todos los roles; lo que cambia son las acciones disponibles.

- **Encabezado:** radicado, tipo, título, estado (con ícono y texto, no solo color), investigador, responsable y fechas clave.
- **Pestañas:**
  - **Resumen:** datos de la solicitud.
  - **Documentos:** cada requisito con su documento, su estado de validación y el motivo si fue rechazado.
  - **Observaciones y ajustes:** observaciones clasificadas (aclaración, ajuste obligatorio, sugerencia) con autor, fecha y si fueron atendidas.
  - **Historial:** cronología de actuaciones (quién, qué y cuándo).
- **Panel de acciones:** botones que aparecen según el rol y el estado de la solicitud:

| Estado | Quién actúa | Acción disponible |
| --- | --- | --- |
| Radicada | Administrativo | Validar documentos |
| Pendiente por documentos | Investigador | Recargar documentos o responder un ajuste |
| En revisión, sin revisor | Secretario | Asignar revisor |
| En revisión, con revisor | Revisor | Dejar observaciones, pedir ajustes, emitir concepto |
| Lista para comité | Secretario | Agregar a la agenda de una sesión |
| Lista para comité, en una sesión | Secretario | Registrar la decisión |
| Aprobada con ajustes | Secretario | Verificar los ajustes y cerrar |
| Aprobada o Rechazada | Secretario | Cerrar |
| Cerrada | Nadie | Solo lectura |

El investigador solo ve sus solicitudes. El líder, solo las de su grupo y sin acciones. El revisor, las que le asignaron.

### 4.4 Gestión de solicitudes

- **Bandeja de validación:** solicitudes Radicadas y Pendientes por documentos. Al abrir una se ve la lista de verificación: cada requisito con su documento y los botones “Válido” y “Rechazar” (este pide el motivo). El botón “Finalizar validación” actualiza el estado.
- **Panel de seguimiento:**
  - Arriba, una franja de métricas con **un contador por estado**.
  - Un conmutador entre **Kanban** y **Tabla**, con filtros por estado, tipo, investigador, responsable, fechas y texto.
  - Columnas del Kanban: Radicada, Pendiente por documentos, En revisión, Lista para comité y Decididas (Aprobada, Aprobada con ajustes y Rechazada). Las Cerradas se consultan en la tabla.
  - Cada tarjeta muestra radicado, tipo, investigador, responsable, días en el estado y una alerta si hay plazo vencido.
  - Solo se puede arrastrar una tarjeta cuando el rol y las condiciones lo permiten; si no, se muestra un mensaje claro. Los líderes lo ven en solo lectura.
- **Asignación de revisores:** solicitudes En revisión sin revisor. Se elige un integrante del comité mostrando su carga de trabajo; el sistema bloquea a quien tenga conflicto de intereses (RN-03 y RN-14).
- **Mis revisiones:** tabla de las solicitudes asignadas con su plazo. Al abrir una se ven los documentos y un formulario para observaciones, ajustes y concepto (favorable, favorable con ajustes o no favorable).

### 4.5 Comité y actas

- **Sesiones:** lista (número, tipo, fecha, estado) y botón “Nueva sesión”.
- **Detalle de la sesión**, con pestañas:
  - **Agenda:** solicitudes Listas para comité, con orden y ponente.
  - **Asistencia y quórum:** quiénes asistieron y si hay quórum.
  - **Decisiones:** por cada solicitud, decisión (aprobada, aprobada con ajustes, rechazada o aplazada) y justificación.
  - **Acta:** borrador generado, edición, aprobación y descarga en PDF.
- **Actas y decisiones:** búsqueda por radicado, investigador o sesión, y descarga del PDF.
- **Reportes:** por estado, tipo y periodo, con exportación.

### 4.6 Administración

- **Usuarios y roles:** tabla de usuarios, asignación de roles y activar o desactivar cuentas.
- **Grupos de investigación:** crear grupos y asignar su líder.
- **Catálogo:** lista de tipos de solicitud; al abrir uno se editan sus requisitos (obligatorio o condicional, subsanable o no, formato y plantilla).

## 5. Flujos principales

**Flujo 1: radicar y hacer seguimiento (investigador)**

1. `/registro` y luego `/login`.
2. `/mis-solicitudes`, botón “Nueva solicitud”.
3. `/solicitudes/nueva`: tipo, datos, documentos, envío.
4. La solicitud aparece como “Radicada”.
5. Si faltan documentos o hay ajustes, llega una notificación y entra a `/solicitudes/:id` a corregir.

**Flujo 2: validación y revisión**

1. El administrativo abre `/validacion`, revisa la lista de verificación y finaliza la validación.
2. Si está completa, pasa a “En revisión”; si no, a “Pendiente por documentos”.
3. El secretario asigna un revisor en `/asignaciones`.
4. El revisor abre `/revisiones`, deja observaciones o pide ajustes y emite su concepto.
5. Con concepto favorable, la solicitud queda “Lista para comité”.

**Flujo 3: sesión, decisión y acta**

1. El secretario crea la sesión en `/sesiones` y arma la agenda con las solicitudes Listas para comité.
2. Cierra la agenda y los integrantes reciben la convocatoria.
3. En el detalle de la sesión registra la asistencia y verifica el quórum.
4. Registra la decisión de cada solicitud, con justificación cuando se requiere.
5. Genera el acta, la revisa, la aprueba y la descarga en PDF.
6. El investigador ve la decisión en el detalle de su solicitud.

## 6. Componentes principales y organización de cada página

### 6.1 Componentes compartidos

Estos componentes se crean una sola vez y se reutilizan en todas las páginas. Ninguna página debe repetir su propia versión.

| Componente | Para qué sirve | Dónde se usa |
| --- | --- | --- |
| `AppLayout` | Estructura general: cabecera, menú lateral del rol y zona de contenido | Todas las páginas con sesión |
| `SelectorDeRol` | Cambiar el rol activo cuando el usuario tiene más de uno | Cabecera |
| `CampanaNotificaciones` | Contador de avisos sin leer y lista de los últimos | Cabecera |
| `EtiquetaEstado` | Muestra el estado de una solicitud con ícono, texto y color | Tablas, tarjetas y detalle |
| `TablaDatos` | Lista con orden, paginación, estado de carga, estado vacío y error | Todas las listas |
| `BarraFiltros` | Filtros por estado, tipo, fechas y texto | Mis solicitudes, Panel, Validación, Actas |
| `TarjetaMetrica` | Contador de un estado (número y nombre) | Panel |
| `TableroKanban` y `TarjetaSolicitud` | Columnas por estado con tarjetas arrastrables según permisos | Panel |
| `CargadorDeDocumento` | Cargar un archivo (arrastrar o elegir), con validación de tipo y tamaño, progreso y estado de validación | Radicación y detalle |
| `Cronologia` | Línea de tiempo del historial: quién, qué y cuándo | Detalle de la solicitud |
| `Pestanas` | Cambiar entre secciones de una misma página | Detalle de solicitud y de sesión |
| `CampoTexto`, `CampoSelect`, `CampoFecha` | Campos de formulario ya conectados a React Hook Form, con el error en español bajo el campo | Todos los formularios |
| `DialogoConfirmacion` y `DialogoConMotivo` | Confirmar acciones importantes; el segundo exige escribir un motivo o justificación | Rechazar, aprobar con ajustes, cerrar, aprobar acta |
| `EstadoVacio`, `Cargando`, `ErrorAmigable` | Lo que se ve cuando no hay datos, mientras cargan o si algo falla | Todas las páginas |
| `Aviso` | Mensaje temporal de confirmación (“Solicitud radicada”) | Después de guardar |

### 6.2 Estructura general de las páginas con sesión

```
+----------------------------------------------------------------+
| Logo Seed         [Rol activo v]        Avisos (3)   José v    |
+-----------------+----------------------------------------------+
| Menú del rol    | Título de la página          [Acción principal]|
|                 |----------------------------------------------|
| - Opción 1      |                                              |
| - Opción 2      | Contenido de la página                       |
| - Opción 3      |                                              |
+-----------------+----------------------------------------------+
```

En pantallas pequeñas el menú lateral se convierte en un menú desplegable y las tablas se muestran como tarjetas.

### 6.3 Organización del contenido de cada página

Los bloques van de arriba hacia abajo.

**Inicio de sesión y registro** (`AuthLayout`): una tarjeta centrada con el logo de Seed, el formulario y el enlace al otro formulario. Sin menú ni cabecera.

**Mis solicitudes**

1. Título y botón “Nueva solicitud” a la derecha.
2. `BarraFiltros`: estado, tipo y texto.
3. `TablaDatos` con radicado, tipo, título, estado, última actualización y “Qué falta”.
4. Si no hay solicitudes: `EstadoVacio` con el botón “Radicar mi primera solicitud”.

**Asistente de radicación**

1. Indicador de los 4 pasos arriba.
2. Contenido del paso actual:
   - Paso 1: tarjetas con los tipos de solicitud.
   - Paso 2: formulario de datos.
   - Paso 3: una fila por requisito, con su nombre, la etiqueta Obligatorio o Condicional, la plantilla descargable y un `CargadorDeDocumento`.
   - Paso 4: resumen de todo lo ingresado.
3. Barra inferior fija con “Atrás” y “Continuar” (en el último paso, “Enviar solicitud”).

**Detalle de la solicitud**

1. Encabezado: radicado, título, `EtiquetaEstado`, tipo, investigador, responsable y fechas.
2. Columna principal (aprox. dos tercios) con `Pestanas`: Resumen, Documentos, Observaciones y ajustes, Historial.
3. Columna lateral (aprox. un tercio) con el panel de acciones del rol y el próximo plazo.
4. En la pestaña Documentos, el administrativo ve la lista de verificación: una fila por requisito con el documento, “Válido” y “Rechazar” (este abre `DialogoConMotivo`), y al final “Finalizar validación”, que se habilita cuando todos los requisitos tienen decisión.

**Panel de seguimiento**

1. Franja de `TarjetaMetrica`, una por estado.
2. Fila de herramientas: conmutador Kanban/Tabla, `BarraFiltros` y buscador.
3. Contenido: `TableroKanban` (con desplazamiento horizontal) o `TablaDatos`.
4. Al hacer clic en una tarjeta o fila se abre `/solicitudes/:id`.

**Bandeja de validación:** `BarraFiltros` y tabla con radicado, investigador, tipo, estado, fecha de radicación y documentos completos (por ejemplo, “4 de 6”). Al abrir una fila se entra al detalle, en la pestaña Documentos.

**Asignación de revisores:** tabla de solicitudes En revisión sin revisor, con radicado, tipo, investigador, grupo y días de espera. Cada fila tiene un selector de revisor que muestra su carga de trabajo, y el botón “Asignar”. Si hay conflicto de intereses, el revisor aparece bloqueado con el motivo.

**Mis revisiones:** tabla ordenada por plazo, con las vencidas resaltadas. Al abrir una se entra al detalle, donde el panel lateral contiene el formulario de revisión: observaciones, solicitud de ajustes y concepto.

**Sesiones:** tabla con número, tipo, fecha y estado, y el botón “Nueva sesión”, que abre un formulario en un diálogo.

**Detalle de la sesión**

1. Encabezado: número, tipo, fecha, lugar y estado de la sesión.
2. `Pestanas`:
   - **Agenda:** lista ordenable de las solicitudes de la sesión, cada una con su selector de ponente. A un lado, las solicitudes Listas para comité que aún no están en ninguna sesión, con el botón “Agregar”.
   - **Asistencia y quórum:** lista de integrantes con una casilla por cada uno, y un indicador (“5 de 7: hay quórum”).
   - **Decisiones:** una tarjeta por solicitud con el selector de decisión y el campo de justificación, obligatorio cuando corresponde.
   - **Acta:** vista previa y los botones “Editar”, “Aprobar” y “Descargar PDF”.

**Actas y decisiones:** `BarraFiltros` (año, sesión, radicado, investigador), tabla de actas con número, fecha, estado y descarga, y al abrir una, las decisiones de esa sesión.

**Reportes:** selector de reporte y periodo, un resumen con `TarjetaMetrica`, la tabla de resultados y el botón “Exportar”.

**Notificaciones:** lista agrupada por fecha; cada aviso tiene ícono, mensaje, enlace a la solicitud y la opción de marcarlo como leído.

**Mi perfil:** datos personales, grupo, roles y el botón “Cerrar sesión”.

**Administración**

- **Usuarios:** tabla con nombre, correo, roles (como etiquetas), grupo y estado, y un diálogo para editar los roles.
- **Grupos:** tabla y formulario para crear un grupo y asignar su líder.
- **Catálogo:** tabla de tipos de solicitud (nombre, activo, pasa a comité). Al abrir uno, formulario del tipo y, debajo, la tabla de sus requisitos (nombre, obligatorio o condicional, subsanable, formato y plantilla) con opciones para agregar y editar.

### 6.4 Reglas de composición

- Las páginas solo ensamblan componentes; la lógica y las consultas a Supabase viven en hooks dentro de `features/`, no en los componentes visuales.
- Toda lista tiene tres estados diseñados: cargando, vacía y con error.
- Las etiquetas de estado llevan ícono y texto, y sus colores son distintos al verde de la marca, para que “Aprobada” no se confunda con un botón.
- Las acciones que no se pueden deshacer (rechazar, cerrar, aprobar un acta) piden confirmación.
- Los formularios muestran los errores en español junto al campo y deshabilitan el botón de envío mientras se guarda.
- Un botón que el rol no puede usar no se muestra; no se deja deshabilitado sin explicación.

## 7. Estructura de carpetas

```
src/
  App.tsx                solo proveedores y <RouterProvider />
  routes/                router.tsx y RutaProtegida
  layouts/               AuthLayout (login, registro) y AppLayout (cabecera + menú por rol)
  pages/
    auth/                Login, Registro, SinAcceso
    investigador/        MisSolicitudes, NuevaSolicitud
    gestion/             Validacion, Panel, Asignaciones, Revisiones
    comite/              Sesiones, DetalleSesion, Actas, Reportes
    admin/               Usuarios, Grupos, Catalogo
    compartidas/         DetalleSolicitud, Notificaciones, Perfil
  features/              lógica por módulo: solicitudes, documentos, revision,
                         sesiones, actas, catalogo, usuarios, notificaciones
  stores/                session.store.ts (Zustand)
  components/ui/         componentes reutilizables
  lib/                   supabase.ts, queryClient.ts, permisos.ts
```

## 8. Siguiente tarea para el agente

Antes de implementar cualquier funcionalidad, hacer el **esqueleto de navegación**, como una sola tarea con su verificación y su commit:

1. Crear el enrutador y todas las rutas del mapa de la sección 3, cada una con una página vacía que solo muestre su título.
2. Crear `AuthLayout` y `AppLayout` con el menú lateral según el rol activo.
3. Crear `session.store`, `RutaProtegida` y `lib/permisos.ts`.
4. Para esta tarea, usar usuarios de prueba (uno por rol) en lugar de la conexión real con Supabase.

**Resultado esperado:** iniciar sesión con cada usuario de prueba lleva a la página de inicio de su rol, el menú muestra solo sus opciones, y escribir en la barra de direcciones una ruta de otro rol lleva a `/sin-acceso`. Cuando esto se confirme, se hace el commit y se pasa a llenar las páginas una por una, en el orden de los sprints.
