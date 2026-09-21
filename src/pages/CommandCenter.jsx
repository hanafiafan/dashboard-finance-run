import { useMemo, useState } from 'react';
import RiskOverview from '../components/ui/RiskOverview';
import ProgressRing from '../components/charts/ProgressRing';
import { Bar } from 'react-chartjs-2';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Search, Landmark, ChevronRight, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { money, shortMoney, formatDate } from '../utils/formatters';
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

  // Gogo-style summary — cashIn/cashOut are already period totals, so the
  // split % is real, not sampled from the capped recent-transactions list.
  const cashIn = amount(s.cashIn);
  const cashOut = amount(s.cashOut);
  const totalFlow = cashIn + cashOut;
  const outPct = totalFlow > 0 ? cashOut / totalFlow : 0;
  const inPct = totalFlow > 0 ? cashIn / totalFlow : 0;
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const cashGrowth = lastMonth && prevMonth && amount(prevMonth.netCash) !== 0
    ? (amount(lastMonth.netCash) - amount(prevMonth.netCash)) / Math.abs(amount(prevMonth.netCash))
    : null;
  const recentOutcome = transactions.filter(r => r.kind === 'outcome').slice(0, 4);

  return <div className="overview">
    <div className="gogo-row gogo-row-flow">
      <div className="gogo-flow-stack">
        <button className="gogo-flow-card transfer" onClick={() => open('outcome')}>
          <span className="gogo-flow-pct">{totalFlow > 0 ? `${Math.round(outPct * 100)}%` : '—'}</span>
          <span className="gogo-flow-label">Porsi pengeluaran <ArrowUpRight size={16}/></span>
          <span className="gogo-flow-sub">{money.format(cashOut)}</span>
        </button>
        <button className="gogo-flow-card receive" onClick={() => open('income')}>
          <span className="gogo-flow-pct">{totalFlow > 0 ? `${Math.round(inPct * 100)}%` : '—'}</span>
          <span className="gogo-flow-label">Porsi pemasukan <ArrowDownLeft size={16}/></span>
          <span className="gogo-flow-sub">{money.format(cashIn)}</span>
        </button>
      </div>
      <section className="gogo-analytics">
        <div className="gogo-analytics-copy"><span className="overline">PERFORMA BISNIS</span><h3>Capaian omzet</h3><strong className="gogo-achievement">{amount(s.omzetTarget) > 0 ? `${Math.round(achievement * 100)}%` : '—'}</strong><p>{amount(s.omzetTarget) > 0 ? 'dari target omzet yang ditetapkan' : 'Target omzet belum ditetapkan'}</p><div className="gogo-analytics-facts"><span><TrendingUp size={14}/> Realisasi <strong>{money.format(amount(s.omzetReal))}</strong></span><span><Target size={14}/> Target <strong>{money.format(amount(s.omzetTarget))}</strong></span></div></div>
        <div className="gogo-analytics-ring"><ProgressRing value={achievement} color="#ffffff" size={230} bare label="Capaian omzet"/></div>
        <button className="gogo-analytics-more" aria-label="Lihat detail analytics" onClick={() => setView('analytics')}><ArrowUpRight size={16}/></button>
      </section>
    </div>

    <div className="gogo-row gogo-row-detail">
      <section className="gogo-card gogo-cash">
        <div className="card-label">Arus kas bersih <span className="currency-tag">IDR</span></div>
        <strong className="gogo-cash-value">{money.format(amount(s.netCash))}</strong>
        <span className="gogo-cash-trend">{cashGrowth != null ? <>{cashGrowth >= 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}{Math.abs(Math.round(cashGrowth * 100))}% {cashGrowth >= 0 ? 'naik' : 'turun'} vs bulan sebelumnya</> : 'Pemasukan dikurangi pengeluaran'}</span>
        <div className="gogo-mini-chart">{months.length ? <Bar aria-label="Arus kas bersih per bulan dalam rupiah" role="img" data={{labels:months.slice(-6).map(m=>m.label),datasets:[{label:'Arus kas bersih',data:months.slice(-6).map(m=>amount(m.netCash)),backgroundColor:months.slice(-6).map((_,i,a)=>i===a.length-1?'#1762ff':i===a.length-2?'#ffffff':'#5b5d62'),borderRadius:8,maxBarThickness:45}]}} options={{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money.format(c.parsed.y)}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#b9bbc3',font:{size:10}}},y:{beginAtZero:true,grid:{color:'#ffffff10'},border:{display:false},ticks:{display:false}}}}}/> : <p className="muted">Belum ada mutasi.</p>}</div>
      </section>
      <section className="gogo-card gogo-period">
        <div className="section-heading"><div><h3>Perlu persetujuan</h3><p>Pengajuan dalam cakupan filter</p></div><button className="round-action" aria-label="Buka approval" onClick={() => setView('approval')}><ArrowUpRight size={20}/></button></div>
        <div className="gogo-period-bottom"><span>Menunggu keputusan</span><strong className="gogo-period-value">{amount(s.pendingApproval).toLocaleString('id-ID')}<small>pengajuan</small></strong><div className="period-foot"><span>Hutang berjalan</span><strong>{money.format(amount(s.payableOutstanding))}</strong></div></div>
      </section>
      <section className="gogo-card gogo-payments">
        <div className="section-heading"><h3>Pengeluaran terbaru</h3><span className="currency-tag">{recentOutcome.length} transaksi</span></div>
        <div className="gogo-payments-list">
          {recentOutcome.map((row, i) => <div className="gogo-payment-row" key={`${row.ID}-${i}`}>
            <span className="gogo-payment-icon"><ArrowUpRight size={15}/></span>
            <div className="gogo-payment-info"><strong>{row.Keterangan || 'Tanpa keterangan'}</strong><small>{row.Brand || '—'}</small></div>
            <span className="gogo-payment-amount">{money.format(row.amount)}</span>
          </div>)}
          {!recentOutcome.length && <div className="empty">Belum ada pengeluaran pada periode ini.</div>}
        </div>
      </section>
    </div>

    <div className="overview-top">
      <section className="finance-card cashflow-card">
        <div className="section-heading">
          <div><h3>Arus kas</h3><p>Pemasukan dan pengeluaran per bulan</p></div>
        </div>
        <div className="overview-chart">{months.length ? <Bar role="img" aria-label="Grafik perbandingan pemasukan dan pengeluaran bulanan dalam rupiah" data={{ labels: months.map(m => m.label), datasets: [
        { label: 'Pemasukan', data: months.map(m => amount(m.cashIn)), backgroundColor: '#BFFF00', borderRadius: 5, maxBarThickness: 18 },
        { label: 'Pengeluaran', data: months.map(m => amount(m.cashOut)), backgroundColor: '#1762FF', borderRadius: 5, maxBarThickness: 18 },
      ] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: theme.tickColor, font: { size: 10 } } }, y: { beginAtZero: true, border: { display: false }, grid: { color: theme.gridColor }, ticks: { color: theme.tickColor, callback: shortMoney, maxTicksLimit: 5, font: { size: 10 } } } }, plugins: { legend: { position: 'top', align: 'end', labels: { color: theme.labelColor, usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, font: { size: 10 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${money.format(ctx.parsed.y)}` } } } }} /> : <div className="empty">Belum ada data arus kas.</div>}</div>
        <div className="chart-footnote"><span>Transfer antar rekening tidak dihitung</span><span>{months.length} bulan data</span></div>
      </section>
      <section className="finance-card accounts-card">
        <div className="section-heading"><h3>Rekening</h3><span className="currency-tag">{banks.length} akun</span></div>
        <div className="account-list">{banks.slice(0, 4).map((bank, i) => <button className={`account-row ${i === 0 ? 'primary' : ''}`} key={`${bank.label}-${i}`} onClick={() => open('bank')}><span className="account-avatar"><Landmark size={15}/></span><span className="account-info"><strong>{bank.label}</strong><small title={money.format(amount(bank.value))}>{money.format(amount(bank.value))}</small></span><ChevronRight size={14} className="account-chevron"/></button>)}{!banks.length && <p className="muted">Belum ada rekening.</p>}</div>
        <button className="text-action account-list-action" onClick={() => open('bank')}>Lihat semua rekening <ArrowRight size={14}/></button>
      </section>
    </div>
    <section className="finance-card transactions-card"><div className="section-heading transaction-heading"><div><h3>Transaksi terbaru</h3><p>Aktivitas uang masuk dan keluar</p></div><div className="transaction-tools"><label className="transaction-search"><Search size={14}/><input aria-label="Cari transaksi" placeholder="Cari transaksi..." value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Jenis transaksi" value={kind} onChange={e => setKind(e.target.value)}><option value="all">Semua jenis</option><option value="income">Pemasukan</option><option value="outcome">Pengeluaran</option></select></div></div>
      <div className="transaction-scroll"><table className="overview-table"><thead><tr><th>Transaksi</th><th>Brand</th><th>Nominal</th><th>Jenis</th><th>Tanggal</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{visible.slice(0, 8).map((row, i) => <tr key={`${row.kind}-${row.ID}-${i}`}><td><div className="transaction-name"><span className={`transaction-icon ${row.kind}`}>{row.kind === 'income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</span><div><strong>{row.Keterangan || 'Tanpa keterangan'}</strong><small>{row.ID || '—'}</small></div></div></td><td>{row.Brand || '—'}</td><td className="amount-cell">{money.format(row.amount)}</td><td><span className={`transaction-kind ${row.kind}`}>{row.kind === 'income' ? 'Masuk' : 'Keluar'}</span></td><td>{formatDate(row.Tanggal)}</td><td><button className="icon-btn" aria-label={`Buka ${row.kind === 'income' ? 'pemasukan' : 'pengeluaran'}`} onClick={() => open(row.kind)}><ArrowUpRight size={15}/></button></td></tr>)}</tbody></table>{!visible.length && <div className="empty">{transactions.length ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi pada periode ini.'}</div>}</div><div className="transaction-footer"><span>{Math.min(visible.length, 8)} dari {visible.length} transaksi terbaru</span><button className="text-action" onClick={() => open(kind === 'outcome' ? 'outcome' : 'income')}>Lihat transaksi <ArrowRight size={14}/></button></div>
    </section>
    <RiskOverview summary={s} />
  </div>;
}
