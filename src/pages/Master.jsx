import ExportButton from '../components/ui/ExportButton';
import { useRecords } from '../hooks/useRecords';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal, DynamicForm } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { saveRecord, deleteRecord } from '../api/financeApi';
import { ENTITY_LABELS, TABLE_COLUMNS, FORMS } from '../utils/constants';
import { number } from '../utils/formatters';
import { notify } from '../components/ui/Toast';
import UserManagement from './UserManagement';
import SystemLogs from './SystemLogs';

const MASTERS = ['users', 'brands', 'sources', 'vendors', 'customers'];

export function Master() {
  const { app, setMaster } = useApp();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const entity = app.master;
  const entityInfo = app.state?.entities?.[entity] || {};
  const canEdit = entityInfo.canEdit;
  const canInsert = entityInfo.canInsert ?? entityInfo.canEdit;
  const canDelete = entityInfo.canDelete ?? entityInfo.canEdit;
  const options = app.state?.options || {};
  const brands = app.state?.brands || [];

  const {records,loading:recordsLoading,error:recordsError,loadRecords}=useRecords(entity,entity !== 'users');

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

  const canViewLogs = session?.role === 'superadmin' || session?.role === 'finance';
  // If no master entities, show brand scope table
  const available = MASTERS.filter((name) => app.state?.entities?.[name]);
  const tabs = canViewLogs ? [...available, 'logs'] : available;
  if (!tabs.length) {
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
      <div className="master-intro corner-glow"><div><span className="overline">DATA FOUNDATION</span><h3>Data yang terhubung. Kerja yang lebih rapi.</h3><p>Perbarui brand, mitra, dan akses pengguna dari satu tempat.</p></div><span className="master-monogram">R<span>+</span></span></div>
      <div className="tabs master-tabs">
        {tabs.map((name) => (
          <button
            key={name}
            className={entity === name ? 'active' : ''}
            onClick={() => {setMaster(name);setSearch('');}}
          >
            {name === 'logs' ? 'Log Sistem' : ENTITY_LABELS[name]}
          </button>
        ))}
      </div>

      {entity === 'users' ? (
        <UserManagement />
      ) : entity === 'logs' ? (
        <SystemLogs />
      ) : (
        <>
          <div className="panel tight">
            <div className="panel-head">
              <div>
                <h3>{ENTITY_LABELS[entity]}</h3>
                <p>{number.format(filtered.length)} data</p>
              </div>
              <div className="row-actions">
                {canInsert && (
                  <button className="btn blue" onClick={() => { setEditRow(null); setModalOpen(true); }}>
                    <Plus size={16} /> Tambah
                  </button>
                )}
              </div>
            </div>
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input aria-label="Cari master data" placeholder="Cari master data..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <ExportButton title={ENTITY_LABELS[entity]} columns={TABLE_COLUMNS[entity]} rows={filtered} filters={{...app.filters,search}} disabled={recordsLoading || !!recordsError}/>
            </div>
            {recordsLoading ? <div className="table-loading">Memuat master data...</div> : recordsError ? <div className="table-empty" role="alert"><strong>{recordsError}</strong><button className="btn ghost" onClick={loadRecords}>Coba lagi</button></div> : <DataTable
              columns={TABLE_COLUMNS[entity]}
              rows={filtered}
              renderActions={(canEdit || canDelete) ? (row) => (
                <>
                  {canEdit && (
                    <button className="icon-btn" onClick={() => { setEditRow(row); setModalOpen(true); }} title="Edit">
                      <Pencil size={15} />
                    </button>
                  )}
                  {canDelete && row.ID && (
                    <button className="icon-btn" onClick={() => handleDelete(row.ID)} title="Hapus">
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              ) : null}
            />}
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
