/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PhoneSale {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerNationalId: string;
  phoneName: string;
  imei: string;
  purchasePrice: number; // سعر شراء الجوال
  agreedPrice: number; // السعر الكامل المتفق عليه للبيع
  downPayment: number; // الدفعة الأولى
  termMonths: number; // مدة التقسيط (الافتراضي 3 أشهر)
  startDate: string; // YYYY-MM-DD تاريخ بدء العقد
  status: 'active' | 'completed' | 'overdue' | 'breached_term';
  notes?: string;
}

export interface Installment {
  id: string;
  saleId: string;
  customerId: string;
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  paidAmount: number;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface TreasuryTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  category: string;
  referenceSaleId?: string;
  referenceInstallmentId?: string;
}

/**
 * Checks if down payment is less than 50% of the agreed installment price.
 */
export function isDownPaymentBelowFiftyPercent(downPayment: number, agreedPrice: number): boolean {
  if (agreedPrice <= 0) return false;
  return downPayment < agreedPrice * 0.5;
}

/**
 * Calculates remaining balance on a sale after down payment and paid installments.
 */
export function calculateRemainingBalance(
  agreedPrice: number,
  downPayment: number,
  paidInstallmentsSum: number
): number {
  const remaining = agreedPrice - downPayment - paidInstallmentsSum;
  return Math.max(0, Math.round(remaining * 100) / 100);
}

/**
 * Checks if 3 months (or specified term) have elapsed from sale start date while balance remains unpaid.
 */
export function isThreeMonthTermBreached(
  startDateStr: string,
  remainingBalance: number,
  currentDateStr: string = new Date().toISOString().split('T')[0],
  termMonths: number = 3
): boolean {
  if (remainingBalance <= 0) return false;
  const start = new Date(startDateStr);
  const current = new Date(currentDateStr);
  if (isNaN(start.getTime()) || isNaN(current.getTime())) return false;

  // Add termMonths to start date
  const deadline = new Date(start);
  deadline.setMonth(deadline.getMonth() + termMonths);

  return current.getTime() > deadline.getTime();
}

/**
 * Checks if an installment is overdue.
 */
export function isInstallmentOverdue(
  dueDateStr: string,
  paidAmount: number,
  targetAmount: number,
  currentDateStr: string = new Date().toISOString().split('T')[0]
): boolean {
  if (paidAmount >= targetAmount) return false;
  const due = new Date(dueDateStr);
  const current = new Date(currentDateStr);
  if (isNaN(due.getTime()) || isNaN(current.getTime())) return false;
  return current.getTime() > due.getTime();
}

/**
 * Calculates Treasury totals and net balance.
 */
export function calculateTreasurySummary(transactions: TreasuryTransaction[]): {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
} {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpenses += tx.amount;
    }
  }

  const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netBalance,
  };
}

/**
 * Calculates comprehensive profit metrics for sales and cash flow.
 */
export function calculateProfitReport(
  sales: {
    purchasePrice: number;
    agreedPrice: number;
    collectedAmount: number;
  }[],
  operatingExpenses: number
): {
  totalAgreedSales: number;
  totalPurchaseCost: number;
  expectedGrossProfit: number;
  totalCollected: number;
  realizedGrossProfit: number;
  netProfit: number;
  collectionRate: number;
} {
  let totalAgreedSales = 0;
  let totalPurchaseCost = 0;
  let totalCollected = 0;

  for (const s of sales) {
    totalAgreedSales += s.agreedPrice;
    totalPurchaseCost += s.purchasePrice;
    totalCollected += s.collectedAmount;
  }

  const expectedGrossProfit = totalAgreedSales - totalPurchaseCost;
  const collectionRate = totalAgreedSales > 0 ? (totalCollected / totalAgreedSales) : 0;
  // Realized profit proportional to collection percentage
  const realizedGrossProfit = Math.round(expectedGrossProfit * collectionRate * 100) / 100;
  const netProfit = Math.round((realizedGrossProfit - operatingExpenses) * 100) / 100;

  return {
    totalAgreedSales: Math.round(totalAgreedSales * 100) / 100,
    totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
    expectedGrossProfit: Math.round(expectedGrossProfit * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    realizedGrossProfit,
    netProfit,
    collectionRate: Math.round(collectionRate * 1000) / 10, // percentage e.g. 75.5%
  };
}
