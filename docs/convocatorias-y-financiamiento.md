# Convocatorias y financiamiento

Las solicitudes de recursos institucionales requieren una convocatoria publicada, dentro de su intervalo de recepción y compatible con la facultad del grupo del solicitante, su vínculo académico y el tipo de trámite. El aval académico sin dinero se puede radicar sin convocatoria. Postularse no implica adjudicación de recursos.

## Uso

1. El administrador abre **Convocatorias** y asigna un responsable activo a una facultad o área, con cargo de decano o líder de investigación. Esta responsabilidad es independiente del rol general de líder de grupo. Se puede retirar desde la misma pantalla.
2. El responsable crea y edita el borrador: descripción y requisitos, fechas en hora de Colombia, tipos de trámite admitidos, destinatarios y tope opcional por solicitud.
3. Publica mediante el diálogo de confirmación. La recepción comienza en la fecha indicada y termina automáticamente al llegar al cierre. Puede cerrar anticipadamente o cancelar con motivo escrito. Las condiciones de una convocatoria publicada quedan fijas.
4. Los estudiantes consultan los anuncios desde **Mis solicitudes** o **Convocatorias**, abren el detalle y seleccionan **Postularme**. Un borrador recuperado conserva sus datos; la convocatoria se puede elegir en el paso de datos generales.
5. En el formulario eligen **Solo aval académico** (monto cero) o **Aval académico con financiamiento** (monto positivo y convocatoria compatible). Si la convocatoria cierra, el borrador y sus documentos se conservan.

La facultad se toma de los grupos activos del catálogo. El área del solicitante se acredita con su grupo registrado en el perfil, no con un grupo arbitrario del formulario. Los destinatarios se comprueban con el vínculo académico del perfil: estudiante/monitor o docente/profesor. Los requisitos específicos de la convocatoria se publican en su descripción; los documentos obligatorios siguen siendo los definidos por el catálogo del trámite.

Los anuncios, el listado para investigadores y el enlace de postulación se filtran
por el grupo activo del perfil y su vínculo académico. En el formulario, el grupo
seleccionado debe ser exactamente el asignado al perfil, incluso si otro grupo
pertenece a la misma facultad. El selector de financiamiento no ofrece opciones
cuando falta esa vinculación o el borrador usa otro grupo. El motivo se explica
antes de cargar documentos y se vuelve a validar antes de radicar. Los borradores
conservan sus datos y permiten corregir la selección o elegir solo aval académico.
Los administradores y responsables conservan la consulta de las convocatorias
que administran. Las convocatorias se definen por facultad o área; no son
exclusivas de un único grupo de esa facultad.

## Integridad y persistencia

- Supabase comprueba las reglas al radicar y registra solicitud, convocatoria, monto y auditoría en una transacción.
- La recepción se coordina con los cambios de estado mediante bloqueo de la convocatoria. Se usan fechas del servidor y cierre exclusivo: al alcanzar la hora de cierre no se reciben más solicitudes.
- Las solicitudes ya radicadas siguen su flujo después del cierre. Reintentar una radicación confirmada recupera el mismo expediente incluso si la convocatoria cerró.
- El monto y la convocatoria quedan inmutables después de radicar. No se convierten avales académicos en solicitudes económicas por edición.
- Las solicitudes históricas mantienen sus montos sin exigir una convocatoria retroactiva.
- Borradores de convocatorias y eventos solo son consultables por responsables del área y administradores. Las convocatorias publicadas se pueden consultar desde perfiles activos.
- Los clientes no pueden escribir directamente convocatorias ni sus eventos. El financiamiento no tiene un guardado local alternativo.

## Verificación e instalación

Migración: `20261114000003_funding_calls.sql`.

```sh
node supabase/tests/funding-calls-db.mjs
node supabase/tests/funding-calls-db.mjs --apply
npm run lint
npm test
npm run build
```

El comprobador valida que la base de datos pertenezca al proyecto configurado. Sin `--apply`, revierte los cambios. Las pruebas cubren permisos, borradores, ausencia de convocatoria, área, tope, radicación vinculada, inmutabilidad, cierre, reintentos y aval académico. Las pruebas del cliente cubren límites de fechas, destinatarios y bloqueo del financiamiento sin conexión.

Esta entrega no administra adjudicación, reservas de presupuesto ni ejecución financiera. Los archivos de términos y condiciones específicos se pueden incorporar en una ampliación del módulo; actualmente se describen los requisitos en la convocatoria y se conservan las cargas documentales del trámite.
