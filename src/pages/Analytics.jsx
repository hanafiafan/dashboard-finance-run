import { Bar, Doughnut } from 'react-chartjs-2';
import { DataTable } from '../components/ui/DataTable';
import { Panel } from '../components/ui/MetricCard';
import { CHART_COLORS as COLORS } from '../utils/constants';
import { useApp } from '../contexts/AppContext';
import { shortMoney } from '../utils/formatters';

export function Analytics() {
  const { app } = useApp();
  const d = app.state?.dashboard;
  if (!d) return null;
  const charts = d.charts;

  const brandPerfData = {
    labels: (charts.brandPerformance || []).map(x => x.label),
    datasets: [
      { label: 'Cash In', data: (charts.brandPerformance || []).map(x => x.cashIn), backgroundColor: '#2563eb', borderRadius: 4 },
      { label: 'Cash Out', data: (charts.brandPerformance || []).map(x => x.cashOut), backgroundColor: '#f9735b', borderRadius: 4 },
      { label: 'Budget', data: (charts.brandPerformance || []).map(x => x.budget), backgroundColor: '#7c3aed', borderRadius: 4 },
    ],
  };

  const bankData = {
    labels: (charts.bankBalance || []).map(x => x.label),
    datasets: [{ label: 'Saldo', data: (charts.bankBalance || []).map(x => x.value), backgroundColor: COLORS, borderRadius: 4 }],
  };

  const omzetData = {
    labels: (charts.omzetByMonth || []).map(x => x.label),
    datasets: [
      { label: 'Target', data: (charts.omzetByMonth || []).map(x => x.target), backgroundColor: 'rgba(15,118,110,0.3)', borderColor: '#0f766e', borderWidth: 2, borderRadius: 4 },
      { label: 'Realisasi', data: (charts.omzetByMonth || []).map(x => x.real), backgroundColor: '#2563eb', borderRadius: 4 },
    ],
  };

  const priorityData = {
    labels: (charts.priority || []).map(x => x.label),
    datasets: [{ data: (charts.priority || []).map(x => x.value), backgroundColor: COLORS, borderWidth: 0 }],
  };

  // Controlling — how close Forecast Cash In/Out landed vs what actually happened,
  // reusing monthlyCashFlow (already aggregates all 4 series per month, no new query).
  const controllingData = {
    labels: (charts.monthlyCashFlow || []).map(x => x.label),
    datasets: [
      { label: 'Forecast In', data: (charts.monthlyCashFlow || []).map(x => x.forecastIn), backgroundColor: 'rgba(37,99,235,0.35)', borderColor: '#2563eb', borderWidth: 1.5, borderRadius: 4 },
      { label: 'Realisasi In', data: (charts.monthlyCashFlow || []).map(x => x.cashIn), backgroundColor: '#2563eb', borderRadius: 4 },
      { label: 'Forecast Out', data: (charts.monthlyCashFlow || []).map(x => x.forecastOut), backgroundColor: 'rgba(249,115,91,0.35)', borderColor: '#f9735b', borderWidth: 1.5, borderRadius: 4 },
      { label: 'Realisasi Out', data: (charts.monthlyCashFlow || []).map(x => x.cashOut), backgroundColor: '#f9735b', borderRadius: 4 },
    ],
  };

  return (
    <>
      <div className="grid-2">
        <Panel title="Performa brand" note="Cash in, cash out, budget" size="tall">
          <Bar data={brandPerfData} options={opts} />
        </Panel>
        <Panel title="Saldo rekening" note="Posisi bank dan kas" size="tall">
          <Bar data={bankData} options={opts} />
        </Panel>
      </div>
      <div className="grid-2">
        <Panel title="Omzet bulanan" note="Target vs realisasi" size="tall">
          <Bar data={omzetData} options={opts} />
        </Panel>
        <Panel title="Prioritas budget" note="Komposisi urgency">
          <Doughnut data={priorityData} options={{ ...opts, cutout: '62%', scales: undefined }} />
        </Panel>
      </div>
      <div className="grid-2">
        <Panel title="Controlling — Forecast vs Aktual" note="Seberapa akurat forecast dibanding realisasi Cash In/Out per bulan" size="tall">
          <Bar data={controllingData} options={opts} />
        </Panel>
      </div>
      <div className="grid-3">
        <QuickTable title="Cash in terbaru" rows={d.tables.recentIncome} columns={['Brand', 'Tanggal', 'Keterangan', 'Customer', 'Nominal', 'Bank Masuk']} />
        <QuickTable title="Cash out terbaru" rows={d.tables.recentOutcome} columns={['Brand', 'Tanggal', 'Keterangan', 'Kategori', 'Total Pengeluaran (Rp)', 'Bank Keluar']} />
        <QuickTable title="Saldo rekening" rows={d.tables.bank} columns={['Brand', 'Bank', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Total']} />
      </div>
    </>
  );
}

function QuickTable({ title, rows, columns }) {
  return (
    <div className="panel tight">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{(rows || []).length} data</p>
        </div>
      </div>
      <DataTable columns={columns} rows={rows || []} />
    </div>
  );
}

const opts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } },
  scales: {
    y: { beginAtZero: true, ticks: { callback: (v) => shortMoney(v) } },
    x: { grid: { display: false } },
  },
};
