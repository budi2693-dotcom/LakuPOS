import React, { useState, useMemo, useEffect } from 'react';
import {
  Menu,
  Search,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Users,
  CreditCard,
  X,
  Trash2,
  Eye,
  DollarSign,
  Package,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListFilter,
  Check,
  ChevronDown,
  ChevronUp,
  Scale,
  Wallet,
  Coins,
  Percent,
  RefreshCcw,
  Share2,
  Info,
  MoreVertical,
  Printer,
  Download,
  FolderOpen,
  Banknote,
  Tags,
  Monitor,
  PlusCircle,
  FileText,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Transaction, TransactionItem, Product } from '../types';
import { getTransactions } from '../lib/dbManager';

interface SalesReportProps {
  transactions: Transaction[];
  products: Product[];
  onCancelTransaction: (txId: string, items: TransactionItem[]) => Promise<void>;
  onToggleSidebar?: () => void;
  onNavigateToCatalog?: () => void;
  onRefreshData?: () => Promise<void>;
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Types for Sub-views
type SubView =
  | 'hub'
  | 'ringkasan_hari'
  | 'ringkasan_tren'
  | 'laba_rugi'
  | 'arus_keuangan'
  | 'transaksi'
  | 'barang'
  | 'kategori'
  | 'addons'
  | 'arus_stok'
  | 'pembelian'
  | 'persediaan_barang'
  | 'persediaan_kategori'
  | 'cicilan'
  | 'biaya'
  | 'pengunjung'
  | 'promosi'
  | 'back_office';

export default function SalesReport({
  transactions: propTransactions,
  products,
  onCancelTransaction,
  onToggleSidebar,
  onNavigateToCatalog,
  onRefreshData
}: SalesReportProps) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(propTransactions);
  const [activeSubView, setActiveSubView] = useState<SubView>('hub');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('1 mnt lalu');
  const [isDesktop, setIsDesktop] = useState(false);

  // Accordions state (collapsed by default as requested)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    performa: false,
    penjualan: false,
    pembelian: false,
    persediaan: false,
    biaya: false,
    promosi: false,
    laporan_barang: false,
    laporan_barang_tren: false,
  });

  // Filter states
  const [selectedStaff, setSelectedStaff] = useState('Semua Staff');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('Cash dan Piutang');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Hari Ini');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  // Laba Rugi specific
  const [showBeforePiutang, setShowBeforePiutang] = useState(false);

  // Purchase filter (Hari Ini, Bulan Ini, Tahun Ini, Semua)
  const [purchaseTimeRange, setPurchaseTimeRange] = useState<'hari' | 'bulan' | 'tahun' | 'semua'>('semua');

  // Transaction details modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Search state inside sub-views
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('Semua');

  // Transaction sub-drilldown level states
  const [transaksiLevel, setTransaksiLevel] = useState<'menu' | 'selama_ini' | 'tahun_ini' | 'bulan_ini' | 'hari_ini'>('menu');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Product sales detail drilldown states
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [productDetailLevel, setProductDetailLevel] = useState<'selama_ini' | 'tahun_ini' | 'bulan_ini' | 'hari_ini'>('selama_ini');
  const [productDetailYear, setProductDetailYear] = useState<number | null>(null);
  const [productDetailMonthKey, setProductDetailMonthKey] = useState<string | null>(null);
  const [productDetailDayKey, setProductDetailDayKey] = useState<string | null>(null);
  const [productDetailSearchQuery, setProductDetailSearchQuery] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState({
    penjualan: true,
    keuntungan: true,
    pendapatan: true,
  });

  // Category sales detail drilldown states
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<string | null>(null);
  const [categoryDetailLevel, setCategoryDetailLevel] = useState<'selama_ini' | 'tahun_ini' | 'bulan_ini' | 'hari_ini'>('selama_ini');
  const [categoryDetailYear, setCategoryDetailYear] = useState<number | null>(null);
  const [categoryDetailMonthKey, setCategoryDetailMonthKey] = useState<string | null>(null);
  const [categoryDetailDayKey, setCategoryDetailDayKey] = useState<string | null>(null);
  const [categoryDetailSearchQuery, setCategoryDetailSearchQuery] = useState<string>('');
  const [showOtherCategoriesModal, setShowOtherCategoriesModal] = useState<boolean>(false);

  // Stock Flow states
  const [stockFlowFilter, setStockFlowFilter] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [showStockFlowFilterModal, setShowStockFlowFilterModal] = useState<boolean>(false);
  const [stockFlowSearchQuery, setStockFlowSearchQuery] = useState<string>('');

  const [showChartInSelama, setShowChartInSelama] = useState<boolean>(true);
  const [chartMetricInSelama, setChartMetricInSelama] = useState<'transaksi' | 'pendapatan' | 'keuntungan'>('pendapatan');

  const [showChartInTahun, setShowChartInTahun] = useState<boolean>(true);
  const [chartMetricInTahun, setChartMetricInTahun] = useState<'transaksi' | 'pendapatan' | 'keuntungan'>('pendapatan');

  const [showChartInMonthly, setShowChartInMonthly] = useState<boolean>(true);
  const [chartMetricInMonthly, setChartMetricInMonthly] = useState<'transaksi' | 'pendapatan' | 'keuntungan'>('pendapatan');

  // Recharts metric tab inside Ringkasan Penjualan Harian
  const [activeChartMetric, setActiveChartMetric] = useState<'transaksi' | 'pendapatan' | 'keuntungan'>('transaksi');

  // Dropdown Menu state
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);

  // --- CONNECTED BACKEND / INTERACTIVE STATES ---
  // Biaya Operasional (Operational Costs) state - users can add real-time cost entries
  const [costs, setCosts] = useState([
    { id: '1', date: '2026-07-15', category: 'Listrik & Air', note: 'Tagihan ruko Juli', amount: 450000 },
    { id: '2', date: '2026-07-12', category: 'Internet Wifi', note: 'Indihome bulanan', amount: 350000 },
    { id: '3', date: '2026-07-10', category: 'Gaji Karyawan', note: 'Gaji staff kasir', amount: 3000000 },
    { id: '4', date: '2026-07-16', category: 'Operasional', note: 'Pembelian kantong kresek', amount: 80000 },
  ]);
  const [newCostCategory, setNewCostCategory] = useState('Operasional');
  const [newCostNote, setNewCostNote] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  // Pembelian dari Supplier (Mock backend logs connected to products price_buy)
  const [supplierPurchases, setSupplierPurchases] = useState([
    { id: '1', date: '2026-07-16', productName: 'Minyak Goreng Sunco 2L', qty: 24, cost: 35000, total: 840000, supplier: 'PT Sumber Pangan' },
    { id: '2', date: '2026-07-15', productName: 'Sabun Cuci Sunlight 750ml', qty: 36, cost: 12000, total: 432000, supplier: 'PT Unilever Logistik' },
    { id: '3', date: '2026-07-14', productName: 'Beras Pandan Wangi 5kg', qty: 15, cost: 65000, total: 975000, supplier: 'Grosir Beras Jaya' },
  ]);
  const [newPurchaseName, setNewPurchaseName] = useState('');
  const [newPurchaseQty, setNewPurchaseQty] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newPurchaseSupplier, setNewPurchaseSupplier] = useState('');

  const refreshData = async () => {
    setLoading(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      } else {
        const dbTransactions = await getTransactions();
        if (dbTransactions) {
          setAllTransactions(dbTransactions);
        }
      }
      setLastUpdated('Baru saja');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load & Responsive Check
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop && activeSubView === 'hub') {
        setActiveSubView('ringkasan_hari');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [activeSubView]);

  // Sync prop changes
  useEffect(() => {
    if (propTransactions) {
      setAllTransactions(propTransactions);
    }
  }, [propTransactions]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Add operational cost handler
  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostNote || !newCostAmount) return;
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      category: newCostCategory,
      note: newCostNote,
      amount: parseFloat(newCostAmount) || 0
    };
    setCosts([newEntry, ...costs]);
    setNewCostNote('');
    setNewCostAmount('');
  };

  // Add purchase handler
  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurchaseName || !newPurchaseQty || !newPurchasePrice) return;
    const qty = parseInt(newPurchaseQty) || 0;
    const price = parseFloat(newPurchasePrice) || 0;
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      productName: newPurchaseName,
      qty,
      cost: price,
      total: qty * price,
      supplier: newPurchaseSupplier || 'Supplier Umum'
    };
    setSupplierPurchases([newEntry, ...supplierPurchases]);
    setNewPurchaseName('');
    setNewPurchaseQty('');
    setNewPurchasePrice('');
    setNewPurchaseSupplier('');
  };

  // Helper: filter transactions by Time Range
  const transactionsFilteredByTime = useMemo(() => {
    const now = new Date();
    return allTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      if (selectedTimeRange === 'Hari Ini') {
        return txDate.toDateString() === now.toDateString();
      }
      if (selectedTimeRange === 'Kemarin') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return txDate.toDateString() === yesterday.toDateString();
      }
      if (selectedTimeRange === '7 Hari Terakhir') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return txDate >= sevenDaysAgo;
      }
      if (selectedTimeRange === 'Bulan Ini') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [allTransactions, selectedTimeRange]);

  // Helper: filter costs by Time Range
  const costsFilteredByTime = useMemo(() => {
    const now = new Date();
    return costs.filter((c) => {
      const cDate = new Date(c.date);
      if (selectedTimeRange === 'Hari Ini') {
        return cDate.toDateString() === now.toDateString();
      }
      if (selectedTimeRange === 'Kemarin') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return cDate.toDateString() === yesterday.toDateString();
      }
      if (selectedTimeRange === '7 Hari Terakhir') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return cDate >= sevenDaysAgo;
      }
      if (selectedTimeRange === 'Bulan Ini') {
        return cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [costs, selectedTimeRange]);

  // Helper: compute product sales performances
  const productPerformances = useMemo(() => {
    const performances: Record<string, { product: Product; quantity: number; revenue: number; profit: number }> = {};
    products.forEach((p) => {
      performances[p.id] = { product: p, quantity: 0, revenue: 0, profit: 0 };
    });
    transactionsFilteredByTime.forEach((tx) => {
      tx.items.forEach((item) => {
        if (performances[item.productId]) {
          const perf = performances[item.productId];
          perf.quantity += item.quantity;
          perf.revenue += item.quantity * item.price;
          const costPrice = perf.product.price_buy || 0;
          perf.profit += item.quantity * (item.price - costPrice);
        }
      });
    });
    return Object.values(performances).filter((p) => p.quantity > 0);
  }, [transactionsFilteredByTime, products]);

  const getProductNextLevelSummaryList = () => {
    if (!selectedProductForDetail) return [];

    const txs = allTransactions.filter((tx) =>
      tx.items.some((item) => item.productId === selectedProductForDetail.id)
    );

    if (productDetailLevel === 'selama_ini') {
      const yearsMap: Record<number, { label: string; year: number; count: number; revenue: number; profit: number }> = {};
      txs.forEach((tx) => {
        const year = new Date(tx.date).getFullYear();
        if (!yearsMap[year]) {
          yearsMap[year] = { label: `Tahun ${year}`, year, count: 0, revenue: 0, profit: 0 };
        }
        const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
        const costPrice = selectedProductForDetail.price_buy || 0;
        yearsMap[year].count += item.quantity;
        yearsMap[year].revenue += item.quantity * item.price;
        yearsMap[year].profit += item.quantity * (item.price - costPrice);
      });
      return Object.values(yearsMap).sort((a, b) => b.year - a.year);
    }

    if (productDetailLevel === 'tahun_ini') {
      const monthsMap: Record<string, { label: string; monthKey: string; count: number; revenue: number; profit: number }> = {};
      txs.forEach((tx) => {
        const d = new Date(tx.date);
        const year = d.getFullYear();
        if (year !== productDetailYear) return;
        const month = d.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = {
            label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            monthKey,
            count: 0,
            revenue: 0,
            profit: 0
          };
        }
        const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
        const costPrice = selectedProductForDetail.price_buy || 0;
        monthsMap[monthKey].count += item.quantity;
        monthsMap[monthKey].revenue += item.quantity * item.price;
        monthsMap[monthKey].profit += item.quantity * (item.price - costPrice);
      });
      return Object.values(monthsMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    }

    if (productDetailLevel === 'bulan_ini') {
      const daysMap: Record<string, { label: string; dateStr: string; count: number; revenue: number; profit: number }> = {};
      txs.forEach((tx) => {
        const txDateStr = tx.date.slice(0, 10);
        if (txDateStr.startsWith(productDetailMonthKey!)) {
          if (!daysMap[txDateStr]) {
            const d = new Date(txDateStr);
            daysMap[txDateStr] = {
              label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              dateStr: txDateStr,
              count: 0,
              revenue: 0,
              profit: 0
            };
          }
          const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
          const costPrice = selectedProductForDetail.price_buy || 0;
          daysMap[txDateStr].count += item.quantity;
          daysMap[txDateStr].revenue += item.quantity * item.price;
          daysMap[txDateStr].profit += item.quantity * (item.price - costPrice);
        }
      });
      return Object.values(daysMap).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }

    if (productDetailLevel === 'hari_ini') {
      return txs
        .filter((tx) => tx.date.slice(0, 10) === productDetailDayKey)
        .map((tx) => {
          const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
          const costPrice = selectedProductForDetail.price_buy || 0;
          return {
            label: tx.invoiceNumber,
            id: tx.id,
            tx,
            count: item.quantity,
            revenue: item.quantity * item.price,
            profit: item.quantity * (item.price - costPrice)
          };
        });
    }

    return [];
  };

  const handleProductNextLevelClick = (item: any) => {
    if (productDetailLevel === 'selama_ini') {
      setProductDetailYear(item.year);
      setProductDetailLevel('tahun_ini');
    } else if (productDetailLevel === 'tahun_ini') {
      setProductDetailMonthKey(item.monthKey);
      setProductDetailLevel('bulan_ini');
    } else if (productDetailLevel === 'bulan_ini') {
      setProductDetailDayKey(item.dateStr);
      setProductDetailLevel('hari_ini');
    } else if (productDetailLevel === 'hari_ini') {
      setSelectedTx(item.tx);
    }
  };

  const getCategoryNextLevelSummaryList = () => {
    if (!selectedCategoryForDetail) return [];

    const txs = allTransactions.filter((tx) =>
      tx.items.some((item) => {
        const prod = productMap.get(item.productId);
        return prod?.category === selectedCategoryForDetail;
      })
    );

    if (categoryDetailLevel === 'selama_ini') {
      const yearsMap: Record<number, { label: string; year: number; count: number; revenue: number; profit: number }> = {};
      txs.forEach((tx) => {
        const year = new Date(tx.date).getFullYear();
        if (!yearsMap[year]) {
          yearsMap[year] = { label: `Tahun ${year}`, year, count: 0, revenue: 0, profit: 0 };
        }
        tx.items.forEach((item) => {
          const prod = productMap.get(item.productId);
          if (prod?.category === selectedCategoryForDetail) {
            const costPrice = prod.price_buy || 0;
            yearsMap[year].count += item.quantity;
            yearsMap[year].revenue += item.quantity * item.price;
            yearsMap[year].profit += item.quantity * (item.price - costPrice);
          }
        });
      });
      return Object.values(yearsMap).sort((a, b) => b.year - a.year);
    }

    if (categoryDetailLevel === 'tahun_ini') {
      const monthsMap: Record<string, { label: string; monthKey: string; count: number; revenue: number; profit: number }> = {};
      txs.forEach((tx) => {
        const d = new Date(tx.date);
        const year = d.getFullYear();
        if (year !== categoryDetailYear) return;
        const month = d.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = {
            label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            monthKey,
            count: 0,
            revenue: 0,
            profit: 0
          };
        }
        tx.items.forEach((item) => {
          const prod = productMap.get(item.productId);
          if (prod?.category === selectedCategoryForDetail) {
            const costPrice = prod.price_buy || 0;
            monthsMap[monthKey].count += item.quantity;
            monthsMap[monthKey].revenue += item.quantity * item.price;
            monthsMap[monthKey].profit += item.quantity * (item.price - costPrice);
          }
        });
      });
      return Object.values(monthsMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    }

    if (categoryDetailLevel === 'bulan_ini') {
      const daysMap: Record<string, { label: string; dateStr: string; count: number; revenue: number; profit: number }> = {};
      txs.forEach((tx) => {
        const txDateStr = tx.date.slice(0, 10);
        if (txDateStr.startsWith(categoryDetailMonthKey!)) {
          if (!daysMap[txDateStr]) {
            const d = new Date(txDateStr);
            daysMap[txDateStr] = {
              label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              dateStr: txDateStr,
              count: 0,
              revenue: 0,
              profit: 0
            };
          }
          tx.items.forEach((item) => {
            const prod = productMap.get(item.productId);
            if (prod?.category === selectedCategoryForDetail) {
              const costPrice = prod.price_buy || 0;
              daysMap[txDateStr].count += item.quantity;
              daysMap[txDateStr].revenue += item.quantity * item.price;
              daysMap[txDateStr].profit += item.quantity * (item.price - costPrice);
            }
          });
        }
      });
      return Object.values(daysMap).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }

    if (categoryDetailLevel === 'hari_ini') {
      return txs
        .filter((tx) => tx.date.slice(0, 10) === categoryDetailDayKey)
        .map((tx) => {
          let count = 0;
          let revenue = 0;
          let profit = 0;
          tx.items.forEach((item) => {
            const prod = productMap.get(item.productId);
            if (prod?.category === selectedCategoryForDetail) {
              const costPrice = prod.price_buy || 0;
              count += item.quantity;
              revenue += item.quantity * item.price;
              profit += item.quantity * (item.price - costPrice);
            }
          });
          return {
            label: tx.invoiceNumber,
            id: tx.id,
            tx,
            count,
            revenue,
            profit
          };
        });
    }

    return [];
  };

  const handleCategoryNextLevelClick = (item: any) => {
    if (categoryDetailLevel === 'selama_ini') {
      setCategoryDetailYear(item.year);
      setCategoryDetailLevel('tahun_ini');
    } else if (categoryDetailLevel === 'tahun_ini') {
      setCategoryDetailMonthKey(item.monthKey);
      setCategoryDetailLevel('bulan_ini');
    } else if (categoryDetailLevel === 'bulan_ini') {
      setCategoryDetailDayKey(item.dateStr);
      setCategoryDetailLevel('hari_ini');
    } else if (categoryDetailLevel === 'hari_ini') {
      setSelectedTx(item.tx);
    }
  };

  // Product lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Calculate COGS and Profit for a transaction
  const getTransactionProfitAndRevenue = (tx: Transaction) => {
    let revenue = tx.totalAmount;
    let cogs = 0;
    tx.items.forEach((item) => {
      const prod = productMap.get(item.productId);
      const buyPrice = prod ? prod.price_buy : 0;
      cogs += buyPrice * item.quantity * item.multiplier;
    });
    const profit = revenue - cogs;
    return { revenue, profit, cogs };
  };

  // Summary metrics for selected time range
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let txCount = transactionsFilteredByTime.length;

    transactionsFilteredByTime.forEach((tx) => {
      const { revenue, profit } = getTransactionProfitAndRevenue(tx);
      totalRevenue += revenue;
      totalProfit += profit;
    });

    return {
      revenue: totalRevenue,
      profit: totalProfit,
      count: txCount,
    };
  }, [transactionsFilteredByTime, productMap]);

  // Hourly transactions data for the AreaChart
  const hourlyChartData = useMemo(() => {
    const hours = [8, 10, 12, 14, 16, 18, 20, 22];
    const dataMap = hours.reduce((acc, h) => {
      acc[h] = { hourLabel: `${String(h).padStart(2, '0')}.00`, transaksi: 0, pendapatan: 0, keuntungan: 0 };
      return acc;
    }, {} as Record<number, any>);

    transactionsFilteredByTime.forEach((tx) => {
      const hour = new Date(tx.date).getHours();
      const bucket = hours.find((h) => hour <= h) || 22;
      const { revenue, profit } = getTransactionProfitAndRevenue(tx);

      dataMap[bucket].transaksi += 1;
      dataMap[bucket].pendapatan += revenue;
      dataMap[bucket].keuntungan += profit;
    });

    return hours.map((h) => dataMap[h]);
  }, [transactionsFilteredByTime, productMap]);

  // Daily trend sales data (for trend view)
  const dailyTrendData = useMemo(() => {
    const map: Record<string, { dateLabel: string; omset: number; untung: number; count: number }> = {};
    transactionsFilteredByTime.forEach((tx) => {
      const day = tx.date.slice(0, 10);
      const { revenue, profit } = getTransactionProfitAndRevenue(tx);
      if (!map[day]) {
        map[day] = {
          dateLabel: new Date(day).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
          omset: 0,
          untung: 0,
          count: 0
        };
      }
      map[day].omset += revenue;
      map[day].untung += profit;
      map[day].count += 1;
    });

    return Object.values(map).sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
  }, [transactionsFilteredByTime]);

  // Payment Method Summary
  const paymentMethodSummary = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {
      Cash: { count: 0, total: 0 },
      Debit: { count: 0, total: 0 },
      Transfer: { count: 0, total: 0 },
      GoPay: { count: 0, total: 0 },
      OVO: { count: 0, total: 0 },
      Cashless: { count: 0, total: 0 },
    };

    transactionsFilteredByTime.forEach((tx) => {
      const pm = tx.paymentMethod === 'Card' ? 'Debit' : tx.paymentMethod === 'QRIS' ? 'Cashless' : tx.paymentMethod;
      if (summary[pm]) {
        summary[pm].count += 1;
        summary[pm].total += tx.totalAmount;
      } else {
        // Fallback untuk metode tidak dikenal
        summary['Cash'].count += 1;
        summary['Cash'].total += tx.totalAmount;
      }
    });

    return summary;
  }, [transactionsFilteredByTime]);

  // Comparison metrics with yesterday
  const yesterdayMetrics = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTxs = allTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate.toDateString() === yesterday.toDateString();
    });
    let revenue = 0; let profit = 0;
    yesterdayTxs.forEach((tx) => {
      const { revenue: r, profit: p } = getTransactionProfitAndRevenue(tx);
      revenue += r; profit += p;
    });
    return { count: yesterdayTxs.length, revenue, profit };
  }, [allTransactions, productMap]);

  // Most popular busiest day
  const busiestDay = useMemo(() => {
    const dayMap: Record<string, { count: number; label: string }> = {};
    transactionsFilteredByTime.forEach((tx) => {
      const day = tx.date.slice(0, 10);
      if (!dayMap[day]) {
        const d = new Date(day);
        dayMap[day] = {
          count: 0,
          label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        };
      }
      dayMap[day].count += 1;
    });
    const sorted = Object.entries(dayMap).sort((a, b) => b[1].count - a[1].count);
    if (sorted.length === 0) return null;
    return { date: sorted[0][1].label, count: sorted[0][1].count };
  }, [transactionsFilteredByTime]);

  // Unpaid piutang count
  const piutangCount = useMemo(() => allTransactions.filter((tx) => tx.amountPaid < tx.totalAmount).length, [allTransactions]);

  // Hutang (mock - count supplier purchases as hutang)
  const hutangCount = useMemo(() => supplierPurchases.length, [supplierPurchases]);

  // Get date range label for display
  const getDateRangeLabel = () => {
    const now = new Date();
    if (selectedTimeRange === 'Hari Ini') {
      return now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (selectedTimeRange === 'Kemarin') {
      const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
      return yesterday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (selectedTimeRange === '7 Hari Terakhir') {
      const start = new Date(); start.setDate(now.getDate() - 6);
      const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const endStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  // Get label for section header based on time range
  const getReportSectionLabel = () => {
    if (selectedTimeRange === 'Hari Ini') return 'LAPORAN HARI INI';
    if (selectedTimeRange === 'Kemarin') return 'LAPORAN KEMARIN';
    if (selectedTimeRange === '7 Hari Terakhir') return 'LAPORAN MINGGU LALU';
    return 'LAPORAN BULAN INI';
  };

  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return 'NaN%';
    const pct = ((curr - prev) / prev) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  };

  // Sisa Modal (FIFO / Total stock value)
  const remainingCapital = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock > 0 ? p.stock * p.price_buy : 0), 0);
  }, [products]);

  // Top Sold Products
  const topSoldProducts = useMemo(() => {
    const soldMap: Record<string, { product: Product; quantity: number; revenue: number; profit: number }> = {};

    transactionsFilteredByTime.forEach((tx) => {
      tx.items.forEach((item) => {
        const prod = productMap.get(item.productId);
        if (prod) {
          if (!soldMap[prod.id]) {
            soldMap[prod.id] = { product: prod, quantity: 0, revenue: 0, profit: 0 };
          }
          const qty = item.quantity * item.multiplier;
          const rev = item.subtotal;
          const cost = prod.price_buy * qty;
          soldMap[prod.id].quantity += qty;
          soldMap[prod.id].revenue += rev;
          soldMap[prod.id].profit += (rev - cost);
        }
      });
    });

    return Object.values(soldMap).sort((a, b) => b.quantity - a.quantity);
  }, [transactionsFilteredByTime, productMap]);

  // Sales by category (dynamic calculation)
  const salesByCategory = useMemo(() => {
    const categoryMap: Record<string, { category: string; qty: number; revenue: number; profit: number }> = {};

    transactionsFilteredByTime.forEach((tx) => {
      tx.items.forEach((item) => {
        const prod = productMap.get(item.productId);
        const cat = prod ? prod.category : 'Umum';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, qty: 0, revenue: 0, profit: 0 };
        }
        const qty = item.quantity * item.multiplier;
        const rev = item.subtotal;
        const cost = (prod ? prod.price_buy : 0) * qty;

        categoryMap[cat].qty += qty;
        categoryMap[cat].revenue += rev;
        categoryMap[cat].profit += (rev - cost);
      });
    });

    return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
  }, [transactionsFilteredByTime, productMap]);

  const categoryChartData = useMemo(() => {
    if (salesByCategory.length <= 4) {
      return salesByCategory.map((c) => ({
        name: c.category,
        value: c.qty,
        revenue: c.revenue,
        profit: c.profit,
      }));
    }

    const top4 = salesByCategory.slice(0, 4);
    const otherList = salesByCategory.slice(4);
    const otherQty = otherList.reduce((sum, c) => sum + c.qty, 0);
    const otherRev = otherList.reduce((sum, c) => sum + c.revenue, 0);
    const otherProf = otherList.reduce((sum, c) => sum + c.profit, 0);

    return [
      ...top4.map((c) => ({
        name: c.category,
        value: c.qty,
        revenue: c.revenue,
        profit: c.profit,
      })),
      {
        name: 'Other',
        value: otherQty,
        revenue: otherRev,
        profit: otherProf,
        isOther: true,
        count: otherList.length,
        items: otherList,
      },
    ];
  }, [salesByCategory]);

  const stockFlowData = useMemo(() => {
    const outgoingMap: Record<string, number> = {};
    transactionsFilteredByTime.forEach((tx) => {
      tx.items.forEach((item) => {
        outgoingMap[item.productId] = (outgoingMap[item.productId] || 0) + item.quantity * item.multiplier;
      });
    });

    const now = new Date();
    const filteredPurchases = supplierPurchases.filter((p) => {
      const pDate = new Date(p.date);
      if (selectedTimeRange === 'Hari Ini') {
        return pDate.toDateString() === now.toDateString();
      }
      if (selectedTimeRange === 'Kemarin') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return pDate.toDateString() === yesterday.toDateString();
      }
      if (selectedTimeRange === '7 Hari Terakhir') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return pDate >= sevenDaysAgo;
      }
      if (selectedTimeRange === 'Bulan Ini') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    const incomingMap: Record<string, number> = {};
    filteredPurchases.forEach((p) => {
      const prod = products.find((pr) => pr.name.toLowerCase() === p.productName.toLowerCase());
      if (prod) {
        incomingMap[prod.id] = (incomingMap[prod.id] || 0) + p.qty;
      }
    });

    return products.map((p) => {
      const masuk = incomingMap[p.id] || 0;
      const keluar = outgoingMap[p.id] || 0;
      return {
        product: p,
        masuk,
        keluar,
      };
    });
  }, [transactionsFilteredByTime, supplierPurchases, products, selectedTimeRange]);

  // Inventory valuation grouped by category
  const inventoryByCategory = useMemo(() => {
    const catMap: Record<string, { category: string; count: number; stock: number; costValuation: number; sellValuation: number }> = {};

    products.forEach((p) => {
      if (p.stock > 0) {
        const cat = p.category || 'Umum';
        if (!catMap[cat]) {
          catMap[cat] = { category: cat, count: 0, stock: 0, costValuation: 0, sellValuation: 0 };
        }
        catMap[cat].count += 1;
        catMap[cat].stock += p.stock;
        catMap[cat].costValuation += p.stock * p.price_buy;
        catMap[cat].sellValuation += p.stock * p.price_sell;
      }
    });

    return Object.values(catMap).sort((a, b) => b.costValuation - a.costValuation);
  }, [products]);

  // Installment (Cicilan / Piutang) calculation: transactions with unpaid balance
  const installmentTransactions = useMemo(() => {
    return allTransactions
      .filter((tx) => tx.amountPaid < tx.totalAmount)
      .map((tx) => {
        const unpaid = tx.totalAmount - tx.amountPaid;
        return {
          ...tx,
          unpaidAmount: unpaid
        };
      });
  }, [allTransactions]);

  // Promotions/Discounts calculation
  const promotionsSummary = useMemo(() => {
    const promoTxs = allTransactions.filter((tx) => (tx.discountTotal || 0) > 0);
    const totalDiscountGiven = promoTxs.reduce((sum, tx) => sum + (tx.discountTotal || 0), 0);
    return {
      transactions: promoTxs,
      totalDiscount: totalDiscountGiven
    };
  }, [allTransactions]);

  // Visitors statistics
  const visitorsList = useMemo(() => {
    const visitorMap: Record<string, { name: string; type: string; visits: number; spent: number }> = {};

    allTransactions.forEach((tx) => {
      const name = tx.customerName || 'Umum';
      const key = `${name}-${tx.customerType}`;
      if (!visitorMap[key]) {
        visitorMap[key] = { name, type: tx.customerType, visits: 0, spent: 0 };
      }
      visitorMap[key].visits += 1;
      visitorMap[key].spent += tx.totalAmount;
    });

    return Object.values(visitorMap).sort((a, b) => b.spent - a.spent);
  }, [allTransactions]);

  // Purchase reports filtered by time
  const purchasesFiltered = useMemo(() => {
    const now = new Date();
    return supplierPurchases.filter((p) => {
      const pDate = new Date(p.date);
      if (purchaseTimeRange === 'hari') {
        return pDate.toDateString() === now.toDateString();
      }
      if (purchaseTimeRange === 'bulan') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      }
      if (purchaseTimeRange === 'tahun') {
        return pDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [supplierPurchases, purchaseTimeRange]);

  const handleCancelTx = async (tx: Transaction) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin membatalkan transaksi ${tx.invoiceNumber}? Stok barang akan dikembalikan.`
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await onCancelTransaction(tx.id, tx.items);
      await refreshData();
      setSelectedTx(null);
    } catch (err) {
      console.error(err);
      alert('Gagal membatalkan transaksi');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#f8fafc] text-gray-800 font-sans overflow-hidden">
      {/* ----------------- LEFT PANEL: ACCORDION NAVIGATION HUB ----------------- */}
      <div
        className={`w-full md:w-[290px] lg:w-[330px] md:border-r border-gray-200 bg-white flex flex-col shrink-0 ${
          activeSubView !== 'hub' && !isDesktop ? 'hidden' : 'flex'
        } h-full`}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={onToggleSidebar} className="p-2 hover:bg-teal-50 rounded-xl transition-colors md:hidden">
              <Menu size={22} className="text-teal-700" />
            </button>
            <h1 className="text-[19px] font-black text-teal-600 tracking-wide">Laporan</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className={`p-1.5 hover:bg-teal-50 rounded-full transition-colors cursor-pointer text-teal-600 ${
                loading ? 'animate-spin' : ''
              }`}
            >
              <RefreshCcw size={16} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* List of Collapsible Categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {/* Category 1: Performa Penjualan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => toggleAccordion('performa')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                openAccordions.performa ? 'bg-teal-50/40 text-teal-900' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <FileText size={18} className="text-teal-600" />
                <span>Performa Penjualan</span>
              </div>
              {openAccordions.performa ? <ChevronUp size={16} className="text-teal-700" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openAccordions.performa && (
              <div className="border-t border-gray-100/50 divide-y divide-gray-100 bg-white">
                <button
                  onClick={() => setActiveSubView('ringkasan_hari')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'ringkasan_hari' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Ringkasan Penjualan Harian</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => setActiveSubView('ringkasan_tren')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'ringkasan_tren' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Ringkasan Penjualan</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Direct Link: Laba Rugi */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => setActiveSubView('laba_rugi')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                activeSubView === 'laba_rugi' ? 'bg-teal-50/30 text-teal-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Scale size={18} className="text-teal-600" />
                <span>Laba Rugi</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Direct Link: Arus Keuangan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => setActiveSubView('arus_keuangan')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                activeSubView === 'arus_keuangan' ? 'bg-teal-50/30 text-teal-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Wallet size={18} className="text-teal-600" />
                <span>Arus Keuangan</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Category 2: Penjualan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => toggleAccordion('penjualan')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                openAccordions.penjualan ? 'bg-teal-50/40 text-teal-900' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <PieChartIcon size={18} className="text-teal-600" />
                <span>Penjualan</span>
              </div>
              {openAccordions.penjualan ? <ChevronUp size={16} className="text-teal-700" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openAccordions.penjualan && (
              <div className="border-t border-gray-100/50 divide-y divide-gray-100 bg-white">
                <button
                  onClick={() => {
                    setActiveSubView('transaksi');
                    setTransaksiLevel('menu');
                    setPaymentFilter('Semua');
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'transaksi' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Transaksi</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('barang');
                    setSelectedProductForDetail(null);
                    setProductDetailSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'barang' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Penjualan Barang</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('kategori');
                    setSelectedCategoryForDetail(null);
                    setCategoryDetailSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'kategori' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Penjualan Kategori</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => setActiveSubView('addons')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'addons' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Add On</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('arus_stok');
                    setStockFlowFilter('semua');
                    setStockFlowSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'arus_stok' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Arus Stok</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Category 3: Pembelian */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => toggleAccordion('pembelian')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                openAccordions.pembelian ? 'bg-teal-50/40 text-teal-900' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <ShoppingCart size={18} className="text-teal-600" />
                <span>Pembelian</span>
              </div>
              {openAccordions.pembelian ? <ChevronUp size={16} className="text-teal-700" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openAccordions.pembelian && (
              <div className="border-t border-gray-100/50 divide-y divide-gray-100 bg-white">
                <button
                  onClick={() => {
                    setActiveSubView('pembelian');
                    setPurchaseTimeRange('hari');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'pembelian' && purchaseTimeRange === 'hari' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Hari ini</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('pembelian');
                    setPurchaseTimeRange('bulan');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'pembelian' && purchaseTimeRange === 'bulan' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Bulan ini</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('pembelian');
                    setPurchaseTimeRange('tahun');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'pembelian' && purchaseTimeRange === 'tahun' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Tahun ini</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('pembelian');
                    setPurchaseTimeRange('semua');
                  }}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'pembelian' && purchaseTimeRange === 'semua' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Semua Laporan</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Category 4: Persediaan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => toggleAccordion('persediaan')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                openAccordions.persediaan ? 'bg-teal-50/40 text-teal-900' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Coins size={18} className="text-teal-600" />
                <span>Persediaan</span>
              </div>
              {openAccordions.persediaan ? <ChevronUp size={16} className="text-teal-700" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openAccordions.persediaan && (
              <div className="border-t border-gray-100/50 divide-y divide-gray-100 bg-white">
                <button
                  onClick={() => setActiveSubView('persediaan_barang')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'persediaan_barang' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Persediaan Per Barang</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
                <button
                  onClick={() => setActiveSubView('persediaan_kategori')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'persediaan_kategori' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Persediaan Per Kategori</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Direct Link: Cicilan / Piutang */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => setActiveSubView('cicilan')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                activeSubView === 'cicilan' ? 'bg-teal-50/30 text-teal-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Percent size={18} className="text-teal-600" />
                <span>Cicilan (Piutang)</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Category 5: Biaya */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => toggleAccordion('biaya')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                openAccordions.biaya ? 'bg-teal-50/40 text-teal-900' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Banknote size={18} className="text-teal-600" />
                <span>Biaya</span>
              </div>
              {openAccordions.biaya ? <ChevronUp size={16} className="text-teal-700" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openAccordions.biaya && (
              <div className="border-t border-gray-100/50 divide-y divide-gray-100 bg-white">
                <button
                  onClick={() => setActiveSubView('biaya')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'biaya' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Biaya Operasional</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Direct Link: Pengunjung */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => setActiveSubView('pengunjung')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                activeSubView === 'pengunjung' ? 'bg-teal-50/30 text-teal-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Users size={18} className="text-teal-600" />
                <span>Pengunjung</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Category 6: Promosi */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => toggleAccordion('promosi')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                openAccordions.promosi ? 'bg-teal-50/40 text-teal-900' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Tags size={18} className="text-teal-600" />
                <span>Promosi</span>
              </div>
              {openAccordions.promosi ? <ChevronUp size={16} className="text-teal-700" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openAccordions.promosi && (
              <div className="border-t border-gray-100/50 divide-y divide-gray-100 bg-white">
                <button
                  onClick={() => setActiveSubView('promosi')}
                  className={`w-full flex items-center justify-between px-10 py-3 text-[13px] font-semibold transition-colors cursor-pointer ${
                    activeSubView === 'promosi' ? 'bg-teal-50/30 text-teal-700' : 'text-gray-600 hover:bg-teal-50/10'
                  }`}
                >
                  <span>Laporan Diskon</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Direct Link: Back Office */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              onClick={() => setActiveSubView('back_office')}
              className={`w-full flex items-center justify-between px-4 py-3.5 cursor-pointer font-bold text-[14px] text-gray-800 transition-colors ${
                activeSubView === 'back_office' ? 'bg-teal-50/30 text-teal-700' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Monitor size={18} className="text-teal-600" />
                <span>Back Office</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- RIGHT PANEL: MAIN CONTENT PANE ----------------- */}
      <div
        className={`flex-1 flex flex-col h-full bg-[#f8fafc] ${
          activeSubView === 'hub' && !isDesktop ? 'hidden' : 'flex'
        }`}
      >
        {/* ----------------- SUB-VIEW: RINGKASAN PENJUALAN HARIAN ----------------- */}
        {activeSubView === 'ringkasan_hari' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveSubView('hub')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 md:hidden">
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900">Ringkasan Penjualan</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={refreshData} disabled={loading} className={`p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600 ${loading ? 'animate-spin' : ''}`}>
                  <RefreshCcw size={18} strokeWidth={2} />
                </button>
                <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600">
                  <Printer size={18} strokeWidth={2} />
                </button>
              </div>
            </header>

            {/* Semua Staff / Cash dan Piutang filter bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-0">
              <button
                onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users size={16} className="text-teal-600" />
                <span className="text-sm font-bold text-teal-600">{selectedStaff}</span>
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <button
                onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors justify-center"
              >
                <CreditCard size={16} className="text-teal-600" />
                <span className="text-sm font-bold text-teal-600">{selectedPaymentMode}</span>
                <ChevronDown size={14} className="text-teal-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              <div className="p-4 space-y-4 max-w-5xl mx-auto w-full pb-12">

              {/* Date selector */}
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer appearance-none"
                >
                  <option>Hari Ini</option>
                  <option>Kemarin</option>
                  <option>7 Hari Terakhir</option>
                  <option>Bulan Ini</option>
                </select>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </div>

              {/* Laporan Hari Ini cards */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide">{getReportSectionLabel()}</span>
                  <span className="text-xs text-gray-400 font-bold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="space-y-0 divide-y divide-gray-100">
                  {/* Jumlah Transaksi */}
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                      <Receipt size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold">Jumlah Transaksi</p>
                      <p className="text-[18px] font-black text-gray-800 font-mono leading-tight">{summaryMetrics.count}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-500">{calcPct(summaryMetrics.count, yesterdayMetrics.count)}</span>
                      <p className="text-[10px] text-gray-400 font-semibold">Vs Kemarin</p>
                    </div>
                  </div>
                  {/* Keuntungan */}
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-gray-500 font-semibold">Keuntungan</p>
                        <Info size={11} className="text-teal-500" />
                      </div>
                      <p className="text-[18px] font-black text-gray-800 font-mono leading-tight">{formatRupiah(summaryMetrics.profit)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-500">{calcPct(summaryMetrics.profit, yesterdayMetrics.profit)}</span>
                      <p className="text-[10px] text-gray-400 font-semibold">Vs Kemarin</p>
                    </div>
                  </div>
                  {/* Pendapatan */}
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold">Pendapatan</p>
                      <p className="text-[18px] font-black text-gray-800 font-mono leading-tight">{formatRupiah(summaryMetrics.revenue)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-500">{calcPct(summaryMetrics.revenue, yesterdayMetrics.revenue)}</span>
                      <p className="text-[10px] text-gray-400 font-semibold">Vs Kemarin</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hourly Chart */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide">LAPORAN TRANSAKSI PER JAM</span>
                  <span className="text-xs text-gray-400 font-bold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                  {(['transaksi', 'pendapatan', 'keuntungan'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveChartMetric(tab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer ${
                        activeChartMetric === tab
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab === 'transaksi' ? 'Jml Transaksi' : tab === 'pendapatan' ? 'Pendapatan' : 'Keuntungan'}
                    </button>
                  ))}
                </div>
                {/* Arrow label */}
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={12} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {activeChartMetric === 'transaksi' ? 'Jml Transaksi' : activeChartMetric === 'pendapatan' ? 'Pendapatan' : 'Keuntungan'}
                  </span>
                </div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetricRH" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hourLabel" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                      <Tooltip
                        formatter={(value: any) => [activeChartMetric === 'transaksi' ? value : formatRupiah(value), activeChartMetric.toUpperCase()]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey={activeChartMetric} stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorMetricRH)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-gray-400 font-semibold">→ Jam</span>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide">METODE PEMBAYARAN</span>
                  <Info size={15} className="text-teal-500" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {Object.entries(paymentMethodSummary).map(([method, data]) => {
                    const val = data as { count: number; total: number };
                    const displayMethod = method === 'Cashless' ? 'Cashle...' : method;
                    return (
                      <div key={method} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center flex-shrink-0 min-w-[65px] flex flex-col justify-center">
                        <span className="text-[10px] text-gray-500 font-bold truncate max-w-[60px] mx-auto block">{displayMethod}</span>
                        <span className="text-base font-black text-teal-700 font-mono my-1 leading-none">{val.count}</span>
                        <span className="text-[10px] font-bold text-gray-600 truncate">{formatRupiah(val.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Perhitungan Sisa Modal */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-gray-800 tracking-wide mb-1">PERHITUNGAN SISA MODAL</p>
                <p className="text-[11px] text-gray-400 font-semibold mb-3">Sisa modal didapat dari total (Stok x Harga Dasar)</p>
                <div className="bg-teal-50/50 border border-teal-100 rounded-xl py-3 px-4 text-center">
                  <p className="text-[10px] text-gray-500 font-bold mb-1">Sisa Modal - Metode FIFO</p>
                  <p className="text-xl font-black text-gray-800 font-mono">{formatRupiah(remainingCapital)}</p>
                </div>
              </div>

              {/* Laporan Penjualan Barang Accordion */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleAccordion('laporan_barang')}
                  className="w-full flex items-center justify-between px-4 py-4 font-black text-[13px] text-gray-800 uppercase tracking-wide"
                >
                  <span>LAPORAN PENJUALAN BARANG</span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${openAccordions.laporan_barang ? 'rotate-180' : ''}`} />
                </button>
                {openAccordions.laporan_barang && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100 px-4">
                    {topSoldProducts.length === 0 ? (
                      <p className="text-center py-8 text-xs text-gray-400 font-bold">Belum ada barang terjual pada periode ini</p>
                    ) : (
                      topSoldProducts.slice(0, 10).map(({ product, quantity, revenue, profit }) => {
                        const initials = product.name.slice(0, 2).toUpperCase();
                        return (
                          <div key={product.id} className="py-3 flex items-center justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs shrink-0">{initials}</div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-gray-800 truncate max-w-[180px]">{product.name}</h4>
                                <p className="text-[10px] text-gray-400 font-semibold">Untung {formatRupiah(profit)}</p>
                              </div>
                            </div>
                            <span className="text-xs font-black font-mono text-teal-700 shrink-0">{formatRupiah(revenue)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: RINGKASAN PENJUALAN TREN ----------------- */}
        {activeSubView === 'ringkasan_tren' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveSubView('hub')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 md:hidden">
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900">Ringkasan Penjualan</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={refreshData} disabled={loading} className={`p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600 ${loading ? 'animate-spin' : ''}`}>
                  <RefreshCcw size={18} strokeWidth={2} />
                </button>
                <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600">
                  <Printer size={18} strokeWidth={2} />
                </button>
              </div>
            </header>

            {/* Filter bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-0">
              <button className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Users size={16} className="text-teal-600" />
                <span className="text-sm font-bold text-teal-600">Semua Staff</span>
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <button className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors justify-center">
                <CreditCard size={16} className="text-teal-600" />
                <span className="text-sm font-bold text-teal-600">Cash dan Piutang</span>
                <ChevronDown size={14} className="text-teal-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              <div className="p-4 space-y-4 max-w-5xl mx-auto w-full pb-12">

              {/* Date dropdown */}
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer appearance-none"
                >
                  <option>Hari Ini</option>
                  <option>Kemarin</option>
                  <option>7 Hari Terakhir</option>
                  <option>Bulan Ini</option>
                </select>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </div>

              {/* Area Chart */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="h-52 w-full">
                  {dailyTrendData.length === 0 ? (
                    <div className="h-full flex flex-col justify-between py-4">
                      {[4,3,2,1,0].map((v) => (
                        <div key={v} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 w-3 text-right">{v}</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                      ))}
                      <div className="flex justify-end mt-1">
                        <span className="text-[10px] text-gray-400">→ Jam</span>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTren" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                        <Tooltip formatter={(value: any) => [formatRupiah(value), 'Omset']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                        <Area type="monotone" dataKey="omset" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorTren)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-gray-400 font-semibold">→ Jam</span>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide">METODE PEMBAYARAN</span>
                  <Info size={15} className="text-teal-500" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {Object.entries(paymentMethodSummary).map(([method, data]) => {
                    const val = data as { count: number; total: number };
                    const displayMethod = method === 'Cashless' ? 'Cashle...' : method;
                    return (
                      <div key={method} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center flex-shrink-0 min-w-[65px] flex flex-col justify-center">
                        <span className="text-[10px] text-gray-500 font-bold truncate max-w-[60px] mx-auto block">{displayMethod}</span>
                        <span className="text-base font-black text-teal-700 font-mono my-1 leading-none">{val.count}</span>
                        <span className="text-[10px] font-bold text-gray-600 truncate">{formatRupiah(val.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Perhitungan Sisa Modal */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-gray-800 tracking-wide mb-1">PERHITUNGAN SISA MODAL</p>
                <p className="text-[11px] text-gray-400 font-semibold mb-3">Sisa modal didapat dari total (Stok x Harga Dasar)</p>
                <div className="bg-teal-50/50 border border-teal-100 rounded-xl py-3 px-4 text-center">
                  <p className="text-[10px] text-gray-500 font-bold mb-1">Sisa Modal - Metode FIFO</p>
                  <p className="text-xl font-black text-gray-800 font-mono">{formatRupiah(remainingCapital)}</p>
                </div>
              </div>

              {/* Laporan Penjualan Barang Accordion */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleAccordion('laporan_barang_tren')}
                  className="w-full flex items-center justify-between px-4 py-4 font-black text-[13px] text-gray-800 uppercase tracking-wide"
                >
                  <span>LAPORAN PENJUALAN BARANG</span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${openAccordions.laporan_barang_tren ? 'rotate-180' : ''}`} />
                </button>
                {openAccordions.laporan_barang_tren && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100 px-4">
                    {topSoldProducts.length === 0 ? (
                      <p className="text-center py-8 text-xs text-gray-400 font-bold">Belum ada barang terjual pada periode ini</p>
                    ) : (
                      topSoldProducts.slice(0, 10).map(({ product, quantity, revenue }) => {
                        const initials = product.name.slice(0, 2).toUpperCase();
                        return (
                          <div key={product.id} className="py-3 flex items-center justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs shrink-0">{initials}</div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-gray-800 truncate max-w-[180px]">{product.name}</h4>
                                <p className="text-[10px] text-gray-400 font-semibold">Terjual</p>
                                <p className="text-[10px] text-gray-400 font-semibold">{quantity}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Laporan Minggu Lalu section (3 metrics) */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide">{getReportSectionLabel()}</span>
                  <span className="text-xs text-gray-400 font-bold">{getDateRangeLabel()}</span>
                </div>
                <div className="space-y-0 divide-y divide-gray-100">
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 text-white rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold">Jumlah Transaksi</p>
                      <p className="text-[18px] font-black text-gray-800 font-mono leading-tight">{summaryMetrics.count}</p>
                    </div>
                  </div>
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 text-white rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-gray-500 font-semibold">Keuntungan</p>
                        <Info size={11} className="text-teal-500" />
                      </div>
                      <p className="text-[18px] font-black text-gray-800 font-mono leading-tight">{formatRupiah(summaryMetrics.profit)}</p>
                    </div>
                  </div>
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 text-white rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-semibold">Pendapatan</p>
                      <p className="text-[18px] font-black text-gray-800 font-mono leading-tight">{formatRupiah(summaryMetrics.revenue)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barang Paling Laku */}
              {topSoldProducts.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide block mb-3">{topSoldProducts.length} BARANG PALING LAKU</span>
                  <div className="divide-y divide-gray-100">
                    {topSoldProducts.slice(0, 3).map(({ product, quantity }) => {
                      const initials = product.name.slice(0, 2).toUpperCase();
                      return (
                        <div key={product.id} className="py-3 flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 font-black text-xs shrink-0">{initials}</div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-gray-800 uppercase">{product.name}</h4>
                            <p className="text-[10px] text-gray-400 font-semibold">Terjual</p>
                            <p className="text-[11px] font-bold text-gray-600">{quantity}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transaksi Paling Ramai */}
              {busiestDay && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <span className="text-xs font-black uppercase text-gray-800 tracking-wide block mb-3">TRANSAKSI PALING RAMAI</span>
                  <div>
                    <p className="text-sm font-black text-gray-800">{busiestDay.date}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 font-semibold">Jumlah Transaksi</p>
                      <p className="text-sm font-black text-gray-800">{busiestDay.count}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Piutang Belum Lunas */}
              <button
                onClick={() => setActiveSubView('cicilan')}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-black uppercase text-gray-800 tracking-wide">{piutangCount} PIUTANG BELUM LUNAS</span>
                <ChevronDown size={18} className="text-gray-400 -rotate-90" />
              </button>

              {/* Hutang Belum Lunas */}
              <button
                onClick={() => setActiveSubView('pembelian')}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-black uppercase text-gray-800 tracking-wide">{hutangCount} HUTANG BELUM LUNAS</span>
                <ChevronDown size={18} className="text-gray-400 -rotate-90" />
              </button>

              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: LABA RUGI STATEMENT ----------------- */}
        {activeSubView === 'laba_rugi' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveSubView('hub')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 md:hidden">
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Laba Rugi</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600">
                  <Info size={18} strokeWidth={2} />
                </button>
                <button onClick={() => alert('Export ke Excel')} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600">
                  <Download size={18} strokeWidth={2} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              <div className="p-4 space-y-4 max-w-xl mx-auto w-full pb-12">

              {/* Date selector */}
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer appearance-none"
                >
                  <option>Hari Ini</option>
                  <option>Kemarin</option>
                  <option>7 Hari Terakhir</option>
                  <option>Bulan Ini</option>
                </select>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </div>

              {/* Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBeforePiutang}
                  onChange={(e) => setShowBeforePiutang(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 cursor-pointer"
                />
                <span className="text-sm text-gray-700 font-semibold">Tampilkan pemasukan sebelum piutang dibayar</span>
              </label>

              {/* P&L Statement Card */}
              {(() => {
                let penjualan = 0;
                let hppTotal = 0;
                let pemasukanLain = 0;
                let pengeluaranLain = 0;

                transactionsFilteredByTime.forEach((tx) => {
                  const { revenue, cogs: txCogs } = getTransactionProfitAndRevenue(tx);
                  penjualan += revenue;
                  hppTotal += txCogs;
                });

                const totalPemasukan = penjualan + pemasukanLain;
                const totalPengeluaran = hppTotal + pengeluaranLain;
                const labaBersih = totalPemasukan - totalPengeluaran;

                return (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    {/* 2-column grid */}
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      {/* Left column */}
                      <div className="p-4 space-y-5">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Penjualan</p>
                          <p className="text-base font-black text-teal-600 font-mono">{formatRupiah(penjualan)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Pemasukan Lain</p>
                          <p className="text-base font-black text-teal-600 font-mono">{formatRupiah(pemasukanLain)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Total Pemasukan</p>
                          <p className="text-base font-black text-teal-600 font-mono">{formatRupiah(totalPemasukan)}</p>
                        </div>
                      </div>
                      {/* Right column */}
                      <div className="p-4 space-y-5">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Harga Pokok Penjualan</p>
                          <p className="text-base font-black text-red-500 font-mono">{formatRupiah(hppTotal)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Pengeluaran Lain</p>
                          <p className="text-base font-black text-red-500 font-mono">{formatRupiah(pengeluaranLain)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Total Pengeluaran</p>
                          <p className="text-base font-black text-red-500 font-mono">{formatRupiah(totalPengeluaran)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Laba Bersih footer */}
                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 text-center">
                      <p className="text-sm text-gray-500 font-semibold mb-1">Laba Bersih</p>
                      <p className={`text-[28px] font-black font-mono leading-none ${labaBersih >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {formatRupiah(labaBersih)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: ARUS KEUANGAN ----------------- */}
        {activeSubView === 'arus_keuangan' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveSubView('hub')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 md:hidden">
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Arus Keuangan</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600">
                  <Info size={18} strokeWidth={2} />
                </button>
                <button onClick={() => alert('Export ke Excel')} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-teal-600">
                  <Download size={18} strokeWidth={2} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              <div className="p-4 space-y-4 max-w-xl mx-auto w-full pb-12">

              {/* Date selector */}
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer appearance-none"
                >
                  <option>Hari Ini</option>
                  <option>Kemarin</option>
                  <option>7 Hari Terakhir</option>
                  <option>Bulan Ini</option>
                </select>
                <ChevronDown size={16} className="text-gray-400 shrink-0" />
              </div>

              {/* P&L Statement Card */}
              {(() => {
                let pemasukan = 0;
                let pengeluaran = 0;
                let pemasukanLain = 0;
                
                // Operational costs sum for Pengeluaran Lain
                const pengeluaranLain = costsFilteredByTime.reduce((sum, c) => sum + c.amount, 0);

                transactionsFilteredByTime.forEach((tx) => {
                  const { revenue, cogs: txCogs } = getTransactionProfitAndRevenue(tx);
                  pemasukan += revenue;
                  pengeluaran += txCogs;
                });

                const totalPemasukan = pemasukan + pemasukanLain;
                const totalPengeluaran = pengeluaran + pengeluaranLain;
                const pendapatanNeto = totalPemasukan - totalPengeluaran;

                return (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    {/* 2-column grid */}
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      {/* Left column */}
                      <div className="p-4 space-y-5">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Pemasukan</p>
                          <p className="text-base font-black text-teal-600 font-mono">{formatRupiah(pemasukan)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Pemasukan Lain</p>
                          <p className="text-base font-black text-teal-600 font-mono">{formatRupiah(pemasukanLain)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Total Pemasukan</p>
                          <p className="text-base font-black text-teal-600 font-mono">{formatRupiah(totalPemasukan)}</p>
                        </div>
                      </div>
                      {/* Right column */}
                      <div className="p-4 space-y-5">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Pengeluaran</p>
                          <p className="text-base font-black text-red-500 font-mono">{formatRupiah(pengeluaran)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Pengeluaran Lain</p>
                          <p className="text-base font-black text-red-500 font-mono">{formatRupiah(pengeluaranLain)}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Total Pengeluaran</p>
                          <p className="text-base font-black text-red-500 font-mono">{formatRupiah(totalPengeluaran)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pendapatan Neto footer */}
                    <div className="border-t border-gray-100 bg-[#f0fdf4] p-5 text-center">
                      <p className="text-sm text-gray-500 font-semibold mb-1">Pendapatan Neto</p>
                      <p className={`text-[28px] font-black font-mono leading-none ${pendapatanNeto >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                        {formatRupiah(pendapatanNeto)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: TRANSAKSI DETAILED LOG ----------------- */}
        {activeSubView === 'transaksi' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (transaksiLevel === 'hari_ini') {
                      setTransaksiLevel('bulan_ini');
                    } else if (transaksiLevel === 'bulan_ini') {
                      setTransaksiLevel('tahun_ini');
                    } else if (transaksiLevel === 'tahun_ini') {
                      setTransaksiLevel('selama_ini');
                    } else if (transaksiLevel === 'selama_ini') {
                      setTransaksiLevel('menu');
                    } else {
                      setActiveSubView('hub');
                    }
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-1"
                >
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900 leading-tight">
                  {transaksiLevel === 'menu' && 'Laporan Penjualan'}
                  {transaksiLevel === 'selama_ini' && 'Laporan Transaksi Selama Ini'}
                  {transaksiLevel === 'tahun_ini' && `Laporan Transaksi Tahun ${selectedYear}`}
                  {transaksiLevel === 'bulan_ini' && 'Laporan Penjualan'}
                  {transaksiLevel === 'hari_ini' && `Laporan Hari ${selectedDayKey}`}
                </h1>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-600"
                >
                  <MoreVertical size={20} className="text-teal-600" />
                </button>
              </div>
            </header>

            {/* Subtitle / month metadata for Monthly view */}
            {transaksiLevel === 'bulan_ini' && selectedMonthKey && (
              <div className="text-center bg-white pb-2 -mt-1 text-xs text-gray-400 font-bold tracking-wide">
                {(() => {
                  const [y, m] = selectedMonthKey.split('-').map(Number);
                  return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                })()}
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              {/* ---------- MENU LEVEL (Image 4) ---------- */}
              {transaksiLevel === 'menu' && (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Search Bar "Cari kode struk" */}
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <Search size={18} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari kode struk..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none text-gray-700 font-semibold"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {searchQuery ? (
                    /* Search results directly if typing */
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-2">Hasil Pencarian</p>
                      {(() => {
                        const searchResults = allTransactions.filter((tx) =>
                          tx.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        if (searchResults.length === 0) {
                          return <p className="text-center py-6 text-xs text-gray-400">Tidak ada struk ditemukan</p>;
                        }
                        return searchResults.map((tx) => (
                          <div
                            key={tx.id}
                            onClick={() => setSelectedTx(tx)}
                            className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 px-2 rounded-xl transition-colors"
                          >
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{tx.invoiceNumber}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <span className="text-xs font-black font-mono text-teal-700">{formatRupiah(tx.totalAmount)}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    /* Menu list exactly like Image 4 */
                    <div className="space-y-3.5">
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().slice(0, 10);
                          setSelectedDayKey(today);
                          setTransaksiLevel('hari_ini');
                        }}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-xs flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <FileText size={20} className="text-teal-600" />
                          <span className="text-[14px] font-bold text-gray-700">Laporan Transaksi Hari Ini</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const now = new Date();
                          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                          setSelectedMonthKey(monthKey);
                          setTransaksiLevel('bulan_ini');
                        }}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-xs flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <FileText size={20} className="text-teal-600" />
                          <span className="text-[14px] font-bold text-gray-700">Laporan Transaksi Bulan Ini</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const now = new Date();
                          setSelectedYear(now.getFullYear());
                          setTransaksiLevel('tahun_ini');
                        }}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-xs flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <FileText size={20} className="text-teal-600" />
                          <span className="text-[14px] font-bold text-gray-700">Laporan Transaksi Tahun Ini</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setTransaksiLevel('selama_ini')}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-xs flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <FileText size={20} className="text-teal-600" />
                          <span className="text-[14px] font-bold text-gray-700">Laporan Transaksi Selama Ini</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ---------- SELAMA INI LEVEL (Lists Years) ---------- */}
              {transaksiLevel === 'selama_ini' && (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Metric Tabs */}
                  <div className="flex gap-2.5">
                    {(['transaksi', 'pendapatan', 'keuntungan'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setChartMetricInSelama(tab)}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                          chartMetricInSelama === tab
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {tab === 'transaksi' ? 'Jml Transaksi' : tab === 'pendapatan' ? 'Pendapatan' : 'Keuntungan'}
                      </button>
                    ))}
                  </div>

                  {/* All-time totals and trend graph */}
                  {(() => {
                    let totalCount = 0;
                    let totalRevenue = 0;
                    let totalProfit = 0;
                    allTransactions.forEach((tx) => {
                      totalCount += 1;
                      const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                      totalRevenue += revenue;
                      totalProfit += profit;
                    });

                    // Build yearly trend array
                    const trendMap: Record<number, { yearLabel: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                    allTransactions.forEach((tx) => {
                      const year = new Date(tx.date).getFullYear();
                      if (!trendMap[year]) {
                        trendMap[year] = {
                          yearLabel: String(year),
                          transaksi: 0,
                          pendapatan: 0,
                          keuntungan: 0
                        };
                      }
                      const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                      trendMap[year].transaksi += 1;
                      trendMap[year].pendapatan += revenue;
                      trendMap[year].keuntungan += profit;
                    });
                    const chartData = Object.values(trendMap).sort((a, b) => a.yearLabel.localeCompare(b.yearLabel));

                    return (
                      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-4">
                        {/* Selected metric summary card */}
                        <div className="bg-gray-50/50 border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-gray-500">
                            <span>
                              {chartMetricInSelama === 'transaksi' && 'Jml Transaksi'}
                              {chartMetricInSelama === 'pendapatan' && 'Pendapatan'}
                              {chartMetricInSelama === 'keuntungan' && 'Keuntungan'}
                            </span>
                            <Info size={13} className="text-teal-600" />
                          </div>
                          <span className="font-mono font-black text-gray-900 text-sm">
                            {chartMetricInSelama === 'transaksi' && totalCount}
                            {chartMetricInSelama === 'pendapatan' && formatRupiah(totalRevenue)}
                            {chartMetricInSelama === 'keuntungan' && formatRupiah(totalProfit)}
                          </span>
                        </div>

                        {/* Chart representation */}
                        {showChartInSelama && (
                          <div className="h-56 w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorMetricSelama" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="yearLabel" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <Tooltip
                                  formatter={(value: any) => [
                                    chartMetricInSelama === 'transaksi' ? value : formatRupiah(value),
                                    chartMetricInSelama.toUpperCase()
                                  ]}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey={chartMetricInSelama}
                                  stroke="#0d9488"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorMetricSelama)"
                                  dot={true}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ Tahun</div>
                          </div>
                        )}

                        {/* Action buttons (Bagikan / Sembunyikan Grafik) */}
                        <div className="flex border-t border-gray-100 pt-3.5 gap-2.5">
                          <button
                            onClick={() => alert('Laporan berhasil dibagikan!')}
                            className="flex-1 bg-teal-50/50 hover:bg-teal-50 text-teal-700 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-teal-100 cursor-pointer"
                          >
                            <Share2 size={14} /> Bagikan
                          </button>
                          <button
                            onClick={() => setShowChartInSelama(!showChartInSelama)}
                            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
                          >
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showChartInSelama ? 'rotate-180' : ''}`} />
                            {showChartInSelama ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of years */}
                  {(() => {
                    const yearsMap: Record<number, { year: number; count: number; revenue: number; profit: number }> = {};
                    allTransactions.forEach((tx) => {
                      const year = new Date(tx.date).getFullYear();
                      if (!yearsMap[year]) {
                        yearsMap[year] = { year, count: 0, revenue: 0, profit: 0 };
                      }
                      const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                      yearsMap[year].count += 1;
                      yearsMap[year].revenue += revenue;
                      yearsMap[year].profit += profit;
                    });
                    const list = Object.values(yearsMap).sort((a, b) => b.year - a.year);

                    if (list.length === 0) {
                      return <p className="text-center py-12 text-gray-400 text-sm font-bold">Belum ada data transaksi</p>;
                    }

                    return list.map(({ year, count, revenue, profit }) => (
                      <div key={year} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-black text-gray-900">{year}</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">{count} Transaksi</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400 font-bold">Pendapatan</span>
                            <p className="text-sm font-black font-mono text-gray-800">{formatRupiah(revenue)}</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">Keuntungan</span>
                            <span className="text-xs font-black font-mono text-emerald-600">{formatRupiah(profit)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const txsToDelete = allTransactions.filter((tx) => new Date(tx.date).getFullYear() === year);
                                const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus seluruh ${txsToDelete.length} transaksi di tahun ${year}?`);
                                if (!confirmed) return;
                                for (const tx of txsToDelete) {
                                  await onCancelTransaction(tx.id, tx.items);
                                }
                                await refreshData();
                              }}
                              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 mr-2 cursor-pointer"
                            >
                              Hapus <Trash2 size={13} className="text-red-400" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedYear(year);
                                setTransaksiLevel('tahun_ini');
                              }}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                            >
                              Detail <ChevronRight size={14} className="bg-teal-50 hover:bg-teal-100 p-0.5 rounded-full" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* ---------- TAHUN INI LEVEL (Lists Months of a Year) ---------- */}
              {transaksiLevel === 'tahun_ini' && selectedYear && (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Metric Tabs */}
                  <div className="flex gap-2.5">
                    {(['transaksi', 'pendapatan', 'keuntungan'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setChartMetricInTahun(tab)}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                          chartMetricInTahun === tab
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {tab === 'transaksi' ? 'Jml Transaksi' : tab === 'pendapatan' ? 'Pendapatan' : 'Keuntungan'}
                      </button>
                    ))}
                  </div>

                  {/* Yearly totals and trend graph */}
                  {(() => {
                    let totalCount = 0;
                    let totalRevenue = 0;
                    let totalProfit = 0;
                    allTransactions.forEach((tx) => {
                      const d = new Date(tx.date);
                      if (d.getFullYear() === selectedYear) {
                        totalCount += 1;
                        const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                        totalRevenue += revenue;
                        totalProfit += profit;
                      }
                    });

                    // Build monthly trend array
                    const trendMap: Record<string, { monthLabel: string; monthKey: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                    for (let m = 0; m < 12; m++) {
                      const monthKey = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
                      trendMap[monthKey] = {
                        monthKey,
                        monthLabel: monthNamesShort[m],
                        transaksi: 0,
                        pendapatan: 0,
                        keuntungan: 0
                      };
                    }
                    allTransactions.forEach((tx) => {
                      const d = new Date(tx.date);
                      if (d.getFullYear() !== selectedYear) return;
                      const monthKey = `${selectedYear}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      if (trendMap[monthKey]) {
                        const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                        trendMap[monthKey].transaksi += 1;
                        trendMap[monthKey].pendapatan += revenue;
                        trendMap[monthKey].keuntungan += profit;
                      }
                    });
                    const chartData = Object.values(trendMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

                    return (
                      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-4">
                        {/* Selected metric summary card */}
                        <div className="bg-gray-50/50 border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-gray-500">
                            <span>
                              {chartMetricInTahun === 'transaksi' && 'Jml Transaksi'}
                              {chartMetricInTahun === 'pendapatan' && 'Pendapatan'}
                              {chartMetricInTahun === 'keuntungan' && 'Keuntungan'}
                            </span>
                            <Info size={13} className="text-teal-600" />
                          </div>
                          <span className="font-mono font-black text-gray-900 text-sm">
                            {chartMetricInTahun === 'transaksi' && totalCount}
                            {chartMetricInTahun === 'pendapatan' && formatRupiah(totalRevenue)}
                            {chartMetricInTahun === 'keuntungan' && formatRupiah(totalProfit)}
                          </span>
                        </div>

                        {/* Chart representation */}
                        {showChartInTahun && (
                          <div className="h-56 w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorMetricTahun" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <Tooltip
                                  formatter={(value: any) => [
                                    chartMetricInTahun === 'transaksi' ? value : formatRupiah(value),
                                    chartMetricInTahun.toUpperCase()
                                  ]}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey={chartMetricInTahun}
                                  stroke="#0d9488"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorMetricTahun)"
                                  dot={true}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ Bulan</div>
                          </div>
                        )}

                        {/* Action buttons (Bagikan / Sembunyikan Grafik) */}
                        <div className="flex border-t border-gray-100 pt-3.5 gap-2.5">
                          <button
                            onClick={() => alert('Laporan berhasil dibagikan!')}
                            className="flex-1 bg-teal-50/50 hover:bg-teal-50 text-teal-700 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-teal-100 cursor-pointer"
                          >
                            <Share2 size={14} /> Bagikan
                          </button>
                          <button
                            onClick={() => setShowChartInTahun(!showChartInTahun)}
                            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
                          >
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showChartInTahun ? 'rotate-180' : ''}`} />
                            {showChartInTahun ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of months */}
                  {(() => {
                    const monthsMap: Record<string, { monthKey: string; monthName: string; year: number; count: number; revenue: number; profit: number }> = {};
                    allTransactions.forEach((tx) => {
                      const d = new Date(tx.date);
                      const year = d.getFullYear();
                      if (year !== selectedYear) return;
                      const month = d.getMonth();
                      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                      if (!monthsMap[monthKey]) {
                        monthsMap[monthKey] = {
                          monthKey,
                          monthName: d.toLocaleDateString('id-ID', { month: 'long' }),
                          year,
                          count: 0,
                          revenue: 0,
                          profit: 0
                        };
                      }
                      const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                      monthsMap[monthKey].count += 1;
                      monthsMap[monthKey].revenue += revenue;
                      monthsMap[monthKey].profit += profit;
                    });
                    const list = Object.values(monthsMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

                    if (list.length === 0) {
                      return <p className="text-center py-12 text-gray-400 text-sm font-bold">Tidak ada data transaksi di tahun {selectedYear}</p>;
                    }

                    return list.map(({ monthKey, monthName, year, count, revenue, profit }) => (
                      <div key={monthKey} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-black text-gray-900">{monthName} {year}</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">{count} Transaksi</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400 font-bold">Pendapatan</span>
                            <p className="text-sm font-black font-mono text-gray-800">{formatRupiah(revenue)}</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">Keuntungan</span>
                            <span className="text-xs font-black font-mono text-emerald-600">{formatRupiah(profit)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const txsToDelete = allTransactions.filter((tx) => tx.date.slice(0, 7) === monthKey);
                                const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus seluruh ${txsToDelete.length} transaksi di bulan ${monthName} ${year}?`);
                                if (!confirmed) return;
                                for (const tx of txsToDelete) {
                                  await onCancelTransaction(tx.id, tx.items);
                                }
                                await refreshData();
                              }}
                              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 mr-2 cursor-pointer"
                            >
                              Hapus <Trash2 size={13} className="text-red-400" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMonthKey(monthKey);
                                setTransaksiLevel('bulan_ini');
                              }}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                            >
                              Detail <ChevronRight size={14} className="bg-teal-50 hover:bg-teal-100 p-0.5 rounded-full" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* ---------- BULAN INI LEVEL (Lists Days with Trend Graph - Images 1, 2, 3) ---------- */}
              {transaksiLevel === 'bulan_ini' && selectedMonthKey && (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Metric Tabs */}
                  <div className="flex gap-2.5">
                    {(['transaksi', 'pendapatan', 'keuntungan'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setChartMetricInMonthly(tab)}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                          chartMetricInMonthly === tab
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {tab === 'transaksi' ? 'Jml Transaksi' : tab === 'pendapatan' ? 'Pendapatan' : 'Keuntungan'}
                      </button>
                    ))}
                  </div>

                  {/* Monthly totals and trend graph */}
                  {(() => {
                    let totalCount = 0;
                    let totalRevenue = 0;
                    let totalProfit = 0;
                    allTransactions.forEach((tx) => {
                      if (tx.date.slice(0, 7) === selectedMonthKey) {
                        totalCount += 1;
                        const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                        totalRevenue += revenue;
                        totalProfit += profit;
                      }
                    });

                    // Build daily trend array
                    const trendMap: Record<string, { dateLabel: string; dateStr: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                    const [year, month] = selectedMonthKey.split('-').map(Number);
                    const numDays = new Date(year, month, 0).getDate();
                    for (let d = 1; d <= numDays; d++) {
                      const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      trendMap[dayKey] = {
                        dateStr: dayKey,
                        dateLabel: String(d).padStart(2, '0'),
                        transaksi: 0,
                        pendapatan: 0,
                        keuntungan: 0
                      };
                    }
                    allTransactions.forEach((tx) => {
                      const txDateStr = tx.date.slice(0, 10);
                      if (txDateStr.startsWith(selectedMonthKey)) {
                        if (trendMap[txDateStr]) {
                          const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                          trendMap[txDateStr].transaksi += 1;
                          trendMap[txDateStr].pendapatan += revenue;
                          trendMap[txDateStr].keuntungan += profit;
                        }
                      }
                    });
                    const chartData = Object.values(trendMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

                    return (
                      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-4">
                        {/* Selected metric summary card */}
                        <div className="bg-gray-50/50 border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-gray-500">
                            <span>
                              {chartMetricInMonthly === 'transaksi' && 'Jml Transaksi'}
                              {chartMetricInMonthly === 'pendapatan' && 'Pendapatan'}
                              {chartMetricInMonthly === 'keuntungan' && 'Keuntungan'}
                            </span>
                            <Info size={13} className="text-teal-600" />
                          </div>
                          <span className="font-mono font-black text-gray-900 text-sm">
                            {chartMetricInMonthly === 'transaksi' && totalCount}
                            {chartMetricInMonthly === 'pendapatan' && formatRupiah(totalRevenue)}
                            {chartMetricInMonthly === 'keuntungan' && formatRupiah(totalProfit)}
                          </span>
                        </div>

                        {/* Chart representation */}
                        {showChartInMonthly && (
                          <div className="h-56 w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorMetricMonthly" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <Tooltip
                                  formatter={(value: any) => [
                                    chartMetricInMonthly === 'transaksi' ? value : formatRupiah(value),
                                    chartMetricInMonthly.toUpperCase()
                                  ]}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey={chartMetricInMonthly}
                                  stroke="#0d9488"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorMetricMonthly)"
                                  dot={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                            <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ Tanggal</div>
                          </div>
                        )}

                        {/* Action buttons (Bagikan / Sembunyikan Grafik) */}
                        <div className="flex border-t border-gray-100 pt-3.5 gap-2.5">
                          <button
                            onClick={() => alert('Laporan berhasil dibagikan!')}
                            className="flex-1 bg-teal-50/50 hover:bg-teal-50 text-teal-700 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-teal-100 cursor-pointer"
                          >
                            <Share2 size={14} /> Bagikan
                          </button>
                          <button
                            onClick={() => setShowChartInMonthly(!showChartInMonthly)}
                            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-200 cursor-pointer"
                          >
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showChartInMonthly ? 'rotate-180' : ''}`} />
                            {showChartInMonthly ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of days inside month */}
                  {(() => {
                    const daysMap: Record<string, { dateStr: string; dateLabel: string; count: number; revenue: number; profit: number }> = {};
                    allTransactions.forEach((tx) => {
                      const txDateStr = tx.date.slice(0, 10);
                      if (txDateStr.startsWith(selectedMonthKey)) {
                        if (!daysMap[txDateStr]) {
                          const d = new Date(txDateStr);
                          daysMap[txDateStr] = {
                            dateStr: txDateStr,
                            dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                            count: 0,
                            revenue: 0,
                            profit: 0
                          };
                        }
                        const { revenue, profit } = getTransactionProfitAndRevenue(tx);
                        daysMap[txDateStr].count += 1;
                        daysMap[txDateStr].revenue += revenue;
                        daysMap[txDateStr].profit += profit;
                      }
                    });
                    const list = Object.values(daysMap).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

                    if (list.length === 0) {
                      return <p className="text-center py-12 text-gray-400 text-sm font-bold">Tidak ada transaksi di bulan ini</p>;
                    }

                    return list.map(({ dateStr, dateLabel, count, revenue, profit }) => (
                      <div key={dateStr} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-black text-gray-800">{dateLabel}</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">{count} Transaksi</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400 font-bold">Pendapatan</span>
                            <p className="text-sm font-black font-mono text-gray-800">{formatRupiah(revenue)}</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block">Keuntungan</span>
                            <span className="text-xs font-black font-mono text-emerald-600">{formatRupiah(profit)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const txsToDelete = allTransactions.filter((tx) => tx.date.slice(0, 10) === dateStr);
                                const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus seluruh ${txsToDelete.length} transaksi pada tanggal ${dateStr}?`);
                                if (!confirmed) return;
                                for (const tx of txsToDelete) {
                                  await onCancelTransaction(tx.id, tx.items);
                                }
                                await refreshData();
                              }}
                              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 mr-2 cursor-pointer"
                            >
                              Hapus <Trash2 size={13} className="text-red-400" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDayKey(dateStr);
                                setTransaksiLevel('hari_ini');
                              }}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                            >
                              Detail <ChevronRight size={14} className="bg-teal-50 hover:bg-teal-100 p-0.5 rounded-full" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* ---------- HARI INI LEVEL (Lists Daily Transactions) ---------- */}
              {transaksiLevel === 'hari_ini' && selectedDayKey && (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Search and payment filter */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari Invoice / Nama Pelanggan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs outline-none w-full text-gray-700 font-semibold"
                      />
                    </div>

                    <div className="relative shrink-0">
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 outline-none appearance-none pr-8 cursor-pointer"
                      >
                        <option value="Semua">Metode: Semua</option>
                        <option value="Cash">Cash</option>
                        <option value="QRIS">QRIS</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Card">Card</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* List transactions */}
                  <div className="space-y-3.5">
                    {(() => {
                      const searchResults = allTransactions.filter((tx) => {
                        const txDateStr = tx.date.slice(0, 10);
                        if (txDateStr !== selectedDayKey) return false;
                        if (paymentFilter !== 'Semua' && tx.paymentMethod !== paymentFilter) return false;
                        if (searchQuery) {
                          const q = searchQuery.toLowerCase();
                          const matchInvoice = tx.invoiceNumber.toLowerCase().includes(q);
                          const matchCustomer = tx.customerName?.toLowerCase().includes(q);
                          if (!matchInvoice && !matchCustomer) return false;
                        }
                        return true;
                      });

                      if (searchResults.length === 0) {
                        return <p className="text-center py-12 text-xs text-gray-400 font-bold">Tidak ada transaksi ditemukan pada tanggal ini</p>;
                      }

                      return searchResults.map((tx) => (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 shadow-xs flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900">{tx.invoiceNumber}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${tx.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                {tx.paymentMethod}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold">
                              {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[11px] text-gray-500 font-bold">Pelanggan: {tx.customerName || 'Umum'} ({tx.customerType})</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono text-teal-700 block">{formatRupiah(tx.totalAmount)}</span>
                            <span className="text-[10px] text-gray-400 font-bold">{tx.totalItems} item</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PENJUALAN BARANG ----------------- */}
        {activeSubView === 'barang' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedProductForDetail) {
                      if (productDetailLevel === 'hari_ini') {
                        setProductDetailLevel('bulan_ini');
                      } else if (productDetailLevel === 'bulan_ini') {
                        setProductDetailLevel('tahun_ini');
                      } else if (productDetailLevel === 'tahun_ini') {
                        setProductDetailLevel('selama_ini');
                      } else {
                        setSelectedProductForDetail(null);
                      }
                    } else {
                      setActiveSubView('hub');
                    }
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-1"
                >
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900 leading-tight">
                  {!selectedProductForDetail && 'Penjualan Per Barang'}
                  {selectedProductForDetail && (
                    <>
                      {productDetailLevel === 'selama_ini' && 'Selama Ini'}
                      {productDetailLevel === 'tahun_ini' && `Tahun ${productDetailYear}`}
                      {productDetailLevel === 'bulan_ini' && (() => {
                        const [y, m] = productDetailMonthKey!.split('-').map(Number);
                        return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                      })()}
                      {productDetailLevel === 'hari_ini' && `Laporan Hari ${productDetailDayKey}`}
                    </>
                  )}
                </h1>
              </div>

              {!selectedProductForDetail && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className={`p-2 hover:bg-gray-100 rounded-full text-teal-600 transition-colors cursor-pointer ${loading ? 'animate-spin' : ''}`}
                  >
                    <RefreshCcw size={18} />
                  </button>
                  <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-full text-teal-600 transition-colors cursor-pointer">
                    <FileText size={18} />
                  </button>
                  <button onClick={() => alert('Laporan barang dibagikan!')} className="p-2 hover:bg-gray-100 rounded-full text-teal-600 transition-colors cursor-pointer">
                    <Share2 size={18} />
                  </button>
                </div>
              )}
            </header>

            {/* Filter staff/mode row */}
            {!selectedProductForDetail && (
              <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-0">
                <button
                  onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                  className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Users size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-teal-600">{selectedStaff}</span>
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                  className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors justify-center"
                >
                  <CreditCard size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-teal-600">{selectedPaymentMode}</span>
                  <ChevronDown size={14} className="text-teal-600" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              {/* ==================== PRODUCT DETAILS DRILLDOWN MODE (Slide 1 & 2) ==================== */}
              {selectedProductForDetail ? (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Capsule with Product Name */}
                  <div className="bg-teal-50 border border-teal-100 text-teal-800 py-3 px-4 rounded-xl text-center text-xs font-black tracking-wider uppercase shadow-xs">
                    {selectedProductForDetail.name}
                  </div>

                  {/* Compute detailed history data */}
                  {(() => {
                    // Filter transactions containing product
                    const txs = allTransactions.filter((tx) =>
                      tx.items.some((it) => it.productId === selectedProductForDetail.id)
                    );

                    // Build chart data based on level
                    let chartData: any[] = [];
                    let xKey = '';
                    let axisLabel = '';

                    if (productDetailLevel === 'selama_ini') {
                      const trendMap: Record<number, { yearLabel: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                      txs.forEach((tx) => {
                        const year = new Date(tx.date).getFullYear();
                        if (!trendMap[year]) {
                          trendMap[year] = { yearLabel: String(year), transaksi: 0, pendapatan: 0, keuntungan: 0 };
                        }
                        const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
                        const costPrice = selectedProductForDetail.costPrice || 0;
                        trendMap[year].transaksi += item.quantity;
                        trendMap[year].pendapatan += item.quantity * item.price;
                        trendMap[year].keuntungan += item.quantity * (item.price - costPrice);
                      });
                      chartData = Object.values(trendMap).sort((a, b) => a.yearLabel.localeCompare(b.yearLabel));
                      xKey = 'yearLabel';
                      axisLabel = 'Tahun';
                    } else if (productDetailLevel === 'tahun_ini') {
                      const trendMap: Record<string, { monthLabel: string; monthKey: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                      for (let m = 0; m < 12; m++) {
                        const monthKey = `${productDetailYear}-${String(m + 1).padStart(2, '0')}`;
                        trendMap[monthKey] = {
                          monthKey,
                          monthLabel: monthNamesShort[m],
                          transaksi: 0,
                          pendapatan: 0,
                          keuntungan: 0
                        };
                      }
                      txs.forEach((tx) => {
                        const d = new Date(tx.date);
                        if (d.getFullYear() !== productDetailYear) return;
                        const monthKey = `${productDetailYear}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (trendMap[monthKey]) {
                          const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
                          const costPrice = selectedProductForDetail.costPrice || 0;
                          trendMap[monthKey].transaksi += item.quantity;
                          trendMap[monthKey].pendapatan += item.quantity * item.price;
                          trendMap[monthKey].keuntungan += item.quantity * (item.price - costPrice);
                        }
                      });
                      chartData = Object.values(trendMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
                      xKey = 'monthLabel';
                      axisLabel = 'Bulan';
                    } else if (productDetailLevel === 'bulan_ini') {
                      const trendMap: Record<string, { dateLabel: string; dateStr: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                      const [year, month] = productDetailMonthKey!.split('-').map(Number);
                      const numDays = new Date(year, month, 0).getDate();
                      for (let d = 1; d <= numDays; d++) {
                        const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        trendMap[dayKey] = {
                          dateStr: dayKey,
                          dateLabel: String(d).padStart(2, '0'),
                          transaksi: 0,
                          pendapatan: 0,
                          keuntungan: 0
                        };
                      }
                      txs.forEach((tx) => {
                        const txDateStr = tx.date.slice(0, 10);
                        if (txDateStr.startsWith(productDetailMonthKey!)) {
                          if (trendMap[txDateStr]) {
                            const item = tx.items.find((it) => it.productId === selectedProductForDetail.id)!;
                            const costPrice = selectedProductForDetail.costPrice || 0;
                            trendMap[txDateStr].transaksi += item.quantity;
                            trendMap[txDateStr].pendapatan += item.quantity * item.price;
                            trendMap[txDateStr].keuntungan += item.quantity * (item.price - costPrice);
                          }
                        }
                      });
                      chartData = Object.values(trendMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
                      xKey = 'dateLabel';
                      axisLabel = 'Tanggal';
                    }

                    // Render charts inside collapsible cards
                    return (
                      <div className="space-y-4">
                        {/* CHART CARD 1: Penjualan (Qty) */}
                        {productDetailLevel !== 'hari_ini' && (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <button
                              onClick={() => setExpandedCards({ ...expandedCards, penjualan: !expandedCards.penjualan })}
                              className="w-full flex items-center justify-between font-extrabold text-sm text-gray-800 cursor-pointer"
                            >
                              <span>Grafik Jumlah Penjualan</span>
                              <ChevronDown size={18} className={`text-teal-600 transition-transform duration-200 ${expandedCards.penjualan ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCards.penjualan && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                  <TrendingUp size={14} className="text-teal-600" />
                                  <span>Jml Transaksi</span>
                                </div>
                                <div className="h-44 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorProdPenjualan" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey={xKey} tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="transaksi" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorProdPenjualan)" dot={true} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ {axisLabel}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CHART CARD 2: Keuntungan */}
                        {productDetailLevel !== 'hari_ini' && (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <button
                              onClick={() => setExpandedCards({ ...expandedCards, keuntungan: !expandedCards.keuntungan })}
                              className="w-full flex items-center justify-between font-extrabold text-sm text-gray-800 cursor-pointer"
                            >
                              <span>Grafik Jumlah Keuntungan</span>
                              <ChevronDown size={18} className={`text-teal-600 transition-transform duration-200 ${expandedCards.keuntungan ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCards.keuntungan && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                  <TrendingUp size={14} className="text-teal-600" />
                                  <span>Keuntungan</span>
                                </div>
                                <div className="h-44 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorProdKeuntungan" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey={xKey} tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <Tooltip formatter={(value: any) => formatRupiah(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="keuntungan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProdKeuntungan)" dot={true} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ {axisLabel}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CHART CARD 3: Pendapatan */}
                        {productDetailLevel !== 'hari_ini' && (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <button
                              onClick={() => setExpandedCards({ ...expandedCards, pendapatan: !expandedCards.pendapatan })}
                              className="w-full flex items-center justify-between font-extrabold text-sm text-gray-800 cursor-pointer"
                            >
                              <span>Grafik Jumlah Pendapatan</span>
                              <ChevronDown size={18} className={`text-teal-600 transition-transform duration-200 ${expandedCards.pendapatan ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCards.pendapatan && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                  <TrendingUp size={14} className="text-teal-600" />
                                  <span>Pendapatan</span>
                                </div>
                                <div className="h-44 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorProdPendapatan" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey={xKey} tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <Tooltip formatter={(value: any) => formatRupiah(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="pendapatan" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorProdPendapatan)" dot={true} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ {axisLabel}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* List of sub-periods or transactions below charts */}
                  <div className="space-y-3 pt-2">
                    {(() => {
                      const list = getProductNextLevelSummaryList();
                      if (list.length === 0) {
                        return <p className="text-center py-6 text-xs text-gray-400 font-bold">Tidak ada data penjualan</p>;
                      }

                      return list.map((item: any, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleProductNextLevelClick(item)}
                          className="bg-white border border-gray-100 hover:border-gray-200 p-4 rounded-2xl shadow-xs flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                        >
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-gray-900">{item.label}</h3>
                            <p className="text-[11px] text-gray-500 font-semibold">Keuntungan: <span className="text-emerald-600 font-mono font-bold">{formatRupiah(item.profit)}</span></p>
                            <p className="text-[11px] text-gray-400 font-semibold">Pendapatan: <span className="text-teal-700 font-mono font-bold">{formatRupiah(item.revenue)}</span></p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-teal-50 border border-teal-100 text-teal-800 text-[10px] font-black rounded-lg px-2 py-1">
                              {item.count}
                            </span>
                            <ChevronRight size={14} className="text-teal-600" />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                /* ==================== PRODUCT SUMMARY LIST MODE (Slide 3) ==================== */
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Search bar and sort icon */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 flex items-center gap-2 shadow-xs">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau kode barang..."
                        value={productDetailSearchQuery}
                        onChange={(e) => setProductDetailSearchQuery(e.target.value)}
                        className="bg-transparent text-xs outline-none w-full text-gray-700 font-semibold"
                      />
                      {productDetailSearchQuery && (
                        <button onClick={() => setProductDetailSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <div className="relative shrink-0">
                      <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 outline-none appearance-none pr-8 cursor-pointer shadow-xs"
                      >
                        <option>Hari Ini</option>
                        <option>Kemarin</option>
                        <option>7 Hari Terakhir</option>
                        <option>Bulan Ini</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Summary performance card banner (Slide 3 green banner) */}
                  {(() => {
                    // Filter and compute performance of active products
                    const performances = productPerformances.filter((p) => {
                      if (productDetailSearchQuery) {
                        const q = productDetailSearchQuery.toLowerCase();
                        return (
                          p.product.name.toLowerCase().includes(q) ||
                          p.product.sku?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    });

                    const totalQty = performances.reduce((sum, p) => sum + p.quantity, 0);
                    const totalRev = performances.reduce((sum, p) => sum + p.revenue, 0);
                    const totalProf = performances.reduce((sum, p) => sum + p.profit, 0);

                    return (
                      <>
                        <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-xs relative overflow-hidden">
                          <div className="relative z-10 space-y-2.5">
                            <div>
                              <span className="text-[10px] font-black uppercase text-emerald-100 tracking-wider">Qty Terjual</span>
                              <p className="text-2xl font-black leading-none mt-1">{totalQty}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-emerald-500/20 pt-2.5">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-emerald-100 tracking-wider">Pendapatan</span>
                                <p className="text-sm font-black font-mono mt-0.5">{formatRupiah(totalRev)}</p>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase text-emerald-100 tracking-wider">Keuntungan</span>
                                <p className="text-sm font-black font-mono mt-0.5">{formatRupiah(totalProf)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* List of items */}
                        <div className="space-y-3 pt-1">
                          {performances.length === 0 ? (
                            <p className="text-center py-12 text-xs text-gray-400 font-bold">Tidak ada data penjualan barang dalam periode ini.</p>
                          ) : (
                            performances.map(({ product, quantity, revenue, profit }) => {
                              const initials = product.name.substring(0, 2).toUpperCase();
                              return (
                                <div
                                  key={product.id}
                                  onClick={() => {
                                    setSelectedProductForDetail(product);
                                    setProductDetailLevel('selama_ini');
                                  }}
                                  className="bg-white border border-gray-100 hover:border-gray-200 p-4 rounded-2xl shadow-xs flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    {/* Initials circle */}
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 shrink-0 uppercase">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="text-xs font-extrabold text-gray-800 truncate pr-2">{product.name}</h3>
                                      <p className="text-[10px] text-gray-400 mt-1 font-semibold">Keuntungan: <span className="text-emerald-600 font-bold font-mono">{formatRupiah(profit)}</span></p>
                                      <p className="text-[10px] text-gray-400 font-semibold">Pendapatan: <span className="text-gray-700 font-bold font-mono">{formatRupiah(revenue)}</span></p>
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2">
                                    <span className="bg-teal-50 border border-teal-100 text-teal-800 text-[10px] font-black rounded-lg px-2.5 py-1">
                                      {quantity}
                                    </span>
                                    <ChevronRight size={14} className="text-teal-600" />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PENJUALAN KATEGORI ----------------- */}
        {activeSubView === 'kategori' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedCategoryForDetail) {
                      if (categoryDetailLevel === 'hari_ini') {
                        setCategoryDetailLevel('bulan_ini');
                      } else if (categoryDetailLevel === 'bulan_ini') {
                        setCategoryDetailLevel('tahun_ini');
                      } else if (categoryDetailLevel === 'tahun_ini') {
                        setCategoryDetailLevel('selama_ini');
                      } else {
                        setSelectedCategoryForDetail(null);
                      }
                    } else {
                      setActiveSubView('hub');
                    }
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-1"
                >
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-[17px] font-extrabold text-gray-900 leading-tight">
                  {!selectedCategoryForDetail && 'Penjualan Per Kategori'}
                  {selectedCategoryForDetail && (
                    <>
                      {categoryDetailLevel === 'selama_ini' && 'Selama Ini'}
                      {categoryDetailLevel === 'tahun_ini' && `Tahun ${categoryDetailYear}`}
                      {categoryDetailLevel === 'bulan_ini' && (() => {
                        const [y, m] = categoryDetailMonthKey!.split('-').map(Number);
                        return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                      })()}
                      {categoryDetailLevel === 'hari_ini' && `Laporan Hari ${categoryDetailDayKey}`}
                    </>
                  )}
                </h1>
              </div>

              {!selectedCategoryForDetail && (
                <div className="flex items-center gap-2">
                  <button onClick={refreshData} disabled={loading} className={`p-2 hover:bg-gray-100 rounded-full text-teal-600 transition-colors cursor-pointer ${loading ? 'animate-spin' : ''}`}>
                    <RefreshCcw size={18} />
                  </button>
                  <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-full text-teal-600 transition-colors cursor-pointer">
                    <FileText size={18} />
                  </button>
                  <button onClick={() => alert('Laporan kategori dibagikan!')} className="p-2 hover:bg-gray-100 rounded-full text-teal-600 transition-colors cursor-pointer">
                    <Share2 size={18} />
                  </button>
                </div>
              )}
            </header>

            {/* Filter staff/mode row */}
            {!selectedCategoryForDetail && (
              <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-0">
                <button
                  onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                  className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Users size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-teal-600">{selectedStaff}</span>
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
                  className="flex items-center gap-2 flex-1 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors justify-center"
                >
                  <CreditCard size={16} className="text-teal-600" />
                  <span className="text-sm font-bold text-teal-600">{selectedPaymentMode}</span>
                  <ChevronDown size={14} className="text-teal-600" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
              {/* ==================== CATEGORY DETAILS DRILLDOWN MODE ==================== */}
              {selectedCategoryForDetail ? (
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full">
                  {/* Capsule with Category Name */}
                  <div className="bg-teal-50 border border-teal-100 text-teal-800 py-3 px-4 rounded-xl text-center text-xs font-black tracking-wider uppercase shadow-xs">
                    {selectedCategoryForDetail}
                  </div>

                  {/* Compute detailed history data */}
                  {(() => {
                    const txs = allTransactions.filter((tx) =>
                      tx.items.some((it) => {
                        const prod = productMap.get(it.productId);
                        return prod?.category === selectedCategoryForDetail;
                      })
                    );

                    let chartData: any[] = [];
                    let xKey = '';
                    let axisLabel = '';

                    if (categoryDetailLevel === 'selama_ini') {
                      const trendMap: Record<number, { yearLabel: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                      txs.forEach((tx) => {
                        const year = new Date(tx.date).getFullYear();
                        if (!trendMap[year]) {
                          trendMap[year] = { yearLabel: String(year), transaksi: 0, pendapatan: 0, keuntungan: 0 };
                        }
                        tx.items.forEach((item) => {
                          const prod = productMap.get(item.productId);
                          if (prod?.category === selectedCategoryForDetail) {
                            const costPrice = prod.price_buy || 0;
                            trendMap[year].transaksi += item.quantity;
                            trendMap[year].pendapatan += item.quantity * item.price;
                            trendMap[year].keuntungan += item.quantity * (item.price - costPrice);
                          }
                        });
                      });
                      chartData = Object.values(trendMap).sort((a, b) => a.yearLabel.localeCompare(b.yearLabel));
                      xKey = 'yearLabel';
                      axisLabel = 'Tahun';
                    } else if (categoryDetailLevel === 'tahun_ini') {
                      const trendMap: Record<string, { monthLabel: string; monthKey: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                      for (let m = 0; m < 12; m++) {
                        const monthKey = `${categoryDetailYear}-${String(m + 1).padStart(2, '0')}`;
                        trendMap[monthKey] = {
                          monthKey,
                          monthLabel: monthNamesShort[m],
                          transaksi: 0,
                          pendapatan: 0,
                          keuntungan: 0
                        };
                      }
                      txs.forEach((tx) => {
                        const d = new Date(tx.date);
                        if (d.getFullYear() !== categoryDetailYear) return;
                        const monthKey = `${categoryDetailYear}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (trendMap[monthKey]) {
                          tx.items.forEach((item) => {
                            const prod = productMap.get(item.productId);
                            if (prod?.category === selectedCategoryForDetail) {
                              const costPrice = prod.price_buy || 0;
                              trendMap[monthKey].transaksi += item.quantity;
                              trendMap[monthKey].pendapatan += item.quantity * item.price;
                              trendMap[monthKey].keuntungan += item.quantity * (item.price - costPrice);
                            }
                          });
                        }
                      });
                      chartData = Object.values(trendMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
                      xKey = 'monthLabel';
                      axisLabel = 'Bulan';
                    } else if (categoryDetailLevel === 'bulan_ini') {
                      const trendMap: Record<string, { dateLabel: string; dateStr: string; transaksi: number; pendapatan: number; keuntungan: number }> = {};
                      const [year, month] = categoryDetailMonthKey!.split('-').map(Number);
                      const numDays = new Date(year, month, 0).getDate();
                      for (let d = 1; d <= numDays; d++) {
                        const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        trendMap[dayKey] = {
                          dateStr: dayKey,
                          dateLabel: String(d).padStart(2, '0'),
                          transaksi: 0,
                          pendapatan: 0,
                          keuntungan: 0
                        };
                      }
                      txs.forEach((tx) => {
                        const txDateStr = tx.date.slice(0, 10);
                        if (txDateStr.startsWith(categoryDetailMonthKey!)) {
                          if (trendMap[txDateStr]) {
                            tx.items.forEach((item) => {
                              const prod = productMap.get(item.productId);
                              if (prod?.category === selectedCategoryForDetail) {
                                const costPrice = prod.price_buy || 0;
                                trendMap[txDateStr].transaksi += item.quantity;
                                trendMap[txDateStr].pendapatan += item.quantity * item.price;
                                trendMap[txDateStr].keuntungan += item.quantity * (item.price - costPrice);
                              }
                            });
                          }
                        }
                      });
                      chartData = Object.values(trendMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
                      xKey = 'dateLabel';
                      axisLabel = 'Tanggal';
                    }

                    return (
                      <div className="space-y-4">
                        {/* CHART 1: Penjualan */}
                        {categoryDetailLevel !== 'hari_ini' && (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <button
                              onClick={() => setExpandedCards({ ...expandedCards, penjualan: !expandedCards.penjualan })}
                              className="w-full flex items-center justify-between font-extrabold text-sm text-gray-800 cursor-pointer"
                            >
                              <span>Grafik Jumlah Penjualan</span>
                              <ChevronDown size={18} className={`text-teal-600 transition-transform duration-200 ${expandedCards.penjualan ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCards.penjualan && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                  <TrendingUp size={14} className="text-teal-600" />
                                  <span>Jml Unit Laku</span>
                                </div>
                                <div className="h-44 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorCatPenjualan" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey={xKey} tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="transaksi" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorCatPenjualan)" dot={true} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ {axisLabel}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CHART 2: Keuntungan */}
                        {categoryDetailLevel !== 'hari_ini' && (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <button
                              onClick={() => setExpandedCards({ ...expandedCards, keuntungan: !expandedCards.keuntungan })}
                              className="w-full flex items-center justify-between font-extrabold text-sm text-gray-800 cursor-pointer"
                            >
                              <span>Grafik Jumlah Keuntungan</span>
                              <ChevronDown size={18} className={`text-teal-600 transition-transform duration-200 ${expandedCards.keuntungan ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCards.keuntungan && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                  <TrendingUp size={14} className="text-teal-600" />
                                  <span>Keuntungan</span>
                                </div>
                                <div className="h-44 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorCatKeuntungan" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey={xKey} tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <Tooltip formatter={(value: any) => formatRupiah(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="keuntungan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCatKeuntungan)" dot={true} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ {axisLabel}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CHART 3: Pendapatan */}
                        {categoryDetailLevel !== 'hari_ini' && (
                          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                            <button
                              onClick={() => setExpandedCards({ ...expandedCards, pendapatan: !expandedCards.pendapatan })}
                              className="w-full flex items-center justify-between font-extrabold text-sm text-gray-800 cursor-pointer"
                            >
                              <span>Grafik Jumlah Pendapatan</span>
                              <ChevronDown size={18} className={`text-teal-600 transition-transform duration-200 ${expandedCards.pendapatan ? 'rotate-180' : ''}`} />
                            </button>

                            {expandedCards.pendapatan && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                  <TrendingUp size={14} className="text-teal-600" />
                                  <span>Pendapatan</span>
                                </div>
                                <div className="h-44 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorCatPendapatan" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                      <XAxis dataKey={xKey} tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                      <Tooltip formatter={(value: any) => formatRupiah(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="pendapatan" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCatPendapatan)" dot={true} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                  <div className="flex justify-end mt-1 text-[9px] text-gray-400 font-bold">→ {axisLabel}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* List of sub-periods or transactions below charts */}
                  <div className="space-y-3 pt-2">
                    {(() => {
                      const list = getCategoryNextLevelSummaryList();
                      if (list.length === 0) {
                        return <p className="text-center py-6 text-xs text-gray-400 font-bold">Tidak ada data penjualan</p>;
                      }

                      return list.map((item: any, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCategoryNextLevelClick(item)}
                          className="bg-white border border-gray-100 hover:border-gray-200 p-4 rounded-2xl shadow-xs flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                        >
                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-gray-900">{item.label}</h3>
                            <p className="text-[11px] text-gray-500 font-semibold">Keuntungan: <span className="text-emerald-600 font-mono font-bold">{formatRupiah(item.profit)}</span></p>
                            <p className="text-[11px] text-gray-400 font-semibold">Pendapatan: <span className="text-teal-700 font-mono font-bold">{formatRupiah(item.revenue)}</span></p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-teal-50 border border-teal-100 text-teal-800 text-[10px] font-black rounded-lg px-2 py-1">
                              {item.count}
                            </span>
                            <ChevronRight size={14} className="text-teal-600" />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                /* ==================== CATEGORY LIST MODE (Slide 1 Donut) ==================== */
                <div className="p-4 space-y-4 max-w-xl mx-auto w-full pb-12">
                  {/* Dropdown date range */}
                  <div className="flex justify-end">
                    <div className="relative">
                      <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-600 outline-none appearance-none pr-8 cursor-pointer shadow-xs"
                      >
                        <option>Hari Ini</option>
                        <option>Kemarin</option>
                        <option>7 Hari Terakhir</option>
                        <option>Bulan Ini</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Doughnut Chart Card */}
                  {(() => {
                    const totalQty = salesByCategory.reduce((sum, c) => sum + c.qty, 0);
                    const COLORS = ['#0d9488', '#2dd4bf', '#f59e0b', '#fcc419', '#f87171', '#cbd5e1', '#3b82f6', '#a78bfa'];

                    return (
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Nilai dihitung berdasarkan persentase (%)</span>
                        
                        {totalQty === 0 ? (
                          <p className="py-12 text-xs text-gray-400 font-bold">Tidak ada transaksi pada kategori produk apapun.</p>
                        ) : (
                          <>
                            {/* Doughnut Chart */}
                            <div className="relative w-52 h-52 my-3">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={categoryChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {categoryChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              {/* Center Number label */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[28px] font-black text-gray-800 leading-none">{totalQty}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Unit Terjual</span>
                              </div>
                            </div>

                            {/* Legend in 2 columns */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4 text-[10px] font-bold text-gray-500 w-full max-w-sm">
                              {categoryChartData.map((entry, index) => {
                                const pct = totalQty > 0 ? ((entry.value / totalQty) * 100).toFixed(1) + '%' : '0%';
                                return (
                                  <div key={entry.name} className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="truncate">{entry.name} ({pct})</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Info Header Banner */}
                  {salesByCategory.length > 4 && (
                    <div className="bg-[#f0fdf4] text-emerald-800 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-[11px] font-bold shadow-xs">
                      <span>Hanya menampilkan 4 Kategori Teratas & Lainnya</span>
                      <Info size={14} className="text-emerald-600 shrink-0" />
                    </div>
                  )}

                  {/* List of Categories */}
                  <div className="space-y-3 pt-1">
                    {categoryChartData.length === 0 ? (
                      <p className="text-center py-8 text-xs text-gray-400 font-bold">Tidak ada data penjualan kategori.</p>
                    ) : (
                      categoryChartData.map((c, index) => {
                        const isOther = c.isOther;
                        const initials = isOther ? 'OT' : c.name.substring(0, 2).toUpperCase();

                        return (
                          <div
                            key={c.name}
                            onClick={() => {
                              if (isOther) {
                                setShowOtherCategoriesModal(true);
                              } else {
                                setSelectedCategoryForDetail(c.name);
                                setCategoryDetailLevel('selama_ini');
                              }
                            }}
                            className="bg-white border border-gray-100 hover:border-gray-200 p-4 rounded-2xl shadow-xs flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Avatar circle */}
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 shrink-0 uppercase">
                                {isOther ? (
                                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4 text-gray-500">
                                    <div className="bg-gray-400 rounded-xs" />
                                    <div className="bg-gray-400 rounded-xs" />
                                    <div className="bg-gray-400 rounded-xs" />
                                    <div className="bg-gray-400 rounded-xs" />
                                  </div>
                                ) : (
                                  initials
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-extrabold text-gray-800 truncate pr-2">
                                  {isOther ? 'Kategori Lainnya' : c.name}
                                </h3>
                                <p className="text-[10px] text-gray-400 mt-1 font-semibold">Keuntungan: <span className="text-emerald-600 font-bold font-mono">{formatRupiah(c.profit)}</span></p>
                                <p className="text-[10px] text-gray-400 font-semibold">Pendapatan: <span className="text-gray-700 font-bold font-mono">{formatRupiah(c.revenue)}</span></p>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <span className="bg-teal-50 border border-teal-100 text-teal-800 text-[10px] font-black rounded-lg px-2.5 py-1">
                                {c.value}
                              </span>
                              <ChevronRight size={14} className="text-teal-600" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Other Categories bottom sheet Modal */}
            {showOtherCategoriesModal && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
                <div className="bg-white rounded-t-3xl w-full max-w-xl p-5 pb-8 space-y-4 shadow-xl transform transition-transform animate-slide-up max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowOtherCategoriesModal(false)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                      <h3 className="text-base font-black text-gray-800">Other</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {salesByCategory.length - 4} Kategori
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto pr-1">
                    {salesByCategory.slice(4).map((c) => {
                      const initials = c.category.substring(0, 2).toUpperCase();
                      return (
                        <div
                          key={c.category}
                          onClick={() => {
                            setSelectedCategoryForDetail(c.category);
                            setCategoryDetailLevel('selama_ini');
                            setShowOtherCategoriesModal(false);
                          }}
                          className="py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors px-2 rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-gray-800 truncate">{c.category}</h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">Keuntungan: <span className="text-emerald-600 font-bold font-mono">{formatRupiah(c.profit)}</span></p>
                              <p className="text-[10px] text-gray-400">Pendapatan: <span className="text-gray-700 font-bold font-mono">{formatRupiah(c.revenue)}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="border border-emerald-100 bg-emerald-50 text-emerald-800 text-[10px] font-black rounded-lg px-2 py-0.5">
                              {c.qty}
                            </span>
                            <ChevronRight size={14} className="text-emerald-600" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- SUB-VIEW: ADD ON ----------------- */}
        {activeSubView === 'addons' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Add On & Catatan</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 max-w-2xl mx-auto w-full pb-12">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Catatan Khusus / Add On Transaksi</h3>
                <div className="divide-y divide-gray-100">
                  {(() => {
                    const addOnItems: any[] = [];
                    allTransactions.forEach((t) => {
                      t.items.forEach((item) => {
                        if (item.notes || item.addons) {
                          addOnItems.push({
                            invoice: t.invoiceNumber,
                            date: t.date,
                            itemName: item.productName,
                            qty: item.quantity,
                            notes: item.notes,
                            addons: item.addons
                          });
                        }
                      });
                    });

                    if (addOnItems.length === 0) {
                      return <p className="text-center py-10 text-xs text-gray-400 font-bold">Tidak ada item transaksi dengan catatan khusus / add-on.</p>;
                    }

                    return addOnItems.map((item, idx) => (
                      <div key={idx} className="py-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-800">{item.itemName}</h4>
                            <span className="text-[9px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded mt-1 inline-block">Invoice: {item.invoice}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-semibold">{item.qty} unit</span>
                        </div>
                        {item.notes && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mt-2 border border-gray-100">📋 Catatan: {item.notes}</p>}
                        {item.addons && <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg mt-1 border border-blue-100">➕ Add-on: {item.addons}</p>}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: ARUS STOK ----------------- */}
        {activeSubView === 'arus_stok' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Arus Stok & Log Persediaan</h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-full overflow-hidden">
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Status & Log Pergerakan Stok</h3>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">Memantau barang-barang yang mendekati batas stok minimum.</p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                  {products.map((p) => {
                    const isLowStock = p.stock <= p.min_stock;
                    return (
                      <div key={p.id} className="py-3.5 flex justify-between items-center gap-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-800">{p.name}</h4>
                          <span className="text-[10px] text-gray-400 font-semibold">Kategori: {p.category} | Min Stok: {p.min_stock}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`px-2.5 py-1 text-xs font-black font-mono rounded-lg ${isLowStock ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-800 border border-gray-200'}`}>
                            Stok: {p.stock}
                          </span>
                          {isLowStock && <p className="text-[9px] text-red-500 font-black mt-1 uppercase tracking-wide">STOK MENIPIS!</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PEMBELIAN DARI SUPPLIER ----------------- */}
        {activeSubView === 'pembelian' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">
                Laporan Pembelian ({purchaseTimeRange === 'hari' ? 'Hari Ini' : purchaseTimeRange === 'bulan' ? 'Bulan Ini' : purchaseTimeRange === 'tahun' ? 'Tahun Ini' : 'Semua'})
              </h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full space-y-4">
              {/* Form Input Pembelian Baru (Backend Simulator) */}
              <form onSubmit={handleAddPurchase} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 shrink-0">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <PlusCircle size={16} className="text-teal-600" /> Catat Pembelian Stok Baru
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nama Barang Restock..."
                    value={newPurchaseName}
                    onChange={(e) => setNewPurchaseName(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none w-full text-gray-700"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nama Supplier..."
                    value={newPurchaseSupplier}
                    onChange={(e) => setNewPurchaseSupplier(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none w-full text-gray-700"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="Kuantitas"
                    value={newPurchaseQty}
                    onChange={(e) => setNewPurchaseQty(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none w-full text-gray-700"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Harga Modal per unit"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none w-full text-gray-700"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold py-2 transition-colors cursor-pointer"
                  >
                    Simpan Pembelian
                  </button>
                </div>
              </form>

              {/* List Pembelian */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Riwayat Transaksi Restock</h3>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                  {purchasesFiltered.length === 0 ? (
                    <p className="text-center py-12 text-xs text-gray-400 font-bold">Tidak ada pembelian pada periode ini</p>
                  ) : (
                    purchasesFiltered.map((p) => (
                      <div key={p.id} className="py-3.5 flex justify-between items-center gap-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-800">{p.productName}</h4>
                          <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Supplier: {p.supplier} | Tanggal: {p.date}</span>
                          <span className="text-[11px] text-gray-500 font-bold block mt-0.5">{p.qty} unit x {formatRupiah(p.cost)}</span>
                        </div>
                        <span className="font-mono font-black text-gray-800 text-xs shrink-0">{formatRupiah(p.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PERSERDIAAN PER BARANG ----------------- */}
        {activeSubView === 'persediaan_barang' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Valuasi Persediaan Per Barang</h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 flex items-center gap-2 mb-4">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari Barang / SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full text-gray-700 font-semibold"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                {(() => {
                  const stockProducts = products.filter((p) => {
                    if (p.stock <= 0) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const matchName = p.name.toLowerCase().includes(q);
                      const matchSku = p.sku.toLowerCase().includes(q);
                      if (!matchName && !matchSku) return false;
                    }
                    return true;
                  });

                  if (stockProducts.length === 0) {
                    return <p className="text-center py-12 text-xs text-gray-400 font-bold">Tidak ada barang persediaan</p>;
                  }

                  return stockProducts.map((p) => {
                    const valBasic = p.stock * p.price_buy;
                    const potentialProfit = (p.price_sell - p.price_buy) * p.stock;
                    return (
                      <div key={p.id} className="py-3.5 flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-900">{p.name}</h4>
                          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">SKU: {p.sku}</p>
                          <p className="text-[11px] text-gray-500 mt-1 font-bold">Modal: {formatRupiah(p.price_buy)} | Jual: {formatRupiah(p.price_sell)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black font-mono text-teal-700">{formatRupiah(valBasic)}</span>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-bold">Stok: {p.stock}</p>
                          <p className="text-[9px] font-bold text-emerald-600">Potensi Untung: {formatRupiah(potentialProfit)}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PERSERDIAAN PER KATEGORI ----------------- */}
        {activeSubView === 'persediaan_kategori' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Valuasi Persediaan Per Kategori</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 max-w-2xl mx-auto w-full pb-12">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Aset Persediaan Tiap Kategori</h3>
                <div className="divide-y divide-gray-100">
                  {inventoryByCategory.length === 0 ? (
                    <p className="text-center py-10 text-xs text-gray-400 font-bold">Tidak ada barang persediaan di gudang.</p>
                  ) : (
                    inventoryByCategory.map((c) => {
                      const potProfit = c.sellValuation - c.costValuation;
                      return (
                        <div key={c.category} className="py-4 flex justify-between items-center">
                          <div>
                            <h4 className="text-sm font-extrabold text-gray-800">{c.category}</h4>
                            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Total: {c.count} produk ({c.stock} unit)</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono text-teal-700">{formatRupiah(c.costValuation)}</span>
                            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Potensi Laba: {formatRupiah(potProfit)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: CICILAN (PIUTANG) ----------------- */}
        {activeSubView === 'cicilan' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Cicilan & Piutang</h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full space-y-4">
              {/* Debt summary stats */}
              {(() => {
                const totalDebtVal = installmentTransactions.reduce((sum, tx) => sum + tx.unpaidAmount, 0);
                return (
                  <div className="bg-red-50/50 border border-red-150 rounded-2xl p-5 text-center">
                    <span className="text-xs font-black text-red-800 uppercase tracking-wider">TOTAL PIUTANG PELANGGAN</span>
                    <p className="text-[26px] font-black text-red-700 font-mono mt-1 leading-none">{formatRupiah(totalDebtVal)}</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-2">Daftar transaksi dengan pembayaran di bawah nilai tagihan.</p>
                  </div>
                );
              })()}

              {/* Debt Transactions List */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Piutang Berjalan</h3>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                  {installmentTransactions.length === 0 ? (
                    <p className="text-center py-12 text-xs text-gray-400 font-bold">Semua transaksi lunas. Tidak ada cicilan/piutang berjalan!</p>
                  ) : (
                    installmentTransactions.map((tx) => (
                      <div key={tx.id} className="py-4 flex justify-between items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900">{tx.invoiceNumber}</span>
                            <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-black">BELUM LUNAS</span>
                          </div>
                          <span className="text-[11px] text-gray-600 font-bold block mt-1">Pelanggan: {tx.customerName || 'Umum'} ({tx.customerType})</span>
                          <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Sudah Bayar: {formatRupiah(tx.amountPaid)} / Total: {formatRupiah(tx.totalAmount)}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black font-mono text-red-700 block">{formatRupiah(tx.unpaidAmount)}</span>
                          <span className="text-[9px] text-gray-400 font-semibold block mt-1">Sisa Piutang</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: BIAYA OPERASIONAL ----------------- */}
        {activeSubView === 'biaya' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Biaya & Pengeluaran</h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full space-y-4">
              {/* Form Input Biaya (Backend Simulator) */}
              <form onSubmit={handleAddCost} className="bg-gray-50 border border-gray-250 rounded-2xl p-4 space-y-3 shrink-0">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <PlusCircle size={16} className="text-teal-600" /> Catat Biaya/Pengeluaran Baru
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative">
                    <select
                      value={newCostCategory}
                      onChange={(e) => setNewCostCategory(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                    >
                      <option value="Operasional">Operasional</option>
                      <option value="Listrik & Air">Listrik & Air</option>
                      <option value="Gaji Karyawan">Gaji Karyawan</option>
                      <option value="Internet Wifi">Internet Wifi</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="text"
                    placeholder="Keterangan biaya..."
                    value={newCostNote}
                    onChange={(e) => setNewCostNote(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none w-full text-gray-700"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Jumlah (Rp)..."
                    value={newCostAmount}
                    onChange={(e) => setNewCostAmount(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none w-full text-gray-700"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold px-4 py-2 transition-colors cursor-pointer"
                  >
                    Simpan Biaya
                  </button>
                </div>
              </form>

              {/* List Biaya */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Log Pengeluaran</h3>
                  <span className="text-xs font-black text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded">
                    Total: {formatRupiah(costs.reduce((sum, c) => sum + c.amount, 0))}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                  {costs.map((c) => (
                    <div key={c.id} className="py-3 flex justify-between items-center gap-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-800">{c.note}</h4>
                        <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Kategori: {c.category} | Tanggal: {c.date}</span>
                      </div>
                      <span className="font-mono font-black text-red-600 text-xs shrink-0">-{formatRupiah(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PENGUNJUNG ----------------- */}
        {activeSubView === 'pengunjung' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Pengunjung & Pelanggan</h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Statistik Aktivitas Pelanggan</h3>
                <p className="text-xs text-gray-400 mb-4 font-semibold">Merekam data pelanggan yang melakukan pembelanjaan.</p>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                  {visitorsList.map((v, idx) => (
                    <div key={idx} className="py-3.5 flex justify-between items-center gap-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-800">{v.name}</h4>
                        <span className="text-[10px] text-gray-400 font-semibold">Tipe: {v.type} | Total Belanja: {v.visits} kali</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black font-mono text-teal-700">{formatRupiah(v.spent)}</span>
                        <p className="text-[9px] text-gray-400 font-semibold mt-0.5">Total Kontribusi</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: PROMOSI ----------------- */}
        {activeSubView === 'promosi' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Laporan Diskon & Promosi</h1>
            </header>

            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden max-w-4xl mx-auto w-full space-y-4">
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 text-center">
                <span className="text-xs font-black text-teal-800 uppercase tracking-wider">TOTAL DISKON DIBERIKAN</span>
                <p className="text-[26px] font-black text-teal-700 font-mono mt-1 leading-none">{formatRupiah(promotionsSummary.totalDiscount)}</p>
                <p className="text-[10px] text-gray-500 font-semibold mt-2">Akumulasi total potongan harga yang dinikmati pelanggan.</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">Daftar Nota dengan Diskon</h3>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
                  {promotionsSummary.transactions.length === 0 ? (
                    <p className="text-center py-12 text-xs text-gray-400 font-bold">Tidak ada transaksi yang diberikan diskon.</p>
                  ) : (
                    promotionsSummary.transactions.map((tx) => (
                      <div key={tx.id} className="py-3.5 flex justify-between items-center gap-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-800">{tx.invoiceNumber}</h4>
                          <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Pelanggan: {tx.customerName || 'Umum'} | Tanggal: {tx.date.slice(0, 10)}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black font-mono text-red-500">-{formatRupiah(tx.discountTotal || 0)}</span>
                          <span className="text-[9px] text-gray-400 font-semibold block mt-0.5">Nilai Diskon</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SUB-VIEW: BACK OFFICE ----------------- */}
        {activeSubView === 'back_office' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <header className="bg-white border-b border-gray-100 px-5 py-4 flex items-center sticky top-0 z-30">
              <button
                onClick={() => setActiveSubView('hub')}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600 mr-2 md:hidden"
              >
                <ChevronLeft size={22} />
              </button>
              <h1 className="text-[17px] font-extrabold text-gray-900">Back Office Hub</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-5 max-w-xl mx-auto w-full space-y-5 text-center flex flex-col justify-center items-center">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-2">
                <Monitor size={32} />
              </div>
              <h2 className="text-lg font-black text-gray-900">Manajemen Toko & Katalog</h2>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                Kembali ke modul utama untuk mengelola daftar produk, kategori, diskon wholesale, akun staf kasir, sinkronisasi Supabase cloud, dan konfigurasi lainnya.
              </p>
              <button
                onClick={() => {
                  if (onNavigateToCatalog) {
                    onNavigateToCatalog();
                  } else {
                    alert('Gunakan sidebar navigasi untuk beralih halaman');
                  }
                }}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors"
              >
                Buka Manajemen Produk & Toko
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- TRANSACTION DETAIL OVERLAY MODAL ----------------- */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-800">{selectedTx.invoiceNumber}</h3>
                <p className="text-[10px] text-gray-400 font-semibold">{new Date(selectedTx.date).toLocaleString('id-ID')}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-xs">
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[9px] block">PELANGGAN</span>
                  <span className="font-extrabold text-gray-800 block mt-0.5">{selectedTx.customerName || 'Umum'}</span>
                  <span className="text-[10px] text-gray-500 font-bold">Tipe: {selectedTx.customerType}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[9px] block">KASIR</span>
                  <span className="font-extrabold text-gray-800 block mt-0.5">{selectedTx.cashierName || 'Budhi'}</span>
                  <span className="text-[10px] text-gray-500 font-bold">Metode: {selectedTx.paymentMethod}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">DAFTAR BARANG</span>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                  {selectedTx.items.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <h5 className="font-extrabold text-gray-800">{item.productName}</h5>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {item.quantity} x {formatRupiah(item.price)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-gray-900 shrink-0">{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Subtotal</span>
                  <span className="font-mono font-bold text-gray-800">
                    {formatRupiah(selectedTx.items.reduce((sum, item) => sum + item.subtotal, 0))}
                  </span>
                </div>
                {selectedTx.discountTotal && selectedTx.discountTotal > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Total Diskon</span>
                    <span className="font-mono font-bold text-red-500">-{formatRupiah(selectedTx.discountTotal)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-sm border-t border-gray-150 pt-2 text-teal-800">
                  <span>Total Tagihan</span>
                  <span className="font-mono">{formatRupiah(selectedTx.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Dibayar</span>
                  <span className="font-mono font-bold text-gray-800">{formatRupiah(selectedTx.amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Kembalian</span>
                  <span className="font-mono font-bold text-gray-800">{formatRupiah(selectedTx.changeAmount)}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-t-gray-100 flex items-center justify-between gap-2.5">
              <button
                onClick={() => handleCancelTx(selectedTx)}
                disabled={cancelling}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-200"
              >
                <Trash2 size={14} />
                {cancelling ? 'Membatalkan...' : 'Batalkan Transaksi'}
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
