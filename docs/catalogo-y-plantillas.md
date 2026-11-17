# Catálogo institucional y plantillas

El administrador gestiona los tipos de trámite y sus requisitos desde **Catálogo institucional**. Se mantienen los seis roles existentes.

## Uso

1. Cree o edite un tipo de trámite: código único, nombre, descripción, orden y necesidad de comité.
2. Cree o edite sus requisitos: obligatoriedad, posibilidad de subsanar, plazo, formatos y tamaño máximo.
3. En **Editar requisito → Plantilla documental opcional**, adjunte un PDF, Word DOCX o Excel XLSX de hasta 10 MB. El botón Guardar confirma tanto la carga como el registro en Supabase. Los errores conservan el formulario.
4. Para reemplazar la plantilla, adjunte otro archivo. Para retirarla, pulse **Retirar plantilla al guardar** y guarde. La ficha muestra el nombre, versión y fecha de actualización.
5. El investigador descarga el archivo real desde **Nueva solicitud → requisitos**, mediante **Descargar plantilla**. Los Excel y Word son editables; el documento diligenciado debe exportarse al formato de entrega que admita el requisito, por ejemplo PDF.

Los botones de eliminar, activar o desactivar solicitan confirmación. El backend comprueba el permiso de administrador y solo después de confirmar el cambio se actualiza la interfaz.

## Eliminación y expedientes existentes

- Un tipo sin solicitudes ni convocatorias vinculadas se elimina con sus requisitos.
- Si tiene solicitudes o convocatorias vinculadas, se desactiva. Los expedientes continúan disponibles.
- Un requisito de un tipo utilizado por solicitudes se archiva. Desaparece de las nuevas solicitudes y se conserva en las anteriores.
- Cada radicación conserva una copia del tipo de trámite y sus requisitos: nombres, obligatoriedad, subsanabilidad, formatos, límites y referencia a la versión de plantilla. La validación, subsanación y revisión utilizan esas condiciones congeladas.
- La migración crea esa copia para los expedientes anteriores utilizando el catálogo disponible al instalarse; no reconstruye cambios anteriores que nunca se registraron.
- Los archivos de plantilla se guardan con claves únicas en un bucket privado. Las versiones publicadas no se sobrescriben ni se eliminan desde el cliente. Retirar la referencia del catálogo no destruye la versión histórica.
- `catalog_events` registra las operaciones de administración y conserva el estado anterior. Las escrituras directas del cliente al catálogo están revocadas.

## Modelos base incluidos

| Trámite | Archivos editables |
| --- | --- |
| Presentación de proyecto | Propuesta técnica DOCX y presupuesto con cronograma XLSX |
| Modificación presupuestal | Justificación DOCX y cuadro comparativo de rubros XLSX |
| Prórroga | Solicitud justificada DOCX y cronograma actualizado XLSX |
| Informe de avance | Informe técnico y financiero DOCX |
| Informe final | Informe de investigación con tabla de productos y evidencias DOCX |

Son ocho modelos base versión 1, pendientes de validación institucional. No sustituyen avales, certificados ni otros documentos expedidos por autoridades. El administrador puede reemplazarlos por formatos oficiales.

Los originales reproducibles están en `public/templates/catalog`; el manifiesto de asociación y sus constructores están en `scripts/catalog-templates`. Los modelos de referencia son genéricos y forman parte del repositorio; las cargas de administradores se sirven mediante Storage autenticado.

## Instalación y comprobación

Con las variables locales del mismo proyecto Supabase:

```sh
node supabase/tests/catalog-templates-db.mjs
node supabase/tests/catalog-templates-db.mjs --apply
node supabase/tests/install-catalog-templates.mjs
node supabase/tests/private-document-files-db.mjs --installed
npm run lint
npm test
npm run build
```

El instalador crea una identidad temporal de mantenimiento, carga los archivos, descarga y compara sus hashes, transfiere la propiedad a un administrador activo y elimina la identidad temporal. No reemplaza plantillas personalizadas. Retira únicamente los dos enlaces de ejemplo identificados por UUID y ruta exactos si sus archivos no existen.

Los DOCX se verificaron visualmente mediante exportación a PDF con Word y rasterización con Poppler, porque LibreOffice no está instalado en este equipo. Las hojas se renderizaron con Artifact Tool y se verificaron sus fórmulas de cálculo.
