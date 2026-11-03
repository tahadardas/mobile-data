/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SyrianIdPhotos {
  frontUrl: string; // Base64 or image URL
  backUrl: string;  // Base64 or image URL
}

export interface Customer {
  id: string;
  fullName: string;
  nationalId: string; // الرقم الوطني السوري (11 خانة)
  phone: string;
  address: string;
  workPlace?: string;
  guarantorName?: string; // اسم الكفيل
  guarantorPhone?: string; // هاتف الكفيل
  idPhotos: SyrianIdPhotos;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InstallmentRecord {
  id: string;
  saleId: string;
  installmentNumber: number; // 1, 2, 3...
  dueDate: string; // YYYY-MM-DD
  amount: number;
  paidAmount: number;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  receiptNumber?: string;
  notes?: string;
  updatedAt?: string;
}

export interface PhoneSale {
  id: string;
  customerId: string;
  phoneName: string; // اسم الجوال/الموديل e.g. iPhone 15 Pro Max
  imei: string; // رقم الـ IMEI (15 خانة)
  purchasePrice: number; // سعر شراء الجوال
  agreedPrice: number; // السعر الكامل المتفق عليه للبيع
  downPayment: number; // الدفعة الأولى
  termMonths: number; // مدة السداد بالأشهر (الافتراضي 3 أشهر)
  startDate: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'overdue' | 'breached_term';
  installments: InstallmentRecord[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TreasuryTransaction {
  id: string;
  type: 'income' | 'expense'; // قبض ايراد أو دفع مصاريف
  amount: number;
  description: string; // البيان
  date: string; // YYYY-MM-DD
  category: string; // تصنيف: مبيعات تقسيط، أقساط محصلة، إيراد مباشر، إيجار، فواتير، رواتب، مصاريف عامة، مشتريات
  referenceSaleId?: string;
  referenceInstallmentId?: string;
  referenceCustomerName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  storeName: string;
  storePhone: string;
  sellerFullName: string; // اسم البائع / صاحب المحل المذكور بالعقد
  sellerNationalId: string; // الرقم الوطني للبائع (11 خانة)
  sellerRegistry: string; // القيد والخانة والمحافظة (مثال: دمشق - شاغور خ/145)
  sellerAddress: string; // عنوان المحل أو إقامة البائع
  currency: string; // default: "$" or "ل.س"
  termMonthsDefault: number; // default: 3
  downPaymentMinPercent: number; // default: 50%
  lastBackupDate?: string;
  autoBackupDaily: boolean;
  syncPassphrase?: string; // كلمة سر المزامنة الموحدة عبر الشبكة المحلية (WiFi)
  syncHostUrl?: string; // عنوان الخادم أو IP المحلي
  syncAutoInterval?: boolean;
  lastSyncTimestamp?: string;
}

export interface DatabaseBackup {
  version: string;
  timestamp: string;
  folderName: string; // "محاسبة جوالات"
  settings: AppSettings;
  customers: Customer[];
  sales: PhoneSale[];
  treasury: TreasuryTransaction[];
}
