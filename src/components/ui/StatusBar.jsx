import { useMemo } from 'react';
import { Wifi, WifiOff, Database, Clock, CheckCircle2, Cloud, CloudOff } from 'lucide-react';

/**
 * StatusBar — shows connection status, sync date, database health
 */
export default function StatusBar({ app, demo, lastSyncAt }) {
  const brands = app?.state?.brands || [];
  const companyCount = useMemo(() => new Set(brands.map(b => b.Company)).size, [brands]);

  const indicators = [
    {
      icon: demo ? WifiOff : Wifi,
      label: 'Connection',
      value: demo ? 'Demo Mode' : 'Supabase',
      ok: !demo,
      color: demo ? 'var(--amber)' : 'var(--green)',
    },
    {
      icon: Database,
      label: 'Database',
      value: `${companyCount} companies · ${brands.length} brands`,
      ok: brands.length > 0,
      color: brands.length > 0 ? 'var(--green)' : 'var(--rose)',
    },
    {
      icon: Clock,
      label: 'Last Sync',
      value: lastSyncAt ? new Date(lastSyncAt).toLocaleString('id-ID') : 'Not synced',
      ok: !!lastSyncAt,
      color: lastSyncAt ? 'var(--teal)' : 'var(--text-tertiary)',
    },
    {
      icon: demo ? CloudOff : Cloud,
      label: 'API',
      value: demo ? 'Local Demo' : 'PostgreSQL',
      ok: true,
      color: demo ? 'var(--text-tertiary)' : 'var(--blue)',
    },
    {
      icon: CheckCircle2,
      label: 'Status',
      value: brands.length > 0 ? 'Operational' : 'No Data',
      ok: brands.length > 0,
      color: brands.length > 0 ? 'var(--green)' : 'var(--amber)',
    },
  ];

  return (
    <div className="status-bar">
      {indicators.map(item => (
        <div key={item.label} className="status-indicator">
          <item.icon size={13} color={item.color} />
          <span className="status-ind-label">{item.label}</span>
          <span className="status-ind-value" style={{ color: item.color }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
