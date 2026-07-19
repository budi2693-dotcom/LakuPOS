import React, { useState, useMemo } from 'react';
import { Search, X, Package, Tag, Trash2, Edit2 } from 'lucide-react';
import { Product } from '../types';

interface BarangListProps {
  products: Product[];
  onBack: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleSidebar?: () => void;
  onGoToImportProduk?: () => void;
  onDeleteProduct?: (id: string) => void;
}

export default function BarangList({
  products,
  onAddProduct,
  onEditProduct,
  onGoToImportProduk,
}: BarangListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-select & Detail States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailTab, setDetailTab] = useState<'data' | 'harga' | 'satuan' | 'varian' | 'paket' | 'bahan'>('data');

  // Apply search
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [products, searchQuery]);

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const SortIcon = () => (
    <span className="text-[8px] text-gray-400 ml-1 inline-flex flex-col -space-y-1">
      <span>&#9650;</span>
      <span>&#9660;</span>
    </span>
  );

  // Checkbox helpers
  const allPageSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));
  const somePageSelected = filteredProducts.some(p => selectedIds.has(p.id)) && !allPageSelected;

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.add(p.id));
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
    if (onDeleteProduct) {
      selectedIds.forEach(id => onDeleteProduct(id));
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white h-full flex flex-col font-sans overflow-hidden border border-gray-200 shadow-sm m-4 md:m-6 rounded-lg relative">
      <div className="p-4 md:p-6 flex-1 overflow-auto">
        <div className="max-w-full mx-auto">
          {/* Header Action Buttons & Search */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-2.5">
                <button 
                  onClick={onAddProduct}
                  className="bg-[#00A980] hover:bg-[#00906D] text-white font-medium px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm"
                >
                  Tambah Produk
                </button>
                <button 
                  onClick={onGoToImportProduk}
                  className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-medium px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm"
                >
                  Import Produk Baru
                </button>
                <button 
                  className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-medium px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm"
                >
                  Export/Import Edit Produk
                </button>
                <button 
                  className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-medium px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm"
                >
                  Export/Import Tipe Produk
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button 
                  className="bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed font-medium px-4 py-1.5 rounded text-[13px]"
                >
                  Export Barcode
                </button>
                <button 
                  className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-medium px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm"
                >
                  Export Label Maker
                </button>
                <button 
                  className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-medium px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm"
                >
                  Manajemen Bulk
                </button>
              </div>
            </div>
            
            <div className="relative shrink-0 w-full md:w-[280px]">
              <input 
                type="text" 
                placeholder="Cari Barang atau Jasa"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-1.5 border border-gray-200 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] shadow-sm transition-all"
              />
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Bulk Delete Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-lg shadow-sm mb-4">
              <span className="font-semibold text-sm flex-1">
                {selectedIds.size} barang dipilih
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 bg-white text-red-600 px-4 py-1.5 rounded text-[13px] font-bold hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                Hapus Barang
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 hover:bg-red-500 rounded transition-colors cursor-pointer"
                title="Batalkan pilihan"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 text-[13px] text-gray-600 bg-[#F9FAFB]">
                  <th className="py-3.5 px-4 font-semibold w-10">
                    <input 
                      type="checkbox" 
                      checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected; }}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-[#00A980] focus:ring-[#00A980] cursor-pointer" 
                    />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group">
                    Kode <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group">
                    Nama <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group">
                    Kategori <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group text-right">
                    Harga Jual (Rp) <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group text-right">
                    Harga Dasar (Rp) <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group text-right">
                    Stok <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group text-right">
                    Diskon <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group">
                    Tipe Barang <SortIcon />
                  </th>
                  <th className="py-3.5 px-4 font-semibold cursor-pointer hover:text-gray-900 group">
                    Score
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-500 text-[13px]">
                      Tidak ada data barang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => {
                    const isSelected = selectedIds.has(product.id);
                    const itemType = product.item_type || 'Default';
                    
                    return (
                    <tr key={product.id} className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors text-[13px] text-gray-700 ${isSelected ? 'bg-[#00A980]/5' : ''}`}>
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelectOne(product.id)}
                          className="rounded border-gray-300 text-[#00A980] focus:ring-[#00A980] cursor-pointer" 
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {getInitials(product.name)}
                          </div>
                          <span className="text-gray-500 font-medium">{product.sku || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {product.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {product.category || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatRupiah(product.price_sell)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {formatRupiah(product.price_buy || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {product.stock}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {product.discount > 0 ? (product.discount_type === '%' ? `${product.discount}%` : formatRupiah(product.discount)) : '0%'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {itemType}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        Yuk Lebih Dilengkapi
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => { setDetailProduct(product); setDetailTab('data'); }}
                          className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded-[4px] border border-gray-300 transition-colors shadow-sm text-[12px] cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>

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
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate text-[15px]">{detailProduct.name}</p>
                <p className="text-[13px] text-gray-500 font-mono">{detailProduct.sku}</p>
              </div>
              {/* Actions in header */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { onEditProduct(detailProduct); setDetailProduct(null); }}
                  className="px-3 py-1.5 bg-[#00A980] hover:bg-[#00906D] text-white rounded text-[13px] font-bold cursor-pointer transition-colors"
                >
                  Edit Barang
                </button>
                {onDeleteProduct && (
                  <button
                    onClick={() => {
                      if (confirm(`Hapus ${detailProduct.name}?`)) {
                        onDeleteProduct(detailProduct.id);
                        setDetailProduct(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[13px] font-bold cursor-pointer transition-colors border border-red-200"
                  >
                    Hapus
                  </button>
                )}
              </div>
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
                  className={`px-4 py-3 text-[13px] font-semibold shrink-0 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    detailTab === tab.key
                      ? 'border-[#00A980] text-[#00A980]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30">
              {detailTab === 'data' && (
                <div className="p-5 space-y-0">
                  {/* Info rows */}
                  {([
                    { label: 'Kode', value: detailProduct.sku },
                    { label: 'Nama', value: detailProduct.name },
                    { label: 'Tipe Barang', value: detailProduct.item_type || 'Default' },
                    { label: 'Kategori', value: detailProduct.category },
                    { label: 'Harga Beli', value: `Rp ${(detailProduct.price_buy || 0).toLocaleString('id-ID')}` },
                    { label: 'Harga Jual', value: `Rp ${(detailProduct.price_sell || 0).toLocaleString('id-ID')}` },
                    { label: 'Diskon', value: detailProduct.discount ? `${detailProduct.discount}${detailProduct.discount_type || '%'}` : '0%' },
                    { label: 'Jenis Stok', value: detailProduct.use_stock === false ? 'Jasa (Unlimited)' : 'Barang (Limited Stock)' },
                    { label: 'Stok', value: detailProduct.use_stock !== false ? String(detailProduct.stock) : '∞' },
                    { label: 'Batas Minimum Stok', value: String(detailProduct.min_stock || 0) },
                    { label: 'Satuan', value: (detailProduct.units && detailProduct.units.length > 0) ? detailProduct.units[0].unitName : '-' },
                    { label: 'Keterangan', value: detailProduct.description || '-' },
                  ]).map(row => (
                    <div key={row.label} className="flex items-start py-3 border-b border-gray-100 last:border-0">
                      <span className="text-[13px] text-gray-500 w-40 shrink-0">{row.label}</span>
                      <span className="text-[13px] font-semibold text-gray-900 flex-1 break-words">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'harga' && (
                <div className="p-5 space-y-3">
                  <p className="text-[13px] text-gray-500 mb-3">Harga berdasarkan tipe pelanggan</p>
                  {([
                    { label: 'Harga Umum', value: detailProduct.price_sell },
                    { label: 'Harga Member', value: detailProduct.price_sell_member },
                    { label: 'Harga Grosir', value: detailProduct.price_sell_grosir },
                    { label: 'Harga Agen', value: detailProduct.price_sell_agen },
                  ]).map(row => (
                    <div key={row.label} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3 shadow-sm">
                      <span className="text-[13px] text-gray-600">{row.label}</span>
                      <span className="text-[14px] font-bold text-[#00A980]">
                        {row.value ? `Rp ${row.value.toLocaleString('id-ID')}` : <span className="text-gray-400 font-normal text-[13px]">Belum diatur</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'satuan' && (
                <div className="p-5">
                  {detailProduct.units && detailProduct.units.length > 0 ? (
                    <div className="space-y-3">
                      {detailProduct.units.map((unit, idx) => (
                        <div key={unit.id} className="bg-white border border-gray-100 shadow-sm rounded-lg px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold text-gray-900">{unit.unitName}</span>
                            {idx > 0 && <span className="text-[13px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">× {unit.conversionMultiplier}</span>}
                          </div>
                          <p className="text-[13px] text-gray-500 mt-1">Harga Jual: <span className="font-semibold text-gray-900">Rp {unit.price_sell_umum.toLocaleString('id-ID')}</span></p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Package size={40} className="mx-auto mb-3 opacity-30 text-[#00A980]" />
                      <p className="text-[13px]">Barang ini tidak menggunakan Multisatuan</p>
                    </div>
                  )}
                </div>
              )}

              {(detailTab === 'varian' || detailTab === 'paket' || detailTab === 'bahan') && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-5">
                  <Tag size={40} className="mb-3 opacity-30 text-[#00A980]" />
                  <p className="text-[14px] font-medium text-gray-600">Fitur ini belum diatur</p>
                  <p className="text-[13px] mt-1 text-gray-400 text-center max-w-[250px]">Klik Edit Barang untuk mengatur fitur ini dari form lengkap</p>
                  <button
                    onClick={() => { onEditProduct(detailProduct); setDetailProduct(null); }}
                    className="mt-4 px-4 py-2 bg-white border border-[#00A980] text-[#00A980] rounded text-[13px] font-semibold cursor-pointer hover:bg-emerald-50 shadow-sm"
                  >
                    Edit Barang
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
