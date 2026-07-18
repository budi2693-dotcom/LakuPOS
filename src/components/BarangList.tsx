import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
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

  return (
    <div className="bg-white h-full flex flex-col font-sans overflow-hidden border border-gray-200 shadow-sm m-4 md:m-6 rounded-lg">
      <div className="p-4 md:p-6 flex-1 overflow-y-auto">
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

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 text-[13px] text-gray-600 bg-[#F9FAFB]">
                  <th className="py-3.5 px-4 font-semibold w-10">
                    <input type="checkbox" className="rounded border-gray-300 text-[#00A980] focus:ring-[#00A980] cursor-pointer" />
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
                  filteredProducts.map(product => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors text-[13px] text-gray-700">
                      <td className="py-3 px-4">
                        <input type="checkbox" className="rounded border-gray-300 text-[#00A980] focus:ring-[#00A980] cursor-pointer" />
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
                        Default
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        Yuk Lebih Dilengkapi
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => onEditProduct(product)}
                          className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded-[4px] border border-gray-300 transition-colors shadow-sm text-[12px]"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}
