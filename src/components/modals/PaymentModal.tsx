/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Calendar,
  X,
  Printer,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import { PhoneSale, InstallmentRecord, Customer, AppSettings } from '../../types';
import { AppStorageService } from '../../services/storage';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PhoneSale | null;
  installment: InstallmentRecord | null;
  customer?: Customer;
  settings: AppSettings;
  onConfirmPayment: (
    saleId: string,
    installmentId: string,
    amount: number,
    date: string,
    receiptNo: string,
    notes?: string
  ) => void;
  onOpenReceipt: (sale: PhoneSale, inst: InstallmentRecord, paidAmount: number, receiptNo: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  installment,
  customer,
  settings,
  onConfirmPayment,
  onOpenReceipt,
}) => {
  if (!isOpen || !sale || !installment) return null;

  const initialAmount = installment.amount - (installment.paidAmount || 0);
  const [payAmount, setPayAmount] = useState<string>(initialAmount.toString());
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptNo, setReceiptNo] = useState<string>(`REC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [notes, setNotes] = useState<string>('');

  const parsedAmount = parseFloat(payAmount) || 0;

  // Calculate remaining after this payment
  const currentPaidSum = sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const remainingBefore = Math.max(0, sale.agreedPrice - sale.downPayment - currentPaidSum);
  const remainingAfter = Math.max(0, remainingBefore - parsedAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    onConfirmPayment(
      sale.id,
      installment.id,
      parsedAmount,
      payDate,
      receiptNo,
      notes
    );

    // Provide immediate receipt view option
    onOpenReceipt(sale, installment, parsedAmount, receiptNo);
    onClose();
  };

  const whatsappReceiptUrl = customer
    ? AppStorageService.generateWhatsAppUrl(
        customer.phone,
        AppStorageService.generatePaymentReceiptMessage(
          customer,
          sale,
          installment.installmentNumber,
          parsedAmount,
          remainingAfter,
          receiptNo,
          settings
        )
      )
    : '#';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950 to-slate-900 border-b border-cyan-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/30 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                قبض وسداد قسط شهري رقم ({installment.installmentNumber})
              </h3>
              <p className="text-xs text-cyan-300/80">
                إيداع المبلغ بالصندوق وإصدار سند قبض فوري للزبون
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

        {/* Contract & Installment Info */}
        <div className="p-4 sm:p-5 bg-slate-900/80 border-b border-slate-700/80 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">الزبون:</span>
            <span className="font-bold text-white">{customer?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">الجهاز المباع:</span>
            <span className="font-bold text-cyan-300">{sale.phoneName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">تاريخ استحقاق القسط:</span>
            <span className="font-mono text-amber-300">{installment.dueDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">قيمة القسط المطلوبة:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {installment.amount} {settings.currency}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              المبلغ المقبوض نقداً ({settings.currency}) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تاريخ القبض (تلقائي وقابل للتعديل) *
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رقم سند القبض *
              </label>
              <input
                type="text"
                required
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Balance After Payment Preview */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-400">المتبقي على حساب الجوال بعد السداد:</span>
            <span
              className={`font-mono font-bold text-sm ${
                remainingAfter === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {remainingAfter} {settings.currency}
              {remainingAfter === 0 && ' (يتم إغلاق العقد بالكامل 🎉)'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ملاحظات السند
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سداد نقدي في المحل / حوالة / كاش..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-700">
            {customer && (
              <a
                href={whatsappReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="تجهيز سند عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
            )}

            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-700/30 transition-all active:scale-95"
              >
                تأكيد السداد والترحيل للصندوق
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
