/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  IdCard,
  Phone,
  MapPin,
  Briefcase,
  UserCheck,
  Search,
  Plus,
  ExternalLink,
  MessageCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { Customer, PhoneSale, AppSettings } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  sales: PhoneSale[];
  settings: AppSettings;
  onOpenNewCustomer: () => void;
  onViewIdPhotos: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  settings,
  onOpenNewCustomer,
  onViewIdPhotos,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.nationalId.includes(q) ||
      c.phone.includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              سجل الزبائن وتوثيق الهويات السورية
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            توثيق كامل للرقم الوطني، صور الهوية بالوجهين، الكفيل وأرقام التواصل
          </p>
        </div>

        <button
          onClick={onOpenNewCustomer}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة زبون جديد</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الزبون، الرقم الوطني (11 رقم)، أو رقم الهاتف..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Customers List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((customer) => {
          const customerSales = sales.filter((s) => s.customerId === customer.id);
          const activeSales = customerSales.filter((s) => s.status !== 'completed');
          const hasBreach = customerSales.some((s) => s.status === 'breached_term');

          return (
            <div
              key={customer.id}
              className={`bg-slate-800/90 border rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all ${
                hasBreach
                  ? 'border-rose-600/80 bg-rose-950/20'
                  : 'border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {customer.fullName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-cyan-300 font-mono text-xs font-semibold bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700 w-fit">
                      <IdCard className="w-3.5 h-3.5 text-cyan-400" />
                      <span>الرقم الوطني: {customer.nationalId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف الزبون (${customer.fullName})؟`)) {
                        onDeleteCustomer(customer.id);
                      }
                    }}
                    title="حذف الزبون"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{customer.phone}</span>
                    <a
                      href={`https://wa.me/963${customer.phone.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 ml-auto"
                      title="مراسلة واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{customer.address}</span>
                  </div>

                  {customer.workPlace && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>مكان العمل: {customer.workPlace}</span>
                    </div>
                  )}

                  {customer.guarantorName && (
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>الكفيل: {customer.guarantorName}</span>
                      </div>
                      {customer.guarantorPhone && (
                        <span className="text-slate-400 font-mono block mt-0.5">
                          هاتف الكفيل: {customer.guarantorPhone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Syrian ID Photos Preview Thumbnail */}
                <div className="mt-4 pt-3 border-t border-slate-700/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-400 font-medium">الهوية الشخصية (الوجهين):</span>
                    <button
                      onClick={() => onViewIdPhotos(customer)}
                      className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="w-3 h-3" />
                      <span>عرض وتكبير</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div
                      onClick={() => onViewIdPhotos(customer)}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-700 aspect-[3/2] bg-slate-900"
                    >
                      <img
                        src={customer.idPhotos.frontUrl}
                        alt="الهوية وجه أول"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          // Fallback avatar
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/70 px-1.5 py-0.5 rounded text-white backdrop-blur-sm">
                        الوجه الأمامي
                      </span>
                    </div>

                    <div
                      onClick={() => onViewIdPhotos(customer)}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-700 aspect-[3/2] bg-slate-900"
                    >
                      <img
                        src={customer.idPhotos.backUrl}
                        alt="الهوية وجه ثان"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 text-[10px] font-bold bg-black/70 px-1.5 py-0.5 rounded text-white backdrop-blur-sm">
                        الوجه الخلفي
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment Contracts Status for this customer */}
              <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  العقود: <strong className="text-white">{customerSales.length}</strong>
                </span>
                {activeSales.length > 0 ? (
                  <span className="text-cyan-400 font-semibold">
                    {activeSales.length} عقد قيد السداد
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">لا توجد أقساط نشطة</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
