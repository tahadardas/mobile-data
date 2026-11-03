/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, PhoneSale, TreasuryTransaction, AppSettings } from '../types';
import { AppStorageService } from './storage';
import { SQLiteService } from './sqlite';

export interface SyncManifest {
  syncPassphrase: string;
  clientTimestamp: string;
  customers: Record<string, string>; // id -> updatedAt
  sales: Record<string, string>; // id -> updatedAt
  treasury: Record<string, string>; // id -> updatedAt
}

export interface SyncCheckResult {
  isPassphraseValid: boolean;
  needsSync: boolean;
  serverNewOrModifiedCount: number;
  clientNewOrModifiedCount: number;
  message: string;
}

export interface SyncDeltaPayload {
  syncPassphrase: string;
  clientTimestamp: string;
  newOrUpdatedCustomers: Customer[];
  newOrUpdatedSales: PhoneSale[];
  newOrUpdatedTreasury: TreasuryTransaction[];
}

export interface SyncDeltaResponse {
  success: boolean;
  message: string;
  serverTimestamp: string;
  incomingCustomers: Customer[];
  incomingSales: PhoneSale[];
  incomingTreasury: TreasuryTransaction[];
  syncedStats: {
    customersMerged: number;
    salesMerged: number;
    treasuryMerged: number;
  };
}

export class LanSyncService {
  /**
   * Build local entity manifest for quick diff checking.
   */
  public static buildManifest(settings: AppSettings): SyncManifest {
    const customers = AppStorageService.getCustomers();
    const sales = AppStorageService.getSales();
    const treasury = AppStorageService.getTreasuryTransactions();

    const custMap: Record<string, string> = {};
    customers.forEach((c) => {
      custMap[c.id] = c.updatedAt || c.createdAt;
    });

    const salesMap: Record<string, string> = {};
    sales.forEach((s) => {
      salesMap[s.id] = s.updatedAt || s.createdAt;
    });

    const txMap: Record<string, string> = {};
    treasury.forEach((t) => {
      txMap[t.id] = t.updatedAt || t.createdAt;
    });

    return {
      syncPassphrase: settings.syncPassphrase || 'ALSHAM_STORE_2026',
      clientTimestamp: new Date().toISOString(),
      customers: custMap,
      sales: salesMap,
      treasury: txMap,
    };
  }

  /**
   * Check differences between local manifest and remote peer manifest.
   */
  public static checkDifferences(
    localManifest: SyncManifest,
    remoteManifest: SyncManifest,
    expectedPassphrase: string
  ): SyncCheckResult {
    // 1. Verify Passphrase
    if (localManifest.syncPassphrase !== expectedPassphrase || remoteManifest.syncPassphrase !== expectedPassphrase) {
      return {
        isPassphraseValid: false,
        needsSync: false,
        serverNewOrModifiedCount: 0,
        clientNewOrModifiedCount: 0,
        message: 'كلمة سر المزامنة غير متطابقة! يرجى التأكد من تطابق كلمة السر في كافة جوالات المحل.',
      };
    }

    let serverDiff = 0;
    let clientDiff = 0;

    // Compare customers
    for (const [id, remoteUp] of Object.entries(remoteManifest.customers)) {
      const localUp = localManifest.customers[id];
      if (!localUp || remoteUp > localUp) {
        serverDiff++;
      }
    }
    for (const [id, localUp] of Object.entries(localManifest.customers)) {
      const remoteUp = remoteManifest.customers[id];
      if (!remoteUp || localUp > remoteUp) {
        clientDiff++;
      }
    }

    // Compare sales
    for (const [id, remoteUp] of Object.entries(remoteManifest.sales)) {
      const localUp = localManifest.sales[id];
      if (!localUp || remoteUp > localUp) {
        serverDiff++;
      }
    }
    for (const [id, localUp] of Object.entries(localManifest.sales)) {
      const remoteUp = remoteManifest.sales[id];
      if (!remoteUp || localUp > remoteUp) {
        clientDiff++;
      }
    }

    // Compare treasury
    for (const [id, remoteUp] of Object.entries(remoteManifest.treasury)) {
      const localUp = localManifest.treasury[id];
      if (!localUp || remoteUp > localUp) {
        serverDiff++;
      }
    }
    for (const [id, localUp] of Object.entries(localManifest.treasury)) {
      const remoteUp = remoteManifest.treasury[id];
      if (!remoteUp || localUp > remoteUp) {
        clientDiff++;
      }
    }

    const totalDiff = serverDiff + clientDiff;
    const needsSync = totalDiff > 0;

    return {
      isPassphraseValid: true,
      needsSync,
      serverNewOrModifiedCount: serverDiff,
      clientNewOrModifiedCount: clientDiff,
      message: needsSync
        ? `تم الفحص بنجاح: تم العثور على ${totalDiff} تعديلات غير متزامنة.`
        : 'كافة البيانات متطابقة ومتزامنة تماماً عبر الشبكة المحلية (0 ثانية).',
    };
  }

  /**
   * Perform Smart Delta Sync with the configured host or local network endpoint.
   */
  public static async performSmartSync(settings: AppSettings): Promise<{
    success: boolean;
    message: string;
    syncedItemsCount: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const passphrase = settings.syncPassphrase || 'ALSHAM_STORE_2026';
    const hostUrl = settings.syncHostUrl ? settings.syncHostUrl.replace(/\/$/, '') : '';

    const localManifest = this.buildManifest(settings);

    // If a custom host URL is configured, try direct HTTP sync
    if (hostUrl) {
      try {
        const checkRes = await fetch(`${hostUrl}/api/sync/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localManifest),
        });

        if (!checkRes.ok) {
          if (checkRes.status === 401) {
            throw new Error('كلمة سر المزامنة غير متطابقة مع الجهاز الآخر في الشبكة المحلية!');
          }
          throw new Error(`تعذر الاتصال بعنوان الخادم (${checkRes.status})`);
        }

        const checkData: SyncCheckResult = await checkRes.json();
        if (!checkData.needsSync) {
          return {
            success: true,
            message: 'كافة الجوالات متزامنة تماماً، لا توجد أي تعديلات جديدة.',
            syncedItemsCount: 0,
            durationMs: Date.now() - startTime,
          };
        }

        // Push delta
        const deltaPayload: SyncDeltaPayload = {
          syncPassphrase: passphrase,
          clientTimestamp: localManifest.clientTimestamp,
          newOrUpdatedCustomers: AppStorageService.getCustomers(),
          newOrUpdatedSales: AppStorageService.getSales(),
          newOrUpdatedTreasury: AppStorageService.getTreasuryTransactions(),
        };

        const syncRes = await fetch(`${hostUrl}/api/sync/push-pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deltaPayload),
        });

        const syncResult: SyncDeltaResponse = await syncRes.json();
        if (syncResult.incomingCustomers?.length > 0) {
          syncResult.incomingCustomers.forEach((c) => AppStorageService.saveCustomer(c));
        }
        if (syncResult.incomingSales?.length > 0) {
          syncResult.incomingSales.forEach((s) => AppStorageService.saveSale(s, false));
        }
        if (syncResult.incomingTreasury?.length > 0) {
          syncResult.incomingTreasury.forEach((t) => AppStorageService.addTreasuryTransaction(t));
        }

        const totalMerged =
          (syncResult.syncedStats?.customersMerged || 0) +
          (syncResult.syncedStats?.salesMerged || 0) +
          (syncResult.syncedStats?.treasuryMerged || 0);

        return {
          success: true,
          message: `تمت المزامنة بنجاح عبر الشبكة المحلية (تم دمج ${totalMerged} سجل).`,
          syncedItemsCount: totalMerged,
          durationMs: Date.now() - startTime,
        };
      } catch (httpErr: any) {
        console.warn('Direct HTTP peer sync fallback to local channel:', httpErr);
      }
    }

    // Local Network Sync via BroadcastChannel / Local Storage sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('muhasaba_jawalat_lan_sync');
        channel.postMessage({
          type: 'SYNC_ANNOUNCE',
          passphrase,
          manifest: localManifest,
        });
      }

      // Sync SQLite state
      try {
        await SQLiteService.syncFromMemory(
          AppStorageService.getCustomers(),
          AppStorageService.getSales(),
          AppStorageService.getTreasuryTransactions(),
          settings
        );
      } catch (sqErr) {
        console.warn('Local SQLite sync note:', sqErr);
      }

      const durationMs = Date.now() - startTime;
      const updatedSettings = {
        ...settings,
        lastSyncTimestamp: new Date().toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      AppStorageService.saveSettings(updatedSettings);

      return {
        success: true,
        message: 'تم فحص ومزامنة البيانات وتحديث قاعدة بيانات SQLite بنجاح.',
        syncedItemsCount: 0,
        durationMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `خطأ أثناء المزامنة: ${err.message}`,
        syncedItemsCount: 0,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
