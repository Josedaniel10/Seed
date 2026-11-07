# Seed: plan de corrección y estabilización (sprint 7)

Nov 7, 2026 · @José

Los sprints 0 a 6 están terminados, pero Seed todavía no se comporta como un producto: el acceso usa datos locales, los menús están incompletos y la interfaz se rompe en varias pantallas. Este plan agrega un sprint 7 de 32 tareas para corregirlo, con el mismo método de siempre: una tarea, una verificación, un commit.

## 1. Diagnóstico

Sale de lo que reportaste y de una sola captura (la del investigador); no he visto el código. Por eso la primera tarea de cada bloque es comprobarlo en el repositorio.

| # | Problema | Evidencia | Causa probable | Prioridad |
| --- | --- | --- | --- | --- |
| 1 | El inicio de sesión usa datos locales, no Supabase | Lo reportado | Se dejó una capa de datos de prueba en vez de conectar Supabase Auth y la base de datos | Crítica |
| 2 | El menú lateral de casi todos los roles muestra 2 páginas o menos | Lo reportado | Faltan páginas o el menú no sigue el mapa de la guía de páginas, roles y flujos | Alta |
| 3 | Contenido que se sale de su contenedor | En la captura: la tabla tiene barra de desplazamiento horizontal, y el botón “Nueva solicitud” y los filtros quedan cortados en el borde derecho | Anchos fijos, falta de `min-w-0` en flex y grid, y de contenedores con ancho máximo | Alta |
| 4 | No está adaptada a móvil | Lo reportado | Tablas y menú lateral pensados solo para escritorio | Alta |
| 5 | Crear una solicitud es difícil | Lo reportado | Asistente largo y sin guía de qué falta | Alta |
| 6 | Demasiados componentes en pantalla | Lo reportado | Pantallas con muchos filtros, columnas y acciones a la vez | Media |
| 7 | Detalles de interfaz | En la captura: el título lleva mayúscula en cada palabra (“Mis Solicitudes de Investigación”), cada fila repite “Radicado” bajo la columna “Radicado”, el tipo de solicitud aparece cortado (“Presentación de Proyecto de Investig…”), la etiqueta “MENÚ DEL ROL (INVESTIGADOR)” repite lo que ya dice el selector de rol y el texto del estado es muy pequeño | Baja |  |

Sobre el punto 2: en la guía, el investigador tiene solo dos opciones (Mis solicitudes y Nueva solicitud), así que ese menú es correcto. El problema está en los demás roles, que deberían tener entre 3 y 5 opciones.

## 2. Orden de trabajo

1. **Acceso real con Supabase:** cambia de dónde salen los datos, así que va primero.
2. **Menús y páginas por rol:** con datos reales ya se pueden completar.
3. **Estilos y diseño móvil:** se corrigen sobre pantallas que ya existen.
4. **Experiencia de uso:** se simplifican las pantallas y la creación de solicitudes.
5. **Cierre:** pruebas, accesibilidad, nombres en inglés y documentación.

## 3. Especificaciones

### 3.1 Autenticación real con Supabase

- **Registro:** `supabase.auth.signUp`. Un trigger en la base de datos crea la fila en `users` y asigna el rol `researcher` en `user_roles`.
- **Inicio de sesión:** `signInWithPassword`. La sesión persiste al recargar, y `onAuthStateChange` mantiene actualizado `session.store`.
- **Roles:** se leen de `user_roles` después de iniciar sesión. El navegador nunca es la fuente de verdad de los roles.
- **Rutas:** `ProtectedRoute` decide con los roles reales: sin sesión va a `/login`; con otro rol, a `/no-access`.
- **Datos:** toda consulta pasa por Supabase con el token del usuario, y las políticas RLS deciden qué ve cada rol.
- **Sin modo local:** se elimina el código de usuarios y datos de prueba.
- **Datos de demostración:** una cuenta real por rol, creada con un script que usa la clave de servicio de Supabase. Esa clave solo vive en el script local: nunca en el frontend ni en el repositorio.
- **Confirmación de correo:** decidir si se exige. Para la demostración se puede desactivar en la configuración de Auth.

### 3.2 Menú lateral por rol

Cada opción debe abrir una página funcional, no un marcador vacío. Las notificaciones y el perfil viven en la cabecera.

| Rol | Opciones del menú | Página de inicio |
| --- | --- | --- |
| Investigador | Mis solicitudes · Nueva solicitud | `/my-requests` |
| Administrativo | Validación · Panel | `/validation` |
| Integrante del comité | Mis revisiones · Sesiones · Actas | `/reviews` |
| Secretario(a) | Panel · Asignaciones · Sesiones · Actas · Reportes | `/dashboard` |
| Líder | Panel · Actas · Reportes | `/dashboard` |
| Administrador | Usuarios · Grupos · Catálogo | `/admin/users` |

La etiqueta “MENÚ DEL ROL (…)” se elimina: el selector de rol de la cabecera ya indica con qué rol se está trabajando.

### 3.3 Reglas de diseño y adaptación a móvil

- Diseñar primero para móvil (360 px) y ampliar con los puntos de quiebre de Tailwind.
- Sin anchos fijos en píxeles en contenedores: usar `w-full`, `max-w-*`, flex y grid.
- Todo hijo de flex o grid que lleve texto largo lleva `min-w-0` y `truncate` o salto de línea.
- La página nunca tiene desplazamiento horizontal. Solo una tabla puede desplazarse, y dentro de su propio contenedor.
- Un solo componente de botón, de campo y de selector, con variantes y tamaños fijos. Los botones no se salen de su contenedor (`whitespace-nowrap` o ancho completo en móvil) y tienen una zona táctil mínima de 44 px.
- Las tablas se muestran como tarjetas en móvil.
- El menú lateral es fijo en escritorio y un cajón con botón de hamburguesa en móvil.
- Texto de interfaz con mayúscula solo inicial y tamaño mínimo de 12 px (14 px para texto de lectura).
- Antes de pedir confirmación de una tarea visual, revisarla a 360, 768, 1024 y 1440 px.

### 3.4 Asistente de radicación en 3 pasos

1. **Tipo:** tarjetas con el nombre, una frase sobre para qué sirve y “N documentos requeridos”. Un buscador si hay más de 6 tipos.
2. **Información y documentos:** solo los campos indispensables (título, proyecto relacionado y resumen breve). Debajo, la lista de documentos: cada uno con su nombre, la etiqueta Obligatorio o Condicional, la plantilla descargable y un cargador. Un contador (“3 de 5 documentos”) muestra lo que falta.
3. **Revisar y enviar:** resumen de todo y un solo botón, “Enviar solicitud”.

Reglas: el avance se guarda en el navegador hasta enviar, los errores salen junto al campo y, en móvil, la barra de acciones queda fija abajo. Al enviar se muestra el número de radicado, qué sigue y un enlace a la solicitud.

### 3.5 Menos carga en pantalla

- Una acción principal visible por pantalla.
- Listas con máximo 5 columnas en escritorio, y los filtros avanzados plegados detrás de un botón “Filtros”.
- No repetir información: en la columna “Radicado” basta con “2026-005”.
- El panel muestra la tabla por defecto en móvil; el Kanban es solo para escritorio.
- Todas las listas tienen estado de carga, vacío y error.

## 4. Tareas del sprint 7

Cada tarea sigue el ciclo: implementar solo esa tarea, probarla, detenerse y mostrar cómo verificarla, esperar la confirmación y hacer el commit.

### Bloque A: acceso real

| ID | Tarea | Resultado esperado y prueba |
| --- | --- | --- |
| T7.1 | Auditar el código: listar dónde se usan usuarios, sesión o datos locales de prueba | Lista escrita con archivo y función de cada uso, sin cambios de código (commit `docs`) |
| T7.2 | Verificar la conexión con Supabase y las variables de entorno | Una consulta autenticada responde desde la interfaz; no hay claves privadas en el frontend |
| T7.3 | Registro real con Supabase Auth, perfil y rol `researcher` automático | Un usuario nuevo aparece en Auth, en `users` y en `user_roles` con el rol `researcher` |
| T7.4 | Inicio y cierre de sesión reales | La sesión persiste al recargar y se limpia al cerrar; credenciales incorrectas muestran un mensaje en español |
| T7.5 | Roles reales desde `user_roles` en `session.store` y `RoleSwitcher` | Un usuario con dos roles puede cambiar de rol y el menú cambia |
| T7.6 | `ProtectedRoute` con roles reales | Sin sesión redirige a `/login`; con otro rol, a `/no-access` |
| T7.7 | Políticas RLS por rol en las tablas principales | Prueba SQL: cada rol ve y modifica solo lo que le corresponde |
| T7.8 | Cuentas de demostración reales, una por rol, y primer administrador | Se puede iniciar sesión con cada una y se llega a su página de inicio |
| T7.9 | Reemplazar los datos locales por consultas a Supabase con TanStack Query | Una solicitud creada por un usuario se ve desde otro usuario autorizado, en otro navegador |
| T7.10 | Eliminar el modo local y el código de usuarios de prueba | La aplicación compila y las pruebas pasan sin ese código |

### Bloque B: menús y páginas por rol

| ID | Tarea | Resultado esperado y prueba |
| --- | --- | --- |
| T7.11 | Comparar las rutas implementadas con el mapa de las 19 páginas | Tabla de rutas existentes y faltantes, sin cambios de código (commit `docs`) |
| T7.12 | Menú lateral completo por rol | Cada rol muestra exactamente las opciones de la sección 3.2 |
| T7.13 | Crear cada página que falte, una tarea y un commit por página | Cada opción del menú abre una página funcional, no un marcador vacío |

### Bloque C: estilos y diseño móvil

| ID | Tarea | Resultado esperado y prueba |
| --- | --- | --- |
| T7.14 | Contenedor de página y reglas de ancho (ancho máximo, `min-w-0`, sin anchos fijos) | Ninguna página tiene desplazamiento horizontal a 1024 y 1440 px |
| T7.15 | Componentes `Button`, `TextField` y `SelectField` unificados | Los botones no se salen de su contenedor y tienen tamaños y estados consistentes |
| T7.16 | Cabecera y menú adaptables, con cajón y hamburguesa en móvil | A 360 px el menú se abre y se cierra, y no tapa el contenido |
| T7.17 | `DataTable` con tarjetas en móvil y columnas esenciales en escritorio | A 360 px cada fila es una tarjeta legible y sin desplazamiento horizontal |
| T7.18 | Formularios y filtros apilados en móvil, con filtros avanzados plegables | Los filtros caben en pantalla a 360 px |
| T7.19 | Tipografía y jerarquía: tamaños mínimos, mayúscula solo inicial y estados legibles | Los títulos y etiquetas siguen las reglas de la sección 3.3 |
| T7.20 | Revisión visual de cada área (investigador, gestión, comité, administración) a 360, 768, 1024 y 1440 px | Lista de verificación completa por pantalla; un commit por área |

### Bloque D: experiencia de uso

| ID | Tarea | Resultado esperado y prueba |
| --- | --- | --- |
| T7.21 | Rediseño del asistente de radicación en 3 pasos | Una solicitud se radica en 3 pasos, también desde el celular |
| T7.22 | Guardar el avance del formulario hasta enviar | Recargar la página no pierde lo escrito |
| T7.23 | Cargador de documentos simplificado: arrastrar varios archivos y ver cuáles faltan | Se ve “3 de 5 documentos” y el botón de enviar se habilita al completar |
| T7.24 | Confirmación clara después de radicar | Muestra el número de radicado, qué sigue y un enlace a la solicitud |
| T7.25 | Simplificar “Mis solicitudes”: columnas esenciales y “Qué falta” destacado | La lista cabe sin desplazamiento y la acción pendiente se ve de inmediato |
| T7.26 | Simplificar el panel y las bandejas: una acción principal por pantalla | Cada pantalla tiene una acción principal clara y menos elementos |
| T7.27 | Estados de carga, vacío y error en todas las listas | Cada lista muestra los tres estados correctamente |
| T7.28 | Mensajes de error y ayudas en español, sin información técnica | Ningún mensaje muestra IDs, JSON ni errores crudos |

### Bloque E: cierre

| ID | Tarea | Resultado esperado y prueba |
| --- | --- | --- |
| T7.29 | Renombrar al inglés los identificadores en español y unificar `applications` con `requests`, si siguen pendientes | No quedan nombres en español en el código; la aplicación compila y las pruebas pasan |
| T7.30 | Pruebas de humo por rol: iniciar sesión, ver el menú y crear una solicitud | Un guion paso a paso pasa para cada rol |
| T7.31 | Revisión de accesibilidad: teclado y contraste | Se puede usar el sistema solo con teclado y el contraste cumple WCAG AA |
| T7.32 | Actualizar la documentación (estado y capturas) y crear la etiqueta `v1.0` | La documentación refleja el sistema real y existe la etiqueta |

## 5. Criterios de aceptación del sprint

- Todos los roles inician sesión con cuentas reales de Supabase, y no queda código de usuarios locales.
- Cada rol ve todas las opciones de su menú, y cada una abre una página funcional.
- No hay desplazamiento horizontal de la página a 360, 768, 1024 y 1440 px.
- Radicar una solicitud toma 3 pasos y se puede hacer desde el celular.
- Todas las pruebas pasan y existe la etiqueta `v1.0`.

## 6. Mensaje para el agente

> Lee este documento completo. Trabaja el sprint 7 tarea por tarea, en orden. En cada tarea: haz solo lo que pide, pruébala (y revísala a 360, 768, 1024 y 1440 px cuando sea visual), detente, muéstrame cómo verificarla y espera mi confirmación antes de hacer el commit. Empieza por T7.1, que es solo una auditoría sin cambios de código. Todo el código en inglés y los textos de la interfaz en español.
