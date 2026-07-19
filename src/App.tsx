/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Database,
  Sparkles,
  Server,
  CloudLightning,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  PackageCheck,
  Receipt,
  Terminal,
  Users,
  LogOut,
  Shield,
  UserCheck,
  FileText,
  BarChart3,
  PieChart,
  Users2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  MonitorSmartphone,
  Tags,
  Globe,
  RefreshCcw,
  PackagePlus,
  Banknote,
  Clock,
  Computer,
  Settings,
  Store,
  Phone,
  HandCoins,
  User,
  Monitor,
  Menu
} from 'lucide-react';
import { Product, DatabaseConfig, StaffAccount, Transaction, TransactionItem } from './types';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getTransactions,
  deleteTransaction,
} from './lib/dbManager';
import { loadDbConfig, getSupabaseClient, SUPABASE_ALTER_SQL, supabaseUpdateProduct, supabaseAddProduct, supabaseDeleteProduct } from './lib/supabase';
import { localBulkAddProducts, localClearProducts, localUpdateProduct, localAddProduct, localDeleteProduct } from './lib/indexedDb';
import { MOCK_PRODUCTS } from './data';

// Modular Components
import Dashboard from './components/Dashboard';
import ProductTable from './components/ProductTable';
import ProductForm from './components/ProductForm';
import DatabaseSettings from './components/DatabaseSettings';
import DummyDataGenerator from './components/DummyDataGenerator';
import PointOfSale from './components/PointOfSale';
import Login from './components/Login';
import StaffManagement from './components/StaffManagement';
import SettingsView from './components/Settings';
import ManajemenView from './components/Manajemen';
import BarangList from './components/BarangList';
import SalesReport from './components/SalesReport';
import FinanceReport from './components/FinanceReport';
import Backoffice from './components/Backoffice';

export default function App() {
  // Authentication & RBAC Session State
  const [activeUser, setActiveUser] = useState<StaffAccount | null>(() => {
    const saved = localStorage.getItem('veloce_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Simple client-side routing state
  const [route, setRoute] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/pos')) return '/pos';
    return '/backoffice';
  });

  // Track popstate to handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/pos')) setRoute('/pos');
      else setRoute('/backoffice');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newRoute: string) => {
    window.history.pushState({}, '', newRoute);
    setRoute(newRoute);
  };

  // Application State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // UI State
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);
  const [isManajemenOpen, setIsManajemenOpen] = useState(false);

  // Database configuration
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>(() => loadDbConfig());

  // Form management
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Messages / Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transaction state for reports
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatLastRefreshed = (date: Date) => {
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Hari Ini, ${timeStr}`;
    }
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${date.toLocaleDateString('id-ID', options)} ${timeStr}`;
  };

  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(() => formatLastRefreshed(new Date()));

  const handleRefreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await loadData(false);
      await loadTransactions();
      setLastRefreshedTime(formatLastRefreshed(new Date()));
      triggerSuccess('Seluruh data berhasil disegarkan!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Authentication callbacks
  const handleLoginSuccess = (user: StaffAccount) => {
    setActiveUser(user);
    localStorage.setItem('veloce_session', JSON.stringify(user));
    
    if (route === '/pos') {
      triggerSuccess(`Selamat datang kembali, ${user.fullname}!`);
    } else {
      if (user.role === 'owner') {
        setActiveTab('dashboard');
        triggerSuccess(`Selamat datang kembali, ${user.fullname}!`);
      } else {
        navigateTo('/pos');
        triggerSuccess(`Selamat datang kembali, ${user.fullname}! Mengarahkan Anda ke Halaman POS Kasir...`);
      }
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    localStorage.removeItem('veloce_session');
  };

  // Helper to show temporary success alerts
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 1. Fetch products from database
  const loadData = useCallback(async (showOverlay = true) => {
    if (showOverlay) setLoading(true);
    setErrorMessage(null);
    try {
      let list = await getProducts();
      
      // Seed automatically on first open if database is entirely empty so dashboard looks stunning!
      if (list.length === 0 && dbConfig.mode === 'local') {
        await localBulkAddProducts(MOCK_PRODUCTS);
        list = [...MOCK_PRODUCTS];
        triggerSuccess('Selamat datang! Database lokal kosong, kami mengisinya dengan 8 barang sampel.');
      }
      
      setProducts(list);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal memuat barang dari database: ${err.message || 'Error tidak dikenal'}`);
    } finally {
      if (showOverlay) setLoading(false);
    }
  }, [dbConfig.mode]);

  // Load products on mount or when DB mode changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const txList = await getTransactions();
      setTransactions(txList);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 2. Handle single Product Add/Edit Save
  const handleSaveProduct = async (productToSave: Product) => {
    let supabaseFailed = false;
    let originalErrorMsg = '';

    try {
      if (editingProduct) {
        // Edit existing product - write to local first for offline safety
        await localUpdateProduct(productToSave);
        
        if (dbConfig.mode === 'supabase') {
          try {
            await supabaseUpdateProduct(productToSave);
          } catch (e: any) {
            supabaseFailed = true;
            originalErrorMsg = e.message || 'Error Supabase';
          }
        }
      } else {
        // Create new product - write to local first
        await localAddProduct(productToSave);

        if (dbConfig.mode === 'supabase') {
          try {
            await supabaseAddProduct(productToSave);
          } catch (e: any) {
            supabaseFailed = true;
            originalErrorMsg = e.message || 'Error Supabase';
          }
        }
      }
      
      setShowFormModal(false);
      setEditingProduct(null);
      await loadData(); // Reload state

      if (supabaseFailed) {
        setErrorMessage(`Gagal memperbarui barang di Supabase: ${originalErrorMsg}. Namun, data telah disimpan dengan aman di komputer Anda (Lokal Offline)!`);
      } else {
        triggerSuccess(`Sukses menyimpan barang: "${productToSave.name}"`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal menyimpan barang: ${err.message || 'Gagal'}`);
    }
  };

  // 3. Handle Single Product Delete
  const handleDeleteProduct = async (id: string) => {
    let supabaseFailed = false;
    let originalErrorMsg = '';

    try {
      // Delete from local DB first
      await localDeleteProduct(id);

      if (dbConfig.mode === 'supabase') {
        try {
          await supabaseDeleteProduct(id);
        } catch (e: any) {
          supabaseFailed = true;
          originalErrorMsg = e.message || 'Error Supabase';
        }
      }

      await loadData();

      if (supabaseFailed) {
        setErrorMessage(`Gagal menghapus barang dari Supabase: ${originalErrorMsg}. Namun, barang berhasil dihapus dari komputer Anda (Lokal Offline).`);
      } else {
        triggerSuccess('Satu barang berhasil dihapus dari database.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal menghapus barang: ${err.message}`);
    }
  };

  const handleBulkDeleteProducts = async (ids: string[]) => {
    let supabaseFailed = false;
    let originalErrorMsg = '';

    try {
      setLoading(true);
      for (const id of ids) {
        await localDeleteProduct(id);
      }

      if (dbConfig.mode === 'supabase') {
        const client = getSupabaseClient(dbConfig);
        if (client) {
          const chunkSize = 100;
          for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            try {
              const { error } = await client.from('products').delete().in('id', chunk);
              if (error) throw error;
            } catch (e: any) {
              supabaseFailed = true;
              originalErrorMsg = e.message || 'Error Supabase';
              break;
            }
          }
        }
      }

      await loadData();

      if (supabaseFailed) {
        setErrorMessage(`Gagal menghapus ${ids.length} barang dari Supabase: ${originalErrorMsg}. Namun, barang berhasil dihapus dari komputer Anda (Lokal Offline).`);
      } else {
        triggerSuccess(`${ids.length} barang berhasil dihapus dari database.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal menghapus barang: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Clear All Database Records
  const handleClearAll = async () => {
    setLoading(true);
    try {
      if (dbConfig.mode === 'supabase') {
        const client = getSupabaseClient(dbConfig);
        if (client) {
          // In Supabase, delete all with general check
          const { error } = await client.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) throw error;
        }
      }
      
      // Always clear local cache too
      await localClearProducts();
      setProducts([]);
      triggerSuccess('Semua data barang berhasil dikosongkan dari database.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal mengosongkan database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle CSV Bulk Import / Bulk Grid Save
  const handleBulkImport = async (importedList: Product[]) => {
    setLoading(true);
    let supabaseFailed = false;
    let originalErrorMsg = '';

    try {
      if (dbConfig.mode === 'supabase') {
        const client = getSupabaseClient(dbConfig);
        if (client) {
          // Bulk upsert to Supabase
          const chunkSize = 1000;
          for (let i = 0; i < importedList.length; i += chunkSize) {
            const chunk = importedList.slice(i, i + chunkSize);
            const { error } = await client.from('products').upsert(chunk, { onConflict: 'sku' });
            if (error) {
              supabaseFailed = true;
              originalErrorMsg = error.message;
              break;
            }
          }
        }
      }

      // Sync into local IndexedDB
      await localBulkAddProducts(importedList);
      
      if (supabaseFailed) {
        setErrorMessage(`Gagal sinkronisasi data massal ke Supabase: ${originalErrorMsg}. Namun, semua data Anda berhasil disimpan secara lokal (Lokal Offline) agar tidak hilang!`);
      } else {
        triggerSuccess(`Berhasil mengimpor ${importedList.length} barang secara massal.`);
      }
      
      await loadData();
    } catch (err: any) {
      console.error(err);
      // Fallback: save to local anyway so user edits are never lost
      try {
        await localBulkAddProducts(importedList);
        await loadData();
      } catch (e) {}
      setErrorMessage(`Gagal mengimpor data massal: ${err.message}. Data Anda telah dicadangkan secara lokal.`);
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Database Config/Mode updates
  const handleConfigChange = (newConfig: DatabaseConfig) => {
    setDbConfig(newConfig);
    triggerSuccess(`Kredensial disimpan. Database diubah ke mode: ${newConfig.mode === 'supabase' ? 'Supabase Cloud' : 'IndexedDB Lokal (Offline)'}`);
  };

  // Get active array of SKU values to prevent duplicates
  const existingSkus = useMemo(() => {
    return products.map((p) => p.sku);
  }, [products]);

  // Handle cancel/refund transaction: delete tx and restore stock
  const handleCancelTransaction = async (txId: string, items: TransactionItem[]) => {
    try {
      // Restore stock for each item
      for (const item of items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && prod.product_type !== 'service' && prod.use_stock !== false) {
          const restoredQty = item.quantity * item.multiplier;
          await updateProduct({
            ...prod,
            stock: prod.stock + restoredQty,
          });
        }
      }

      // Delete the transaction record
      await deleteTransaction(txId);

      // Refresh data
      await loadData();
      await loadTransactions();
      triggerSuccess('Transaksi berhasil dibatalkan dan stok telah dikembalikan.');
    } catch (err: any) {
      console.error('Cancel transaction error:', err);
      setErrorMessage(`Gagal membatalkan transaksi: ${err.message || 'Error tidak dikenal'}`);
    }
  };

  // 1. Point of Sale Router view
  if (route === '/pos') {
    if (!activeUser) {
      return (
        <Login 
          appTitle="Veloce POS" 
          appSubtitle="Aplikasi Kasir & Transaksi Penjualan Toko"
          onLoginSuccess={handleLoginSuccess} 
          onNavigateRoute={navigateTo}
        />
      );
    }

    return (
      <div className="h-screen w-screen bg-gray-50 flex overflow-hidden font-sans">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation Kasir Pintar Style */}
        <aside className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${activeTab === 'pos' ? (isSidebarOpen ? 'md:relative md:translate-x-0' : 'md:hidden') : 'md:relative md:translate-x-0'} w-[85%] max-w-[280px] md:w-[280px] bg-white border-r border-gray-200 shrink-0 flex flex-col h-full shadow-xl md:shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
          {/* Green Header */}
          <div className="bg-[#00A980] px-5 py-6 text-white flex items-center gap-4 shrink-0">
            <div className="w-14 h-14 rounded-full bg-[#E5F6F1] flex items-center justify-center text-[#00A980] shrink-0 border-2 border-white/20 relative">
              <Store size={28} />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded text-white border border-white">
                PRO
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[17px] font-bold text-white leading-tight truncate">{activeUser.fullname || 'Budhi'}</h1>
              <span className="text-[13px] text-emerald-100">{activeUser.role === 'owner' ? 'Administrator' : 'Kasir'}</span>
            </div>
          </div>

          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[13px] text-gray-800">Pembaruan Terakhir</div>
              <div className="text-[13px] font-medium text-gray-800">Just Now</div>
            </div>
            <button onClick={handleRefreshAllData} className="p-2 text-[#00A980] hover:bg-emerald-50 rounded-full transition-colors">
              <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} strokeWidth={2.5} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto pt-4 pb-20">
            <div className="px-5 pb-2 text-[14px] text-gray-500 font-medium">Menu Utama</div>
            
            <button onClick={() => { setActiveTab('manajemen'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'manajemen' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <Database size={22} className={activeTab === 'manajemen' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'manajemen' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Manajemen</span>
            </button>

            <button onClick={() => { setActiveTab('pos'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'pos' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <ShoppingCart size={22} className={activeTab === 'pos' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'pos' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Transaksi Penjualan</span>
            </button>

            <button onClick={() => { setActiveTab('pembelian'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'pembelian' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <ShoppingCart size={22} className={activeTab === 'pembelian' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'pembelian' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Pembelian Ke Supplier</span>
            </button>

            <button onClick={() => { setActiveTab('laporan-keuangan'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'laporan-keuangan' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <Wallet size={22} className={activeTab === 'laporan-keuangan' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'laporan-keuangan' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Keuangan</span>
            </button>

            <button onClick={() => { setActiveTab('laporan-penjualan'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'laporan-penjualan' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <FileText size={22} className={activeTab === 'laporan-penjualan' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'laporan-penjualan' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Laporan</span>
            </button>

            <button onClick={() => { setActiveTab('absensi'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'absensi' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <Clock size={22} className={activeTab === 'absensi' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'absensi' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Absensi</span>
            </button>

            <button onClick={() => { setActiveTab('shift'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'shift' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <Building2 size={22} className={activeTab === 'shift' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'shift' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Shift</span>
            </button>

            <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'settings' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <Settings size={22} className={activeTab === 'settings' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'settings' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Pengaturan</span>
            </button>

            <div className="h-px bg-gray-100 my-2 mx-5"></div>

            <button onClick={() => { setActiveTab('toko'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors ${activeTab === 'toko' ? 'bg-[#dcfce7]' : 'hover:bg-gray-50'}`}>
              <Store size={22} className={activeTab === 'toko' ? 'text-[#00A980]' : 'text-[#00A980]'} strokeWidth={1.5} />
              <span className={`text-[15px] ${activeTab === 'toko' ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>Toko online saya</span>
            </button>

            {activeUser.role === 'owner' && (
              <div className="pt-6 pb-4 px-5">
                <button onClick={() => navigateTo('/backoffice')} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[14px] transition-colors cursor-pointer">
                  Masuk Backoffice
                  <ChevronRight size={16} className="opacity-70" />
                </button>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col min-h-0 w-full relative ${['pos', 'catalog', 'dashboard'].includes(activeTab) ? '' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'}`}>
          {/* Mobile Top Bar */}
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Sparkles size={18} className="text-teal-600" />
              VELOCE POS
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
              <Menu size={20} />
            </button>
          </div>

          {activeTab === 'manajemen' && (
            <div className="flex-1 min-h-0 relative">
              <ManajemenView 
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="flex-1 min-h-0 relative">
              <PointOfSale
                products={products}
                activeUser={activeUser}
                onUpdateProduct={updateProduct}
                onRefreshData={loadData}
                onAddProduct={() => {
                  setEditingProduct(null);
                  setShowFormModal(true);
                }}
                onBack={() => {
                  setActiveTab('dashboard');
                }}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'catalog-items' && (
            <BarangList
              products={products}
              onBack={() => setActiveTab('manajemen')}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onAddProduct={() => {
                setEditingProduct(null);
                setShowFormModal(true);
              }}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setShowFormModal(true);
              }}
              onDeleteProduct={handleDeleteProduct}
              onBulkDeleteProducts={handleBulkDeleteProducts}
            />
          )}

          {activeTab === 'laporan-penjualan' && activeUser.role === 'owner' && (
            <div className="max-w-6xl mx-auto w-full">
              <SalesReport
                transactions={transactions}
                products={products}
                onCancelTransaction={handleCancelTransaction}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onNavigateToCatalog={() => setActiveTab('catalog')}
                onRefreshData={handleRefreshAllData}
              />
            </div>
          )}

          {activeTab === 'laporan-keuangan' && activeUser.role === 'owner' && (
            <div className="max-w-6xl mx-auto w-full">
              <FinanceReport
                transactions={transactions}
                products={products}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'settings' && activeUser.role === 'owner' && (
            <SettingsView 
              dbConfig={dbConfig}
              onConfigChange={handleConfigChange}
              onNavigateToStaff={() => setActiveTab('staff')}
              onNavigateToDatabase={() => setActiveTab('database')}
              onNavigateToGenerator={() => setActiveTab('generator')}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          )}

          {activeTab === 'staff' && activeUser.role === 'owner' && (
            <div className="max-w-6xl mx-auto w-full">
              <StaffManagement 
                activeUser={activeUser}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
              />
            </div>
          )}

          {activeTab === 'database' && activeUser.role === 'owner' && (
            <div className="max-w-6xl mx-auto w-full">
              <DatabaseSettings 
                dbConfig={dbConfig} 
                onConfigChange={handleConfigChange} 
                onRefreshData={handleRefreshAllData} 
              />
            </div>
          )}

          {activeTab === 'generator' && activeUser.role === 'owner' && (
            <div className="max-w-6xl mx-auto w-full">
              <DummyDataGenerator 
                onRefreshData={handleRefreshAllData}
                products={products} 
              />
            </div>
          )}

          {/* Empty States for unimplemented sections */}
          {['pembelian', 'absensi', 'shift', 'toko', 'kategori', 'pelanggan', 'supplier', 'tipe-pelanggan', 'diskon', 'pajak', 'biaya', 'marketing', 'komisi-staff'].includes(activeTab) && (
            <div className="max-w-6xl mx-auto w-full">
              <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-sm min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#00A980] mb-6 border border-emerald-100">
                  <PackageCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Segera Hadir</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Menu <strong>{activeTab}</strong> masih dalam tahap pengembangan. Fitur lengkap akan difokuskan pada pembaruan mendatang.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Product Form Overlay (Available in POS Route too) */}
        {showFormModal && (
          <ProductForm
            product={editingProduct}
            existingSkus={existingSkus}
            allProducts={products}
            onSave={handleSaveProduct}
            onClose={() => {
              setShowFormModal(false);
              setEditingProduct(null);
            }}
          />
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-[#DCFCE7] text-[#00A980] px-4 py-3 rounded-xl shadow-[0_2px_12px_rgba(0,169,128,0.2)] border border-[#00A980]/20 flex items-center gap-3 z-[100] animate-fade-in">
            <CheckCircle2 size={20} />
            <span className="font-medium text-[14px]">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:bg-[#00A980]/10 p-1 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="fixed top-4 right-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl shadow-[0_2px_12px_rgba(239,68,68,0.2)] border border-red-200 flex items-center gap-3 z-[100] animate-fade-in">
            <AlertTriangle size={20} />
            <span className="font-medium text-[14px]">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="ml-2 hover:bg-red-100 p-1 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }


  // 2. Backoffice Router View
  if (!activeUser) {
    return (
      <Login 
        appTitle="Veloce Backoffice" 
        appSubtitle="Kelola data barang, laporan penjualan, keuangan, dan staff"
        onLoginSuccess={handleLoginSuccess} 
        onNavigateRoute={navigateTo}
      />
    );
  }

  // Restrict cashiers from accessing Backoffice path
  if (activeUser.role !== 'owner') {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="p-8 text-center bg-white border border-gray-100 rounded-2xl max-w-md w-full shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Akses Backoffice Dibatasi</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Halaman ini hanya dapat diakses oleh Owner toko. Silakan gunakan Aplikasi Kasir (POS) untuk transaksi penjualan.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => navigateTo('/pos')}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Buka Halaman POS (Kasir)
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Keluar Sesi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ——— NEW: Backoffice route uses the dedicated Backoffice component ———
  return (
    <>
      <Backoffice
        products={products}
        transactions={transactions}
        activeUser={activeUser}
        dbConfig={dbConfig}
        onAddProduct={() => {
          setEditingProduct(null);
          setShowFormModal(true);
        }}
        onEditProduct={(p) => {
          setEditingProduct(p);
          setShowFormModal(true);
        }}
        onDeleteProduct={handleDeleteProduct}
        onBulkDeleteProducts={handleBulkDeleteProducts}
        onCancelTransaction={handleCancelTransaction}
        onRefreshData={handleRefreshAllData}
        onConfigChange={handleConfigChange}
        onLogout={handleLogout}
        onNavigateToPOS={() => navigateTo('/pos')}
        successMessage={successMessage}
        errorMessage={errorMessage}
        onDismissSuccess={() => setSuccessMessage(null)}
        onDismissError={() => setErrorMessage(null)}
      />

      {/* Product Form Overlay â€” renders on top of Backoffice */}
      {showFormModal && (
        <ProductForm
          product={editingProduct}
          existingSkus={existingSkus}
          allProducts={products}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowFormModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </>
  );
}
