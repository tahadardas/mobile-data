/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AlertsView } from './components/AlertsView';
import { DashboardView } from './components/DashboardView';
import { SalesView } from './components/SalesView';
import { TreasuryView } from './components/TreasuryView';
import { ProfitReportView } from './components/ProfitReportView';
import { CustomersView } from './components/CustomersView';
import { BackupView } from './components/BackupView';

// Modals
import { NewSaleModal } from './components/modals/NewSaleModal';
import { NewCustomerModal } from './components/modals/NewCustomerModal';
import { PaymentModal } from './components/modals/PaymentModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { SyrianIdModal } from './components/modals/SyrianIdModal';
import { UniversalSearchModal } from './components/modals/UniversalSearchModal';
import { LegalContractModal } from './components/modals/LegalContractModal';

import { AppStorageService } from './services/storage';
import { NotificationService } from './services/notifications';
import { SQLiteService } from './services/sqlite';
import { Customer, PhoneSale, TreasuryTransaction, AppSettings, InstallmentRecord } from './types';
import { Database, Download, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // App State
  const [settings, setSettings] = useState<AppSettings>(() => AppStorageService.getSettings());
  const [customers, setCustomers] = useState<Customer[]>(() => AppStorageService.getCustomers());
  const [sales, setSales] = useState<PhoneSale[]>(() => AppStorageService.getSales());
  const [treasury, setTreasury] = useState<TreasuryTransaction[]>(() => AppStorageService.getTreasuryTransactions());

  // Modals & Selected items
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Payment Modal
  const [selectedPayment, setSelectedPayment] = useState<{
    sale: PhoneSale;
    installment: InstallmentRecord;
  } | null>(null);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<{
    sale: PhoneSale;
    installment: InstallmentRecord | null;
    paidAmount?: number;
    receiptNumber?: string;
  } | null>(null);

  // Syrian ID Modal
  const [selectedCustomerForId, setSelectedCustomerForId] = useState<Customer | null>(null);

  // Legal Contract Modal
  const [selectedContractSale, setSelectedContractSale] = useState<PhoneSale | null>(null);

  // Daily backup alert check
  const [showDailyBackupPrompt, setShowDailyBackupPrompt] = useState(false);

  // Reload data from storage and sync into SQLite
  const reloadData = () => {
    AppStorageService.refreshSalesStatuses();
    const currentCustomers = AppStorageService.getCustomers();
    const currentSales = AppStorageService.getSales();
    const currentTreasury = AppStorageService.getTreasuryTransactions();
    const currentSettings = AppStorageService.getSettings();

    setCustomers(currentCustomers);
    setSales(currentSales);
    setTreasury(currentTreasury);
    setSettings(currentSettings);

    // Continuous SQLite relational synchronization
    SQLiteService.syncFromMemory(currentCustomers, currentSales, currentTreasury, currentSettings).catch((err) => {
      console.warn('SQLite background sync:', err);
    });
  };

  useEffect(() => {
    reloadData();

    // Initialize Service Worker for background notifications and check due installments
    NotificationService.initServiceWorker().then(() => {
      const currentSales = AppStorageService.getSales();
      const currentCustomers = AppStorageService.getCustomers();
      const currentSettings = AppStorageService.getSettings();
      NotificationService.checkAndNotifyDueInstallments(currentSales, currentCustomers, currentSettings);
    });

    // Check if daily backup is needed
    const currentSettings = AppStorageService.getSettings();
    const today = new Date().toISOString().split('T')[0];
    if (currentSettings.autoBackupDaily && currentSettings.lastBackupDate !== today) {
      setShowDailyBackupPrompt(true);
    }
  }, []);

  // Alert counts
  const overdueCount = sales.reduce((count, s) => {
    if (s.status === 'completed') return count;
    return count + s.installments.filter((i) => i.status === 'overdue').length;
  }, 0);

  const breachedCount = sales.filter((s) => s.status === 'breached_term').length;

  // Handlers
  const handleSaveSale = (sale: PhoneSale) => {
    AppStorageService.saveSale(sale, true);
    reloadData();
    setSelectedContractSale(sale);
  };

  const handleSaveCustomer = (customer: Customer) => {
    AppStorageService.saveCustomer(customer);
    reloadData();
  };

  const handleDeleteCustomer = (id: string) => {
    AppStorageService.deleteCustomer(id);
    reloadData();
  };

  const handlePayInstallment = (sale: PhoneSale, inst: InstallmentRecord) => {
    setSelectedPayment({ sale, installment: inst });
  };

  const handleConfirmPayment = (
    saleId: string,
    installmentId: string,
    amount: number,
    date: string,
    receiptNo: string,
    notes?: string
  ) => {
    AppStorageService.recordInstallmentPayment(
      saleId,
      installmentId,
      amount,
      date,
      receiptNo,
      notes
    );
    reloadData();
  };

  const handleAddTreasuryTransaction = (tx: TreasuryTransaction) => {
    AppStorageService.addTreasuryTransaction(tx);
    reloadData();
  };

  const handleDeleteTreasuryTransaction = (id: string) => {
    AppStorageService.deleteTreasuryTransaction(id);
    reloadData();
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    AppStorageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleQuickBackup = async () => {
    try {
      const { zipBlob, fileName } = await AppStorageService.createCompressedBackup();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowDailyBackupPrompt(false);
      reloadData();
      alert(`تم تحميل النسخة الاحتياطية اليومية بنجاح إلى مجلد محاسبة جوالات: ${fileName}`);
    } catch (e: any) {
      alert(`فشل التصدير: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white font-['Cairo',sans-serif]">
      {/* Top Header */}
      <Header
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overdueCount={overdueCount}
        breachedCount={breachedCount}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAlerts={() => {
          setActiveTab('alerts');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        
        {/* Daily Backup Reminder Alert */}
        {showDailyBackupPrompt && (
          <div className="mb-5 p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/30 text-cyan-300 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  تذكير النسخ الاحتياطي اليومي - مجلد محاسبة جوالات
                </h4>
                <p className="text-xs text-cyan-200/80 mt-0.5">
                  احفظ بياناتك اليومية من عقود وزبائن وصندوق في نسخة مضغوطة لحمايتها من الفقدان
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleQuickBackup}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>أخذ نسخة يومية الآن</span>
              </button>
              <button
                onClick={() => setShowDailyBackupPrompt(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            sales={sales}
            customers={customers}
            treasury={treasury}
            settings={settings}
            onOpenNewSale={() => setIsNewSaleOpen(true)}
            onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onPayInstallment={handlePayInstallment}
          />
        )}

        {/* Dedicated Alerts & Follow-up Page (Shows only when tab is selected or alert button clicked) */}
        {activeTab === 'alerts' && (
          <AlertsView
            sales={sales}
            customers={customers}
            settings={settings}
            onPayInstallment={handlePayInstallment}
            onViewContract={(sale) => setSelectedContractSale(sale)}
          />
        )}

        {activeTab === 'sales' && (
          <SalesView
            sales={sales}
            customers={customers}
            settings={settings}
            onPayInstallment={handlePayInstallment}
            onOpenNewSale={() => setIsNewSaleOpen(true)}
            onViewContract={(sale) => setSelectedContractSale(sale)}
          />
        )}

        {activeTab === 'treasury' && (
          <TreasuryView
            transactions={treasury}
            settings={settings}
            onAddTransaction={handleAddTreasuryTransaction}
            onDeleteTransaction={handleDeleteTreasuryTransaction}
          />
        )}

        {activeTab === 'profits' && (
          <ProfitReportView
            sales={sales}
            treasury={treasury}
            customers={customers}
            settings={settings}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            sales={sales}
            settings={settings}
            onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
            onViewIdPhotos={(c) => setSelectedCustomerForId(c)}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}

        {activeTab === 'backup' && (
          <BackupView
            settings={settings}
            customers={customers}
            sales={sales}
            treasury={treasury}
            onSaveSettings={handleSaveSettings}
            onRestoreData={reloadData}
          />
        )}
      </main>

      {/* Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        customers={customers}
        settings={settings}
        onSaveSale={handleSaveSale}
        onOpenNewCustomer={() => {
          setIsNewSaleOpen(false);
          setIsNewCustomerOpen(true);
        }}
      />

      <NewCustomerModal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        onSaveCustomer={handleSaveCustomer}
      />

      <PaymentModal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        sale={selectedPayment?.sale || null}
        installment={selectedPayment?.installment || null}
        customer={customers.find((c) => c.id === selectedPayment?.sale.customerId)}
        settings={settings}
        onConfirmPayment={handleConfirmPayment}
        onOpenReceipt={(sale, inst, paidAmount, receiptNo) => {
          setSelectedReceipt({
            sale,
            installment: inst,
            paidAmount,
            receiptNumber: receiptNo,
          });
        }}
      />

      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        sale={selectedReceipt?.sale || null}
        installment={selectedReceipt?.installment || null}
        customer={customers.find((c) => c.id === selectedReceipt?.sale.customerId)}
        settings={settings}
        paidAmount={selectedReceipt?.paidAmount}
        receiptNumber={selectedReceipt?.receiptNumber}
      />

      <SyrianIdModal
        isOpen={!!selectedCustomerForId}
        onClose={() => setSelectedCustomerForId(null)}
        customer={selectedCustomerForId}
      />

      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        customers={customers}
        sales={sales}
        treasury={treasury}
        settings={settings}
        onSelectSale={(s) => {
          setActiveTab('sales');
          setSelectedContractSale(s);
        }}
        onSelectCustomer={(c) => {
          setActiveTab('customers');
          setSelectedCustomerForId(c);
        }}
      />

      {/* Syrian Legal Installment Contract PDF Modal */}
      <LegalContractModal
        isOpen={!!selectedContractSale}
        onClose={() => setSelectedContractSale(null)}
        sale={selectedContractSale}
        customer={customers.find((c) => c.id === selectedContractSale?.customerId)}
        settings={settings}
      />
    </div>
  );
}
