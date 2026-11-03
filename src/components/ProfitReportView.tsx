/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Printer,
  Sparkles,
} from 'lucide-react';
import { PhoneSale, TreasuryTransaction, AppSettings, Customer } from '../types';
import { calculateProfitReport } from '../utils/finance';

interface ProfitReportViewProps {
  sales: PhoneSale[];
  treasury: TreasuryTransaction[];
  customers: Customer[];
  settings: AppSettings;
}

export const ProfitReportView: React.FC<ProfitReportViewProps> = ({
  sales,
  treasury,
  customers,
  settings,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'

  // Extract distinct available months from sales
  const monthsSet = new Set<string>();
  sales.forEach((s) => {
    if (s.startDate) {
      monthsSet.add(s.startDate.substring(0, 7)); // YYYY-MM
    }
  });
  const availableMonths = Array.from(monthsSet).sort().reverse();

  // Filter sales and expenses by selected month
  const filteredSales = sales.filter((s) => {
    if (selectedMonth === 'all') return true;
    return s.startDate.startsWith(selectedMonth);
  });

  const filteredExpenses = treasury.filter((tx) => {
    if (tx.type !== 'expense') return false;
    if (selectedMonth === 'all') return true;
    return tx.date.startsWith(selectedMonth);
  });

  const totalExpenses = filteredExpenses.reduce((sum, tx) => sum + tx.amount, 0);

  // Map sales for finance report
  const salesDataForReport = filteredSales.map((s) => {
    const paidSum = s.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    const totalCollected = s.downPayment + paidSum;
    return {
      purchasePrice: s.purchasePrice,
      agreedPrice: s.agreedPrice,
      collectedAmount: totalCollected,
    };
  });

  const report = calculateProfitReport(salesDataForReport, totalExpenses);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                تقرير الأرباح الشهري وحساب العوائد
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              حساب دقيق للأرباح بناءً على سعر الشراء للجوالات، سعر المبيع، والمبالغ المحصلة فعلياً
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="all">كل الفترات (إجمالي تراكمي)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              title="طباعة تقرير الأرباح"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
          </div>
        </div>

        {/* Profit Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          
          {/* Total Agreed Sales */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium block">إجمالي قيمة المبيعات</span>
            <p className="text-lg sm:text-2xl font-bold text-cyan-400 mt-1 font-mono">
              {report.totalAgreedSales.toLocaleString()} {settings.currency}
            </p>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              عدد العقود: {filteredSales.length}
            </span>
          </div>

          {/* Cost of Goods Sold */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium block">إجمالي تكلفة الشراء</span>
            <p className="text-lg sm:text-2xl font-bold text-slate-300 mt-1 font-mono">
              {report.totalPurchaseCost.toLocaleString()} {settings.currency}
            </p>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              رأس مال الأجهزة المباعة
            </span>
          </div>

          {/* Expected Gross Profit */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium block">الأرباح المتوقعة من العقود</span>
            <p className="text-lg sm:text-2xl font-bold text-blue-400 mt-1 font-mono">
              {report.expectedGrossProfit.toLocaleString()} {settings.currency}
            </p>
            <span className="text-[11px] text-blue-400/80 block mt-0.5 font-medium">
              (المبيع - الشراء)
            </span>
          </div>

          {/* Realized Gross Profit */}
          <div className="bg-slate-900/80 border border-emerald-900/60 rounded-xl p-4 shadow-lg shadow-emerald-950/20">
            <span className="text-xs text-slate-400 font-medium block">الأرباح المحققة نقدياً</span>
            <p className="text-lg sm:text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {report.realizedGrossProfit.toLocaleString()} {settings.currency}
            </p>
            <span className="text-[11px] text-emerald-500/80 block mt-0.5">
              نسبة التحصيل: {report.collectionRate}%
            </span>
          </div>
        </div>

        {/* Net Profit After Expenses Banner */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-200">
                صافي الربح الحقيقي بعد خصم المصاريف التشغيلية ({totalExpenses} {settings.currency}):
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                {report.netProfit.toLocaleString()} {settings.currency}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-300">
            <p>إجمالي المبالغ المحصلة فعلياً: <strong className="text-white font-mono">{report.totalCollected.toLocaleString()} {settings.currency}</strong></p>
            <p className="text-slate-400 text-[11px]">يتم احتساب الربح المحقق دورياً بناءً على ما دخل الصندوق</p>
          </div>
        </div>
      </div>

      {/* Breakdown per Device Sale Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <span>تفاصيل أرباح كل جوال وجدول السداد</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {filteredSales.length} جهاز مباع
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-900/80 text-slate-400 text-xs border-b border-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">الجوال / IMEI</th>
                <th className="py-3 px-4 font-semibold">الزبون</th>
                <th className="py-3 px-4 font-semibold">سعر الشراء</th>
                <th className="py-3 px-4 font-semibold">سعر المبيع</th>
                <th className="py-3 px-4 font-semibold">الربح المتفق</th>
                <th className="py-3 px-4 font-semibold">المحصل نقدياً</th>
                <th className="py-3 px-4 font-semibold">الربح المحقق</th>
                <th className="py-3 px-4 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredSales.map((sale) => {
                const customer = customers.find((c) => c.id === sale.customerId);
                const paidSum = sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
                const totalCollected = sale.downPayment + paidSum;
                const profitAgreed = sale.agreedPrice - sale.purchasePrice;
                const collectRatio = sale.agreedPrice > 0 ? totalCollected / sale.agreedPrice : 0;
                const profitRealized = Math.round(profitAgreed * collectRatio * 100) / 100;

                return (
                  <tr key={sale.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{sale.phoneName}</p>
                      <span className="font-mono text-[11px] text-slate-400">
                        {sale.imei}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-200">
                        {customer ? customer.fullName : 'زبون'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {sale.purchasePrice} {settings.currency}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {sale.agreedPrice} {settings.currency}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                      +{profitAgreed} {settings.currency}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {totalCollected} {settings.currency}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({Math.round(collectRatio * 100)}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-300 whitespace-nowrap">
                      +{profitRealized} {settings.currency}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {sale.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          مغلق
                        </span>
                      )}
                      {sale.status === 'breached_term' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          تجاوز 3 أشهر
                        </span>
                      )}
                      {sale.status === 'overdue' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          متأخر
                        </span>
                      )}
                      {sale.status === 'active' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          نشط
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
