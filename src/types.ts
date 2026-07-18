/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductUnit {
  id: string;
  unitName: string; // e.g. 'Dus', 'Pak'
  conversionMultiplier: number; // e.g. 24 (means 1 Dus = 24 Pcs)
  price_sell_umum: number;
  price_sell_member: number;
  price_sell_grosir: number;
  price_sell_agen: number;
  sku_unit?: string;
}

export interface BundleItem {
  productId: string;
  quantity: number;
}

export interface PriceTier {
  id: string;
  customerType: 'Langganan' | 'Grosir' | 'Agen';
  minQty: number;
  price: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  stock: number;
  min_stock: number; // Minimum stock level for alert
  price_buy: number; // Purchase price
  price_sell: number; // Selling/retail price (Umum)
  price_sell_member?: number;
  price_sell_grosir?: number;
  price_sell_agen?: number;
  price_tiers?: PriceTier[];
  product_type?: 'physical' | 'service' | 'bundle';
  use_stock?: boolean;
  units?: ProductUnit[];
  bundle_items?: BundleItem[];
  discount?: number;
  discount_type?: string;
  location?: string; // Storage/shelf location
  image_url?: string;
  created_at?: string;
  show_in_transaction?: boolean;
}

export interface InventoryStats {
  totalItems: number;
  totalStock: number;
  totalAssetValue: number; // sum(stock * price_buy)
  potentialRevenue: number; // sum(stock * price_sell)
  lowStockCount: number;
  outOfStockCount: number;
  categoryCount: number;
}

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mode: 'local' | 'supabase';
}

export interface TransactionItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number; // Quantity in terms of the selected unit
  unitName: string; // e.g. 'Pcs', 'Dus', 'Pak'
  multiplier: number; // Conversion factor (e.g. 24 for Dus)
  price: number; // Selling price per selected unit at time of transaction
  subtotal: number;
  discountAmount?: number; // Discount per unit
  notes?: string;
  addons?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string;
  items: TransactionItem[];
  totalItems: number; // Total quantity sum
  totalAmount: number; // Total after any invoice-level discount
  amountPaid: number;
  changeAmount: number;
  paymentMethod: 'Cash' | 'QRIS' | 'Transfer' | 'Card';
  customerType: 'Umum' | 'Langganan' | 'Grosir' | 'Agen';
  customerName?: string;
  discountTotal?: number;
  cashierName?: string;
}

export interface StaffAccount {
  id: string;
  username: string;
  password_hash: string; // Plain password or hash
  role: 'owner' | 'kasir';
  fullname: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: 'Umum' | 'Langganan' | 'Grosir' | 'Agen';
  created_at: string;
}


