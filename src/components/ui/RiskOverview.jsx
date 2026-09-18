import MetricCard from './MetricCard';
import { money, pct } from '../../utils/formatters';
import { ewsStatus, cashPositionStatus, forecastCashPositionStatus, ewsDetail, capEarlyMonthStatus } from '../../utils/ews';
export default function RiskOverview({ summary: s }) {
  const cashPosColor = cashPositionStatus(s.cashPosition || 0);
  const cashOutRatioColor = capEarlyMonthStatus(ewsStatus(s.cashOutRatio || 0, 0.85, 0.90, false));
  const cashConversionColor = capEarlyMonthStatus(ewsStatus(s.cashConversion || 0, 0.65, 0.50));
  const receivableRiskColor = capEarlyMonthStatus(ewsStatus(s.receivableRisk || 0, 0.20, 0.35, false));
  const payableRiskColor = capEarlyMonthStatus(ewsStatus(s.payableRisk || 0, 0.30, 0.50, false));
  const forecastCashPosColor = forecastCashPositionStatus(s.forecastCashPosition30 || 0, s.bankBalance || 0);
  const npmColor = capEarlyMonthStatus(ewsStatus(s.npm || 0, 0.15, 0.05, true));

  const cashPosD = ewsDetail('cashPosition', cashPosColor);
  const cashOutRatioD = ewsDetail('cashOutRatio', cashOutRatioColor);
  const cashConversionD = ewsDetail('cashConversion', cashConversionColor);
  const receivableRiskD = ewsDetail('receivableRisk', receivableRiskColor);
  const payableRiskD = ewsDetail('payableRisk', payableRiskColor);
  const forecastCashPosD = ewsDetail('forecastCashPosition', forecastCashPosColor);
  const npmD = ewsDetail('npm', npmColor);

  const ewsMetrics = [
    { label: 'Cash Position', value: money.format(s.cashPosition || 0), color: cashPosColor, note: `Hari ini: +${money.format(s.cashInToday || 0)} · −${money.format(s.cashOutToday || 0)}`, statusLabel: cashPosD.label, arti: cashPosD.arti, rumus: cashPosD.rumus },
    { label: 'Cash Out Ratio', value: pct.format(s.cashOutRatio || 0), color: cashOutRatioColor, statusLabel: cashOutRatioD.label, arti: cashOutRatioD.arti, rumus: cashOutRatioD.rumus },
    { label: 'NPM (Net Profit Margin)', value: pct.format(s.npm || 0), color: npmColor, statusLabel: npmD.label, arti: npmD.arti, rumus: npmD.rumus },
    { label: 'Cash Conversion', value: pct.format(s.cashConversion || 0), color: cashConversionColor, statusLabel: cashConversionD.label, arti: cashConversionD.arti, rumus: cashConversionD.rumus },
    { label: 'Receivable Risk', value: pct.format(s.receivableRisk || 0), color: receivableRiskColor, statusLabel: receivableRiskD.label, arti: receivableRiskD.arti, rumus: receivableRiskD.rumus },
    { label: 'Payable Risk', value: pct.format(s.payableRisk || 0), color: payableRiskColor, statusLabel: payableRiskD.label, arti: payableRiskD.arti, rumus: payableRiskD.rumus },
    { label: 'Forecast Cash Position (30 hari)', value: money.format(s.forecastCashPosition30 || 0), color: forecastCashPosColor, statusLabel: forecastCashPosD.label, arti: forecastCashPosD.arti, rumus: forecastCashPosD.rumus },
  ];

  return <details className="finance-card risk-disclosure"><summary>Indikator risiko keuangan <span>Posisi kas, margin, dan kewajiban</span></summary><div className="metric-grid">{ewsMetrics.map(m => <MetricCard key={m.label} {...m}/>)}</div></details>;
}
