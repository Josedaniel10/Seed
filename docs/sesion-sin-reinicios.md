# Comprobación de sesión sin reiniciar formularios

Al volver a una pestaña, Supabase puede emitir `SIGNED_IN` para confirmar la sesión existente. Seed activaba `isLoading` global ante ese evento y volvía a hacerlo en `initializeSession`. `RutaProtegida` sustituía entonces la página por la pantalla de carga, desmontando los formularios y reiniciando su estado local.

## Comportamiento corregido

- **Inicio sin identidad verificada:** se mantiene la pantalla de carga hasta consultar el perfil activo y sus roles.
- **Mismo usuario ya autenticado:** `INITIAL_SESSION`, `SIGNED_IN`, `USER_UPDATED` y `TOKEN_REFRESHED` comprueban el perfil en segundo plano. No activan la carga global ni desmontan la página.
- **Sesión sin cambios:** se conserva la referencia del usuario y su rol activo, mientras continúe autorizado.
- **Cambio de identidad:** se retira inmediatamente el acceso de la identidad anterior antes de cargar los permisos de la nueva.
- **Cierre de sesión, sesión ausente, perfil inactivo o denegación de permisos:** se limpia el acceso. Un rol retirado deja de autorizar la ruta correspondiente.

Las comprobaciones simultáneas de una misma etapa de sesión comparten la operación pendiente. Los cierres de sesión y cambios de identidad invalidan las respuestas anteriores y los eventos que todavía estén encolados; una consulta tardía no puede restaurar una identidad ya descartada. El cierre explícito retira el acceso local antes de esperar la respuesta de red.

## Conexión temporalmente interrumpida

Si falla temporalmente la consulta de perfil o la renovación de autenticación por un error de red, se conserva la página de la identidad que ya estaba verificada y se presenta un aviso con reintento. Los permisos y escrituras siguen comprobándose en el backend. Una sesión ausente, un perfil inactivo o una denegación de autorización no se tratan como errores temporales.

`SessionSyncNotice` muestra ese aviso sin sustituir el contenido de la página. `RutaProtegida` mantiene su comportamiento de protección: no se ha cambiado para permitir el acceso durante una carga inicial sin verificar.

## Borradores

Los [borradores recuperables](borradores-recuperables.md) continúan como protección ante recargas, cierres y navegación. La corrección de sesión permite conservar directamente los controles ya montados, su contenido y el cursor; no depende de recuperar un borrador para reconstruirlos. Se mantiene su alcance en el mismo navegador.

## Verificación

Las pruebas con React y jsdom recorren el listener real del store, consultas de perfil simuladas y `RutaProtegida`. Verifican identidad del nodo de formulario, texto y cursor durante la reconfirmación, carga inicial, agrupación de consultas, reintentos de red, perfiles inactivos, permisos retirados, sesiones expiradas, cambio de identidad y respuestas tardías después del cierre. También comprueban que el asistente real de nueva solicitud mantiene su paso y sus borradores.

```text
node --import tsx --test src/features/auth/__tests__/sessionRevalidation.test.js
npm run lint
npm test
npm run build
```

Comprobación manual sugerida: escribir en Nueva solicitud, pasar a otra pestaña y volver. Deben mantenerse el mismo paso y los campos sin mostrar la carga global de sesión. Cerrar realmente la sesión debe seguir retirando el acceso.
