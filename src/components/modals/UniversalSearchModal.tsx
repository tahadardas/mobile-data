/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  X,
  Smartphone,
  User,
  Receipt,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Customer, PhoneSale, TreasuryTransaction, AppSettings, InstallmentRecord } from '../../types';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  sales: PhoneSale[];
  treasury: TreasuryTransaction[];
  settings: AppSettings;
  onSelectSale: (sale: PhoneSale) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  sales,
  treasury,
  settings,
  onSelectSale,
  onSelectCustomer,
}) => {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search results
  const matchedCustomers = customers.filter((c) => {
    if (!q) return false;
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.nationalId.includes(q) ||
      c.phone.includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const matchedSales = sales.filter((s) => {
    const cust = customers.find((c) => c.id === s.customerId);
    const matchesQuery = !q || (
      s.phoneName.toLowerCase().includes(q) ||
      s.imei.toLowerCase().includes(q) ||
      cust?.fullName.toLowerCase().includes(q) ||
      cust?.nationalId.includes(q)
    );

    const matchesDate = !dateFilter || (
      s.startDate === dateFilter ||
      s.installments.some((i) => i.dueDate === dateFilter || i.paidDate === dateFilter)
    );

    return matchesQuery && matchesDate && (q.length > 0 || dateFilter.length > 0);
  });

  const matchedTreasury = treasury.filter((tx) => {
    const matchesQuery = !q || (
      tx.description.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      tx.referenceCustomerName?.toLowerCase().includes(q)
    );
    const matchesDate = !dateFilter || tx.date === dateFilter;
    return matchesQuery && matchesDate && (q.length > 0 || dateFilter.length > 0);
  });

  const hasAnyResults =
    matchedCustomers.length > 0 ||
    matchedSales.length > 0 ||
    matchedTreasury.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        
        {/* Search Input Bar */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث شامل: اسم الجوال، رقم الإيمي IMEI، اسم الزبون، الرقم الوطني، أو البيان..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-white"
            >
              مسح
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">تصفية حسب التاريخ (تاريخ دفعة أو عقد):</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-cyan-400 hover:underline"
            >
              إلغاء
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!q && !dateFilter ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Search className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-60" />
              <p className="font-semibold text-slate-400 text-sm">البحث الفوري الدقيق في نظام محاسبة جوالات</p>
              <p className="mt-1">
                اكتب أي جزء من اسم الزبون، الرقم الوطني (11 خانة)، اسم الهاتف، أو رقم الـ IMEI
              </p>
            </div>
          ) : !hasAnyResults ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <p className="font-semibold">لم يتم العثور على أي نتائج مطابقة</p>
              <p className="text-slate-500 mt-1">تأكد من صحة الكلمات المدخلة أو أزل تصفية التاريخ</p>
            </div>
          ) : (
            <>
              {/* Sales Results */}
              {matchedSales.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-2">
                    <Smartphone className="w-4 h-4" />
                    <span>عقود بيع الجوالات بالتقسيط ({matchedSales.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {matchedSales.map((sale) => {
                      const cust = customers.find((c) => c.id === sale.customerId);
                      return (
                        <div
                          key={sale.id}
                          onClick={() => {
                            onSelectSale(sale);
                            onClose();
                          }}
                          className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-sm text-white">{sale.phoneName}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                              <span>الزبون: <strong className="text-white">{cust?.fullName}</strong></span>
                              <span>|</span>
                              <span className="font-mono text-cyan-300">IMEI: {sale.imei}</span>
                              <span>|</span>
                              <span>بدء العقد: {sale.startDate}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="font-mono font-bold text-emerald-400 block text-xs sm:text-sm">
                              {sale.agreedPrice} {settings.currency}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {sale.status === 'completed' ? 'مسدد' : 'نشط'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customers Results */}
              {matchedCustomers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5 mb-2">
                    <User className="w-4 h-4" />
                    <span>الزبائن والهويات السورية ({matchedCustomers.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {matchedCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          onSelectCustomer(cust);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{cust.fullName}</p>
                          <p className="font-mono text-xs text-cyan-300 mt-0.5">
                            الرقم الوطني: {cust.nationalId} | هاتف: {cust.phone}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">{cust.address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treasury Transactions Results */}
              {matchedTreasury.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                    <Receipt className="w-4 h-4" />
                    <span>حركات الصندوق والدفعات المستلمة ({matchedTreasury.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {matchedTreasury.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-medium text-white">{tx.description}</p>
                          <span className="font-mono text-[11px] text-slate-400">
                            التاريخ: {tx.date} | التصنيف: {tx.category}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {tx.amount} {settings.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
