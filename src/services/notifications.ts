/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhoneSale, Customer, AppSettings } from '../types';

export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static hasInitialized = false;

  /**
   * Initialize service worker registration for mobile background notifications.
   */
  public static async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    if (this.swRegistration) {
      return this.swRegistration;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      this.hasInitialized = true;
      return reg;
    } catch (e) {
      console.warn('Service worker registration failed:', e);
      return null;
    }
  }

  /**
   * Request notification permission directly upon user gesture.
   */
  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      await this.initServiceWorker();
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  /**
   * Check if notifications are enabled.
   */
  public static isPermissionGranted(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  /**
   * Trigger a persistent notification via Service Worker or Web Notification.
   */
  public static async notify(title: string, options?: NotificationOptions): Promise<boolean> {
    if (!this.isPermissionGranted()) {
      return false;
    }

    const defaultOptions: NotificationOptions & { vibrate?: number[] } = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
      ...options,
    };

    // Try service worker registration first (works in background on mobile Android)
    try {
      const reg = await this.initServiceWorker();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch (e) {
      console.warn('SW notification fallback to window Notification:', e);
    }

    // Fallback to standard window Notification
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch (e) {
      console.warn('Standard notification failed:', e);
      return false;
    }
  }

  /**
   * Scan for installments due today or overdue, and send real background alerts.
   */
  public static checkAndNotifyDueInstallments(
    sales: PhoneSale[],
    customers: Customer[],
    settings: AppSettings
  ): number {
    if (!this.isPermissionGranted()) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const dueTodayList: { sale: PhoneSale; customer?: Customer; amount: number; instNum: number }[] = [];
    const overdueList: { sale: PhoneSale; customer?: Customer; amount: number; instNum: number }[] = [];

    for (const sale of sales) {
      if (sale.status === 'completed') continue;
      const cust = customers.find((c) => c.id === sale.customerId);

      for (const inst of sale.installments) {
        const remainingOnInst = inst.amount - inst.paidAmount;
        if (remainingOnInst <= 0) continue;

        if (inst.dueDate === todayStr) {
          dueTodayList.push({
            sale,
            customer: cust,
            amount: remainingOnInst,
            instNum: inst.installmentNumber,
          });
        } else if (inst.dueDate < todayStr || inst.status === 'overdue') {
          overdueList.push({
            sale,
            customer: cust,
            amount: remainingOnInst,
            instNum: inst.installmentNumber,
          });
        }
      }
    }

    const totalAlerts = dueTodayList.length + overdueList.length;
    if (totalAlerts === 0) return 0;

    if (dueTodayList.length > 0) {
      const first = dueTodayList[0];
      const custName = first.customer?.fullName || 'الزبون';
      const title = `🔔 موعد قبض قسط اليوم (${settings.storeName})`;
      const body = dueTodayList.length === 1
        ? `يستحق اليوم قسط بقيمة ${first.amount} ${settings.currency} من ${custName} عن جهاز ${first.sale.phoneName}.`
        : `يوجد ${dueTodayList.length} أقساط مستحقة للقبض اليوم بإجمالي ${dueTodayList.reduce((acc, i) => acc + i.amount, 0)} ${settings.currency}.`;

      this.notify(title, { body, tag: `due-today-${todayStr}` });
    }

    if (overdueList.length > 0) {
      const title = `⚠️ تنبيه متأخرات أقساط الجوالات`;
      const body = `يوجد لديك ${overdueList.length} أقساط متأخرة تستوجب المتابعة عبر واتساب أو الاتصال.`;
      this.notify(title, { body, tag: `overdue-alert-${todayStr}` });
    }

    return totalAlerts;
  }
}
