/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Users,
  Smartphone,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { Customer, PhoneSale, AppSettings } from '../../types';
import { AppStorageService } from '../../services/storage';

export interface OverdueItem {
  sale: PhoneSale;
  customer: Customer;
  overdueAmount: number;
  overdueInstallmentNumbers: number[];
}

interface BulkSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueItems: OverdueItem[];
  settings: AppSettings;
}

export const BulkSmsModal: React.FC<BulkSmsModalProps> = ({
  isOpen,
  onClose,
  overdueItems,
  settings,
}) => {
  if (!isOpen) return null;

  // Selected customers map (key: customer.id + sale.id)
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    overdueItems.forEach((item) => {
      initial[`${item.customer.id}_${item.sale.id}`] = true;
    });
    return initial;
  });

  const [messageTemplate, setMessageTemplate] = useState<string>(
    `نحيطكم علماً من ${settings.storeName} بوجود قسط شهري مستحق السداد عن جهازكم بالتقسيط. نرجو التكرم بالمراجعة أو التحويل لتسوية الحساب في أقرب وقت. للتواصل: ${settings.storePhone}`
  );

  const [copiedPhones, setCopiedPhones] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const toggleSelectAll = () => {
    const allSelected = overdueItems.every((item) => selectedKeys[`${item.customer.id}_${item.sale.id}`]);
    const updated: Record<string, boolean> = {};
    overdueItems.forEach((item) => {
      updated[`${item.customer.id}_${item.sale.id}`] = !allSelected;
    });
    setSelectedKeys(updated);
  };

  const selectedItems = overdueItems.filter(
    (item) => selectedKeys[`${item.customer.id}_${item.sale.id}`]
  );

  const selectedPhones = Array.from(new Set(selectedItems.map((item) => item.customer.phone)));

  const handleLaunchSms = () => {
    if (selectedPhones.length === 0) {
      alert('يرجى تحديد زبون واحد على الأقل لإرسال الرسالة.');
      return;
    }
    const smsUrl = AppStorageService.generateBulkSmsUrl(selectedPhones, messageTemplate);
    window.location.href = smsUrl;
  };

  const handleCopyPhones = () => {
    if (selectedPhones.length === 0) return;
    navigator.clipboard.writeText(selectedPhones.join(', '));
    setCopiedPhones(true);
    setTimeout(() => setCopiedPhones(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageTemplate);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-6">
        
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                إرسال تذكير جماعي عبر SMS للمتأخرين
              </h3>
              <p className="text-[11px] text-slate-400">
                إرسال رسائل نصية قصيرة SMS دفعة واحدة لهواتف الزبائن المتأخرين عن السداد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          
          {/* Target Customers List Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>الزبائن المستهدفون للتذكير ({selectedItems.length} من {overdueItems.length}):</span>
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline"
            >
              {overdueItems.every((item) => selectedKeys[`${item.customer.id}_${item.sale.id}`])
                ? 'إلغاء تحديد الكل'
                : 'تحديد كافة المتأخرين'}
            </button>
          </div>

          {/* Overdue Customers Checkbox List */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {overdueItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                ✓ لا يوجد أي زبائن متأخرين حالياً!
              </div>
            ) : (
              overdueItems.map((item) => {
                const key = `${item.customer.id}_${item.sale.id}`;
                const isChecked = !!selectedKeys[key];
                return (
                  <label
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-slate-800/90 border-cyan-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
                        }}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-white text-xs">{item.customer.fullName}</p>
                        <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                          هاتف: {item.customer.phone} | {item.sale.phoneName}
                        </p>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-rose-400 font-bold block">
                        متأخر: {item.overdueAmount} {settings.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        قسط: {item.overdueInstallmentNumbers.join(', ')}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* SMS Message Template Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                نص رسالة الـ SMS (يمكنك تعديل الصيغة قبل الإرسال):
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'تم نسخ النص' : 'نسخ نص الرسالة'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
            />
          </div>

          {/* Selected Phone Numbers Preview */}
          <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">
                الأرقام المحددة ({selectedPhones.length}): <span className="font-mono text-cyan-300 text-[11px]">{selectedPhones.join('، ') || 'لم يتم اختيار أي رقم'}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyPhones}
              disabled={selectedPhones.length === 0}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-[11px] font-semibold text-white flex items-center gap-1 shrink-0 mr-2"
            >
              {copiedPhones ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedPhones ? 'تم النسخ' : 'نسخ الأرقام'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            سيتم فتح تطبيق الـ SMS الافتراضي على جوالك مع تعبئة الأرقام والرسالة
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={handleLaunchSms}
              disabled={selectedPhones.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30"
            >
              <Send className="w-4 h-4" />
              <span>إرسال SMS للمحددين ({selectedPhones.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
