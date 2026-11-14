# Borradores recuperables

Esta etapa incorpora guardado automático y recuperación de formularios **en el mismo navegador**, mediante `localStorage`. La interfaz muestra dónde está guardado el borrador y la fecha del último guardado. No hay sincronización entre dispositivos ni publicación automática de solicitudes, observaciones o conceptos.

## Nueva solicitud

Se conservan el paso actual, el tipo de trámite, los datos generales, el identificador de envío y las referencias de los archivos ya cargados en Supabase Storage. No se guardan archivos binarios ni documentos en base64.

Al regresar a Nueva solicitud se recupera el formulario de la cuenta autenticada. El tipo de trámite y el grupo guardados no se sustituyen silenciosamente si dejan de estar disponibles. Antes de radicar se vuelven a comprobar los datos, el catálogo y los requisitos obligatorios actuales; el servidor valida los originales y permisos como antes.

El mismo identificador de envío se conserva después de un fallo o una recarga. Así, si una radicación fue aceptada por el servidor pero su respuesta no llegó al navegador, el reintento conserva la idempotencia existente. El borrador se limpia tras confirmar la radicación exitosa.

## Evaluación técnica

Cada formulario tiene su propio borrador por usuario, expediente y asignación. Se conservan la categoría y el texto de la observación, el sentido del concepto y su justificación. Abrir otra revisión no mezcla los textos. Las revisiones visitadas permanecen montadas mientras la pantalla siga abierta, aunque se contraigan.

La recuperación también compara los documentos mediante sus identificadores, hashes y fechas de carga. Si cambiaron, no aplica automáticamente el concepto anterior: ofrece recuperar el borrador con una advertencia de que debe revisarse frente a los documentos actuales. Una nueva asignación utiliza otro borrador.

Registrar una observación limpia solo el texto efectivamente enviado; conserva el concepto y cualquier edición nueva realizada mientras se guardaba. Los errores mantienen el contenido. Emitir un concepto exitosamente limpia su borrador. Si queda una observación sin registrar, la confirmación advierte que se descartará al finalizar la revisión.

## Guardado y recuperación

- Guardado automático tras 500 ms sin cambios.
- Intento de guardado inmediato al salir de la pantalla, ocultar la pestaña o cerrar/recargar la página.
- Aviso de recuperación y último guardado en hora de Colombia.
- Descarte explícito mediante el diálogo de confirmación compartido.
- Validación de versión, identidad y estructura de los datos antes de recuperar.
- Detección de cambios desde otra pestaña y comprobación de la versión guardada antes de escribir. Ante un conflicto, se conserva el texto visible y se ofrece recuperar la versión guardada o reemplazarla explícitamente por la actual.
- Si el almacenamiento falla, se mantiene el texto mientras el formulario permanezca abierto, se muestra el error y se ofrece reintentar. Si sigue sin guardarse, se solicita la advertencia nativa del navegador al cerrar o recargar, cuando el navegador lo permita.

`localStorage` no proporciona transacciones entre pestañas: la detección de versiones reduce las sobrescrituras accidentales, pero no constituye un bloqueo transaccional. Si el almacenamiento está bloqueado y se abandona la pantalla, no se puede garantizar la recuperación. Un cierre abrupto antes del guardado tampoco puede garantizar los últimos cambios.

## Alcance de privacidad

La aplicación utiliza claves separadas por cuenta y formulario y reinicia el formulario al cambiar de usuario. Los borradores permanecen en ese perfil de navegador después de cerrar sesión para permitir retomarlos con la misma cuenta. No están cifrados: son datos locales del dispositivo, no un mecanismo de autorización del backend. Pueden eliminarse con Descartar borrador o borrando los datos del sitio. La persistencia privada en servidor para recuperación entre dispositivos queda pendiente.

## Implementación y pruebas

- `src/features/drafts/localDraft.ts`: almacenamiento, validación, conflictos y ciclo de vida.
- `src/features/drafts/useLocalDraft.ts`: sincronización con React y eventos del navegador.
- `src/features/drafts/DraftNotice.tsx`: estado, recuperación y descarte confirmado.
- `src/features/requests/RequestSubmissionWizard.tsx`: borrador de radicación.
- `src/features/validation/TechnicalReviewWorkspace.tsx`: borradores de revisión separados por expediente y asignación.

Las pruebas cubren recuperación, aislamiento entre usuarios y expedientes, documentos nuevos, conflictos entre pestañas, datos inválidos, almacenamiento bloqueado, reintentos, conservación del identificador de radicación y limpieza posterior al envío. Se verifican además las interacciones reales de formularios y diálogos mediante React y jsdom.

```text
npm run lint
npm test
npm run build
```
