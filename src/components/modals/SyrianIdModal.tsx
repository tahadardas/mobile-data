/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { IdCard, X, ZoomIn, ZoomOut, RotateCcw, Phone } from 'lucide-react';
import { Customer } from '../../types';

interface SyrianIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const SyrianIdModal: React.FC<SyrianIdModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!isOpen || !customer) return null;

  const currentPhotoUrl =
    activeSide === 'front'
      ? customer.idPhotos.frontUrl
      : customer.idPhotos.backUrl;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                توثيق البطاقة الشخصية (الهوية السورية)
              </h3>
              <p className="text-xs text-slate-400">
                الزبون: <strong className="text-white">{customer.fullName}</strong> | الرقم الوطني: <span className="font-mono text-cyan-300">{customer.nationalId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Toggle Front / Back & Zoom */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSide('front');
                handleResetZoom();
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeSide === 'front'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الوجه الأمامي (الصورة والاسم)
            </button>
            <button
              onClick={() => {
                setActiveSide('back');
                handleResetZoom();
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeSide === 'back'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الوجه الخلفي (الرقم الوطني والعنوان)
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="إعادة ضبط"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[300px]">
          <div
            className="transition-transform duration-200 ease-out origin-center rounded-xl overflow-hidden shadow-2xl border border-slate-800 max-w-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={currentPhotoUrl}
              alt={`هوية سورية - ${activeSide === 'front' ? 'وجه أمامي' : 'وجه خلفي'}`}
              className="max-h-[500px] w-auto object-contain rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80';
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>هاتف الزبون: <strong className="text-white font-mono">{customer.phone}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
