/**
 * Backoffice.tsx
 * Enterprise Dark Mode Analytics Dashboard for Veloce POS
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Wallet,
  Layers,
  PackagePlus,
  Users,
  UserCheck,
  LogOut,
  RefreshCcw,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Menu,
  X,
  ExternalLink,
  Database,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Product, Transaction, TransactionItem, StaffAccount, DatabaseConfig } from '../types';
import SalesReport from './SalesReport';
import { supabaseUpdateProduct } from '../lib/supabase';
import { supabase } from '../lib/supabaseClient';
import { addProducts } from '../lib/dbManager';
import FinanceReport from './FinanceReport';
import BarangList from './BarangList';
import StaffManagement from './StaffManagement';
import ProductImport from './ProductImport';
import DatabaseSettings from './DatabaseSettings';
import DummyDataGenerator from './DummyDataGenerator';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type BOModule = string;

export interface BackofficeProps {
  products: Product[];
  transactions: Transaction[];
  activeUser: StaffAccount;
  dbConfig: DatabaseConfig;
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
  onCancelTransaction: (txId: string, items: TransactionItem[]) => Promise<void>;
  onRefreshData: () => Promise<void>;
  onConfigChange: (config: DatabaseConfig) => void;
  onLogout: () => void;
  onNavigateToPOS: () => void;
  successMessage?: string | null;
  errorMessage?: string | null;
  onDismissSuccess?: () => void;
  onDismissError?: () => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatRupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v);

const formatShort = (v: number): string => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} Jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} rb`;
  return v.toLocaleString('id-ID');
};

// ─────────────────────────────────────────────
// Nav Config
// ─────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  isHighlight?: boolean;
  children?: NavItem[];
}

const SIDEBAR_MENU: NavItem[] = [
  { id: 'misi-hadiah', label: 'MISI HADIAH', badge: 'Baru' },
  { id: 'backoffice-v2', label: 'BACKOFFICE VERSI 2', badge: 'Baru' },
  { id: 'pembayaran', label: 'PEMBAYARAN', isHighlight: true },
  { id: 'dashboard', label: 'DASHBOARD' },
  {
    id: 'database-group',
    label: 'DATABASE',
    children: [
      { id: 'produk', label: 'Barang atau Jasa' },
      { id: 'import-produk', label: 'Import Produk' },
      { id: 'stok', label: 'Manajemen Stok' },
      { id: 'kategori', label: 'Kategori' },
      {
        id: 'pelanggan-supplier-group',
        label: 'Pelanggan & Supplier',
        children: [
          { id: 'pelanggan', label: 'Pelanggan' },
          { id: 'tipe-pelanggan', label: 'Tipe Pelanggan', badge: 'Baru' },
          { id: 'supplier', label: 'Supplier' },
        ],
      },
      {
        id: 'diskon-pajak-biaya-group',
        label: 'Diskon, Pajak, & Biaya',
        children: [
          { id: 'diskon', label: 'Diskon' },
          { id: 'pajak', label: 'Pajak' },
          { id: 'modul-biaya', label: 'Modul Biaya' },
        ],
      },
      { id: 'cash-drawer', label: 'Cash Drawer' },
      {
        id: 'marketing-group',
        label: 'Marketing',
        children: [
          { id: 'promosi', label: 'Promosi' },
          { id: 'poin', label: 'Poin' },
          { id: 'komisi', label: 'Komisi', badge: 'Baru' },
        ],
      },
      { id: 'stok-opname', label: 'Stok Opname' },
    ],
  },
  {
    id: 'transaksi-group',
    label: 'TRANSAKSI',
    children: [
      { id: 'transaksi-penjualan', label: 'Penjualan' },
      { id: 'pembelian', label: 'Pembelian' },
      { id: 'transaksi-keuangan', label: 'Keuangan' },
    ],
  },
  {
    id: 'laporan-group',
    label: 'LAPORAN',
    children: [
      { id: 'laba-rugi', label: 'Laba Rugi' },
      { id: 'laporan-keuangan', label: 'Keuangan' },
      {
        id: 'laporan-penjualan-group',
        label: 'Penjualan',
        children: [
          { id: 'lap-transaksi', label: 'Transaksi' },
          { id: 'lap-data-transaksi', label: 'Data Transaksi' },
          { id: 'laporan-penjualan', label: 'Penjualan Barang' }, // Maps to our actual component
          { id: 'lap-penjualan-kategori', label: 'Penjualan Kategori' },
        ],
      },
      {
        id: 'laporan-pembelian-group',
        label: 'Pembelian',
        children: [
          { id: 'lap-pembelian', label: 'Pembelian' },
          { id: 'lap-data-pembelian', label: 'Data Pembelian' },
        ],
      },
      { id: 'lap-poin', label: 'Poin' },
      { id: 'lap-pelanggan', label: 'Berdasarkan Pelanggan' },
      { id: 'lap-tukar-poin', label: 'Penukaran Barang Berpoin' },
      { id: 'lap-jual-poin', label: 'Penjualan Barang Berpoin' },
      {
        id: 'hutang-piutang-group',
        label: 'Hutang & Piutang',
        children: [
          { id: 'lap-hutang', label: 'Hutang' },
          { id: 'lap-piutang', label: 'Piutang' },
        ],
      },
      { id: 'lap-modal', label: 'Modal' },
      {
        id: 'retur-group',
        label: 'Retur',
        children: [
          { id: 'retur-transaksi', label: 'Retur Transaksi' },
          { id: 'retur-pembelian', label: 'Retur Pembelian' },
        ],
      },
      { id: 'lap-shift', label: 'Shift' },
      {
        id: 'biaya-group',
        label: 'Biaya',
        children: [
          { id: 'biaya-penjualan', label: 'Transaksi Penjualan' },
          { id: 'biaya-pembelian', label: 'Transaksi Pembelian' },
        ],
      },
      { id: 'lap-mdr', label: 'MDR' },
      { id: 'lap-pajak', label: 'Pajak' },
      { id: 'lap-ppob', label: 'PPOB' },
      { id: 'lap-pengunjung', label: 'Pengunjung' },
      {
        id: 'promosi-group',
        label: 'Promosi',
        children: [
          { id: 'promo-transaksi', label: 'Transaksi Berpromo' },
          { id: 'promo-barang', label: 'Penjualan Barang' },
        ],
      },
      { id: 'lap-penilaian', label: 'Penilaian Toko' },
    ],
  },
  {
    id: 'cabang-group',
    label: 'CABANG',
    children: [
      { id: 'cabang-bulk', label: 'Bulk Pembayaran' },
      { id: 'cabang-dashboard', label: 'Dashboard' },
      { id: 'cabang-barang', label: 'Manajemen Barang' },
      { id: 'cabang-transfer', label: 'Transfer Barang' },
      {
        id: 'cabang-lap-transfer',
        label: 'Laporan Transfer',
        children: [
          { id: 'cabang-lap-tanpa-konfirm', label: 'Tanpa Konfirmasi' },
          { id: 'cabang-lap-dengan-konfirm', label: 'Dengan Konfirmasi' },
        ],
      },
      { id: 'cabang-pengaturan', label: 'Pengaturan' },
    ],
  },
  { id: 'pengaturan', label: 'PENGATURAN' },
  { id: 'staff', label: 'STAFF & AKSES' }, // Adding our internal mapping
  { id: 'generator', label: 'GENERATOR DEMO' }, // Adding our internal mapping
  { id: 'e-katalog', label: 'E-KATALOG' },
  { id: 'ppob', label: 'PPOB' },
  { id: 'program-referral', label: 'PROGRAM REFERRAL' },
  { id: 'integrasi', label: 'INTEGRASI' },
  { id: 'pinjaman', label: 'PINJAMAN' },
];

// ─────────────────────────────────────────────
// Coming Soon Module
// ─────────────────────────────────────────────
function ComingSoonModule({
  title,
  description,
  icon,
  features,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: string[];
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 text-emerald-400"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))',
          border: '1px solid rgba(16,185,129,0.2)',
          boxShadow: '0 0 60px rgba(16,185,129,0.08)',
        }}
      >
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 40 })}
      </div>

      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-400 mb-5"
        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
      >
        <Activity size={12} />
        DALAM PENGEMBANGAN
      </div>

      <h2 className="text-2xl font-black text-white mb-3">{title}</h2>
      <p className="text-slate-400 max-w-md leading-relaxed text-sm mb-8">{description}</p>

      {features && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
          {features.map((f) => (
            <div
              key={f}
              className="px-4 py-3 rounded-xl text-center text-xs text-slate-400 font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Dark Tooltip for Recharts
// ─────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-2xl"
      style={{ background: '#1E2A3F', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="text-slate-300 font-bold mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dark Dashboard
// ─────────────────────────────────────────────
function DarkDashboard({
  products,
  transactions,
  onGoToProduk,
  onGoToPenjualan,
}: {
  products: Product[];
  transactions: Transaction[];
  onGoToProduk: () => void;
  onGoToPenjualan: () => void;
}) {
  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const todayTxs = useMemo(
    () => transactions.filter((t) => t.date.slice(0, 10) === today),
    [transactions, today]
  );
  const todayRevenue = useMemo(() => todayTxs.reduce((s, t) => s + t.totalAmount, 0), [todayTxs]);
  const todayCount = todayTxs.length;

  const calcProfit = (txList: Transaction[]) =>
    txList.reduce((sum, t) => {
      return (
        sum +
        t.items.reduce((s, item) => {
          const prod = productMap.get(item.productId);
          const cost = prod ? prod.price_buy * item.quantity * item.multiplier : 0;
          return s + (item.price * item.quantity - cost);
        }, 0)
      );
    }, 0);

  const todayProfit = useMemo(() => calcProfit(todayTxs), [todayTxs, productMap]);
  const monthTxs = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthKey)),
    [transactions, monthKey]
  );
  const monthRevenue = useMemo(() => monthTxs.reduce((s, t) => s + t.totalAmount, 0), [monthTxs]);
  const monthProfit = useMemo(() => calcProfit(monthTxs), [monthTxs, productMap]);
  const profitMarginMonth = monthRevenue > 0 ? ((monthProfit / monthRevenue) * 100).toFixed(1) : '0';

  const lowStockItems = useMemo(
    () => products.filter((p) => p.use_stock !== false && p.stock <= p.min_stock).slice(0, 6),
    [products]
  );

  // Last 7 days chart
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayTxs = transactions.filter((t) => t.date.slice(0, 10) === ds);
      days.push({
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        revenue: dayTxs.reduce((s, t) => s + t.totalAmount, 0),
        profit: calcProfit(dayTxs),
        count: dayTxs.length,
      });
    }
    return days;
  }, [transactions, productMap]);

  // Top 5 products by revenue
  const topProducts = useMemo(() => {
    const map = new Map<string, { product: Product; revenue: number; qty: number }>();
    transactions.forEach((t) =>
      t.items.forEach((item) => {
        const prod = productMap.get(item.productId);
        if (!prod) return;
        const e = map.get(item.productId) || { product: prod, revenue: 0, qty: 0 };
        e.revenue += item.price * item.quantity;
        e.qty += item.quantity;
        map.set(item.productId, e);
      })
    );
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [transactions, productMap]);

  const totalAssetBuy = products.reduce((s, p) => s + p.stock * p.price_buy, 0);
  const totalStock = products.reduce((s, p) => s + p.stock, 0);

  // KPI Card component
  const KpiCard = ({
    label,
    value,
    sub,
    color,
    icon,
    badge,
  }: {
    label: string;
    value: string;
    sub?: string;
    color: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <div
      className="rounded-2xl p-5 flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}25`, color }}
        >
          {icon}
        </div>
        {badge || <ArrowUpRight size={16} style={{ color }} className="opacity-60" />}
      </div>
      <p className="text-slate-400 text-xs font-medium mb-1">{label}</p>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        {/* KPI Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Pendapatan Hari Ini"
            value={formatShort(todayRevenue)}
            sub={`${todayCount} transaksi`}
            color="#10B981"
            icon={<DollarSign size={18} />}
          />
          <KpiCard
            label="Keuntungan Hari Ini"
            value={formatShort(todayProfit)}
            sub={todayRevenue > 0 ? `Margin ${((todayProfit / todayRevenue) * 100).toFixed(1)}%` : 'Belum ada transaksi'}
            color="#3B82F6"
            icon={<TrendingUp size={18} />}
          />
          <KpiCard
            label="Pendapatan Bulan Ini"
            value={formatShort(monthRevenue)}
            sub={`Profit margin ${profitMarginMonth}%`}
            color="#8B5CF6"
            icon={<BarChart3 size={18} />}
          />
          <KpiCard
            label="Stok Kritis / Habis"
            value={lowStockItems.length.toString()}
            sub={`dari ${products.length} jenis produk`}
            color={lowStockItems.length > 0 ? '#F43F5E' : '#10B981'}
            icon={<AlertTriangle size={18} />}
            badge={
              lowStockItems.length > 0 ? (
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(244,63,94,0.2)', color: '#F43F5E' }}
                >
                  Alert
                </span>
              ) : undefined
            }
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Area Chart */}
          <div
            className="xl:col-span-2 rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-[15px]">Tren Pendapatan & Keuntungan</h3>
                <p className="text-slate-500 text-xs mt-0.5">7 hari terakhir</p>
              </div>
              <button
                onClick={onGoToPenjualan}
                className="text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ color: '#10B981' }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Laporan Lengkap <ChevronRight size={14} />
              </button>
            </div>
            {chartData.every((d) => d.revenue === 0) ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-600">
                <BarChart3 size={36} className="mb-3 opacity-40" />
                <p className="text-sm">Belum ada data penjualan</p>
              </div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#4B5563', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#4B5563', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatShort(v)}
                      />
                      <Tooltip content={<DarkTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        strokeWidth={2}
                        fill="url(#gradRevenue)"
                        name="Pendapatan"
                        dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0, fill: '#10B981' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#gradProfit)"
                        name="Keuntungan"
                        dot={{ fill: '#3B82F6', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0, fill: '#3B82F6' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-xs text-slate-500">Pendapatan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded-full bg-blue-400 inline-block" />
                    <span className="text-xs text-slate-500">Keuntungan</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Top Products */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-[15px]">Top Produk</h3>
              <button
                onClick={onGoToProduk}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: '#10B981' }}
              >
                Semua <ChevronRight size={14} />
              </button>
            </div>
            {topProducts.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
                Belum ada data transaksi
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((item, idx) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <span
                      className="text-xs font-black w-5 text-center"
                      style={{ color: idx === 0 ? '#F59E0B' : '#4B5563' }}
                    >
                      {idx + 1}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      {item.product.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500">{item.qty.toLocaleString('id-ID')} terjual</p>
                    </div>
                    <span className="text-xs font-black" style={{ color: '#10B981' }}>
                      {formatShort(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(244,63,94,0.05)',
              border: '1px solid rgba(244,63,94,0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={17} className="text-rose-400" />
                <h3 className="text-white font-bold text-[15px]">Peringatan Stok Kritis</h3>
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(244,63,94,0.2)', color: '#F43F5E' }}
                >
                  {lowStockItems.length} item
                </span>
              </div>
              <button
                onClick={onGoToProduk}
                className="text-xs font-semibold flex items-center gap-1 text-rose-400"
              >
                Kelola Stok <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-rose-300 shrink-0"
                    style={{ background: 'rgba(244,63,94,0.15)' }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500">Min stok: {p.min_stock}</p>
                  </div>
                  <span
                    className="text-xs font-black px-2 py-1 rounded-lg shrink-0"
                    style={
                      p.stock === 0
                        ? { background: 'rgba(244,63,94,0.2)', color: '#F43F5E' }
                        : { background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }
                    }
                  >
                    {p.stock === 0 ? 'Habis' : `${p.stock} sisa`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Jenis Produk',
              value: products.length.toLocaleString('id-ID'),
              icon: <Package size={16} />,
              color: '#3B82F6',
            },
            {
              label: 'Total Stok Tersedia',
              value: totalStock.toLocaleString('id-ID'),
              icon: <Layers size={16} />,
              color: '#8B5CF6',
            },
            {
              label: 'Nilai Aset (Harga Beli)',
              value: formatShort(totalAssetBuy),
              icon: <DollarSign size={16} />,
              color: '#F59E0B',
            },
            {
              label: 'Total Seluruh Transaksi',
              value: transactions.length.toLocaleString('id-ID'),
              icon: <ShoppingCart size={16} />,
              color: '#10B981',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div style={{ color: s.color }} className="mb-2">
                {s.icon}
              </div>
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Light Module Wrapper (for existing light-theme components)
// ─────────────────────────────────────────────
function LightWrapper({ children, scrollable = false }: { children: React.ReactNode, scrollable?: boolean }) {
  return (
    <div
      className={`h-full flex flex-col ${scrollable ? 'overflow-y-auto custom-scrollbar p-4 md:p-6' : 'overflow-hidden'}`}
      style={{ background: '#f9fafb' }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Backoffice Component
// ─────────────────────────────────────────────
export default function Backoffice({
  products,
  transactions,
  activeUser,
  dbConfig,
  onAddProduct,
  onEditProduct,
  onCancelTransaction,
  onRefreshData,
  onConfigChange,
  onLogout,
  onNavigateToPOS,
  successMessage,
  errorMessage,
  onDismissSuccess,
  onDismissError,
}: BackofficeProps) {
  const [activeModule, setActiveModule] = useState<BOModule>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['database-group', 'laporan-group']);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to find label recursively
  const findLabel = (items: NavItem[], id: string): string => {
    for (const item of items) {
      if (item.id === id) return item.label;
      if (item.children) {
        const found = findLabel(item.children, id);
        if (found) return found;
      }
    }
    return '';
  };
  const activeLabel = findLabel(SIDEBAR_MENU, activeModule) || 'Dashboard';

  const toggleMenu = (id: string) => {
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Sidebar item renderer
  const renderMenuItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = activeModule === item.id;
    const paddingLeft = level === 0 ? '1rem' : `${1 + level * 1.5}rem`;

    if (hasChildren) {
      return (
        <div key={item.id} className="w-full">
          <button
            onClick={() => toggleMenu(item.id)}
            className="w-full flex items-center justify-between py-3 text-sm font-semibold transition-colors text-white hover:bg-white/10"
            style={{ paddingLeft, paddingRight: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span>{item.label}</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isExpanded && (
            <div className="flex flex-col">
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        id={`bo-nav-${item.id}`}
        onClick={() => {
          setActiveModule(item.id);
          if (window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 py-2.5 text-sm transition-colors text-left ${isActive ? 'bg-white/20 font-bold text-white' : 'font-medium text-white/80 hover:bg-white/10'}`}
        style={{
          paddingLeft,
          paddingRight: '1rem',
          backgroundColor: item.isHighlight ? '#eab308' : undefined,
          color: item.isHighlight ? '#000' : undefined,
          borderBottom: '1px solid rgba(255,255,255,0.02)'
        }}
      >
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  // Module content renderer
  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <DarkDashboard
            products={products}
            transactions={transactions}
            onGoToProduk={() => setActiveModule('produk')}
            onGoToPenjualan={() => setActiveModule('laporan-penjualan')}
          />
        );

      case 'laporan-penjualan':
        return (
          <LightWrapper>
            <SalesReport
              transactions={transactions}
              products={products}
              onCancelTransaction={onCancelTransaction}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              onNavigateToCatalog={() => setActiveModule('produk')}
              onRefreshData={onRefreshData}
            />
          </LightWrapper>
        );

      case 'laporan-keuangan':
        return (
          <LightWrapper>
            <FinanceReport
              transactions={transactions}
              products={products}
              onToggleSidebar={() => setIsSidebarOpen(true)}
            />
          </LightWrapper>
        );

      case 'produk':
        return (
          <LightWrapper>
            <BarangList
              products={products}
              onBack={() => setActiveModule('dashboard')}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              onAddProduct={onAddProduct}
              onEditProduct={onEditProduct}
              onGoToImportProduk={() => setActiveModule('import-produk')}
            />
          </LightWrapper>
        );

      case 'import-produk':
        return (
          <ProductImport 
            onBack={() => setActiveModule('produk')} 
            onImportProducts={async (newProducts) => {
              try {
                await addProducts(newProducts);
                await onRefreshData();
              } catch (e: any) {
                console.error(e);
                throw e; // throw error so ProductImport can show it
              }
            }}
          />
        );

      case 'staff':
        return (
          <LightWrapper scrollable>
            <StaffManagement />
          </LightWrapper>
        );

      case 'pengaturan':
        return (
          <LightWrapper scrollable>
            <DatabaseSettings
              currentConfig={dbConfig}
              onConfigChange={onConfigChange}
              localProductCount={products.length}
            />
          </LightWrapper>
        );

      case 'generator':
        return (
          <LightWrapper scrollable>
            <DummyDataGenerator
              currentConfig={dbConfig}
              onGenerationComplete={onRefreshData}
            />
          </LightWrapper>
        );

      case 'stok':
        return (
          <ComingSoonModule
            title="Manajemen Stok"
            description="Modul stok opname, riwayat mutasi stok masuk & keluar, penyesuaian stok otomatis, dan laporan inventori real-time akan tersedia di versi berikutnya."
            icon={<Layers />}
            features={['Stok Opname', 'Mutasi Stok', 'Riwayat Arus']}
          />
        );

      case 'pembelian':
        return (
          <ComingSoonModule
            title="Pembelian dari Supplier"
            description="Catat setiap pembelian dari supplier, kelola hutang dagang, lacak riwayat pengiriman, dan pantau perubahan harga modal secara real-time."
            icon={<PackagePlus />}
            features={['Input Pembelian', 'Hutang Dagang', 'Riwayat Harga Modal']}
          />
        );

      case 'pelanggan':
        return (
          <ComingSoonModule
            title="Pelanggan & Supplier"
            description="Database pelanggan terintegrasi, riwayat transaksi per pelanggan, program loyalitas, dan manajemen supplier lengkap akan segera hadir."
            icon={<Users />}
            features={['CRUD Pelanggan', 'Riwayat Transaksi', 'Program Loyalitas']}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      id="backoffice-root"
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: '#070B14', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
        style={{
          background: '#007955', // Kasir Pintar Green
          borderRight: '1px solid rgba(255,255,255,0.06)',
          minWidth: '256px',
        }}
      >
        {/* Logo / Brand */}
        <div
          className="flex items-center gap-3 px-5 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white"
          >
            <span className="text-[#007955] font-black text-xl leading-none" style={{ fontFamily: 'serif' }}>K</span>
          </div>
          <div className="flex-1">
            <p className="text-[17px] font-black text-white tracking-tight leading-none">Kasir Pintar</p>
            <p className="text-[10px] font-medium mt-1 text-white/80">
              Back Office Ver. 0.3.6 2026-07-16
            </p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg transition-colors text-white hover:bg-white/20"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          {SIDEBAR_MENU.map((item) => renderMenuItem(item))}
        </nav>

        {/* Sidebar Footer */}
        <div
          className="px-4 pb-4 pt-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
        >
          {/* User info */}
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl mb-3 bg-white/10"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#007955] bg-white text-xs font-black shrink-0"
            >
              {(activeUser.fullname || 'O').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{activeUser.fullname || 'Owner'}</p>
              <p className="text-[10px] text-white/70">
                Owner · Administrator
              </p>
            </div>
          </div>

          {/* Go to POS */}
          <button
            id="bo-go-to-pos"
            onClick={onNavigateToPOS}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left mb-1 text-white hover:bg-white/20"
          >
            <ShoppingCart size={17} className="opacity-70" />
            Buka Aplikasi POS
            <ExternalLink size={12} className="ml-auto opacity-40" />
          </button>

          {/* Logout */}
          <button
            id="bo-logout"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left text-white hover:bg-red-500/80"
          >
            <LogOut size={17} className="opacity-70" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 md:px-5 h-14"
          style={{
            background: '#0D1117',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: '#4B5563' }}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[13px] font-medium" style={{ color: '#374151' }}>
              Backoffice
            </span>
            {activeModule !== 'dashboard' && (
              <>
                <ChevronRight size={13} style={{ color: '#374151' }} />
                <span className="text-[13px] font-bold text-white truncate">{activeLabel}</span>
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="bo-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg transition-all"
              style={{ color: '#4B5563' }}
              title="Refresh Data"
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.color = '#9CA3AF';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '';
                e.currentTarget.style.color = '#4B5563';
              }}
            >
              <RefreshCcw
                size={16}
                className={isRefreshing ? 'animate-spin' : ''}
                style={{ opacity: isRefreshing ? 0.5 : 1 }}
              />
            </button>

            <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.08)' }} />

            {/* User avatar */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                {(activeUser.fullname || 'O').slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">
                  {activeUser.fullname || 'Owner'}
                </p>
                <p className="text-[10px]" style={{ color: '#374151' }}>
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Notification Toasts */}
        {(successMessage || errorMessage) && (
          <div className="px-4 pt-3 flex flex-col gap-2 shrink-0">
            {successMessage && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}
              >
                <CheckCircle size={16} />
                <span className="flex-1">{successMessage}</span>
                {onDismissSuccess && (
                  <button onClick={onDismissSuccess}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            {errorMessage && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#F43F5E' }}
              >
                <XCircle size={16} />
                <span className="flex-1">{errorMessage}</span>
                {onDismissError && (
                  <button onClick={onDismissError}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Module Content */}
        <main
          className="flex-1 overflow-hidden relative animate-fade-in"
          style={{ background: '#070B14' }}
        >
          <div className="h-full">{renderModule()}</div>
        </main>
      </div>
    </div>
  );
}
