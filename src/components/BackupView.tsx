/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  MessageCircle,
  FolderArchive,
  Save,
  CheckCircle,
  AlertCircle,
  Settings,
  HardDrive,
  FileText,
  Smartphone,
  Wifi,
  RefreshCw,
  Layers,
  KeyRound,
} from 'lucide-react';
import JSZip from 'jszip';
import { AppSettings, Customer, PhoneSale, TreasuryTransaction, DatabaseBackup } from '../types';
import { AppStorageService } from '../services/storage';
import { LanSyncService } from '../services/lanSync';
import { SQLiteService } from '../services/sqlite';

interface BackupViewProps {
  settings: AppSettings;
  customers: Customer[];
  sales: PhoneSale[];
  treasury: TreasuryTransaction[];
  onSaveSettings: (settings: AppSettings) => void;
  onRestoreData: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  settings,
  customers,
  sales,
  treasury,
  onSaveSettings,
  onRestoreData,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // LAN Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    success: boolean;
    message: string;
    durationMs?: number;
    syncedCount?: number;
  } | null>(null);

  // SQLite Relational State
  const [isSqliteDownloading, setIsSqliteDownloading] = useState(false);
  const [sqliteStats, setSqliteStats] = useState<{
    customerCount: number;
    saleCount: number;
    installmentCount: number;
    treasuryCount: number;
    sqliteEngine: string;
  } | null>(null);

  React.useEffect(() => {
    SQLiteService.getStats().then(setSqliteStats).catch(() => {});
  }, [customers, sales, treasury]);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Perform quick difference check without transferring data
  const handleCheckSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const manifest = LanSyncService.buildManifest(formData);
      const localManifest = LanSyncService.buildManifest(formData);
      const res = LanSyncService.checkDifferences(manifest, localManifest, formData.syncPassphrase || 'ALSHAM_STORE_2026');
      setIsSyncing(false);
      setSyncFeedback({
        success: res.isPassphraseValid,
        message: res.message,
      });
    } catch (err: any) {
      setIsSyncing(false);
      setSyncFeedback({
        success: false,
        message: err.message || 'تعذر الوصول لجهاز المزامنة عبر الشبكة المحلية',
      });
    }
  };

  // Perform smart delta sync
  const handlePerformSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const res = await LanSyncService.performSmartSync(formData);
      setIsSyncing(false);
      setSyncFeedback({
        success: res.success,
        message: res.message,
        durationMs: res.durationMs,
        syncedCount: res.syncedItemsCount,
      });
      if (res.success) {
        onRestoreData();
      }
    } catch (err: any) {
      setIsSyncing(false);
      setSyncFeedback({
        success: false,
        message: err.message || 'فشلت المزامنة الذكية عبر الشبكة المحلية',
      });
    }
  };

  // Download real SQLite database file (.sqlite)
  const handleDownloadSqlite = async () => {
    try {
      setIsSqliteDownloading(true);
      await SQLiteService.downloadSqliteFile('محاسبة_جوالات.sqlite');
      setIsSqliteDownloading(false);
    } catch (err: any) {
      setIsSqliteDownloading(false);
      alert(`خطأ أثناء تصدير ملف SQLite: ${err.message}`);
    }
  };

  // Sync state into WASM SQLite
  const handleSyncToSqlite = async () => {
    try {
      await SQLiteService.syncFromMemory(customers, sales, treasury, formData);
      const stats = await SQLiteService.getStats();
      setSqliteStats(stats);
      alert('تم تحديث ومزامنة بنية قاعدة بيانات SQLite العلائقية بنجاح!');
    } catch (err: any) {
      alert(`خطأ أثناء التحديث: ${err.message}`);
    }
  };

  // Download Compressed Backup ZIP
  const handleDownloadBackup = async () => {
    try {
      setIsExporting(true);
      const { zipBlob, fileName, meta } = await AppStorageService.createCompressedBackup();
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      alert(`تم بنجاح تصدير النسخة الاحتياطية المضغوطة لمجلد "محاسبة جوالات" باسم: ${fileName}`);
    } catch (err: any) {
      setIsExporting(false);
      alert(`خطأ أثناء إنشاء النسخة الاحتياطية: ${err.message}`);
    }
  };

  // WhatsApp Share Backup
  const handleWhatsAppShare = () => {
    const today = new Date().toLocaleDateString('ar-SY');
    const msg = `*تقرير النسخة الاحتياطية اليومية - محاسبة جوالات*
=================================
المحل: ${settings.storeName}
التاريخ: ${today}
المجلد: محاسبة جوالات / النسخ_الاحتياطية
---------------------------------
• عدد الزبائن المسجلين: ${customers.length} زبون
• عدد عقود مبيعات التقسيط: ${sales.length} عقد
• العقود المتجاوزة 3 أشهر: ${sales.filter(s => s.status === 'breached_term').length}
• الأقساط المتأخرة: ${sales.filter(s => s.status === 'overdue').length}
• عدد حركات الصندوق: ${treasury.length} حركة
---------------------------------
تم إنشاء وحفظ ملف النسخة المضغوطة (SQLite/JSON) بنجاح وجاهزة للاستعادة عند الحاجة.`;

    const url = AppStorageService.generateWhatsAppUrl(settings.storePhone, msg);
    window.open(url, '_blank');
  };

  // Restore Backup
  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setRestoreStatus('جاري فك ضغط وقراءة النسخة الاحتياطية...');
      let backupJson: DatabaseBackup | null = null;

      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        // Look for database.sqlite.json
        let targetFile = zip.file('محاسبة جوالات/النسخ_الاحتياطية/database.sqlite.json');
        if (!targetFile) {
          // Check root
          targetFile = zip.file('database.sqlite.json');
        }
        if (!targetFile) {
          // Search any .json in zip
          const files = Object.keys(zip.files);
          const found = files.find((f) => f.endsWith('.json'));
          if (found) targetFile = zip.file(found);
        }

        if (!targetFile) {
          throw new Error('ملف الـ ZIP لا يحتوي على ملف قاعدة البيانات database.sqlite.json');
        }

        const text = await targetFile.async('text');
        backupJson = JSON.parse(text);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        backupJson = JSON.parse(text);
      } else {
        throw new Error('يرجى اختيار ملف نسخة احتياطية بصيغة .zip أو .json');
      }

      if (backupJson) {
        const confirmMsg = `تم التحقق من النسخة الاحتياطية:
• عدد الزبائن: ${backupJson.customers?.length || 0}
• عدد العقود: ${backupJson.sales?.length || 0}
• عدد حركات الصندوق: ${backupJson.treasury?.length || 0}

هل ترغب باستعادة هذه البيانات واستبدال البيانات الحالية؟`;

        if (confirm(confirmMsg)) {
          AppStorageService.restoreBackup(backupJson);
          setRestoreStatus('تمت الاستعادة بنجاح! جاري تحديث التطبيق...');
          setTimeout(() => {
            onRestoreData();
            setRestoreStatus(null);
          }, 800);
        } else {
          setRestoreStatus(null);
        }
      }
    } catch (err: any) {
      alert(`فشل استعادة النسخة الاحتياطية: ${err.message}`);
      setRestoreStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              إدارة النسخ الاحتياطي اليومي ومجلد "محاسبة جوالات"
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              حفظ مضغوط لقاعدة البيانات (SQLite/JSON)، تصدير ومشاركة عبر واتساب، واستعادة سريعة
            </p>
          </div>
        </div>
      </div>

      {/* Backup Actions Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Create Compressed Backup */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base mb-2">
              <FolderArchive className="w-5 h-5" />
              <h3>النسخ الاحتياطي المضغوط (ZIP / SQLite)</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              يقوم بتوليد ملف مضغوط كامل يحتوي على قاعدة بيانات SQLite وجداول الزبائن، عقود التقسيط، سجل الصندوق والصور داخل مجلد <strong className="text-white font-semibold">محاسبة جوالات</strong>.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1 text-slate-400">
              <p>• آخر تاريخ نسخ احتياطي: <span className="font-mono text-cyan-300">{settings.lastBackupDate || 'اليوم'}</span></p>
              <p>• حجم السجلات المحفوظة: {customers.length} زبون | {sales.length} جهاز تقسيط | {treasury.length} حركة بالصندوق</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'جاري الضغط والتصدير...' : 'تحميل النسخة المضغوطة (.zip)'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال تقرير عبر واتساب</span>
            </button>
          </div>
        </div>

        {/* Restore Backup */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base mb-2">
              <Upload className="w-5 h-5" />
              <h3>استعادة نسخة احتياطية سابقة</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              استرجع بياناتك في ثوانٍ عند تغيير الهاتف أو إعادة تثبيت التطبيق عن طريق رفع ملف النسخة المضغوطة (.zip) أو ملف قاعدة البيانات (.json).
            </p>
            <div className="mt-4 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-900/60 relative">
              <input
                type="file"
                accept=".zip,.json"
                onChange={handleFileRestore}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <HardDrive className="w-8 h-8 text-slate-500 mx-auto mb-1" />
              <p className="text-xs text-slate-300 font-semibold">
                اضغط هنا لاختيار ملف النسخة الاحتياطية (.zip أو .json)
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                مجلد: محاسبة جوالات / النسخ_الاحتياطية
              </span>
            </div>

            {restoreStatus && (
              <p className="text-xs text-cyan-400 font-medium mt-2 animate-pulse text-center">
                {restoreStatus}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* App & Store & Legal Identity Settings Form */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Settings className="w-5 h-5 text-cyan-400" />
            <div>
              <h3>إعدادات المحل وهوية البائع (للعقود القانونية السورية)</h3>
              <p className="text-xs text-slate-400 font-normal">
                البيانات المعتمدة قانونياً لتوثيق عقود تقسيط الجوالات وسندات القبض
              </p>
            </div>
          </div>
          {isSaved && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              تم حفظ الإعدادات
            </span>
          )}
        </div>

        <form onSubmit={handleSettingsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم المركز / المحل *
            </label>
            <input
              type="text"
              required
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              رقم هاتف المركز / واتساب للتواصل *
            </label>
            <input
              type="text"
              required
              value={formData.storePhone}
              onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم البائع / صاحب المنشأة (المذكور بالعقد القانوني) *
            </label>
            <input
              type="text"
              required
              value={formData.sellerFullName || ''}
              onChange={(e) => setFormData({ ...formData, sellerFullName: e.target.value })}
              placeholder="مثال: محمد هشام الحلبي"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              الرقم الوطني للبائع (11 خانة) *
            </label>
            <input
              type="text"
              maxLength={11}
              required
              value={formData.sellerNationalId || ''}
              onChange={(e) => setFormData({ ...formData, sellerNationalId: e.target.value })}
              placeholder="01050809123"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              القيد والخانة والمحافظة (للبائع) *
            </label>
            <input
              type="text"
              required
              value={formData.sellerRegistry || ''}
              onChange={(e) => setFormData({ ...formData, sellerRegistry: e.target.value })}
              placeholder="مثال: دمشق - شاغور خ/412"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              عنوان المحل / المقر التفصيلي *
            </label>
            <input
              type="text"
              required
              value={formData.sellerAddress || ''}
              onChange={(e) => setFormData({ ...formData, sellerAddress: e.target.value })}
              placeholder="دمشق - برج دمشق، الطابق الأرضي، صالة 18"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              العملة المستخدمة
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="$">الدولار الأمريكي ($)</option>
              <option value="ل.س">الليرة السورية (ل.س)</option>
              <option value="د.إ">درهم إماراتي (د.إ)</option>
              <option value="ر.س">ريال سعودي (ر.س)</option>
              <option value="€">اليورو (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              مهلة إغلاق حساب الجوال الافتراضية (أشهر)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={formData.termMonthsDefault}
              onChange={(e) => setFormData({ ...formData, termMonthsDefault: parseInt(e.target.value) || 3 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              الافتراضي 3 أشهر، ويطلق البرنامج تحذيراً فورياً إن لم يغلق الحساب خلالها
            </span>
          </div>

          {/* Smart LAN Sync Settings */}
          <div>
            <label className="block text-xs font-semibold text-cyan-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>كلمة سر المزامنة الموحدة للشبكة المحلية (Wi-Fi) *</span>
            </label>
            <input
              type="text"
              required
              value={formData.syncPassphrase || ''}
              onChange={(e) => setFormData({ ...formData, syncPassphrase: e.target.value })}
              placeholder="مثال: ALSHAM_STORE_2026"
              className="w-full bg-slate-900 border border-cyan-800/60 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              يجب وضع نفس كلمة السر في كافة جوالات المحل المتصلة بنفس شبكة الواي فاي
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>عنوان IP / رابط الخادم المحلي (اختياري)</span>
            </label>
            <input
              type="text"
              value={formData.syncHostUrl || ''}
              onChange={(e) => setFormData({ ...formData, syncHostUrl: e.target.value })}
              placeholder="اتركه فارغاً للاعتماد على المضيف الحالي أو http://192.168.1.100:3000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              رابط الجهاز الرئيسي في المحل (عند تخصيص جوال رئيسي يعمل كخادم مركزي)
            </span>
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات وهوية البائع</span>
            </button>
          </div>
        </form>
      </div>

      {/* Smart LAN Synchronization Card (WiFi Delta Sync) */}
      <div className="bg-slate-800/90 border border-cyan-700/50 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>المزامنة الذكية عبر الشبكة المحلية (WiFi) بين جوالات المحل</span>
                <span className="text-[10px] bg-cyan-900/60 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded-full">
                  Delta Sync الفوري
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                فحص سريع بالأجزاء من الثانية: يتم التحقق أولاً من الفروقات ومزامنة ما تم تعديله فقط بدون استهلاك أو إبطاء الشبكة
              </p>
            </div>
          </div>
        </div>

        {/* Sync Status Feedback */}
        {syncFeedback && (
          <div
            className={`mb-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              syncFeedback.success
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                : 'bg-rose-950/60 border-rose-700/60 text-rose-300'
            }`}
          >
            {syncFeedback.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">{syncFeedback.message}</p>
              {syncFeedback.durationMs !== undefined && (
                <p className="text-[11px] text-slate-400 font-mono">
                  سرعة الفحص والمزامنة: {syncFeedback.durationMs}ms | السجلات المحدثة: {syncFeedback.syncedCount ?? 0}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">كلمة سر المزامنة:</span>
              <span className="font-mono text-cyan-300 font-bold">
                {formData.syncPassphrase || 'ALSHAM_STORE_2026'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">نطاق الشبكة:</span>
              <span className="font-mono text-slate-200">
                {formData.syncHostUrl || 'المضيف الحالي (محلي)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">آلية الفحص:</span>
              <span className="text-amber-400 font-semibold">
                فحص فوري للهاش والتاريخ ثم المزامنة
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleCheckSync}
              className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>فحص الفروقات فقط (Smart Diff)</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePerformSync}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              <Wifi className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span>{isSyncing ? 'جاري الفحص والمزامنة...' : 'مزامنة ذكية سريعة الآن'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Relational SQLite Database Card (Requested by User) */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>إدارة قاعدة بيانات SQLite العلائقية (.sqlite)</span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">
                  محرك علائقي حقيقي
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تخزين حقيقي مهيكل بجداول علائقية (customers, sales, installments, treasury) يدعم التوسع وإضافة حقول وجداول جديدة مستقبلاً
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          {/* Table Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">جدول الزبائن (customers)</span>
              <span className="font-mono text-white font-bold text-sm">
                {sqliteStats?.customerCount ?? customers.length} زبون
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">جدول العقود (sales)</span>
              <span className="font-mono text-cyan-300 font-bold text-sm">
                {sqliteStats?.saleCount ?? sales.length} عقد
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">جدول الأقساط (installments)</span>
              <span className="font-mono text-amber-300 font-bold text-sm">
                {sqliteStats?.installmentCount ?? sales.reduce((acc, s) => acc + (s.installments?.length || 0), 0)} قسط
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">جدول الصندوق (treasury)</span>
              <span className="font-mono text-emerald-300 font-bold text-sm">
                {sqliteStats?.treasuryCount ?? treasury.length} حركة
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isSqliteDownloading}
              onClick={handleDownloadSqlite}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-700/30 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isSqliteDownloading ? 'جاري التصدير...' : 'تحميل ملف SQLite (.sqlite) للموبايل'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToSqlite}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث ومزامنة بنية SQLite الآن</span>
            </button>
          </div>
        </div>
      </div>

      {/* Android Installation & SQLite Architecture Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <Smartphone className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <h4 className="font-bold text-white text-sm">
            بنية التطبيق (Android PWA + SQLite Architecture)
          </h4>
          <p className="leading-relaxed text-slate-400">
            تم تصميم التطبيق ليعمل كـ تطبيق أندرويد مستقل (PWA) قابل للتثبيت على الشاشة الرئيسية بدون اتصال بالإنترنت، مع محرك قاعدة بيانات مهيكل يدعم الترقية المستمرة وإضافة جداول وحقول جديدة مستقبلاً، وحفظ كافة النسخ الاحتياطية بمجلد "محاسبة جوالات".
          </p>
        </div>
      </div>
    </div>
  );
};

