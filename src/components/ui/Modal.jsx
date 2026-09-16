import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { notify } from './Toast';

export function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function DynamicForm({ fields, values, options, onChange, onSubmit, onCancel }) {
  // renderField() falls back to defaultValue() for display, so a field the user
  // never touches LOOKS filled (e.g. Tahun = tahun berjalan) but is absent from
  // formData and never reaches the DB. Seed those defaults into state instead.
  const seed = vals => {
    const out = { ...(vals || {}) };
    fields.forEach(f => {
      const d = defaultValue(f);
      if (d !== '' && out[f.key] === undefined) out[f.key] = d;
    });
    return out;
  };
  const [formData, setFormData] = useState(() => seed(values));
  const [errors, setErrors] = useState({});

  useEffect(() => { setFormData(seed(values)); }, [values, fields]);

  const handleChange = (key, value) => {
    const updated = { ...formData, [key]: value };

    // Nama Vendor/Pemasok/Pelanggan are never typed directly anymore — they're
    // purely derived from whichever ID is selected, always overwritten (not
    // just filled-if-empty) so they can never drift from the ID, including
    // when editing an existing row and changing which ID is selected.
    if (key === 'ID Vendor') {
      const found = (options?.vendorList || []).find(v => v['ID Vendor'] === value);
      if (found) updated['Vendor'] = found['Nama Vendor'];
    }
    if (key === 'ID Pemasok') {
      const found = (options?.vendorList || []).find(v => v['ID Vendor'] === value);
      if (found) updated['Nama Pemasok'] = found['Nama Vendor'];
    }
    if (key === 'ID Pelanggan') {
      const found = (options?.customerList || []).find(c => c['ID Pelanggan'] === value);
      if (found) updated['Nama Pelanggan'] = found['Nama Pelanggan'];
    }
    if (key === 'ID Bank Masuk') {
      const found = (options?.bankList || []).find(b => b['ID Bank'] === value);
      if (found) updated['Bank Masuk'] = found['Bank'];
    }
    if (key === 'ID Bank Keluar') {
      const found = (options?.bankList || []).find(b => b['ID Bank'] === value);
      if (found) updated['Bank Keluar'] = found['Bank'];
    }
    setFormData(updated);
    if (onChange) onChange(updated);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const newErrors = {};
    fields.forEach(f => { if (f.required && !formData[f.key]) newErrors[f.key] = 'Wajib diisi'; });
    setErrors(newErrors);
    const missing = Object.keys(newErrors);
    if (missing.length) {
      notify.warning(`Ada ${missing.length} kolom wajib yang belum diisi.\nLengkapi dulu: ${missing.join(', ')}. Kolom bertanda * tidak boleh kosong.`);
      return;
    }
    if (onSubmit) onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-form">
        {fields.map(field => (
          <div key={field.key} className={`form-group ${field.type === 'textarea' || field.type === 'url' ? 'full-width' : ''}`}>
            <label htmlFor={`field-${field.key}`}>
              {field.label}
              {field.required && <span style={{ color: 'var(--rose)', marginLeft: 2 }}>*</span>}
            </label>
            {renderField(field, formData, options, handleChange)}
            {errors[field.key] && <small style={{ color: 'var(--rose)' }}>{errors[field.key]}</small>}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn blue">Simpan</button>
      </div>
    </form>
  );
}

function renderField(field, formData, options, onChange) {
  const value = formData[field.key] ?? defaultValue(field);
  const id = `field-${field.key}`;

  switch (field.type) {
    case 'textarea':
      return <textarea id={id} value={value} onChange={e => onChange(field.key, e.target.value)} />;
    case 'vendor':
    case 'customer': {
      const isVendor = field.type === 'vendor';
      const all = isVendor ? (options?.vendorList || []) : (options?.customerList || []);
      // Filter ketat: begitu Brand dipilih, HANYA vendor milik brand itu yang
      // muncul — vendor tanpa brand ikut disembunyikan. Pengecualian satu-satunya
      // adalah vendor yang sudah tersimpan di baris yang sedang diedit, supaya
      // data lama tidak berubah diam-diam waktu formnya dibuka.
      // Pelanggan tidak ikut difilter: fin_customers belum punya kolom brand,
      // jadi menyaringnya akan mengosongkan dropdown Cash In sepenuhnya.
      const brand = formData['Brand'];
      const dataList = (!isVendor || !brand) ? all : all.filter(item =>
        item.Brand === brand || item['ID Vendor'] === value,
      );
      return (
        <select id={id} value={value} onChange={e => onChange(field.key, e.target.value)}>
          <option value="">
            {dataList.length
              ? `Pilih ${field.type === 'vendor' ? 'Vendor' : 'Pelanggan'}`
              : `Belum ada ${field.type === 'vendor' ? 'vendor' : 'pelanggan'} untuk brand ini — daftarkan dulu di Master Data`}
          </option>
          {dataList.map(item => (
            <option key={item['ID Vendor'] || item['ID Pelanggan']} value={item['ID Vendor'] || item['ID Pelanggan']}>
              {item['ID Vendor'] || item['ID Pelanggan']} — {item['Nama Vendor'] || item['Nama Pelanggan']}
            </option>
          ))}
        </select>
      );
    }
    case 'bank': {
      const dataList = (options?.bankList || []).filter(b => b['ID Bank']);
      return (
        <select id={id} value={value} onChange={e => onChange(field.key, e.target.value)}>
          <option value="">Pilih Bank</option>
          {dataList.map(item => (
            <option key={item['ID Bank']} value={item['ID Bank']}>{item['ID Bank']} — {item['Bank']}</option>
          ))}
        </select>
      );
    }
    case 'select':
    case 'brand':
      return (
        <select id={id} value={value} onChange={e => onChange(field.key, e.target.value)}>
          <option value="">Pilih</option>
          {(
            field.type === 'brand'
              ? (options?.brands || []).map(b => ({ value: b['Brand Key'], label: `${b.Company} - ${b.Brand}` }))
              : (options?.[field.optionsKey] || []).map(x => ({ value: x, label: x }))
          ).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
    case 'boolean':
      return (
        <select id={id} value={String(value)} onChange={e => onChange(field.key, e.target.value === 'true')}>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      );
    default:
      return <input id={id} type={field.type || 'text'} value={value} onChange={e => onChange(field.key, e.target.value)} />;
  }
}

function defaultValue(field) {
  if (field.key === 'Tahun') return new Date().getFullYear();
  if (field.key === 'Status' && field.optionsKey === 'budgetStatuses') return 'Diajukan';
  if (field.key === 'Active') return true;
  if (field.key === 'Kontrol Pengajuan') return 'OK';
  if (field.key === 'Jenis Bayar') return 'Belum Dibayar';
  return '';
}
