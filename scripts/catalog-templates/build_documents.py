"""Rebuild the editable Seed base templates using the bundled Python runtime."""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor

OUT = Path(__file__).resolve().parents[2] / 'public/templates/catalog'
OUT.mkdir(parents=True, exist_ok=True)
templates = [
 ('propuesta-tecnica.docx', 'Propuesta técnica de investigación', [
  ('Problema y justificación', 'Describa la situación que investigará, su alcance, antecedentes y relevancia para la comunidad.'),
  ('Objetivos', 'Escriba un objetivo general y objetivos específicos verificables. Relacione cada uno con un resultado esperado.'),
  ('Metodología y consideraciones éticas', 'Explique diseño, población o fuentes, técnicas de recolección y análisis, riesgos y medidas de protección. Indique si necesita aval ético.'),
  ('Resultados y productos', 'Indique productos, indicadores y evidencias. Adjunte presupuesto y cronograma en sus requisitos correspondientes.'),
  ('Referencias', 'Incluya las fuentes utilizadas con un estilo de citación consistente.')]),
 ('justificacion-presupuestal.docx', 'Justificación de modificación presupuestal', [
  ('Presupuesto vigente y cambio solicitado', 'Identifique el presupuesto aprobado, los rubros afectados y los valores del traslado. Adjunte el cuadro comparativo.'),
  ('Fundamento del cambio', 'Explique las necesidades técnicas, académicas o variaciones de mercado. Relacione cotizaciones o soportes.'),
  ('Efectos sobre los objetivos', 'Explique cómo conserva el alcance, los productos y los compromisos. Declare cualquier impacto en el cronograma.'),
  ('Relación de anexos', 'Liste los documentos que permiten verificar la solicitud.')]),
 ('solicitud-prorroga.docx', 'Solicitud de prórroga del proyecto', [
  ('Plazo vigente y plazo solicitado', 'Indique la fecha de terminación aprobada, la nueva fecha solicitada y el tiempo adicional requerido.'),
  ('Estado actual y causas', 'Describa el avance y las circunstancias que justifican la ampliación. Incluya fechas y evidencias.'),
  ('Plan para completar el proyecto', 'Relacione actividades, responsables y entregables pendientes. Adjunte el cronograma actualizado.'),
  ('Impacto presupuestal y anexos', 'Declare si cambia el presupuesto y relacione los soportes. La prórroga no autoriza automáticamente nuevos recursos.')]),
 ('informe-avance.docx', 'Informe de avance del proyecto', [
  ('Periodo informado y resumen', 'Indique las fechas de inicio y corte del informe. Resuma el avance frente al plan aprobado.'),
  ('Cumplimiento de objetivos', 'Para cada objetivo, indique actividades realizadas, avance verificable, resultado y referencia a la evidencia.'),
  ('Ejecución presupuestal', 'Informe presupuesto aprobado, ejecución y saldo por rubro. Explique desviaciones y adjunte soportes.'),
  ('Dificultades y siguiente periodo', 'Describa riesgos, medidas correctivas y actividades previstas con responsables y fechas.')]),
 ('informe-final.docx', 'Informe final de investigación', [
  ('Resumen y alcance ejecutado', 'Explique el propósito, periodo ejecutado, metodología aplicada y principales resultados.'),
  ('Resultados y cumplimiento de objetivos', 'Relacione cada objetivo con resultados, limitaciones y evidencia verificable.'),
  ('Productos y evidencias', 'Complete la tabla de productos. Incluya enlaces, identificadores o anexos que permitan comprobar cada entrega.'),
  ('Conclusiones y ejecución financiera', 'Exponga conclusiones y recomendaciones. Resuma el presupuesto ejecutado y relacione los soportes financieros exigidos.'),
  ('Referencias y anexos', 'Liste fuentes, anexos y documentos pendientes si los hay. No declare certificaciones que no hayan sido expedidas.')]),
]
for filename, title, sections in templates:
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = sec.bottom_margin = Inches(.7)
    sec.left_margin = sec.right_margin = Inches(.8)
    normal = doc.styles['Normal']; normal.font.name = 'Calibri'; normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(4)
    doc.styles['Title'].font.color.rgb = RGBColor(0, 0, 0)
    doc.styles['Title'].font.size = Pt(23)
    doc.styles['Heading 1'].paragraph_format.space_before = Pt(10)
    doc.styles['Heading 1'].paragraph_format.space_after = Pt(4)
    for style in doc.styles:
        for border in list(style.element.xpath('.//w:pBdr')):
            border.getparent().remove(border)
    sec.header.paragraphs[0].text = 'SEED   |   Formatos de investigación'
    doc.add_paragraph(title, 'Title')
    doc.add_paragraph('Modelo base editable versión 1   •   Noviembre de 2026')
    doc.add_paragraph('Complete los campos y sustituya las instrucciones por información del proyecto. Este modelo requiere validación institucional; no constituye un formato oficial aprobado. Exporte el documento diligenciado al formato admitido por el requisito antes de adjuntarlo en Seed.')
    table = doc.add_table(rows=0, cols=2); table.style = 'Light Shading Accent 1'
    for label in ['Nombre del proyecto', 'Código o radicado del proyecto', 'Investigador principal', 'Grupo y facultad', 'Fecha de elaboración']:
        cells=table.add_row().cells; cells[0].text=label; cells[1].text='[Completar]'
    for heading, instruction in sections:
        doc.add_heading(heading, 1)
        doc.add_paragraph(instruction)
        if heading == 'Productos y evidencias':
            table=doc.add_table(rows=1, cols=4); table.style='Light Shading Accent 1'
            for cell,label in zip(table.rows[0].cells,['Producto comprometido','Resultado entregado','Estado','Evidencia']): cell.text=label
            for _ in range(3):
                for cell in table.add_row().cells: cell.text='[Completar]'
        else:
            doc.add_paragraph('[Escriba aquí]')
    sec.footer.paragraphs[0].text='Seed • Modelo base para revisión institucional • Complete y revise antes de radicar'
    doc.save(OUT/filename)
    print(filename)
