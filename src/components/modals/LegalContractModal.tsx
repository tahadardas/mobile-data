/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  MessageCircle,
  X,
  FileText,
  ShieldCheck,
  CheckCircle,
  Scale,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PhoneSale, Customer, AppSettings } from '../../types';
import { AppStorageService } from '../../services/storage';

interface LegalContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PhoneSale | null;
  customer?: Customer;
  settings: AppSettings;
}

export const LegalContractModal: React.FC<LegalContractModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  settings,
}) => {
  const contractRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [includeGuarantor, setIncludeGuarantor] = useState<boolean>(() => Boolean(customer?.guarantorName));

  if (!isOpen || !sale) return null;

  const remaining = Math.round(Math.max(0, sale.agreedPrice - sale.downPayment) * 100) / 100;
  const totalPaid = Math.round((sale.downPayment + sale.installments.reduce((acc, i) => acc + (i.paidAmount || 0), 0)) * 100) / 100;
  const currentBalance = Math.round(Math.max(0, sale.agreedPrice - totalPaid) * 100) / 100;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!contractRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const canvas = await html2canvas(contractRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 mm
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `عقد_تقسيط_${customer?.fullName || 'زبون'}_${sale.phoneName.replace(/[\/\s]/g, '_')}.pdf`;
      pdf.save(fileName);
      setIsGeneratingPdf(false);
    } catch (err: any) {
      setIsGeneratingPdf(false);
      alert(`حدث خطأ أثناء تصدير العقد إلى PDF: ${err.message}`);
    }
  };

  const whatsappUrl = customer
    ? AppStorageService.generateWhatsAppUrl(
        customer.phone,
        AppStorageService.generateLegalContractMessage(customer, sale, settings)
      )
    : '#';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-4 print:border-none print:shadow-none print:bg-white print:text-black print:max-h-none print:my-0">
        
        {/* Sticky Header Bar (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2.5 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs sm:text-sm">
                عقد بيع جوال بالتقسيط وحفظ الملكية (القانون السوري)
              </h3>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                عقد رسمي موثق متوافق مع القانون السوري
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Interactive Guarantor Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/90 border border-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
              <input
                type="checkbox"
                checked={includeGuarantor}
                onChange={(e) => setIncludeGuarantor(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-cyan-500 w-3.5 h-3.5"
              />
              <span className="font-semibold text-[11px]">إدراج كفيل ضامن</span>
            </label>

            {/* Prominent Print & PDF Export Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة وتصدير كـ PDF</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isGeneratingPdf ? 'جاري التصدير...' : 'ملف PDF'}</span>
            </button>

            {customer && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">واتساب</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Scrollable Printable Contract Content */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-4">
          <div
            ref={contractRef}
            className="p-6 sm:p-10 bg-white text-slate-900 space-y-6 text-xs leading-relaxed selection:bg-cyan-100 rounded-xl"
            style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}
          >
          {/* Official Syrian Heading */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600">الجمهورية العربية السورية</span>
              <span className="text-[11px] font-bold text-slate-600">تطبيق: محاسبة جوالات</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide">
              عقد بيع جهاز خلوي بالتقسيط مع حفظ حق الملكية
            </h1>
            <p className="text-xs font-bold text-slate-700 mt-1">
              (محرر وفقاً لأحكام القانون المدني السوري وقانون التجارة النافذ)
            </p>
            <div className="flex justify-between items-center text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200">
              <span>رقم العقد: <strong className="font-mono text-slate-900">{sale.id.toUpperCase()}</strong></span>
              <span>تاريخ التحرير: <strong className="font-mono text-slate-900">{sale.startDate}</strong></span>
              <span>مكان التحرير: <strong>{settings.sellerAddress || 'دمشق'}</strong></span>
            </div>
          </div>

          {/* Intro Statement */}
          <p className="text-justify font-medium text-slate-800">
            في يوم <strong>{new Date(sale.startDate).toLocaleDateString('ar-SY', { weekday: 'long' })}</strong> الموافق <strong>{sale.startDate}</strong>، وبكامل الأهلية القانونية المعتبرة شرعاً وقانوناً، اتفق وتراضى كل من الأطراف التالية:
          </p>

          {/* Parties Definition */}
          <div className="space-y-3">
            {/* First Party (Seller) */}
            <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
              <p className="font-bold text-slate-900 mb-1">
                الفريق الأول (البائع):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
                <p>• اسم المنشأة / المحل: <strong>{settings.storeName}</strong></p>
                <p>• اسم المالك / البائع: <strong>{settings.sellerFullName || settings.storeName}</strong></p>
                <p>• الرقم الوطني: <strong className="font-mono">{settings.sellerNationalId || '01050809123'}</strong></p>
                <p>• القيد والخانة: <strong>{settings.sellerRegistry || 'دمشق - شاغور'}</strong></p>
                <p>• العنوان والمقر: <strong>{settings.sellerAddress || 'دمشق'}</strong></p>
                <p>• هاتف التواصل: <strong className="font-mono">{settings.storePhone}</strong></p>
              </div>
            </div>

            {/* Second Party (Buyer) */}
            <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
              <p className="font-bold text-slate-900 mb-1">
                الفريق الثاني (المشتري):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
                <p>• الاسم الثلاثي: <strong>{customer?.fullName || '...........................'}</strong></p>
                <p>• الرقم الوطني السوري: <strong className="font-mono">{customer?.nationalId || '...........................'}</strong></p>
                <p>• العنوان ومحل الإقامة: <strong>{customer?.address || '...........................'}</strong></p>
                <p>• رقم الهاتف الخلوي: <strong className="font-mono">{customer?.phone || '...........................'}</strong></p>
                <p>• مكان العمل والمهنة: <strong>{customer?.workPlace || 'حر'}</strong></p>
              </div>
            </div>

            {/* Third Party (Guarantor) */}
            {includeGuarantor && customer?.guarantorName && (
              <div className="p-3 rounded-lg border border-slate-300 bg-slate-50">
                <p className="font-bold text-slate-900 mb-1">
                  الفريق الثالث (الكفيل المتضامن والغارم):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
                  <p>• اسم الكفيل الكامل: <strong>{customer.guarantorName}</strong></p>
                  <p>• هاتف الكفيل: <strong className="font-mono">{customer.guarantorPhone || '...........................'}</strong></p>
                  <p className="sm:col-span-2 text-[10px] text-slate-600">
                    * يقر الكفيل بكفالته التضامنية والتامة للفريق الثاني في سداد كافة الالتزامات المالية الناشئة عن هذا العقد.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Subject of Sale & Phone Specs */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-2 border-r-4 border-cyan-600 pr-2">
              البند الأول: موضوع البيع ومواصفات الجهاز الخلوي
            </h4>
            <div className="border border-slate-300 rounded-lg overflow-hidden text-[11px]">
              <table className="w-full text-right">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <tr>
                    <th className="p-2">نوع وموديل الجوال</th>
                    <th className="p-2 text-center">الرقم التسلسلي الدولي (IMEI)</th>
                    <th className="p-2 text-center">الحالة الفنية</th>
                    <th className="p-2 text-left">مدة التقسيط</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 font-bold text-slate-900">{sale.phoneName}</td>
                    <td className="p-2 text-center font-mono font-bold text-slate-900">{sale.imei}</td>
                    <td className="p-2 text-center">جديد / نظامي مفحوص ومعاين</td>
                    <td className="p-2 text-left font-bold">{sale.termMonths} أشهر ميلادية</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Schedule */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-2 border-r-4 border-cyan-600 pr-2">
              البند الثاني: الثمن المتفق عليه وطريقة السداد
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
              <div className="p-2 rounded-lg bg-slate-100 border border-slate-300">
                <span className="text-[10px] text-slate-500 block">سعر المبيع المتفق عليه</span>
                <span className="font-bold font-mono text-slate-900">{sale.agreedPrice} {settings.currency}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300">
                <span className="text-[10px] text-emerald-700 block">الدفعة الأولى المقبوضة</span>
                <span className="font-bold font-mono text-emerald-800">{sale.downPayment} {settings.currency}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-300">
                <span className="text-[10px] text-amber-700 block">المبلغ المتبقي للتقسيط</span>
                <span className="font-bold font-mono text-amber-800">{remaining} {settings.currency}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 border border-slate-300">
                <span className="text-[10px] text-slate-500 block">الرصيد القائم الحالي</span>
                <span className="font-bold font-mono text-slate-900">{currentBalance} {settings.currency}</span>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-800 mb-2">
              جدول الأقساط الشهرية المستحقة (مدة الوفاء 3 أشهر):
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {sale.installments.map((inst) => (
                <div key={inst.id} className="p-2 rounded-lg border border-slate-300 bg-slate-50">
                  <span className="block font-bold text-slate-900">القسط رقم ({inst.installmentNumber})</span>
                  <span className="font-mono font-bold text-slate-800">{inst.amount} {settings.currency}</span>
                  <span className="block font-mono text-[10px] text-slate-600 mt-0.5">تاريخ الاستحقاق: {inst.dueDate}</span>
                  <span className={`block font-bold text-[10px] mt-1 ${inst.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {inst.status === 'paid' ? '✓ مسدد بالكامل' : 'قيد الاستحقاق'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Terms According to Syrian Law */}
          <div className="space-y-2 border-t border-slate-300 pt-3">
            <h4 className="font-bold text-xs text-slate-900 mb-1 border-r-4 border-cyan-600 pr-2">
              البند الثالث: الشروط والأحكام القانونية الملزمة (القانون السوري)
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed text-justify">
              <li>
                <strong>المعاينة والتسليم:</strong> يقر الفريق الثاني (المشتري) بأنه عاين الجهاز المذكور المعاينة التامة النافية للجهالة شرعاً وقانوناً، وتسلمه سليماً خالياً من أي عيب، مطابقاً لرقم الآيمي (IMEI) المبين أعلاه.
              </li>
              <li>
                <strong>سقوط الأجل والمهلة المحددة:</strong> اتفق الطرفان صراحة على أن مهلة إغلاق كامل ثمن الجهاز هي <strong>ثلاثة أشهر ميلادية</strong> من تاريخ تحرير العقد. وإذا تأخر الفريق الثاني عن سداد أي قسط شهري في موعد استحقاقه، <strong>تسقط حكماً الآجال المتبقية</strong> ويحق للفريق الأول مطالبته بكامل المبلغ المتبقي فوراً ودفعة واحدة دون الحاجة إلى إنذار رسمي أو إعذار قضائي.
              </li>
              <li>
                <strong>الاحتفاظ بحق الملكية:</strong> تبقى ملكية الجهاز المبيع محفوظة حكماً لصالح الفريق الأول (البائع) ولا تنتقل ملكيته للفريق الثاني إلا بعد الوفاء بكامل الثمن وآخر ليرة/دولار منه. ولا يحق للفريق الثاني بيع الجهاز أو رهنه أو التنازل عنه للغير قبل استيفاء كامل الثمن، ويعد أي تصرف من هذا القبيل إساءة ائتمان واحتيالاً يعاقب عليه قانون العقوبات السوري.
              </li>
              {includeGuarantor && (
                <li>
                  <strong>الكفالة التضامنية:</strong> يلتزم الكفيل (الفريق الثالث) بالتضامن والتكافل التام مع المشتري في أداء كافة الأقساط والمصاريف المترتبة فور استحقاقها بمجرد إخطاره.
                </li>
              )}
              <li>
                <strong>الاختصاص القضائي:</strong> تخضع بنود هذا العقد وتفسيره للقوانين السورية النافذة، وتختص محاكم مدينة موطن البائع بالنظر في أي نزاع قد ينشأ عن تنفيذ أو تفسير هذا العقد.
              </li>
            </ol>
          </div>

          {/* Formal Closing & Signatures */}
          <div className="pt-4 border-t-2 border-slate-900">
            <p className="text-center font-bold text-xs text-slate-800 mb-6">
              حرر هذا العقد على نسختين أصليتين، بيد كل فريق نسخة للعمل بموجبها عند الاقتضاء.
            </p>

            <div className={`grid ${includeGuarantor ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-center text-xs`}>
              <div className="space-y-8">
                <p className="font-bold text-slate-900">الفريق الأول (البائع)</p>
                <p className="text-slate-400 font-serif">الختم والتوقيع</p>
                <p className="font-bold text-[11px] text-slate-700">{settings.sellerFullName || settings.storeName}</p>
              </div>

              <div className="space-y-8">
                <p className="font-bold text-slate-900">الفريق الثاني (المشتري)</p>
                <p className="text-slate-400 font-serif">البصمة والتوقيع</p>
                <p className="font-bold text-[11px] text-slate-700">{customer?.fullName || '....................'}</p>
              </div>

              {includeGuarantor && (
                <div className="space-y-8">
                  <p className="font-bold text-slate-900">الفريق الثالث (الكفيل)</p>
                  <p className="text-slate-400 font-serif">البصمة والتوقيع</p>
                  <p className="font-bold text-[11px] text-slate-700">{customer?.guarantorName || 'الكفيل المتضامن'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Modal Footer (Hidden in Print) */}
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
