/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, StaffAccount, Transaction, Customer } from '../types';

const DB_NAME = 'StitchInventoryDB';
const STORE_NAME = 'products';
const STORE_STAFF = 'staff_accounts';
const STORE_TRANSACTIONS = 'transactions';
const STORE_CUSTOMERS = 'customers';
const DB_VERSION = 3;

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Gagal membuka basis data IndexedDB'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Products store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name_idx', 'name', { unique: false });
        store.createIndex('sku_idx', 'sku', { unique: true });
        store.createIndex('category_idx', 'category', { unique: false });
        store.createIndex('created_at_idx', 'created_at', { unique: false });
      }
      
      // Staff Accounts store
      if (!db.objectStoreNames.contains(STORE_STAFF)) {
        const store = db.createObjectStore(STORE_STAFF, { keyPath: 'id' });
        store.createIndex('username_idx', 'username', { unique: true });
      }

      // Transactions store
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        const store = db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
        store.createIndex('invoiceNumber_idx', 'invoiceNumber', { unique: true });
        store.createIndex('date_idx', 'date', { unique: false });
      }

      // Customers store
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
        const store = db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
        store.createIndex('name_idx', 'name', { unique: false });
        store.createIndex('phone_idx', 'phone', { unique: false });
      }
    };
  });
}

export async function localGetProducts(): Promise<Product[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by created_at descending by default
      const list = request.result as Product[];
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
      resolve(list);
    };

    request.onerror = () => {
      reject(new Error('Gagal mengambil data barang'));
    };
  });
}

export async function localAddProduct(product: Product): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(product);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menambah barang (pastikan SKU tidak duplikat)'));
    };
  });
}

export async function localUpdateProduct(product: Product): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(product);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal memperbarui barang'));
    };
  });
}

export async function localDeleteProduct(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus barang'));
    };
  });
}

export async function localBulkAddProducts(products: Product[]): Promise<void> {
  const db = await openDb();
  
  // Ambil data barang yang sudah ada untuk memetakan SKU ke ID yang lama
  const existingProducts = await localGetProducts();
  const skuToIdMap = new Map<string, string>();
  for (const p of existingProducts) {
    skuToIdMap.set(p.sku, p.id);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error('Bulk transaction failed:', transaction.error);
      reject(new Error(`Transaksi massal gagal: ${transaction.error?.message || 'Error tidak dikenal'}`));
    };

    // Gunakan map untuk melacak SKU yang terlihat dalam batch ini
    const seenSkusInBatch = new Map<string, string>(); // sku -> id

    // Gunakan loop untuk menambahkan/memperbarui setiap barang dalam transaksi yang sama
    for (const product of products) {
      const existingId = skuToIdMap.get(product.sku) || seenSkusInBatch.get(product.sku);
      if (existingId) {
        // Jika SKU sudah ada, clone barang dan ganti ID-nya agar menimpa record lama secara aman
        const cloned = { ...product, id: existingId };
        store.put(cloned);
      } else {
        // Jika SKU baru, catat ID-nya dan simpan langsung
        seenSkusInBatch.set(product.sku, product.id);
        store.put(product);
      }
    }
  });
}

export async function localClearProducts(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal mengosongkan data barang'));
    };
  });
}

// === STAFF ACCOUNTS LOCAL STORAGE ===

export async function localGetStaffAccounts(): Promise<StaffAccount[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_STAFF, 'readonly');
    const store = transaction.objectStore(STORE_STAFF);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as StaffAccount[]);
    };

    request.onerror = () => {
      reject(new Error('Gagal mengambil data akun staf'));
    };
  });
}

export async function localAddStaffAccount(staff: StaffAccount): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_STAFF, 'readwrite');
    const store = transaction.objectStore(STORE_STAFF);
    const request = store.add(staff);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menambah akun staf (username mungkin duplikat)'));
    };
  });
}

export async function localUpdateStaffAccount(staff: StaffAccount): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_STAFF, 'readwrite');
    const store = transaction.objectStore(STORE_STAFF);
    const request = store.put(staff);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal memperbarui akun staf'));
    };
  });
}

export async function localDeleteStaffAccount(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_STAFF, 'readwrite');
    const store = transaction.objectStore(STORE_STAFF);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus akun staf'));
    };
  });
}

// === TRANSACTIONS LOCAL STORAGE ===

export async function localGetTransactions(): Promise<Transaction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORE_TRANSACTIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      const list = request.result as Transaction[];
      // Sort by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      resolve(list);
    };

    request.onerror = () => {
      reject(new Error('Gagal mengambil data transaksi'));
    };
  });
}

export async function localAddTransaction(tx: Transaction): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = transaction.objectStore(STORE_TRANSACTIONS);
    const request = store.add(tx);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menyimpan transaksi'));
    };
  });
}

export async function localClearTransactions(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = transaction.objectStore(STORE_TRANSACTIONS);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus riwayat transaksi'));
    };
  });
}

export async function localDeleteTransaction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = transaction.objectStore(STORE_TRANSACTIONS);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus transaksi'));
    };
  });
}

// === CUSTOMERS LOCAL STORAGE ===

export async function localGetCustomers(): Promise<Customer[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CUSTOMERS, 'readonly');
    const store = transaction.objectStore(STORE_CUSTOMERS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Customer[]);
    };

    request.onerror = () => {
      reject(new Error('Gagal mengambil data pelanggan'));
    };
  });
}

export async function localAddCustomer(customer: Customer): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CUSTOMERS, 'readwrite');
    const store = transaction.objectStore(STORE_CUSTOMERS);
    const request = store.add(customer);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menambah pelanggan'));
    };
  });
}

export async function localUpdateCustomer(customer: Customer): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CUSTOMERS, 'readwrite');
    const store = transaction.objectStore(STORE_CUSTOMERS);
    const request = store.put(customer);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal memperbarui pelanggan'));
    };
  });
}

export async function localDeleteCustomer(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CUSTOMERS, 'readwrite');
    const store = transaction.objectStore(STORE_CUSTOMERS);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Gagal menghapus pelanggan'));
    };
  });
}

