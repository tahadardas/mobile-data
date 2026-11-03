/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Calendar,
  Filter,
  Trash2,
  Receipt,
  Search,
} from 'lucide-react';
import { TreasuryTransaction, AppSettings } from '../types';
import { calculateTreasurySummary } from '../utils/finance';

interface TreasuryViewProps {
  transactions: TreasuryTransaction[];
  settings: AppSettings;
  onAddTransaction: (tx: TreasuryTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  transactions,
  settings,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(''); // specific date or empty

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('إيراد مباشر');
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const summary = calculateTreasurySummary(transactions);

  // Filtered list
  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (dateFilter && tx.date !== dateFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchCust = tx.referenceCustomerName?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchCust) return false;
    }
    return true;
  });

  const openAddModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setAmount('');
    setDescription('');
    setCategory(type === 'income' ? 'إيراد مباشر' : 'مصاريف عامة');
    setTxDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!description.trim()) {
      alert('يرجى إدخال البيان الخاص بالحركة المالية');
      return;
    }

    const newTx: TreasuryTransaction = {
      id: `tx-${Date.now()}`,
      type: modalType,
      amount: parsedAmount,
      description: description.trim(),
      date: txDate || new Date().toISOString().split('T')[0],
      category: category.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner / Actions */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Wallet className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                حسابات الصندوق والخزينة اليومية
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              تنزل هنا تلقائياً جميع الدفعات الأولى وأقساط التقسيط المستلمة، مع إمكانية قبض إيرادات ودفع مصاريف
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openAddModal('income')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>قبض إيراد (+)</span>
            </button>
            <button
              onClick={() => openAddModal('expense')}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-700/30 transition-all active:scale-95"
            >
              <Minus className="w-4 h-4" />
              <span>دفع مصاريف (-)</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="bg-slate-900/80 border border-emerald-900/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">إجمالي المقبوضات (الوارد)</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1 font-mono">
                {summary.totalIncome.toLocaleString()} {settings.currency}
              </p>
              <span className="text-[11px] text-emerald-500/80 mt-0.5 inline-block">
                مبيعات، أقساط، إيرادات مباشرة
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-rose-900/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">إجمالي المدفوعات (الصادر)</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-1 font-mono">
                {summary.totalExpenses.toLocaleString()} {settings.currency}
              </p>
              <span className="text-[11px] text-rose-500/80 mt-0.5 inline-block">
                فواتير، إيجار، مشتريات ومصاريف
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-600/40 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-cyan-800/60 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-slate-400 font-medium">صافي رصيد الصندوق الحالي</p>
              <p
                className={`text-xl sm:text-2xl font-bold mt-1 font-mono ${
                  summary.netBalance >= 0 ? 'text-cyan-300' : 'text-rose-400'
                }`}
              >
                {summary.netBalance.toLocaleString()} {settings.currency}
              </p>
              <span className="text-[11px] text-cyan-400/80 mt-0.5 inline-block font-medium">
                (المقبوض - المدفوع)
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-600/40 text-cyan-400 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterType === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterType === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              المقبوضات فقط
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterType === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              المدفوعات فقط
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              title="تصفية حسب التاريخ"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-cyan-400 hover:underline"
              >
                إلغاء تصفية التاريخ
              </button>
            )}
          </div>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في البيان أو الزبون..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Transactions Table / Cards */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              سجل الحركات المالية للصندوق
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            عدد الحركات: {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wallet className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">لا توجد حركات مالية مطابقة للمحددات</p>
            <p className="text-xs text-slate-500 mt-1">
              استخدم أزرار القبض أو الصرف أعلاه لتسجيل أول حركة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-900/70 text-slate-400 text-xs border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">النوع</th>
                  <th className="py-3 px-4 font-semibold">التاريخ</th>
                  <th className="py-3 px-4 font-semibold">البيان والتفاصيل</th>
                  <th className="py-3 px-4 font-semibold">التصنيف</th>
                  <th className="py-3 px-4 font-semibold">المبلغ</th>
                  <th className="py-3 px-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filtered.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isIncome
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isIncome ? (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                              <span>مقبوض</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                              <span>مدفوع</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white">{tx.description}</p>
                        {tx.referenceCustomerName && (
                          <span className="text-[11px] text-cyan-400 block mt-0.5">
                            الزبون: {tx.referenceCustomerName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-700">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isIncome ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
                          {isIncome ? '+' : '-'} {tx.amount.toLocaleString()} {settings.currency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذه الحركة من الصندوق؟')) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          aria-label={`حذف حركة ${tx.description}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prominent Bottom Sticky Balance Bar (As Explicitly Requested) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-lg border-t-2 border-cyan-500/80 py-3 px-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">إجمالي المقبوضات:</span>
              <span className="font-mono font-bold text-emerald-400">
                +{summary.totalIncome.toLocaleString()} {settings.currency}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">إجمالي المدفوعات:</span>
              <span className="font-mono font-bold text-rose-400">
                -{summary.totalExpenses.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200 text-sm">
              رصيد الصندوق بعد التقاص:
            </span>
            <div
              className={`px-4 py-1.5 rounded-xl font-mono text-base sm:text-lg font-black border shadow-inner ${
                summary.netBalance >= 0
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80 shadow-emerald-950'
                  : 'bg-rose-950/80 text-rose-300 border-rose-600/80 shadow-rose-950'
              }`}
            >
              {summary.netBalance >= 0 ? '+' : ''}
              {summary.netBalance.toLocaleString()} {settings.currency}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Income or Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`p-4 border-b flex items-center justify-between ${
                modalType === 'income'
                  ? 'bg-emerald-950/50 border-emerald-800/80'
                  : 'bg-rose-950/50 border-rose-800/80'
              }`}
            >
              <div className="flex items-center gap-2">
                {modalType === 'income' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="font-bold text-white text-base">
                  {modalType === 'income' ? 'قبض إيراد جديد للصندوق' : 'دفع مصاريف من الصندوق'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  المبلغ ({settings.currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  البيان (تفاصيل الحركة) *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    modalType === 'income'
                      ? 'مثال: إيراد صيانة، بيع إكسسوارات نقداً، أرباح جانبية'
                      : 'مثال: إيجار المحل، فاتورة كهرباء، كرتونة شحن، ضيافة'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    التاريخ (تلقائي مع إمكانية التعديل) *
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    التصنيف
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {modalType === 'income' ? (
                      <>
                        <option value="إيراد مباشر">إيراد مباشر</option>
                        <option value="صيانة وبرمجة">صيانة وبرمجة</option>
                        <option value="إكسسوارات نقداً">إكسسوارات نقداً</option>
                        <option value="أخرى">أخرى</option>
                      </>
                    ) : (
                      <>
                        <option value="مصاريف عامة">مصاريف عامة</option>
                        <option value="فواتير ومرافق">فواتير ومرافق</option>
                        <option value="إيجار المحل">إيجار المحل</option>
                        <option value="رواتب">رواتب</option>
                        <option value="مشتريات بضاعة">مشتريات بضاعة</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all ${
                    modalType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-700/30'
                  }`}
                >
                  {modalType === 'income' ? 'حفظ القبض في الصندوق' : 'حفظ الصرف من الصندوق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
