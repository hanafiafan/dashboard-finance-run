import { columnType } from './tableSchema.js';

export function safeCsvValue(value) {
  let text = String(value ?? '');
  // Spreadsheet apps interpret formula-leading text when opening CSV files.
  if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function buildCsv(columns, rows) {
  return '\uFEFF' + [columns.map(safeCsvValue).join(','), ...rows.map(row => columns.map(column => safeCsvValue(row[column])).join(','))].join('\r\n');
}
export function typedValue(column, value) {
  if (value === '' || value == null) return null;
  const type = columnType(column);
  if (type === 'money' || type === 'percent') {
    const number = Number(value);
    return Number.isFinite(number) ? (type === 'percent' ? number / 100 : number) : String(value);
  }
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    const parsed = new Date(String(value).slice(0,10) + 'T00:00:00Z');
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return typeof value === 'boolean' ? (value ? 'Aktif' : 'Nonaktif') : String(value);
}

export async function createExportWorkbook({ title, columns, rows, filters = {}, demo = false, createdAt = new Date() }) {
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = 'RUN Finance'; book.created = createdAt;
  const sheet = book.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 6, showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const width = Math.max(columns.length, 2);
  const mergedLine = (row, text, size, color, background) => {
    sheet.mergeCells(row, 1, row, width);
    const cell = sheet.getCell(row,1); cell.value = text;
    cell.font = { name: 'Calibri', size, bold: row === 1, color: { argb: color } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: background } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  };
  mergedLine(1, `RUN FINANCE / ${title}`, 18, 'FFFFFFFF', 'FF30392B'); sheet.getRow(1).height = 40;
  mergedLine(2, demo ? 'DATA DEMO — contoh untuk pengujian, bukan transaksi produksi.' : 'Sumber: data aplikasi RUN Finance sesuai cakupan akses pengguna.', 10, 'FF686F62', 'FFF5F5EF'); sheet.getRow(2).height = 25;
  mergedLine(3, `Diekspor: ${createdAt.toLocaleString('id-ID')}  |  ${rows.length} baris  |  Mata uang: IDR`, 10, 'FF686F62', 'FFFFFFFF'); sheet.getRow(3).height = 25;
  const labels = { company: 'Perusahaan', brandKey: 'Brand', category: 'Kategori', startDate: 'Dari', endDate: 'Sampai', year: 'Tahun', search: 'Pencarian', period: 'Periode' };
  const scope = Object.entries(filters).filter(([,v]) => v !== '' && v != null).map(([k,v]) => `${labels[k] || k}: ${v}`).join(' · ');
  mergedLine(4, scope || 'Cakupan: seluruh data yang tersedia pada tabel ini.', 10, 'FF686F62', 'FFFFFFFF'); sheet.getRow(4).height = 32;
  sheet.getRow(5).height = 12;
  const header = sheet.getRow(6); header.values = columns; header.height = 34;
  header.eachCell(cell => {cell.font = { name:'Calibri', size:11, bold:true, color:{argb:'FFFFFFFF'} };cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDA683F'}};cell.alignment={vertical:'middle',wrapText:true};});
  columns.forEach((column,index) => {
    const type = columnType(column);
    sheet.getColumn(index + 1).width = type === 'money' ? 23 : type === 'percent' ? 16 : /Keterangan|Catatan|Feedback|Alamat/.test(column) ? 42 : type === 'date' ? 18 : Math.min(30,Math.max(19,column.length + 3));
  });
  rows.forEach((record,index) => {
    const row = sheet.getRow(index + 7); row.values = columns.map(column => typedValue(column,record[column])); row.height=32;
    row.eachCell({includeEmpty:true}, (cell,c) => {
      const type = columnType(columns[c-1]);
      cell.font={name:'Calibri',size:11,color:{argb:'FF30392B'}};
      cell.alignment={vertical:'middle',wrapText:true,horizontal:['money','percent'].includes(type)?'right':'left'};
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:index % 2 ? 'FFF4F5F0':'FFFFFFFF'}};
      cell.border={bottom:{style:'hair',color:{argb:'FFE3E6DE'}}};
      if(type==='money')cell.numFmt='"Rp" #,##0;[Red]("Rp" #,##0);"Rp" 0';
      if(type==='percent')cell.numFmt='0.0%';
      if(type==='date')cell.numFmt='dd mmm yyyy';
    });
  });
  sheet.autoFilter={from:{row:6,column:1},to:{row:Math.max(6,rows.length+6),column:columns.length}};
  sheet.pageSetup.printTitlesRow='1:6';
  sheet.headerFooter.oddFooter='&LRUN Finance&CHalaman &P dari &N&R&D';
  return book;
}
function download(blob,filename) {
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(() => URL.revokeObjectURL(url),1000);
}
export async function exportData(config,format) {
  const name=`run-${config.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${new Date().toISOString().slice(0,10)}`;
  if(format==='csv') return download(new Blob([buildCsv(config.columns,config.rows)],{type:'text/csv;charset=utf-8'}),`${name}.csv`);
  const book=await createExportWorkbook(config);
  download(new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${name}.xlsx`);
}
