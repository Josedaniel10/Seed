import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMinuteContent, readMinuteContent, serializeMinuteContent, minuteDocument, minuteApprovalErrors } from '../minuteContent.ts';
import { useMinutesStore } from '../minutesStore.ts';
import { MinuteWorkspace } from '../MinuteWorkspace.tsx';
import { executiveMinute } from './minutePdfFixtures.js';

function draft() { return { ...executiveMinute(), is_approved: false, approved_at: null }; }
function completedEditorial(content) {
  return { ...content.editorial, closingTime: '11:30',
    signatories: [{ name: 'Ana María Peña', role: 'Presidencia' }, { name: 'Patricia Salamanca', role: 'Secretaría técnica' }],
  };
}

test('round-trips structured fields without changing session decisions, constancies or original text', () => {
  const minute = draft();
  const content = createMinuteContent(minute);
  const editorial = completedEditorial(content);
  editorial.topicNotes[0].text = 'Observación con título: COMPROMISOS\nResponsable: texto de la observación.';
  editorial.observations = 'Observaciones generales con ñ y á.';
  editorial.commitments = [
    { action: 'Remitir anexos', responsible: 'Dependencia externa', responsibleUserId: '', deadlineType: 'date', deadline: '2026-12-01' },
    { action: 'Revisar informe', responsible: 'Patricia Salamanca', responsibleUserId: 'person-1', deadlineType: 'next_session', deadline: '' },
    { action: 'Programar revisión', responsible: 'Ana Peña', responsibleUserId: '', deadlineType: 'pending', deadline: '' },
  ];
  const serialized = serializeMinuteContent(content, editorial);
  const saved = readMinuteContent(serialized);
  assert.deepEqual(saved.snapshot, content.snapshot);
  assert.equal(saved.sourceText, minute.draft_content);
  assert.deepEqual(saved.editorial, editorial);
  const model = minuteDocument({ ...minute, draft_content: serialized });
  assert.match(model.time, /Cierre 11:30/);
  assert.equal(model.development.length, 3);
  assert.equal(model.development[0].paragraphs.at(-1), editorial.topicNotes[0].text);
  assert.match(model.development[2].paragraphs.join('\n'), /mismo grupo/);
  assert.equal(model.commitments[1].deadline, 'Próxima sesión');
  assert.equal(model.commitments[0].deadline, '01/12/2026');
  assert.equal(model.commitments[2].deadline, 'Por definir');
  assert.deepEqual(model.signatories, editorial.signatories);
  assert.equal(minuteApprovalErrors(editorial).length, 0);
});

test('requires complete firmants and commitments for approval and rejects invalid dates', () => {
  const content = createMinuteContent(draft());
  assert.match(minuteApprovalErrors(content.editorial).join(' '), /firmantes/);
  const editorial = completedEditorial(content);
  editorial.commitments = [{ action: '', responsible: '', responsibleUserId: '', deadlineType: 'date', deadline: '2026-02-30' }];
  assert.match(minuteApprovalErrors(editorial).join(' '), /acción y el responsable/);
  assert.match(minuteApprovalErrors(editorial).join(' '), /fecha válida/);
  assert.throws(() => serializeMinuteContent(content, { ...editorial, closingTime: '25:90' }));
  assert.throws(() => serializeMinuteContent(content, { ...editorial, topicNotes: [] }), /puntos tratados/);
  assert.throws(() => readMinuteContent('{"format":"seed.committee-minute","version":99}'), /versión/);
});

test('structured draft saves, protects captured session data and stays immutable after approval', async () => {
  const minute = draft();
  useMinutesStore.setState({ minutes: [minute] });
  const store = useMinutesStore.getState();
  const content = createMinuteContent(minute);
  const partial = await store.updateStructuredDraft(minute.id, content.editorial, 'actor', 'Secretaría');
  assert.equal(partial.success, true);
  assert.equal((await store.approveMinutes(minute.id, 'actor', 'Secretaría')).success, false);
  const edited = await store.updateStructuredDraft(minute.id, completedEditorial(content), 'actor', 'Secretaría');
  assert.equal(edited.success, true);
  const tampered = readMinuteContent(edited.minute.draft_content);
  tampered.snapshot.development[0].result = 'Rechazada';
  assert.equal((await store.updateDraftContent(minute.id, JSON.stringify(tampered), 'actor', 'Secretaría')).success, false);
  assert.equal((await store.updateDraftContent(minute.id, 'Reemplazo con texto libre', 'actor', 'Secretaría')).success, false);
  assert.equal((await store.approveMinutes(minute.id, 'actor', 'Secretaría')).success, true);
  assert.equal((await store.updateStructuredDraft(minute.id, completedEditorial(content), 'actor', 'Secretaría')).success, false);
});

test('renders controlled fields and review step instead of the previous whole-document editor', () => {
  const minute = draft();
  useMinutesStore.setState({ minutes: [minute] });
  useMinutesStore.getInitialState().minutes = [minute];
  const html = renderToStaticMarkup(createElement(MinuteWorkspace, { minuteId: minute.id, canManage: true }));
  assert.match(html, /Asistencia y quórum/);
  assert.match(html, /name="closingTime"/);
  assert.match(html, /name="commitments.0.responsibleUserId"/);
  assert.match(html, /name="signatories.0.name"/);
  assert.match(html, /He revisado el borrador original/);
  assert.match(html, /Vista previa del PDF/);
  assert.doesNotMatch(html, /Contenido del acta/);
  const readOnly = renderToStaticMarkup(createElement(MinuteWorkspace, { minuteId: minute.id, canManage: false }));
  assert.doesNotMatch(readOnly, /Guardar borrador|Aprobar acta|He revisado/);
});

test('keeps approved legacy PDF content unchanged and captures arbitrary session identifiers', () => {
  const legacy = executiveMinute();
  assert.deepEqual(minuteDocument(legacy).commitments, createMinuteContent(legacy).snapshot.commitments);
  const minute = { ...draft(), draft_content: 'ACTA 001 DE 2026\nCI-2026-001\nFecha y hora 11/11/2026 09:00 (Colombia)\nLugar Sala\nASISTENCIA\nAna - Presente' };
  assert.equal(createMinuteContent(minute).snapshot.session, 'CI-2026-001');
});
