import test from 'node:test';
import assert from 'node:assert/strict';
import { finiteAmount, recentTransactions, isAwaitingApproval } from '../src/utils/dashboardModel.js';

test('numeric database values retain precision and negative balances', () => {
  assert.equal(finiteAmount('1250000.50'), 1250000.5);
  assert.equal(finiteAmount(-4500), -4500);
  for (const v of [undefined, null, NaN, Infinity, {}, true, 'invalid']) assert.equal(finiteAmount(v), 0);
});
test('outgoing payments include fees without double counting stored totals', () => {
  const rows = recentTransactions({ recentOutcome: [
    { 'Jumlah (Rp)': '1000', 'Biaya (Rp)': '50' },
    { 'Jumlah (Rp)': '1000', 'Biaya (Rp)': '50', 'Total Pengeluaran (Rp)': '1050' },
    { 'Jumlah (Rp)': 1000, 'Total Pengeluaran (Rp)': 0 },
  ] });
  assert.deepEqual(rows.map(r => r.amount), [1050, 1050, 0]);
});
test('merged activity sorts newest first without mutating source data', () => {
  const income = Object.freeze([{ ID: 1, Tanggal: '2026-01-02', Nominal: '12000' }]);
  const rows = recentTransactions({ recentIncome: income, recentOutcome: [{ ID: 1, Tanggal: '2026-01-03', 'Total Pengeluaran (Rp)': 500 }] });
  assert.deepEqual(rows.map(r => r.kind), ['outcome', 'income']);
  assert.equal(rows[1].amount, 12000);
  assert.equal(income[0].kind, undefined);
});
test('missing activity remains empty rather than generating sample records', () => {
  assert.deepEqual(recentTransactions(), []);
  assert.deepEqual(recentTransactions({}), []);
});

const { readAllRows } = await import('../src/api/readAllRows.js');
test('financial reads include later pages instead of silently truncating totals', async () => {
  const calls = [];
  const result = await readAllRows({ range: async (from, to) => {
    calls.push([from, to]);
    return { data: [1, 2, 3, 4, 5].slice(from, to + 1) };
  } }, 2);
  assert.deepEqual(result.data, [1, 2, 3, 4, 5]);
  assert.deepEqual(calls, [[0, 1], [2, 3], [4, 5]]);
});
test('a failed subsequent page rejects the whole financial read', async () => {
  await assert.rejects(readAllRows({ range: async from => from === 0
    ? { data: [1, 2] } : { error: { message: 'Connection failed' } } }, 2), /Connection failed/);
});

test('approval queue includes the second sign-off and excludes finished or returned requests', () => {
  const statuses = ['Pending', 'Approved', 'Pending Final Approval', 'Paid', 'Rejected', 'Need Revision', null];
  assert.deepEqual(statuses.filter(isAwaitingApproval), ['Pending', 'Pending Final Approval']);
});
