/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Smartphone,
  Bell,
  Search,
  PlusCircle,
  Database,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overdueCount: number;
  breachedCount: number;
  onOpenNewSale: () => void;
  onOpenSearch: () => void;
  onOpenAlerts: () => void;
  onOpenInstallModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  setActiveTab,
  overdueCount,
  breachedCount,
  onOpenNewSale,
  onOpenSearch,
  onOpenAlerts,
  onOpenInstallModal,
}) => {
  const totalAlerts = overdueCount + breachedCount;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Store Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white shrink-0">
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>محاسبة جوالات</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 hidden sm:inline-block">
                    نظام التقسيط الذكي
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                {settings.storeName}
              </p>
            </div>
          </div>

          {/* Actions & Alerts */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install on Mobile (APK / PWA) */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                aria-label="تثبيت التطبيق على الموبايل كـ تطبيق APK"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                title="تثبيت التطبيق على الموبايل كـ APK / PWA"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تثبيت التطبيق</span>
                <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.2 rounded font-mono font-bold">APK</span>
              </button>
            )}

            {/* Quick Search */}
            <button
              onClick={onOpenSearch}
              aria-label="البحث الشامل في البرنامج"
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-2 text-sm transition-colors"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline text-xs">بحث سريع (جوال، إيمي، زبون)...</span>
            </button>

            {/* Smart Alerts Button */}
            <button
              onClick={onOpenAlerts}
              aria-label="تنبيهات الأقساط والتأخيرات"
              className={`relative p-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                totalAlerts > 0
                  ? 'bg-rose-950/70 text-rose-300 border-rose-700/80 hover:bg-rose-900/80 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {breachedCount > 0 ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <Bell className="w-4 h-4 text-amber-400" />
              )}
              <span className="hidden sm:inline">التنبيهات</span>
              {totalAlerts > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-600 text-white min-w-[20px] text-center">
                  {totalAlerts}
                </span>
              )}
            </button>

            {/* New Sale Button */}
            <button
              onClick={onOpenNewSale}
              aria-label="إضافة عقد بيع بالتقسيط جديد"
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>بيع جوال جديد</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Mobile & Desktop) */}
        <nav className="flex space-x-1 space-x-reverse overflow-x-auto py-2 no-scrollbar text-xs sm:text-sm border-t border-slate-800/80">
          {[
            { id: 'dashboard', label: 'لوحة التحكم', icon: Smartphone },
            { id: 'alerts', label: 'التنبيهات والمتابعة', count: totalAlerts, isAlert: true },
            { id: 'sales', label: 'مبيعات التقسيط', count: null },
            { id: 'treasury', label: 'الصندوق المالي', highlight: true },
            { id: 'profits', label: 'تقرير الأرباح', icon: null },
            { id: 'customers', label: 'سجل الزبائن والهويات', count: null },
            { id: 'backup', label: 'النسخ والإعدادات (محاسبة جوالات)', icon: Database },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.isAlert && totalAlerts > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {totalAlerts}
                  </span>
                )}
                {tab.id === 'sales' && breachedCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
