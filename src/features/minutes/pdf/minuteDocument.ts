import type { CommitteeMinutes } from '../../../types/database.ts';

type SectionKind = 'attendance' | 'agenda' | 'development' | 'commitments' | 'signatures' | 'other';

interface SourceSection {
  kind: SectionKind;
  title: string;
  lines: string[];
}

export interface MinuteTopic {
  order: string;
  title: string;
  speaker: string;
  result: string;
  paragraphs: string[];
}

export interface MinuteDocument {
  date: string;
  time: string;
  location: string;
  session: string;
  openingNotes: string[];
  attendees: Array<{ name: string; role: string; status: string; notes: string }>;
  attendanceNotes: string[];
  agenda: MinuteTopic[];
  development: MinuteTopic[];
  commitments: Array<{ action: string; responsible: string; deadline: string }>;
  additionalSections: Array<{ title: string; paragraphs: string[] }>;
  signatureNotes: string[];
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function sectionKind(line: string): SectionKind | null {
  const heading = normalized(line).replace(/^\d+[.)]\s*/, '').replace(/:$/, '').trim();
  if (/^(ASISTENCIA(?: Y QUORUM(?: REGLAMENTARIO)?)?|ASISTENTES)$/.test(heading)) return 'attendance';
  if (/^(ORDEN DEL DIA(?: Y (?:ACUERDOS|ASUNTOS TRATADOS))?|AGENDA(?:, DECISIONES Y CONSTANCIAS)?)$/.test(heading)) return 'agenda';
  if (/^(DESARROLLO(?: DE LA SESION| \/ PUNTOS TRATADOS)?|PUNTOS TRATADOS|ACUERDOS Y DECISIONES ADOPTADAS|DECISIONES|CONSTANCIAS DE PUNTOS NO DELIBERADOS)$/.test(heading)) return 'development';
  if (/^COMPROMISOS(?: Y (?:ACCIONES DE SEGUIMIENTO|RESPONSABLES|FIRMAS))?$/.test(heading)) return 'commitments';
  if (/^(FIRMAS|BLOQUE DE FIRMAS)$/.test(heading)) return 'signatures';
  if (/^(OBSERVACIONES|OTROS ASUNTOS|ANEXOS|NOTAS ADICIONALES)$/.test(heading)) return 'other';
  return null;
}

function paragraphs(lines: string[]): string[] {
  return lines.join('\n').trim().split(/\n\s*\n/).filter(Boolean);
}

function readMetadata(lines: string[], model: MinuteDocument): void {
  for (const line of lines.filter(Boolean)) {
    const date = line.match(/^Fecha(?: y hora)?\s*:?\s+(.+)$/i);
    const time = line.match(/^Hora\s*:?\s+(.+)$/i);
    const location = line.match(/^Lugar(?:\s*\/\s*(?:Enlace|Modalidad))?\s*:?\s+(.+)$/i);
    const session = line.match(/^(?:Convocatoria(?: oficial)?|Sesi[oó]n)\s*:\s*(.+)$/i);
    if (date && !model.date) {
      const clock = date[1].match(/\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|a\.?\s*m\.?|p\.?\s*m\.?))?/i);
      model.date = date[1].slice(0, clock?.index ?? date[1].length).replace(/[\s·,]+$/, '');
      model.time = clock ? date[1].slice(clock.index).trim() : '';
    } else if (time && !model.time) {
      model.time = time[1];
    } else if (location && !model.location) {
      model.location = location[1];
    } else if (session && !model.session) {
      model.session = session[1];
    } else if (!model.session && /^Sesi[oó]n\s+(?:Ordinaria|Extraordinaria)/i.test(line)) {
      model.session = line;
    } else if (!/^ACTA\s+(?:N[º°]?\s*)?\d+\s+DE\s+\d{4}\s*$/i.test(line)) {
      model.openingNotes.push(line);
    }
  }
}

function readAttendance(lines: string[], model: MinuteDocument): void {
  let defaultStatus = '';
  for (const source of lines.filter(Boolean)) {
    const line = source.replace(/^[-•]\s*/, '').trim();
    if (/^Miembros (Asistentes|Ausentes)/i.test(line)) {
      defaultStatus = /Asistentes/i.test(line) ? 'Presente' : 'Ausente';
      model.attendanceNotes.push(line);
      continue;
    }
    if (/^(Ningun[oa](?: registrad[oa])?|Sin asistentes(?: registrados)?)\.?$/i.test(line)) {
      model.attendanceNotes.push(line);
      continue;
    }
    const attendance = line.match(/^(.*?)\s+[-·]\s+(Presente|Ausente|Asistió|No asistió)(.*)$/i);
    const identity = attendance?.[1] ?? line.split(/\s+·\s+/)[0];
    const person = identity.match(/^(.*?)\s+\(([^)]+)\)$/);
    if (attendance || (defaultStatus && /^[-•]/.test(source.trim()))) {
      model.attendees.push({
        name: person?.[1] ?? identity,
        role: person?.[2] ?? '',
        status: attendance?.[2] ?? defaultStatus,
        notes: attendance ? attendance[3].replace(/^\s*[-·:]\s*/, '').trim() : line.slice(identity.length).replace(/^\s*·\s*/, ''),
      });
    } else {
      model.attendanceNotes.push(line);
    }
  }
}

const RESULT_LABELS: Record<string, string> = {
  APPROVED_WITH_ADJUSTMENTS: 'Aprobada con ajustes', APROBADA_CON_AJUSTES: 'Aprobada con ajustes',
  APPROVED: 'Aprobada', APROBADA: 'Aprobada', REJECTED: 'Rechazada', RECHAZADA: 'Rechazada',
  POSTPONED: 'Aplazada', APLAZADA: 'Aplazada',
};

function readTopics(section: SourceSection): MinuteTopic[] {
  const topics: MinuteTopic[] = [];
  let current: MinuteTopic | undefined;
  for (const line of section.lines) {
    const start = line.match(/^(?:Punto\s+)?(\d+)[.):]\s+(.+)$/i);
    if (start) {
      current = { order: start[1], title: start[2], speaker: '', result: '', paragraphs: [] };
      topics.push(current);
    } else if (line.trim()) {
      if (!current) {
        current = { order: '', title: section.title, speaker: '', result: '', paragraphs: [] };
        topics.push(current);
      }
      const result = line.match(/^(?:Resultado|Decisi[oó]n)\s*:?\s+(.+)$/i);
      const speaker = line.match(/^Ponente\s*:?\s+(.+)$/i);
      if (result && !current.result) {
        current.result = result[1].replace(/^[A-Z_]+/, (value) => RESULT_LABELS[value] ?? value);
      } else {
        current.paragraphs.push(line);
      }
      if (speaker) current.speaker = speaker[1];
    }
  }
  return topics;
}

function readCommitments(lines: string[], model: MinuteDocument): void {
  let current: MinuteDocument['commitments'][number] | undefined;
  for (const source of lines) {
    if (!source.trim()) {
      current = undefined;
      continue;
    }
    const line = source.replace(/^[-•]\s*/, '').trim();
    if (/^Firma\s*:/i.test(line)) {
      model.signatureNotes.push(line);
      continue;
    }
    if (/^Constancia de elaboraci[oó]n/i.test(line)) {
      model.signatureNotes.push(line);
      continue;
    }
    const cells = line.replace(/^\|\s*|\s*\|$/g, '').split('|').map((value) => value.trim());
    if (cells.length >= 3) {
      if (/^Compromiso$/i.test(cells[0]) && /^Responsable$/i.test(cells[1])) continue;
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      current = { action: cells[0], responsible: cells[1], deadline: cells.slice(2).join(' | ') };
      model.commitments.push(current);
      continue;
    }
    const field = line.match(/^(Responsable|Plazo|Fecha l[ií]mite)\s*:\s*(.+)$/i);
    if (field && current) {
      if (/Responsable/i.test(field[1])) current.responsible = field[2];
      else current.deadline = field[2];
    } else if (current && !/^[-•]|^Compromiso\s*:/i.test(source.trim())) {
      current.action += '\n' + line;
    } else {
      current = { action: line.replace(/^Compromiso\s*:\s*/i, ''), responsible: '', deadline: '' };
      model.commitments.push(current);
    }
  }
}

/** Uses the saved draft as the source, including amendments and older minutes. */
export function parseMinuteDocument(minute: CommitteeMinutes): MinuteDocument {
  const model: MinuteDocument = {
    date: '', time: '', location: '', session: '', openingNotes: [], attendees: [], attendanceNotes: [],
    agenda: [], development: [], commitments: [], additionalSections: [], signatureNotes: [],
  };
  const preamble: string[] = [];
  const sections: SourceSection[] = [];
  let current: SourceSection | undefined;
  for (const line of minute.draft_content.replace(/\r\n?/g, '\n').split('\n')) {
    const kind = sectionKind(line.trim());
    if (kind) {
      current = { kind, title: line.replace(/^\d+[.)]\s*/, '').replace(/:$/, '').trim(), lines: [] };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else preamble.push(line);
  }
  readMetadata(preamble, model);
  for (const section of sections) {
    if (section.kind === 'attendance') readAttendance(section.lines, model);
    else if (section.kind === 'agenda') {
      const topics = readTopics(section);
      model.agenda.push(...topics);
      if (topics.some((topic) => topic.result || topic.paragraphs.some((line) => /^(Fundamento|Justificaci[oó]n)/i.test(line)))) {
        model.development.push(...topics);
      } else {
        for (const topic of topics) {
          if (topic.paragraphs.length) model.additionalSections.push({ title: topic.title, paragraphs: topic.paragraphs });
        }
      }
    } else if (section.kind === 'development') model.development.push(...readTopics(section));
    else if (section.kind === 'commitments') readCommitments(section.lines, model);
    else if (section.kind === 'signatures') model.signatureNotes.push(...section.lines.filter(Boolean));
    else model.additionalSections.push({ title: section.title, paragraphs: paragraphs(section.lines) });
  }
  return model;
}
