import { useState, useEffect, useMemo, Fragment } from 'react';
import { Pencil, Info, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { notify } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { getForecastBudget, saveForecastBudgetLine } from '../api/financeApi';
import { Modal } from '../components/ui/Modal';
import MetricCard from '../components/ui/MetricCard';
import { LINE_ITEMS, GROUP_LABELS, computeLineValues } from '../utils/forecastLineItems';
import { money, pct } from '../utils/formatters';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const QUARTER_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] };
const LEAF_ITEMS = LINE_ITEMS.filter(item => !item.computed);

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
  const [entryModal, setEntryModal] = useState(null); // { mode: 'add' | 'edit', brandKey, bulan, lineKey, label?, nilaiAnggaran, nilaiRealisasi, keterangan }
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const toggleGroup = (group) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(group) ? next.delete(group) : next.add(group);
    return next;
  });

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
      .catch(err => { console.error(err); notify.error(err.message || 'Gagal memuat data budget.'); })
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
    setEntryModal({
      mode: 'edit', brandKey: filters.brandKey, bulan: selectedMonth, lineKey: item.key, label: item.label,
      nilaiAnggaran: existing?.nilaiAnggaran || 0,
      nilaiRealisasi: existing?.nilaiRealisasi || 0,
      keterangan: existing?.keterangan || '',
    });
  };

  // Entry point for adding data regardless of the current Brand/Period filter
  // state — the modal itself lets you pick which brand, month, and P&L line
  // to write to, since "Semua Brand" or a quarter/year view has no single
  // target row to edit in place.
  const openAdd = () => {
    setEntryModal({
      mode: 'add',
      brandKey: filters.brandKey || brandKeysInScope[0] || '',
      bulan: periodMode === 'bulan' ? selectedMonth : 1,
      lineKey: LEAF_ITEMS[0].key,
      nilaiAnggaran: 0, nilaiRealisasi: 0, keterangan: '',
    });
  };

  const handleSave = async (form) => {
    try {
      await saveForecastBudgetLine({
        brandKey: form.brandKey, tahun, bulan: form.bulan, lineKey: form.lineKey,
        nilaiAnggaran: form.nilaiAnggaran, nilaiRealisasi: form.nilaiRealisasi, keterangan: form.keterangan,
      }, session);
      setEntryModal(null);
      notify.success('Baris anggaran tersimpan.\nAnggaran & realisasi untuk periode ini sudah diperbarui.');
      const fresh = await getForecastBudget({ tahun, brandKey: filters.brandKey }, session);
      setRows(fresh);
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Gagal menyimpan.');
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
        <MetricCard
          label="Omzet" color="teal" value={money.format(realisasi.omzet)}
          note={`Anggaran ${money.format(anggaran.omzet)} · Capaian ${pct.format(anggaran.omzet ? realisasi.omzet / anggaran.omzet : 0)}`}
          arti="Realisasi pendapatan dibanding anggaran pada periode terpilih." rumus="Σ Nilai Realisasi (Omzet)"
        />
        <MetricCard
          label="Laba Kotor" color="blue" value={money.format(realisasi.laba_kotor)}
          note={`Anggaran ${money.format(anggaran.laba_kotor)}`}
          arti="Omzet dikurangi COGS dan PPN — margin sebelum beban operasional." rumus="Omzet − COGS − PPN"
        />
        <MetricCard
          label="Beban Operasional" color="amber" value={money.format(realisasi.beban_operasional_total)}
          note={`Anggaran ${money.format(anggaran.beban_operasional_total)}`}
          arti="Total realisasi seluruh kategori beban (HR, SGA, Marketing, Produksi, Sewa, Penyusutan, OPEX, Lainnya)."
          rumus="Σ (HR + SGA + Pemasaran + Produksi + Sewa + Penyusutan + OPEX + Lainnya)"
        />
        <MetricCard
          label="Laba Bersih Setelah Pajak" color={realisasi.laba_setelah_pajak >= 0 ? 'green' : 'rose'} value={money.format(realisasi.laba_setelah_pajak)}
          note={`Anggaran ${money.format(anggaran.laba_setelah_pajak)}`}
          arti="Hasil akhir P&L — laba yang benar-benar tersisa setelah semua beban dan pajak." rumus="Laba Sebelum Pajak − Pajak Penghasilan"
          glow
        />
      </div>

      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3>Laporan Anggaran & Realisasi (P&L)</h3>
            <p>{loading ? 'Memuat...' : `${rows.length} baris data tersimpan untuk tahun ${tahun}`}</p>
          </div>
          {canEdit && (
            <div className="row-actions">
              <button className="btn blue" onClick={openAdd}>
                <Plus size={16} /> Tambah Data
              </button>
            </div>
          )}
        </div>
        <div className="data-table-wrap fc-table-wrap">
          <table className="data-table fc-table">
            <thead>
              <tr>
                <th>Uraian</th>
                <th>PIC</th>
                <th className="fc-num">Nilai Anggaran</th>
                <th className="fc-num">% thd Omzet</th>
                <th className="fc-num">Nilai Realisasi</th>
                <th className="fc-num">% thd Omzet</th>
                <th className="fc-num">Sisa Anggaran</th>
                <th className="fc-num">Capaian</th>
                <th>Keterangan</th>
                {canEditNow && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {LINE_ITEMS.map(item => {
                const showHeader = item.group && item.group !== lastGroup;
                if (item.group) lastGroup = item.group;
                const groupCollapsed = item.group && collapsedGroups.has(item.group);
                if (groupCollapsed && !showHeader) return null;
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
                      <tr className="fc-row-group" onClick={() => toggleGroup(item.group)}>
                        <td colSpan={canEditNow ? 10 : 9}>
                          {collapsedGroups.has(item.group) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                          {' '}{GROUP_LABELS[item.group] || item.group}
                        </td>
                      </tr>
                    )}
                    {!groupCollapsed && (
                      <tr className={rowClass}>
                        <td className={item.group && !item.subtotal && !item.highlight ? 'fc-indent' : ''}>{item.label}</td>
                        <td>{item.pic || <span className="dim">-</span>}</td>
                        <td className="fc-num">{money.format(a)}</td>
                        <td className="fc-num">{pct.format(targetPct)}</td>
                        <td className="fc-num">{money.format(r)}</td>
                        <td className="fc-num">{pct.format(realPct)}</td>
                        <td className={`fc-num ${sisa < 0 ? 'fc-negative' : ''}`}>{money.format(sisa)}</td>
                        <td className="fc-num">{capaian === null ? '-' : pct.format(capaian)}</td>
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
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!entryModal}
        onClose={() => setEntryModal(null)}
        title={entryModal ? (entryModal.mode === 'edit' ? `Edit: ${entryModal.label}` : 'Tambah Data Anggaran & Realisasi') : ''}
      >
        {entryModal && (
          <ForecastLineForm
            values={entryModal}
            brands={brands}
            tahun={tahun}
            onCancel={() => setEntryModal(null)}
            onSubmit={handleSave}
          />
        )}
      </Modal>
    </>
  );
}

function ForecastLineForm({ values, brands, tahun, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    brandKey: values.brandKey, bulan: values.bulan, lineKey: values.lineKey,
    nilaiAnggaran: values.nilaiAnggaran, nilaiRealisasi: values.nilaiRealisasi, keterangan: values.keterangan,
  });
  const isAdd = values.mode === 'add';
  const canSubmit = !isAdd || !!form.brandKey;

  return (
    <form onSubmit={e => { e.preventDefault(); if (canSubmit) onSubmit(form); }}>
      <div className="modal-form">
        {isAdd ? (
          <>
            <div className="form-group">
              <label>Brand</label>
              <select value={form.brandKey} onChange={e => setForm({ ...form, brandKey: e.target.value })} required>
                <option value="">Pilih Brand</option>
                {brands.map(b => <option key={b['Brand Key']} value={b['Brand Key']}>{b.Company} - {b.Brand}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Bulan ({tahun})</label>
              <select value={form.bulan} onChange={e => setForm({ ...form, bulan: Number(e.target.value) })}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Baris P&L</label>
              <select value={form.lineKey} onChange={e => setForm({ ...form, lineKey: e.target.value })}>
                {Object.entries(GROUP_LABELS).map(([group, groupLabel]) => (
                  <optgroup key={group} label={groupLabel}>
                    {LEAF_ITEMS.filter(item => item.group === group).map(item => (
                      <option key={item.key} value={item.key}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </>
        ) : (
          <p className="note" style={{ marginBottom: '0.4rem' }}>{values.brandKey} · {MONTHS[values.bulan - 1]} {tahun}</p>
        )}
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
        <button type="submit" className="btn blue" disabled={!canSubmit}>Simpan</button>
      </div>
    </form>
  );
}
