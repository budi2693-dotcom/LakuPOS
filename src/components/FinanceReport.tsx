import React, { useState, useMemo, useEffect } from 'react';
import { Menu, TrendingUp, TrendingDown, Wallet, Building2, Package, Search, DollarSign, PiggyBank, Landmark, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction, TransactionItem, Product } from '../types';
import { getTransactions } from '../lib/dbManager';

interface FinanceReportProps {
  transactions: Transaction[];
  products: Product[];
  onToggleSidebar?: () => void;
}

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function FinanceReport({ transactions: propTransactions, products, onToggleSidebar }: FinanceReportProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(propTransactions);
  const [searchInventory, setSearchInventory] = useState('');

  // Date range: default to current month
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(today);

  // Load transactions from DB on mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const dbTransactions = await getTransactions();
        if (dbTransactions && dbTransactions.length > 0) {
          setAllTransactions(dbTransactions);
        }
      } catch (err) {
        console.error('Failed to load transactions from DB:', err);
      }
    };
    loadTransactions();
  }, []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const txDate = t.date.slice(0, 10);
      if (dateFrom && txDate < dateFrom) return false;
      if (dateTo && txDate > dateTo) return false;
      return true;
    });
  }, [allTransactions, dateFrom, dateTo]);

  // Build product lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // ===== P&L Calculations =====
  const grossRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  }, [filteredTransactions]);

  const totalInvoiceDiscount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.discountTotal || 0), 0);
  }, [filteredTransactions]);

  const netRevenue = grossRevenue - totalInvoiceDiscount;

  const cogs = useMemo(() => {
    let total = 0;
    for (const t of filteredTransactions) {
      for (const item of t.items) {
        const product = productMap.get(item.productId);
        const priceBuy = product ? product.price_buy : 0;
        total += priceBuy * item.quantity * item.multiplier;
      }
    }
    return total;
  }, [filteredTransactions, productMap]);

  const grossProfit = netRevenue - cogs;
  const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  // ===== Asset Valuation =====
  const cashOnHand = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.paymentMethod === 'Cash')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [filteredTransactions]);

  const bankBalance = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.paymentMethod !== 'Cash')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [filteredTransactions]);

  const inventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.stock * p.price_buy, 0);
  }, [products]);

  const totalBusinessWealth = cashOnHand + bankBalance + inventoryValue;

  // ===== Inventory Table =====
  const inventoryRows = useMemo(() => {
    const filtered = products
      .filter((p) => p.stock > 0)
      .filter((p) => {
        if (!searchInventory) return true;
        const q = searchInventory.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      })
      .map((p) => ({
        ...p,
        nilaiPersediaan: p.stock * p.price_buy,
        potensiProfit: (p.price_sell - p.price_buy) * p.stock,
      }))
      .sort((a, b) => b.nilaiPersediaan - a.nilaiPersediaan);
    return filtered;
  }, [products, searchInventory]);

  const totalNilaiPersediaan = useMemo(() => inventoryRows.reduce((s, r) => s + r.nilaiPersediaan, 0), [inventoryRows]);
  const totalPotensiProfit = useMemo(() => inventoryRows.reduce((s, r) => s + r.potensiProfit, 0), [inventoryRows]);

  return (
    <div className="bg-white h-full flex flex-col font-sans overflow-hidden">
      {/* Top App Bar */}
      <div className="flex items-center px-6 h-16 border-b border-gray-100 bg-white shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors md:hidden"
        >
          <Menu size={24} />
        </button>
        <h1 className="flex-1 text-left text-lg font-bold text-teal-600 tracking-wide md:ml-0 ml-2">
          KEUANGAN
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <span className="text-xs text-gray-400 font-bold">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6 pb-12">

          {/* ===== Profit & Loss Statement ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-8">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-6">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
                <BarChart3 size={20} />
              </div>
              Laporan Laba Rugi
            </h2>

            <div className="space-y-3">
              {/* Pendapatan Kotor */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={16} className="text-teal-500" />
                  <span className="text-sm font-bold text-gray-700">Pendapatan Kotor (Gross Revenue)</span>
                </div>
                <span className="text-sm font-mono font-bold text-gray-900">{formatRupiah(grossRevenue)}</span>
              </div>

              {/* Total Diskon Faktur */}
              <div className="flex items-center justify-between py-2 px-3 pl-8 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <ArrowDownRight size={16} className="text-red-400" />
                  <span className="text-sm text-gray-500">Total Diskon Faktur</span>
                </div>
                <span className="text-sm font-mono text-red-500">- {formatRupiah(totalInvoiceDiscount)}</span>
              </div>

              {/* Pendapatan Bersih */}
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-gray-800">Pendapatan Bersih (Net Revenue)</span>
                </div>
                <span className="text-sm font-mono font-bold text-gray-900">{formatRupiah(netRevenue)}</span>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 my-1" />

              {/* HPP / COGS */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <ArrowDownRight size={16} className="text-orange-400" />
                  <span className="text-sm font-bold text-gray-700">Harga Pokok Penjualan (COGS)</span>
                </div>
                <span className="text-sm font-mono font-bold text-orange-600">- {formatRupiah(cogs)}</span>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 my-1" />

              {/* Laba Kotor */}
              <div className={`flex items-center justify-between py-4 px-4 rounded-xl border ${
                grossProfit >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {grossProfit >= 0 ? (
                    <TrendingUp size={20} className="text-emerald-600" />
                  ) : (
                    <TrendingDown size={20} className="text-red-600" />
                  )}
                  <span className="text-base font-black text-gray-900">Laba Kotor (Gross Profit)</span>
                </div>
                <span className={`text-xl font-mono font-black ${
                  grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {formatRupiah(grossProfit)}
                </span>
              </div>

              {/* Margin */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Margin Keuntungan</span>
                </div>
                <span className={`text-sm font-mono font-bold ${
                  profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* ===== Business Asset Valuation ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-8">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <PiggyBank size={20} />
              </div>
              Valuasi Aset Bisnis
            </h2>

            <div className="space-y-3">
              {/* Kas di Tangan */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">Kas di Tangan</span>
                    <span className="text-[10px] text-gray-400 font-bold">Pembayaran Tunai (Cash)</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-700">{formatRupiah(cashOnHand)}</span>
              </div>

              {/* Saldo Bank */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">Saldo Bank / QRIS / Kartu</span>
                    <span className="text-[10px] text-gray-400 font-bold">Pembayaran Non-Tunai</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-blue-700">{formatRupiah(bankBalance)}</span>
              </div>

              {/* Nilai Inventori */}
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <Package size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">Nilai Inventori</span>
                    <span className="text-[10px] text-gray-400 font-bold">Stok × Harga Beli</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-amber-700">{formatRupiah(inventoryValue)}</span>
              </div>

              {/* Divider */}
              <hr className="border-gray-200 my-1" />

              {/* Total Kekayaan */}
              <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-teal-50 border border-teal-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                    <Building2 size={18} />
                  </div>
                  <span className="text-base font-black text-gray-900">Total Kekayaan Bisnis</span>
                </div>
                <span className="text-xl font-mono font-black text-teal-700">{formatRupiah(totalBusinessWealth)}</span>
              </div>
            </div>
          </div>

          {/* ===== Inventory Valuation Table ===== */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                  <Package size={20} />
                </div>
                Rincian Nilai Persediaan
              </h2>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama / SKU..."
                  value={searchInventory}
                  onChange={(e) => setSearchInventory(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3 rounded-tl-lg">No</th>
                    <th className="text-left text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3">Nama Barang</th>
                    <th className="text-left text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3">SKU</th>
                    <th className="text-right text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3">Stok</th>
                    <th className="text-right text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3">Harga Beli</th>
                    <th className="text-right text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3">Harga Jual</th>
                    <th className="text-right text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3">Nilai Persediaan</th>
                    <th className="text-right text-[10px] font-black text-gray-500 uppercase tracking-wider px-3 py-3 rounded-tr-lg">Potensi Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventoryRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-800 max-w-[200px] truncate">{row.name}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{row.sku}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-700 text-right">{row.stock.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-600 text-right">{formatRupiah(row.price_buy)}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-600 text-right">{formatRupiah(row.price_sell)}</td>
                      <td className="px-3 py-2.5 text-xs font-mono font-bold text-gray-900 text-right">{formatRupiah(row.nilaiPersediaan)}</td>
                      <td className={`px-3 py-2.5 text-xs font-mono font-bold text-right ${
                        row.potensiProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatRupiah(row.potensiProfit)}
                      </td>
                    </tr>
                  ))}
                  {inventoryRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                        <Package size={32} className="mx-auto mb-2 stroke-1" />
                        Tidak ada data persediaan
                      </td>
                    </tr>
                  )}
                </tbody>
                {inventoryRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={6} className="px-3 py-3 text-xs font-black text-gray-700 uppercase tracking-wider">
                        Total
                      </td>
                      <td className="px-3 py-3 text-xs font-mono font-black text-gray-900 text-right">
                        {formatRupiah(totalNilaiPersediaan)}
                      </td>
                      <td className={`px-3 py-3 text-xs font-mono font-black text-right ${
                        totalPotensiProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatRupiah(totalPotensiProfit)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
