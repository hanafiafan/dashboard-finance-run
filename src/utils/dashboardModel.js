/**
 * Values from PostgreSQL numeric columns may arrive as numbers or numeric strings.
 * Keep raw rupiah amounts (not chart abbreviations) for sorting and calculations.
 * @param {unknown} value
 * @returns {number}
 */
export function finiteAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @typedef {Object} DashboardTransaction
 * @property {string|number} ID
 * @property {string} Tanggal ISO calendar date from the database
 * @property {string} Brand
 * @property {string} Keterangan
 * @property {'income'|'outcome'} kind
 * @property {number} amount Unformatted IDR, including fees for outgoing payments
 */

/** @returns {DashboardTransaction[]} */
export function recentTransactions(tables = {}) {
  return [
    ...(tables.recentIncome || []).map(row => ({ ...row, kind: 'income', amount: finiteAmount(row.Nominal) })),
    ...(tables.recentOutcome || []).map(row => ({
      ...row, kind: 'outcome',
      amount: row['Total Pengeluaran (Rp)'] != null
        ? finiteAmount(row['Total Pengeluaran (Rp)'])
        : finiteAmount(row['Jumlah (Rp)']) + finiteAmount(row['Biaya (Rp)']),
    })),
  ].sort((a, b) => String(b.Tanggal || '').localeCompare(String(a.Tanggal || '')));
}

export function isAwaitingApproval(status) {
  return status === 'Pending' || status === 'Pending Final Approval';
}
