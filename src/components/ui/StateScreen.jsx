import { ArrowUpRight, RefreshCw } from 'lucide-react';

export default function StateScreen({ code = 'RUN', title, description, details, loading = false, onRetry, onBack, compact = false }) {
  return <main className={`state-screen ${compact ? 'compact' : ''}`}>
    <a className="state-brand" href="/">run<span>finance</span><i/></a>
    <div className="state-layout">
      <div className="state-art" aria-hidden="true"><div className="state-orbit"/><strong>{code}</strong><span>KEEP YOUR FINANCES IN FOCUS</span></div>
      <section className="state-content" aria-busy={loading}>
        <span className="overline">RUN FINANCE / {loading ? 'MENGHUBUNGKAN' : code === '404' ? 'HALAMAN TIDAK DITEMUKAN' : 'PEMULIHAN WORKSPACE'}</span>
        <h1>{title}</h1><p>{description}</p>
        {loading && <RefreshCw className="spin" size={26} aria-label="Memuat"/>}
        {details && <details className="state-details"><summary>Detail teknis</summary><pre>{details}</pre></details>}
        <div className="state-actions">{onRetry && <button className="btn primary" onClick={onRetry}>Coba lagi <RefreshCw size={16}/></button>}{onBack ? <button className="btn ghost" onClick={onBack}>Kembali ke login <ArrowUpRight size={16}/></button> : !loading && <a className="btn ghost" href="/">Kembali ke dashboard <ArrowUpRight size={16}/></a>}</div>
        <small>Workspace keuangan multi-company & multi-brand.</small>
      </section>
    </div>
  </main>;
}
