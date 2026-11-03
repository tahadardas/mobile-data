/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Customer, PhoneSale, InstallmentRecord, AppSettings } from '../../types';
import { isDownPaymentBelowFiftyPercent, calculateRemainingBalance } from '../../utils/finance';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  settings: AppSettings;
  onSaveSale: (sale: PhoneSale) => void;
  onOpenNewCustomer: () => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  settings,
  onSaveSale,
  onOpenNewCustomer,
}) => {
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [phoneName, setPhoneName] = useState<string>('');
  const [imei, setImei] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [agreedPrice, setAgreedPrice] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('');
  const [termMonths, setTermMonths] = useState<number>(settings.termMonthsDefault || 3);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  if (!isOpen) return null;

  const numPurchase = parseFloat(purchasePrice) || 0;
  const numAgreed = parseFloat(agreedPrice) || 0;
  const numDown = parseFloat(downPayment) || 0;

  // 50% warning requirement check
  const isBelowFifty = isDownPaymentBelowFiftyPercent(numDown, numAgreed);
  const minRecommendedDown = Math.round(numAgreed * 0.5 * 100) / 100;
  const remaining = calculateRemainingBalance(numAgreed, numDown, 0);
  const monthlyInstallment = termMonths > 0 ? Math.round((remaining / termMonths) * 100) / 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      alert('يرجى اختيار الزبون أو إضافة زبون جديد أولاً');
      return;
    }
    if (!phoneName.trim()) {
      alert('يرجى إدخال اسم الجوال ومواصفاته');
      return;
    }
    if (!imei.trim()) {
      alert('يرجى إدخال رقم الـ IMEI الخاص بالجوال');
      return;
    }
    if (numAgreed <= 0) {
      alert('يرجى إدخال سعر مبيع صحيح بالتقسيط');
      return;
    }
    if (numPurchase <= 0) {
      alert('يرجى إدخال سعر شراء الجوال لحساب الأرباح بدقة');
      return;
    }

    // Generate monthly installments schedule
    const installments: InstallmentRecord[] = [];
    const baseDate = new Date(startDate);

    for (let i = 1; i <= termMonths; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const dueDateStr = d.toISOString().split('T')[0];

      // Handle precision rounding on the last installment
      const instAmount = i === termMonths
        ? Math.round((remaining - monthlyInstallment * (termMonths - 1)) * 100) / 100
        : monthlyInstallment;

      installments.push({
        id: `inst-${Date.now()}-${i}`,
        saleId: `sale-${Date.now()}`,
        installmentNumber: i,
        dueDate: dueDateStr,
        amount: Math.max(0, instAmount),
        paidAmount: 0,
        status: 'pending',
      });
    }

    const newSale: PhoneSale = {
      id: `sale-${Date.now()}`,
      customerId,
      phoneName: phoneName.trim(),
      imei: imei.trim(),
      purchasePrice: numPurchase,
      agreedPrice: numAgreed,
      downPayment: numDown,
      termMonths,
      startDate,
      status: 'active',
      installments,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSaveSale(newSale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                عقد بيع جوال جديد بالتقسيط
              </h3>
              <p className="text-xs text-slate-400">
                تسجيل بيانات الهاتف، السعر المتفق عليه، وجدولة الأقساط الشهرية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                الزبون المتعاقد *
              </label>
              <button
                type="button"
                onClick={onOpenNewCustomer}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة زبون جديد وهويته</span>
              </button>
            </div>

            {customers.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs flex items-center justify-between">
                <span>لا يوجد زبائن مسجلين حالياً. أضف زبوناً أولاً.</span>
                <button
                  type="button"
                  onClick={onOpenNewCustomer}
                  className="px-2.5 py-1 rounded bg-amber-600 text-white font-bold"
                >
                  إضافة
                </button>
              </div>
            ) : (
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} - (الرقم الوطني: {c.nationalId} | {c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Device Name & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم الجوال والموديل *
              </label>
              <input
                type="text"
                required
                value={phoneName}
                onChange={(e) => setPhoneName(e.target.value)}
                placeholder="مثال: iPhone 15 Pro 128GB تيتانيوم"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رقم الإيمي (IMEI - 15 خانة) *
              </label>
              <input
                type="text"
                required
                maxLength={18}
                value={imei}
                onChange={(e) => setImei(e.target.value.replace(/\s+/g, ''))}
                placeholder="358742109845123"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Financial Breakdown: Purchase Price vs Agreed Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                سعر شراء الجوال ({settings.currency}) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">رأس مال الجهاز للمحل</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                السعر المتفق عليه للبيع ({settings.currency}) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">إجمالي سعر التقسيط</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الدفعة الأولى المقبوضة ({settings.currency}) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="0.00"
                className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none ${
                  isBelowFifty && numAgreed > 0
                    ? 'border-amber-500 focus:border-amber-400 bg-amber-950/20'
                    : 'border-slate-700 focus:border-cyan-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">تنزل مباشرة في الصندوق</span>
            </div>
          </div>

          {/* CRITICAL 50% WARNING ALERT (As explicit requirement) */}
          {numAgreed > 0 && isBelowFifty && (
            <div className="p-3.5 rounded-xl bg-amber-950/80 border-2 border-amber-500 text-amber-200 text-xs space-y-1 shadow-lg animate-pulse">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>⚠️ تحذير: الدفعة الأولى أقل من 50% من سعر الجوال المتفق عليه!</span>
              </div>
              <p className="pr-7 text-xs leading-relaxed">
                الدفعة الأولى المدخلة ({numDown} {settings.currency}) تشكل فقط{' '}
                <strong className="text-white font-mono">{Math.round((numDown / numAgreed) * 100)}%</strong> من السعر الإجمالي ({numAgreed} {settings.currency}).
                الحد الأدنى الموصى به لسلامة التقسيط هو <strong className="text-amber-100 font-mono underline">{minRecommendedDown} {settings.currency}</strong> (50%).
              </p>
            </div>
          )}

          {/* Duration & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                مدة التقسيط (أشهر) *
              </label>
              <select
                value={termMonths}
                onChange={(e) => setTermMonths(parseInt(e.target.value) || 3)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={3}>3 أشهر (المدة المحددة للبرنامج)</option>
                <option value={1}>شهر واحد</option>
                <option value={2}>شهران</option>
                <option value={4}>4 أشهر</option>
                <option value={5}>5 أشهر</option>
                <option value={6}>6 أشهر</option>
              </select>
              <span className="text-[10px] text-rose-300 mt-1 block">
                ملاحظة: سيطلق البرنامج تحذيراً إذا تخطى الزبون مهلة الـ 3 أشهر دون إغلاق الحساب
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تاريخ أول دفعة وبدء العقد *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Real-time Schedule Calculation Summary */}
          {numAgreed > 0 && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>المبلغ المتبقي على الزبون:</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {remaining} {settings.currency}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>قيمة القسط الشهري الواحد ({termMonths} أشهر):</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {monthlyInstallment} {settings.currency} / شهرياً
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ملاحظات أو شروط إضافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول كرتونة الجهاز، شاحن، كفيل، أو ملحقات..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              تأكيد وحفظ العقد وإيداع الدفعة الأولى بالصندوق
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
