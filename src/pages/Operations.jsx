import { useState, useEffect } from 'react';
import { Plus, Download, Search, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal, DynamicForm } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getRecords, saveRecord, deleteRecord, createBankTransfer } from '../api/financeApi';
import { ENTITY_LABELS, TABLE_COLUMNS, FORMS } from '../utils/constants';
import { number } from '../utils/formatters';
import { notify } from '../components/ui/Toast';

const ENTITIES = ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables'];

// Moves cash between two of a brand's own Saldo Rekening accounts in one form
// instead of the manual 2-entry Cash Out + Cash In workaround — see
// createBankTransfer() for why (both legs are written atomically and tagged
// so dashboard KPIs don't double-count them as real revenue/expense).
function BankTransferModal({ isOpen, onClose, brands, session, onDone }) {
  const [brandKey, setBrandKey] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [banksInBrand, setBanksInBrand] = useState([]);

  // The Operations page's own bank list (app.state.options.bankList) is
  // fetched under whatever brand the global FilterBar currently has selected
  // — which may not match the brand picked here. Fetch fresh per brand so the
  // picker is always right regardless of what's filtered elsewhere.
  useEffect(() => {
    if (!brandKey) { setBanksInBrand([]); return; }
    let cancelled = false;
    getRecords('bank', { brandKey }, session).then(({ rows }) => {
      if (!cancelled) setBanksInBrand((rows || []).filter(b => b['ID Bank'] && b.Brand === brandKey));
    });
    return () => { cancelled = true; };
  }, [brandKey, session]);

  const reset = () => {
    setBrandKey(''); setSourceId(''); setDestId(''); setNominal(''); setCatatan(''); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandKey || !sourceId || !destId || !nominal) { setError('Semua field wajib diisi.'); return; }
    if (sourceId === destId) { setError('Bank asal dan tujuan tidak boleh sama.'); return; }
    const source = banksInBrand.find(b => b['ID Bank'] === sourceId);
    const dest = banksInBrand.find(b => b['ID Bank'] === destId);
    setBusy(true);
    setError('');
    try {
      await createBankTransfer({
        brandKey, tanggal,
        sourceBankId: sourceId, sourceBankName: source?.Bank,
        destBankId: destId, destBankName: dest?.Bank,
        nominal, catatan,
      }, session);
      reset();
      onDone();
      notify.success(`Transfer tercatat.\nRp ${number.format(Number(nominal) || 0)} dipindahkan dari ${source?.Bank || sourceId} ke ${dest?.Bank || destId}. Saldo kedua rekening sudah menyesuaikan.`);
    } catch (err) {
      setError(err.message || 'Gagal transfer.');
      notify.error(err.message || 'Gagal transfer.');
    }
    setBusy(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Antar Bank">
      <form onSubmit={handleSubmit}>
        <div className="modal-form">
          <div className="form-group">
            <label>Brand</label>
            <select value={brandKey} onChange={e => { setBrandKey(e.target.value); setSourceId(''); setDestId(''); }}>
              <option value="">Pilih Brand</option>
              {brands.map(b => <option key={b['Brand Key']} value={b['Brand Key']}>{b.Company} - {b.Brand}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Tanggal</label>
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Dari Bank</label>
            <select value={sourceId} onChange={e => setSourceId(e.target.value)} disabled={!brandKey}>
              <option value="">Pilih Bank Asal</option>
              {banksInBrand.map(b => <option key={b['ID Bank']} value={b['ID Bank']}>{b['ID Bank']} — {b.Bank}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Ke Bank</label>
            <select value={destId} onChange={e => setDestId(e.target.value)} disabled={!brandKey}>
              <option value="">Pilih Bank Tujuan</option>
              {banksInBrand.map(b => <option key={b['ID Bank']} value={b['ID Bank']}>{b['ID Bank']} — {b.Bank}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Nominal (Rp)</label>
            <input type="number" min="0" value={nominal} onChange={e => setNominal(e.target.value)} />
          </div>
          <div className="form-group full-width">
            <label>Catatan (opsional)</label>
            <input type="text" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: Isi ulang kas kecil" />
          </div>
        </div>
        {error && <p style={{ color: 'var(--rose)', fontSize: '0.8rem' }}>{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={handleClose} disabled={busy}>Batal</button>
          <button type="submit" className="btn blue" disabled={busy}>{busy ? 'Memproses...' : 'Transfer'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Operations() {
  const { app, setEntity, setRows } = useApp();
  const { session } = useAuth();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const entity = app.entity;
  const entityInfo = app.state?.entities?.[entity] || {};
  const canEdit = entityInfo.canEdit;
  const canInsert = entityInfo.canInsert ?? entityInfo.canEdit;
  const canDelete = entityInfo.canDelete ?? entityInfo.canEdit;
  const options = app.state?.options || {};
  const brands = app.state?.brands || [];
  // Transfer writes to fin_income/fin_outcome, not fin_bank — so it's gated on
  // those two entities' insert permission, not on 'bank' (which is finance-only
  // to register new accounts, but pic_brand can already record Cash In/Cash Out
  // for their own brand and should be able to transfer between them too).
  const canTransfer = Boolean(app.state?.entities?.income?.canEdit && app.state?.entities?.outcome?.canEdit);

  useEffect(() => {
    if (entity) loadRecords();
  }, [entity, app.state]);

  const loadRecords = async () => {
    try {
      const result = await getRecords(entity, app.filters, session);
      const rows = result.rows || [];
      setRecords(rows);
      setRows(entity, rows);
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Gagal memuat data.');
    }
  };

  const openAdd = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      const record = { ...(editRow || {}), ...formData };
      await saveRecord(entity, record, session);
      setModalOpen(false);
      notify.success(`${record.ID ? 'Perubahan tersimpan' : 'Data baru tersimpan'}.\n${ENTITY_LABELS[entity]} berhasil disimpan ke database.`);
      await loadRecords();
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Gagal menyimpan.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus data ini?')) return;
    try {
      await deleteRecord(entity, id, session);
      notify.success(`Data dihapus.\nSatu baris ${ENTITY_LABELS[entity]} dihapus permanen.`);
      await loadRecords();
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Gagal menghapus.');
    }
  };

  const exportCsv = () => {
    if (!records.length) return notify.warning('Tidak ada data untuk diexport.\nTabel ini masih kosong, atau filter yang aktif menyaring semua baris.');
    const cols = TABLE_COLUMNS[entity] || Object.keys(records[0]);
    const csv = [
      cols.join(','),
      ...records.map((row) =>
        cols.map((col) => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = records.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q));
  });

  return (
    <>
      <div className="tabs">
        {ENTITIES.filter((name) => app.state?.entities?.[name]).map((name) => (
          <button
            key={name}
            className={entity === name ? 'active' : ''}
            onClick={() => setEntity(name)}
          >
            {ENTITY_LABELS[name]}
          </button>
        ))}
      </div>

      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3>{ENTITY_LABELS[entity]}</h3>
            <p>{number.format(filtered.length)} data</p>
          </div>
          <div className="row-actions">
            {entity === 'bank' && canTransfer && (
              <button className="btn ghost" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight size={16} /> Transfer Antar Bank
              </button>
            )}
            {canInsert && (
              <button className="btn blue" onClick={openAdd}>
                <Plus size={16} /> Tambah
              </button>
            )}
          </div>
        </div>

        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Cari data..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn ghost" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
        </div>

        <DataTable
          columns={TABLE_COLUMNS[entity]}
          rows={filtered}
          renderActions={
            (canEdit || canDelete)
              ? (row) => (
                  <>
                    {canEdit && (
                      <button className="icon-btn" onClick={() => openEdit(row)} title="Edit">
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && row.ID && (
                      <button
                        className="icon-btn"
                        onClick={() => handleDelete(row.ID)}
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                )
              : null
          }
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editRow?.ID || editRow?.['Brand Key'] || editRow?.Email ? 'Edit' : 'Tambah'} ${ENTITY_LABELS[entity]}`}
      >
        <DynamicForm
          fields={FORMS[entity] || []}
          values={editRow || {}}
          options={{ ...options, brands }}
          onSubmit={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <BankTransferModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        brands={brands}
        session={session}
        onDone={() => { setTransferOpen(false); loadRecords(); }}
      />
    </>
  );
}
