import { useState, useEffect } from 'react';
import { Plus, Download, Search, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal, DynamicForm } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getRecords, saveRecord, deleteRecord } from '../api/financeApi';
import { ENTITY_LABELS, TABLE_COLUMNS, FORMS } from '../utils/constants';
import { number } from '../utils/formatters';
import UserManagement from './UserManagement';

const MASTERS = ['users', 'brands', 'sources', 'vendors', 'customers'];

export function Master() {
  const { app, setMaster, setRows } = useApp();
  const { session } = useAuth();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const entity = app.master;
  const entityInfo = app.state?.entities?.[entity] || {};
  const canEdit = entityInfo.canEdit;
  const options = app.state?.options || {};
  const brands = app.state?.brands || [];

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
    }
  };

  const filtered = records.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q));
  });

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

  // If no master entities, show brand scope table
  const available = MASTERS.filter((name) => app.state?.entities?.[name]);
  if (!available.length) {
    return (
      <div className="panel tight">
        <div className="panel-head">
          <div><h3>Brand scope</h3></div>
        </div>
        <DataTable columns={['Company', 'Brand', 'Brand Key', 'PIC Email']} rows={app.state?.brands || []} />
      </div>
    );
  }

  return (
    <>
      <div className="tabs">
        {available.map((name) => (
          <button
            key={name}
            className={entity === name ? 'active' : ''}
            onClick={() => setMaster(name)}
          >
            {ENTITY_LABELS[name]}
          </button>
        ))}
      </div>

      {entity === 'users' ? (
        <UserManagement />
      ) : (
        <>
          <div className="panel tight">
            <div className="panel-head">
              <div>
                <h3>{ENTITY_LABELS[entity]}</h3>
                <p>{number.format(filtered.length)} data</p>
              </div>
              <div className="row-actions">
                {canEdit && (
                  <button className="btn blue" onClick={() => { setEditRow(null); setModalOpen(true); }}>
                    <Plus size={16} /> Tambah
                  </button>
                )}
              </div>
            </div>
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={TABLE_COLUMNS[entity]}
              rows={filtered}
              renderActions={canEdit ? (row) => (
                <>
                  <button className="icon-btn" onClick={() => { setEditRow(row); setModalOpen(true); }} title="Edit">
                    <Pencil size={15} />
                  </button>
                  {row.ID && (
                    <button className="icon-btn" onClick={() => handleDelete(row.ID)} title="Hapus">
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              ) : null}
            />
          </div>
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={`${editRow?.ID || editRow?.Email ? 'Edit' : 'Tambah'} ${ENTITY_LABELS[entity]}`}
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
      )}
    </>
  );
}
