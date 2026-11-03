/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  appUrl = window.location.href,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareToWhatsApp = () => {
    const text = `رابط تثبيت تطبيق محاسبة جوالات (نظام التقسيط والصندوق):\n${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950/70 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-600/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  تثبيت التطبيق على الموبايل (APK / PWA)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                  أندرويد & آيفون
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                طرق تثبيت التطبيق كـ تطبيق مستقل على شاشة الجوال والعمل بدون إنترنت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto text-xs leading-relaxed text-slate-200">
          
          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold text-sm">التطبيق مثبت حالياً على جهازك!</p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  أنت تستخدم التطبيق في الوضع المستقل (Standalone App) بكامل الصلاحيات وقاعدة البيانات.
                </p>
              </div>
            </div>
          ) : (
            /* Option 1: Direct 1-Click Install Button if supported by browser */
            isInstallable && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/60 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>تثبيت فوري بنقرة واحدة (WebAPK)</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      متصفحك يدعم التثبيت المباشر كـ تطبيق مستقل على شاشة هاتفك الرئيسية.
                    </p>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 transition active:scale-95 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'جاري التثبيت...' : 'تثبيت التطبيق على الموبايل الآن'}</span>
                  </button>
                </div>
                {installSuccess && (
                  <p className="mt-2 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    تم التثبيت بنجاح! يمكنك الآن فتح التطبيق من شاشة هاتفك الرئيسية.
                  </p>
                )}
              </div>
            )
          )}

          {/* Explanation: How Android PWA matches APK */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
              <Info className="w-4 h-4 text-cyan-400" />
              <h4>لماذا نظام الـ PWA هو المعيار الحديث لتطبيقات الأندرويد؟</h4>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              يقوم نظام أندرويد بتحويل هذا التطبيق تلقائياً إلى <strong className="text-cyan-300">WebAPK</strong> حقيقي يظهر بأيقونته في قائمة التطبيقات والشاشة الرئيسية، ويعمل بملء الشاشة بدون شريط المتصفح، مع دعم كامل لقاعدة بيانات SQLite دون الحاجة للاتصال بالإنترنت.
            </p>
          </div>

          {/* Method 1: Chrome & Mobile Browser Steps */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 border-r-4 border-cyan-500 pr-2">
              <span>الطريقة الأولى: التثبيت بـ 3 خطوات من متصفح الجوال (أندرويد)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-slate-300 text-[11px]">
              <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-600/30 text-cyan-400 font-bold font-mono flex items-center justify-center text-xs">
                  1
                </div>
                <p className="font-bold text-white">افتح الرابط في Chrome</p>
                <p className="text-slate-400 text-[10px]">
                  انسخ رابط التطبيق أو افتحه في متصفح Google Chrome على هاتفك الأندرويد.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-600/30 text-cyan-400 font-bold font-mono flex items-center justify-center text-xs">
                  2
                </div>
                <p className="font-bold text-white">اضغط القائمة (⋮)</p>
                <p className="text-slate-400 text-[10px]">
                  انقر على زر النقاط الثلاث في أعلى زاوية المتصفح لإظهار قائمة الخيارات.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold font-mono flex items-center justify-center text-xs">
                  3
                </div>
                <p className="font-bold text-white">تثبيت التطبيق</p>
                <p className="text-slate-400 text-[10px]">
                  اختر <strong className="text-cyan-300">«تثبيت التطبيق»</strong> أو <strong className="text-cyan-300">«إضافة إلى الشاشة الرئيسية»</strong> ليتم تثبيته فوراً.
                </p>
              </div>
            </div>
          </div>

          {/* Method 2: Convert to Actual .apk via PWABuilder */}
          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-white text-xs sm:text-sm">
                  الطريقة الثانية: تحميل ملف بصيغة APK حقيقي (.apk)
                </h4>
              </div>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">
                ملف APK مباشر
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              إذا كنت بحاجة إلى ملف تثبيت خام بصيغة <strong className="text-white font-mono">.apk</strong> لتثبيته يدوياً، يمكنك استخدام أداة <strong className="text-cyan-300">PWABuilder</strong> الرسمية من مايكروسوفت وجوجل:
            </p>

            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>انسخ رابط التطبيق بالأسفل.</li>
              <li>انقر على زر <strong>«فتح موقع PWABuilder»</strong>.</li>
              <li>الصق الرابط واضغط <strong>Start</strong> ثم اختر <strong>Android</strong> لتحميل ملف <span className="text-white font-mono font-bold">.apk</span> فوراً!</li>
            </ol>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleCopyUrl}
                className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم نسخ الرابط!' : 'نسخ رابط التطبيق'}</span>
              </button>

              <a
                href={`https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح PWABuilder وتحميل الـ APK</span>
              </a>

              <button
                onClick={handleShareToWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-700/50 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>إرسال الرابط لنفسي عبر واتساب</span>
              </button>
            </div>
          </div>

          {/* Direct App Link Display */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-cyan-300 truncate direction-ltr select-all">
              {appUrl}
            </span>
            <button
              onClick={handleCopyUrl}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 shrink-0"
              title="نسخ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>متوافق مع أجهزة أندرويد وآيفون وهواتف سامسونج وشاومي</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
