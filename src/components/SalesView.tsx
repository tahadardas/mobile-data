/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Printer,
  MessageCircle,
  Plus,
  Search,
} from 'lucide-react';
import { PhoneSale, Customer, InstallmentRecord, AppSettings } from '../types';
import { isDownPaymentBelowFiftyPercent } from '../utils/finance';
import { AppStorageService } from '../services/storage';

interface SalesViewProps {
  sales: PhoneSale[];
  customers: Customer[];
  settings: AppSettings;
  onPayInstallment: (sale: PhoneSale, inst: InstallmentRecord) => void;
  onOpenNewSale: () => void;
  onViewContract: (sale: PhoneSale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  customers,
  settings,
  onPayInstallment,
  onOpenNewSale,
  onViewContract,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'overdue' | 'breached_term' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedImei, setCopiedImei] = useState<string | null>(null);

  const handleCopyImei = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiedImei(imei);
    setTimeout(() => setCopiedImei(null), 2000);
  };

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    if (filterTab !== 'all' && sale.status !== filterTab) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const customer = customers.find((c) => c.id === sale.customerId);
      const matchPhone = sale.phoneName.toLowerCase().includes(q);
      const matchImei = sale.imei.toLowerCase().includes(q);
      const matchCust = customer?.fullName.toLowerCase().includes(q);
      const matchNatId = customer?.nationalId.includes(q);
      if (!matchPhone && !matchImei && !matchCust && !matchNatId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar with Filters and Add Button */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                عقود بيع الجوالات بالتقسيط
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              متابعة الهواتف المباعة، الأقساط الشهرية، الدفعات الأولى والتحذيرات الذكية
            </p>
          </div>

          <button
            onClick={onOpenNewSale}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>عقد بيع جوال جديد</span>
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-700/80">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80 text-xs font-semibold">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterTab === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({sales.length})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterTab === 'active' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              نشط منتظم ({sales.filter((s) => s.status === 'active').length})
            </button>
            <button
              onClick={() => setFilterTab('overdue')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterTab === 'overdue' ? 'bg-amber-600 text-white shadow' : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>متأخر ({sales.filter((s) => s.status === 'overdue').length})</span>
            </button>
            <button
              onClick={() => setFilterTab('breached_term')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterTab === 'breached_term' ? 'bg-rose-600 text-white shadow' : 'text-rose-400 hover:text-rose-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>تجاوز 3 أشهر ({sales.filter((s) => s.status === 'breached_term').length})</span>
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterTab === 'completed' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              مسدد ومغلق ({sales.filter((s) => s.status === 'completed').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالجهاز، الإيمي (IMEI)، أو الزبون..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Sales Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSales.map((sale) => {
          const customer = customers.find((c) => c.id === sale.customerId);
          const paidInstallmentsSum = sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
          const totalPaid = Math.round((sale.downPayment + paidInstallmentsSum) * 100) / 100;
          const remaining = Math.round(Math.max(0, sale.agreedPrice - totalPaid) * 100) / 100;
          const progressPercent = Math.min(100, Math.round((totalPaid / sale.agreedPrice) * 100));
          const isDownPaymentLow = isDownPaymentBelowFiftyPercent(sale.downPayment, sale.agreedPrice);

          // Next pending or overdue installment
          const nextInstallment = sale.installments.find((i) => i.status !== 'paid');

          return (
            <div
              key={sale.id}
              className={`bg-slate-800/90 border rounded-2xl p-4 sm:p-5 shadow-lg transition-all hover:border-slate-600 flex flex-col justify-between ${
                sale.status === 'breached_term'
                  ? 'border-rose-600/80 bg-rose-950/20'
                  : sale.status === 'overdue'
                  ? 'border-amber-600/70 bg-amber-950/20'
                  : sale.status === 'completed'
                  ? 'border-emerald-600/50'
                  : 'border-slate-700/80'
              }`}
            >
              <div>
                {/* Header: Device Name & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                      <span>{sale.phoneName}</span>
                    </h3>

                    {/* IMEI with copy */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">IMEI:</span>
                      <span className="font-mono text-xs text-cyan-300 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {sale.imei}
                      </span>
                      <button
                        onClick={() => handleCopyImei(sale.imei)}
                        title="نسخ رقم IMEI"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                      >
                        {copiedImei === sale.imei ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {sale.status === 'breached_term' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-md animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>تجاوز 3 أشهر وغير مغلق</span>
                      </span>
                    )}
                    {sale.status === 'overdue' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                        <Clock className="w-3.5 h-3.5" />
                        <span>قسط متأخر</span>
                      </span>
                    )}
                    {sale.status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/80 text-blue-300 border border-blue-700">
                        <span>نشط (منتظم)</span>
                      </span>
                    )}
                    {sale.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مغلق بالكامل</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 50% Down Payment Warning Badge */}
                {isDownPaymentLow && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-600/70 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      ⚠️ تنبيه: الدفعة الأولى أقل من 50% من سعر المبيع المتفق عليه! (المسدد: {sale.downPayment} من {sale.agreedPrice} {settings.currency})
                    </span>
                  </div>
                )}

                {/* Customer Information */}
                <div className="mt-4 p-3 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الزبون المتعاقد:</span>
                    <span className="font-bold text-white text-sm">
                      {customer ? customer.fullName : 'زبون غير مسجل'}
                    </span>
                    <span className="text-slate-400 block mt-0.5 font-mono">
                      الرقم الوطني: {customer?.nationalId || '---'} | هاتف: {customer?.phone}
                    </span>
                  </div>

                  {customer && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 font-medium"
                    >
                      اتصال
                    </a>
                  )}
                </div>

                {/* Financial Summary Matrix */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400">سعر الشراء</p>
                    <p className="font-mono font-bold text-slate-300 text-xs sm:text-sm mt-0.5">
                      {sale.purchasePrice} {settings.currency}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400">سعر البيع المتفق عليه</p>
                    <p className="font-mono font-bold text-cyan-300 text-xs sm:text-sm mt-0.5">
                      {sale.agreedPrice} {settings.currency}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400">المبلغ المتبقي</p>
                    <p
                      className={`font-mono font-bold text-xs sm:text-sm mt-0.5 ${
                        remaining === 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {remaining} {settings.currency}
                    </p>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      تم تحصيل: <strong className="text-emerald-400">{totalPaid} {settings.currency}</strong>
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
                    <div
                      className={`h-full transition-all duration-500 ${
                        remaining === 0
                          ? 'bg-emerald-500'
                          : sale.status === 'breached_term'
                          ? 'bg-rose-500'
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Monthly Installment Mini Indicators (3 Months) */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {sale.installments.map((inst) => {
                    const isPaid = inst.status === 'paid';
                    const isOverdue = inst.status === 'overdue';
                    return (
                      <div
                        key={inst.id}
                        className={`p-2 rounded-lg border text-center text-xs ${
                          isPaid
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            : isOverdue
                            ? 'bg-rose-950/50 border-rose-700 text-rose-300'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] block font-semibold">
                          قسط {inst.installmentNumber}
                        </span>
                        <span className="font-mono font-bold block mt-0.5">
                          {inst.amount} {settings.currency}
                        </span>
                        <span className="text-[10px] opacity-80 block font-mono">
                          {inst.dueDate}
                        </span>
                        <span
                          className={`mt-1 inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isPaid
                              ? 'bg-emerald-800 text-emerald-100'
                              : isOverdue
                              ? 'bg-rose-800 text-rose-100'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isPaid ? 'مسدد' : isOverdue ? 'متأخر' : 'مستحق'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-4 border-t border-slate-700/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => onViewContract(sale)}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>تفاصيل وسند العقد</span>
                </button>

                {nextInstallment && (
                  <button
                    onClick={() => onPayInstallment(sale, nextInstallment)}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-700/20 active:scale-95"
                  >
                    <span>قبض قسط ({nextInstallment.installmentNumber})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
