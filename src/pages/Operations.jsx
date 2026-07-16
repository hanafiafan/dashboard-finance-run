import { useState, useEffect } from 'react';
import { Plus, Download, Search, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal, DynamicForm } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getRecords, saveRecord, deleteRecord } from '../api/financeApi';
import { ENTITY_LABELS, TABLE_COLUMNS, FORMS } from '../utils/constants';
import { number } from '../utils/formatters';

const ENTITIES = ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables'];

export function Operations() {
  const { app, setEntity, setRows } = useApp();
  const { session } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const entity = app.entity;
  const entityInfo = app.state?.entities?.[entity] || {};
  const canEdit = entityInfo.canEdit;
  const options = app.state?.options || {};
  const brands = app.state?.brands || [];

  useEffect(() => {
    if (entity) loadRecords();
  }, [entity, app.state]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const result = await getRecords(entity, app.filters, session);
      const rows = result.rows || [];
      setRecords(rows);
      setRows(entity, rows);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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
      await loadRecords();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus data ini?')) return;
    try {
      await deleteRecord(entity, id, session);
      await loadRecords();
    } catch (err) {
      alert(err.message || 'Gagal menghapus');
    }
  };

  const exportCsv = () => {
    if (!records.length) return alert('Tidak ada data untuk export.');
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
            {canEdit && (
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
            canEdit
              ? (row) => (
                  <>
                    <button className="icon-btn" onClick={() => openEdit(row)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    {row.ID && (
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
    </>
  );
}
