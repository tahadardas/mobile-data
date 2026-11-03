/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDownPaymentBelowFiftyPercent,
  calculateRemainingBalance,
  isThreeMonthTermBreached,
  isInstallmentOverdue,
  calculateTreasurySummary,
  calculateProfitReport,
  type TreasuryTransaction,
} from './finance';

test('isDownPaymentBelowFiftyPercent correctly identifies down payment under 50%', () => {
  // Agreed price 1000, 50% is 500
  assert.equal(isDownPaymentBelowFiftyPercent(400, 1000), true);
  assert.equal(isDownPaymentBelowFiftyPercent(499.9, 1000), true);
  assert.equal(isDownPaymentBelowFiftyPercent(500, 1000), false);
  assert.equal(isDownPaymentBelowFiftyPercent(600, 1000), false);
  assert.equal(isDownPaymentBelowFiftyPercent(0, 1000), true);
  assert.equal(isDownPaymentBelowFiftyPercent(0, 0), false);
});

test('calculateRemainingBalance deducts down payment and installments correctly', () => {
  // 1200 agreed, 600 down payment, 200 paid installment = 400 remaining
  assert.equal(calculateRemainingBalance(1200, 600, 200), 400);
  // Full payment: 1200 agreed, 600 down payment, 600 paid installments = 0
  assert.equal(calculateRemainingBalance(1200, 600, 600), 0);
  // Overpayment handles clamp to 0
  assert.equal(calculateRemainingBalance(1200, 700, 600), 0);
});

test('isThreeMonthTermBreached warns when 3 months passed with remaining balance', () => {
  // Start date: 2026-01-01. Deadline is 3 months later (2026-04-01).
  // Check on 2026-03-15 (within term) -> false
  assert.equal(isThreeMonthTermBreached('2026-01-01', 300, '2026-03-15', 3), false);

  // Check on 2026-04-02 (after 3 months) with remaining balance -> true (breach warning!)
  assert.equal(isThreeMonthTermBreached('2026-01-01', 300, '2026-04-02', 3), true);

  // Check on 2026-05-01 but remaining balance is 0 -> false (paid in full)
  assert.equal(isThreeMonthTermBreached('2026-01-01', 0, '2026-05-01', 3), false);
});

test('isInstallmentOverdue detects late payments', () => {
  // Due date: 2026-02-15. Current date: 2026-02-20. Unpaid -> Overdue
  assert.equal(isInstallmentOverdue('2026-02-15', 0, 200, '2026-02-20'), true);

  // Due date: 2026-02-15. Paid 200 -> Not overdue
  assert.equal(isInstallmentOverdue('2026-02-15', 200, 200, '2026-02-20'), false);

  // Due date: 2026-03-01. Current date: 2026-02-20 (upcoming) -> Not overdue
  assert.equal(isInstallmentOverdue('2026-03-01', 0, 200, '2026-02-20'), false);
});

test('calculateTreasurySummary correctly tallies income, expenses and net balance', () => {
  const txs: TreasuryTransaction[] = [
    { id: '1', type: 'income', amount: 500, description: 'دفعة أولى - آيفون 15', date: '2026-01-01', category: 'مبيعات تقسيط' },
    { id: '2', type: 'income', amount: 200, description: 'قسط 1 - آيفون 15', date: '2026-02-01', category: 'أقساط محصلة' },
    { id: '3', type: 'expense', amount: 50, description: 'فاتورة انترنت ومصروف', date: '2026-02-05', category: 'مصاريف تشغيلية' },
    { id: '4', type: 'expense', amount: 30, description: 'مطبوعات وسندات', date: '2026-02-06', category: 'قرطاسية' },
  ];

  const summary = calculateTreasurySummary(txs);
  assert.equal(summary.totalIncome, 700);
  assert.equal(summary.totalExpenses, 80);
  assert.equal(summary.netBalance, 620);
});

test('calculateProfitReport calculates expected and realized profit', () => {
  // Sale 1: Buy 800, Sell 1200 (Agreed profit = 400). Collected = 600 (50%).
  // Sale 2: Buy 400, Sell 600 (Agreed profit = 200). Collected = 600 (100%).
  // Total Sales = 1800. Total Cost = 1200. Expected Profit = 600.
  // Total Collected = 1200 (66.66% collected).
  // Operating Expenses = 100.
  const sales = [
    { purchasePrice: 800, agreedPrice: 1200, collectedAmount: 600 },
    { purchasePrice: 400, agreedPrice: 600, collectedAmount: 600 },
  ];

  const report = calculateProfitReport(sales, 100);
  assert.equal(report.totalAgreedSales, 1800);
  assert.equal(report.totalPurchaseCost, 1200);
  assert.equal(report.expectedGrossProfit, 600);
  assert.equal(report.totalCollected, 1200);
  // Collection rate = 1200/1800 = 66.7%
  assert.equal(report.collectionRate, 66.7);
  // Realized gross profit = 600 * (1200/1800) = 400
  assert.equal(report.realizedGrossProfit, 400);
  // Net profit = 400 - 100 = 300
  assert.equal(report.netProfit, 300);
});
