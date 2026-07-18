import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  MoreVertical, 
  Bell, 
  ArrowUpDown, 
  Search, 
  Barcode,
  ChevronDown,
  Plus
} from 'lucide-react';
import { Product } from '../types';

interface BarangListProps {
  products: Product[];
  onBack: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleSidebar?: () => void;
}

export default function BarangList({ products, onBack, onAddProduct, onEditProduct, onToggleSidebar }: BarangListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua item');

  // UI States
  const [showMenu, setShowMenu] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Filter States
  const [sortOrder, setSortOrder] = useState('Urutan Naik');
  const [sortBy, setSortBy] = useState('Nama Barang');
  const [activeNotifFilter, setActiveNotifFilter] = useState<'Semua' | 'Habis' | 'Menipis'>('Semua');

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive categories from products
  const categories = ['Semua item', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Apply filters & sort
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'Semua item' || product.category === activeCategory;
    
    let matchesNotif = true;
    if (activeNotifFilter === 'Habis') matchesNotif = product.stock === 0;
    if (activeNotifFilter === 'Menipis') matchesNotif = product.stock > 0 && product.stock <= 5;
    
    return matchesSearch && matchesCategory && matchesNotif;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'Nama Barang') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'Kode Barang (SKU)') {
      comparison = (a.sku || '').localeCompare(b.sku || '');
    } else if (sortBy === 'Harga Jual') {
      comparison = a.price_sell - b.price_sell;
    } else if (sortBy === 'Stok Paling Sedikit' || sortBy === 'Stok') {
      comparison = a.stock - b.stock;
    } else if (sortBy === 'Stok Paling Banyak') {
      comparison = b.stock - a.stock;
    } else if (sortBy === 'Produk Terbaru') {
      comparison = (b.id || '').localeCompare(a.id || '');
    }
    return sortOrder === 'Urutan Naik' ? comparison : -comparison;
  });

  const getInitials = (name: string) => {
    return name.substring(0, 2).charAt(0).toUpperCase() + name.substring(1, 2).toLowerCase();
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Mock stock stats
  const stockHabisCount = products.filter(p => p.stock === 0).length;
  const stockMenipisCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const stockTotalCount = products.reduce((acc, curr) => acc + curr.stock, 0);

  return (
    <div className="bg-white h-full flex flex-col font-sans overflow-hidden relative">
      {/* Top App Bar */}
      <div className="flex items-center px-4 h-14 border-b border-gray-100 bg-white shrink-0 relative">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-[#00A980] hover:bg-emerald-50 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-bold text-gray-900 tracking-wide ml-2">
          Barang atau Jasa
        </h1>
        
        <div ref={menuRef} className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-teal-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <MoreVertical size={24} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-2">
              <button className="w-full text-left px-4 py-3 text-[15px] text-gray-700 hover:bg-gray-50">Import Excel (csv)</button>
              <button className="w-full text-left px-4 py-3 text-[15px] text-gray-700 hover:bg-gray-50">Export Excel (csv)</button>
              <button className="w-full text-left px-4 py-3 text-[15px] text-gray-700 hover:bg-gray-50">Cetak Stok</button>
              <button className="w-full text-left px-4 py-3 text-[15px] text-gray-700 hover:bg-gray-50">Pengaturan</button>
              <button className="w-full text-left px-4 py-3 text-[15px] text-gray-700 hover:bg-gray-50">Rincian</button>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 md:px-6 py-3 bg-white shrink-0">
        <div className="flex items-center gap-2 md:gap-4 mb-3">
          <button className="text-[#00A980] pr-1">
            <ArrowUpDown size={22} />
          </button>
          
          <div className="flex-1 relative flex items-center">
            <div className="absolute left-3 text-gray-500">
              <Search size={20} />
            </div>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border-2 border-[#00A980] rounded-xl text-[14px] md:text-[15px] focus:outline-none transition-shadow"
            />
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <button 
              onClick={() => searchInputRef.current?.focus()}
              className="p-1.5 text-[#00A980] hover:bg-teal-50 rounded-xl transition-colors"
            >
              <Barcode size={26} />
            </button>

            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-2 md:p-2.5 text-teal-600 hover:bg-teal-50 rounded-xl relative transition-colors"
              >
                <Bell size={22} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col origin-top-right">
                  <h2 className="text-center font-bold text-[15px] py-3.5 border-b border-gray-100">
                    NOTIFIKASI
                  </h2>
                  <div className="p-3 flex flex-col gap-2.5">
                    <div 
                      onClick={() => { setActiveNotifFilter('Habis'); setShowNotifDropdown(false); }}
                      className={`flex items-center justify-between border ${activeNotifFilter === 'Habis' ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-full px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span className="text-[14px] font-medium text-gray-800">Stok Habis : {stockHabisCount} Barang</span>
                      </div>
                      {activeNotifFilter === 'Habis' && <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>}
                    </div>
                    <div 
                      onClick={() => { setActiveNotifFilter('Menipis'); setShowNotifDropdown(false); }}
                      className={`flex items-center justify-between border ${activeNotifFilter === 'Menipis' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'} rounded-full px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                        <span className="text-[14px] font-medium text-gray-800">Stok Menipis : {stockMenipisCount} Barang</span>
                      </div>
                      {activeNotifFilter === 'Menipis' && <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>}
                    </div>
                    <div 
                      onClick={() => { setActiveNotifFilter('Semua'); setShowNotifDropdown(false); }}
                      className={`flex items-center justify-between border ${activeNotifFilter === 'Semua' ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200'} rounded-full px-3.5 py-2.5 cursor-pointer hover:bg-emerald-50/50 transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                        <span className="text-[14px] font-medium text-gray-800">Semua Stok : {stockTotalCount} Barang</span>
                      </div>
                      {activeNotifFilter === 'Semua' && <div className="w-2 h-2 rounded-full bg-teal-500 mr-2"></div>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="p-2 md:p-2.5 text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
              >
                <ArrowUpDown size={22} />
              </button>
              
              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col origin-top-right">
                  <h2 className="text-center font-bold text-[15px] py-3.5 border-b border-gray-100">
                    FILTER
                  </h2>
                  <div className="p-4 flex flex-col gap-5">
                    {/* Urutan */}
                    <div>
                      <h3 className="text-[14px] font-bold text-teal-600 mb-2">URUTAN BERDASARKAN</h3>
                      <div className="flex flex-col gap-2">
                        {['Urutan Naik', 'Urutan Turun'].map((order) => (
                          <label key={order} className="flex items-center gap-3 cursor-pointer group" onClick={() => setSortOrder(order)}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sortOrder === order ? 'border-teal-500' : 'border-gray-300 group-hover:border-teal-400'}`}>
                              {sortOrder === order && <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>}
                            </div>
                            <span className="text-[14px] text-gray-700">{order}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Sort By */}
                    <div>
                      <div className="flex flex-col gap-2">
                        {['Nama Barang', 'Kode Barang (SKU)', 'Stok Paling Sedikit', 'Stok Paling Banyak', 'Kategori', 'Barang Paling Laku', 'Barang Kurang Laku'].map((option) => (
                          <label key={option} className="flex items-center gap-3 cursor-pointer group" onClick={() => setSortBy(option)}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${sortBy === option ? 'border-teal-500' : 'border-gray-300 group-hover:border-teal-400'}`}>
                              {sortBy === option && <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>}
                            </div>
                            <span className="text-[14px] text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button 
                      onClick={() => setShowFilterDropdown(false)}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl transition-colors text-[14px]"
                    >
                      TERAPKAN
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={onAddProduct}
              className="ml-2 hidden md:flex bg-[#0D9488] hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors text-[15px] items-center gap-2"
            >
              Tambah Barang
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
          {categories.map((cat, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[13px] transition-colors border ${
                activeCategory === cat 
                  ? 'bg-emerald-50 text-[#00A980] border-[#00A980]' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {cat === 'Semua item' ? 'Semua' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto pb-6 relative z-0">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-700">Tidak ada barang ditemukan.</p>
            <p className="text-sm text-gray-500 mt-1">Coba gunakan kata kunci lain atau tambah barang baru.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => onEditProduct(product)}
                className="flex gap-4 p-4 border-b border-gray-100 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-medium text-[15px] shrink-0">
                  {getInitials(product.name)}
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="text-[13px] md:text-[14px] text-gray-900 leading-snug uppercase line-clamp-2 pr-2">
                      {product.name}
                    </h3>
                    <div className={`text-[14px] font-bold shrink-0 ${product.stock > 0 ? 'text-[#00A980]' : 'text-red-500'}`}>
                      {product.stock}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <span className="text-[12px] text-gray-600 font-medium break-all line-clamp-1 pr-2">
                      {product.sku || '-'}
                    </span>
                    <span className="text-[12px] text-gray-700 whitespace-nowrap">
                      {formatRupiah(product.price_buy || 0)} . {formatRupiah(product.price_sell)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Add Button Mobile */}
      <div className="md:hidden sticky bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-20">
        <button 
          onClick={onAddProduct}
          className="w-full bg-[#00A980] hover:bg-[#008f6c] text-white font-bold py-3.5 rounded-full shadow-lg transition-colors text-[14px] uppercase tracking-wide"
        >
          TAMBAH BARANG
        </button>
      </div>

    </div>
  );
}

