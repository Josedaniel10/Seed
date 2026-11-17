# Cambio temporal entre cuentas reales

En desarrollo (`npm run dev`) está activo por defecto. En cualquier pantalla,
presiona **Ctrl + Shift + .** (la tecla de punto, también en teclado español).
No añade controles a la navegación. Escape o Cerrar descartan el modal.

Selecciona una de las seis cuentas y escribe su contraseña real la primera vez.
Después aparece como **Preparada** y basta seleccionarla y pulsar Cambiar cuenta.
Prepara las cuentas antes de empezar la exposición. No hay contraseñas comunes
implícitas ni credenciales incluidas en el código.

Las sesiones adicionales solo permanecen en memoria hasta recargar/cerrar la
página o cerrar sesión. La cuenta activa conserva el comportamiento habitual
de Supabase. Los tokens se actualizan cuando se renuevan y cada activación
vuelve a consultar el perfil activo y sus roles. No se otorgan permisos nuevos.

Guarda formularios antes de cambiar. Se impide cambiar mientras haya escrituras
de Supabase o mutaciones detectadas en curso. Al cambiar se desmonta la pantalla,
se limpian las consultas y los datos en memoria, se descartan lecturas anteriores
y se cargan los datos permitidos para la nueva cuenta. La navegación lleva al
inicio de su rol. Los borradores locales existentes siguen ligados a su usuario.

Los cambios guardados son reales y permanecen en Supabase. Desactivar el modo
presentación no elimina ni revierte esos cambios. La recarga al alternar cuentas
no sustituye la sincronización en tiempo real de cada módulo entre dispositivos.

## Activar o retirar

- Desarrollo: disponible por defecto; `VITE_PRESENTATION_MODE=false` lo desactiva.
- Build publicado: desactivado por defecto. Para una presentación habilitada,
  configura `VITE_PRESENTATION_MODE=true` antes de compilar. Cada cuenta sigue
  requiriendo sus credenciales reales; el atajo no es una autorización.
- Después de presentar: establece `VITE_PRESENTATION_MODE=false` y reinicia Vite,
  o vuelve a compilar y publicar si lo habilitaste en un build.

El atajo no coincide con otros atajos definidos en la aplicación. Extensiones
o atajos personalizados del sistema pueden interceptar cualquier combinación.
