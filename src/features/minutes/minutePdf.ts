import { jsPDF } from 'jspdf';
import type { CommitteeMinutes } from '../../types/database.ts';

export function createMinutePdf(minute: CommitteeMinutes): Blob {
  const document = new jsPDF({ format: 'a4', unit: 'mm' });
  document.setProperties({ title: minute.minute_number, author: 'Seed - Comité de Investigación' });
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 22;
  let y = 38;

  const addHeader = () => {
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.setTextColor(20, 40, 29);
    document.text('SEED | Comité de Investigación', margin, 18);
    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.text(minute.is_approved ? 'Acta aprobada' : 'Borrador para revisión', margin, 25);
    document.setDrawColor(200, 200, 195);
    document.line(margin, 29, 188, 29);
  };

  addHeader();
  document.setFontSize(10);
  document.setTextColor(35, 35, 35);
  for (const paragraph of minute.draft_content.split(/\r?\n/)) {
    const lines: string[] = document.splitTextToSize(paragraph || ' ', 166);
    for (const line of lines) {
      if (y > pageHeight - 25) {
        document.addPage();
        addHeader();
        document.setFontSize(10);
        document.setTextColor(35, 35, 35);
        y = 38;
      }
      document.text(line, margin, y);
      y += 5;
    }
  }
  const totalPages = document.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    document.setFontSize(8);
    document.setTextColor(100, 100, 100);
    document.text(`${minute.minute_number} | Página ${page} de ${totalPages}`, margin, pageHeight - 12);
  }
  return document.output('blob');
}
