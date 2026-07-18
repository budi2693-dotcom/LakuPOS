/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from './types';
import { generateUUID } from './lib/utils';

export const DEFAULT_CATEGORIES = [
  'Elektronik',
  'Pakaian & Fashion',
  'Makanan & Minuman',
  'Peralatan Rumah Tangga',
  'Alat Tulis & Kantor',
  'Kesehatan & Kosmetik',
  'Otomotif',
  'Lain-lain',
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'e091df8a-928d-4e94-a02c-55b5fc0fa241',
    sku: 'EL-SMART-O1',
    name: 'Samsung Galaxy A55 5G (8GB/256GB)',
    description: 'Smartphone mid-range dengan performa andal, kamera 50MP, layar Super AMOLED 120Hz.',
    category: 'Elektronik',
    stock: 45,
    min_stock: 10,
    price_buy: 4900000,
    price_sell: 5999000,
    location: 'Rak A-12',
    image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'f41d99fb-2234-4bc1-af29-7988ee54c0aa',
    sku: 'EL-LAP-IDEAL',
    name: 'Asus Vivobook 14 Touch OLED',
    description: 'Laptop tipis bertenaga Intel Core i5, RAM 16GB, SSD 512GB, layar OLED jernih.',
    category: 'Elektronik',
    stock: 12,
    min_stock: 5,
    price_buy: 9200000,
    price_sell: 10999000,
    location: 'Rak A-02',
    image_url: 'https://images.unsplash.com/photo-1496181130204-755241544e35?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'd1976a20-0fc3-469a-8a58-8d052d987d60',
    sku: 'KO-GAYO-250',
    name: 'Kopi Arabika Gayo Aceh 250gr',
    description: 'Biji kopi sangrai premium arabika Gayo single origin, cita rasa buah-buahan dan rempah.',
    category: 'Makanan & Minuman',
    stock: 120,
    min_stock: 20,
    price_buy: 45000,
    price_sell: 75000,
    location: 'Rak B-04',
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'cb463c64-47f2-4e4b-b0b3-f661002242ef',
    sku: 'PA-HD-SWEAT',
    name: 'Hoodie Fleece Premium Black XL',
    description: 'Sweater bertudung bahan katun fleece tebal, lembut, dan nyaman dipakai sehari-hari.',
    category: 'Pakaian & Fashion',
    stock: 8,
    min_stock: 15, // Low stock trigger
    price_buy: 125000,
    price_sell: 199000,
    location: 'Rak C-01',
    image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'a8bb874d-905e-4ef5-ba61-ec8842de69ee',
    sku: 'RT-TUMBLER-G',
    name: 'Vacuum Tumbler Stainless Steel 500ml',
    description: 'Botol minum termos tahan panas dan dingin hingga 12 jam, bahan food grade SUS 304.',
    category: 'Peralatan Rumah Tangga',
    stock: 65,
    min_stock: 10,
    price_buy: 35000,
    price_sell: 69000,
    location: 'Rak D-08',
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'b9ee1022-a5d5-492e-b6df-20888e0100aa',
    sku: 'AT-NOTE-A5',
    name: 'Notebook Grid A5 Jilid Spiral',
    description: 'Buku catatan isi kertas kotak-kotak 80gr, isi 100 lembar, sampul tebal transparan.',
    category: 'Alat Tulis & Kantor',
    stock: 250,
    min_stock: 30,
    price_buy: 15000,
    price_sell: 28000,
    location: 'Rak E-01',
    image_url: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date().toISOString(),
  },
  {
    id: '62091656-6398-39f1-143a-b7be00000025',
    sku: 'KE-SERUM-N',
    name: 'Niacinamide 10% Zinc 1% Serum',
    description: 'Serum wajah untuk menyamarkan noda hitam, mencerahkan kulit, mengontrol produksi minyak.',
    category: 'Kesehatan & Kosmetik',
    stock: 0, // Out of stock trigger
    min_stock: 25,
    price_buy: 62000,
    price_sell: 110000,
    location: 'Rak F-03',
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '72000000-8900-47f2-a258-417200000008',
    sku: 'OT-HELM-FULL',
    name: 'Helm Full Face KYT Falcon 2 Carbon',
    description: 'Helm motor bersertifikasi SNI dan DOT, busa lembut bisa dilepas, tipe double visor.',
    category: 'Otomotif',
    stock: 5,
    min_stock: 6, // Low stock trigger
    price_buy: 720000,
    price_sell: 890000,
    location: 'Gudang Belakang',
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

// Generates simulated bulk products (used for high-performance test)
export function generateBulkDummyProducts(count: number): Product[] {
  const result: Product[] = [];
  const categories = DEFAULT_CATEGORIES;
  const prefixes = ['EL', 'PA', 'KO', 'RT', 'AT', 'KE', 'OT', 'LN'];
  
  const locations = [
    'Rak A-01', 'Rak A-02', 'Rak B-01', 'Rak B-02', 'Rak C-05',
    'Rak D-10', 'Rak E-12', 'Rak F-01', 'Rak G-04', 'Gudang A',
    'Gudang B', 'Rak Depan', 'Konter-1', 'Konter-2', 'Rak Gantung'
  ];

  const adj = ['Premium', 'Super', 'Eksklusif', 'Ekstra', 'Minimalis', 'Portabel', 'Ultra', 'Nirkabel', 'Ramah Lingkungan', 'Ergonomis'];
  const nouns: { [key: string]: string[] } = {
    'Elektronik': ['Earphone', 'Charger', 'Mouse', 'Keyboard', 'Speaker', 'Kipas Angin', 'Powerbank', 'Lampu LED', 'Kabel HDMI', 'Kamera Saku'],
    'Pakaian & Fashion': ['Kaus Polos', 'Celana Chino', 'Kemeja Katun', 'Jaket Bomber', 'Sandal Kulit', 'Topi Baseball', 'Kaos Kaki', 'Sabuk Kulit', 'Dompet'],
    'Makanan & Minuman': ['Keripik Singkong', 'Madu Murni', 'Teh Hijau', 'Cokelat Batang', 'Susu Almond', 'Biskuit Gandum', 'Air Mineral', 'Saus Sambal'],
    'Peralatan Rumah Tangga': ['Saringan Air', 'Pisau Dapur', 'Gantungan Baju', 'Kotak Bekal', 'Sapu Serat', 'Keset Kaki', 'Talenan Kayu', 'Wajan Anti Lengket'],
    'Alat Tulis & Kantor': ['Pena Gel', 'Pensil 2B', 'Penghapus', 'Penggaris Besi', 'Map Dokumen', 'Spidol Papan', 'Stapler', 'Isi Staples', 'Kertas A4'],
    'Kesehatan & Kosmetik': ['Masker Medis', 'Hand Sanitizer', 'Sabun Organik', 'Pelembab Bibir', 'Krim Tangan', 'Suplemen Vitamin C', 'Tabir Surya'],
    'Otomotif': ['Oli Mesin', 'Cairan Pembersih', 'Kanebo', 'Parfum Mobil', 'Kunci Pas', 'Pompa Ban Portabel', 'Jas Hujan', 'Sarung Tangan Motor'],
    'Lain-lain': ['Gantungan Kunci', 'Tas Belanja', 'Korek Api', 'Stiker Dekoratif', 'Senter Mini', 'Payung Lipat', 'Baterai AA']
  };

  const basePriceBuy: { [key: string]: number } = {
    'Elektronik': 150000,
    'Pakaian & Fashion': 85000,
    'Makanan & Minuman': 15000,
    'Peralatan Rumah Tangga': 45000,
    'Alat Tulis & Kantor': 8000,
    'Kesehatan & Kosmetik': 50000,
    'Otomotif': 65000,
    'Lain-lain': 12000
  };

  // Pre-calculate to avoid slow random generations
  for (let i = 1; i <= count; i++) {
    const catIndex = Math.floor(Math.random() * categories.length);
    const category = categories[catIndex];
    const prefix = prefixes[catIndex];
    
    const catNouns = nouns[category] || nouns['Lain-lain'];
    const noun = catNouns[Math.floor(Math.random() * catNouns.length)];
    const adjective = adj[Math.floor(Math.random() * adj.length)];
    const sizeOrColor = Math.random() > 0.5 ? (Math.random() > 0.5 ? ' Hitam' : ' Putih') : '';
    
    const name = `${noun} ${adjective}${sizeOrColor} v.${100 + i}`;
    
    // Generate secure, guaranteed unique SKU based on index to prevent collisions
    const sku = `${prefix}-${10000 + i}-${Math.floor(Math.random() * 900 + 100)}`;
    
    const basePrice = basePriceBuy[category] || 20000;
    // Add random factor
    const price_buy = Math.floor(basePrice * (0.5 + Math.random() * 1.5));
    // Markup price to sell (margin ~20-50%)
    const price_sell = Math.floor(price_buy * (1.2 + Math.random() * 0.3));
    
    const stock = Math.floor(Math.random() * 150);
    const min_stock = Math.floor(Math.random() * 20) + 5;
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    // Create realistic historic creation dates spread over the last 90 days
    const created_at = new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)).toISOString();

    result.push({
      id: generateUUID(),
      sku,
      name,
      category,
      stock,
      min_stock,
      price_buy,
      price_sell,
      location,
      created_at
    });
  }

  return result;
}
