/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Layers,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Menu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Product, InventoryStats } from '../types';
import { calculateStats } from '../lib/dbManager';

interface DashboardProps {
  products: Product[];
  onNavigateToCatalog: () => void;
  onNavigateToLowStock: () => void;
  onToggleSidebar?: () => void;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6b7280', // gray
];

export default function Dashboard({
  products,
  onNavigateToCatalog,
  onNavigateToLowStock,
  onToggleSidebar,
}: DashboardProps) {
  const stats = useMemo(() => calculateStats(products), [products]);

  const typeStats = useMemo(() => {
    let physical = 0;
    let service = 0;
    let bundle = 0;
    for (const p of products) {
      const t = p.product_type || 'physical';
      if (t === 'physical') physical++;
      else if (t === 'service') service++;
      else if (t === 'bundle') bundle++;
    }
    return { physical, service, bundle };
  }, [products]);

  // Format currency to Indonesian Rupiah
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare data for Category Stock chart
  const categoryData = useMemo(() => {
    const map: { [key: string]: { name: string; stock: number; value: number; count: number } } = {};
    for (const p of products) {
      if (!map[p.category]) {
        map[p.category] = { name: p.category, stock: 0, value: 0, count: 0 };
      }
      map[p.category].stock += p.stock;
      map[p.category].value += p.stock * p.price_buy;
      map[p.category].count += 1;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [products]);

  // Prepare top 5 expensive assets
  const topAssets = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.stock * b.price_sell) - (a.stock * a.price_sell))
      .slice(0, 5);
  }, [products]);

  // Recent low stock items
  const alertItems = useMemo(() => {
    return products
      .filter((p) => p.stock <= p.min_stock)
      .slice(0, 5);
  }, [products]);

  return (
    <div className="bg-slate-50 h-full flex flex-col font-sans overflow-hidden">
      {/* Top App Bar */}
      <div className="flex items-center px-6 h-16 border-b border-gray-100 bg-white shrink-0">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <h1 className="flex-1 text-left text-lg font-bold text-teal-600 tracking-wide md:ml-0 ml-2">
          DASHBOARD UTAMA
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto w-full space-y-6 pb-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Barang */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Jenis Barang</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
              {stats.totalItems.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md mt-1">
              Fisik: <span className="text-blue-600">{typeStats.physical}</span> • Jasa: <span className="text-emerald-600">{typeStats.service}</span> • Paket: <span className="text-purple-600">{typeStats.bundle}</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Package size={22} />
          </div>
        </div>

        {/* Total Kuantitas Stok */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-500">Total Unit Stok</span>
            <h3 className="text-3xl font-semibold text-gray-900 tracking-tight">
              {stats.totalStock.toLocaleString('id-ID')}
            </h3>
            <p className="text-xs text-gray-400">Pcs / pack terdaftar di gudang</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Layers size={22} />
          </div>
        </div>

        {/* Total Nilai Aset */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-500">Nilai Investasi Aset</span>
            <h3 className="text-2xl font-semibold text-gray-900 tracking-tight truncate max-w-[200px]">
              {formatRupiah(stats.totalAssetValue)}
            </h3>
            <p className="text-xs text-gray-400">Berdasarkan Harga Beli awal</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Stok Krisis / Kosong */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-500">Stok Kritis / Habis</span>
            <h3 className="text-3xl font-semibold text-red-600 tracking-tight">
              {stats.lowStockCount + stats.outOfStockCount}
            </h3>
            <p className="text-xs text-gray-400">
              <span className="text-red-500 font-medium">{stats.outOfStockCount} Habis</span> • {stats.lowStockCount} Menipis
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Bar Chart Kuantitas per Kategori */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Distribusi Unit Stok per Kategori
          </h4>
          <div className="h-72 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <Package size={32} className="mb-2 stroke-1" />
                Belum ada data visualisasi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString('id-ID')} unit`, 'Total Stok']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6' }}
                  />
                  <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={36}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Pie Chart Porsi Nilai Aset per Kategori */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers size={18} className="text-emerald-500" />
            Porsi Nilai Aset Kategori
          </h4>
          <div className="h-72 w-full relative flex flex-col justify-between">
            {categoryData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <Layers size={32} className="mb-2 stroke-1" />
                Belum ada data porsi aset
              </div>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatRupiah(Number(value)), 'Nilai Aset']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom list of categories legend to fit small box */}
                <div className="overflow-y-auto max-h-[90px] text-xs space-y-1.5 pr-1">
                  {categoryData.slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-gray-600">
                      <div className="flex items-center gap-2 truncate max-w-[130px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="truncate">{entry.name}</span>
                      </div>
                      <span className="font-medium text-gray-800">{formatRupiah(entry.value)}</span>
                    </div>
                  ))}
                  {categoryData.length > 4 && (
                    <div className="text-right text-[10px] text-gray-400 font-medium">
                      + {categoryData.length - 4} kategori lainnya
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row (Alerts & Assets) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Stok Kritis */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                Peringatan Stok Kritis ({alertItems.length})
              </h4>
              <button
                onClick={onNavigateToLowStock}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                Lihat Semua <ArrowRight size={14} />
              </button>
            </div>

            {alertItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-sm">
                <CheckCircle size={36} className="text-emerald-500 mb-2 stroke-1" />
                <span className="text-gray-800 font-medium text-center">Stok Aman Terkendali</span>
                <span className="text-xs text-gray-400 mt-0.5">Semua barang memiliki stok di atas batas minimum.</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
                {alertItems.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5 pr-2 truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-[10px]">{p.sku}</span>
                        <span>Kategori: {p.category}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {p.stock === 0 ? 'Habis' : `${p.stock} pcs tersisa`}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Min: {p.min_stock} pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Nilai Penjualan Tertinggi */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                Aset Bernilai Jual Tertinggi
              </h4>
              <button
                onClick={onNavigateToCatalog}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                Lihat Katalog <ArrowRight size={14} />
              </button>
            </div>

            {topAssets.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 text-sm">
                <Package size={36} className="mb-2 stroke-1" />
                Belum ada produk terdaftar
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topAssets.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5 pr-2 truncate">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-[10px]">{p.sku}</span>
                        <span>Stok: {p.stock} pcs</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatRupiah(p.stock * p.price_sell)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">@ {formatRupiah(p.price_sell)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
