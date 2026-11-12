import type { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CommitteeMinutes } from '../../../types/database.ts';
import type { MinuteDocument } from './minuteDocument.ts';
import { MINUTE_PDF_THEME as theme } from './minutePdfTheme.ts';

/** Keeps page geometry and table pagination together. All units are millimetres. */
export class MinutePdfLayout {
  readonly width: number;
  readonly height: number;
  readonly contentWidth: number;
  y = 0;

  constructor(readonly document: jsPDF, readonly minute: CommitteeMinutes) {
    this.width = document.internal.pageSize.getWidth();
    this.height = document.internal.pageSize.getHeight();
    this.contentWidth = this.width - theme.margin * 2;
    document.setLineHeightFactor(1.35);
  }

  private setText(size: number = theme.bodyFontSize, weight = 'normal', color: string = theme.ink): void {
    this.document.setFont('helvetica', weight);
    this.document.setFontSize(size);
    this.document.setTextColor(color);
  }

  private lines(text: string, width = this.contentWidth): string[] {
    return this.document.splitTextToSize(text, width);
  }

  keepTogether(height: number): void {
    if (this.y + height <= this.height - theme.bottom) return;
    this.document.addPage();
    this.y = theme.bodyTop;
  }

  private logo(x: number, y: number, size: number): void {
    const scale = size / 32;
    const point = (values: number[]) => values.map((value, index) => (index % 2 ? y : x) + value * scale);
    // Reuses the mark from SeedLogo and the application's favicon.
    this.document.setFillColor(theme.forest);
    this.document.path([
      { op: 'm', c: point([16, 4]) },
      { op: 'c', c: point([16, 4, 9, 12.8, 9, 19.4]) },
      { op: 'c', c: point([9, 23.6, 12.1, 27, 16, 27]) },
      { op: 'c', c: point([17.2, 27, 18.3, 26.7, 19.3, 26.1]) },
      { op: 'c', c: point([18.2, 24.2, 17.6, 21.9, 17.6, 19.5]) },
      { op: 'c', c: point([17.6, 14.2, 20.3, 9.4, 24.5, 6.8]) },
      { op: 'c', c: point([22.2, 4.9, 19.2, 4, 16, 4]) },
      { op: 'h', c: [] },
    ]).fill();
    this.document.setFillColor('#84CC16');
    this.document.path([
      { op: 'm', c: point([20.2, 10.5]) },
      { op: 'c', c: point([18.2, 13, 17, 16.2, 17, 19.7]) },
      { op: 'c', c: point([17, 22.3, 17.8, 24.7, 19.2, 26.6]) },
      { op: 'c', c: point([21.4, 25.2, 23, 22.7, 23, 19.7]) },
      { op: 'c', c: point([23, 15.6, 21.8, 12.3, 20.2, 10.5]) },
      { op: 'h', c: [] },
    ]).fill();
    this.document.setFillColor(theme.surface);
    this.document.circle(x + 16 * scale, y + 19.5 * scale, 1.5 * scale, 'F');
  }

  cover(model: MinuteDocument): void {
    const doc = this.document;
    doc.setFillColor(theme.forest);
    doc.rect(0, 0, this.width, 52, 'F');
    doc.setFillColor(theme.white);
    doc.roundedRect(theme.margin, 11, 11, 11, 2, 2, 'F');
    this.logo(theme.margin, 11, 11);
    this.setText(18, 'bold', theme.white);
    doc.text('Seed', 33, 19);
    this.setText(8, 'normal', '#D0DFD3');
    doc.text('COMITÉ DE INVESTIGACIÓN', theme.margin, 30);
    this.setText(25, 'bold', theme.white);
    doc.text('Acta de sesión', theme.margin, 43);
    this.setText(11, 'bold', theme.white);
    doc.text(this.minute.minute_number, this.width - theme.margin, 17, { align: 'right' });
    doc.setFillColor(this.minute.is_approved ? theme.lime : '#F4E5C9');
    doc.roundedRect(this.width - theme.margin - 34, 25, 34, 8, 2, 2, 'F');
    this.setText(8, 'bold', theme.forest);
    doc.text(this.minute.is_approved ? 'APROBADA' : 'BORRADOR', this.width - theme.margin - 17, 30.3, { align: 'center' });

    this.y = 60;
    this.setText();
    const dateLines = this.lines(model.date || 'Sin especificar', this.contentWidth / 2 - 12);
    const timeLines = this.lines(model.time || 'Sin especificar', this.contentWidth / 2 - 12);
    const visibleDate = dateLines.slice(0, 3);
    const visibleTime = timeLines.slice(0, 3);
    const locationLines = this.lines(model.location || 'Sin especificar', this.contentWidth - 12);
    const visibleLocation = locationLines.slice(0, 6);
    const rowHeight = 11 + Math.max(visibleDate.length, visibleTime.length) * theme.lineHeight;
    const cardHeight = rowHeight + 13 + visibleLocation.length * theme.lineHeight;
    doc.setFillColor(theme.surface);
    doc.roundedRect(theme.margin, this.y, this.contentWidth, cardHeight, 2, 2, 'F');
    const rightColumn = theme.margin + this.contentWidth / 2 + 6;
    this.setText(7.5, 'bold', theme.muted);
    doc.text('FECHA', theme.margin + 6, this.y + 7);
    doc.text('HORA', rightColumn, this.y + 7);
    this.setText();
    doc.text(visibleDate, theme.margin + 6, this.y + 13);
    doc.text(visibleTime, rightColumn, this.y + 13);
    doc.setDrawColor(theme.border);
    doc.line(theme.margin + 6, this.y + rowHeight, this.width - theme.margin - 6, this.y + rowHeight);
    this.setText(7.5, 'bold', theme.muted);
    doc.text('LUGAR / MODALIDAD', theme.margin + 6, this.y + rowHeight + 7);
    this.setText();
    doc.text(visibleLocation, theme.margin + 6, this.y + rowHeight + 13);
    this.y += cardHeight + 7;
    if (dateLines.length > visibleDate.length) this.paragraph(dateLines.slice(visibleDate.length).join('\n'));
    if (timeLines.length > visibleTime.length) this.paragraph(timeLines.slice(visibleTime.length).join('\n'));
    if (locationLines.length > visibleLocation.length) this.paragraph(locationLines.slice(visibleLocation.length).join('\n'));
    if (model.session) this.paragraph(model.session, { bold: true, color: theme.green });
  }

  section(title: string, minimumBody = 12): void {
    this.keepTogether(15 + minimumBody);
    this.y += 4;
    this.document.setFillColor(theme.green);
    this.document.roundedRect(theme.margin, this.y - 3.5, 1.2, 5, 0.6, 0.6, 'F');
    this.setText(12, 'bold', theme.forest);
    this.document.text(title, theme.margin + 4, this.y);
    this.y += 6;
  }

  paragraph(text: string, options: { bold?: boolean; color?: string } = {}): void {
    this.setText(theme.bodyFontSize, options.bold ? 'bold' : 'normal', options.color ?? theme.ink);
    const lines = this.lines(text);
    this.keepTogether(Math.min(lines.length, 2) * theme.lineHeight);
    let index = 0;
    while (index < lines.length) {
      const capacity = Math.floor((this.height - theme.bottom - this.y) / theme.lineHeight);
      if (capacity < Math.min(lines.length - index, 2)) {
        this.keepTogether(theme.lineHeight * 2);
        continue;
      }
      let count = Math.min(capacity, lines.length - index);
      if (lines.length - index - count === 1 && count > 1) count -= 1;
      this.document.text(lines.slice(index, index + count), theme.margin, this.y);
      this.y += count * theme.lineHeight;
      index += count;
    }
    this.y += 2;
  }

  table(title: string, head: string[], body: string[][], widths: number[]): void {
    this.setText();
    const rowHeight = (row: string[]) => Math.max(...row.map((cell, index) =>
      this.lines(cell, widths[index] - 6).length * theme.lineHeight + 6), 10);
    const headHeight = rowHeight(head);
    const tableHeight = headHeight + body.reduce((height, row) => height + rowHeight(row), 0);
    const pageCapacity = this.height - theme.bodyTop - theme.bottom - 18;
    const reservedHeight = tableHeight <= pageCapacity ? tableHeight : rowHeight(body[0] ?? []) + headHeight;
    this.section(title, Math.min(reservedHeight, pageCapacity));
    let endY = this.y;
    autoTable(this.document, {
      startY: this.y,
      margin: { top: theme.bodyTop, left: theme.margin, right: theme.margin, bottom: theme.bottom },
      theme: 'plain', head: [head], body,
      showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: theme.bodyFontSize, cellPadding: 3,
        textColor: theme.ink, lineColor: theme.border, lineWidth: { bottom: 0.15 },
        overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: theme.green, textColor: theme.white, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: theme.surface },
      columnStyles: Object.fromEntries(widths.map((width, index) => [index, { cellWidth: width }])),
      didDrawCell: ({ cell }) => { endY = cell.y + cell.height; },
    });
    this.y = endY + 5;
  }

  topic(title: string, result: string): void {
    this.setText(10.5, 'bold', theme.forest);
    const lines = this.lines(title, this.contentWidth - 10);
    if (lines.length > 10) {
      this.paragraph(title, { bold: true, color: theme.forest });
    } else {
      const height = lines.length * 5 + 7;
      this.keepTogether(height + 18);
      this.document.setFillColor(theme.surface);
      this.document.roundedRect(theme.margin, this.y - 3, this.contentWidth, height, 1.5, 1.5, 'F');
      this.document.text(lines, theme.margin + 5, this.y + 2);
      this.y += height + 1;
    }
    if (result) {
      let color: string = theme.green;
      if (/rechazada/i.test(result)) color = theme.rose;
      else if (/ajustes|aplazada|no deliberada/i.test(result)) color = theme.amber;
      this.paragraph(`Resultado · ${result}`, { bold: true, color });
    }
  }

  signatures(notes: string[], signatories?: Array<{ name: string; role: string }>): void {
    this.setText();
    const noteHeight = notes.reduce((height, note) => height + this.lines(note).length * theme.lineHeight + 2, 0);
    this.section('Firmas', Math.min(45 + noteHeight, 150));
    for (const note of notes) this.paragraph(note);
    const gap = 12;
    const width = (this.contentWidth - gap) / 2;
    const people = signatories ?? [{ name: '', role: 'Presidencia del comité' }, { name: '', role: 'Secretaría técnica' }];
    for (let start = 0; start < people.length; start += 2) {
      this.setText(9, 'bold');
      const row = people.slice(start, start + 2).map((person) => ({
        name: this.lines(person.name || 'Nombre y firma', width - 12),
        role: this.lines(person.role || 'Cargo por definir', width - 12),
      }));
      const height = Math.max(...row.map((person) => 32 + (person.name.length + person.role.length) * theme.lineHeight));
      this.keepTogether(height + 5);
      row.forEach((person, index) => {
        const x = theme.margin + index * (width + gap);
        this.document.setDrawColor(theme.border);
        this.document.roundedRect(x, this.y, width, height, 2, 2, 'S');
        this.document.line(x + 6, this.y + 22, x + width - 6, this.y + 22);
        this.setText(9, 'bold', theme.forest);
        this.document.text(person.name, x + 6, this.y + 28);
        this.setText(8, 'normal', theme.muted);
        this.document.text(person.role, x + 6, this.y + 29 + person.name.length * theme.lineHeight);
      });
      this.y += height + 5;
    }
  }

  finish(): void {
    const doc = this.document;
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      if (page > 1) {
        this.logo(theme.margin - 1, 10, 8);
        this.setText(10, 'bold', theme.forest);
        doc.text('Seed', theme.margin + 9, 16.5);
        this.setText(8, 'normal', theme.muted);
        doc.text(this.minute.minute_number, this.width - theme.margin, 16.5, { align: 'right' });
        doc.setDrawColor(theme.border);
        doc.line(theme.margin, 23, this.width - theme.margin, 23);
      }
      doc.setDrawColor(theme.border);
      doc.line(theme.margin, this.height - 17, this.width - theme.margin, this.height - 17);
      this.setText(7.5, 'normal', theme.muted);
      doc.text(this.minute.is_approved ? 'Acta aprobada' : 'Borrador para revisión', theme.margin, this.height - 11);
      doc.text(`Página ${page} de ${pages}`, this.width - theme.margin, this.height - 11, { align: 'right' });
    }
  }
}
