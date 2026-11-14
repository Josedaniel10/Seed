# Archivos documentales reales

La radicación y la subsanación cargan los originales en el bucket privado `documents` de Supabase Storage. Los metadatos guardan una clave de objeto, nunca un enlace público ni el contenido en base64. Cada carga utiliza una ruta nueva: `<usuario>/<UUID>/<nombre>`, sin sobrescribir archivos existentes.

## Consulta

`DocumentFileActions` ofrece **Ver PDF** y **Descargar original** en Mis revisiones, Validación documental y Documentos del expediente. Word se descarga para consultarlo con una aplicación compatible. El PDF se muestra en un diálogo de solo lectura; si el navegador no lo admite, se ofrece la descarga como alternativa.

Cada lectura pasa por la sesión autenticada y las políticas de Storage. Antes de presentar el archivo, el cliente compara su tamaño y SHA-256 con el documento registrado. Los blobs de vista previa se liberan al cerrar o desmontar el componente. Se requiere HTTPS o localhost para Web Crypto.

Las URLs públicas históricas del mismo proyecto se convierten en claves de objeto y se descargan por la API autenticada. Nunca se abre directamente una URL guardada. Las rutas de ejemplo `file-service/storage/...`, archivos inexistentes y versiones que no coinciden muestran un error; no se fabrican PDFs de reemplazo. Los archivos que solo existan localmente requieren una migración de sus bytes o una nueva carga.

## Permisos

- Propietario activo: consulta sus documentos.
- Evaluador activo: consulta los expedientes con asignación activa, sin conflicto por autoría o grupo.
- Integrante del comité: también puede consultar los puntos de una agenda cerrada mientras la sesión siga abierta, excluyendo los mismos conflictos.
- Secretaría, personal administrativo y administrador: conservan el acceso documental autorizado por el backend.
- Líder: consulta documentos de los grupos que dirige.
- Cuentas inactivas y usuarios anónimos: sin acceso.

Retirar una asignación bloquea las lecturas posteriores, salvo que exista otro permiso válido. Un archivo ya descargado no se puede retirar del equipo del usuario. Las políticas restrictivas de Storage impiden que una política permisiva antigua vuelva a habilitar lecturas generales, cargas en carpetas ajenas, sobrescrituras o borrados del cliente.

## Subsanación

Primero se confirma la carga física y después se llama a `cure_application_document`. Esta operación comprueba identidad, propietario, estado, requisito subsanable, objeto existente, propiedad del objeto, MIME, tamaño y versión esperada. Actualiza el documento y su bitácora en la misma transacción; el navegador refleja el éxito después de recibir la confirmación.

El documento corregido vuelve a validación pendiente. La bitácora conserva los metadatos anteriores. Reintentar la misma carga no duplica la actuación; dos correcciones basadas en una versión antigua no pueden sobrescribirse silenciosamente. También se pueden adjuntar requisitos subsanables que faltaban en una solicitud pendiente por documentos.

Esta entrega conserva los originales anteriores, pero todavía no ofrece un explorador de versiones ni una política automática de limpieza de cargas abandonadas. La revisión comparada y las observaciones vinculadas a páginas/versiones son etapas posteriores.

## Migración y verificación

Migraciones: `supabase/migrations/20261113000001_private_document_files.sql` y `20261113000002_guard_document_correction_audit.sql`. La segunda impide que el cliente falsifique una actuación de subsanación en la bitácora.

Comprobaciones locales:

```text
npm run lint
npm test
npm run build
```

Con `DATABASE_URL` y `VITE_SUPABASE_URL` del mismo proyecto, el siguiente comando aplica temporalmente la migración y ejecuta las pruebas SQL, revirtiendo todos los cambios:

```text
node supabase/tests/private-document-files-db.mjs
```

Para instalar la migración verificada y registrarla en el historial de Supabase:

```text
node supabase/tests/private-document-files-db.mjs --apply
```

La instalación vuelve privado el bucket existente. Antes de desplegar en otra instancia, coordinar estas migraciones con la actualización del cliente. El runner aplica solo las migraciones documentales pendientes. Una vez instaladas, `node supabase/tests/private-document-files-db.mjs --installed` comprueba las reglas documentales y las regresiones de radicación, validación y comité; cada prueba revierte sus datos.

Referencias de la API utilizada: [control de acceso de Storage](https://supabase.com/docs/guides/storage/security/access-control) y [descarga autenticada](https://supabase.com/docs/reference/javascript/storage-from-download).
