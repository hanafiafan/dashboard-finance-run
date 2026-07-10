import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
  const [formData, setFormData] = useState(values || {});
  const [errors, setErrors] = useState({});

  useEffect(() => { setFormData(values || {}); }, [values]);

  const handleChange = (key, value) => {
    const updated = { ...formData, [key]: value };

    if (key === 'ID Vendor') {
      const vendors = options?.vendorList || [];
      const found = vendors.find(v => v['ID Vendor'] === value);
      if (found && !updated['Vendor']) updated['Vendor'] = found['Nama Vendor'];
    }
    if (key === 'ID Pelanggan') {
      const customers = options?.customerList || [];
      const found = customers.find(c => c['ID Pelanggan'] === value);
      if (found && !updated['Nama Pelanggan']) updated['Nama Pelanggan'] = found['Nama Pelanggan'];
    }
    if (key === 'Nama Pemasok') {
      const vendors = options?.vendorList || [];
      const found = vendors.find(v => v['Nama Vendor'] === value);
      if (found && !updated['ID Pemasok']) updated['ID Pemasok'] = found['ID Vendor'];
    }
    if (key === 'Saldo Awal' || key === 'Pemasukan' || key === 'Pengeluaran') {
      updated['Total'] = Number(updated['Saldo Awal'] || 0) + Number(updated['Pemasukan'] || 0) - Number(updated['Pengeluaran'] || 0);
    }
    setFormData(updated);
    if (onChange) onChange(updated);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const newErrors = {};
    fields.forEach(f => { if (f.required && !formData[f.key]) newErrors[f.key] = 'Wajib diisi'; });
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0 && onSubmit) onSubmit(formData);
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
      const dataList = field.type === 'vendor' ? (options?.vendorList || []) : (options?.customerList || []);
      return (
        <select id={id} value={value} onChange={e => onChange(field.key, e.target.value)}>
          <option value="">Pilih {field.type === 'vendor' ? 'Vendor' : 'Pelanggan'}</option>
          {dataList.map(item => (
            <option key={item['ID Vendor'] || item['ID Pelanggan']} value={item['ID Vendor'] || item['ID Pelanggan']}>
              {item['ID Vendor'] || item['ID Pelanggan']} — {item['Nama Vendor'] || item['Nama Pelanggan']}
            </option>
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
