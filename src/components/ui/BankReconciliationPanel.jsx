import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { getBankReconciliations, saveBankReconciliation } from '../../api/financeApi';
import { money, formatDate } from '../../utils/formatters';
import { notify } from './Toast';
import { localDateStr } from '../../utils/ews';

// Reconciliation v1: compares the system's running balance for a bank
// account against the real bank statement's ending balance for a period,
// and records that check. This is NOT line-item transaction matching (which
// would need bank-statement import + a matching algorithm) — it's the
// lighter "does our number agree with the bank's number" audit that most
// small/mid finance teams actually do periodically.
export default function BankReconciliationPanel({ banks, session }) {
  const [bankId, setBankId] = useState('');
  const periodDate = localDateStr();
  const [historyError, setHistoryError] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedBank = banks.find(b => String(b.ID) === String(bankId));

  useEffect(() => {
    let active = true;
    setHistory([]);
    setHistoryError('');
    if (!bankId) { setLoadingHistory(false); return; }
    setLoadingHistory(true);
    getBankReconciliations(bankId, session)
      .then(({ rows }) => { if (active) setHistory(rows); })
      .catch(err => { if (active) setHistoryError(err.message || 'Gagal memuat riwayat.'); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [bankId, session]);
  const difference = Number(statementBalance) - Number(selectedBank?.Total || 0);
  const hasStatement = !!selectedBank && statementBalance !== '' && Number.isFinite(Number(statementBalance));

  const handleSave = async e => {
    e.preventDefault();
    if (busy || !hasStatement) return;
    if (!Number.isFinite(Number(selectedBank.Total || 0))) { notify.error('Saldo sistem tidak valid. Muat ulang rekening.'); return; }
    if (difference !== 0 && !note.trim()) { notify.error('Tambahkan penjelasan untuk selisih saldo.'); return; }
    setBusy(true);
    try {
      await saveBankReconciliation({
        bankId: selectedBank.ID,
        brandKey: selectedBank.Brand,
        periodDate: localDateStr(),
        systemBalance: Number(selectedBank.Total || 0),
        statementBalance: Number(statementBalance),
        note,
      }, session);
      notify.success(session?.isDemo ? 'Simulasi selesai. Data demo tidak disimpan.' : 'Pemeriksaan saldo tersimpan.');
      setStatementBalance('');
      setNote('');
      const { rows } = await getBankReconciliations(selectedBank.ID, session);
      setHistory(rows);
    } catch (err) {
      notify.error(err.message || 'Gagal menyimpan rekonsiliasi.');
    } finally {
      setBusy(false);
    }
  };

  if (!banks.length) return null;

  return (
    <div className="panel tight">
      <div className="panel-head">
        <div><h3><Scale size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Rekonsiliasi Bank</h3><p>Periksa saldo berjalan dan dokumentasikan selisihnya.</p></div>
      </div>
      <div className="modal-body">
        <form onSubmit={handleSave} className="modal-form">
          <p className="recon-context full-width">Pemeriksaan saldo hari ini, bukan pencocokan mutasi historis. Gunakan saldo bank pada waktu yang sama dengan saldo sistem; muat ulang rekening sebelum memeriksa. Penyimpanan tidak mengubah saldo rekening.</p>
          <div className="form-group">
            <label htmlFor="recon-bank">Rekening</label>
            <select id="recon-bank" value={bankId} onChange={e => { setBankId(e.target.value); setStatementBalance(''); setNote(''); }} required disabled={busy}>
              <option value="">Pilih rekening</option>
              {banks.map(b => <option key={b.ID} value={b.ID}>{b.Brand} — {b.Bank}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Saldo Sistem</label>
            <input value={selectedBank ? money.format(Number(selectedBank.Total || 0)) : '—'} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="recon-date">Tanggal pemeriksaan</label>
            <input id="recon-date" type="date" value={periodDate} readOnly />
          </div>
          <div className="form-group">
            <label htmlFor="recon-statement">Saldo Bank Asli (Rp)</label>
            <input id="recon-statement" type="number" step="1" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} required disabled={!bankId || busy} />
          </div>
          <div className="form-group full-width">
            <label htmlFor="recon-note">Catatan {hasStatement && difference !== 0 ? '(wajib untuk selisih)' : ''}</label>
            <textarea required={hasStatement && difference !== 0} id="recon-note" value={note} onChange={e => setNote(e.target.value)} disabled={!bankId || busy} />
          </div>
          {hasStatement && <div className="recon-difference full-width" aria-live="polite"><div><span>{difference === 0 ? 'Saldo sesuai' : 'Ada selisih saldo'}</span><small>Saldo bank − saldo sistem</small></div><strong>{money.format(difference)}</strong></div>}
          <div className="full-width row-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn primary" disabled={busy || !hasStatement}>{busy ? 'Menyimpan…' : session?.isDemo ? 'Simulasikan pemeriksaan' : 'Simpan pemeriksaan'}</button>
          </div>
        </form>
      </div>
      {bankId && (
        historyError ? <div className="sync-error" role="alert">{historyError} Pilih ulang rekening untuk mencoba lagi.</div> : loadingHistory ? <div className="table-loading">Memuat riwayat...</div> : history.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Tanggal pemeriksaan</th><th className="numeric">Saldo Sistem</th><th className="numeric">Saldo Bank</th><th className="numeric">Selisih</th><th>Oleh</th><th>Catatan</th></tr></thead>
              <tbody>{history.map(row => (
                <tr key={row.id}>
                  <td>{formatDate(row.period_date)}</td>
                  <td className="numeric">{money.format(row.system_balance)}</td>
                  <td className="numeric">{money.format(row.statement_balance)}</td>
                  <td className="numeric"><span className={`status ${Math.abs(row.difference) < 1 ? 'ok' : 'bad'}`}>{money.format(row.difference)}</span></td>
                  <td>{row.reconciled_by || '—'}</td>
                  <td className="cell-text" style={{ maxWidth: 200 }}>{row.note || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="table-empty"><strong>Belum ada riwayat rekonsiliasi untuk rekening ini.</strong></div>
      )}
    </div>
  );
}
