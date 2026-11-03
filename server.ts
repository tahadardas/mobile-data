/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists for SQLite database file
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'database.sqlite');
const db = new Database(DB_PATH);

// Configure SQLite for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema on server SQLite database
db.exec(`
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
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
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

  CREATE INDEX IF NOT EXISTS idx_srv_sales_cust ON sales(customer_id);
  CREATE INDEX IF NOT EXISTS idx_srv_inst_sale ON installments(sale_id);
  CREATE INDEX IF NOT EXISTS idx_srv_tx_date ON treasury(date);
`);

console.log('✓ SQLite database connected at:', DB_PATH);

// Helper to get or set sync passphrase on server
function getServerSyncPassphrase(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('syncPassphrase') as { value: string } | undefined;
  return row?.value || 'ALSHAM_STORE_2026';
}

// -------------------------------------------------------------
// API Endpoints for SQLite and Smart Local Network (LAN) Sync
// -------------------------------------------------------------

// 1. Health check & local network IP detection info
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'محاسبة جوالات - خادم المزامنة المحلي',
    sqlitePath: DB_PATH,
    timestamp: new Date().toISOString(),
  });
});

// 2. Download raw SQLite database file directly
app.get('/api/sqlite/download', (req: Request, res: Response) => {
  if (fs.existsSync(DB_PATH)) {
    res.download(DB_PATH, 'محاسبة_جوالات_الرئيسية.sqlite');
  } else {
    res.status(404).json({ error: 'ملف قاعدة بيانات SQLite غير موجود بعد' });
  }
});

// Serve WASM binaries with proper MIME type
app.get('/*.wasm', (req: Request, res: Response) => {
  const fileName = path.basename(req.path);
  const publicPath = path.join(__dirname, 'public', fileName);
  const distPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist', fileName);
  if (fs.existsSync(publicPath)) {
    res.type('application/wasm');
    res.sendFile(publicPath);
    return;
  }
  if (fs.existsSync(distPath)) {
    res.type('application/wasm');
    res.sendFile(distPath);
    return;
  }
  res.status(404).send('WASM file not found');
});

// 3. SQLite statistics & status
app.get('/api/sqlite/stats', (req: Request, res: Response) => {
  try {
    const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
    const instCount = db.prepare('SELECT COUNT(*) as count FROM installments').get() as { count: number };
    const txCount = db.prepare('SELECT COUNT(*) as count FROM treasury').get() as { count: number };
    const fileSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;

    res.json({
      customers: custCount.count,
      sales: salesCount.count,
      installments: instCount.count,
      treasury: txCount.count,
      fileSizeBytes: fileSize,
      dbPath: DB_PATH,
      sqliteEngine: 'Better-SQLite3 (Native Storage)',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Quick Smart Check endpoint (Verifies passphrase & identifies diffs in milliseconds)
app.post('/api/sync/check', (req: Request, res: Response) => {
  const { syncPassphrase, customers: clientCustMap = {}, sales: clientSalesMap = {}, treasury: clientTxMap = {} } = req.body;
  const expected = getServerSyncPassphrase();

  if (syncPassphrase !== expected) {
    res.status(401).json({
      isPassphraseValid: false,
      needsSync: false,
      message: 'كلمة سر المزامنة غير متطابقة! يرجى التأكد من كلمة السر في الإعدادات.',
    });
    return;
  }

  // Read server timestamps
  const serverCustRows = db.prepare('SELECT id, updated_at FROM customers').all() as { id: string; updated_at: string }[];
  const serverSalesRows = db.prepare('SELECT id, updated_at FROM sales').all() as { id: string; updated_at: string }[];
  const serverTxRows = db.prepare('SELECT id, updated_at FROM treasury').all() as { id: string; updated_at: string }[];

  const serverCustMap: Record<string, string> = {};
  serverCustRows.forEach((r) => { serverCustMap[r.id] = r.updated_at; });

  const serverSalesMap: Record<string, string> = {};
  serverSalesRows.forEach((r) => { serverSalesMap[r.id] = r.updated_at; });

  const serverTxMap: Record<string, string> = {};
  serverTxRows.forEach((r) => { serverTxMap[r.id] = r.updated_at; });

  let serverDiff = 0;
  let clientDiff = 0;

  // Check Customers
  for (const [id, up] of Object.entries(serverCustMap)) {
    if (!clientCustMap[id] || up > clientCustMap[id]) serverDiff++;
  }
  for (const [id, up] of Object.entries(clientCustMap as Record<string, string>)) {
    if (!serverCustMap[id] || up > serverCustMap[id]) clientDiff++;
  }

  // Check Sales
  for (const [id, up] of Object.entries(serverSalesMap)) {
    if (!clientSalesMap[id] || up > clientSalesMap[id]) serverDiff++;
  }
  for (const [id, up] of Object.entries(clientSalesMap as Record<string, string>)) {
    if (!serverSalesMap[id] || up > serverSalesMap[id]) clientDiff++;
  }

  // Check Treasury
  for (const [id, up] of Object.entries(serverTxMap)) {
    if (!clientTxMap[id] || up > clientTxMap[id]) serverDiff++;
  }
  for (const [id, up] of Object.entries(clientTxMap as Record<string, string>)) {
    if (!serverTxMap[id] || up > serverTxMap[id]) clientDiff++;
  }

  const needsSync = (serverDiff + clientDiff) > 0;

  res.json({
    isPassphraseValid: true,
    needsSync,
    serverNewOrModifiedCount: serverDiff,
    clientNewOrModifiedCount: clientDiff,
    message: needsSync
      ? `يوجد ${serverDiff + clientDiff} عناصر غير متزامنة.`
      : 'كافة البيانات متزامنة تماماً عبر الشبكة المحلية.',
  });
});

// 5. Smart Delta Push-Pull Sync (Merges client delta & returns server delta)
app.post('/api/sync/push-pull', (req: Request, res: Response) => {
  const { syncPassphrase, newOrUpdatedCustomers = [], newOrUpdatedSales = [], newOrUpdatedTreasury = [] } = req.body;
  const expected = getServerSyncPassphrase();

  if (syncPassphrase !== expected) {
    res.status(401).json({ success: false, message: 'كلمة سر المزامنة غير متطابقة!' });
    return;
  }

  const now = new Date().toISOString();
  let customersMerged = 0;
  let salesMerged = 0;
  let treasuryMerged = 0;

  const mergeTx = db.transaction(() => {
    // 1. Merge incoming Customers
    const upsertCust = db.prepare(`
      INSERT INTO customers (id, full_name, national_id, phone, address, work_place, guarantor_name, guarantor_phone, id_photos_json, notes, created_at, updated_at)
      VALUES (@id, @full_name, @national_id, @phone, @address, @work_place, @guarantor_name, @guarantor_phone, @id_photos_json, @notes, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        national_id = excluded.national_id,
        phone = excluded.phone,
        address = excluded.address,
        work_place = excluded.work_place,
        guarantor_name = excluded.guarantor_name,
        guarantor_phone = excluded.guarantor_phone,
        id_photos_json = excluded.id_photos_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= customers.updated_at
    `);

    for (const c of newOrUpdatedCustomers) {
      upsertCust.run({
        id: c.id,
        full_name: c.fullName,
        national_id: c.nationalId,
        phone: c.phone,
        address: c.address,
        work_place: c.workPlace || null,
        guarantor_name: c.guarantorName || null,
        guarantor_phone: c.guarantorPhone || null,
        id_photos_json: JSON.stringify(c.idPhotos || {}),
        notes: c.notes || null,
        created_at: c.createdAt || now,
        updated_at: c.updatedAt || c.createdAt || now,
      });
      customersMerged++;
    }

    // 2. Merge incoming Sales & Installments
    const upsertSale = db.prepare(`
      INSERT INTO sales (id, customer_id, phone_name, imei, purchase_price, agreed_price, down_payment, term_months, start_date, status, notes, created_at, updated_at)
      VALUES (@id, @customer_id, @phone_name, @imei, @purchase_price, @agreed_price, @down_payment, @term_months, @start_date, @status, @notes, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        phone_name = excluded.phone_name,
        imei = excluded.imei,
        purchase_price = excluded.purchase_price,
        agreed_price = excluded.agreed_price,
        down_payment = excluded.down_payment,
        term_months = excluded.term_months,
        start_date = excluded.start_date,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= sales.updated_at
    `);

    const upsertInst = db.prepare(`
      INSERT INTO installments (id, sale_id, installment_number, due_date, amount, paid_amount, paid_date, status, receipt_number, notes, updated_at)
      VALUES (@id, @sale_id, @installment_number, @due_date, @amount, @paid_amount, @paid_date, @status, @receipt_number, @notes, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        amount = excluded.amount,
        paid_amount = excluded.paid_amount,
        paid_date = excluded.paid_date,
        status = excluded.status,
        receipt_number = excluded.receipt_number,
        notes = excluded.notes,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= installments.updated_at
    `);

    for (const s of newOrUpdatedSales) {
      upsertSale.run({
        id: s.id,
        customer_id: s.customerId,
        phone_name: s.phoneName,
        imei: s.imei,
        purchase_price: s.purchasePrice,
        agreed_price: s.agreedPrice,
        down_payment: s.downPayment,
        term_months: s.termMonths,
        start_date: s.startDate,
        status: s.status,
        notes: s.notes || null,
        created_at: s.createdAt || now,
        updated_at: s.updatedAt || s.createdAt || now,
      });
      salesMerged++;

      for (const inst of s.installments || []) {
        upsertInst.run({
          id: inst.id,
          sale_id: s.id,
          installment_number: inst.installmentNumber,
          due_date: inst.dueDate,
          amount: inst.amount,
          paid_amount: inst.paidAmount,
          paid_date: inst.paidDate || null,
          status: inst.status,
          receipt_number: inst.receiptNumber || null,
          notes: inst.notes || null,
          updated_at: inst.updatedAt || now,
        });
      }
    }

    // 3. Merge incoming Treasury
    const upsertTx = db.prepare(`
      INSERT INTO treasury (id, type, amount, description, date, category, reference_sale_id, reference_installment_id, reference_customer_name, created_at, updated_at)
      VALUES (@id, @type, @amount, @description, @date, @category, @reference_sale_id, @reference_installment_id, @reference_customer_name, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        amount = excluded.amount,
        description = excluded.description,
        date = excluded.date,
        category = excluded.category,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= treasury.updated_at
    `);

    for (const t of newOrUpdatedTreasury) {
      upsertTx.run({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date,
        category: t.category,
        reference_sale_id: t.referenceSaleId || null,
        reference_installment_id: t.referenceInstallmentId || null,
        reference_customer_name: t.referenceCustomerName || null,
        created_at: t.createdAt || now,
        updated_at: t.updatedAt || t.createdAt || now,
      });
      treasuryMerged++;
    }
  });

  mergeTx();

  // Read full current server records to send back any items the client didn't have
  const allCustRows = db.prepare('SELECT * FROM customers').all() as any[];
  const allSalesRows = db.prepare('SELECT * FROM sales').all() as any[];
  const allInstRows = db.prepare('SELECT * FROM installments').all() as any[];
  const allTxRows = db.prepare('SELECT * FROM treasury').all() as any[];

  // Format back into client types
  const incomingCustomers = allCustRows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    nationalId: r.national_id,
    phone: r.phone,
    address: r.address,
    workPlace: r.work_place || '',
    guarantorName: r.guarantor_name || '',
    guarantorPhone: r.guarantor_phone || '',
    idPhotos: r.id_photos_json ? JSON.parse(r.id_photos_json) : { frontUrl: '', backUrl: '' },
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const incomingSales = allSalesRows.map((s) => {
    const saleInsts = allInstRows
      .filter((i) => i.sale_id === s.id)
      .map((i) => ({
        id: i.id,
        saleId: i.sale_id,
        installmentNumber: i.installment_number,
        dueDate: i.due_date,
        amount: i.amount,
        paidAmount: i.paid_amount,
        paidDate: i.paid_date || '',
        status: i.status,
        receiptNumber: i.receipt_number || '',
        notes: i.notes || '',
        updatedAt: i.updated_at,
      }));

    return {
      id: s.id,
      customerId: s.customer_id,
      phoneName: s.phone_name,
      imei: s.imei,
      purchasePrice: s.purchase_price,
      agreedPrice: s.agreed_price,
      downPayment: s.down_payment,
      termMonths: s.term_months,
      startDate: s.start_date,
      status: s.status,
      notes: s.notes || '',
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      installments: saleInsts,
    };
  });

  const incomingTreasury = allTxRows.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    date: t.date,
    category: t.category,
    referenceSaleId: t.reference_sale_id || '',
    referenceInstallmentId: t.reference_installment_id || '',
    referenceCustomerName: t.reference_customer_name || '',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  res.json({
    success: true,
    message: 'تمت المزامنة الذكية بنجاح وتحديث قاعدة بيانات SQLite.',
    serverTimestamp: now,
    incomingCustomers,
    incomingSales,
    incomingTreasury,
    syncedStats: {
      customersMerged,
      salesMerged,
      treasuryMerged,
    },
  });
});

// -------------------------------------------------------------
// Vite Dev Server / Static Hosting
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 محاسبة جوالات تعمل بنجاح على: http://localhost:${PORT}`);
    console.log(`🔗 خادم المزامنة المحلي وقاعدة بيانات SQLite جاهزة على المنفذ: ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
