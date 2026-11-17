# Identidad visual de convocatorias y solicitudes

La migración `supabase/migrations/20261117000001_visual_identity.sql` debe aplicarse a Supabase antes de publicar esta versión del frontend. Añade `icon_key` y `accent_color` a los tipos de solicitud y a las convocatorias, y `cover_image_path` a las convocatorias. También actualiza las funciones de guardado y crea el bucket privado `call-covers` con sus políticas.

Los tipos existentes conservan una identidad automática según el trámite. El administrador puede sustituirla con uno de los diez iconos y seis colores disponibles. El nombre del trámite siempre acompaña a su icono. Los expedientes conservan su catálogo histórico.

La portada es opcional: JPG, PNG o WebP, hasta 3 MB, con recorte horizontal de proporción 3:1. Se valida el formato y la firma del archivo antes de cargarlo. Las imágenes se cargan al guardar; las vistas previas locales liberan su URL al cambiar de archivo o cerrar el editor. Si una imagen falta o falla, se muestra el icono con su color.

El almacenamiento usa claves nuevas para cada imagen y enlaces firmados de una hora. Solo administradores y responsables de convocatorias pueden cargar portadas; la función de guardado comprueba la propiedad del objeto. Las portadas de borradores solo son consultables por su propietario y por quienes gestionan la convocatoria; las publicadas, por usuarios activos. Retirar una portada desvincula el archivo sin sobrescribir objetos existentes.

Validación: `npm run lint`, `npm test`, `npm run build`. La prueba `supabase/tests/visual_identity.sql` verifica persistencia, compatibilidad de ediciones antiguas, restricciones de iconos, propiedad de portadas, privacidad de borradores y acceso después de publicar. Se ejecuta con `psql -v ON_ERROR_STOP=1 -f supabase/tests/visual_identity.sql` contra una base de pruebas con todas las migraciones; sus datos se revierten al finalizar.
