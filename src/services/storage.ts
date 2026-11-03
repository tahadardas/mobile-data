/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import {
  Customer,
  PhoneSale,
  InstallmentRecord,
  TreasuryTransaction,
  AppSettings,
  DatabaseBackup,
} from '../types';
import { isDownPaymentBelowFiftyPercent, isThreeMonthTermBreached, isInstallmentOverdue } from '../utils/finance';

const STORAGE_KEYS = {
  CUSTOMERS: 'mj_customers_v1',
  SALES: 'mj_sales_v1',
  TREASURY: 'mj_treasury_v1',
  SETTINGS: 'mj_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'مركز الشام للأجهزة الذكية والتقسيط',
  storePhone: '+963 944 123 456',
  sellerFullName: 'محمد هشام الحلبي',
  sellerNationalId: '01050809123',
  sellerRegistry: 'دمشق - شاغور خ/412',
  sellerAddress: 'دمشق - برج دمشق، الطابق الأرضي، صالة 18',
  currency: '$',
  termMonthsDefault: 3,
  downPaymentMinPercent: 50,
  autoBackupDaily: true,
  lastBackupDate: new Date().toISOString().split('T')[0],
  syncPassphrase: 'ALSHAM_STORE_2026',
  syncHostUrl: '',
  syncAutoInterval: true,
};

// Seed realistic demo data
const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    fullName: 'أحمد محمود السعيد',
    nationalId: '01020304051',
    phone: '0944112233',
    address: 'دمشق - المزة فيلات غربية',
    workPlace: 'شركة هندسية - المزة',
    guarantorName: 'خالد السعيد (الأخ)',
    guarantorPhone: '0933556677',
    idPhotos: {
      frontUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
      backUrl: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=600&auto=format&fit=crop&q=80',
    },
    notes: 'زبون دائم وملتزم بالدفعات',
    createdAt: '2025-11-10',
  },
  {
    id: 'cust-2',
    fullName: 'محمد بشير الخطيب',
    nationalId: '02040608102',
    phone: '0955998877',
    address: 'ريف دمشق - جرمانا',
    workPlace: 'محل تجاري - جرمانا ساحة السيوف',
    guarantorName: 'طارق الخطيب',
    guarantorPhone: '0988112244',
    idPhotos: {
      frontUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      backUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
    },
    notes: 'تأخر في القسط الثاني، يحتاج لمتابعة هاتفية',
    createdAt: '2025-10-01',
  },
  {
    id: 'cust-3',
    fullName: 'سامر غسان اليازجي',
    nationalId: '03060912153',
    phone: '0966443322',
    address: 'حلب - حي السريان القديمة',
    workPlace: 'معلم مدرسة',
    guarantorName: 'عصام اليازجي',
    guarantorPhone: '0944990011',
    idPhotos: {
      frontUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
      backUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    },
    notes: 'تم شراء جهازين بالتقسيط',
    createdAt: '2025-08-15',
  },
];

const SEED_SALES: PhoneSale[] = [
  {
    id: 'sale-1',
    customerId: 'cust-1',
    phoneName: 'iPhone 15 Pro Max 256GB تيتانيوم أزرق',
    imei: '358742109845123',
    purchasePrice: 1100,
    agreedPrice: 1400,
    downPayment: 700, // 50% fulfilled
    termMonths: 3,
    startDate: '2026-01-10',
    status: 'active',
    createdAt: '2026-01-10',
    notes: 'دفعة أولى 700$ مقبوضة نقداً، والمتبقي 700$ مقسمة على 3 أشهر',
    installments: [
      {
        id: 'inst-1-1',
        saleId: 'sale-1',
        installmentNumber: 1,
        dueDate: '2026-02-10',
        amount: 233.33,
        paidAmount: 233.33,
        paidDate: '2026-02-09',
        status: 'paid',
        receiptNumber: 'REC-101',
      },
      {
        id: 'inst-1-2',
        saleId: 'sale-1',
        installmentNumber: 2,
        dueDate: '2026-03-10',
        amount: 233.33,
        paidAmount: 0,
        status: 'pending',
      },
      {
        id: 'inst-1-3',
        saleId: 'sale-1',
        installmentNumber: 3,
        dueDate: '2026-04-10',
        amount: 233.34,
        paidAmount: 0,
        status: 'pending',
      },
    ],
  },
  {
    id: 'sale-2',
    customerId: 'cust-2',
    phoneName: 'Samsung Galaxy S24 Ultra 512GB رمادي',
    imei: '864201937482619',
    purchasePrice: 950,
    agreedPrice: 1250,
    downPayment: 500, // < 50% warning flag was triggered!
    termMonths: 3,
    startDate: '2025-11-01',
    status: 'breached_term', // OVER 3 MONTHS & NOT CLOSED
    createdAt: '2025-11-01',
    notes: 'تنبيه: تخطى مهلة 3 أشهر والحساب غير مغلق!',
    installments: [
      {
        id: 'inst-2-1',
        saleId: 'sale-2',
        installmentNumber: 1,
        dueDate: '2025-12-01',
        amount: 250,
        paidAmount: 250,
        paidDate: '2025-12-02',
        status: 'paid',
        receiptNumber: 'REC-089',
      },
      {
        id: 'inst-2-2',
        saleId: 'sale-2',
        installmentNumber: 2,
        dueDate: '2026-01-01',
        amount: 250,
        paidAmount: 0,
        status: 'overdue', // Overdue!
      },
      {
        id: 'inst-2-3',
        saleId: 'sale-2',
        installmentNumber: 3,
        dueDate: '2026-02-01',
        amount: 250,
        paidAmount: 0,
        status: 'overdue', // Overdue!
      },
    ],
  },
  {
    id: 'sale-3',
    customerId: 'cust-3',
    phoneName: 'Xiaomi Redmi Note 13 Pro+ 5G أسود',
    imei: '862049182746351',
    purchasePrice: 320,
    agreedPrice: 420,
    downPayment: 210, // exactly 50%
    termMonths: 3,
    startDate: '2025-09-01',
    status: 'completed',
    createdAt: '2025-09-01',
    notes: 'تم سداد كامل الأقساط وإغلاق الحساب',
    installments: [
      {
        id: 'inst-3-1',
        saleId: 'sale-3',
        installmentNumber: 1,
        dueDate: '2025-10-01',
        amount: 70,
        paidAmount: 70,
        paidDate: '2025-10-01',
        status: 'paid',
        receiptNumber: 'REC-071',
      },
      {
        id: 'inst-3-2',
        saleId: 'sale-3',
        installmentNumber: 2,
        dueDate: '2025-11-01',
        amount: 70,
        paidAmount: 70,
        paidDate: '2025-11-01',
        status: 'paid',
        receiptNumber: 'REC-078',
      },
      {
        id: 'inst-3-3',
        saleId: 'sale-3',
        installmentNumber: 3,
        dueDate: '2025-12-01',
        amount: 70,
        paidAmount: 70,
        paidDate: '2025-12-01',
        status: 'paid',
        receiptNumber: 'REC-092',
      },
    ],
  },
];

const SEED_TREASURY: TreasuryTransaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    amount: 700,
    description: 'قبض دفعة أولى - جوال iPhone 15 Pro Max (الزبون: أحمد محمود السعيد)',
    date: '2026-01-10',
    category: 'دفعة أولى تقسيط',
    referenceSaleId: 'sale-1',
    referenceCustomerName: 'أحمد محمود السعيد',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'tx-2',
    type: 'income',
    amount: 233.33,
    description: 'قبض قسط شهري 1 - جوال iPhone 15 Pro Max (الزبون: أحمد محمود السعيد)',
    date: '2026-02-09',
    category: 'أقساط محصلة',
    referenceSaleId: 'sale-1',
    referenceInstallmentId: 'inst-1-1',
    referenceCustomerName: 'أحمد محمود السعيد',
    createdAt: '2026-02-09T14:30:00Z',
  },
  {
    id: 'tx-3',
    type: 'income',
    amount: 500,
    description: 'قبض دفعة أولى - جوال Samsung S24 Ultra (الزبون: محمد بشير الخطيب)',
    date: '2025-11-01',
    category: 'دفعة أولى تقسيط',
    referenceSaleId: 'sale-2',
    referenceCustomerName: 'محمد بشير الخطيب',
    createdAt: '2025-11-01T11:00:00Z',
  },
  {
    id: 'tx-4',
    type: 'income',
    amount: 250,
    description: 'قبض قسط شهري 1 - جوال Samsung S24 Ultra (الزبون: محمد بشير الخطيب)',
    date: '2025-12-02',
    category: 'أقساط محصلة',
    referenceSaleId: 'sale-2',
    referenceInstallmentId: 'inst-2-1',
    referenceCustomerName: 'محمد بشير الخطيب',
    createdAt: '2025-12-02T16:20:00Z',
  },
  {
    id: 'tx-5',
    type: 'expense',
    amount: 80,
    description: 'دفع فاتورة كهرباء المحل والإنترنت الشهري',
    date: '2026-02-01',
    category: 'فواتير ومرافق',
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'tx-6',
    type: 'expense',
    amount: 45,
    description: 'شراء كراتين حماية ولوازم تغليف وشحن',
    date: '2026-02-04',
    category: 'مصاريف عامة',
    createdAt: '2026-02-04T12:15:00Z',
  },
];

export class AppStorageService {
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(SEED_SALES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TREASURY)) {
      localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(SEED_TREASURY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    this.isInitialized = true;
    this.refreshSalesStatuses();
  }

  // --- Settings ---
  public static getSettings(): AppSettings {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- Customers ---
  public static getCustomers(): Customer[] {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public static saveCustomer(customer: Customer): void {
    const list = this.getCustomers();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      list[idx] = customer;
    } else {
      list.unshift(customer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  }

  public static deleteCustomer(id: string): void {
    const list = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  }

  // --- Sales ---
  public static getSales(): PhoneSale[] {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getSaleById(id: string): PhoneSale | undefined {
    return this.getSales().find((s) => s.id === id);
  }

  /**
   * Saves a sale and automatically logs the down payment in the Treasury.
   */
  public static saveSale(sale: PhoneSale, isNew: boolean = false): void {
    const sales = this.getSales();
    const idx = sales.findIndex((s) => s.id === sale.id);

    if (idx >= 0) {
      sales[idx] = sale;
    } else {
      sales.unshift(sale);
    }
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));

    // If new sale with a down payment, automatically post to Treasury!
    if (isNew && sale.downPayment > 0) {
      const customer = this.getCustomerById(sale.customerId);
      const customerName = customer ? customer.fullName : 'زبون';
      this.addTreasuryTransaction({
        id: `tx-dp-${Date.now()}`,
        type: 'income',
        amount: sale.downPayment,
        description: `دفعة أولى - بيع جوال ${sale.phoneName} (الزبون: ${customerName})`,
        date: sale.startDate || new Date().toISOString().split('T')[0],
        category: 'دفعة أولى تقسيط',
        referenceSaleId: sale.id,
        referenceCustomerName: customerName,
        createdAt: new Date().toISOString(),
      });
    }

    this.refreshSalesStatuses();
  }

  public static deleteSale(id: string): void {
    const sales = this.getSales().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }

  /**
   * Records an installment payment, updates installment record & sale status,
   * and automatically posts an income entry in the Treasury!
   */
  public static recordInstallmentPayment(
    saleId: string,
    installmentId: string,
    paidAmount: number,
    paidDate: string = new Date().toISOString().split('T')[0],
    receiptNumber?: string,
    notes?: string
  ): { sale: PhoneSale; installment: InstallmentRecord } {
    const sales = this.getSales();
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('لم يتم العثور على عقد البيع');

    const installment = sale.installments.find((i) => i.id === installmentId);
    if (!installment) throw new Error('لم يتم العثور على القسط');

    installment.paidAmount = paidAmount;
    installment.paidDate = paidDate;
    installment.status = paidAmount >= installment.amount ? 'paid' : 'pending';
    installment.receiptNumber = receiptNumber || `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    if (notes) installment.notes = notes;

    // Recalculate sale status
    this.updateSingleSaleStatus(sale);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));

    // Automatically post to Treasury!
    const customer = this.getCustomerById(sale.customerId);
    const customerName = customer ? customer.fullName : 'زبون';

    this.addTreasuryTransaction({
      id: `tx-inst-${Date.now()}`,
      type: 'income',
      amount: paidAmount,
      description: `سداد قسط شهري رقم ${installment.installmentNumber} - جوال ${sale.phoneName} (الزبون: ${customerName})`,
      date: paidDate,
      category: 'أقساط محصلة',
      referenceSaleId: sale.id,
      referenceInstallmentId: installment.id,
      referenceCustomerName: customerName,
      createdAt: new Date().toISOString(),
    });

    return { sale, installment };
  }

  // --- Treasury ---
  public static getTreasuryTransactions(): TreasuryTransaction[] {
    this.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TREASURY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addTreasuryTransaction(tx: TreasuryTransaction): void {
    const list = this.getTreasuryTransactions();
    list.unshift(tx);
    localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(list));
  }

  public static deleteTreasuryTransaction(id: string): void {
    const list = this.getTreasuryTransactions().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(list));
  }

  // --- Status Checks & Re-calculation ---
  public static refreshSalesStatuses(): void {
    const sales = this.getSales();
    const today = new Date().toISOString().split('T')[0];

    for (const sale of sales) {
      this.updateSingleSaleStatus(sale, today);
    }

    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }

  private static updateSingleSaleStatus(sale: PhoneSale, today: string = new Date().toISOString().split('T')[0]): void {
    const paidSum = sale.installments.reduce((acc, inst) => acc + (inst.paidAmount || 0), 0);
    const remaining = Math.max(0, sale.agreedPrice - sale.downPayment - paidSum);

    // Update individual installments
    let hasOverdueInstallment = false;
    for (const inst of sale.installments) {
      if (inst.paidAmount >= inst.amount) {
        inst.status = 'paid';
      } else if (isInstallmentOverdue(inst.dueDate, inst.paidAmount, inst.amount, today)) {
        inst.status = 'overdue';
        hasOverdueInstallment = true;
      } else {
        inst.status = 'pending';
      }
    }

    if (remaining <= 0.01) {
      sale.status = 'completed';
    } else if (isThreeMonthTermBreached(sale.startDate, remaining, today, sale.termMonths || 3)) {
      sale.status = 'breached_term';
    } else if (hasOverdueInstallment) {
      sale.status = 'overdue';
    } else {
      sale.status = 'active';
    }
  }

  // --- Backup & Restore Engine ---
  /**
   * Generates a compressed ZIP backup file containing the entire SQLite/JSON database,
   * directory structure "محاسبة جوالات" and summary manifest.
   */
  public static async createCompressedBackup(): Promise<{ zipBlob: Blob; fileName: string; meta: DatabaseBackup }> {
    const backupData: DatabaseBackup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      folderName: 'محاسبة جوالات',
      settings: this.getSettings(),
      customers: this.getCustomers(),
      sales: this.getSales(),
      treasury: this.getTreasuryTransactions(),
    };

    const zip = new JSZip();
    const rootFolder = zip.folder('محاسبة جوالات') || zip;
    const backupFolder = rootFolder.folder('النسخ_الاحتياطية');

    // 1. JSON database snapshot
    const dbJson = JSON.stringify(backupData, null, 2);
    backupFolder?.file('database.sqlite.json', dbJson);

    // 2. Human readable manifest
    const manifest = `=== تطبيق محاسبة جوالات - نسخة احتياطية يومية ===
تاريخ النسخ: ${new Date().toLocaleString('ar-SY')}
المجلد المستهدف: محاسبة جوالات
عدد الزبائن: ${backupData.customers.length}
عدد عقود التقسيط: ${backupData.sales.length}
عدد الحركات المالية في الصندوق: ${backupData.treasury.length}
العملة: ${backupData.settings.currency}
===================================================`;
    backupFolder?.file('بيانات_النسخة_الاحتياطية.txt', manifest);

    // Generate zip blob
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
    const today = new Date().toISOString().split('T')[0];
    const fileName = `محاسبة_جوالات_نسخة_${today}.zip`;

    // update last backup in settings
    const settings = this.getSettings();
    settings.lastBackupDate = today;
    this.saveSettings(settings);

    return { zipBlob, fileName, meta: backupData };
  }

  /**
   * Restores database from imported JSON or ZIP backup object.
   */
  public static restoreBackup(backupData: DatabaseBackup): boolean {
    if (!backupData || !Array.isArray(backupData.customers) || !Array.isArray(backupData.sales)) {
      throw new Error('الملف غير صالح أو لا يحتوي على بنية قاعدة بيانات صحيحة لتطبيق محاسبة جوالات');
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(backupData.customers));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(backupData.sales));
    localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(backupData.treasury || []));
    if (backupData.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backupData.settings));
    }

    this.refreshSalesStatuses();
    return true;
  }

  /**
   * WhatsApp sharing helper for overdue installment alerts, receipts, and backups.
   */
  public static generateWhatsAppUrl(phoneNumber: string, message: string): string {
    // Clean Syrian/international phone number
    let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '963' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  public static generateInstallmentReminderMessage(sale: PhoneSale, inst: InstallmentRecord, customer: Customer, settings: AppSettings): string {
    return `مرحباً أخي الكريم ${customer.fullName} المحترم،
نحيطكم علماً من *${settings.storeName}* بأن القسط الشهري رقم (${inst.installmentNumber}) لجهازك *${sale.phoneName}* وقيمته *${inst.amount} ${settings.currency}* يستحق بتاريخ *${inst.dueDate}*.
نرجو التكرم بالسداد في الموعد المحدد.
شاكرين حسن تعاونكم والتزامكم معنا.
للتواصل والاستفسار: ${settings.storePhone}`;
  }

  public static generateThreeMonthBreachMessage(sale: PhoneSale, remaining: number, customer: Customer, settings: AppSettings): string {
    return `الأخ الفاضل ${customer.fullName} المحترم،
تحية طيبة من *${settings.storeName}*،
نود تذكيركم بأن مهلة سداد ثمن جوال *${sale.phoneName}* المحددة بـ 3 أشهر قد انقضت، والمبلغ المتبقي غير المسدد هو *${remaining} ${settings.currency}*.
نرجو مراجعتنا لتسوية الحساب وإغلاقه في أقرب وقت.
شكراً لتفهمكم.
هاتف المركز: ${settings.storePhone}`;
  }

  public static generatePaymentReceiptMessage(
    customer: Customer,
    sale: PhoneSale,
    instNumber: number,
    paidAmount: number,
    remaining: number,
    receiptNo: string,
    settings: AppSettings
  ): string {
    return `*سند قبض إلكتروني - ${settings.storeName}*
------------------------------
رقم السند: ${receiptNo}
التاريخ: ${new Date().toLocaleDateString('ar-SY')}
وصلنا من السيد: *${customer.fullName}*
الرقم الوطني: ${customer.nationalId}
مبلغ وقدره: *${paidAmount} ${settings.currency}*
وذلك سداد القسط رقم (${instNumber}) عن جوال:
*${sale.phoneName}*
رقم الـ IMEI: ${sale.imei}
------------------------------
المبلغ المتبقي على الحساب: *${remaining} ${settings.currency}*
شكراً لتعاملكم معنا!
هاتف: ${settings.storePhone}`;
  }

  /**
   * Reset database to a blank, fresh state for real mobile production use.
   * Preserves customized settings (store name, seller details).
   */
  public static clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify([]));
  }

  /**
   * Re-load realistic demo/seed data for testing and demonstration.
   */
  public static loadSeedData(): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(SEED_SALES));
    localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(SEED_TREASURY));
    this.refreshSalesStatuses();
  }

  /**
   * Generates a native SMS URL for mobile dispatch.
   */
  public static generateSmsUrl(phoneNumber: string, message: string): string {
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const encoded = encodeURIComponent(message);
    return `sms:${cleanPhone}?body=${encoded}`;
  }

  /**
   * Generates a bulk SMS URL or formatted recipient list for mobile broadcast.
   */
  public static generateBulkSmsUrl(phoneNumbers: string[], message: string): string {
    const cleanPhones = phoneNumbers.map((p) => p.replace(/[\s\-\(\)]/g, '')).filter(Boolean);
    const encoded = encodeURIComponent(message);
    // Standard comma-separated or semicolon for mobile SMS apps
    return `sms:${cleanPhones.join(',')}?body=${encoded}`;
  }

  /**
   * Request browser/mobile push notification permission.
   */
  public static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  /**
   * Send a system notification if permission granted.
   */
  public static sendSystemNotification(title: string, options?: NotificationOptions): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          dir: 'rtl',
          lang: 'ar',
          ...options,
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public static generateLegalContractMessage(
    customer: Customer,
    sale: PhoneSale,
    settings: AppSettings
  ): string {
    const remaining = Math.max(0, sale.agreedPrice - sale.downPayment);
    return `*عقد بيع جوال بالتقسيط وحفظ حق الملكية*
*${settings.storeName}*
---------------------------------
الفريق الأول (البائع): ${settings.sellerFullName || settings.storeName}
الرقم الوطني: ${settings.sellerNationalId || '01050809123'}
القيد والخانة: ${settings.sellerRegistry || 'دمشق'}
هاتف: ${settings.storePhone}

الفريق الثاني (المشتري): ${customer.fullName}
الرقم الوطني: ${customer.nationalId}
العنوان: ${customer.address}
الهاتف: ${customer.phone}
${customer.guarantorName ? `الكفيل المتضامن: ${customer.guarantorName} (${customer.guarantorPhone || ''})` : ''}
---------------------------------
مواصفات الجهاز: *${sale.phoneName}*
رقم الـ IMEI: *${sale.imei}*
الثمن المتفق عليه: *${sale.agreedPrice} ${settings.currency}*
الدفعة الأولى المسددة: *${sale.downPayment} ${settings.currency}*
المبلغ المتبقي: *${remaining} ${settings.currency}*
مدة التقسيط: *${sale.termMonths} أشهر* (تاريخ البدء: ${sale.startDate})
---------------------------------
*الشروط القانونية وفق القانون السوري:*
1. سداد الأقساط شهرياً في المواعيد المحددة.
2. مهلة إغلاق الحساب 3 أشهر كحد أقصى، ويعتبر المشتري ناكلاً وتسقط كافة الآجال عند التأخر.
3. حق الملكية محفوظ للبائع حتى سداد كامل الثمن.
يمكنكم مراجعتنا لاستلام النسخة الورقية الموقعة. شكراً لتعاملكم.`;
  }
}
