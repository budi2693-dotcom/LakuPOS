/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  Upload,
  Edit2,
  Trash2,
  Grid,
  List,
  AlertTriangle,
  FileSpreadsheet,
  Trash,
  HelpCircle,
  Eye,
  X,
  Package,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { Product } from '../types';
import { DEFAULT_CATEGORIES } from '../data';
import { generateUUID } from '../lib/utils';
import BulkWholesaleEditor from './BulkWholesaleEditor';

interface ProductTableProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onClearAll: () => void;
  onBulkImport: (products: Product[]) => void;
  isReadOnly?: boolean;
}

export default function ProductTable({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onClearAll,
  onBulkImport,
  isReadOnly = false,
}: ProductTableProps) {
  // Search, Filter, & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // CSV Import States
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showImportHelp, setShowImportHelp] = useState(false);
  const [showBulkEditor, setShowBulkEditor] = useState(false);

  // Multi-select & Detail States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailTab, setDetailTab] = useState<'data' | 'harga' | 'satuan' | 'varian' | 'paket' | 'bahan'>('data');

  // Format currency to Indonesian Rupiah
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 1. Process Filtering, Searching & Sorting
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Search filter (Fuzzy / SKU / Name / Location)
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query)) ||
          (p.location && p.location.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Stock status filter
    if (selectedStockStatus !== 'all') {
      if (selectedStockStatus === 'instock') {
        result = result.filter((p) => p.use_stock === false || p.stock > p.min_stock);
      } else if (selectedStockStatus === 'lowstock') {
        result = result.filter((p) => p.use_stock !== false && p.stock > 0 && p.stock <= p.min_stock);
      } else if (selectedStockStatus === 'outofstock') {
        result = result.filter((p) => p.use_stock !== false && p.stock === 0);
      }
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof Product] ?? '';
      let valB: any = b[sortBy as keyof Product] ?? '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, searchTerm, selectedCategory, selectedStockStatus, sortBy, sortOrder]);

  // 2. Pagination Calculations
  const paginatedProducts = useMemo(() => {
    // Reset page if bounds exceeded
    const maxPage = Math.max(1, Math.ceil(processedProducts.length / itemsPerPage));
    const activePage = currentPage > maxPage ? maxPage : currentPage;
    
    const startIndex = (activePage - 1) * itemsPerPage;
    return processedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [processedProducts, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(processedProducts.length / itemsPerPage));

  // Checkbox helpers
  const allPageSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id));
  const somePageSelected = paginatedProducts.some(p => selectedIds.has(p.id)) && !allPageSelected;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (!confirm(`Hapus ${count} barang yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) return;
    selectedIds.forEach(id => onDeleteProduct(id));
    setSelectedIds(new Set());
  };

  // Handle Sort Change
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    if (products.length === 0) return;

    const headers = 'id,sku,name,category,stock,min_stock,price_buy,price_sell,location,description,created_at\n';
    const rows = products
      .map((p) => {
        const desc = p.description ? p.description.replace(/"/g, '""') : '';
        return `"${p.id}","${p.sku}","${p.name.replace(/"/g, '""')}","${p.category}",${p.stock},${p.min_stock},${p.price_buy},${p.price_sell},"${p.location || ''}","${desc}","${p.created_at || ''}"`;
      })
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `stitch_inventory_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV Import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split('\n').map((line) => line.trim()).filter((line) => line !== '');
        if (lines.length <= 1) {
          setCsvError('File CSV kosong atau hanya berisi baris judul.');
          return;
        }

        // Parse CSV simple parser
        const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
        const importedProducts: Product[] = [];

        // Helper to find column index with support for multiple synonym matches
        const findColIdx = (synonyms: string[]): number => {
          return headers.findIndex((h) => synonyms.some(syn => h === syn || h.replace(/[\s_-]/g, '') === syn.replace(/[\s_-]/g, '')));
        };

        const skuIdx = findColIdx(['sku', 'kode', 'barcode', 'kode barang', 'kode_barang']);
        const nameIdx = findColIdx(['name', 'nama', 'nama barang', 'nama_barang', 'produk', 'product']);
        const catIdx = findColIdx(['category', 'kategori', 'grup', 'group']);
        const stockIdx = findColIdx(['stock', 'stok', 'qty', 'jumlah']);
        const minStockIdx = findColIdx(['min_stock', 'min stock', 'stok minimal', 'stok_minimal', 'limit']);
        const priceBuyIdx = findColIdx(['price_buy', 'price buy', 'harga beli', 'harga_beli', 'modal']);
        const priceSellIdx = findColIdx(['price_sell', 'price sell', 'harga jual', 'harga_jual', 'harga']);
        const locIdx = findColIdx(['location', 'lokasi', 'rak', 'shelf']);
        const descIdx = findColIdx(['description', 'deskripsi', 'keterangan', 'info', 'detail']);
        const idIdx = findColIdx(['id']);

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // Handle quotes in CSV
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const row = matches.map((val) => val.replace(/^"|"$/g, '').trim());

          if (row.length < 3) continue; // Skip empty/invalid lines

          const sku = skuIdx !== -1 && skuIdx < row.length ? row[skuIdx] : `SKU-IMP-${Math.floor(Math.random() * 90000 + 10000)}`;
          const name = nameIdx !== -1 && nameIdx < row.length ? row[nameIdx] : `Produk Impor #${i}`;
          const category = catIdx !== -1 && catIdx < row.length ? row[catIdx] : 'Lain-lain';
          const stock = stockIdx !== -1 && stockIdx < row.length ? parseInt(row[stockIdx]) || 0 : 0;
          const min_stock = minStockIdx !== -1 && minStockIdx < row.length ? parseInt(row[minStockIdx]) || 10 : 10;
          const price_buy = priceBuyIdx !== -1 && priceBuyIdx < row.length ? parseFloat(row[priceBuyIdx]) || 0 : 0;
          const price_sell = priceSellIdx !== -1 && priceSellIdx < row.length ? parseFloat(row[priceSellIdx]) || 0 : 0;
          const location = locIdx !== -1 && locIdx < row.length ? row[locIdx] : '';
          const description = descIdx !== -1 && descIdx < row.length ? row[descIdx] : '';

          let id = idIdx !== -1 && idIdx < row.length ? row[idIdx] : '';
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          if (!isUuid) {
            id = generateUUID();
          }

          importedProducts.push({
            id,
            sku,
            name,
            category,
            stock,
            min_stock,
            price_buy,
            price_sell,
            location,
            description,
            created_at: new Date().toISOString(),
          });
        }

        if (importedProducts.length > 0) {
          onBulkImport(importedProducts);
          // Reset target
          e.target.value = '';
          alert(`Sukses mengimpor ${importedProducts.length} barang!`);
        } else {
          setCsvError('Tidak ada data valid yang bisa diimpor. Pastikan nama kolom sesuai format.');
        }
      } catch (err: any) {
        setCsvError(`Gagal membaca file CSV: ${err.message}`);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Panel */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        {/* Row 1: Search Input & Add Button */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari SKU, nama barang, rak, deskripsi..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                title="Tampilan Tabel"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                title="Tampilan Grid"
              >
                <Grid size={18} />
              </button>
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              disabled={products.length === 0}
              className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Ekspor CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Ekspor</span>
            </button>

            {/* CSV Import */}
            {!isReadOnly && (
              <label className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-all">
                <Upload size={16} />
                <span className="hidden sm:inline">Impor CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
            )}

            {!isReadOnly && (
              <button
                onClick={() => setShowImportHelp(!showImportHelp)}
                className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Format Impor CSV"
              >
                <HelpCircle size={18} />
              </button>
            )}

            {/* Delete All (Danger) */}
            {!isReadOnly && products.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus seluruh barang di database? Tindakan ini tidak dapat dibatalkan.')) {
                    onClearAll();
                  }
                }}
                className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Hapus Semua"
              >
                <Trash size={16} />
                <span className="hidden sm:inline">Kosongkan</span>
              </button>
            )}

            {/* Edit & Tambah Massal */}
            {!isReadOnly && (
              <button
                onClick={() => setShowBulkEditor(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <FileSpreadsheet size={16} />
                <span>Kelola Massal (Bulk Grid)</span>
              </button>
            )}

            {/* Add Product Button */}
            {!isReadOnly && (
              <button
                onClick={onAddProduct}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Plus size={16} />
                <span>Tambah Barang</span>
              </button>
            )}
          </div>
        </div>

        {/* CSV Import Help Box */}
        {showImportHelp && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-2 animate-fade-in">
            <h5 className="font-semibold flex items-center gap-1.5 text-sm">
              <FileSpreadsheet size={16} />
              Panduan Format Impor CSV
            </h5>
            <p>
              Gunakan file spreadsheet (Excel/Google Sheets) lalu simpan sebagai <strong>.CSV</strong> dengan format kolom berikut pada baris pertama:
            </p>
            <code className="block bg-blue-100/60 p-2 rounded text-blue-900 overflow-x-auto font-mono whitespace-nowrap">
              sku, name, category, stock, min_stock, price_buy, price_sell, location, description
            </code>
            <p>
              *Kategori yang didukung secara default: Elektronik, Pakaian &amp; Fashion, Makanan &amp; Minuman, Peralatan Rumah Tangga, Alat Tulis &amp; Kantor, Kesehatan &amp; Kosmetik, Otomotif, Lain-lain.
            </p>
          </div>
        )}

        {/* CSV Error Alert */}
        {csvError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-500" />
            <span>{csvError}</span>
          </div>
        )}

        {/* Row 2: Filtering & Sizing Selectors */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter size={12} /> Kategori:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 sm:flex-initial"
            >
              <option value="all">Semua Kategori</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
              Stok:
            </span>
            <select
              value={selectedStockStatus}
              onChange={(e) => {
                setSelectedStockStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 sm:flex-initial"
            >
              <option value="all">Semua Kondisi Stok</option>
              <option value="instock">Stok Aman</option>
              <option value="lowstock">Stok Menipis (Krisis)</option>
              <option value="outofstock">Stok Habis (Kosong)</option>
            </select>
          </div>

          {/* Rows Per Page */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs text-gray-500 shrink-0">Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Delete Bar */}
      {selectedIds.size > 0 && !isReadOnly && (
        <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-xl shadow">
          <span className="font-semibold text-sm flex-1">
            {selectedIds.size} barang dipilih
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 bg-white text-red-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 size={15} />
            Hapus Barang Terpilih
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
            title="Batalkan pilihan"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Catalog View Container */}
      {processedProducts.length === 0 ? (
        <div className="bg-white py-16 px-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto border border-gray-100">
              <Search size={22} />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Barang tidak ditemukan</h3>
            <p className="text-sm text-gray-500">
              Tidak ada barang yang cocok dengan kata kunci atau filter yang Anda pilih saat ini.
            </p>
            {(searchTerm !== '' || selectedCategory !== 'all' || selectedStockStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedStockStatus('all');
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* --- LIST VIEW (HIGH PERFORMANCE TABLE) --- */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {!isReadOnly && (
                    <th className="py-3.5 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={el => { if (el) el.indeterminate = somePageSelected; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        title="Pilih semua"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4 font-medium">Informasi Barang</th>
                  <th className="py-3.5 px-4 font-medium shrink-0">
                    <button
                      onClick={() => handleSort('sku')}
                      className="flex items-center gap-1 hover:text-gray-900 cursor-pointer text-left"
                    >
                      SKU <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 font-medium">Kategori</th>
                  <th className="py-3.5 px-4 font-medium">Tipe Barang</th>
                  <th className="py-3.5 px-4 font-medium text-right">
                    <button
                      onClick={() => handleSort('price_sell')}
                      className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full text-right"
                    >
                      Harga Jual <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 font-medium text-center">
                    <button
                      onClick={() => handleSort('stock')}
                      className="flex items-center justify-center gap-1 hover:text-gray-900 cursor-pointer w-full text-center"
                    >
                      Stok <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                {paginatedProducts.map((p) => {
                  const isOutOfStock = p.use_stock !== false && p.stock === 0;
                  const isLowStock = p.use_stock !== false && p.stock > 0 && p.stock <= p.min_stock;
                  const isSelected = selectedIds.has(p.id);
                  const itemType = p.item_type || 'Default';

                  const itemTypeBadgeColor: Record<string, string> = {
                    Default: 'bg-gray-100 text-gray-600',
                    Multisatuan: 'bg-blue-50 text-blue-600',
                    Varian: 'bg-purple-50 text-purple-600',
                    Bundle: 'bg-orange-50 text-orange-600',
                    Jasa: 'bg-teal-50 text-teal-600',
                  };

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-teal-50/40' : ''}`}
                    >
                      {!isReadOnly && (
                        <td className="py-3 pl-4 pr-2 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(p.id)}
                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Image + Name + Description */}
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 text-xs font-bold">
                              {p.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors truncate">
                              {p.name}
                            </p>
                            {p.description ? (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{p.description}</p>
                            ) : (
                              <span className="text-[10px] italic text-gray-300">Tidak ada deskripsi</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-600">{p.sku}</td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {p.category}
                        </span>
                      </td>

                      {/* Tipe Barang */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${itemTypeBadgeColor[itemType] || itemTypeBadgeColor.Default}`}>
                          <Package size={10} />
                          {itemType}
                        </span>
                      </td>

                      {/* Price Sell */}
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatRupiah(p.price_sell)}
                        <p className="text-[10px] text-gray-400 font-normal mt-0.5">Beli: {formatRupiah(p.price_buy)}</p>
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            isOutOfStock ? 'bg-red-50 text-red-600 border border-red-100'
                            : isLowStock ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {p.use_stock !== false ? `${p.stock}` : '∞'}
                          </span>
                          {isLowStock && <span className="text-[9px] text-amber-500 font-semibold mt-0.5">Min: {p.min_stock}</span>}
                          {isOutOfStock && <span className="text-[9px] text-red-500 font-semibold mt-0.5">Habis</span>}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Detail button */}
                          <button
                            onClick={() => { setDetailProduct(p); setDetailTab('data'); }}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                            title="Detail Barang"
                          >
                            Detail
                          </button>
                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => onEditProduct(p)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit Barang"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => { if (confirm(`Hapus ${p.name}?`)) onDeleteProduct(p.id); }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Barang"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* --- GRID VIEW --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((p) => {
            const isOutOfStock = p.use_stock !== false && p.stock === 0;
            const isLowStock = p.use_stock !== false && p.stock > 0 && p.stock <= p.min_stock;

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-video rounded-lg bg-gray-50 border border-gray-100 mb-3 overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-2xl uppercase">
                        {p.name.substring(0, 2)}
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono font-bold text-gray-600 shadow-xs border border-gray-100">
                      {p.sku}
                    </span>
                    {isOutOfStock && (
                      <span className="absolute inset-0 bg-red-950/20 flex items-center justify-center font-bold text-red-600 text-sm backdrop-blur-[1px]">
                        STOK HABIS
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {p.category}
                  </span>
                  <h5 className="font-semibold text-gray-900 group-hover:text-blue-600 truncate mt-0.5">
                    {p.name}
                  </h5>
                  <p className="text-xs text-gray-400 line-clamp-2 min-h-[32px] mt-1">
                    {p.description || <span className="italic text-gray-300">Tidak ada deskripsi</span>}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Lokasi: <strong className="text-gray-700">{p.location || '-'}</strong></span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOutOfStock
                          ? 'bg-red-50 text-red-600'
                          : isLowStock
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {p.use_stock !== false ? `${p.stock} unit` : 'Tak Terbatas'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[9px] text-gray-400 leading-none">Harga Jual</p>
                      <p className="text-base font-bold text-gray-900">{formatRupiah(p.price_sell)}</p>
                    </div>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditProduct(p)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus ${p.name}?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- PAGINATION FOOTER (CRITICAL FOR PERFORMANCE) --- */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <div>
          Menampilkan <span className="font-semibold text-gray-800">
            {processedProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </span>{' '}
          sampai{' '}
          <span className="font-semibold text-gray-800">
            {Math.min(currentPage * itemsPerPage, processedProducts.length)}
          </span>{' '}
          dari <span className="font-semibold text-gray-800">{processedProducts.length.toLocaleString('id-ID')}</span> barang
          {processedProducts.length !== products.length && (
            <span> (difilter dari {products.length.toLocaleString('id-ID')} total)</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
          >
            Awal
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
          >
            Sebelumnya
          </button>

          {/* Render dynamic limited page buttons to avoid clutter with tens of pages */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Center active page in paginator if pages > 5
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              if (currentPage + 2 > totalPages) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
          >
            Selanjutnya
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
          >
            Akhir
          </button>
        </div>
      </div>

      {showBulkEditor && (
        <BulkWholesaleEditor
          products={products}
          onSaveAll={async (updatedProducts) => {
            await onBulkImport(updatedProducts);
            setShowBulkEditor(false);
          }}
          onClose={() => setShowBulkEditor(false)}
        />
      )}

      {/* ============================================================
          DETAIL SIDEBAR PANEL
      ============================================================ */}
      {detailProduct && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setDetailProduct(null)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
              {/* Avatar */}
              {detailProduct.image_url ? (
                <img src={detailProduct.image_url} alt={detailProduct.name}
                  className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-base shrink-0">
                  {detailProduct.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate text-sm">{detailProduct.name}</p>
                <p className="text-xs text-gray-500 font-mono">{detailProduct.sku}</p>
              </div>
              {/* Actions in header */}
              {!isReadOnly && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { onEditProduct(detailProduct); setDetailProduct(null); }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Edit Barang
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus ${detailProduct.name}?`)) {
                        onDeleteProduct(detailProduct.id);
                        setDetailProduct(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-red-200"
                  >
                    Hapus
                  </button>
                </div>
              )}
              <button
                onClick={() => setDetailProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer ml-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white shrink-0 overflow-x-auto">
              {([
                { key: 'data', label: 'Data Barang' },
                { key: 'harga', label: 'Tipe Harga' },
                { key: 'satuan', label: 'Multi Satuan' },
                { key: 'varian', label: 'Varian' },
                { key: 'paket', label: 'Paket' },
                { key: 'bahan', label: 'Bahan Baku' },
              ] as { key: typeof detailTab; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`px-4 py-2.5 text-xs font-semibold shrink-0 border-b-2 transition-colors cursor-pointer ${
                    detailTab === tab.key
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {detailTab === 'data' && (
                <div className="p-4 space-y-0">
                  {/* Info rows */}
                  {([
                    { label: 'Kode', value: detailProduct.sku },
                    { label: 'Nama', value: detailProduct.name },
                    { label: 'Tipe Barang', value: detailProduct.item_type || 'Default' },
                    { label: 'Kategori', value: detailProduct.category },
                    { label: 'Harga Beli', value: `Rp ${(detailProduct.price_buy || 0).toLocaleString('id-ID')}` },
                    { label: 'Harga Jual', value: `Rp ${(detailProduct.price_sell || 0).toLocaleString('id-ID')}` },
                    { label: 'Diskon', value: detailProduct.discount ? `${detailProduct.discount}${detailProduct.discount_type || '%'}` : '0%' },
                    { label: 'Jenis Stok (Barang/Jasa)', value: detailProduct.use_stock === false ? 'Jasa (Unlimited)' : 'Barang (Limited Stock)' },
                    { label: 'Stok', value: detailProduct.use_stock !== false ? String(detailProduct.stock) : '∞' },
                    { label: 'Batas Minimum Stok', value: String(detailProduct.min_stock || 0) },
                    { label: 'Satuan', value: (detailProduct.units && detailProduct.units.length > 0) ? detailProduct.units[0].unitName : '-' },
                    { label: 'Letak Rak', value: detailProduct.location || '-' },
                    { label: 'Keterangan', value: detailProduct.description || '-' },
                    { label: 'Tampilkan di Toko', value: detailProduct.show_in_transaction !== false ? 'Tampil' : 'Tersembunyi' },
                    { label: 'Dibuat', value: detailProduct.created_at ? new Date(detailProduct.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' },
                  ]).map(row => (
                    <div key={row.label} className="flex items-start py-2.5 border-b border-gray-50">
                      <span className="text-xs text-gray-500 w-44 shrink-0">{row.label}</span>
                      <span className="text-xs font-semibold text-gray-900 flex-1">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'harga' && (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-500 mb-2">Harga berdasarkan tipe pelanggan</p>
                  {([
                    { label: 'Harga Umum', value: detailProduct.price_sell },
                    { label: 'Harga Member', value: detailProduct.price_sell_member },
                    { label: 'Harga Grosir', value: detailProduct.price_sell_grosir },
                    { label: 'Harga Agen', value: detailProduct.price_sell_agen },
                  ]).map(row => (
                    <div key={row.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                      <span className="text-xs text-gray-600">{row.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {row.value ? `Rp ${row.value.toLocaleString('id-ID')}` : <span className="text-gray-400 font-normal text-xs">Belum diatur</span>}
                      </span>
                    </div>
                  ))}
                  {detailProduct.price_tiers && detailProduct.price_tiers.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Tier Harga</p>
                      {detailProduct.price_tiers.map(tier => (
                        <div key={tier.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1.5">
                          <span className="text-xs text-gray-600">{tier.customerType} — min {tier.minQty} pcs</span>
                          <span className="text-xs font-bold text-gray-900">Rp {tier.price.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'satuan' && (
                <div className="p-4">
                  {detailProduct.units && detailProduct.units.length > 0 ? (
                    <div className="space-y-2">
                      {detailProduct.units.map((unit, idx) => (
                        <div key={unit.id} className="bg-gray-50 rounded-lg px-3 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">{unit.unitName}</span>
                            {idx > 0 && <span className="text-xs text-gray-500">× {unit.conversionMultiplier}</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Harga Jual: Rp {unit.price_sell_umum.toLocaleString('id-ID')}</p>
                          {unit.sku_unit && <p className="text-xs font-mono text-gray-400 mt-0.5">{unit.sku_unit}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <Package size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Barang ini tidak menggunakan Multisatuan</p>
                    </div>
                  )}
                </div>
              )}

              {(detailTab === 'varian' || detailTab === 'paket' || detailTab === 'bahan') && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 p-4">
                  <Tag size={32} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">Fitur ini belum diatur</p>
                  <p className="text-xs mt-1 text-gray-400 text-center">Klik Edit Barang untuk mengatur fitur ini dari form lengkap</p>
                  {!isReadOnly && (
                    <button
                      onClick={() => { onEditProduct(detailProduct); setDetailProduct(null); }}
                      className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-teal-700"
                    >
                      Edit Barang
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
