/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, DatabaseConfig, InventoryStats, StaffAccount, Transaction, Customer } from '../types';
import { generateUUID } from './utils';
import {
  localGetProducts,
  localAddProduct,
  localUpdateProduct,
  localDeleteProduct,
  localBulkAddProducts,
  localClearProducts,
  localGetStaffAccounts,
  localAddStaffAccount,
  localUpdateStaffAccount,
  localDeleteStaffAccount,
  localGetTransactions,
  localAddTransaction,
  localClearTransactions,
  localDeleteTransaction,
  localGetCustomers,
  localAddCustomer,
  localUpdateCustomer,
  localDeleteCustomer,
} from './indexedDb';
import {
  supabaseGetProducts,
  supabaseAddProduct,
  supabaseUpdateProduct,
  supabaseDeleteProduct,
  supabaseBulkAddProducts,
  loadDbConfig,
  supabaseGetStaffAccounts,
  supabaseAddStaffAccount,
  supabaseUpdateStaffAccount,
  supabaseDeleteStaffAccount,
  supabaseGetTransactions,
  supabaseAddTransaction,
  supabaseClearTransactions,
  supabaseDeleteTransaction,
  supabaseGetCustomers,
  supabaseAddCustomer,
  supabaseUpdateCustomer,
  supabaseDeleteCustomer,
} from './supabase';

export async function getProducts(): Promise<Product[]> {
  const config = loadDbConfig();
  let list: Product[] = [];
  if (config.mode === 'supabase') {
    try {
      list = await supabaseGetProducts();
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local DB cache:', err);
      list = await localGetProducts();
    }
  } else {
    list = await localGetProducts();
  }

  // Auto-migrate any product in the returned list that doesn't have a valid UUID ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let hasInvalidIds = false;
  for (const p of list) {
    if (!p.id || !uuidRegex.test(p.id)) {
      hasInvalidIds = true;
      break;
    }
  }

  if (hasInvalidIds) {
    console.log('Detecting products with legacy non-UUID IDs. Re-seeding database...');
    const updatedList = list.map(p => {
      if (!p.id || !uuidRegex.test(p.id)) {
        const oldIdMap: { [key: string]: string } = {
          'prod-001': 'e091df8a-928d-4e94-a02c-55b5fc0fa241',
          'prod-002': 'f41d99fb-2234-4bc1-af29-7988ee54c0aa',
          'prod-003': 'd1976a20-0fc3-469a-8a58-8d052d987d60',
          'prod-004': 'cb463c64-47f2-4e4b-b0b3-f661002242ef',
          'prod-005': 'a8bb874d-905e-4ef5-ba61-ec8842de69ee',
          'prod-006': 'b9ee1022-a5d5-492e-b6df-20888e0100aa',
          'prod-007': '62091656-6398-39f1-143a-b7be00000025',
          'prod-008': '72000000-8900-47f2-a258-417200000008',
        };
        const newId = oldIdMap[p.id] || generateUUID();
        return { ...p, id: newId };
      }
      return p;
    });

    // Write all of them back to the database
    await localClearProducts();
    await localBulkAddProducts(updatedList);
    if (config.mode === 'supabase') {
      try {
        await supabaseBulkAddProducts(updatedList);
      } catch (e) {
        console.error('Failed to sync migrated IDs to Supabase:', e);
      }
    }
    return updatedList;
  }

  return list;
}

export async function addProduct(product: Product): Promise<void> {
  const config = loadDbConfig();
  
  // Always write to local DB first (acts as offline backup/cache)
  await localAddProduct(product);

  if (config.mode === 'supabase') {
    try {
      await supabaseAddProduct(product);
    } catch (err) {
      console.error('Failed to write to Supabase, written to local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function updateProduct(product: Product): Promise<void> {
  const config = loadDbConfig();
  
  // Update local DB
  await localUpdateProduct(product);

  if (config.mode === 'supabase') {
    try {
      await supabaseUpdateProduct(product);
    } catch (err) {
      console.error('Failed to update Supabase, updated local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const config = loadDbConfig();
  
  // Delete from local DB
  await localDeleteProduct(id);

  if (config.mode === 'supabase') {
    try {
      await supabaseDeleteProduct(id);
    } catch (err) {
      console.error('Failed to delete from Supabase, deleted from local IndexedDB only:', err);
      throw err;
    }
  }
}

/**
 * Pushes all products from local IndexedDB that aren't in Supabase (or updates all)
 */
export async function syncLocalToSupabase(): Promise<{ successCount: number; error?: string }> {
  try {
    const localProducts = await localGetProducts();
    if (localProducts.length === 0) {
      return { successCount: 0 };
    }

    await supabaseBulkAddProducts(localProducts);
    return { successCount: localProducts.length };
  } catch (err: any) {
    console.error('Error syncing local to Supabase:', err);
    return { successCount: 0, error: err.message || 'Sinkronisasi gagal' };
  }
}

/**
 * Pulls all products from Supabase and overwrites local IndexedDB
 */
export async function syncSupabaseToLocal(): Promise<{ successCount: number; error?: string }> {
  try {
    const supabaseProducts = await supabaseGetProducts();
    
    // Clear local products first
    await localClearProducts();
    
    if (supabaseProducts.length > 0) {
      // Bulk add to local DB
      await localBulkAddProducts(supabaseProducts);
    }

    return { successCount: supabaseProducts.length };
  } catch (err: any) {
    console.error('Error syncing Supabase to local:', err);
    return { successCount: 0, error: err.message || 'Gagal mengunduh data' };
  }
}

/**
 * Calculates inventory stats
 */
export function calculateStats(products: Product[]): InventoryStats {
  const categories = new Set<string>();
  let totalStock = 0;
  let totalAssetValue = 0;
  let potentialRevenue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    if (p.category) categories.add(p.category);
    totalStock += p.stock;
    totalAssetValue += p.stock * p.price_buy;
    potentialRevenue += p.stock * p.price_sell;
    
    if (p.stock === 0) {
      outOfStockCount++;
    } else if (p.stock <= p.min_stock) {
      lowStockCount++;
    }
  }

  return {
    totalItems: products.length,
    totalStock,
    totalAssetValue,
    potentialRevenue,
    lowStockCount,
    outOfStockCount,
    categoryCount: categories.size,
  };
}

// === UNIFIED STAFF ACCOUNTS MANAGEMENT ===

export async function getStaffAccounts(): Promise<StaffAccount[]> {
  const config = loadDbConfig();
  if (config.mode === 'supabase') {
    try {
      return await supabaseGetStaffAccounts();
    } catch (err) {
      console.warn('Supabase staff fetch failed, falling back to local DB cache:', err);
      return await localGetStaffAccounts();
    }
  } else {
    return await localGetStaffAccounts();
  }
}

export async function addStaffAccount(staff: StaffAccount): Promise<void> {
  const config = loadDbConfig();
  
  // Save local first
  await localAddStaffAccount(staff);

  if (config.mode === 'supabase') {
    try {
      await supabaseAddStaffAccount(staff);
    } catch (err) {
      console.error('Failed to write staff to Supabase, written to local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function updateStaffAccount(staff: StaffAccount): Promise<void> {
  const config = loadDbConfig();
  
  // Update local
  await localUpdateStaffAccount(staff);

  if (config.mode === 'supabase') {
    try {
      await supabaseUpdateStaffAccount(staff);
    } catch (err) {
      console.error('Failed to update staff on Supabase, updated local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function deleteStaffAccount(id: string): Promise<void> {
  const config = loadDbConfig();
  
  // Delete local
  await localDeleteStaffAccount(id);

  if (config.mode === 'supabase') {
    try {
      await supabaseDeleteStaffAccount(id);
    } catch (err) {
      console.error('Failed to delete staff from Supabase, deleted from local IndexedDB only:', err);
      throw err;
    }
  }
}

// === UNIFIED TRANSACTIONS MANAGEMENT ===

export async function getTransactions(): Promise<Transaction[]> {
  const config = loadDbConfig();
  if (config.mode === 'supabase') {
    try {
      return await supabaseGetTransactions();
    } catch (err) {
      console.warn('Supabase transactions fetch failed, falling back to local DB cache:', err);
      return await localGetTransactions();
    }
  } else {
    return await localGetTransactions();
  }
}

export async function addTransaction(tx: Transaction): Promise<void> {
  const config = loadDbConfig();
  
  // Save local first
  await localAddTransaction(tx);

  if (config.mode === 'supabase') {
    try {
      await supabaseAddTransaction(tx);
    } catch (err) {
      console.error('Failed to save transaction to Supabase, written to local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function clearTransactions(): Promise<void> {
  const config = loadDbConfig();
  
  // Clear local first
  await localClearTransactions();

  if (config.mode === 'supabase') {
    try {
      await supabaseClearTransactions();
    } catch (err) {
      console.error('Failed to clear transactions from Supabase, cleared local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const config = loadDbConfig();
  
  // Delete from local first
  await localDeleteTransaction(id);

  if (config.mode === 'supabase') {
    try {
      await supabaseDeleteTransaction(id);
    } catch (err) {
      console.error('Failed to delete transaction from Supabase, deleted from local IndexedDB only:', err);
      throw err;
    }
  }
}

// === UNIFIED CUSTOMERS MANAGEMENT ===

export async function getCustomers(): Promise<Customer[]> {
  const config = loadDbConfig();
  if (config.mode === 'supabase') {
    try {
      return await supabaseGetCustomers();
    } catch (err) {
      console.warn('Supabase customers fetch failed, falling back to local DB cache:', err);
      return await localGetCustomers();
    }
  } else {
    return await localGetCustomers();
  }
}

export async function addCustomer(customer: Customer): Promise<void> {
  const config = loadDbConfig();
  
  // Save local first
  await localAddCustomer(customer);

  if (config.mode === 'supabase') {
    try {
      await supabaseAddCustomer(customer);
    } catch (err) {
      console.error('Failed to write customer to Supabase, written to local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const config = loadDbConfig();
  
  // Update local
  await localUpdateCustomer(customer);

  if (config.mode === 'supabase') {
    try {
      await supabaseUpdateCustomer(customer);
    } catch (err) {
      console.error('Failed to update customer on Supabase, updated local IndexedDB only:', err);
      throw err;
    }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const config = loadDbConfig();
  
  // Delete local
  await localDeleteCustomer(id);

  if (config.mode === 'supabase') {
    try {
      await supabaseDeleteCustomer(id);
    } catch (err) {
      console.error('Failed to delete customer from Supabase, deleted from local IndexedDB only:', err);
      throw err;
    }
  }
}

