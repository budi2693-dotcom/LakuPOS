/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Undo, 
  Search, 
  Sliders, 
  CheckCircle2, 
  HelpCircle, 
  X, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Product } from '../types';
import { DEFAULT_CATEGORIES } from '../data';
import { generateUUID } from '../lib/utils';

interface BulkWholesaleEditorProps {
  products: Product[];
  onSaveAll: (updatedProducts: Product[]) => Promise<void>;
  onClose: () => void;
}

interface EditableRow extends Partial<Product> {
  tempId: string; // Unique client-side key for rendering & tracking
  isNew?: boolean;
}

export default function BulkWholesaleEditor({
  products,
  onSaveAll,
  onClose,
}: BulkWholesaleEditorProps) {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize editable rows from products
  useEffect(() => {
    const initialRows: EditableRow[] = products.map((p) => ({
      ...p,
      tempId: p.id,
      price_sell_member: p.price_sell_member || p.price_sell,
      price_sell_grosir: p.price_sell_grosir || p.price_sell,
      price_sell_agen: p.price_sell_agen || p.price_sell,
    }));
    setRows(initialRows);
  }, [products]);

  // Handle cell text/number updates
  const handleCellChange = (tempId: string, field: keyof Product, value: any) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.tempId === tempId) {
          const updatedRow = { ...row, [field]: value };
          
          // Auto sync selling levels if base price_sell is modified and others were same or empty
          if (field === 'price_sell') {
            const numVal = parseFloat(value) || 0;
            if (!row.price_sell_member || row.price_sell_member === row.price_sell) updatedRow.price_sell_member = numVal;
            if (!row.price_sell_grosir || row.price_sell_grosir === row.price_sell) updatedRow.price_sell_grosir = numVal;
            if (!row.price_sell_agen || row.price_sell_agen === row.price_sell) updatedRow.price_sell_agen = numVal;
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  // Add a new row to the bulk editor
  const handleAddRow = () => {
    // Generate simple incremental SKU prefix
    const randNum = Math.floor(Math.random() * 90000) + 10000;
    const newSku = `GR-${randNum}`;

    const newRow: EditableRow = {
      tempId: generateUUID(),
      id: generateUUID(),
      sku: newSku,
      name: '',
      category: DEFAULT_CATEGORIES[0],
      product_type: 'physical',
      stock: 50,
      min_stock: 5,
      price_buy: 0,
      price_sell: 0,
      price_sell_member: 0,
      price_sell_grosir: 0,
      price_sell_agen: 0,
      isNew: true,
      created_at: new Date().toISOString(),
    };

    setRows((prev) => [newRow, ...prev]);
  };

  // Auto-fill random mock data for newly added empty rows for speed testing
  const handleAutoFillRow = (tempId: string) => {
    const productsMockNames = [
      'Indomie Goreng Spesial', 'Bimoli Minyak Goreng 2L', 'Gula Pasir Gulaku 1kg',
      'Kopi Kapal Api Mix', 'Sariwangi Teh Celup', 'Susu Kental Manis Frisian Flag',
      'Tepung Terigu Segitiga Biru', 'Sabun Cuci Rinso 800gr', 'Pepsodent Pencegah Gigi Berlubang',
      'Aqua Botol 600ml', 'Roma Kelapa Biskuit', 'Kapal Api Bubuk 165g'
    ];
    const categoriesByProduct: { [key: string]: string } = {
      'Indomie Goreng Spesial': 'Makanan & Minuman',
      'Bimoli Minyak Goreng 2L': 'Makanan & Minuman',
      'Gula Pasir Gulaku 1kg': 'Makanan & Minuman',
      'Sabun Cuci Rinso 800gr': 'Peralatan Rumah Tangga',
      'Sabun Lifebuoy': 'Kesehatan & Kosmetik',
    };

    const randomName = productsMockNames[Math.floor(Math.random() * productsMockNames.length)];
    const priceBuyRand = Math.floor(Math.random() * 10) * 1500 + 3000;
    const priceSellRand = Math.round(priceBuyRand * 1.15 / 100) * 100; // 15% margin
    const cat = categoriesByProduct[randomName] || 'Makanan & Minuman';

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.tempId === tempId) {
          return {
            ...row,
            name: `${randomName} #${Math.floor(Math.random() * 900 + 100)}`,
            category: cat,
            price_buy: priceBuyRand,
            price_sell: priceSellRand,
            price_sell_member: Math.round(priceSellRand * 0.98 / 100) * 100, // 2% member discount
            price_sell_grosir: Math.round(priceSellRand * 0.94 / 100) * 100, // 6% wholesale discount
            price_sell_agen: Math.round(priceSellRand * 0.90 / 100) * 100,   // 10% agent discount
            stock: Math.floor(Math.random() * 200) + 10,
          };
        }
        return row;
      })
    );
  };

  // Delete a row
  const handleDeleteRow = (tempId: string) => {
    setRows(rows.filter((r) => r.tempId !== tempId));
  };

  // Filter rows based on search query and category
  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Bulk Save handler
  const handleBulkSave = async () => {
    // Validate rows
    const invalidRows = rows.filter((r) => !r.sku?.trim() || !r.name?.trim());
    if (invalidRows.length > 0) {
      alert(`Ada ${invalidRows.length} baris yang nama barang atau SKU-nya masih kosong. Harap isi terlebih dahulu.`);
      return;
    }

    setIsSaving(true);
    try {
      // Map back to complete Product objects
      const productsToSave: Product[] = rows.map((r) => ({
        id: r.id || generateUUID(),
        sku: r.sku!.trim().toUpperCase(),
        name: r.name!.trim(),
        description: r.description,
        category: r.category || DEFAULT_CATEGORIES[0],
        product_type: r.product_type || 'physical',
        stock: r.stock !== undefined ? Number(r.stock) : 0,
        min_stock: r.min_stock !== undefined ? Number(r.min_stock) : 5,
        price_buy: r.price_buy !== undefined ? Number(r.price_buy) : 0,
        price_sell: r.price_sell !== undefined ? Number(r.price_sell) : 0,
        price_sell_member: r.price_sell_member !== undefined ? Number(r.price_sell_member) : Number(r.price_sell),
        price_sell_grosir: r.price_sell_grosir !== undefined ? Number(r.price_sell_grosir) : Number(r.price_sell),
        price_sell_agen: r.price_sell_agen !== undefined ? Number(r.price_sell_agen) : Number(r.price_sell),
        location: r.location,
        image_url: r.image_url,
        units: r.units || [],
        bundle_items: r.bundle_items || [],
        created_at: r.created_at || new Date().toISOString(),
      }));

      await onSaveAll(productsToSave);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menyimpan data massal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-[98vw] h-[95vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/75 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md font-bold tracking-wider">PRO ENGINE</span>
              <h3 className="text-base font-extrabold text-gray-950">Dashboard Pengeditan Massal (Bulk Grid)</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Edit stok, modal harga beli, dan 4-tier tingkatan harga jual grosir secara massal layaknya spreadsheet Excel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus size={14} className="stroke-3" />
              <span>Tambah Baris (+1)</span>
            </button>

            <button
              disabled={isSaving}
              onClick={handleBulkSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              {isSaving ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 bg-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Action Controls Search / Filters */}
        <div className="px-6 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row items-center gap-3 bg-white shrink-0">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari SKU atau nama barang..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kategori:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="sm:ml-auto text-[10px] text-gray-500 font-semibold flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-150">
            <HelpCircle size={12} className="text-blue-500" />
            <span>Tips: Isikan kolom <strong>Harga Jual (Umum)</strong> untuk otomatis menyalin harga ke tingkat member/grosir/agen.</span>
          </div>
        </div>

        {/* Dynamic Spreadsheet Grid Workspace */}
        <div className="flex-1 overflow-auto bg-gray-100/50 p-2">
          {filteredRows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 bg-white rounded-2xl border border-gray-150 p-10">
              <Sliders size={36} className="text-gray-300 stroke-1" />
              <p className="font-bold text-sm text-gray-500">Tidak ada barang yang cocok.</p>
              <p className="text-xs text-gray-400">Tekan "Tambah Baris" di pojok kanan atas untuk menambah data barang kosong baru.</p>
            </div>
          ) : (
            <div className="inline-block min-w-full align-middle bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-150 border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-[10px] font-extrabold text-gray-500 uppercase tracking-wider select-none sticky top-0 z-10 shadow-xs">
                    <th className="py-2.5 px-3 border-r border-gray-150 w-24 text-center">SKU</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-56">Nama Barang *</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-36 text-center">Tipe Barang</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-36">Kategori</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-24 bg-amber-50/40 text-amber-800 text-center">Stok</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-28 bg-gray-100/50 text-gray-800 text-center">Modal Beli (Rp)</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-28 bg-blue-50/40 text-blue-800 text-center">Jual Umum (Rp)</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-28 bg-emerald-50/40 text-emerald-800 text-center">Jual Member (Rp)</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-28 bg-amber-50/40 text-amber-800 text-center">Jual Grosir (Rp)</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-28 bg-purple-50/40 text-purple-800 text-center">Jual Agen (Rp)</th>
                    <th className="py-2.5 px-3 border-r border-gray-150 w-32">Lokasi Rak</th>
                    <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-150">
                  {filteredRows.map((row, index) => (
                    <tr 
                      key={row.tempId} 
                      className={`hover:bg-blue-50/15 ${row.isNew ? 'bg-emerald-50/10' : ''}`}
                    >
                      {/* SKU */}
                      <td className="p-1 border-r border-gray-150 font-mono text-center">
                        <input
                          type="text"
                          value={row.sku || ''}
                          disabled={!row.isNew}
                          onChange={(e) => handleCellChange(row.tempId, 'sku', e.target.value.toUpperCase())}
                          className="w-full text-center py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold uppercase bg-transparent"
                        />
                      </td>

                      {/* Name */}
                      <td className="p-1 border-r border-gray-150">
                        <div className="flex items-center gap-1">
                          {row.isNew && (
                            <button
                              type="button"
                              onClick={() => handleAutoFillRow(row.tempId)}
                              title="Autofill Contoh Barang"
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded shrink-0 cursor-pointer"
                            >
                              <Sparkles size={11} />
                            </button>
                          )}
                          <input
                            type="text"
                            value={row.name || ''}
                            onChange={(e) => handleCellChange(row.tempId, 'name', e.target.value)}
                            placeholder={row.isNew ? 'Isi nama barang baru...' : ''}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-semibold bg-transparent"
                          />
                        </div>
                      </td>

                      {/* Product Type */}
                      <td className="p-1 border-r border-gray-150 text-center">
                        <select
                          value={row.product_type || 'physical'}
                          onChange={(e) => handleCellChange(row.tempId, 'product_type', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-gray-200 focus:border-blue-500 rounded font-semibold bg-transparent"
                        >
                          <option value="physical">Fisik (Physical)</option>
                          <option value="service">Jasa (Service)</option>
                          <option value="bundle">Paket (Bundle)</option>
                        </select>
                      </td>

                      {/* Category */}
                      <td className="p-1 border-r border-gray-150">
                        <select
                          value={row.category || DEFAULT_CATEGORIES[0]}
                          onChange={(e) => handleCellChange(row.tempId, 'category', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-gray-200 focus:border-blue-500 rounded font-semibold bg-transparent"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>

                      {/* Stock */}
                      <td className="p-1 border-r border-gray-150 bg-amber-50/5 text-center">
                        <input
                          type="number"
                          value={row.stock !== undefined ? row.stock : 0}
                          disabled={row.product_type === 'service'}
                          onChange={(e) => handleCellChange(row.tempId, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full text-center py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold bg-transparent text-amber-800 disabled:text-gray-400"
                        />
                      </td>

                      {/* Price Buy */}
                      <td className="p-1 border-r border-gray-150 bg-gray-50/20">
                        <input
                          type="number"
                          value={row.price_buy !== undefined ? row.price_buy : 0}
                          onChange={(e) => handleCellChange(row.tempId, 'price_buy', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold bg-transparent text-gray-700"
                        />
                      </td>

                      {/* Price Sell (Umum) */}
                      <td className="p-1 border-r border-gray-150 bg-blue-50/10">
                        <input
                          type="number"
                          value={row.price_sell !== undefined ? row.price_sell : 0}
                          onChange={(e) => handleCellChange(row.tempId, 'price_sell', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold bg-transparent text-blue-700"
                        />
                      </td>

                      {/* Price Member */}
                      <td className="p-1 border-r border-gray-150 bg-emerald-50/5">
                        <input
                          type="number"
                          value={row.price_sell_member !== undefined ? row.price_sell_member : (row.price_sell || 0)}
                          onChange={(e) => handleCellChange(row.tempId, 'price_sell_member', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold bg-transparent text-emerald-700"
                        />
                      </td>

                      {/* Price Grosir */}
                      <td className="p-1 border-r border-gray-150 bg-amber-50/5">
                        <input
                          type="number"
                          value={row.price_sell_grosir !== undefined ? row.price_sell_grosir : (row.price_sell || 0)}
                          onChange={(e) => handleCellChange(row.tempId, 'price_sell_grosir', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold bg-transparent text-amber-700"
                        />
                      </td>

                      {/* Price Agen */}
                      <td className="p-1 border-r border-gray-150 bg-purple-50/5">
                        <input
                          type="number"
                          value={row.price_sell_agen !== undefined ? row.price_sell_agen : (row.price_sell || 0)}
                          onChange={(e) => handleCellChange(row.tempId, 'price_sell_agen', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-bold bg-transparent text-purple-700"
                        />
                      </td>

                      {/* Shelf Location */}
                      <td className="p-1 border-r border-gray-150">
                        <input
                          type="text"
                          value={row.location || ''}
                          onChange={(e) => handleCellChange(row.tempId, 'location', e.target.value)}
                          className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded text-xs font-semibold bg-transparent"
                        />
                      </td>

                      {/* Delete Action button */}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.tempId)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors inline-flex justify-center items-center cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Success Splash overlay */}
        {saveSuccess && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 animate-fade-in z-20">
            <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
            <h4 className="text-lg font-bold text-gray-950">Berhasil Disimpan!</h4>
            <p className="text-xs text-gray-500 font-medium">Katalog grosir diperbarui secara massal.</p>
          </div>
        )}

      </div>
    </div>
  );
}
