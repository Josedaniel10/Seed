# Próxima acción y verificación de ajustes

## Dónde se utiliza

- **Mis solicitudes** muestra la siguiente acción, el responsable y el plazo registrado en cada fila y tarjeta móvil.
- **Detalle de solicitud** incluye una tarjeta con los pendientes concretos y un acceso contextual según el usuario y su rol activo.
- **Panel de seguimiento** utiliza el mismo cálculo para su texto de «Qué falta».
- **Detalle de solicitud → Observaciones y ajustes** permite al solicitante responder mientras el expediente permanece en revisión técnica.
- **Mis revisiones → expediente → Observaciones registradas** permite al evaluador asignado aceptar la respuesta o solicitar otra corrección con fundamento escrito.

## Reglas

1. Registrar una respuesta **no resuelve** la observación. Queda pendiente de verificación.
2. Solo el solicitante puede responder y solo el evaluador con asignación activa puede verificar. La autorización se comprueba en Supabase.
3. La devolución conserva la respuesta y el motivo. Una nueva respuesta vuelve a quedar pendiente de verificación.
4. Si la respuesta cambió desde que el evaluador la revisó, la verificación se rechaza. Debe actualizar el expediente y revisar la versión actual.
5. El concepto **Favorable** exige que los ajustes obligatorios estén aceptados. **Favorable con ajustes** mantiene su significado institucional y puede avanzar al comité con pendientes explícitos.
6. Observación, respuesta, aceptación o devolución se guardan junto con su evento de auditoría en una única transacción. La interfaz actualiza el resultado solo después de confirmar el guardado.
7. No se pueden escribir verificaciones directamente desde el cliente ni simular sus eventos de auditoría.
8. Los plazos mostrados pertenecen a la asignación del evaluador. No se utilizan como plazo del investigador ni se inventan fechas para las demás acciones.
9. Las respuestas antiguas que fueron marcadas automáticamente como resueltas se reabren si el expediente todavía está en revisión. Los expedientes finalizados conservan su registro histórico.

Las respuestas técnicas incluyen referencias a documentos, páginas o secciones del expediente. La carga de versiones documentales continúa en el flujo de subsanación documental. El seguimiento posterior a una **aprobación con ajustes del comité** requiere un flujo propio; esta entrega cubre la revisión técnica previa a comité.

## Comprobación para la presentación

1. Con secretaría, asigne un expediente en revisión a un evaluador.
2. Con el evaluador, abra **Mis revisiones** y registre un ajuste obligatorio.
3. Con el solicitante, abra el expediente y responda desde **Observaciones y ajustes**. Compruebe que continúa pendiente de verificación.
4. Con el evaluador, solicite otra corrección y escriba el motivo. El solicitante verá la devolución.
5. Envíe una nueva respuesta y acéptela desde el evaluador. Ahora podrá emitir **Favorable** sin ajustes.
6. Actualice la página y compruebe que respuesta, fundamento, fecha de verificación y auditoría persisten.

## Base de datos y pruebas

Migración: `20261114000001_verified_adjustments.sql`.

```sh
# Verifica la migración y las reglas con datos que se revierten.
node supabase/tests/verified-adjustments-db.mjs
# Instala y registra la migración en el proyecto Supabase configurado.
node supabase/tests/verified-adjustments-db.mjs --apply
npm run lint
npm test
npm run build
```

El comprobador valida que `DATABASE_URL` corresponda al proyecto de `VITE_SUPABASE_URL`. Los archivos `.env` no deben incorporarse al repositorio.
