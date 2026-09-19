import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Check, LoaderCircle } from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '../../contexts/AuthContext';
import { exportData } from '../../utils/exportData';
import { notify } from './Toast';

export default function ExportButton({ title, columns, rows, filters, disabled }) {
  const { demo, session } = useAuth();
  const [open,setOpen]=useState(false), [format,setFormat]=useState('xlsx'), [busy,setBusy]=useState(false);
  const handleExport=async () => {
    setBusy(true);
    try { await exportData({title,columns,rows,filters,demo,preparedBy:session?.name || session?.email,preparedRole:session?.role},format);setOpen(false);notify.success(`${rows.length} baris berhasil diekspor.`); }
    catch(error){notify.error(error.message || 'Ekspor gagal. Silakan coba lagi.');}
    finally{setBusy(false);}
  };
  return <><button className="btn ghost" disabled={disabled || !rows?.length} onClick={() => setOpen(true)}><Download size={15}/> Ekspor data</button><Modal isOpen={open} onClose={() => !busy && setOpen(false)} title="Ekspor laporan"><p className="export-intro">{title} · <strong>{rows?.length || 0} baris</strong><br/>Ekspor mengikuti filter dan pencarian yang sedang aktif.</p><div className="export-formats">{[{id:'xlsx',label:'Excel berformat',description:'Judul laporan, format rupiah, filter, dan header tetap.',icon:FileSpreadsheet},{id:'csv',label:'CSV',description:'Data mentah UTF-8 untuk diolah atau diimpor kembali.',icon:FileText}].map(({id,label,description,icon:Icon}) => <button key={id} className={format===id?'selected':''} aria-pressed={format===id} onClick={()=>setFormat(id)}><Icon size={24}/><div><strong>{label}</strong><span>{description}</span></div>{format===id && <Check size={17}/>}</button>)}</div><div className="export-preview"><span>PREVIEW KOLOM</span><p>{columns?.join('  /  ')}</p>{demo && <small>Laporan akan diberi label data demo.</small>}</div><div className="modal-actions"><button className="btn ghost" disabled={busy} onClick={()=>setOpen(false)}>Batal</button><button className="btn blue" disabled={busy} onClick={handleExport}>{busy ? <LoaderCircle size={15} className="spin"/> : <Download size={15}/>} {busy?'Menyiapkan...':'Unduh laporan'}</button></div></Modal></>;
}
