import { useMemo, useState } from 'react';
import RiskOverview from '../components/ui/RiskOverview';
import { Bar } from 'react-chartjs-2';
import { ArrowDownLeft, ArrowUpRight, Wallet, ArrowRight, Search, Landmark, Clock3 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { money, pct, shortMoney, formatDate } from '../utils/formatters';
import { getChartTheme } from '../utils/chartTheme';

import { finiteAmount as amount, recentTransactions } from '../utils/dashboardModel';

export default function CommandCenter() {
  const { app, setView, setEntity } = useApp();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const d = app.state?.dashboard;
  const transactions = useMemo(() => recentTransactions(d?.tables), [d?.tables]);
  if (!d) return <div className="empty">Memuat ringkasan...</div>;
  const s = d.summary || {};
  const charts = d.charts || {};
  const banks = charts.bankBalance || [];
  const months = charts.monthlyCashFlow || [];
  const theme = getChartTheme();
  const open = entity => { setEntity(entity); setView('operations'); };
  const visible = transactions.filter(r => (kind === 'all' || r.kind === kind) && `${r.Keterangan || ''} ${r.Brand || ''} ${r.ID || ''}`.toLowerCase().includes(query.toLowerCase()));
  const achievement = amount(s.omzetAchievement);
  const metrics = [
    { label: 'Total pemasukan', value: s.cashIn, icon: ArrowDownLeft, note: 'Uang masuk pada periode terpilih', accent: true, entity: 'income' },
    { label: 'Total pengeluaran', value: s.cashOut, icon: ArrowUpRight, note: 'Uang keluar pada periode terpilih', entity: 'outcome' },
    { label: 'Arus kas bersih', value: s.netCash, icon: Wallet, note: 'Pemasukan dikurangi pengeluaran', entity: 'income' },
    { label: 'Piutang berjalan', value: s.receivableOutstanding, icon: Clock3, note: 'Total piutang yang belum lunas', entity: 'receivables' },
  ];
  return <div className="overview">
    <section className="overview-welcome"><img src="/art/workspace-still-life.jpg" alt=""/><div><span className="overline">YOUR BUSINESS, AT A GLANCE</span><h2>Ruang untuk keputusan<br/>yang lebih terarah.</h2><p>Mulai dari transaksi hari ini, lihat gambaran besarnya.</p><button className="welcome-action" onClick={() => open('income')}>Catat pemasukan <ArrowUpRight size={16}/></button></div><span className="welcome-edition">RUN FINANCE / WORKSPACE</span></section>
    <div className="section-eyebrow"><span>Ringkasan keuangan</span><span>Sesuai filter aktif · IDR</span></div>
    <div className="overview-top">
      <section className="finance-card balance-card">
        <div className="card-label">Total saldo rekening <span className="currency-tag">IDR</span></div>
        <h2 title={money.format(amount(s.bankBalance))}>{money.format(amount(s.bankBalance))}</h2>
        <p className="muted">Saldo seluruh rekening dalam cakupan filter</p>
        <div className="balance-actions"><button className="btn primary" onClick={() => open('bank')}><Wallet size={14} /> Lihat rekening</button><button className="btn ghost" onClick={() => open('budget')}>Pengajuan <ArrowUpRight size={14} /></button></div>
        <div className="wallet-area"><div className="small-heading">Rekening <span>{banks.length} rekening</span></div><div className="wallet-list">{banks.slice(0, 3).map((bank, i) => <button className="wallet-item" key={`${bank.label}-${i}`} onClick={() => open('bank')}><Landmark size={15}/><span>{bank.label}</span><strong title={money.format(amount(bank.value))}>{money.format(amount(bank.value))}</strong></button>)}{!banks.length && <p className="muted">Belum ada rekening.</p>}</div></div>
      </section>
      <div className="overview-metrics">{metrics.map(({ label, value, icon: Icon, note, accent, entity }) => <button onClick={() => open(entity)} className={`summary-tile ${accent ? 'accent' : ''}`} key={label}><div className="card-label">{label}<Icon size={17}/></div><strong title={money.format(amount(value))}>{money.format(amount(value))}</strong><small>{note}</small></button>)}</div>
      <section className="finance-card cashflow-card"><div className="section-heading"><div><h3>Arus kas</h3><p>Pemasukan dan pengeluaran per bulan</p></div><span className="currency-tag">IDR</span></div><div className="overview-chart">{months.length ? <Bar role="img" aria-label="Grafik perbandingan pemasukan dan pengeluaran bulanan dalam rupiah" data={{ labels: months.map(m => m.label), datasets: [
        { label: 'Pemasukan', data: months.map(m => amount(m.cashIn)), backgroundColor: '#ff774c', borderRadius: 5, maxBarThickness: 18 },
        { label: 'Pengeluaran', data: months.map(m => amount(m.cashOut)), backgroundColor: theme.isDark ? '#c4c5b5' : '#292b24', borderRadius: 5, maxBarThickness: 18 },
      ] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: theme.tickColor, font: { size: 10 } } }, y: { beginAtZero: true, border: { display: false }, grid: { color: theme.gridColor }, ticks: { color: theme.tickColor, callback: shortMoney, maxTicksLimit: 5, font: { size: 10 } } } }, plugins: { legend: { position: 'top', align: 'end', labels: { color: theme.labelColor, usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, font: { size: 10 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${money.format(ctx.parsed.y)}` } } } }} /> : <div className="empty">Belum ada data arus kas.</div>}</div></section>
    </div>
    <div className="overview-bottom"><div className="overview-side">
      <section className="finance-card target-card"><div className="section-heading"><h3>Capaian omzet</h3><span>{pct.format(achievement)}</span></div><div className="target-track" role="progressbar" aria-label="Capaian omzet" aria-valuenow={Math.round(Math.max(0, Math.min(1, achievement)) * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(1, achievement)) * 100}%` }}/></div><div className="target-numbers"><span>{money.format(amount(s.omzetReal))}<small>Realisasi</small></span><span>{money.format(amount(s.omzetTarget))}<small>Target</small></span></div><button className="text-action" onClick={() => open('omzet')}>Lihat detail omzet <ArrowRight size={14}/></button></section>
      <section className="finance-card action-card"><div className="section-heading"><h3>Perlu ditinjau</h3><Clock3 size={17}/></div><strong className="pending-number">{amount(s.pendingApproval)}<span>pengajuan menunggu</span></strong><div className="review-row"><span>Pengajuan dana</span><strong>{money.format(amount(s.budgetRequested))}</strong></div><div className="review-row"><span>Hutang berjalan</span><strong>{money.format(amount(s.payableOutstanding))}</strong></div><button className="btn primary" onClick={() => setView('approval')}>Buka approval <ArrowRight size={14}/></button></section>
    </div>
    <section className="finance-card transactions-card"><div className="section-heading transaction-heading"><div><h3>Transaksi terbaru</h3><p>Aktivitas uang masuk dan keluar</p></div><div className="transaction-tools"><label className="transaction-search"><Search size={14}/><input aria-label="Cari transaksi" placeholder="Cari transaksi..." value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Jenis transaksi" value={kind} onChange={e => setKind(e.target.value)}><option value="all">Semua jenis</option><option value="income">Pemasukan</option><option value="outcome">Pengeluaran</option></select></div></div>
      <div className="transaction-scroll"><table className="overview-table"><thead><tr><th>Transaksi</th><th>Brand</th><th>Nominal</th><th>Jenis</th><th>Tanggal</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{visible.slice(0, 8).map((row, i) => <tr key={`${row.kind}-${row.ID}-${i}`}><td><div className="transaction-name"><span className={`transaction-icon ${row.kind}`}>{row.kind === 'income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</span><div><strong>{row.Keterangan || 'Tanpa keterangan'}</strong><small>{row.ID || '—'}</small></div></div></td><td>{row.Brand || '—'}</td><td className="amount-cell">{money.format(row.amount)}</td><td><span className={`transaction-kind ${row.kind}`}>{row.kind === 'income' ? 'Masuk' : 'Keluar'}</span></td><td>{formatDate(row.Tanggal)}</td><td><button className="icon-btn" aria-label={`Buka ${row.kind === 'income' ? 'pemasukan' : 'pengeluaran'}`} onClick={() => open(row.kind)}><ArrowUpRight size={15}/></button></td></tr>)}</tbody></table>{!visible.length && <div className="empty">{transactions.length ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi pada periode ini.'}</div>}</div><div className="transaction-footer"><span>{Math.min(visible.length, 8)} dari {visible.length} transaksi terbaru</span><button className="text-action" onClick={() => open(kind === 'outcome' ? 'outcome' : 'income')}>Lihat transaksi <ArrowRight size={14}/></button></div>
    </section></div>
    <RiskOverview summary={s} />
  </div>;
}
