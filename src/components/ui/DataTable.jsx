export function DataTable({ columns, rows, renderActions }) {
  if (!rows || !rows.length) {
    return <div className="empty">Belum ada data.</div>;
  }
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
            {renderActions && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.ID || i}>
              {columns.map((col) => (
                <td key={col}>{formatCell(col, row[col])}</td>
              ))}
              {renderActions && <td><div className="row-actions">{renderActions(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(col, value) {
  if (value === undefined || value === null || value === '') return <span className="dim">-</span>;
  if (isMoneyColumn(col)) return formatIDR(value);
  if (/%|Capaian|Progress/i.test(col)) return formatPct(value);
  if (/Status|Prioritas|Kontrol|Active/i.test(col)) {
    return <span className={`status ${statusClass(value)}`}>{String(value)}</span>;
  }
  return String(value);
}

function formatIDR(v) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v || 0));
}

function formatPct(v) {
  return new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 1 }).format(Number(v || 0));
}

function isMoneyColumn(col) {
  return (/Nominal|Jumlah|Biaya|Total|Saldo|Pemasukan|Pengeluaran|Sisa|Hutang|Piutang|Target|Realisasi|Selisih/i.test(col) && !/%|Capaian|Progress/i.test(col));
}

function statusClass(value) {
  const text = String(value).toLowerCase();
  if (/approved|lunas|ok|paid|high|true|aktif/.test(text)) return 'ok';
  if (/diajukan|pending|termin|dp|medium|revision|terlambat|partially/.test(text)) return 'warn';
  if (/reject|tolak|belum|low|false|nonaktif|cancel/.test(text)) return 'bad';
  return 'info';
}
