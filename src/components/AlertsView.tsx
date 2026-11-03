/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  PhoneCall,
  MessageCircle,
  ShieldAlert,
  CalendarClock,
  Send,
  Bell,
  BellRing,
  CheckCircle,
  FileText,
  Smartphone,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { PhoneSale, Customer, AppSettings, InstallmentRecord } from '../types';
import { AppStorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { BulkSmsModal, OverdueItem } from './modals/BulkSmsModal';

interface AlertsViewProps {
  sales: PhoneSale[];
  customers: Customer[];
  settings: AppSettings;
  onPayInstallment: (sale: PhoneSale, inst: InstallmentRecord) => void;
  onViewContract: (sale: PhoneSale) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  sales,
  customers,
  settings,
  onPayInstallment,
  onViewContract,
}) => {
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // 1. Gather all breached contracts (past 3-month term with unpaid remaining balance)
  const breachedSales = sales.filter((s) => s.status === 'breached_term');

  // 2. Gather all overdue installments
  const overdueInstallments: { sale: PhoneSale; inst: InstallmentRecord; customer?: Customer }[] = [];
  const upcomingItems: { sale: PhoneSale; inst: InstallmentRecord; customer?: Customer }[] = [];

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();

  for (const sale of sales) {
    if (sale.status === 'completed') continue;
    const cust = customers.find((c) => c.id === sale.customerId);

    for (const inst of sale.installments) {
      if (inst.status === 'overdue' || (inst.paidAmount < inst.amount && inst.dueDate < todayStr)) {
        overdueInstallments.push({ sale, inst, customer: cust });
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

  // Aggregate for Bulk SMS: unique overdue customer-sale pairs
  const overdueMap = new Map<string, OverdueItem>();
  overdueInstallments.forEach(({ sale, inst, customer }) => {
    if (!customer) return;
    const key = `${customer.id}_${sale.id}`;
    if (!overdueMap.has(key)) {
      overdueMap.set(key, {
        sale,
        customer,
        overdueAmount: Math.round((inst.amount - inst.paidAmount) * 100) / 100,
        overdueInstallmentNumbers: [inst.installmentNumber],
      });
    } else {
      const existing = overdueMap.get(key)!;
      existing.overdueAmount = Math.round((existing.overdueAmount + (inst.amount - inst.paidAmount)) * 100) / 100;
      existing.overdueInstallmentNumbers.push(inst.installmentNumber);
    }
  });
  const bulkOverdueList: OverdueItem[] = Array.from(overdueMap.values());

  const handleRequestNotification = async () => {
    try {
      const perm = await NotificationService.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        await NotificationService.notify('تطبيق محاسبة جوالات', {
          body: 'تم تفعيل إشعارات الخلفية والتنبيهات بنجاح! ستصلك تنبيهات مواعيد القبض تلقائياً حتى بدون فتح التطبيق.',
        });
        NotificationService.checkAndNotifyDueInstallments(sales, customers, settings);
        setTestNotificationSent(true);
        setTimeout(() => setTestNotificationSent(false), 4000);
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
  };

  const handleSendTestNotification = async () => {
    const totalAlerts = breachedSales.length + overdueInstallments.length;
    const body = totalAlerts > 0
      ? `يوجد لديك ${breachedSales.length} عقود متجاوزة مهلة الـ 3 أشهر، و ${overdueInstallments.length} أقساط متأخرة تستوجب المتابعة.`
      : 'كافة عقود التقسيط منتظمة ولا يوجد أي متأخرات حالياً.';
    await NotificationService.notify('محاسبة جوالات - تنبيه الأقساط', { body });
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                صفحة التنبيهات والمتابعة المستمرة
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/60">
                متابعة الذمم والديون
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              إدارة الأقساط المتأخرة، العقود المتجاوزة لمهلة 3 أشهر، وإرسال التذكيرات الفردية والجماعية
            </p>
          </div>
        </div>

        {/* Action Buttons: Bulk SMS & Notifications */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBulkSmsOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-700/30 transition-all active:scale-95"
          >
            <Users className="w-4 h-4" />
            <span>تذكير جماعي عبر SMS ({bulkOverdueList.length})</span>
          </button>

          {notificationPermission !== 'granted' ? (
            <button
              onClick={handleRequestNotification}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Bell className="w-4 h-4" />
              <span>تفعيل إشعارات الخلفية</span>
            </button>
          ) : (
            <button
              onClick={handleSendTestNotification}
              className="px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30 shadow"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{testNotificationSent ? 'تم إرسال إشعار للموبايل!' : 'اختبار إشعار الموبايل'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">عقود تجاوزت 3 أشهر (غير مغلقة)</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white mt-2">{breachedSales.length}</p>
          <p className="text-[11px] text-rose-300/80 mt-1">تجاوزت المهلة النظامية وفق العقد السوري</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">أقساط شهرية متأخرة</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white mt-2">{overdueInstallments.length}</p>
          <p className="text-[11px] text-amber-300/80 mt-1">أقساط تجاوزت تاريخ استحقاقها</p>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">مستحقة خلال 7 أيام القادمة</span>
            <CalendarClock className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white mt-2">{upcomingItems.length}</p>
          <p className="text-[11px] text-cyan-300/80 mt-1">تذكير استباقي للزبائن</p>
        </div>
      </div>

      {/* 1. Breached 3-Month Term Contracts (Critical Priority) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-r-4 border-rose-600 pr-3">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="font-bold text-white text-base">
            عقود تجاوزت مهلة الـ 3 أشهر (سعر الجوال غير مغلق)
          </h3>
          <span className="text-xs text-rose-400 font-mono">({breachedSales.length})</span>
        </div>

        {breachedSales.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 border border-slate-800 rounded-2xl">
            ✓ لا يوجد أي عقد متجاوز لمهلة الـ 3 أشهر حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breachedSales.map((sale) => {
              const cust = customers.find((c) => c.id === sale.customerId);
              const totalPaid = sale.downPayment + sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
              const remaining = Math.round(Math.max(0, sale.agreedPrice - totalPaid) * 100) / 100;
              const nextPendingInst = sale.installments.find((i) => i.paidAmount < i.amount) || sale.installments[0];

              const whatsappUrl = cust
                ? AppStorageService.generateWhatsAppUrl(
                    cust.phone,
                    AppStorageService.generateThreeMonthBreachMessage(sale, remaining, cust, settings)
                  )
                : '#';

              const smsUrl = cust
                ? AppStorageService.generateSmsUrl(
                    cust.phone,
                    `تحية من ${settings.storeName}. نود تذكيركم بأن مهلة سداد ثمن جوال ${sale.phoneName} المحددة بـ 3 أشهر قد انقضت، والمتبقي هو ${remaining} ${settings.currency}. نرجو مراجعتنا لتسوية الحساب. هاتف: ${settings.storePhone}`
                  )
                : '#';

              return (
                <div
                  key={sale.id}
                  className="bg-slate-800/90 border-2 border-rose-700/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {cust?.fullName || 'زبون تقسيط'}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400">
                          الرقم الوطني: {cust?.nationalId || '---'} | هاتف: {cust?.phone}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-700">
                        تجاوز المهلة
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">الجهاز:</span>
                        <strong className="text-cyan-300 font-semibold">{sale.phoneName}</strong>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-400">رقم الـ IMEI:</span>
                        <span className="text-slate-300">{sale.imei}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">تاريخ بدء العقد:</span>
                        <span className="text-slate-300">{sale.startDate}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                        <span className="text-rose-400">المبلغ المتبقي غير المغلق:</span>
                        <span className="text-rose-400 font-mono text-sm">
                          {remaining} {settings.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Breached Contract */}
                  <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center gap-2">
                    {cust && (
                      <>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>تذكير واتساب</span>
                        </a>

                        <a
                          href={smsUrl}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>تذكير عبر SMS</span>
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => onPayInstallment(sale, nextPendingInst)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>قبض وسداد</span>
                    </button>

                    <button
                      onClick={() => onViewContract(sale)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>العقد القانوني PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Overdue Installments */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-r-4 border-amber-500 pr-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">
            الأقساط الشهرية المتأخرة عن موعد استحقاقها
          </h3>
          <span className="text-xs text-amber-400 font-mono">({overdueInstallments.length})</span>
        </div>

        {overdueInstallments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 border border-slate-800 rounded-2xl">
            ✓ كافة الأقساط الشهرية مسددة بانتظام ولا يوجد أي قسط متأخر حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdueInstallments.map(({ sale, inst, customer }) => {
              const overdueAmount = Math.round((inst.amount - inst.paidAmount) * 100) / 100;
              const dueDate = new Date(inst.dueDate);
              const daysLate = Math.max(1, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

              const whatsappUrl = customer
                ? AppStorageService.generateWhatsAppUrl(
                    customer.phone,
                    AppStorageService.generateInstallmentReminderMessage(sale, inst, customer, settings)
                  )
                : '#';

              const smsUrl = customer
                ? AppStorageService.generateSmsUrl(
                    customer.phone,
                    `تذكير من ${settings.storeName}: القسط الشهري رقم (${inst.installmentNumber}) لجهاز ${sale.phoneName} بقيمة ${overdueAmount} ${settings.currency} مستحق السداد. نرجو التكرم بالدفع لتفادي تراكم الفوائد والآجال. للتواصل: ${settings.storePhone}`
                  )
                : '#';

              return (
                <div
                  key={`${sale.id}-${inst.id}`}
                  className="bg-slate-800/90 border border-amber-600/70 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {customer?.fullName || 'زبون تقسيط'}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400">
                          هاتف: {customer?.phone} | الرقم الوطني: {customer?.nationalId}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-700">
                        متأخر {daysLate} يوم
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">الجهاز:</span>
                        <strong className="text-cyan-300">{sale.phoneName}</strong>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">القسط المستحق:</span>
                        <span className="text-amber-400 font-bold">
                          قسط رقم ({inst.installmentNumber}) - تاريخ الاستحقاق: {inst.dueDate}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                        <span className="text-slate-300">قيمة القسط المتأخر:</span>
                        <span className="text-amber-400 font-mono text-sm">
                          {overdueAmount} {settings.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center gap-2">
                    {customer && (
                      <>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>تذكير واتساب</span>
                        </a>

                        <a
                          href={smsUrl}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>تذكير عبر SMS</span>
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => onPayInstallment(sale, inst)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>قبض وسداد</span>
                    </button>

                    <button
                      onClick={() => onViewContract(sale)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>العقد</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Upcoming Installments within 7 Days */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-r-4 border-cyan-500 pr-3">
          <CalendarClock className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white text-base">
            أقساط تستحق قريباً (خلال 7 أيام)
          </h3>
          <span className="text-xs text-cyan-400 font-mono">({upcomingItems.length})</span>
        </div>

        {upcomingItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/30 border border-slate-800 rounded-xl">
            لا توجد أقساط مستحقة خلال الأيام السبعة القادمة.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingItems.map(({ sale, inst, customer }) => {
              const amount = Math.round((inst.amount - inst.paidAmount) * 100) / 100;
              const whatsappUrl = customer
                ? AppStorageService.generateWhatsAppUrl(
                    customer.phone,
                    AppStorageService.generateInstallmentReminderMessage(sale, inst, customer, settings)
                  )
                : '#';

              return (
                <div
                  key={`${sale.id}-${inst.id}`}
                  className="bg-slate-800/70 border border-cyan-700/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-white">{customer?.fullName}</h5>
                    <p className="text-[11px] text-slate-400">
                      {sale.phoneName} - قسط ({inst.installmentNumber}) يستحق بتاريخ: <span className="font-mono text-cyan-300">{inst.dueDate}</span>
                    </p>
                    <p className="font-mono font-bold text-cyan-400 mt-0.5">
                      القيمة: {amount} {settings.currency}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {customer && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                        title="إرسال تذكير واتساب"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onPayInstallment(sale, inst)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px]"
                    >
                      قبض
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk SMS Modal */}
      <BulkSmsModal
        isOpen={isBulkSmsOpen}
        onClose={() => setIsBulkSmsOpen(false)}
        overdueItems={bulkOverdueList}
        settings={settings}
      />
    </div>
  );
};
