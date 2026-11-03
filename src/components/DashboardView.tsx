/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Smartphone,
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Database,
  Calendar,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { PhoneSale, Customer, TreasuryTransaction, AppSettings, InstallmentRecord } from '../types';
import { calculateTreasurySummary } from '../utils/finance';
import { AppStorageService } from '../services/storage';

interface DashboardViewProps {
  sales: PhoneSale[];
  customers: Customer[];
  treasury: TreasuryTransaction[];
  settings: AppSettings;
  onOpenNewSale: () => void;
  onOpenNewCustomer: () => void;
  onNavigateTab: (tab: string) => void;
  onPayInstallment: (sale: PhoneSale, inst: InstallmentRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  customers,
  treasury,
  settings,
  onOpenNewSale,
  onOpenNewCustomer,
  onNavigateTab,
  onPayInstallment,
}) => {
  const treasurySummary = calculateTreasurySummary(treasury);

  // Financial metrics
  let totalAgreedSales = 0;
  let totalCollected = 0;

  for (const s of sales) {
    totalAgreedSales += s.agreedPrice;
    const paidSum = s.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
    totalCollected += s.downPayment + paidSum;
  }

  const totalOutstanding = Math.max(0, totalAgreedSales - totalCollected);

  // Critical alerts
  const breachedSales = sales.filter((s) => s.status === 'breached_term');
  const overdueSales = sales.filter((s) => s.status === 'overdue');
  const activeSales = sales.filter((s) => s.status === 'active');
  const completedSales = sales.filter((s) => s.status === 'completed');

  // Gather overdue installments
  const overdueList: { sale: PhoneSale; inst: InstallmentRecord; customer?: Customer }[] = [];
  for (const s of sales) {
    if (s.status === 'completed') continue;
    const cust = customers.find((c) => c.id === s.customerId);
    for (const inst of s.installments) {
      if (inst.status === 'overdue') {
        overdueList.push({ sale: s, inst, customer: cust });
      }
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Quick Action Bar (Android App Native Feel) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          onClick={onOpenNewSale}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 text-xs sm:text-sm font-bold active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>بيع جوال بالتقسيط</span>
        </button>

        <button
          onClick={() => onNavigateTab('treasury')}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 text-xs sm:text-sm font-bold active:scale-95 transition-all"
        >
          <Wallet className="w-4 h-4" />
          <span>قبض / صرف بالصندوق</span>
        </button>

        <button
          onClick={onOpenNewCustomer}
          className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold active:scale-95 transition-all"
        >
          <Users className="w-4 h-4 text-cyan-400" />
          <span>إضافة زبون جديد</span>
        </button>

        <button
          onClick={() => onNavigateTab('backup')}
          className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold active:scale-95 transition-all"
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>النسخ اليومي (محاسبة جوالات)</span>
        </button>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Treasury Current Balance */}
        <div
          onClick={() => onNavigateTab('treasury')}
          className="cursor-pointer bg-slate-800/90 border border-cyan-700/60 hover:border-cyan-500 rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">رصيد الصندوق الحالي</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 mt-2">
            {treasurySummary.netBalance.toLocaleString()} {settings.currency}
          </p>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>مقبوض: <strong className="text-emerald-400">{treasurySummary.totalIncome.toLocaleString()}</strong></span>
            <span>مدفوع: <strong className="text-rose-400">{treasurySummary.totalExpenses.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Total Sales & Collected */}
        <div
          onClick={() => onNavigateTab('sales')}
          className="cursor-pointer bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">إجمالي مبيعات التقسيط</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-2">
            {totalAgreedSales.toLocaleString()} {settings.currency}
          </p>
          <p className="text-[11px] text-emerald-400 mt-2">
            تم تحصيل: {totalCollected.toLocaleString()} {settings.currency}
          </p>
        </div>

        {/* Outstanding in Market */}
        <div
          onClick={() => onNavigateTab('sales')}
          className="cursor-pointer bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">المتبقي في ذمة الزبائن</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-2">
            {totalOutstanding.toLocaleString()} {settings.currency}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            على ذمة {activeSales.length + overdueSales.length + breachedSales.length} عقود جارية
          </p>
        </div>

        {/* Breached and Overdue Warnings KPI */}
        <div
          onClick={() => onNavigateTab('sales')}
          className={`cursor-pointer border rounded-2xl p-4 sm:p-5 shadow-xl transition-all ${
            breachedSales.length > 0
              ? 'bg-rose-950/40 border-rose-600/80 hover:border-rose-500 animate-pulse'
              : 'bg-slate-800/90 border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span className="font-bold">حسابات متجاوزة 3 أشهر</span>
            <div className="w-8 h-8 rounded-lg bg-rose-900/60 text-rose-300 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-rose-400 mt-2">
            {breachedSales.length} عقد متجاوز
          </p>
          <p className="text-[11px] text-amber-300 mt-2">
            بالإضافة لـ {overdueList.length} أقساط شهرية متأخرة
          </p>
        </div>
      </div>

      {/* Critical Reminders / Follow-up Section */}
      {(breachedSales.length > 0 || overdueList.length > 0) && (
        <div className="bg-slate-800/90 border border-rose-900/60 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">
                متابعة الزبائن المتأخرين وتجاوز الـ 3 أشهر
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('sales')}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              عرض كافة العقود
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Breached Term Customers */}
            {breachedSales.map((sale) => {
              const customer = customers.find((c) => c.id === sale.customerId);
              const paidSum = sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
              const remaining = Math.round(Math.max(0, sale.agreedPrice - sale.downPayment - paidSum) * 100) / 100;
              const whatsappUrl = customer
                ? AppStorageService.generateWhatsAppUrl(
                    customer.phone,
                    AppStorageService.generateThreeMonthBreachMessage(sale, remaining, customer, settings)
                  )
                : '#';

              return (
                <div
                  key={`dash-breach-${sale.id}`}
                  className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-200">
                        {customer?.fullName} (الرقم الوطني: {customer?.nationalId})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-700 text-white">
                        تجاوز مهلة الـ 3 أشهر
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      جهاز: <strong className="text-white">{sale.phoneName}</strong> (IMEI: {sale.imei}) | المتبقي غير المغلق: <strong className="text-amber-300 font-bold">{remaining} {settings.currency}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {customer && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>تنبيه واتساب</span>
                      </a>
                    )}
                    {customer && (
                      <a
                        href={`tel:${customer.phone}`}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                        title="اتصال"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Overdue installments */}
            {overdueList.slice(0, 3).map(({ sale, inst, customer }) => (
              <div
                key={`dash-overdue-${inst.id}`}
                className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-200">
                      {customer?.fullName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                      قسط {inst.installmentNumber} متأخر
                    </span>
                  </div>
                  <p className="text-slate-300 mt-0.5">
                    {sale.phoneName} | موعد الاستحقاق: <span className="font-mono text-amber-200">{inst.dueDate}</span> | المبلغ: <strong className="text-emerald-400">{inst.amount} {settings.currency}</strong>
                  </p>
                </div>

                <button
                  onClick={() => onPayInstallment(sale, inst)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                >
                  سداد القسط الآن
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity from Treasury */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">
              آخر الحركات المسجلة في الصندوق
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('treasury')}
            className="text-xs text-cyan-400 hover:underline font-semibold"
          >
            الانتقال لصفحة الصندوق
          </button>
        </div>

        <div className="space-y-2">
          {treasury.slice(0, 4).map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tx.description}</p>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {tx.date} | {tx.category}
                    </span>
                  </div>
                </div>

                <span
                  className={`font-mono font-bold text-sm ${
                    isIncome ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isIncome ? '+' : '-'} {tx.amount.toLocaleString()} {settings.currency}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
