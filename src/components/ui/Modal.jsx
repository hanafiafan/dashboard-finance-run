import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { notify } from './Toast';

export function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || [])];
    (focusable()[0] || dialogRef.current)?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1];
        if (!nodes.length) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return createPortal(<div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-content" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <div className="modal-header"><div><span className="overline">RUN FINANCE</span><h2 id={titleId}>{title}</h2></div><button type="button" className="icon-btn" aria-label="Tutup dialog" onClick={onClose}><X size={18}/></button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>, document.body);
}

export function DynamicForm({ fields, values, options, onChange, onSubmit, onCancel }) {
  // renderField() falls back to defaultValue() for display, so a field the user
  // never touches LOOKS filled (e.g. Tahun = tahun berjalan) but is absent from
  // formData and never reaches the DB. Seed those defaults into state instead.
  const seed = vals => {
    const out = { ...(vals || {}) };
    fields.forEach(f => {
      const d = defaultValue(f, options);
      if (d !== '' && out[f.key] === undefined) out[f.key] = d;
    });
    return out;
  };
  const [formData, setFormData] = useState(() => seed(values));
  const [errors, setErrors] = useState({});

  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async e => {
    e.preventDefault();
    const newErrors = {};
    fields.forEach(f => { if (f.required && (formData[f.key] == null || String(formData[f.key]).trim() === '')) newErrors[f.key] = 'Wajib diisi'; });
    setErrors(newErrors);
    const missing = Object.keys(newErrors);
    if (missing.length) {
      notify.warning(`Ada ${missing.length} kolom wajib yang belum diisi.\nLengkapi dulu: ${missing.join(', ')}. Kolom bertanda * tidak boleh kosong.`);
      return;
    }
    if (saving) return;
    setSaving(true);
    try { if (onSubmit) await onSubmit(formData); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="form-intro">Lengkapi informasi berikut. Kolom bertanda * wajib diisi.</p>
      <fieldset disabled={saving} className="modal-form">
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
      </fieldset>
      <div className="modal-actions">
        <button type="button" className="btn ghost" disabled={saving} onClick={onCancel}>Batal</button>
        <button type="submit" className="btn blue" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan data'}</button>
      </div>
    </form>
  );
}

function renderField(field, formData, options, onChange) {
  const value = formData[field.key] ?? defaultValue(field, options);
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

function defaultValue(field, options) {
  if (field.key === 'Tahun') return new Date().getFullYear();
  if (field.key === 'Status' && field.optionsKey === 'budgetStatuses') return options?.budgetStatuses?.[0] || 'Pending';
  if (field.key === 'Active') return true;
  if (field.key === 'Kontrol Pengajuan') return 'OK';
  if (field.key === 'Jenis Bayar') return options?.paymentTypes?.[0] || '';
  return '';
}
