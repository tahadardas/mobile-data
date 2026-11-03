/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Printer,
  X,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { PhoneSale, InstallmentRecord, Customer, AppSettings } from '../../types';
import { AppStorageService } from '../../services/storage';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PhoneSale | null;
  installment: InstallmentRecord | null;
  customer?: Customer;
  settings: AppSettings;
  paidAmount?: number;
  receiptNumber?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  installment,
  customer,
  settings,
  paidAmount,
  receiptNumber,
}) => {
  if (!isOpen || !sale) return null;

  const currentPaidSum = sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const totalPaid = sale.downPayment + currentPaidSum;
  const remaining = Math.max(0, sale.agreedPrice - totalPaid);

  const receiptNo = receiptNumber || installment?.receiptNumber || `REC-${Math.floor(1000 + Math.random() * 9000)}`;
  const currentAmount = paidAmount !== undefined ? paidAmount : (installment?.paidAmount || installment?.amount || 0);

  const handlePrint = () => {
    window.print();
  };

  const whatsappUrl = customer
    ? AppStorageService.generateWhatsAppUrl(
        customer.phone,
        AppStorageService.generatePaymentReceiptMessage(
          customer,
          sale,
          installment?.installmentNumber || 1,
          currentAmount,
          remaining,
          receiptNo,
          settings
        )
      )
    : '#';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-6 print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Header - Hidden in Print */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">
              سند قبض وعقد تقسيط رسمي
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>
            {customer && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال واتساب</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-200 print:text-black print:p-8">
          
          {/* Store Brand Header */}
          <div className="text-center border-b pb-4 border-slate-700 print:border-black">
            <h2 className="text-xl sm:text-2xl font-black text-cyan-400 print:text-black">
              {settings.storeName}
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              مبيعات وتقسيط الهواتف الذكية - صيانة وإكسسوارات معتمدة
            </p>
            <p className="text-xs font-mono text-slate-300 print:text-black mt-0.5">
              هاتف التواصل: {settings.storePhone}
            </p>
          </div>

          {/* Receipt Info Bar */}
          <div className="flex justify-between items-center text-xs bg-slate-800/80 p-3 rounded-xl border border-slate-700 print:bg-gray-100 print:border-gray-300">
            <div>
              <span className="text-slate-400 print:text-gray-600">رقم السند: </span>
              <strong className="font-mono text-cyan-300 print:text-black">{receiptNo}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600">التاريخ: </span>
              <strong className="font-mono">{new Date().toLocaleDateString('ar-SY')}</strong>
            </div>
          </div>

          {/* Customer & Device Information */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600 block mb-1">بيانات الزبون:</span>
              <p className="font-bold text-sm text-white print:text-black">{customer?.fullName || 'زبون نقدي'}</p>
              <p className="font-mono mt-0.5 text-slate-300 print:text-black">
                الرقم الوطني: {customer?.nationalId || '---'}
              </p>
              <p className="font-mono mt-0.5 text-slate-300 print:text-black">
                الهاتف: {customer?.phone || '---'}
              </p>
              <p className="mt-0.5 text-slate-400 print:text-gray-600 truncate">
                العنوان: {customer?.address || '---'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600 block mb-1">بيانات الجهاز المباع:</span>
              <p className="font-bold text-sm text-cyan-300 print:text-black">{sale.phoneName}</p>
              <p className="font-mono mt-0.5 text-slate-300 print:text-black">
                IMEI: {sale.imei}
              </p>
              <p className="mt-0.5 text-slate-300 print:text-black">
                تاريخ العقد: <span className="font-mono">{sale.startDate}</span>
              </p>
              <p className="mt-0.5 text-slate-300 print:text-black">
                مدة التقسيط: {sale.termMonths} أشهر
              </p>
            </div>
          </div>

          {/* Payment Statement Details */}
          <div className="border border-slate-700 rounded-xl overflow-hidden print:border-gray-300 text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-800 print:bg-gray-200 text-slate-300 print:text-black">
                <tr>
                  <th className="p-2.5">البيان</th>
                  <th className="p-2.5 text-center">القيمة المتفق عليها</th>
                  <th className="p-2.5 text-center">المسدد</th>
                  <th className="p-2.5 text-left">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 print:divide-gray-300">
                <tr>
                  <td className="p-2.5 font-medium">سعر بيع الجوال الإجمالي بالتقسيط</td>
                  <td className="p-2.5 text-center font-mono font-bold">{sale.agreedPrice} {settings.currency}</td>
                  <td className="p-2.5 text-center font-mono font-bold text-emerald-400 print:text-black">{totalPaid} {settings.currency}</td>
                  <td className="p-2.5 text-left font-mono font-bold text-amber-400 print:text-black">{remaining} {settings.currency}</td>
                </tr>
                {installment && (
                  <tr className="bg-cyan-950/30 print:bg-gray-50">
                    <td className="p-2.5 font-bold text-cyan-300 print:text-black" colSpan={2}>
                      وصلنا بموجب هذا السند دفعة القسط رقم ({installment.installmentNumber}):
                    </td>
                    <td className="p-2.5 text-center font-mono font-black text-emerald-400 print:text-black text-sm" colSpan={2}>
                      {currentAmount} {settings.currency}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Schedule Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 print:text-black mb-2">
              جدول الأقساط الشهرية (3 أشهر):
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {sale.installments.map((inst) => (
                <div
                  key={inst.id}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-800/40 print:border-gray-300 print:bg-white"
                >
                  <span className="block font-semibold">قسط {inst.installmentNumber}</span>
                  <span className="font-mono block text-slate-300 print:text-black">
                    {inst.amount} {settings.currency}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 print:text-gray-600 block">
                    {inst.dueDate}
                  </span>
                  <span className="font-bold text-[10px] block mt-0.5">
                    {inst.status === 'paid' ? 'مسدد ✓' : 'مستحق'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-700 print:border-black text-xs">
            <div className="text-center space-y-8">
              <p className="font-bold text-slate-300 print:text-black">توقيع المستلم (المحل)</p>
              <p className="text-slate-500">....................................</p>
            </div>
            <div className="text-center space-y-8">
              <p className="font-bold text-slate-300 print:text-black">توقيع المشتري (الزبون / الكفيل)</p>
              <p className="text-slate-500">....................................</p>
            </div>
          </div>
        </div>

        {/* Footer actions - Hidden in Print */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
