import { useState, useEffect, useMemo, Fragment } from 'react';
import { Pencil, Info } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getForecastBudget, saveForecastBudgetLine } from '../api/financeApi';
import { Modal } from '../components/ui/Modal';
import MetricCard from '../components/ui/MetricCard';
import { LINE_ITEMS, GROUP_LABELS, computeLineValues } from '../utils/forecastLineItems';
import { money, pct } from '../utils/formatters';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const QUARTER_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] };

export function ForecastingControlling() {
  const { app } = useApp();
  const { session } = useAuth();
  const filters = app.filters;

  const [tahun, setTahun] = useState(Number(filters.year) || new Date().getFullYear());
  const [periodMode, setPeriodMode] = useState('bulan'); // bulan | kuartal | tahun
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const canEdit = app.state?.entities?.forecastBudget?.canEdit;
  const brands = app.state?.brands || [];
  const scopedBrands = filters.brandKey
    ? brands.filter(b => b['Brand Key'] === filters.brandKey)
    : filters.company
      ? brands.filter(b => b.Company === filters.company)
      : brands;
  const brandKeysInScope = scopedBrands.map(b => b['Brand Key']);

  useEffect(() => {
    setLoading(true);
    getForecastBudget({ tahun, brandKey: filters.brandKey }, session)
      .then(setRows)
      .catch(err => { console.error(err); alert(`Gagal memuat data budget: ${err.message || err}`); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, filters.brandKey, session]);

  const includedMonths = periodMode === 'bulan' ? [selectedMonth]
    : periodMode === 'kuartal' ? QUARTER_MONTHS[selectedQuarter]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const raw = useMemo(() => {
    const bucket = {};
    for (const item of LINE_ITEMS) {
      if (!item.computed) bucket[item.key] = { anggaran: 0, realisasi: 0, notes: [] };
    }
    for (const row of rows) {
      if (!brandKeysInScope.includes(row.brandKey)) continue;
      if (!includedMonths.includes(row.bulan)) continue;
      const b = bucket[row.lineKey];
      if (!b) continue;
      b.anggaran += row.nilaiAnggaran;
      b.realisasi += row.nilaiRealisasi;
      if (row.keterangan) b.notes.push(row.keterangan);
    }
    return bucket;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters.brandKey, filters.company, periodMode, selectedMonth, selectedQuarter, tahun]);

  const { anggaran, realisasi } = useMemo(() => computeLineValues(raw), [raw]);

  // Editing a single leaf line only makes sense against one exact brand + one
  // exact month — an aggregate (all brands, or a whole quarter/year) has no
  // single row to write back to.
  const canEditNow = canEdit && !!filters.brandKey && periodMode === 'bulan';

  const openEdit = (item) => {
    const existing = rows.find(r => r.brandKey === filters.brandKey && r.bulan === selectedMonth && r.lineKey === item.key);
    setEditItem({
      item,
      nilaiAnggaran: existing?.nilaiAnggaran || 0,
      nilaiRealisasi: existing?.nilaiRealisasi || 0,
      keterangan: existing?.keterangan || '',
    });
  };

  const handleSave = async (form) => {
    try {
      await saveForecastBudgetLine({
        brandKey: filters.brandKey, tahun, bulan: selectedMonth, lineKey: editItem.item.key,
        nilaiAnggaran: form.nilaiAnggaran, nilaiRealisasi: form.nilaiRealisasi, keterangan: form.keterangan,
      }, session);
      setEditItem(null);
      const fresh = await getForecastBudget({ tahun, brandKey: filters.brandKey }, session);
      setRows(fresh);
    } catch (err) {
      alert(err.message || 'Gagal menyimpan');
    }
  };

  const periodLabel = periodMode === 'bulan' ? MONTHS[selectedMonth - 1]
    : periodMode === 'kuartal' ? `Kuartal ${selectedQuarter}`
    : `Tahun ${tahun}`;

  let lastGroup = null;

  return (
    <>
      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3>Periode Forecasting & Controlling</h3>
            <p>Anggaran vs Realisasi — {filters.brandKey || 'Semua Brand'} · {periodLabel}</p>
          </div>
          <div className="row-actions" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ minWidth: 90 }}>
              {[tahun - 1, tahun, tahun + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="segmented">
              {['bulan', 'kuartal', 'tahun'].map(m => (
                <button key={m} className={periodMode === m ? 'active' : ''} onClick={() => setPeriodMode(m)}>
                  {m === 'bulan' ? 'Per Bulan' : m === 'kuartal' ? 'Per Kuartal' : 'Setahun'}
                </button>
              ))}
            </div>
            {periodMode === 'bulan' && (
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            )}
            {periodMode === 'kuartal' && (
              <select value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))}>
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Kuartal {q}</option>)}
              </select>
            )}
          </div>
        </div>
        {!filters.brandKey && (
          <div className="side-note" style={{ padding: '0 1.15rem 0.8rem', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Info size={14} /> Menampilkan total gabungan semua brand. Pilih satu Brand di filter untuk bisa mengedit angka.
          </div>
        )}
      </div>

      <div className="metric-grid">
        <MetricCard label="Omzet" color="teal" value={money.format(realisasi.omzet)} note={`Anggaran ${money.format(anggaran.omzet)}`} />
        <MetricCard label="Laba Kotor" color="blue" value={money.format(realisasi.laba_kotor)} note={`Anggaran ${money.format(anggaran.laba_kotor)}`} />
        <MetricCard label="Beban Operasional" color="amber" value={money.format(realisasi.beban_operasional_total)} note={`Anggaran ${money.format(anggaran.beban_operasional_total)}`} />
        <MetricCard label="Laba Bersih Setelah Pajak" color={realisasi.laba_setelah_pajak >= 0 ? 'green' : 'rose'} value={money.format(realisasi.laba_setelah_pajak)} note={`Anggaran ${money.format(anggaran.laba_setelah_pajak)}`} />
      </div>

      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3>Laporan Anggaran & Realisasi (P&L)</h3>
            <p>{loading ? 'Memuat...' : `${rows.length} baris data tersimpan untuk tahun ${tahun}`}</p>
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table fc-table">
            <thead>
              <tr>
                <th>Uraian</th>
                <th>PIC</th>
                <th>Nilai Anggaran</th>
                <th>% thd Omzet</th>
                <th>Nilai Realisasi</th>
                <th>% thd Omzet</th>
                <th>Sisa Anggaran</th>
                <th>Capaian</th>
                <th>Keterangan</th>
                {canEditNow && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {LINE_ITEMS.map(item => {
                const showHeader = item.group && item.group !== lastGroup;
                if (item.group) lastGroup = item.group;
                const a = anggaran[item.key] || 0;
                const r = realisasi[item.key] || 0;
                const targetPct = anggaran.omzet ? a / anggaran.omzet : 0;
                const realPct = realisasi.omzet ? r / realisasi.omzet : 0;
                const sisa = a - r;
                const capaian = a !== 0 ? r / a : (r !== 0 ? null : 0);
                const notes = raw[item.key]?.notes || [];
                const rowClass = item.highlight ? 'fc-row-highlight' : item.subtotal ? 'fc-row-subtotal' : '';
                return (
                  <Fragment key={item.key}>
                    {showHeader && (
                      <tr className="fc-row-group">
                        <td colSpan={canEditNow ? 10 : 9}>{GROUP_LABELS[item.group] || item.group}</td>
                      </tr>
                    )}
                    <tr className={rowClass}>
                      <td className={item.group && !item.subtotal && !item.highlight ? 'fc-indent' : ''}>{item.label}</td>
                      <td>{item.pic || <span className="dim">-</span>}</td>
                      <td>{money.format(a)}</td>
                      <td>{pct.format(targetPct)}</td>
                      <td>{money.format(r)}</td>
                      <td>{pct.format(realPct)}</td>
                      <td className={sisa < 0 ? 'fc-negative' : ''}>{money.format(sisa)}</td>
                      <td>{capaian === null ? '-' : pct.format(capaian)}</td>
                      <td className="fc-keterangan">{notes.length ? notes.join('; ') : <span className="dim">-</span>}</td>
                      {canEditNow && (
                        <td>
                          {!item.computed && (
                            <button className="icon-btn" title="Edit" onClick={() => openEdit(item)}>
                              <Pencil size={15} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title={editItem ? `Edit: ${editItem.item.label}` : ''}>
        {editItem && (
          <ForecastLineForm
            values={editItem}
            brandKey={filters.brandKey}
            monthLabel={MONTHS[selectedMonth - 1]}
            onCancel={() => setEditItem(null)}
            onSubmit={handleSave}
          />
        )}
      </Modal>
    </>
  );
}

function ForecastLineForm({ values, brandKey, monthLabel, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nilaiAnggaran: values.nilaiAnggaran,
    nilaiRealisasi: values.nilaiRealisasi,
    keterangan: values.keterangan,
  });
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div className="modal-form">
        <p className="note" style={{ marginBottom: '0.4rem' }}>{brandKey} · {monthLabel}</p>
        <div className="form-group">
          <label>Nilai Anggaran (Rp)</label>
          <input type="number" value={form.nilaiAnggaran} onChange={e => setForm({ ...form, nilaiAnggaran: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Nilai Realisasi (Rp)</label>
          <input type="number" value={form.nilaiRealisasi} onChange={e => setForm({ ...form, nilaiRealisasi: e.target.value })} />
        </div>
        <div className="form-group full-width">
          <label>Keterangan</label>
          <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn blue">Simpan</button>
      </div>
    </form>
  );
}
