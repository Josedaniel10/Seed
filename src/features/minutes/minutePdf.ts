import { jsPDF } from 'jspdf';
import type { CommitteeMinutes } from '../../types/database.ts';
import { parseMinuteDocument } from './pdf/minuteDocument.ts';
import { MinutePdfLayout } from './pdf/minutePdfLayout.ts';
import { MINUTE_PDF_THEME as theme } from './pdf/minutePdfTheme.ts';

export function createMinutePdf(minute: CommitteeMinutes): Blob {
  const document = new jsPDF({ format: 'a4', unit: 'mm' });
  document.setProperties({ title: minute.minute_number, author: 'Seed - Comité de Investigación' });
  const model = parseMinuteDocument(minute);
  const layout = new MinutePdfLayout(document, minute);
  layout.cover(model);

  if (model.attendees.length) {
    layout.table('Asistentes', ['Nombre', 'Cargo / participación', 'Asistencia', 'Observaciones'],
      model.attendees.map((person) => [person.name, person.role || 'Sin especificar', person.status, person.notes || '-']),
      [53, 42, 25, 54]);
  } else {
    layout.section('Asistentes');
    layout.paragraph('El acta no detalla la lista de asistentes.', { color: theme.muted });
  }
  for (const note of model.attendanceNotes) layout.paragraph(note, { color: theme.muted });

  if (model.agenda.length) {
    layout.table('Orden del día', ['Punto', 'Solicitud / asunto', 'Ponente'],
      model.agenda.map((topic) => [topic.order || '-', topic.title, topic.speaker || 'Sin especificar']), [18, 114, 42]);
  } else {
    layout.section('Orden del día');
    layout.paragraph('El acta no incluye un orden del día separado.', { color: theme.muted });
  }

  layout.section('Desarrollo / Puntos tratados');
  for (const paragraph of model.openingNotes) layout.paragraph(paragraph);
  for (const topic of model.development) {
    layout.topic(topic.title, topic.result);
    for (const paragraph of topic.paragraphs) layout.paragraph(paragraph);
    layout.y += 3;
  }
  if (!model.openingNotes.length && !model.development.length) {
    layout.paragraph('Sin desarrollo adicional registrado.', { color: theme.muted });
  }

  for (const section of model.additionalSections) {
    layout.section(section.title);
    for (const paragraph of section.paragraphs) layout.paragraph(paragraph);
  }

  layout.table('Compromisos y responsables', ['Compromiso / acción', 'Responsable', 'Plazo'],
    model.commitments.length
      ? model.commitments.map((commitment) => [commitment.action, commitment.responsible || 'Sin especificar', commitment.deadline || 'Sin especificar'])
      : [['Sin compromisos registrados en el acta.', '-', '-']],
    [100, 44, 30]);
  layout.signatures(model.signatureNotes);
  layout.finish();
  return document.output('blob');
}
