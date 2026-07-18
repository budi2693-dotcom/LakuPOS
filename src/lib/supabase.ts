/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, DatabaseConfig, StaffAccount, Transaction, Customer } from '../types';

const CONFIG_KEY = 'stitch_db_config';

// Load default configuration from environment or local storage
export function loadDbConfig(): DatabaseConfig {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Ignore parse error
    }
  }

  // Fallback to Vite environment variables if available
  const envUrl = (
    ((import.meta as any).env.VITE_SUPABASE_URL) || 
    ((import.meta as any).env.SUPABASE_URL) || 
    (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : '') || 
    (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : '') || 
    ''
  ) as string;

  const envKey = (
    ((import.meta as any).env.VITE_SUPABASE_ANON_KEY) || 
    ((import.meta as any).env.SUPABASE_ANON_KEY) || 
    (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : '') || 
    (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_ANON_KEY : '') || 
    ''
  ) as string;

  return {
    supabaseUrl: envUrl,
    supabaseAnonKey: envKey,
    mode: envUrl && envKey ? 'supabase' : 'local',
  };
}

export function saveDbConfig(config: DatabaseConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Get initialized Supabase client if configured
let activeClient: SupabaseClient | null = null;
let currentConfig: DatabaseConfig | null = null;

export function getSupabaseClient(config?: DatabaseConfig): SupabaseClient | null {
  const cfg = config || loadDbConfig();
  
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || cfg.mode !== 'supabase') {
    activeClient = null;
    return null;
  }

  // Reuse existing client if configuration hasn't changed
  if (
    activeClient &&
    currentConfig &&
    currentConfig.supabaseUrl === cfg.supabaseUrl &&
    currentConfig.supabaseAnonKey === cfg.supabaseAnonKey
  ) {
    return activeClient;
  }

  try {
    activeClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: false },
    });
    currentConfig = { ...cfg };
    return activeClient;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

// SQL query needed to set up Supabase table
export const SUPABASE_SETUP_SQL = `-- SCRIPT PEMBUATAN TABEL UNTUK SUPABASE (VERSI TERBARU)
-- Masuk ke Supabase Dashboard -> SQL Editor -> New Query, lalu salin dan jalankan script ini:

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 10,
    price_buy NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    price_sell NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    price_sell_member NUMERIC(12, 2) DEFAULT 0.00,
    price_sell_grosir NUMERIC(12, 2) DEFAULT 0.00,
    price_sell_agen NUMERIC(12, 2) DEFAULT 0.00,
    product_type VARCHAR(50) DEFAULT 'physical',
    use_stock BOOLEAN DEFAULT true,
    units JSONB DEFAULT '[]'::jsonb,
    bundle_items JSONB DEFAULT '[]'::jsonb,
    price_tiers JSONB DEFAULT '[]'::jsonb,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(10) DEFAULT '%',
    show_in_transaction BOOLEAN DEFAULT true,
    location VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Akun Staf (Owner / Kasir)
CREATE TABLE IF NOT EXISTS public.staff_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'kasir',
    fullname VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Transaksi Penjualan
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoiceNumber VARCHAR(255) UNIQUE NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    totalItems INTEGER NOT NULL DEFAULT 0,
    totalAmount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amountPaid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    changeAmount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paymentMethod VARCHAR(50) NOT NULL,
    customerType VARCHAR(50) NOT NULL,
    customerName VARCHAR(255),
    discountTotal NUMERIC(12, 2) DEFAULT 0.00,
    cashierName VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Pelanggan
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'Umum',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buat indeks untuk pencarian cepat
CREATE INDEX IF NOT EXISTS products_name_idx ON public.products(name);
CREATE INDEX IF NOT EXISTS products_sku_idx ON public.products(sku);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS staff_accounts_username_idx ON public.staff_accounts(username);
CREATE INDEX IF NOT EXISTS transactions_invoiceNumber_idx ON public.transactions(invoiceNumber);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date);
CREATE INDEX IF NOT EXISTS customers_name_idx ON public.customers(name);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);

-- Aktifkan RLS (Row Level Security) jika diperlukan
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses publik penuh" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penuh staff_accounts" ON public.staff_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penuh transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik penuh customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Muat ulang cache schema PostgREST Supabase agar mendeteksi kolom baru secara instan
NOTIFY pgrst, 'reload schema';
`;

export const SUPABASE_ALTER_SQL = `-- SCRIPT MIGRASI TABEL JIKA ANDA SUDAH PUNYA TABEL 'products' SEBELUMNYA
-- Jalankan query ini di SQL Editor Supabase untuk menambahkan kolom grosir, paket, dan multi-satuan baru:

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS price_sell_member NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_sell_grosir NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS price_sell_agen NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'physical',
ADD COLUMN IF NOT EXISTS use_stock BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS units JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bundle_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS price_tiers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) DEFAULT '%',
ADD COLUMN IF NOT EXISTS show_in_transaction BOOLEAN DEFAULT true;

-- Muat ulang cache schema PostgREST Supabase agar mendeteksi kolom baru secara instan
NOTIFY pgrst, 'reload schema';
`;

export async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    // Try to fetch a single item to verify connection and table existence
    const { error } = await client.from('products').select('id').limit(1);
    if (error) {
      console.warn('Supabase connected but products table not found or error occurred:', error.message);
      // Connection might be fine, but table not created. Still return true if it's an API key match, 
      // but let's be strict: if it's a network error vs table error.
      // If error.code is 42P01, it means the table doesn't exist yet, which means connection is successful!
      if (error.code === '42P01') {
        return true; // Connection OK, table missing
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
    return false;
  }
}

export async function supabaseGetProducts(): Promise<Product[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { data, error } = await client
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data dari Supabase: ${error.message}`);
  }

  return data as Product[];
}

function sanitizeProductForSupabase(product: Product): any {
  return { ...product } as any;
}

export async function supabaseAddProduct(product: Product): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const sanitized = sanitizeProductForSupabase(product);
  const { error } = await client.from('products').insert([sanitized]);

  if (error) {
    const errStr = JSON.stringify(error).toLowerCase();
    if (errStr.includes('use_stock') || error.code === '42703') {
      const { use_stock, ...withoutUseStock } = sanitized;
      const { error: retryError } = await client.from('products').insert([withoutUseStock]);
      if (retryError) {
        throw new Error(`Gagal menyimpan produk ke Supabase: ${retryError.message}`);
      }
    } else {
      throw new Error(`Gagal menyimpan produk ke Supabase: ${error.message}`);
    }
  }
}

export async function supabaseAddProducts(products: Product[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const sanitized = products.map(sanitizeProductForSupabase);
  
  // Supabase insert supports an array of objects for bulk insert!
  const { error } = await client.from('products').insert(sanitized);

  if (error) {
    const errStr = JSON.stringify(error).toLowerCase();
    if (errStr.includes('use_stock') || error.code === '42703') {
      const withoutUseStock = sanitized.map(({ use_stock, ...rest }) => rest);
      const { error: retryError } = await client.from('products').insert(withoutUseStock);
      if (retryError) {
        throw new Error(`Gagal menyimpan produk massal ke Supabase: ${retryError.message}`);
      }
    } else {
      throw new Error(`Gagal menyimpan produk massal ke Supabase: ${error.message}`);
    }
  }
}

export async function supabaseUpdateProduct(product: Product): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const sanitized = sanitizeProductForSupabase(product);
  const { error } = await client
    .from('products')
    .update(sanitized)
    .eq('id', product.id);

  if (error) {
    const errStr = JSON.stringify(error).toLowerCase();
    if (errStr.includes('use_stock') || error.code === '42703') {
      const { use_stock, ...withoutUseStock } = sanitized;
      const { error: retryError } = await client
        .from('products')
        .update(withoutUseStock)
        .eq('id', product.id);
      if (retryError) {
        throw new Error(`Gagal memperbarui produk di Supabase: ${retryError.message}`);
      }
    } else {
      throw new Error(`Gagal memperbarui produk di Supabase: ${error.message}`);
    }
  }
}

export async function supabaseClearProducts(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  // Note: Supabase REST requires a filter to delete multiple records. 
  // We use neq with a dummy UUID to match all records.
  const { error } = await client.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    throw new Error(`Gagal menghapus seluruh data produk: ${error.message}`);
  }
}

export async function supabaseDeleteProduct(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('products').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus barang dari Supabase: ${error.message}`);
  }
}

export async function supabaseBulkAddProducts(products: Product[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  // Split into chunks of 1000 to prevent hitting payload limits
  const chunkSize = 1000;
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize).map(sanitizeProductForSupabase);
    const { error } = await client.from('products').upsert(chunk, { onConflict: 'sku' });
    if (error) {
      const errStr = JSON.stringify(error).toLowerCase();
      if (errStr.includes('use_stock') || error.code === '42703') {
        const retryChunk = chunk.map(({ use_stock, ...rest }) => rest);
        const { error: retryError } = await client.from('products').upsert(retryChunk, { onConflict: 'sku' });
        if (!retryError) continue;
        throw new Error(`Gagal melakukan sinkronisasi massal: ${retryError.message}`);
      }
      throw new Error(`Gagal melakukan sinkronisasi massal: ${error.message}`);
    }
  }
}

// === STAFF ACCOUNTS SUPABASE API ===

export async function supabaseGetStaffAccounts(): Promise<StaffAccount[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { data, error } = await client
    .from('staff_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data staf dari Supabase: ${error.message}`);
  }

  return data as StaffAccount[];
}

export async function supabaseAddStaffAccount(staff: StaffAccount): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('staff_accounts').insert([staff]);

  if (error) {
    throw new Error(`Gagal menyimpan staf ke Supabase: ${error.message}`);
  }
}

export async function supabaseUpdateStaffAccount(staff: StaffAccount): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client
    .from('staff_accounts')
    .update(staff)
    .eq('id', staff.id);

  if (error) {
    throw new Error(`Gagal memperbarui staf di Supabase: ${error.message}`);
  }
}

export async function supabaseDeleteStaffAccount(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('staff_accounts').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus staf dari Supabase: ${error.message}`);
  }
}

// === TRANSACTIONS SUPABASE API ===

function sanitizeTransactionForSupabase(tx: Transaction): any {
  return {
    id: tx.id,
    invoicenumber: tx.invoiceNumber,
    date: tx.date,
    items: tx.items,
    totalitems: tx.totalItems,
    totalamount: tx.totalAmount,
    amountpaid: tx.amountPaid,
    changeamount: tx.changeAmount,
    paymentmethod: tx.paymentMethod,
    customertype: tx.customerType,
    customername: tx.customerName,
    discounttotal: tx.discountTotal,
    cashiername: tx.cashierName
  };
}

function mapSupabaseToTransaction(row: any): Transaction {
  return {
    id: row.id,
    invoiceNumber: row.invoicenumber || row.invoiceNumber,
    date: row.date,
    items: row.items,
    totalItems: row.totalitems || row.totalItems,
    totalAmount: row.totalamount || row.totalAmount,
    amountPaid: row.amountpaid || row.amountPaid,
    changeAmount: row.changeamount || row.changeAmount,
    paymentMethod: row.paymentmethod || row.paymentMethod,
    customerType: row.customertype || row.customerType,
    customerName: row.customername || row.customerName,
    discountTotal: row.discounttotal || row.discountTotal,
    cashierName: row.cashiername || row.cashierName
  };
}

export async function supabaseGetTransactions(): Promise<Transaction[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { data, error } = await client
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil transaksi dari Supabase: ${error.message}`);
  }

  return (data as any[]).map(mapSupabaseToTransaction);
}

export async function supabaseAddTransaction(tx: Transaction): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const sanitized = sanitizeTransactionForSupabase(tx);
  const { error } = await client.from('transactions').insert([sanitized]);

  if (error) {
    throw new Error(`Gagal menyimpan transaksi ke Supabase: ${error.message}`);
  }
}

export async function supabaseClearTransactions(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    throw new Error(`Gagal menghapus transaksi dari Supabase: ${error.message}`);
  }
}

export async function supabaseDeleteTransaction(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('transactions').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus transaksi dari Supabase: ${error.message}`);
  }
}

// === CUSTOMERS SUPABASE API ===

export async function supabaseGetCustomers(): Promise<Customer[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { data, error } = await client
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data pelanggan dari Supabase: ${error.message}`);
  }

  return data as Customer[];
}

export async function supabaseAddCustomer(customer: Customer): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('customers').insert([customer]);

  if (error) {
    throw new Error(`Gagal menyimpan pelanggan ke Supabase: ${error.message}`);
  }
}

export async function supabaseUpdateCustomer(customer: Customer): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client
    .from('customers')
    .update(customer)
    .eq('id', customer.id);

  if (error) {
    throw new Error(`Gagal memperbarui pelanggan di Supabase: ${error.message}`);
  }
}

export async function supabaseDeleteCustomer(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { error } = await client.from('customers').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus pelanggan dari Supabase: ${error.message}`);
  }
}

