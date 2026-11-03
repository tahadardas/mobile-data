/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  Clock,
  PhoneCall,
  MessageCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  CalendarClock,
} from 'lucide-react';
import { PhoneSale, Customer, AppSettings, InstallmentRecord } from '../types';
import { AppStorageService } from '../services/storage';

interface SmartAlertsBannerProps {
  sales: PhoneSale[];
  customers: Customer[];
  settings: AppSettings;
  onPayInstallment: (sale: PhoneSale, inst: InstallmentRecord) => void;
  onDismiss?: () => void;
}

export const SmartAlertsBanner: React.FC<SmartAlertsBannerProps> = ({
  sales,
  customers,
  settings,
  onPayInstallment,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // 1. Gather all breached contracts (past 3-month term with unpaid remaining balance)
  const breachedSales = sales.filter((s) => s.status === 'breached_term');

  // 2. Gather all overdue installments
  const overdueItems: { sale: PhoneSale; inst: InstallmentRecord; customer?: Customer }[] = [];
  const upcomingItems: { sale: PhoneSale; inst: InstallmentRecord; customer?: Customer }[] = [];

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();

  for (const sale of sales) {
    if (sale.status === 'completed') continue;
    const cust = customers.find((c) => c.id === sale.customerId);

    for (const inst of sale.installments) {
      if (inst.status === 'overdue' || (inst.paidAmount < inst.amount && inst.dueDate < todayStr)) {
        overdueItems.push({ sale, inst, customer: cust });
      } else if (inst.paidAmount < inst.amount) {
        // Due within 7 days
        const dueDate = new Date(inst.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          upcomingItems.push({ sale, inst, customer: cust });
        }
      }
    }
  }

  const hasAlerts = breachedSales.length > 0 || overdueItems.length > 0 || upcomingItems.length > 0;

  if (!hasAlerts) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border-y sm:border sm:rounded-2xl border-rose-800/60 p-4 mb-6 shadow-xl relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white">
                تنبيهات الأقساط والمتابعة اليومية
              </h2>
              {breachedSales.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-sm">
                  {breachedSales.length} تجاوز مهلة الـ 3 أشهر
                </span>
              )}
              {overdueItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
                  {overdueItems.length} قسط متأخر
                </span>
              )}
            </div>
            <p className="text-xs text-rose-200/80 mt-0.5">
              تذكير فوري عند فتح البرنامج بالأقساط المستحقة والمتأخرة لحفظ حقوق المركز
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'طي التنبيهات' : 'عرض تفاصيل التنبيهات'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="إغلاق التنبيه"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-rose-900/40">
          
          {/* 1. Critical Breaches: Exceeded 3 months and balance is not closed */}
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
                key={`breach-${sale.id}`}
                className="bg-rose-950/60 border border-rose-600/80 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-rose-200 text-sm">
                        ⚠️ تحذير تجاوز مهلة 3 أشهر: حساب الجوال غير مغلق!
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-900/90 text-rose-200 border border-rose-700">
                        الزبون: {customer ? customer.fullName : 'غير معروف'}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 mt-1">
                      الجهاز: <strong className="text-white">{sale.phoneName}</strong> (IMEI: {sale.imei})
                      {' | '}
                      تاريخ بدء العقد: <span className="font-mono text-rose-200">{sale.startDate}</span>
                      {' | '}
                      المبلغ المتبقي المعلق: <strong className="text-amber-300 font-bold">{remaining} {settings.currency}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {customer && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>تذكير واتساب</span>
                    </a>
                  )}
                  {customer && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center"
                      title="اتصال بالزبون"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* 2. Overdue Installments */}
          {overdueItems.map(({ sale, inst, customer }) => {
            const dueDate = new Date(inst.dueDate);
            const daysLate = Math.max(
              1,
              Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            );

            const whatsappUrl = customer
              ? AppStorageService.generateWhatsAppUrl(
                  customer.phone,
                  AppStorageService.generateInstallmentReminderMessage(sale, inst, customer, settings)
                )
              : '#';

            return (
              <div
                key={`overdue-${inst.id}`}
                className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-amber-300">
                        تأخر قسط شهري رقم ({inst.installmentNumber})
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                        متأخر {daysLate} يوم
                      </span>
                      <span className="text-xs text-white font-medium">
                        الزبون: {customer?.fullName} ({customer?.phone})
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      جوال: {sale.phoneName} | موعد الاستحقاق: <span className="font-mono text-amber-200">{inst.dueDate}</span> | المبلغ المطلوب: <strong className="text-emerald-400 font-bold">{inst.amount - inst.paidAmount} {settings.currency}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onPayInstallment(sale, inst)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
                  >
                    قبض وسداد القسط
                  </button>
                  {customer && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                      title="إرسال تذكير بالموعد عبر واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">واتساب</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* 3. Upcoming within 7 days */}
          {upcomingItems.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-2">
                <CalendarClock className="w-4 h-4 text-cyan-400" />
                <span>أقساط قادمة تستحق خلال 7 أيام ({upcomingItems.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {upcomingItems.map(({ sale, inst, customer }) => (
                  <div
                    key={`up-${inst.id}`}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{customer?.fullName}</p>
                      <p className="text-[11px] text-slate-400">
                        {sale.phoneName} - يستحق {inst.dueDate}
                      </p>
                    </div>
                    <span className="font-bold text-cyan-400">
                      {inst.amount} {settings.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
