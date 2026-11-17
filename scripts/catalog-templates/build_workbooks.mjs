import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'public/templates/catalog');
const previews = path.join(process.env.TEMP, 'seed-catalog-previews');
await fs.mkdir(previews, { recursive: true });
function sheet(wb, name, title, headers, widths) {
  const s = wb.worksheets.add(name); s.showGridLines = false;
  s.getRange('A1').values = [[title]];
  s.getRange('A2').values = [['Modelo base v1 • Requiere validación institucional • Valores monetarios en COP']];
  s.getRange('A3').values = [['Proyecto y responsable: [Completar]']];
  s.getRange('A4').values = [['Celdas amarillas: entradas. Celdas grises: cálculos. Exporte a PDF si el requisito lo exige.']];
  s.getRangeByIndexes(5, 0, 1, headers.length).values = [headers];
  s.getRangeByIndexes(0, 0, 22, headers.length).format.font = { name: 'Arial', size: 11 };
  s.getRange('A1').format.font = { name: 'Arial', size: 16, bold: true };
  s.getRange('A1:A4').format.rowHeight = 28;
  s.getRangeByIndexes(5, 0, 1, headers.length).format = { fill: '#14281D', font: { color: '#FFFFFF', bold: true }, wrapText: true, rowHeight: 42 };
  widths.forEach((width,i) => { s.getRangeByIndexes(0,i,22,1).format.columnWidth = width; });
  s.getRangeByIndexes(6,0,12,headers.length).format = { fill: '#FFF4CC', rowHeight: 28, wrapText: true };
  s.freezePanes.freezeRows(6);
  return s;
}
for (const kind of ['presupuesto-cronograma','cuadro-rubros','cronograma-actualizado']) {
  const wb = Workbook.create();
  const sheets = [];
  if (kind === 'presupuesto-cronograma') {
    const s=sheet(wb,'Presupuesto','Presupuesto del proyecto',['Rubro','Descripción','Cantidad','Valor unitario COP','Total COP'],[25,40,15,24,24]); sheets.push(s);
    for(let r=7;r<=18;r++) s.getRange(`E${r}`).formulas=[[`=IF(OR(C${r}="",D${r}=""),"",C${r}*D${r})`]];
    s.getRange('E7:E19').setNumberFormat('#,##0'); s.getRange('D7:D18').setNumberFormat('#,##0');
    s.getRange('E7:E19').format.fill='#EEEEEE'; s.getRange('D19').values=[['TOTAL COP']]; s.getRange('E19').formulas=[['=SUM(E7:E18)']];
    s.getRange('C7:D7').values=[[2,150000]]; wb.recalculate();
    const check=s.getRange('E7').values[0][0]; if(check!==300000) throw new Error('Budget formula failed');
    s.getRange('C7:D7').clear({applyTo:'contents'});
  }
  if (kind === 'cuadro-rubros') {
    const s=sheet(wb,'Rubros','Comparativo de modificación presupuestal',['Rubro','Aprobado COP','Propuesto COP','Variación COP','Variación porcentual','Justificación'],[28,23,23,23,23,44]); sheets.push(s);
    for(let r=7;r<=18;r++) {
      s.getRange(`D${r}`).formulas=[[`=IF(OR(B${r}="",C${r}=""),"",C${r}-B${r})`]];
      s.getRange(`E${r}`).formulas=[[`=IF(OR(B${r}="",C${r}=""),"",IF(B${r}=0,"No aplica",D${r}/B${r}))`]];
    }
    s.getRange('B7:D19').setNumberFormat('#,##0'); s.getRange('E7:E18').setNumberFormat('0.0%'); s.getRange('D7:E18').format.fill='#EEEEEE';
    s.getRange('A19').values=[['TOTAL COP']]; for(const col of ['B','C','D']) s.getRange(`${col}19`).formulas=[[`=SUM(${col}7:${col}18)`]];
    s.getRange('B7:C7').values=[[100000,125000]]; wb.recalculate();
    if(s.getRange('D7').values[0][0]!==25000) throw new Error('Variation formula failed');
    s.getRange('B7:C7').clear({applyTo:'contents'});
  } else {
    const s=sheet(wb,'Cronograma','Cronograma de actividades y entregables',['Actividad','Responsable','Inicio','Fin','Avance','Entregable o evidencia'],[38,28,19,19,16,43]); sheets.push(s);
    s.getRange('C7:D18').setNumberFormat('dd/mm/yyyy'); s.getRange('E7:E18').setNumberFormat('0%');
    s.getRange('A20').values=[['Ingrese fechas reales en Inicio y Fin. Avance: número entre 0 y 1 (por ejemplo, 0,5 = 50 %).']];
  }
  wb.recalculate();
  console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:5},summary:kind})).ndjson);
  await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(out, `${kind}.xlsx`));
  for(const s of sheets) {
    const image=await wb.render({sheetName:s.name,range:'A1:F20',scale:1,format:'png'});
    await fs.writeFile(path.join(previews,`${kind}-${s.name}.png`),new Uint8Array(await image.arrayBuffer()));
  }
  console.log(`Created ${kind}.xlsx`);
}
