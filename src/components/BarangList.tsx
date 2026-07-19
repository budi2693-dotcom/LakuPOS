import React, { useState, useMemo } from 'react';
import { Search, X, Package, Tag, Trash2 } from 'lucide-react';
import { Product } from '../types';

interface BarangListProps {
  products: Product[];
  onBack: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleSidebar?: () => void;
  onGoToImportProduk?: () => void;
  onDeleteProduct?: (id: string) => void;
  onBulkDeleteProducts?: (ids: string[]) => void;
}

// Generate a deterministic pastel color from a string
function getAvatarColor(name: string): string {
  const colors = [
    '#00A980', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
    '#10B981', '#F97316', '#06B6D4', '#EC4899', '#6366F1',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function BarangList({
  products,
  onAddProduct,
  onEditProduct,
  onGoToImportProduk,
  onDeleteProduct,
  onBulkDeleteProducts,
}: BarangListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select & Detail States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailTab, setDetailTab] = useState<'data' | 'harga' | 'satuan' | 'varian' | 'imei' | 'paket' | 'bahan'>('data');

  // Apply search
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [products, searchQuery]);

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const SortIcon = () => (
    <span className="text-[8px] text-gray-400 ml-1 inline-flex flex-col -space-y-1">
      <span>&#9650;</span>
      <span>&#9660;</span>
    </span>
  );

  // Checkbox helpers
  const allPageSelected =
    filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));
  const somePageSelected =
    filteredProducts.some(p => selectedIds.has(p.id)) && !allPageSelected;

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
    if (onBulkDeleteProducts) {
      onBulkDeleteProducts(Array.from(selectedIds));
    } else if (onDeleteProduct) {
      selectedIds.forEach(id => onDeleteProduct(id));
    }
    setSelectedIds(new Set());
  };

  const openDetail = (product: Product) => {
    setDetailProduct(product);
    setDetailTab('data');
  };

  // ─── TABS CONFIG ─────────────────────────────────────────────────────────────
  type TabKey = typeof detailTab;
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'data', label: 'Data Barang' },
    { key: 'harga', label: 'Tipe Harga' },
    { key: 'satuan', label: 'Multi Satuan' },
    { key: 'varian', label: 'Varian' },
    { key: 'imei', label: 'Multi IMEI' },
    { key: 'paket', label: 'Paket' },
    { key: 'bahan', label: 'Bahan Baku' },
  ];

  // ─── SCORE LABEL ─────────────────────────────────────────────────────────────
  const getScore = (p: Product): string => {
    let score = 0;
    if (p.name) score += 20;
    if (p.sku) score += 15;
    if (p.category) score += 15;
    if (p.price_buy && p.price_buy > 0) score += 15;
    if (p.description) score += 20;
    if (p.units && p.units.length > 0) score += 15;
    if (score < 60) return 'Yuk Lebih Dilengkapi';
    if (score < 85) return 'Hampir Lengkap';
    return 'Lengkap';
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col font-sans overflow-hidden bg-gray-50 relative">
      {/* ── PINNED HEADER ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 pt-4 pb-3">
        {/* Buttons row 1 */}
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={onAddProduct}
            className="bg-[#00A980] hover:bg-[#00906D] text-white font-semibold px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm cursor-pointer"
          >
            Tambah Produk
          </button>
          <button
            onClick={onGoToImportProduk}
            className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-semibold px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm cursor-pointer"
          >
            Import Produk Baru
          </button>
          <button className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-semibold px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm cursor-pointer">
            Export/Import Edit Produk
          </button>
          <button className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-semibold px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm cursor-pointer">
            Export/Import Tipe Produk
          </button>
        </div>

        {/* Buttons row 2 + search */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed font-semibold px-4 py-1.5 rounded text-[13px]">
            Export Barcode
          </button>
          <button className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-semibold px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm cursor-pointer">
            Export Label Maker
          </button>
          <button className="bg-white border border-[#00A980] text-[#00A980] hover:bg-emerald-50 font-semibold px-4 py-1.5 rounded text-[13px] transition-colors shadow-sm cursor-pointer">
            Manajemen Bulk
          </button>
          <div className="relative ml-auto">
            <input
              type="text"
              placeholder="Cari Barang atau Jasa"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-3 pr-9 py-1.5 border border-gray-200 rounded text-[13px] w-[240px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] shadow-sm transition-all"
            />
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Bulk delete bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-2.5 rounded-lg shadow-sm mt-3">
            <span className="font-semibold text-sm flex-1">{selectedIds.size} barang dipilih</span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-white text-red-600 px-4 py-1.5 rounded text-[13px] font-bold hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Hapus Barang
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 hover:bg-red-500 rounded transition-colors cursor-pointer"
              title="Batalkan pilihan"
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>

      {/* ── TABLE (SCROLLABLE) ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-[13px] bg-white min-w-[1050px]">
          <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-gray-200">
            <tr className="text-gray-600">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={el => { if (el) el.indeterminate = somePageSelected; }}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-[#00A980] focus:ring-[#00A980] cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 font-semibold">Kode <SortIcon /></th>
              <th className="py-3 px-3 font-semibold">Nama <SortIcon /></th>
              <th className="py-3 px-3 font-semibold">Kategori <SortIcon /></th>
              <th className="py-3 px-3 font-semibold text-right">Harga Jual<br/>(Rp) <SortIcon /></th>
              <th className="py-3 px-3 font-semibold text-right">Harga Dasar<br/>(Rp) <SortIcon /></th>
              <th className="py-3 px-3 font-semibold text-right">Stok <SortIcon /></th>
              <th className="py-3 px-3 font-semibold text-right">Diskon <SortIcon /></th>
              <th className="py-3 px-3 font-semibold">Tipe Barang <SortIcon /></th>
              <th className="py-3 px-3 font-semibold">Score</th>
              <th className="py-3 px-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-gray-400 text-[13px]">
                  <Package size={36} className="mx-auto mb-3 opacity-20" />
                  Tidak ada data barang ditemukan.
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => {
                const isSelected = selectedIds.has(product.id);
                const itemType = product.item_type || 'Default';
                const initials = product.name.substring(0, 2).toUpperCase();
                const avatarBg = getAvatarColor(product.name);

                return (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}
                  >
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(product.id)}
                        className="rounded border-gray-300 text-[#00A980] focus:ring-[#00A980] cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                          style={{ backgroundColor: avatarBg }}
                        >
                          {initials}
                        </div>
                        <span className="text-gray-500 font-medium">{product.sku || '-'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[180px]">
                      <span className="line-clamp-2">{product.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{product.category || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{formatRupiah(product.price_sell)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500">{formatRupiah(product.price_buy || 0)}</td>
                    <td className="py-2.5 px-3 text-right">{product.use_stock === false ? '∞' : product.stock}</td>
                    <td className="py-2.5 px-3 text-right">
                      {product.discount > 0
                        ? product.discount_type === '%'
                          ? `${product.discount}%`
                          : formatRupiah(product.discount)
                        : '0%'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{itemType}</td>
                    <td className="py-2.5 px-3 text-gray-400 text-[12px]">{getScore(product)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => openDetail(product)}
                        className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-3 py-1 rounded border border-gray-300 transition-colors shadow-sm text-[12px] cursor-pointer whitespace-nowrap"
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

      {/* ── DETAIL PANEL ──────────────────────────────────────────────────────── */}
      {detailProduct && (() => {
        const p = detailProduct;
        const initials = p.name.substring(0, 2).toUpperCase();
        const avatarBg = getAvatarColor(p.name);
        const itemType = p.item_type || 'Default';

        const now = new Date();
        const lastUpdated = now.toLocaleString('id-ID', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });

        const showToko =
          p.show_in_transaction !== false ? 'Tampil' : 'Sembunyikan';

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setDetailProduct(null)}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-[440px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
              {/* ── Panel Header ── */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
                <button
                  onClick={() => { onEditProduct(p); setDetailProduct(null); }}
                  className="px-4 py-1.5 bg-[#00A980] hover:bg-[#00906D] text-white rounded text-[13px] font-bold cursor-pointer transition-colors"
                >
                  Edit Barang
                </button>
                <div className="flex-1" />
                {onDeleteProduct && (
                  <button
                    onClick={() => {
                      if (confirm(`Hapus ${p.name}?`)) {
                        onDeleteProduct(p.id);
                        setDetailProduct(null);
                      }
                    }}
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-[13px] font-bold cursor-pointer transition-colors"
                  >
                    Hapus
                  </button>
                )}
                <button
                  onClick={() => setDetailProduct(null)}
                  className="ml-1 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Tabs ── */}
              <div className="flex border-b border-gray-100 bg-white shrink-0 overflow-x-auto scrollbar-none">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`px-3 py-2.5 text-[12px] font-semibold shrink-0 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      detailTab === tab.key
                        ? 'border-[#00A980] text-[#00A980]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Tab Content ── */}
              <div className="flex-1 overflow-y-auto bg-gray-50/40">

                {/* DATA BARANG TAB */}
                {detailTab === 'data' && (
                  <div className="p-4">
                    {/* Avatar + Score */}
                    <div className="flex flex-col items-center mb-5 pt-2">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center font-black text-[22px] text-white shadow-sm mb-2"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {initials}
                      </div>
                      {/* Score label */}
                      <p className="text-[12px] text-gray-500 mt-1">
                        Score Barang: <span className="font-semibold text-amber-600">{getScore(p)}</span>
                      </p>
                    </div>

                    {/* 2-column info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                      {([
                        { label: 'Tipe Barang', value: itemType },
                        { label: 'Kode', value: p.sku || '-' },
                        { label: 'Harga Beli', value: `Rp ${(p.price_buy || 0).toLocaleString('id-ID')}` },
                        { label: 'Nama', value: p.name },
                        { label: 'Jenis Stok (Barang/Jasa)', value: p.use_stock === false ? 'Jasa (Unlimited)' : 'Barang (Limited Stock)' },
                        { label: 'Kategori', value: p.category || '-' },
                        { label: 'Satuan', value: (p.units && p.units.length > 0) ? p.units[0].unitName : '-' },
                        { label: 'Harga Jual', value: `Rp ${(p.price_sell || 0).toLocaleString('id-ID')}` },
                        { label: 'Diskon', value: p.discount > 0 ? `${p.discount}${p.discount_type || '%'}` : '0%' },
                        { label: 'Stok', value: p.use_stock === false ? '∞' : String(p.stock ?? 0) },
                        { label: 'Tampilan di Toko', value: showToko },
                        { label: 'Berat (dalam gram)', value: String(p.weight ?? 0) },
                        { label: 'Keterangan', value: p.description || '-' },
                        { label: 'Letak Rak', value: p.location || '-' },
                        { label: 'Tampilan di Olshopin', value: showToko },
                        { label: 'Terakhir Diubah', value: lastUpdated },
                      ].map(row => (
                        <div key={row.label} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
                          <p className="text-[11px] text-gray-400 mb-0.5">{row.label}</p>
                          <p className="text-[13px] font-semibold text-gray-800 break-words">{row.value}</p>
                        </div>
                      )))}
                    </div>
                  </div>
                )}

                {/* TIPE HARGA TAB */}
                {detailTab === 'harga' && (
                  <div className="p-4 space-y-3">
                    <p className="text-[13px] text-gray-500">Harga berdasarkan tipe pelanggan</p>
                    {([
                      { label: 'Harga Umum', value: p.price_sell },
                      { label: 'Harga Member', value: p.price_sell_member },
                      { label: 'Harga Grosir', value: p.price_sell_grosir },
                      { label: 'Harga Agen', value: p.price_sell_agen },
                    ]).map(row => (
                      <div key={row.label} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3 shadow-sm">
                        <span className="text-[13px] text-gray-600">{row.label}</span>
                        <span className="text-[14px] font-bold text-[#00A980]">
                          {row.value
                            ? `Rp ${row.value.toLocaleString('id-ID')}`
                            : <span className="text-gray-400 font-normal text-[13px]">Belum diatur</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* MULTI SATUAN TAB */}
                {detailTab === 'satuan' && (
                  <div className="p-4">
                    {p.units && p.units.length > 0 ? (
                      <div className="space-y-3">
                        {p.units.map((unit, idx) => (
                          <div key={unit.id} className="bg-white border border-gray-100 shadow-sm rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[14px] font-bold text-gray-900">{unit.unitName}</span>
                              {idx > 0 && (
                                <span className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  × {unit.conversionMultiplier}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-500 mt-1">
                              Harga Jual:{' '}
                              <span className="font-semibold text-gray-900">
                                Rp {unit.price_sell_umum.toLocaleString('id-ID')}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Package size={40} className="mb-3 opacity-20 text-[#00A980]" />
                        <p className="text-[13px]">Barang ini tidak menggunakan Multisatuan</p>
                        <button
                          onClick={() => { onEditProduct(p); setDetailProduct(null); }}
                          className="mt-4 px-4 py-2 bg-white border border-[#00A980] text-[#00A980] rounded text-[13px] font-semibold cursor-pointer hover:bg-emerald-50 shadow-sm"
                        >
                          Edit Barang
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* OTHER TABS */}
                {(detailTab === 'varian' || detailTab === 'imei' || detailTab === 'paket' || detailTab === 'bahan') && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 p-5">
                    <Tag size={40} className="mb-3 opacity-20 text-[#00A980]" />
                    <p className="text-[14px] font-medium text-gray-600">Fitur ini belum diatur</p>
                    <p className="text-[12px] mt-1 text-gray-400 text-center max-w-[240px]">
                      Klik Edit Barang untuk mengatur fitur ini dari form lengkap
                    </p>
                    <button
                      onClick={() => { onEditProduct(p); setDetailProduct(null); }}
                      className="mt-4 px-4 py-2 bg-white border border-[#00A980] text-[#00A980] rounded text-[13px] font-semibold cursor-pointer hover:bg-emerald-50 shadow-sm"
                    >
                      Edit Barang
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
