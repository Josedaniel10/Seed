import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMinuteDocument } from '../pdf/minuteDocument.ts';
import { executiveMinute } from './minutePdfFixtures.js';

test('uses saved decisions, constancies and explicit commitment ownership in the executive document', () => {
  const minute = executiveMinute();
  const original = minute.draft_content;
  const model = parseMinuteDocument(minute);
  assert.equal(model.date, '11/11/2026');
  assert.equal(model.time, '09:00 (Colombia)');
  assert.equal(model.attendees.length, 4);
  assert.equal(model.attendees[3].status, 'Ausente');
  assert.equal(model.attendees[3].notes, 'Excusa registrada');
  assert.equal(model.agenda.length, 3);
  assert.equal(model.development[1].result, 'Aprobada con ajustes');
  assert.equal(model.development[2].result, 'No deliberada por falta de quórum');
  assert.match(model.development[2].paragraphs.join('\n'), /mismo grupo/);
  assert.equal(model.commitments[1].responsible, 'Andrés Muñoz');
  assert.equal(model.commitments[1].deadline, '23/11/2026');
  assert.match(model.additionalSections[0].paragraphs[0], /revisión del contenido/);
  assert.equal(minute.draft_content, original);
});

test('preserves legacy content, handwritten amendments and missing ownership without inference', () => {
  const minute = { ...executiveMinute(), draft_content: `ACTA Nº 003 DE 2026 - SESIÓN ORDINARIA
Fecha: 28 de Octubre de 2026 · 14:00 PM
Lugar: Sala de Consejos
Convocatoria: Sesión Ordinaria Nº 03 - 2026
Nota adicional aprobada por Secretaría.

1. ASISTENCIA Y QUÓRUM REGLAMENTARIO:
Miembros Asistentes (1 de 2):
- Ana Peña (Presidencia) · Presencial
Miembros Ausentes:
- José Muñoz (Vocal) · Ausente

2. ORDEN DEL DÍA Y ACUERDOS:
Punto 1: Radicado 2026-004 - Informe Semestral
Decisión: APROBADA por unanimidad.
Justificación: Cumple los entregables.

3. COMPROMISOS Y FIRMAS:
- Remitir el informe al archivo institucional.
  Conservar una copia revisada.
- Firma: Presidencia y Secretaría.
` };
  const model = parseMinuteDocument(minute);
  assert.equal(model.date, '28 de Octubre de 2026');
  assert.equal(model.time, '14:00 PM');
  assert.equal(model.attendees[0].role, 'Presidencia');
  assert.equal(model.attendees[1].status, 'Ausente');
  assert.equal(model.development[0].result, 'Aprobada por unanimidad.');
  assert.match(model.openingNotes.join('\n'), /Nota adicional aprobada/);
  assert.match(model.commitments[0].action, /Conservar una copia revisada/);
  assert.equal(model.commitments[0].responsible, '');
  assert.equal(model.commitments[0].deadline, '');
  assert.match(model.signatureNotes[0], /Presidencia y Secretaría/);
});

test('keeps free-form text and supports structured responsibility fields and markdown rows', () => {
  const minute = { ...executiveMinute(), draft_content: `Texto libre con revisión, ñ y observaciones.
COMPROMISOS
Compromiso: Radicar el soporte final.
Responsable: Ana Muñoz
Plazo: 30/11/2026

| Compromiso | Responsable | Plazo |
| --- | --- | --- |
| Presentar anexos | José Peña | 02/12/2026 |
` };
  const model = parseMinuteDocument(minute);
  assert.match(model.openingNotes[0], /revisión, ñ/);
  assert.deepEqual(model.commitments, [
    { action: 'Radicar el soporte final.', responsible: 'Ana Muñoz', deadline: '30/11/2026' },
    { action: 'Presentar anexos', responsible: 'José Peña', deadline: '02/12/2026' },
  ]);
});

test('retains repeated metadata as notes and treats empty attendance lists as empty', () => {
  const minute = { ...executiveMinute(), draft_content: `Fecha: 11/11/2026
Fecha: Aclaración de Secretaría
ASISTENCIA
Miembros Asistentes (0 de 2):
- Ninguno registrado
Miembros Ausentes:
- Ana Peña (Vocal) · Ausente
` };
  const model = parseMinuteDocument(minute);
  assert.equal(model.date, '11/11/2026');
  assert.deepEqual(model.openingNotes, ['Fecha: Aclaración de Secretaría']);
  assert.equal(model.attendees.length, 1);
  assert.equal(model.attendees[0].status, 'Ausente');
});
