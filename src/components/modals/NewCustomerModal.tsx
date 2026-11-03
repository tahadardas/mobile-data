/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserPlus,
  IdCard,
  Upload,
  Camera,
  X,
  Check,
  AlertCircle,
  Phone,
  MapPin,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Customer } from '../../types';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCustomer: (customer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onSaveCustomer,
}) => {
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [workPlace, setWorkPlace] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Syrian ID Card Photos (Front & Back)
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80'
  );
  const [backPhotoUrl, setBackPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=600&auto=format&fit=crop&q=80'
  );

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (side === 'front') {
          setFrontPhotoUrl(reader.result);
        } else {
          setBackPhotoUrl(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('يرجى إدخال اسم الزبون الرباعي الكامل');
      return;
    }

    const cleanNationalId = nationalId.trim().replace(/\D/g, '');
    if (cleanNationalId.length !== 11) {
      if (!confirm(`الرقم الوطني السوري يتألف عادةً من 11 رقماً (أنت أدخلت ${cleanNationalId.length} أرقام). هل ترغب بالمتابعة؟`)) {
        return;
      }
    }

    if (!phone.trim()) {
      alert('يرجى إدخال رقم هاتف الزبون');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      fullName: fullName.trim(),
      nationalId: cleanNationalId || nationalId.trim(),
      phone: phone.trim(),
      address: address.trim() || 'دمشق',
      workPlace: workPlace.trim(),
      guarantorName: guarantorName.trim(),
      guarantorPhone: guarantorPhone.trim(),
      idPhotos: {
        frontUrl: frontPhotoUrl,
        backUrl: backPhotoUrl,
      },
      notes: notes.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveCustomer(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                إضافة زبون جديد وتوثيق الهوية السورية
              </h3>
              <p className="text-xs text-slate-400">
                تسجيل البيانات الشخصية، الرقم الوطني (11 خانة)، وصور الهوية بالوجهين
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الاسم الكامل (الرباعي) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: حسام محمد خير النجار"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الرقم الوطني السوري (11 خانة) *
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="01020304051"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                مطبوع على البطاقة الشخصية السورية (11 رقماً)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رقم الهاتف / واتساب *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0944123456"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                مكان السكن والعنوان بالتفصيل *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: دمشق - الميدان - جانب جامع الماجد"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              مكان العمل والوظيفة
            </label>
            <input
              type="text"
              value={workPlace}
              onChange={(e) => setWorkPlace(e.target.value)}
              placeholder="مثال: موظف قطاع خاص، تاجر، صاحب محل..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Guarantor Info */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>بيانات الكفيل والضامن (اختياري / موصى به)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  placeholder="اسم الكفيل الكامل"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <input
                  type="tel"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  placeholder="رقم هاتف الكفيل"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Syrian ID Card Upload (Front & Back Faces) */}
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <IdCard className="w-4 h-4 text-cyan-400" />
                <span>رفع صورة الهوية السورية الشخصية (الوجهين) *</span>
              </label>
              <span className="text-[11px] text-slate-400">انقر لرفع صورة أو التقاطها</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Front Face */}
              <div className="border border-slate-700 rounded-xl p-3 bg-slate-900/60">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span>الوجه الأمامي (الصورة والاسم)</span>
                  <label className="cursor-pointer text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>تغيير</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'front')}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-[3/2] bg-slate-950 flex items-center justify-center">
                  <img
                    src={frontPhotoUrl}
                    alt="الهوية وجه أمامي"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <label className="cursor-pointer px-3 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow">
                      <Camera className="w-4 h-4" />
                      <span>اختر صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'front')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Back Face */}
              <div className="border border-slate-700 rounded-xl p-3 bg-slate-900/60">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span>الوجه الخلفي (الرقم الوطني والعنوان)</span>
                  <label className="cursor-pointer text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>تغيير</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'back')}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-[3/2] bg-slate-950 flex items-center justify-center">
                  <img
                    src={backPhotoUrl}
                    alt="الهوية وجه خلفي"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <label className="cursor-pointer px-3 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow">
                      <Camera className="w-4 h-4" />
                      <span>اختر صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'back')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات تخص الزبون..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

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
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              حفظ الزبون وتوثيق الهوية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
