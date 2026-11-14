# Confirmación de decisiones

Seed utiliza `src/components/ui/DecisionConfirmDialog.tsx` para presentar el destinatario de una decisión, su resumen y su consecuencia antes de guardar. Se construye sobre `Modal` y `ResponsiveOverlay`, con el mismo diseño adaptable que el resto de la aplicación.

El usuario vuelve al formulario con **Volver a revisar** o confirma con una acción explícita: **Emitir concepto técnico**, **Asignar evaluador**, **Registrar decisión**, etc. Los borradores y consultas ordinarias no necesitan esta confirmación.

## Integraciones

| Pantalla | Acciones |
| --- | --- |
| Mis revisiones | Emisión del concepto, con su justificación y efecto sobre el expediente. |
| Asignaciones | Asignación y reasignación, con evaluador anterior cuando corresponde, nuevo evaluador y fecha límite. |
| Validación documental | Rechazo de un documento y cierre de la validación, con resultado previsto según los dictámenes actuales. |
| Panel de seguimiento | Transiciones admitidas por el flujo, con estado actual, estado solicitado y justificación. |
| Detalle de sesión | Cierre de agenda, registro de decisión y finalización de sesión. |
| Constancias | Registro de un punto no deliberado, preservando el motivo. |
| Edición de actas | Aprobación con advertencia del bloqueo de edición. |
| Actas | Descarte de cambios sin guardar; cancelar conserva el formulario. |

## Guardado y errores

`useDecisionConfirmation` conserva una confirmación por pantalla. La operación se ejecuta únicamente al confirmar. Su controlador impide doble envío, sustitución de la decisión y cierre durante el guardado. El diálogo se cierra tras una respuesta exitosa; si falla, conserva el resumen y muestra el error para permitir reintentar o volver al formulario.

Los datos de la acción se capturan al abrir la confirmación. Cambiar de usuario o expediente descarta el diálogo anterior; una respuesta tardía de una acción antigua no puede cerrar una confirmación nueva. Las asignaciones, documentos y actas comprueban además que el estado local relevante no haya cambiado desde la revisión. El servidor conserva la autoridad sobre permisos y reglas de negocio.

El tablero usa el mismo diálogo, con sus campos de justificación dentro de él y bloqueo de envío concurrente. Las alertas `window.confirm` de actas y constancias se sustituyeron por esta interfaz.

## Regla de concepto no favorable

Esta entrega conserva la regla vigente: **un concepto técnico no favorable rechaza la solicitud**. La confirmación advierte expresamente ese resultado. La separación institucional entre recomendación técnica y decisión final debe definirse antes de cambiar esa transición.

## Comprobaciones

- Pruebas del controlador: cancelar sin escribir, doble clic, errores y reintentos, resumen conservado y respuestas tardías.
- Pruebas de interacción con React y jsdom: conceptos, asignaciones, cierre y rechazo documental, agenda, aprobación y descarte de actas y tablero.
- `npm run lint`, `npm test`, `npm run build`.

jsdom se incorpora como dependencia de desarrollo para comprobar eventos y formularios. Estas pruebas simulan el DOM; no sustituyen la revisión visual del diálogo y del gesto móvil en un navegador real.

## Mejoras siguientes

Esta etapa completa las confirmaciones. Continúan pendientes los borradores recuperables, orientación de próxima acción, seguimiento de ajustes obligatorios, correo y recordatorios programados, declaración de conflictos, criterios configurables, compromisos posteriores y comparación de subsanaciones. Los originales anteriores ya se conservan; la interfaz comparativa y la limpieza de cargas abandonadas son trabajos separados.
