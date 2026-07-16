import { Bar, Doughnut } from 'react-chartjs-2';
import MetricCard from '../components/ui/MetricCard';
import { Panel } from '../components/ui/MetricCard';
import ExpandablePanel from '../components/ui/ExpandablePanel';
import { money, number, pct, shortMoney } from '../utils/formatters';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useFilters } from '../hooks/useFilters';
import { CHART_COLORS } from '../utils/constants';
import { getChartTheme } from '../utils/chartTheme';
import { ewsStatus, cashPositionStatus, forecastCashPositionStatus, ewsDetail } from '../utils/ews';
import PolarChartCard from '../components/charts/PolarChart';
import ComboChart from '../components/charts/ComboChart';
import HorizontalBar from '../components/charts/HorizontalBar';
import BrandHeatmap from '../components/charts/BrandHeatmap';
import LiquidityGauge from '../components/charts/LiquidGauge';
import WaterfallChart from '../components/charts/WaterfallChart';
import BudgetTreemap from '../components/charts/BudgetTreemap';
import ProgressRing from '../components/charts/ProgressRing';
import RadarChartCore from '../components/charts/RadarChart';
import { useMemo, useState, useEffect } from 'react';

export default function CommandCenter() {
  const { app, setFilters } = useApp();
  const { session } = useAuth();
  useFilters();

  const d = app.state?.dashboard;
  if (!d) return <div className="empty animate-fade-in">Loading dashboard...</div>;

  const s = d.summary;
  const charts = d.charts;
  const brandPerf = charts.brandPerformance || [];
  const activeBrand = app.filters.brandKey;
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setChartReady(true), 150); return () => clearTimeout(t); }, []);

  const ct = getChartTheme();

  const omzetAchColor = ewsStatus(s.omzetAchievement || 0, 1.0, 0.8);
  const metrics = [
    { label: 'Cash In', value: money.format(s.cashIn), color: 'green', note: `${(charts.monthlyCashFlow || []).length} bulan` },
    { label: 'Cash Out', value: money.format(s.cashOut), color: 'coral', note: 'Total pengeluaran' },
    { label: 'Net Cash', value: money.format(s.netCash), color: s.netCash >= 0 ? 'teal' : 'rose', note: `${pct.format(s.netCash / (s.cashIn || 1))} margin` },
    { label: 'Saldo Rekening', value: money.format(s.bankBalance), color: 'blue', note: `${(charts.bankBalance || []).length} akun` },
    { label: 'Budget Request', value: money.format(s.budgetRequested), color: 'violet', note: `${s.pendingApproval} pending` },
    { label: 'Pending', value: number.format(s.pendingApproval), color: 'amber', note: 'Perlu review' },
    { label: 'Hutang', value: money.format(s.payableOutstanding || s.budgetOutstanding), color: 'rose', note: `${(charts.payableAging || []).length} bucket` },
    { label: 'Capaian Omzet', value: pct.format(s.omzetAchievement || 0), color: omzetAchColor, note: `${money.format(s.omzetReal)} / ${money.format(s.omzetTarget)}`, statusLabel: ewsDetail('omzetAchievement', omzetAchColor).label, arti: ewsDetail('omzetAchievement', omzetAchColor).arti },
  ];

  // Early Warning System — see RAW DATA DASHBOARD FINANCE/Early Warning System.docx
  const cashPosColor = cashPositionStatus(s.cashPosition || 0);
  const cashOutRatioColor = ewsStatus(s.cashOutRatio || 0, 0.85, 0.90, false);
  const cashConversionColor = ewsStatus(s.cashConversion || 0, 0.65, 0.50);
  const receivableRiskColor = ewsStatus(s.receivableRisk || 0, 0.20, 0.35, false);
  const payableRiskColor = ewsStatus(s.payableRisk || 0, 0.30, 0.50, false);
  const forecastCashPosColor = forecastCashPositionStatus(s.forecastCashPosition30 || 0, s.bankBalance || 0);

  const ewsMetrics = [
    { label: 'Cash Position', value: money.format(s.cashPosition || 0), color: cashPosColor, statusLabel: ewsDetail('cashPosition', cashPosColor).label, arti: ewsDetail('cashPosition', cashPosColor).arti },
    { label: 'Cash Out Ratio', value: pct.format(s.cashOutRatio || 0), color: cashOutRatioColor, statusLabel: ewsDetail('cashOutRatio', cashOutRatioColor).label, arti: ewsDetail('cashOutRatio', cashOutRatioColor).arti },
    { label: 'Cash Conversion', value: pct.format(s.cashConversion || 0), color: cashConversionColor, statusLabel: ewsDetail('cashConversion', cashConversionColor).label, arti: ewsDetail('cashConversion', cashConversionColor).arti },
    { label: 'Receivable Risk', value: pct.format(s.receivableRisk || 0), color: receivableRiskColor, statusLabel: ewsDetail('receivableRisk', receivableRiskColor).label, arti: ewsDetail('receivableRisk', receivableRiskColor).arti },
    { label: 'Payable Risk', value: pct.format(s.payableRisk || 0), color: payableRiskColor, statusLabel: ewsDetail('payableRisk', payableRiskColor).label, arti: ewsDetail('payableRisk', payableRiskColor).arti },
    { label: 'Forecast Cash Position (30 hari)', value: money.format(s.forecastCashPosition30 || 0), color: forecastCashPosColor, statusLabel: ewsDetail('forecastCashPosition', forecastCashPosColor).label, arti: ewsDetail('forecastCashPosition', forecastCashPosColor).arti },
  ];

  const waterfallData = useMemo(() => (charts.monthlyCashFlow || []).map(x => ({ label: x.label, cashIn: x.cashIn, netCash: x.netCash, cashOut: x.cashOut })), [charts.monthlyCashFlow]);

  const cashflowCombo = useMemo(() => ({
    labels: (charts.monthlyCashFlow || []).map(x => x.label),
    datasets: [
      { label: 'Cash In', data: (charts.monthlyCashFlow || []).map(x => x.cashIn), backgroundColor: '#10b981', borderRadius: 4, order: 1 },
      { label: 'Cash Out', data: (charts.monthlyCashFlow || []).map(x => x.cashOut), backgroundColor: '#e11d48', borderRadius: 4, order: 1 },
      { label: 'Forecast', data: (charts.monthlyCashFlow || []).map(x => x.forecastIn), type: 'line', borderColor: '#f97316', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#f97316', tension: 0.35, backgroundColor: 'rgba(249,115,22,0.1)', fill: true, order: 0 },
      { label: 'Net Cash', data: (charts.monthlyCashFlow || []).map(x => x.netCash), type: 'line', borderColor: '#7c3aed', borderWidth: 2, borderDash: [5,3], pointRadius: 3, tension: 0.35, fill: false, order: 0 },
    ],
  }), [charts.monthlyCashFlow]);

  const bankData = useMemo(() => ({
    labels: (charts.bankBalance || []).map(x => x.label),
    datasets: [{ label: 'Saldo', data: (charts.bankBalance || []).map(x => x.value), backgroundColor: (charts.bankBalance || []).map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderRadius: 6, borderWidth: 0 }],
  }), [charts.bankBalance]);

  const doughnutData = useMemo(() => ({
    labels: (charts.budgetStatus || []).map(x => x.label),
    datasets: [{ data: (charts.budgetStatus || []).map(x => x.value), backgroundColor: CHART_COLORS, borderWidth: 0 }],
  }), [charts.budgetStatus]);

  const omzetData = useMemo(() => ({
    labels: (charts.omzetByMonth || []).map(x => x.label),
    datasets: [
      { label: 'Target', data: (charts.omzetByMonth || []).map(x => x.target), backgroundColor: 'rgba(13,148,136,0.25)', borderColor: '#0d9488', borderWidth: 1.5, borderRadius: 4 },
      { label: 'Realisasi', data: (charts.omzetByMonth || []).map(x => x.real), backgroundColor: '#2563eb', borderRadius: 4 },
    ],
  }), [charts.omzetByMonth]);

  const approvalRate = s.approvalRate || 0;
  const collectionRate = s.cashIn > 0 ? Math.min(1, (s.cashIn - s.cashOut) / s.cashIn) : 0;
  const solvencyRate = s.payableOutstanding > 0 ? Math.min(1, s.bankBalance / s.payableOutstanding) : 1;

  return (
    <>
      {/* Row 1: Executive Summary */}
      <div className="metric-grid">{metrics.map(m => <MetricCard key={m.label} {...m} />)}</div>

      {/* Row 1.5: Early Warning System */}
      <Panel title="Early Warning System" note="Indikator risiko cashflow bulan berjalan">
        <div className="metric-grid">{ewsMetrics.map(m => <MetricCard key={m.label} {...m} />)}</div>
      </Panel>

      {/* Row 2: Key Ratio Rings */}
      <div className="grid-4">
        <ProgressRing value={approvalRate} label="Approval Rate" color="#10b981" />
        <ProgressRing value={collectionRate} label="Collection Margin" color="#2563eb" />
        <ProgressRing value={s.omzetAchievement || 0} label="Omzet Attain" color="#7c3aed" />
        <ProgressRing value={solvencyRate} label="Solvency" color="#f59e0b" />
      </div>

      {/* Row 3: Brand Health Cards */}
      <div className="brand-strip">
        {brandPerf.map(item => (
          <div key={item.label} className={`brand-card${activeBrand === item.label ? ' active' : ''}`}
            onClick={() => setFilters({ ...app.filters, brandKey: activeBrand === item.label ? '' : item.label })}>
            <div className="brand-name">{item.label}</div>
            <div className="brand-bar"><div className="brand-bar-fill" style={{ width: `${Math.min((item.omzetAchievement || 0) * 100, 100)}%` }} /></div>
            <div className="brand-stat">{pct.format(item.omzetAchievement || 0)}</div>
          </div>
        ))}
      </div>

      {/* Row 4: Liquidity Gauges */}
      <LiquidityGauge summary={s} />

      {/* Row 5: BRAND RADAR + Cashflow Combo */}
      <div className="grid-2 radar-row">
        <ExpandablePanel title="Brand Performance Radar" note="Cash in · Cash out · Budget · Net Cash · Omzet">
          <div className="radar-body" style={{ minHeight: 360, maxHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            <RadarChartCore data={brandPerf} />
          </div>
        </ExpandablePanel>
        <ComboChart data={cashflowCombo} title="Cashflow Trend & Forecast" note="Bar: cash in/out · Line: forecast & net cash" expandable />
      </div>

      {/* Row 6: Bank Balance + Budget Status */}
      <div className="grid-2">
        <ExpandablePanel title="Saldo Rekening" note={`${(charts.bankBalance || []).length} akun bank & kas`}>
          <div className="chart-box tall">
            {chartReady && <Bar key={`bank-${(charts.bankBalance || []).length}`} data={bankData} options={{
              indexAxis: 'y', responsive: true, maintainAspectRatio: false,
              scales: {
                x: { beginAtZero: true, ticks: { callback: v => shortMoney(v), color: ct.tickColor }, grid: { color: ct.gridColor } },
                y: { grid: { display: false }, ticks: { font: { size: 11 }, color: ct.labelColor } },
              },
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: ct.tooltipBg, titleColor: ct.tooltipTitleColor, bodyColor: ct.tooltipBodyColor, callbacks: { label: ctx => ` ${money.format(ctx.raw || 0)}` } },
              },
            }} />}
          </div>
        </ExpandablePanel>
        <ExpandablePanel title="Budget Status" note="Approval composition">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0.5rem 1.15rem', height: 260 }}>
            <div className="chart-box short" style={{ flex: 1, padding: 0, minHeight: 180 }}>
              {chartReady && <Doughnut key={`d-${s.cashIn}`} data={doughnutData} options={{ cutout: '55%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: ct.tooltipBg, titleColor: ct.tooltipTitleColor, bodyColor: ct.tooltipBodyColor } } }} />}
            </div>
            <div className="summary-rows" style={{ flex: 1, padding: 0 }}>
              {(charts.budgetStatus || []).map((item, i) => (
                <div key={item.label} className="summary-row"><span style={{ color: CHART_COLORS[i], fontSize: 14 }}>●</span><span>{item.label}</span><strong>{item.value}</strong></div>
              ))}
            </div>
          </div>
        </ExpandablePanel>
      </div>

      {/* Row 7: Budget Treemap + Spending */}
      <div className="grid-2">
        <BudgetTreemap data={(charts.budgetByCategory || charts.outcomeByCategory || []).slice(0, 12)} title="Budget Allocation" note="Treemap by category" />
        <PolarChartCard data={charts.outcomeByCategory || []} title="Spending by Category" note="Outcome distribution" expandable />
      </div>

      {/* Row 8: Waterfall + Omzet */}
      <div className="grid-2">
        <ExpandablePanel title="Cash Flow Decomposition" note="Monthly waterfall">
          <div className="d3-chart" style={{ minHeight: 280 }}>
            <WaterfallChart data={waterfallData} />
          </div>
        </ExpandablePanel>
        <ExpandablePanel title="Monthly Omzet" note="Target vs realization">
          <div className="chart-box tall">
            {chartReady && <Bar key={`omzet-${(charts.omzetByMonth || []).length}`} data={omzetData} options={{
              responsive: true, maintainAspectRatio: false,
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: ct.tickColor } },
                y: { beginAtZero: true, ticks: { callback: v => shortMoney(v), color: ct.tickColor }, grid: { color: ct.gridColor } },
              },
              plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 }, color: ct.labelColor } },
                tooltip: { backgroundColor: ct.tooltipBg, titleColor: ct.tooltipTitleColor, bodyColor: ct.tooltipBodyColor },
              },
            }} />}
          </div>
        </ExpandablePanel>
      </div>

      {/* Row 9: Payable Aging */}
      <ExpandablePanel title="Payable Aging" note="Sisa hutang per aging bucket">
        <div className="d3-chart" style={{ minHeight: 280 }}>
          <HorizontalBar data={charts.payableAging || []} color="#0d9488" />
        </div>
      </ExpandablePanel>

      {/* Row 10: Brand Health */}
      <BrandHeatmap brands={app.state?.brands} brandPerformance={brandPerf} />

      {/* Row 11: Tables */}
      <div className="grid-2">
        <div className="panel tight">
          <div className="panel-head"><div><h3>Pending Approval</h3><p>{(d.tables.pendingBudget || []).length} items</p></div></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr>{['Brand','Kategori','Keterangan','Nominal','Prioritas','Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{(d.tables.pendingBudget || []).map((row, i) => <tr key={i}><td>{row.Brand}</td><td>{row.Kategori}</td><td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.Keterangan}</td><td className="mono">{money.format(row['Nominal Pengajuan (Rp)'])}</td><td>{row.Prioritas}</td><td>{row.Status}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="panel tight">
          <div className="panel-head"><div><h3>Due Soon</h3><p>{(d.tables.dueSoon || []).length} items</p></div></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr>{['Brand','Tgl Dibutuhkan','Vendor','Sisa Hutang','Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{(d.tables.dueSoon || []).map((row, i) => <tr key={i}><td>{row.Brand}</td><td>{row['Tgl Dibutuhkan']}</td><td>{row.Vendor}</td><td className="mono">{money.format(row['Sisa Hutang (Rp)'])}</td><td>{row.Status}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
