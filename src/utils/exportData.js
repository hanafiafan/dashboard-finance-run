import { columnType, statusClass } from './tableSchema.js';

const STATUS_COLORS = {
  ok: { fill: 'FFE6F4EA', text: 'FF1E7B34' },
  warn: { fill: 'FFFCEEDC', text: 'FFB35C00' },
  bad: { fill: 'FFFBE7E6', text: 'FFC10801' },
  info: { fill: 'FFF1F1EF', text: 'FF686F62' },
};

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

function sheetName(title) {
  const cleaned = String(title || 'Data').replace(/[:\\/?*[\]]/g, '').trim();
  return (cleaned || 'Data').slice(0, 31);
}

export async function createExportWorkbook({ title, columns, rows, filters = {}, demo = false, createdAt = new Date(), preparedBy = '', preparedRole = '' }) {
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = preparedBy || 'RUN Finance'; book.created = createdAt;
  book.title = `RUN Finance — ${title}`; book.subject = 'Laporan Keuangan'; book.company = 'RUN Finance';
  const sheet = book.addWorksheet(sheetName(title), { views: [{ state: 'frozen', ySplit: 7, showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
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
  mergedLine(5, `Diekspor oleh: ${preparedBy || '—'}${preparedRole ? ` (${preparedRole})` : ''}`, 10, 'FF686F62', 'FFFFFFFF'); sheet.getRow(5).height = 25;
  sheet.getRow(6).height = 12;
  const header = sheet.getRow(7); header.values = columns; header.height = 34;
  header.eachCell(cell => {cell.font = { name:'Calibri', size:11, bold:true, color:{argb:'FFFFFFFF'} };cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDA683F'}};cell.alignment={vertical:'middle',wrapText:true};});
  // Fit each column to its widest actual value (not just the header label) — a
  // narrow-but-long-content column (URLs, long notes) used to wrap into extra
  // lines that the old fixed row height below then silently clipped.
  const MAX_TEXT_WIDTH = 48;
  const widths = columns.map(column => {
    const type = columnType(column);
    if (type === 'money') return 23;
    if (type === 'percent') return 16;
    if (type === 'date') return 18;
    const longest = rows.reduce((max, record) => Math.max(max, String(record[column] ?? '').length), column.length);
    return Math.min(MAX_TEXT_WIDTH, Math.max(14, longest + 2));
  });
  columns.forEach((column,index) => { sheet.getColumn(index + 1).width = widths[index]; });
  // Row height must grow with however many lines the wrapped text actually
  // needs — a fixed height clips any line past what that fixed height allows.
  const LINE_HEIGHT = 14;
  const lineCount = (text, colWidth) => {
    const str = String(text ?? '');
    if (!str) return 1;
    return str.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / colWidth)), 0);
  };
  const DATA_START = 8;
  rows.forEach((record,index) => {
    const row = sheet.getRow(index + DATA_START); row.values = columns.map(column => typedValue(column,record[column]));
    const maxLines = columns.reduce((max, column, i) => {
      const type = columnType(column);
      if (type === 'money' || type === 'percent' || type === 'date') return max;
      return Math.max(max, lineCount(record[column], widths[i]));
    }, 1);
    row.height = Math.max(20, maxLines * LINE_HEIGHT + 6);
    row.eachCell({includeEmpty:true}, (cell,c) => {
      const column = columns[c-1];
      const type = columnType(column);
      cell.font={name:'Calibri',size:11,color:{argb:'FF30392B'}};
      cell.alignment={vertical:'middle',wrapText:true,horizontal:['money','percent'].includes(type)?'right':'left'};
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:index % 2 ? 'FFF4F5F0':'FFFFFFFF'}};
      cell.border={bottom:{style:'hair',color:{argb:'FFE3E6DE'}}};
      if(type==='money')cell.numFmt='"Rp" #,##0;[Red]("Rp" #,##0);"Rp" 0';
      if(type==='percent')cell.numFmt='0.0%';
      if(type==='date')cell.numFmt='dd mmm yyyy';
      if(/URL/i.test(column) && cell.value) {
        cell.value = { text: String(cell.value), hyperlink: String(cell.value) };
        cell.font = { ...cell.font, color: { argb: 'FF1155CC' }, underline: true };
      }
      // Colour-code Status-like columns the same way the on-screen table badges
      // do, so a printed report is scannable at a glance without opening the app.
      if(/^status$/i.test(column) && cell.value) {
        const palette = STATUS_COLORS[statusClass(cell.value)];
        cell.font = { ...cell.font, bold: true, color: { argb: palette.text } };
        cell.fill = { type:'pattern', pattern:'solid', fgColor: { argb: palette.fill } };
      }
    });
  });
  // Totals row — sums every money column, so a report reader doesn't have to
  // open the file in a spreadsheet app just to know the grand total.
  const moneyColumns = columns.filter(column => columnType(column) === 'money');
  if (moneyColumns.length && rows.length) {
    const totalsRow = sheet.getRow(rows.length + DATA_START);
    totalsRow.height = 30;
    sheet.getCell(totalsRow.number, 1).value = 'TOTAL';
    columns.forEach((column, i) => {
      if (columnType(column) !== 'money') return;
      const cell = sheet.getCell(totalsRow.number, i + 1);
      cell.value = rows.reduce((sum, record) => sum + (Number(record[column]) || 0), 0);
      cell.numFmt = '"Rp" #,##0;[Red]("Rp" #,##0);"Rp" 0';
    });
    totalsRow.eachCell({ includeEmpty: true }, (cell, c) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF30392B' } };
      cell.alignment = { vertical: 'middle', horizontal: columnType(columns[c-1]) === 'money' ? 'right' : 'left' };
      cell.border = { top: { style: 'thin', color: { argb: 'FF30392B' } } };
    });
  }
  sheet.autoFilter={from:{row:header.number,column:1},to:{row:Math.max(header.number,rows.length+DATA_START-1),column:columns.length}};
  sheet.pageSetup.printTitlesRow=`1:${header.number}`;
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
