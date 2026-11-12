# Cola de validación documental

La bandeja atiende las solicitudes por fecha de radicación ascendente (`created_at`), con UUID como desempate estable. El expediente abierto es siempre el primero de la cola. La búsqueda filtra la lista sin cambiar el turno en atención.

Cada documento guarda su dictamen en Supabase. La vista muestra «Validado» al confirmarse el guardado, el avance de los requisitos obligatorios y los documentos que faltan por dictaminar. Las acciones quedan bloqueadas mientras se guarda y no se permite finalizar con documentos obligatorios adjuntos aún pendientes de dictamen.

Al finalizar, `finalize_documentary_validation` consulta los requisitos y documentos reales, bloquea el expediente y sus documentos durante la operación y determina el resultado:

- Documentación conforme: pasa a revisión técnica.
- Requisitos subsanables faltantes o rechazados: espera correcciones del investigador.
- Requisitos esenciales no subsanables faltantes o rechazados: rechazo.

El cambio de estado y el cierre documental se guardan en la misma transacción. El cierre se registra en la bitácora inmutable como `VALIDACION_DOCUMENTAL_FINALIZADA`, con las versiones documentales atendidas. La RPC no recibe el estado objetivo ni el responsable desde el navegador; utiliza los datos y la identidad autenticada de Supabase.

Tras una respuesta confirmada, la vista retira el expediente de la cola activa, abre el siguiente y conserva un mensaje con el radicado atendido y el resultado. Si falla el guardado, mantiene el expediente en atención y muestra el error. Cuando se termina el último, presenta una cola vacía sin volver a mostrar solicitudes que ya avanzaron.

Las solicitudes que esperan correcciones se cuentan por separado y no bloquean otras radicaciones. Regresan cuando cambia una versión documental; conservan su antigüedad original. Validar individualmente la corrección no retira el expediente antes de pulsar «Finalizar». El cierre de una nueva ronda queda registrado incluso si el estado sigue siendo pendiente de documentos. Reintentar la misma ronda no duplica el cierre. Estas reglas se conservan al recargar porque dependen de Supabase, no de una lista local de expedientes descartados.

Migración: `supabase/migrations/20261111000005_finalize_documentary_validation.sql`.

Comprobaciones:

```text
npm run lint
npm test
npm run build
psql "$DATABASE_TEST_URL" -v ON_ERROR_STOP=1 -f supabase/tests/documentary_validation_queue.sql
```

La prueba SQL crea sus datos de prueba dentro de una transacción y los revierte. Verifica permisos, documentos pendientes, resultados persistentes, reintentos, rondas de subsanación, protección del cierre contra escrituras del cliente y notificaciones por cambios de estado. Las pruebas de cliente cubren el orden FIFO, avance y vaciado de la cola, dictámenes guardados, errores de la RPC y reconstrucción desde Supabase tras recargar.

La migración fue aplicada y la prueba SQL aprobada en el Supabase configurado el 11 de noviembre de 2026.

Referencia: [bloqueos de fila de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).
