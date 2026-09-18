import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { columnType, statusClass } from '../../utils/tableSchema';
import { money, formatDate } from '../../utils/formatters';

export function DataTable({ columns = [], rows = [], renderActions }) {
  const [sort, setSort] = useState({ column: '', direction: 1 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const sorted = useMemo(() => {
    if (!sort.column) return rows;
    const numeric = ['money', 'percent'].includes(columnType(sort.column));
    return [...rows].sort((a, b) => {
      const av = a[sort.column], bv = b[sort.column];
      return (numeric ? Number(av || 0) - Number(bv || 0) : String(av ?? '').localeCompare(String(bv ?? ''), 'id', { numeric: true })) * sort.direction;
    });
  }, [rows, sort]);
  const lastPage = Math.max(0, Math.ceil(sorted.length / size) - 1);
  const current = Math.min(page, lastPage);
  if (!rows.length) return <div className="table-empty"><span><Inbox size={26}/></span><strong>Belum ada data untuk ditampilkan</strong><p>Sesuaikan filter atau tambahkan data melalui tombol Tambah.</p></div>;
  return <div className="table-container"><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map(col => <th key={col} aria-sort={sort.column === col ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'} className={['money','percent'].includes(columnType(col)) ? 'numeric' : ''}><button className="sort-heading" onClick={() => {setSort({column:col,direction:sort.column === col ? -sort.direction : 1});setPage(0);}}>{col}{sort.column !== col ? <ArrowUpDown size={12}/> : sort.direction === 1 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</button></th>)}{renderActions && <th className="sticky-actions">Aksi</th>}</tr></thead><tbody>{sorted.slice(current * size, (current + 1) * size).map((row,i) => <tr key={row.ID ?? i}>{columns.map(col => <td key={col} className={['money','percent'].includes(columnType(col)) ? 'numeric' : ''}>{formatCell(col,row[col])}</td>)}{renderActions && <td className="sticky-actions"><div className="row-actions">{renderActions(row)}</div></td>}</tr>)}</tbody></table></div><div className="table-pagination"><span>{current * size + 1}–{Math.min((current + 1) * size, rows.length)} dari <strong>{rows.length}</strong> data</span><div><label>Baris <select aria-label="Baris per halaman" value={size} onChange={e => {setSize(Number(e.target.value));setPage(0);}}>{[10,25,50].map(n => <option key={n}>{n}</option>)}</select></label><button className="icon-btn" aria-label="Halaman sebelumnya" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={16}/></button><span>{current + 1} / {lastPage + 1}</span><button className="icon-btn" aria-label="Halaman berikutnya" disabled={current === lastPage} onClick={() => setPage(current + 1)}><ChevronRight size={16}/></button></div></div></div>;
}
function formatCell(column,value) {
  if (value === undefined || value === null || value === '') return <span className="dim">—</span>;
  const type = columnType(column);
  if (type === 'money') return Number.isFinite(Number(value)) ? money.format(Number(value)) : <span className="dim">—</span>;
  if (type === 'percent') return `${new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(Number(value))}%`;
  if (type === 'date') return formatDate(value);
  if (/Status|Prioritas|Kontrol|Active/.test(column)) return <span className={`status ${statusClass(value)}`}>{typeof value === 'boolean' ? (value ? 'Aktif' : 'Nonaktif') : String(value)}</span>;
  if (column === 'Brand') return <span className="brand-tag"><span>{String(value).slice(0,1)}</span>{String(value)}</span>;
  return <span className="cell-text" title={String(value)}>{String(value)}</span>;
}
