/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import initSqlJs, { Database } from 'sql.js';
import { Customer, PhoneSale, InstallmentRecord, TreasuryTransaction, AppSettings } from '../types';

const SQLITE_STORAGE_KEY = 'mj_sqlite_binary_v2';

export class SQLiteService {
  private static db: Database | null = null;
  private static initPromise: Promise<Database> | null = null;

  /**
   * Initialize SQL.js WASM SQLite engine.
   */
  public static async getDatabase(): Promise<Database> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const SQL = await initSqlJs({
          // Load wasm from local public/ folder
          locateFile: (file: string) => `/${file}`,
        });

        // Check if there is an existing SQLite binary stored in localStorage
        let existingBinary: Uint8Array | null = null;
        try {
          const stored = localStorage.getItem(SQLITE_STORAGE_KEY);
          if (stored) {
            const binaryString = atob(stored);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            existingBinary = bytes;
          }
        } catch (e) {
          console.warn('Could not read existing binary SQLite, initializing clean schema:', e);
        }

        const database = existingBinary ? new SQL.Database(existingBinary) : new SQL.Database();
        this.db = database;
        this.createSchema(database);
        return database;
      } catch (err) {
        console.warn('Fallback to in-memory clean SQL engine:', err);
        const SQL = await initSqlJs({});
        const database = new SQL.Database();
        this.db = database;
        this.createSchema(database);
        return database;
      }
    })();

    return this.initPromise;
  }

  /**
   * Create standard normalized relational tables in SQLite.
   */
  private static createSchema(db: Database): void {
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        national_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        work_place TEXT,
        guarantor_name TEXT,
        guarantor_phone TEXT,
        id_photos_json TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        phone_name TEXT NOT NULL,
        imei TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        agreed_price REAL NOT NULL,
        down_payment REAL NOT NULL,
        term_months INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS installments (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        installment_number INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_amount REAL NOT NULL,
        paid_date TEXT,
        status TEXT NOT NULL,
        receipt_number TEXT,
        notes TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS treasury (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        reference_sale_id TEXT,
        reference_installment_id TEXT,
        reference_customer_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_time TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sales_cust ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_inst_sale ON installments(sale_id);
      CREATE INDEX IF NOT EXISTS idx_treasury_date ON treasury(date);
    `);
  }

  /**
   * Persist current in-memory SQLite database into binary storage.
   */
  public static async persistDatabase(): Promise<void> {
    try {
      const db = await this.getDatabase();
      const binary = db.export();
      let binaryString = '';
      for (let i = 0; i < binary.length; i++) {
        binaryString += String.fromCharCode(binary[i]);
      }
      localStorage.setItem(SQLITE_STORAGE_KEY, btoa(binaryString));
    } catch (e) {
      console.warn('Failed to persist SQLite binary:', e);
    }
  }

  /**
   * Export the actual SQLite binary database file for download or inspection.
   */
  public static async exportSqliteBinary(): Promise<Uint8Array> {
    const db = await this.getDatabase();
    return db.export();
  }

  /**
   * Trigger direct download of the real SQLite file (.sqlite).
   */
  public static async downloadSqliteFile(fileName = 'محاسبة_جوالات.sqlite'): Promise<void> {
    const binary = await this.exportSqliteBinary();
    const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Sync complete dataset into SQLite tables.
   */
  public static async syncFromMemory(
    customers: Customer[],
    sales: PhoneSale[],
    treasury: TreasuryTransaction[],
    settings: AppSettings
  ): Promise<void> {
    const db = await this.getDatabase();
    const now = new Date().toISOString();

    db.run('BEGIN TRANSACTION;');
    try {
      // 1. Clear existing rows
      db.run('DELETE FROM installments;');
      db.run('DELETE FROM sales;');
      db.run('DELETE FROM customers;');
      db.run('DELETE FROM treasury;');
      db.run('DELETE FROM settings;');

      // 2. Insert Customers
      const stmtCust = db.prepare(`
        INSERT INTO customers (id, full_name, national_id, phone, address, work_place, guarantor_name, guarantor_phone, id_photos_json, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of customers) {
        stmtCust.run([
          c.id,
          c.fullName,
          c.nationalId,
          c.phone,
          c.address,
          c.workPlace || null,
          c.guarantorName || null,
          c.guarantorPhone || null,
          JSON.stringify(c.idPhotos || {}),
          c.notes || null,
          c.createdAt || now,
          c.updatedAt || c.createdAt || now,
        ]);
      }
      stmtCust.free();

      // 3. Insert Sales & Installments
      const stmtSale = db.prepare(`
        INSERT INTO sales (id, customer_id, phone_name, imei, purchase_price, agreed_price, down_payment, term_months, start_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const stmtInst = db.prepare(`
        INSERT INTO installments (id, sale_id, installment_number, due_date, amount, paid_amount, paid_date, status, receipt_number, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const s of sales) {
        stmtSale.run([
          s.id,
          s.customerId,
          s.phoneName,
          s.imei,
          s.purchasePrice,
          s.agreedPrice,
          s.downPayment,
          s.termMonths,
          s.startDate,
          s.status,
          s.notes || null,
          s.createdAt || now,
          s.updatedAt || s.createdAt || now,
        ]);

        for (const inst of s.installments) {
          stmtInst.run([
            inst.id,
            s.id,
            inst.installmentNumber,
            inst.dueDate,
            inst.amount,
            inst.paidAmount,
            inst.paidDate || null,
            inst.status,
            inst.receiptNumber || null,
            inst.notes || null,
            inst.updatedAt || now,
          ]);
        }
      }
      stmtSale.free();
      stmtInst.free();

      // 4. Insert Treasury
      const stmtTx = db.prepare(`
        INSERT INTO treasury (id, type, amount, description, date, category, reference_sale_id, reference_installment_id, reference_customer_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of treasury) {
        stmtTx.run([
          t.id,
          t.type,
          t.amount,
          t.description,
          t.date,
          t.category,
          t.referenceSaleId || null,
          t.referenceInstallmentId || null,
          t.referenceCustomerName || null,
          t.createdAt || now,
          t.updatedAt || t.createdAt || now,
        ]);
      }
      stmtTx.free();

      // 5. Settings
      const stmtSet = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      for (const [k, v] of Object.entries(settings)) {
        stmtSet.run([k, typeof v === 'object' ? JSON.stringify(v) : String(v)]);
      }
      stmtSet.free();

      db.run('COMMIT;');
      await this.persistDatabase();
    } catch (err) {
      db.run('ROLLBACK;');
      console.error('Error committing to SQLite:', err);
    }
  }

  /**
   * Get SQLite metadata and stats.
   */
  public static async getStats(): Promise<{
    customerCount: number;
    saleCount: number;
    installmentCount: number;
    treasuryCount: number;
    sqliteEngine: string;
  }> {
    try {
      const db = await this.getDatabase();
      const custRes = db.exec('SELECT COUNT(*) FROM customers');
      const saleRes = db.exec('SELECT COUNT(*) FROM sales');
      const instRes = db.exec('SELECT COUNT(*) FROM installments');
      const txRes = db.exec('SELECT COUNT(*) FROM treasury');

      return {
        customerCount: (custRes[0]?.values[0]?.[0] as number) || 0,
        saleCount: (saleRes[0]?.values[0]?.[0] as number) || 0,
        installmentCount: (instRes[0]?.values[0]?.[0] as number) || 0,
        treasuryCount: (txRes[0]?.values[0]?.[0] as number) || 0,
        sqliteEngine: 'SQLite 3.x (WebAssembly Relational Engine)',
      };
    } catch {
      return {
        customerCount: 0,
        saleCount: 0,
        installmentCount: 0,
        treasuryCount: 0,
        sqliteEngine: 'SQLite 3.x (WASM)',
      };
    }
  }
}
