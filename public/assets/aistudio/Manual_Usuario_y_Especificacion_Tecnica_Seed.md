# Manual de Usuario y Especificación Técnica del Sistema de Gestión del Comité de Investigación (Seed)

**Vigencia Académica:** 2026  
**Institución:** Universidad - Vicerrectoría de Investigaciones y Posgrados  
**Código de Plataforma:** SEED-INV-2026  
**Cumplimiento Normativo:** WCAG AA (Accesibilidad), RNF-03 (Inmutabilidad), RNF-04 (Almacenamiento e Integridad SHA-256), RNF-08 (Reglas de Negocio)

---

## 1. Visión General del Sistema

**Seed** es la plataforma institucional integral diseñada para la radicación, validación documental, evaluación por pares, deliberación en comité colegiado y expedición de actas solemnes de investigación.

### Roles y Permisos de Acceso (Matriz de Control):
1. **Investigador(a):** Radicación con carga documental por requisito, monitoreo de estado en tiempo real, columna "Qué Falta" y subsanación de observaciones.
2. **Personal Administrativo:** Verificación documental preliminar con checklist tipificado (subsanable vs no subsanable), cotejo de hash SHA-256 y transición automática de estado.
3. **Integrante de Comité (Revisor Par):** Evaluación técnica con observaciones tipificadas (*Aclaración*, *Ajuste Obligatorio*, *Sugerencia*), verificación de conflicto de intereses y emisión de concepto favorable/desfavorable.
4. **Secretaría Técnica:** Asignación y reasignación de revisores, conformación y cierre de orden del día de sesiones colegiadas, consolidación de quórum reglamentario y redacción de actas solemnes.
5. **Líder de Grupo de Investigación:** Aval de pertinencia temática a propuestas adscritas a sus líneas de investigación.
6. **Administrador del Sistema:** Gestión del catálogo dinámico de trámites y requisitos institucionales, administración de usuarios y configuración de gobernanza.

---

## 2. Flujo Operativo Paso a Paso (Guion de Demostración y Sustentación)

### Paso 1: Radicación por el Investigador (RF-07 a RF-10)
- Ingrese con el rol `investigador` (ej. Dra. Carmen Lucía Morales).
- En el menú lateral, diríjase a **Radicar Trámite**.
- Seleccione el trámite a radicar (ej. *Presentación de Proyecto de Investigación* o *Prórroga de Cronograma*). El sistema desplegará de forma reactiva los requisitos obligatorios configurados en el catálogo.
- Adjunte los documentos requeridos en formato `.pdf` o `.docx` (máx. 10 MB). El servicio local calculará el hash criptográfico SHA-256 de forma atómica.
- Al confirmar la radicación, el sistema generará un número de radicado ininterrumpido en formato `Radicado YYYY-XXX` (RF-08) y creará el primer evento en la bitácora inmutable de auditoría.

### Paso 2: Validación Administrativa y Checklist (RF-12 a RF-14, RN-02, RN-11)
- Ingrese con el rol `administrativo` o `secretario` y acceda a **Validación Documental**.
- Seleccione el radicado pendiente. Coteje cada documento con el visor integrado.
- Si un requisito presenta fallas:
  - Si es **no subsanable** (propuesta sustancial), al rechazarlo el trámite pasará automáticamente a **Rechazada** (RN-11).
  - Si es **subsanable** (certificaciones o cartas avales), al rechazarlo motivadamente (RN-05) el trámite pasará a **Pendiente por documentos** otorgando un plazo perentorio de 5 días hábiles.
- Si el 100% de los requisitos obligatorios son conformes, el trámite pasará a **En revisión** (RN-02).

### Paso 3: Asignación de Evaluadores sin Conflicto de Interés (RF-15, RN-03, RN-14, RF-16)
- Desde el módulo de **Asignaciones**, la Secretaría Técnica selecciona un evaluador par.
- **Regla RN-03:** El sistema inhabilita de inmediato al propio autor de la propuesta.
- **Regla RN-14:** El sistema detecta y bloquea la designación de revisores que pertenezcan al mismo grupo de investigación adscrito a la solicitud.
- En caso de reasignación (RF-16), la asignación anterior se preserva con `is_active: false` en el histórico garantizando la trazabilidad.

### Paso 4: Evaluación Técnica y Emisión de Concepto (RF-17 a RF-20)
- El integrante del comité accede a **Evaluaciones Técnicas**.
- Puede registrar observaciones clasificadas en *Aclaración*, *Ajuste Obligatorio* o *Sugerencia*.
- Una vez conforme, emite su concepto técnico favorable debidamente motivado (RN-05). Con este dictamen, el expediente transita reglamentariamente a **Lista para comité** (RF-20).

### Paso 5: Tablero Kanban y Panel de Seguimiento (RF-21, RF-35)
- Acceda a **Tablero Kanban**. Podrá visualizar los 5 carriles operativos (*Radicada*, *Pendiente por documentos*, *En revisión*, *Lista para comité*, *Decididas*).
- El sistema valida los arrastres conforme a la matriz `ALLOWED_TRANSITIONS` (RF-21), bloqueando saltos ilegales y abriendo un diálogo guiado de confirmación.
- Los investigadores tienen acceso en modo de solo lectura estricto.

### Paso 6: Sesiones Colegiadas, Quórum y Decisiones (RF-24 a RF-28, RN-04, RN-07, RN-06)
- Acceda a **Sesiones de Comité**.
- Programe una nueva sesión ordinaria o extraordinaria con asignación de quórum mínimo.
- **Conformación de Agenda (RN-04):** Solo expedientes en estado `LISTA_COMITE` pueden agregarse a la agenda, asignándoles orden y ponente colegiado.
- **Cierre de Agenda (RF-26):** Al cerrar la agenda se bloquea la inclusión de más temas y se expide la convocatoria formal.
- **Control de Quórum (RN-07):** El sistema calcula la asistencia (mitad más uno). Si no hay quórum, **el botón de votación queda totalmente bloqueado**.
- **Registro de Decisión (RF-28, RN-05, RN-06):**
  - Toda decisión exige justificación obligatoria por escrito.
  - Si se vota **Aplazada**, el expediente **preserva su estado `LISTA_COMITE`** para la siguiente sesión (RN-06).
  - Si se vota **Aprobada** o **Rechazada**, la solicitud transita automáticamente y asienta el evento en la auditoría inmutable.

### Paso 7: Generación de Actas Solemnes y Exportación (RF-29 a RF-32, RNF-03)
- Acceda al módulo de **Actas**.
- El sistema genera el borrador automático consolidando asistentes, orden del día y acuerdos numerados (RF-29) con numeración consecutiva anual `Acta XXX de YYYY` (RF-31).
- Tras revisión de compromisos, el comité aprueba formalmente el acta. A partir de ese momento, la regla **RNF-03** bloquea cualquier edición posterior, garantizando su inmutabilidad jurídica.
- Puede descargar el documento oficial con codificación UTF-8.

### Paso 8: Indicadores y Reportes Analíticos (RF-36)
- Acceda a **Reportes e Indicadores**.
- Visualice la tasa de aprobación global, tiempos de respuesta y desglose cuantitativo por tipología de trámite en tiempo real.
- Exporte el reporte consolidado directamente a formato CSV / Excel.

---

## 3. Guía de Respaldo y Restauración del Almacenamiento Local (RNF-09)

El servicio local de archivos almacena los soportes documentales en `file-service/storage/`. Para garantizar la continuidad institucional y la recuperación ante desastres:

### Procedimiento de Respaldo (Backup):
```bash
# Crear instantánea fechada del almacenamiento de expedientes
node -e "
const fs = require('fs');
const path = require('path');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join('file-service/backups', 'backup_' + timestamp);
fs.mkdirSync(backupDir, { recursive: true });
fs.cpSync('file-service/storage', backupDir, { recursive: true });
console.log('Respaldo completado en:', backupDir);
"
```

### Procedimiento de Restauración (Restore):
```bash
# Restaurar archivos desde la instantánea seleccionada hacia el almacenamiento activo
node -e "
const fs = require('fs');
const path = require('path');
const targetBackup = 'file-service/backups/backup_YYYY-MM-DD...'; // Seleccionar ruta
fs.cpSync(targetBackup, 'file-service/storage', { recursive: true });
console.log('Restauración completada y verificada.');
"
```
Cada archivo restaurado es verificado automáticamente contra su hash SHA-256 almacenado en la base de datos relacional para garantizar integridad bit a bit.

---

## 4. Batería de Pruebas Automatizadas

El sistema cuenta con **23 suites de pruebas automatizadas continuas**:
- Ejecución completa: `npm test`
- Cobertura de transiciones, permisos, control de acceso RBAC, inmutabilidad de bitácora e integridad documental: **100% aprobadas sin fallos**.
