# Notificaciones persistentes

La bandeja y el contador consultan `public.notifications` en Supabase. No hay datos de demostración, persistencia en localStorage ni simulación de correo. Los registros nuevos se generan mediante disparadores de PostgreSQL dentro de la misma transacción que modifica el trámite. Los registros anteriores a la migración no se convierten en avisos retroactivos.

## Activación

1. Aplicar las migraciones anteriores del repositorio si todavía no están instaladas.
2. Ejecutar `supabase/migrations/20261111000004_persist_notifications.sql` en el SQL Editor del proyecto, o mediante una conexión administrativa PostgreSQL. El archivo incluye su transacción y habilita la tabla en la publicación `supabase_realtime` cuando esta existe.
3. Comprobar en Database > Publications que `supabase_realtime` incluya `notifications`. Si Realtime no está disponible, la aplicación también actualiza la bandeja cada 30 segundos y al recuperar el foco o la conexión.
4. Iniciar sesión y ejecutar una operación real: radicar, cambiar de estado, asignar un evaluador o programar una sesión. Iniciar sesión como destinatario en otro navegador para comprobar el aviso y su enlace.

Para obtener una conexión administrativa: abrir **Connect > Session pooler** en el proyecto de Supabase y completar la contraseña en la cadena de conexión. Guardarla localmente como `DATABASE_URL` en `.env`, que está excluido de Git. Nunca usar el prefijo `VITE_` para esta variable.

Documentación de referencia: [conexión a PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Eventos

| Evento | Destinatario | Vista |
| --- | --- | --- |
| Radicación | Solicitante | Resumen de solicitud |
| Cambio de estado | Solicitante | Historial |
| Documento rechazado u observación de ajuste obligatorio | Solicitante | Documentos u observaciones |
| Evaluación asignada o retirada | Evaluador correspondiente | Solicitud |
| Evaluación entregada | Secretarías y administrativos activos | Historial de solicitud |
| Convocatoria | Participantes registrados en la sesión, aun sin confirmar asistencia | Sesión |
| Agenda cerrada, fecha o lugar modificados | Participantes de la sesión | Agenda |
| Ponencia asignada, cambiada o retirada | Ponentes correspondientes | Agenda |
| Decisión del comité, incluso aplazamiento | Solicitante | Historial con justificación |
| Constancia de no deliberación | Solicitante | Historial con motivo |
| Acta aprobada | Participantes que conservan un rol activo de comité o secretaría | Acta dentro de la sesión |

La decisión colegiada reemplaza el aviso genérico del mismo cambio de estado. Las operaciones sin cambios no generan avisos adicionales; un reintento de radicación con el mismo identificador tampoco. Una nueva asignación registrada es un nuevo evento, aunque corresponda al mismo evaluador. No se generan recordatorios programados ni se envían correos.

## Seguridad y sincronización

- RLS permite leer y actualizar solamente los registros de la cuenta autenticada y activa. Ni siquiera un administrador puede leer otra bandeja mediante la API.
- La única columna modificable por el cliente es `is_read`. Insertar, borrar, cambiar el destinatario o invocar el emisor de avisos está prohibido.
- Las funciones de disparador tienen `search_path` fijo y no se exponen como RPC públicas. Los destinatarios se resuelven en la base de datos.
- La caché de TanStack Query está identificada por UUID de usuario, se cancela y elimina al cambiar de cuenta y no se persiste. La lectura solo se refleja después de guardarse en Supabase.
- Realtime invalida las consultas del destinatario. El sondeo periódico recupera eventos perdidos por desconexión. Campana y bandeja comparten la misma consulta.
- Los enlaces se construyen desde identificadores y pestañas permitidas. Para sesiones, la aplicación puede activar otro rol autorizado de la misma cuenta; no concede roles nuevos. Los recursos retirados o inaccesibles muestran la respuesta de la vista correspondiente.

## Validación

```text
npm run lint
npm test
npm run build
psql "$DATABASE_TEST_URL" -v ON_ERROR_STOP=1 -f supabase/tests/notifications.sql
```

Las pruebas SQL deben ejecutarse en una base de pruebas con las migraciones aplicadas. Crean usuarios de prueba, ejercitan las RPC existentes y revierten los datos. Cubren bandejas separadas, usuarios anónimos e inactivos, lectura individual y masiva, prohibición de escrituras indebidas, reintentos de radicación, asignaciones, ponencias, convocatorias, decisiones, actas, ajustes, ausencia de quórum y reversión transaccional.

Las pruebas de cliente verifican consultas y actualizaciones a Supabase, paginación, errores, cachés por usuario y enlaces. La entrega en Realtime y la autenticación del proyecto remoto deben verificarse tras aplicar la migración en ese entorno.

Para repetir la prueba en vivo con `DATABASE_URL` y las variables públicas configuradas localmente:

```text
node supabase/tests/notifications-live.mjs
```

Esta prueba crea dos cuentas temporales sin enviar correos, comprueba inicio de sesión mediante Supabase Auth, entrega Realtime, aislamiento de la API y persistencia de lectura desde un cliente nuevo. Al terminar elimina las cuentas y sus avisos. Requiere una conexión administrativa al mismo proyecto que usa la aplicación.

Verificación realizada el 11 de noviembre de 2026: migración aplicada al proyecto configurado; pruebas SQL de notificaciones y prueba en vivo de Auth/API/Realtime aprobadas. También se ejecutaron las ocho suites SQL en PostgreSQL local y las comprobaciones de TypeScript, pruebas de cliente y compilación.
