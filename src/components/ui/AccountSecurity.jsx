import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, KeySquare } from 'lucide-react';
import { supabase } from '../../api/supabaseClient';
import { Modal } from './Modal';
import { notify } from './Toast';

// Self-hosted TOTP 2FA via Supabase Auth's built-in MFA API (GoTrue) — no
// third-party auth/SaaS involved, the self-hosted instance already supports
// the standard enroll/challenge/verify/unenroll flow.
export default function AccountSecurity({ isOpen, onClose }) {
  const [factor, setFactor] = useState(undefined); // undefined = loading, null = none enrolled
  const [enrolling, setEnrolling] = useState(null); // { factorId, qr, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFactor(undefined);
    setEnrolling(null);
    setCode('');
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) { notify.error('Gagal memuat status 2FA.'); setFactor(null); return; }
      setFactor(data?.totp?.find(f => f.status === 'verified') || null);
    });
  }, [isOpen]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      notify.error(err.message || 'Gagal memulai aktivasi 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async e => {
    e.preventDefault();
    if (code.length < 6) return;
    setBusy(true);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (challengeErr) throw challengeErr;
      const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: challenge.id, code });
      if (verifyErr) throw verifyErr;
      notify.success('2FA aktif.\nSetiap login berikutnya akan meminta kode dari aplikasi authenticator Anda.');
      setFactor({ id: enrolling.factorId, status: 'verified' });
      setEnrolling(null);
      setCode('');
    } catch (err) {
      notify.error(err.message || 'Kode salah, coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!window.confirm('Nonaktifkan 2FA untuk akun ini?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      notify.success('2FA dinonaktifkan.');
      setFactor(null);
    } catch (err) {
      notify.error(err.message || 'Gagal menonaktifkan 2FA.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keamanan Akun">
      <div className="form-intro">Verifikasi dua langkah (2FA) menambah lapisan keamanan login dengan kode dari aplikasi authenticator (Google Authenticator, Authy, dll).</div>
      {factor === undefined ? (
        <div className="table-loading">Memuat status...</div>
      ) : enrolling ? (
        <form onSubmit={confirmEnroll} className="account-security-enroll">
          <p className="muted">Scan QR ini dengan aplikasi authenticator Anda, lalu masukkan kode 6 digit yang muncul.</p>
          <div className="mfa-qr" dangerouslySetInnerHTML={{ __html: enrolling.qr }} />
          <p className="muted">Atau masukkan manual: <code>{enrolling.secret}</code></p>
          <div className="form-group">
            <label htmlFor="mfa-enroll-code">Kode 6 digit</label>
            <input id="mfa-enroll-code" type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setEnrolling(null)} disabled={busy}>Batal</button>
            <button type="submit" className="btn primary" disabled={busy || code.length < 6}>Aktifkan</button>
          </div>
        </form>
      ) : factor ? (
        <div className="account-security-status ok">
          <ShieldCheck size={20} /> <div><strong>2FA aktif</strong><p className="muted">Login akun ini butuh kode authenticator.</p></div>
          <button className="btn ghost" onClick={disable} disabled={busy}>Nonaktifkan</button>
        </div>
      ) : (
        <div className="account-security-status off">
          <ShieldAlert size={20} /> <div><strong>2FA belum aktif</strong><p className="muted">Aktifkan untuk keamanan login tambahan.</p></div>
          <button className="btn primary" onClick={startEnroll} disabled={busy}><KeySquare size={15} /> Aktifkan 2FA</button>
        </div>
      )}
    </Modal>
  );
}
