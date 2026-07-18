/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Receipt,
  User,
  CreditCard,
  QrCode,
  ArrowRight,
  Printer,
  History,
  ShoppingBag,
  TrendingUp,
  X,
  AlertCircle,
  Package,
  Calendar,
  Layers,
  Briefcase,
  Users,
  Check,
  CheckCircle,
  Percent,
  Calculator,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  LayoutGrid,
  List,
  Settings,
  Zap,
  Globe,
  Monitor,
  ToggleRight,
  ToggleLeft,
  Bell,
  ArrowUpDown,
  Barcode,
  Maximize,
  Menu
} from 'lucide-react';
import { Product, Transaction, TransactionItem, ProductUnit, StaffAccount, Customer } from '../types';
import { getTransactions, addTransaction, getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../lib/dbManager';

interface PointOfSaleProps {
  products: Product[];
  activeUser: StaffAccount | null | undefined;
  onUpdateProduct: (product: Product) => Promise<void>;
  onRefreshData: () => Promise<void>;
  onAddProduct: () => void;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

interface CartItem {
  id: string; // Unique ID for cart item row
  product: Product;
  quantity: number; // Selected unit quantity (e.g. 2 Dus or 5 Pcs)
  selectedUnitName: string; // 'Pcs', 'Dus', 'Pak' etc.
  multiplier: number; // conversion factor (e.g. 1 for Pcs, 24 for Dus)
  price: number; // price per selected unit
  discountAmount: number; // rupiah discount per unit (legacy, kept for compat)
  discountPercent?: number;
  discountRupiah?: number;
  customPrice?: number;
  notes?: string;
  addons?: string;
}

export default function PointOfSale({
  products,
  onUpdateProduct,
  onRefreshData,
  activeUser,
  onAddProduct,
  onBack,
  onToggleSidebar
}: PointOfSaleProps) {
  // Navigation: active view inside POS ('pos' or 'history')
  const [posView, setPosView] = useState<'checkout' | 'history'>('checkout');

  // Customer Type State
  const [customerType, setCustomerType] = useState<'Umum' | 'Langganan' | 'Grosir' | 'Agen'>('Umum');
  const [customerName, setCustomerName] = useState('');
  const [cashierName, setCashierName] = useState(activeUser?.fullname || 'Kasir Utama');

  // Sync cashier name with activeUser
  useEffect(() => {
    if (activeUser) {
      setCashierName(activeUser.fullname);
    }
  }, [activeUser]);

  // Products filtering & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSearchCategory] = useState<string>('Semua');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Semua'); // Semua, physical, service, bundle

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Premium checkout step-by-step navigation
  const [desktopActiveStep, setDesktopActiveStep] = useState<'cart' | 'payment'>('cart');
  const [mobileActiveStep, setMobileActiveStep] = useState<'cart' | 'payment'>('cart');

  // Custom POS fields from user's design
  const [isPiutang, setIsPiutang] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  // Selector overlay visibility
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS' | 'Transfer' | 'Card'>('Cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');

  // Invoice-level discount (Rupiah)
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);

  // Transaction History state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedHistoryTransaction, setSelectedHistoryTransaction] = useState<Transaction | null>(null);

  // Active success receipt modal
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Edit Cart Item State
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);

  // Customer List State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerListModalOpen, setIsCustomerListModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Loading indicator for payment
  const [isProcessing, setIsProcessing] = useState(false);
  const [posProductViewMode, setPosProductViewMode] = useState<'grid' | 'list'>('grid');
  const [showPosSettings, setShowPosSettings] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTempProductModalOpen, setIsTempProductModalOpen] = useState(false);
  const [tempProductData, setTempProductData] = useState({ name: '', price: '' });

  // Detailed Transaction Settings
  const [isOnlineWajib, setIsOnlineWajib] = useState(false);
  const [showSisaStok, setShowSisaStok] = useState(true);
  const [showDiskon, setShowDiskon] = useState(true);
  const [showHarga, setShowHarga] = useState(true);
  const [showLetakRak, setShowLetakRak] = useState(false);
  const [barcodeSearchModes, setBarcodeSearchModes] = useState<string[]>(['default', 'multisatuan']);
  const [alwaysShowPriceDialog, setAlwaysShowPriceDialog] = useState(true);
  const [showProfitPotential, setShowProfitPotential] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mobile layout state and helpers
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return '';
    const trimmed = name.trim();
    const slice = trimmed.slice(0, 2);
    if (slice.length < 2) return slice.toUpperCase();
    return slice[0].toUpperCase() + slice[1].toLowerCase();
  };

  const getProductQtyInCart = (productId: string) => {
    return cart
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const formatShortRupiah = (value: number) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Load transaction history from database
  useEffect(() => {
    async function fetchData() {
      try {
        const [txList, custList] = await Promise.all([
          getTransactions(),
          getCustomers()
        ]);
        setTransactions(txList);
        setCustomers(custList);
      } catch (e) {
        console.error('Error loading data', e);
      }
    }
    fetchData();
  }, [posView]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery)
    );
  }, [customers, customerSearchQuery]);

  // Format currency to Indonesian Rupiah
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get unique categories for product browser
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Filter products for POS browser
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      
      const type = p.product_type || 'physical';
      const matchesType = selectedTypeFilter === 'Semua' || type === selectedTypeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [products, searchQuery, selectedCategory, selectedTypeFilter]);

  // Helper: Retrieve price of a product unit based on customer tier
  const getUnitPriceForTier = (product: Product, unitName: string, tier: typeof customerType, qtyInPcs?: number): number => {
    if (unitName === 'Pcs' || !unitName) {
      const customerTiers = product.price_tiers?.filter(t => t.customerType === (tier === 'Langganan' ? 'Langganan' : tier)) || [];
      const currentQty = qtyInPcs || 1;
      
      const applicableTiers = customerTiers.filter(t => currentQty >= t.minQty);
      if (applicableTiers.length > 0) {
        const sorted = [...applicableTiers].sort((a, b) => b.minQty - a.minQty);
        return sorted[0].price;
      }

      switch (tier) {
        case 'Langganan': return product.price_sell_member || product.price_sell;
        case 'Grosir': return product.price_sell_grosir || product.price_sell;
        case 'Agen': return product.price_sell_agen || product.price_sell;
        case 'Umum':
        default:
          return product.price_sell;
      }
    }

    const customUnit = product.units?.find(u => u.unitName === unitName);
    if (!customUnit) {
      return product.price_sell;
    }

    switch (tier) {
      case 'Langganan': return customUnit.price_sell_member || customUnit.price_sell_umum;
      case 'Grosir': return customUnit.price_sell_grosir || customUnit.price_sell_umum;
      case 'Agen': return customUnit.price_sell_agen || customUnit.price_sell_umum;
      case 'Umum':
      default:
        return customUnit.price_sell_umum;
    }
  };

  // Recalculate prices in cart if Customer Type / Tier changes
  useEffect(() => {
    setCart(prevCart => 
      prevCart.map(item => {
        const newPrice = getUnitPriceForTier(item.product, item.selectedUnitName, customerType);
        return {
          ...item,
          price: newPrice,
        };
      })
    );
  }, [customerType]);

  // Calculations for compiling Cart summaries
  const totalAmountBeforeDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const basePrice = item.customPrice !== undefined ? item.customPrice : item.price;
      const dPercent = item.discountPercent || 0;
      const dRupiah = item.discountRupiah || 0;
      const legacyDiscount = item.discountAmount || 0;
      
      const priceAfterPercent = basePrice * (1 - dPercent / 100);
      const finalUnitPrice = priceAfterPercent - dRupiah - legacyDiscount;
      
      const perItemTotal = finalUnitPrice * item.quantity;
      return sum + Math.max(0, perItemTotal);
    }, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    const discFromPercent = Math.round(totalAmountBeforeDiscount * (discountPercent / 100));
    const baseWithDiscount = totalAmountBeforeDiscount - discFromPercent - invoiceDiscount;
    const taxValue = Math.round(Math.max(0, baseWithDiscount) * (taxPercent / 100));
    const calculated = baseWithDiscount + taxValue;
    return calculated > 0 ? calculated : 0;
  }, [totalAmountBeforeDiscount, discountPercent, invoiceDiscount, taxPercent]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const changeAmount = useMemo(() => {
    const diff = amountPaid - totalAmount;
    return diff > 0 ? diff : 0;
  }, [amountPaid, totalAmount]);

  // Sync cash input paid amount
  useEffect(() => {
    setAmountPaid(totalAmount);
    setAmountPaidInput(totalAmount.toString());
  }, [totalAmount]);

  const addTempProductToCart = () => {
    if (!tempProductData.name || !tempProductData.price) return;

    const price = parseInt(tempProductData.price) || 0;
    const tempId = `TEMP-${Date.now()}`;
    
    const tempProduct: Product = {
      id: tempId,
      name: tempProductData.name,
      sku: 'TEMP-ITEM',
      category: 'Temporary',
      price_buy: 0,
      price_sell: price,
      price_sell_member: price,
      price_sell_grosir: price,
      price_sell_agen: price,
      stock: 999999,
      min_stock: 0,
      product_type: 'service',
      use_stock: false,
      image_url: undefined,
      created_at: new Date().toISOString()
    };

    const newCartItem: CartItem = {
      id: `${tempId}-pcs`,
      product: tempProduct,
      quantity: 1,
      selectedUnitName: 'Pcs',
      multiplier: 1,
      price: price,
      discountAmount: 0,
    };

    setCart([...cart, newCartItem]);
    setTempProductData({ name: '', price: '' });
    setIsTempProductModalOpen(false);
  };

  const addToCartWithUnit = (product: Product, unitName: string, multiplier: number) => {
    const pType = product.product_type || 'physical';

    if (pType === 'physical' && product.use_stock !== false && product.stock < multiplier) {
      setErrorMessage(`Stok barang "${product.name}" tidak mencukupi untuk satuan ${unitName} (Butuh ${multiplier} Pcs, sisa ${product.stock} Pcs).`);
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    const rowId = `${product.id}-${unitName.toLowerCase()}`;
    const existingIndex = cart.findIndex((item) => item.id === rowId);

    if (existingIndex > -1) {
      const currentCartItem = cart[existingIndex];
      const newQty = currentCartItem.quantity + 1;
      const currentTotalQtyInPcs = newQty * multiplier;

      if (pType === 'physical' && product.use_stock !== false && currentTotalQtyInPcs > product.stock) {
        setErrorMessage(`Batas stok terlampaui. Stok tersedia: ${product.stock} Pcs.`);
        setTimeout(() => setErrorMessage(null), 3500);
        return;
      }

      const newCart = [...cart];
      newCart[existingIndex].quantity = newQty;
      const newPrice = getUnitPriceForTier(product, unitName, customerType, currentTotalQtyInPcs);
      newCart[existingIndex].price = newPrice;
      setCart(newCart);
    } else {
      const initialPrice = getUnitPriceForTier(product, unitName, customerType, multiplier);
      const newCartItem: CartItem = {
        id: rowId,
        product,
        quantity: 1,
        selectedUnitName: unitName,
        multiplier: multiplier,
        price: initialPrice,
        discountAmount: 0,
      };
      setCart([...cart, newCartItem]);
    }
  };

  const addToCart = (product: Product) => {
    const pType = product.product_type || 'physical';

    if (pType === 'physical' && product.use_stock !== false && product.stock <= 0) {
      setErrorMessage(`Stok barang "${product.name}" habis.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.selectedUnitName === 'Pcs'
    );

    if (existingIndex > -1) {
      const currentCartItem = cart[existingIndex];
      const currentTotalQtyInPcs = (currentCartItem.quantity + 1) * currentCartItem.multiplier;

      if (pType === 'physical' && product.use_stock !== false && currentTotalQtyInPcs > product.stock) {
        setErrorMessage(`Batas stok terlampaui. Stok tersedia: ${product.stock} Pcs.`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }

      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      const newPrice = getUnitPriceForTier(product, 'Pcs', customerType, currentTotalQtyInPcs);
      newCart[existingIndex].price = newPrice;
      setCart(newCart);
    } else {
      const initialPrice = getUnitPriceForTier(product, 'Pcs', customerType, 1);
      const newCartItem: CartItem = {
        id: `${product.id}-pcs`,
        product,
        quantity: 1,
        selectedUnitName: 'Pcs',
        multiplier: 1,
        price: initialPrice,
        discountAmount: 0,
      };
      setCart([...cart, newCartItem]);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchQuery.trim().toUpperCase();
      if (!code) return;

      const foundProductBySku = products.find(p => p.sku.toUpperCase() === code);
      if (foundProductBySku) {
        addToCart(foundProductBySku);
        setSearchQuery('');
        return;
      }

      let foundProductByUnitSku: Product | null = null;
      let matchedUnitName = '';
      let matchedMultiplier = 1;

      for (const p of products) {
        if (p.units && p.units.length > 0) {
          const matchedUnit = p.units.find(u => u.sku_unit?.toUpperCase() === code);
          if (matchedUnit) {
            foundProductByUnitSku = p;
            matchedUnitName = matchedUnit.unitName;
            matchedMultiplier = matchedUnit.conversionMultiplier;
            break;
          }
        }
      }

      if (foundProductByUnitSku) {
        addToCartWithUnit(foundProductByUnitSku, matchedUnitName, matchedMultiplier);
        setSearchQuery('');
        return;
      }

      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  const updateCartItemUnit = (cartItemId: string, unitName: string) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === cartItemId) {
          const product = item.product;
          let multiplier = 1;

          if (unitName !== 'Pcs') {
            const foundUnit = product.units?.find(u => u.unitName === unitName);
            if (foundUnit) {
              multiplier = foundUnit.conversionMultiplier;
            }
          }

          if (product.product_type === 'physical' && (item.quantity * multiplier) > product.stock) {
            setErrorMessage(`Stok tidak mencukupi jika diubah ke kemasan ${unitName} (${product.stock} Pcs tersedia).`);
            setTimeout(() => setErrorMessage(null), 3500);
            return item;
          }

          const totalPcs = item.quantity * multiplier;
          const resolvedPrice = getUnitPriceForTier(product, unitName, customerType, totalPcs);
          const newRowId = `${product.id}-${unitName.toLowerCase()}`;

          return {
            ...item,
            id: newRowId,
            selectedUnitName: unitName,
            multiplier,
            price: resolvedPrice,
          };
        }
        return item;
      })
    );
  };

  const updateCartItemQty = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === cartItemId) {
          const product = item.product;
          if (product.product_type === 'physical' && (newQty * item.multiplier) > product.stock) {
            setErrorMessage(`Kuantitas melebihi batas stok gudang (${product.stock} Pcs).`);
            setTimeout(() => setErrorMessage(null), 3000);
            return item;
          }
          const totalPcs = newQty * item.multiplier;
          const newPrice = getUnitPriceForTier(product, item.selectedUnitName, customerType, totalPcs);
          return {
            ...item,
            quantity: newQty,
            price: newPrice,
          };
        }
        return item;
      })
    );
  };

  const updateCartItemDiscount = (cartItemId: string, discountVal: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === cartItemId) {
          return {
            ...item,
            discountAmount: Math.max(0, discountVal),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => item.id !== cartItemId));
  };

  const updateCartItemDetails = (cartItemId: string, updates: Partial<CartItem>) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === cartItemId) {
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setInvoiceDiscount(0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (amountPaid < totalAmount) {
      setErrorMessage('Uang pembayaran masih kurang!');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const updatedProductsToSave: Product[] = [];

      for (const item of cart) {
        const prod = products.find(p => p.id === item.product.id);
        if (!prod) continue;

        const pType = prod.product_type || 'physical';
        const totalPcsDeducted = item.quantity * item.multiplier;

        if (pType === 'physical' && prod.use_stock !== false) {
          if (prod.stock < totalPcsDeducted) {
            throw new Error(`Stok barang "${prod.name}" mendadak tidak mencukupi.`);
          }
          updatedProductsToSave.push({
            ...prod,
            stock: prod.stock - totalPcsDeducted,
          });
        } else if (pType === 'bundle') {
          if (prod.bundle_items && prod.bundle_items.length > 0) {
            for (const bundleComp of prod.bundle_items) {
              const componentProd = products.find(p => p.id === bundleComp.productId);
              if (componentProd && componentProd.use_stock !== false) {
                const totalCompDeduction = bundleComp.quantity * totalPcsDeducted;
                if (componentProd.stock < totalCompDeduction) {
                  throw new Error(`Stok bahan penyusun "${componentProd.name}" untuk paket bundling tidak mencukupi.`);
                }
                
                const alreadyQueuedIdx = updatedProductsToSave.findIndex(q => q.id === componentProd.id);
                if (alreadyQueuedIdx > -1) {
                  updatedProductsToSave[alreadyQueuedIdx].stock -= totalCompDeduction;
                } else {
                  updatedProductsToSave.push({
                    ...componentProd,
                    stock: componentProd.stock - totalCompDeduction,
                  });
                }
              }
            }
          }
        }
      }

      for (const updatedP of updatedProductsToSave) {
        await onUpdateProduct(updatedP);
      }

      const now = new Date();
      const invoiceNumber = `INV-GROSIR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime().toString().slice(-4)}`;

      const transactionItems: TransactionItem[] = cart.map((item) => {
        const basePrice = item.customPrice !== undefined ? item.customPrice : item.price;
        const dPercent = item.discountPercent || 0;
        const dRupiah = item.discountRupiah || 0;
        const legacyDiscount = item.discountAmount || 0;
        
        const priceAfterPercent = basePrice * (1 - dPercent / 100);
        const finalUnitPrice = priceAfterPercent - dRupiah - legacyDiscount;
        const subtotal = Math.max(0, finalUnitPrice * item.quantity);

        return {
          id: crypto.randomUUID(),
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitName: item.selectedUnitName,
          multiplier: item.multiplier,
          price: finalUnitPrice,
          discountAmount: (basePrice - finalUnitPrice),
          subtotal: subtotal,
          notes: item.notes,
          addons: item.addons,
        };
      });

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        invoiceNumber,
        date: now.toISOString(),
        items: transactionItems,
        totalItems,
        totalAmount,
        amountPaid,
        changeAmount,
        paymentMethod,
        customerType,
        customerName: customerName.trim() || 'Pelanggan Umum',
        discountTotal: invoiceDiscount,
        cashierName,
      };

      await addTransaction(newTransaction);
      const updatedHistory = await getTransactions();
      setTransactions(updatedHistory);
      setActiveReceipt(newTransaction);
      clearCart();
      setCustomerName('');
      setDesktopActiveStep('cart');
      setMobileActiveStep('cart');
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Terjadi kegagalan saat checkout kasir.');
      setTimeout(() => setErrorMessage(null), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentKeypadView = (onBackAction: () => void) => {
    const handleKeypadPress = (key: string) => {
      setAmountPaidInput(prev => {
        let current = prev === '' || prev === '0' ? '' : prev;
        
        if (key === 'C') {
          setAmountPaid(0);
          return '0';
        }
        
        if (key === 'backspace') {
          const removed = prev.slice(0, -1);
          const finalVal = removed === '' ? '0' : removed;
          setAmountPaid(parseFloat(finalVal) || 0);
          return finalVal;
        }
        
        if (key === 'Auto') {
          const totalStr = totalAmount.toString();
          setAmountPaid(totalAmount);
          return totalStr;
        }
        
        if (key === '.') {
          if (prev.includes('.')) return prev;
          return prev === '' ? '0.' : prev + '.';
        }

        if (key === '000') {
          if (current === '') {
            setAmountPaid(0);
            return '0';
          }
          const finalVal = current + '000';
          setAmountPaid(parseFloat(finalVal) || 0);
          return finalVal;
        }

        const finalVal = current + key;
        setAmountPaid(parseFloat(finalVal) || 0);
        return finalVal;
      });
    };

    const calculatedPoints = Math.floor(totalAmount / 10000);

    return (
      <div className="flex flex-col h-full bg-white select-none overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-150 bg-white shrink-0">
          <button
            onClick={onBackAction}
            className="p-1.5 hover:bg-gray-100 rounded-full text-[#0D9488] active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={22} className="stroke-[2.5]" />
          </button>
          
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-gray-900 text-sm font-sans">
              {formatRupiah(totalAmount)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isProcessing || (paymentMethod === 'Cash' && amountPaid < totalAmount)}
            className={`p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer ${
              (paymentMethod === 'Cash' && amountPaid < totalAmount)
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-[#EEFDF7] text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#d5f7e7]'
            }`}
          >
            <Check size={18} className="stroke-[3]" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-white shrink-0 border-b border-gray-100">
          <div className="bg-[#EEFDF7] border border-[#0D9488]/20 text-[#0D9488] px-3 py-1 rounded-full text-[11px] font-bold font-sans flex items-center gap-0.5">
            <Star size={12} className="fill-[#0D9488] stroke-none" />
            <span>+{calculatedPoints} Poin</span>
          </div>
          <button
            onClick={() => handleKeypadPress('Auto')}
            className="bg-[#0D9488] hover:bg-[#0b7f74] text-white px-3.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <ArrowUpDown size={11} className="rotate-90" />
            <span>Uang Pas</span>
          </button>
        </div>

        <div className="bg-white flex-1 flex flex-col items-center justify-center py-4 shrink-0 min-h-[85px] border-b border-gray-50">
          <h2 className="text-4xl font-black text-gray-800 font-mono tracking-tight">
            Rp {Number(amountPaidInput || 0).toLocaleString('id-ID')}
          </h2>
          {paymentMethod === 'Cash' && amountPaid < totalAmount && (
            <span className="text-[10px] text-red-500 font-bold mt-1">
              Kurang {formatRupiah(totalAmount - amountPaid)}
            </span>
          )}
          {paymentMethod === 'Cash' && amountPaid >= totalAmount && changeAmount > 0 && (
            <span className="text-[10px] text-emerald-600 font-extrabold mt-1">
              Kembalian: {formatRupiah(changeAmount)}
            </span>
          )}
        </div>

        <div className="px-4 py-3.5 space-y-2.5 bg-white shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className={`flex-1 py-2 px-2 border rounded-xl text-[11px] font-bold truncate active:scale-95 transition-all cursor-pointer ${
                  customerName 
                    ? 'border-[#0D9488] bg-[#EEFDF7] text-[#0D9488]' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {customerName ? `Pelanggan: ${customerName}` : 'Pilih Pelanggan'}
              </button>
              <button 
                onClick={() => setIsCustomerListModalOpen(true)}
                className="p-2 border border-gray-200 rounded-xl text-[#0D9488] hover:bg-teal-50 transition-colors"
                title="Lihat Daftar Pelanggan"
              >
                <Users size={16} />
              </button>
            </div>
            <div className="relative flex-1">
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const method = e.target.value as any;
                  setPaymentMethod(method);
                  if (method !== 'Cash') {
                    setAmountPaid(totalAmount);
                    setAmountPaidInput(totalAmount.toString());
                  } else {
                    setAmountPaid(0);
                    setAmountPaidInput('0');
                  }
                }}
                className="w-full py-2 pl-3 pr-8 border border-gray-200 bg-white text-gray-700 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30 appearance-none cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer">Bank</option>
                <option value="Card">Card</option>
              </select>
              <span className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-400">
                <ChevronDown size={14} />
              </span>
            </div>
          </div>
          <input
            type="text"
            value={receiptNotes}
            onChange={(e) => setReceiptNotes(e.target.value)}
            placeholder="Keterangan Struk..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-xs font-semibold"
          />
        </div>

        <div className="flex-1 bg-gray-50 p-2.5 grid grid-cols-4 gap-2 shrink-0 min-h-[250px]">
          <div className="col-span-3 grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '000', '.'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                className="bg-white hover:bg-gray-100 active:scale-95 transition-all py-2 rounded-xl border border-gray-200 shadow-3xs text-lg font-bold text-gray-800 font-mono flex items-center justify-center cursor-pointer"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="col-span-1 flex flex-col gap-2">
            <button
              onClick={() => handleKeypadPress('C')}
              className="bg-white hover:bg-gray-100 active:scale-95 transition-all py-2 rounded-xl border border-gray-200 shadow-3xs text-base font-bold text-red-500 flex items-center justify-center cursor-pointer"
            >
              C
            </button>
            <button
              onClick={() => handleKeypadPress('backspace')}
              className="bg-white hover:bg-gray-100 active:scale-95 transition-all py-2 rounded-xl border border-gray-200 shadow-3xs text-gray-500 flex items-center justify-center cursor-pointer flex-1"
            >
              <X size={20} />
            </button>
            <button
              onClick={handleCheckout}
              disabled={isProcessing || (paymentMethod === 'Cash' && amountPaid < totalAmount)}
              className="bg-[#0D9488] hover:bg-[#0b7f74] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center flex-1 shadow-lg shadow-teal-900/10 active:scale-95 transition-all cursor-pointer"
            >
              {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <Check size={24} strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.product_type === 'physical' && p.stock <= 5).length;
  }, [products]);

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      
      {/* MOBILE VIEW */}
      <div className="lg:hidden flex flex-col h-full bg-[#F9FAFB]">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-150 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={onBack} className="p-1 text-[#0D9488]"><ChevronLeft size={24} /></button>
            <h1 className="text-base font-extrabold text-[#0D9488]">Kasir</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => alert(`Stok Menipis: ${lowStockCount} barang`)}
              className="p-1 text-[#0D9488] relative"
            >
              <Bell size={20} />
              {lowStockCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-1 text-[#0D9488]"><Settings size={20} /></button>
          </div>
        </div>

        <div className="bg-white px-4 py-2 border-b border-gray-150 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"><Search size={14} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama/SKU..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
            />
          </div>
          <button onClick={() => setIsTempProductModalOpen(true)} className="p-2 bg-[#0D9488] text-white rounded-xl"><Plus size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="w-full bg-white p-3 rounded-2xl border border-gray-200 flex items-center gap-3 active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-bold border border-gray-100 shrink-0">
                {getInitials(p.name)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h4 className="text-xs font-bold text-gray-900 truncate uppercase">{p.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold ${p.stock > 0 ? 'text-[#0D9488]' : 'text-red-500'}`}>Stok: {p.stock}</span>
                  <span className="text-[10px] font-black text-gray-900">{formatShortRupiah(getUnitPriceForTier(p, 'Pcs', customerType))}</span>
                </div>
              </div>
              {getProductQtyInCart(p.id) > 0 && (
                <div className="bg-[#0D9488] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                  {getProductQtyInCart(p.id)}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-150 z-40">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-[#0D9488] text-white rounded-2xl py-4 px-6 flex items-center justify-between font-black shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-mono">{totalItems}</span>
              <span className="text-sm">KERANJANG</span>
            </div>
            <span className="text-sm">{formatShortRupiah(totalAmount)}</span>
          </button>
        </div>

        {isMobileCartOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end animate-fade-in">
            <div className="absolute inset-0" onClick={() => setIsMobileCartOpen(false)} />
            <div className="relative bg-white rounded-t-3xl h-[85vh] flex flex-col animate-slide-up overflow-hidden">
               {mobileActiveStep === 'payment' ? (
                 renderPaymentKeypadView(() => setMobileActiveStep('cart'))
               ) : (
                 <>
                   <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 shrink-0" />
                   <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3">
                     <div className="flex items-center justify-between">
                       <h3 className="text-sm font-black uppercase text-gray-900">Keranjang ({totalItems})</h3>
                       <button onClick={() => setIsMobileCartOpen(false)}><X size={20} className="text-gray-400" /></button>
                     </div>
                     <div className="space-y-2">
                       <div className="flex items-center justify-between px-1">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pelanggan</span>
                         <button 
                           onClick={() => setIsCustomerListModalOpen(true)}
                           className="text-[9px] font-black text-[#0D9488] hover:underline flex items-center gap-1 uppercase"
                         >
                           <Users size={10} />
                           Daftar Pelanggan
                         </button>
                       </div>
                       <div className="flex gap-1.5">
                         <input
                           type="text"
                           value={customerName}
                           onChange={(e) => setCustomerName(e.target.value)}
                           placeholder="Nama Pelanggan..."
                           className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0D9488]"
                         />
                         <select
                           value={customerType}
                           onChange={(e) => setCustomerType(e.target.value as any)}
                           className="w-24 px-2 py-2 bg-teal-50 border border-teal-100 rounded-xl text-[10px] font-black text-[#0D9488] focus:outline-none"
                         >
                           <option value="Umum">Umum</option>
                           <option value="Langganan">Member</option>
                           <option value="Grosir">Grosir</option>
                           <option value="Agen">Agen</option>
                         </select>
                       </div>
                     </div>
                   </div>
                   <div className="flex-1 overflow-y-auto p-6 space-y-4">
                     {cart.map((item) => {
                       const basePrice = item.customPrice !== undefined ? item.customPrice : item.price;
                       const dPercent = item.discountPercent || 0;
                       const dRupiah = item.discountRupiah || 0;
                       const legacyDiscount = item.discountAmount || 0;
                       
                       const priceAfterPercent = basePrice * (1 - dPercent / 100);
                       const finalUnitPrice = priceAfterPercent - dRupiah - legacyDiscount;
                       const subtotal = Math.max(0, finalUnitPrice * item.quantity);

                       return (
                         <div key={item.id} className="flex flex-col gap-2 pb-4 border-b border-gray-100">
                           <div className="flex justify-between items-start">
                             <div 
                               className="flex-1 min-w-0 pr-4 cursor-pointer"
                               onClick={() => {
                                 setEditingCartItem({...item});
                                 setIsEditItemModalOpen(true);
                               }}
                             >
                               <h4 className="text-xs font-bold uppercase truncate flex items-center gap-2">
                                 {item.product.name}
                                 {(item.customPrice !== undefined || item.discountPercent || item.discountRupiah || item.notes || item.addons) && (
                                   <span className="w-1.5 h-1.5 bg-[#0D9488] rounded-full" />
                                 )}
                               </h4>
                               {item.notes && <p className="text-[9px] text-[#0D9488] font-bold truncate">Note: {item.notes}</p>}
                             </div>
                             <button onClick={() => removeFromCart(item.id)} className="text-red-500"><Trash2 size={16} /></button>
                           </div>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
                               <button onClick={() => updateCartItemQty(item.id, item.quantity - 1)} className="p-1"><Minus size={12} /></button>
                               <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                               <button onClick={() => updateCartItemQty(item.id, item.quantity + 1)} className="p-1"><Plus size={12} /></button>
                             </div>
                             <div 
                               className="text-right cursor-pointer"
                               onClick={() => {
                                 setEditingCartItem({...item});
                                 setIsEditItemModalOpen(true);
                               }}
                             >
                               <span className="font-mono font-bold text-xs block">{formatShortRupiah(subtotal)}</span>
                               {(item.discountPercent || item.discountRupiah || item.discountAmount) ? (
                                 <span className="text-[8px] text-red-500 font-bold">Terdiskon</span>
                               ) : null}
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                   <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                     <div className="flex justify-between items-center text-xs font-black">
                       <span className="text-gray-400">TOTAL BAYAR</span>
                       <span className="text-[#0D9488] text-lg font-mono">{formatRupiah(totalAmount)}</span>
                     </div>
                     <button
                       onClick={() => setMobileActiveStep('payment')}
                       className="w-full py-4 bg-[#0D9488] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl"
                     >
                       PROSES BAYAR
                     </button>
                   </div>
                 </>
               )}
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden lg:flex flex-row h-full">
        
        {/* LEFT COLUMN: PRODUCT SELECTION */}
        <div className="flex-1 flex flex-col bg-[#F8FAFC] border-r border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className="h-16 px-8 flex items-center bg-white border-b border-gray-100 shrink-0 shadow-sm z-10">
            <button onClick={onBack} className="p-2 -ml-2 text-[#0D9488] hover:bg-teal-50 rounded-full transition-colors"><ChevronLeft size={24} strokeWidth={2.5} /></button>
            <h1 className="flex-1 ml-2 text-lg font-black text-gray-900 uppercase tracking-tighter">Pos Penjualan</h1>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert(`Terdapat ${lowStockCount} barang dengan stok menipis!`)}
                className="p-2.5 text-[#0D9488] hover:bg-teal-50 rounded-full relative transition-colors"
              >
                <Bell size={24} />
                {lowStockCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />}
              </button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 text-gray-400 hover:text-[#0D9488] hover:bg-teal-50 rounded-full transition-colors"><Settings size={24} /></button>
            </div>
          </div>

          <div className="p-8 pb-0 space-y-6">
            {/* Search row with scan and plus */}
            <div className="flex items-center gap-3">
              <div className="max-w-md w-full relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-[#0D9488] transition-colors"><Search size={20} /></span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Cari nama atau SKU..."
                  className="w-full pl-11 pr-11 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/5 transition-all placeholder:text-gray-400"
                />
                <button className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#0D9488] transition-colors"><Barcode size={20} /></button>
              </div>

              <button 
                onClick={() => setIsTempProductModalOpen(true)}
                className="p-3.5 bg-[#0D9488] text-white rounded-2xl shadow-lg shadow-teal-900/10 hover:bg-[#0b7f74] transition-all active:scale-95 flex items-center justify-center"
                title="Tambah Barang Sementara"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
              <button className="p-3 bg-white border border-gray-200 text-gray-400 rounded-2xl hover:border-[#0D9488] hover:text-[#0D9488] transition-all active:scale-95 shrink-0"><ArrowUpDown size={18} /></button>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSearchCategory(cat)}
                    className={`px-6 py-2.5 rounded-2xl border whitespace-nowrap transition-all duration-300 font-bold uppercase text-[11px] tracking-tight ${
                      isSelected
                        ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-md'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-[#0D9488]/30 hover:text-[#0D9488]'
                    }`}
                  >
                    {cat === 'Semua' ? 'Semua Item' : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <Package size={64} className="stroke-1 opacity-20" />
                <p className="mt-4 font-black uppercase tracking-widest text-xs">Barang tidak ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 max-w-5xl">
                {filteredProducts.map((p) => {
                  const qtyInCart = getProductQtyInCart(p.id);
                  const isOutOfStock = p.product_type === 'physical' && p.stock <= 0;
                  const price = getUnitPriceForTier(p, 'Pcs', customerType);

                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={isOutOfStock}
                      className={`group relative bg-white border border-gray-100 rounded-3xl p-3 flex items-center gap-4 text-left transition-all hover:shadow-xl hover:border-[#0D9488]/30 hover:-translate-y-0.5 active:scale-[0.98] ${isOutOfStock ? 'opacity-50 grayscale' : 'shadow-sm'}`}
                    >
                      <div className="w-14 h-14 bg-[#F0FDFA] rounded-2xl flex items-center justify-center text-[#0D9488] font-black text-lg border border-teal-50 shrink-0 overflow-hidden relative">
                        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : getInitials(p.name)}
                        {qtyInCart > 0 && (
                          <div className="absolute -top-1 -right-1 bg-[#0D9488] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-scale-in">
                            {qtyInCart}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-gray-950 uppercase truncate leading-tight">{p.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${p.stock > 0 ? 'bg-teal-50 text-[#0D9488]' : 'bg-red-50 text-red-600'}`}>
                            {p.stock > 0 ? `Stok: ${p.stock}` : 'Habis'}
                          </span>
                          <span className="text-xs font-black text-gray-900 font-mono tracking-tighter">{formatShortRupiah(price)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CART */}
        <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
          {desktopActiveStep === 'payment' ? (
            renderPaymentKeypadView(() => setDesktopActiveStep('cart'))
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-xl text-[#0D9488]"><ShoppingBag size={20} strokeWidth={2.5} /></div>
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-tighter">Keranjang Belanja</h3>
                </div>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20} /></button>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 shrink-0 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  <span>Pilih Tipe Harga</span>
                  <span className="text-[#0D9488]">Multi-Satuan</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Umum', 'Langganan', 'Grosir', 'Agen'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setCustomerType(tier as any)}
                      className={`py-2 rounded-xl text-[10px] font-black transition-all border-2 ${customerType === tier ? 'bg-[#0D9488] border-[#0D9488] text-white shadow-md' : 'bg-white border-transparent text-gray-500 hover:bg-gray-100'}`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 pt-1">
                   <div className="flex items-center justify-between px-1">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Pelanggan</span>
                     <button 
                       onClick={() => setIsCustomerListModalOpen(true)}
                       className="text-[9px] font-black text-[#0D9488] hover:underline flex items-center gap-1 uppercase"
                     >
                       <Users size={10} />
                       Daftar Pelanggan
                     </button>
                   </div>
                   <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Isi nama pelanggan..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0D9488] transition-all"
                   />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                    <ShoppingCart size={48} className="stroke-1" />
                    <p className="mt-3 font-black text-[10px] uppercase tracking-widest">Belum ada barang</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const basePrice = item.customPrice !== undefined ? item.customPrice : item.price;
                    const dPercent = item.discountPercent || 0;
                    const dRupiah = item.discountRupiah || 0;
                    const legacyDiscount = item.discountAmount || 0;
                    
                    const priceAfterPercent = basePrice * (1 - dPercent / 100);
                    const finalUnitPrice = priceAfterPercent - dRupiah - legacyDiscount;
                    const subtotal = Math.max(0, finalUnitPrice * item.quantity);

                    return (
                      <div key={item.id} className="group flex flex-col gap-3 p-4 bg-white border border-gray-100 rounded-3xl hover:border-[#0D9488]/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <div 
                            className="min-w-0 pr-4 cursor-pointer flex-1"
                            onClick={() => {
                              setEditingCartItem({...item});
                              setIsEditItemModalOpen(true);
                            }}
                          >
                            <h4 className="text-[11px] font-black text-gray-900 uppercase truncate leading-none flex items-center gap-2">
                              {item.product.name}
                              {(item.customPrice !== undefined || item.discountPercent || item.discountRupiah || item.notes || item.addons) && (
                                <span className="w-1.5 h-1.5 bg-[#0D9488] rounded-full" title="Item telah dimodifikasi" />
                              )}
                            </h4>
                            <p className="text-[9px] text-gray-400 font-mono font-bold mt-1.5 tracking-tight">{item.product.sku}</p>
                            {item.notes && <p className="text-[8px] text-[#0D9488] font-bold mt-1 truncate">Note: {item.notes}</p>}
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                           <select
                             value={item.selectedUnitName}
                             onChange={(e) => updateCartItemUnit(item.id, e.target.value)}
                             className="text-[10px] font-black text-[#0D9488] bg-teal-50/50 border border-teal-100 rounded-lg py-1 px-2 focus:outline-none appearance-none cursor-pointer"
                           >
                             <option value="Pcs">Pcs</option>
                             {item.product.units?.map(u => <option key={u.unitName} value={u.unitName}>{u.unitName}</option>)}
                           </select>

                           <div className="flex items-center gap-1.5 bg-gray-100/50 rounded-xl p-0.5 border border-gray-150">
                              <button onClick={() => updateCartItemQty(item.id, item.quantity - 1)} className="p-1.5 text-gray-400 hover:text-gray-900"><Minus size={12} strokeWidth={3} /></button>
                              <span className="w-8 text-center text-xs font-black text-gray-900 font-mono">{item.quantity}</span>
                              <button onClick={() => updateCartItemQty(item.id, item.quantity + 1)} className="p-1.5 text-gray-400 hover:text-gray-900"><Plus size={12} strokeWidth={3} /></button>
                           </div>
                        </div>
                        <div 
                          className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100 cursor-pointer"
                          onClick={() => {
                            setEditingCartItem({...item});
                            setIsEditItemModalOpen(true);
                          }}
                        >
                          <div className="flex flex-col">
                            {item.customPrice !== undefined && (
                              <span className="text-[8px] text-gray-400 line-through">Asli: {formatShortRupiah(item.price)}</span>
                            )}
                            <span className="text-[9px] font-black text-gray-500">
                              {item.discountPercent || item.discountRupiah || item.discountAmount ? (
                                <span className="text-red-500">Terdiskon</span>
                              ) : (
                                'Harga Normal'
                              )}
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#0D9488] font-mono">{formatShortRupiah(subtotal)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-8 border-t border-gray-100 bg-white space-y-6 shadow-[0_-15px_40px_rgba(0,0,0,0.03)] shrink-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900 font-mono">{formatRupiah(totalAmountBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1"><Percent size={12} /> Diskon Faktur</span>
                    <input
                      type="number"
                      value={invoiceDiscount || ''}
                      onChange={(e) => setInvoiceDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 px-2 py-1 bg-red-50/30 border border-red-100 rounded-lg text-right font-black text-red-600 text-xs"
                    />
                  </div>
                  <div className="pt-4 border-t-2 border-dashed border-gray-100 flex items-end justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bayar</span>
                    <span className="text-2xl font-black text-[#0D9488] font-mono leading-none">{formatRupiah(totalAmount)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setDesktopActiveStep('payment')}
                  disabled={cart.length === 0}
                  className="w-full py-5 bg-[#0D9488] hover:bg-[#0b7f74] disabled:opacity-40 text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-teal-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  PROSES TRANSAKSI <ArrowRight size={20} strokeWidth={3} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#F8FAFC] animate-fade-in">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0 shadow-sm">
            <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={24} className="text-[#0D9488]" /></button>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Pengaturan Kasir</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-12 space-y-10 max-w-2xl mx-auto w-full">
            <section className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Tampilan Item Barang</h3>
              <div className="flex gap-10">
                {['list', 'grid'].map(mode => (
                  <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${posProductViewMode === mode ? 'border-[#0D9488]' : 'border-gray-300'}`}>
                      {posProductViewMode === mode && <div className="w-3 h-3 bg-[#0D9488] rounded-full animate-scale-in" />}
                    </div>
                    <input type="radio" checked={posProductViewMode === mode} onChange={() => setPosProductViewMode(mode as any)} className="hidden" />
                    <span className={`text-base font-black transition-colors uppercase ${posProductViewMode === mode ? 'text-gray-900' : 'text-gray-400'}`}>{mode}</span>
                  </label>
                ))}
              </div>
            </section>
            <div className="h-px bg-gray-200" />
            <section className="space-y-4">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Atribut Item</h3>
               <div className="grid grid-cols-2 gap-6">
                 {[
                   { id: 'sisaStok', label: 'Sisa Stok', state: showSisaStok, setter: setShowSisaStok },
                   { id: 'harga', label: 'Harga Jual', state: showHarga, setter: setShowHarga },
                   { id: 'diskon', label: 'Diskon Item', state: showDiskon, setter: setShowDiskon },
                   { id: 'profit', label: 'Potensi Untung', state: showProfitPotential, setter: setShowProfitPotential },
                 ].map(attr => (
                   <label key={attr.id} className="flex items-center gap-3 cursor-pointer select-none">
                     <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${attr.state ? 'bg-[#0D9488] border-[#0D9488]' : 'border-gray-300'}`}>
                        {attr.state && <Check size={14} className="text-white stroke-[4]" />}
                     </div>
                     <input type="checkbox" checked={attr.state} onChange={() => attr.setter(!attr.state)} className="hidden" />
                     <span className={`text-sm font-bold transition-colors ${attr.state ? 'text-gray-900' : 'text-gray-400'}`}>{attr.label}</span>
                   </label>
                 ))}
               </div>
            </section>
          </div>
          <div className="bg-white border-t border-gray-200 p-8 shrink-0 flex justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
            <button onClick={() => setIsSettingsModalOpen(false)} className="max-w-md w-full py-4 bg-[#0D9488] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl">SIMPAN PENGATURAN</button>
          </div>
        </div>
      )}

      {isTempProductModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-[#0D9488] p-8 flex items-center justify-between text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Barang Sementara</h3>
              <button onClick={() => setIsTempProductModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Barang / Jasa</label>
                <input 
                  type="text" 
                  value={tempProductData.name}
                  onChange={(e) => setTempProductData({...tempProductData, name: e.target.value})}
                  placeholder="Contoh: Custom Order #123"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Harga Jual (Rp)</label>
                <div className="relative">
                  <span className="absolute left-6 inset-y-0 flex items-center text-gray-400 font-black">Rp</span>
                  <input 
                    type="number" 
                    value={tempProductData.price}
                    onChange={(e) => setTempProductData({...tempProductData, price: e.target.value})}
                    placeholder="0"
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-xl font-black font-mono focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all text-[#0D9488]"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button onClick={() => setIsTempProductModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-3xl text-xs font-black uppercase tracking-widest">BATAL</button>
                <button 
                  onClick={addTempProductToCart}
                  disabled={!tempProductData.name || !tempProductData.price}
                  className="flex-[2] py-4 bg-[#0D9488] text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 disabled:opacity-50 transition-all"
                >
                  TAMBAH ITEM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditItemModalOpen && editingCartItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-[#0D9488] p-8 flex items-center justify-between text-white">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Atur Item</h3>
                <p className="text-[10px] opacity-80 font-bold uppercase mt-1">{editingCartItem.product.name}</p>
              </div>
              <button onClick={() => setIsEditItemModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Price Override */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Harga Satuan (Override)</label>
                <div className="relative">
                  <span className="absolute left-6 inset-y-0 flex items-center text-gray-400 font-black">Rp</span>
                  <input 
                    type="number" 
                    value={editingCartItem.customPrice !== undefined ? editingCartItem.customPrice : editingCartItem.price}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                      setEditingCartItem({...editingCartItem, customPrice: val});
                    }}
                    placeholder={editingCartItem.price.toString()}
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-xl font-black font-mono focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all text-[#0D9488]"
                  />
                </div>
              </div>

              {/* Discount Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diskon (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={editingCartItem.discountPercent || ''}
                      onChange={(e) => setEditingCartItem({...editingCartItem, discountPercent: parseInt(e.target.value) || 0})}
                      placeholder="0"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-lg font-black font-mono focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                    />
                    <span className="absolute right-6 inset-y-0 flex items-center text-gray-400 font-black">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diskon (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-6 inset-y-0 flex items-center text-gray-400 font-black">Rp</span>
                    <input 
                      type="number" 
                      value={editingCartItem.discountRupiah || ''}
                      onChange={(e) => setEditingCartItem({...editingCartItem, discountRupiah: parseInt(e.target.value) || 0})}
                      placeholder="0"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-lg font-black font-mono focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Notes & Add-ons */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Catatan Singkat</label>
                  <input 
                    type="text" 
                    value={editingCartItem.notes || ''}
                    onChange={(e) => setEditingCartItem({...editingCartItem, notes: e.target.value})}
                    placeholder="Contoh: Tanpa Pedas, Ukuran XL, dll"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Add-ons / Ekstra</label>
                  <textarea 
                    value={editingCartItem.addons || ''}
                    onChange={(e) => setEditingCartItem({...editingCartItem, addons: e.target.value})}
                    placeholder="Masukkan add-ons tambahan..."
                    rows={2}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setIsEditItemModalOpen(false)} 
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  BATAL
                </button>
                <button 
                  onClick={() => {
                    updateCartItemDetails(editingCartItem.id, {
                      customPrice: editingCartItem.customPrice,
                      discountPercent: editingCartItem.discountPercent,
                      discountRupiah: editingCartItem.discountRupiah,
                      notes: editingCartItem.notes,
                      addons: editingCartItem.addons
                    });
                    setIsEditItemModalOpen(false);
                  }}
                  className="flex-[2] py-4 bg-[#0D9488] text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:bg-[#0b7f74] transition-all"
                >
                  SIMPAN PERUBAHAN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCustomerListModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-scale-in flex flex-col h-[80vh]">
            <div className="bg-[#0D9488] p-8 flex items-center justify-between text-white shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Daftar Pelanggan</h3>
                <p className="text-[10px] opacity-80 font-bold uppercase mt-1">Cari berdasarkan nama atau nomor telepon</p>
              </div>
              <button onClick={() => setIsCustomerListModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>

            <div className="p-8 border-b border-gray-100 shrink-0">
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-[#0D9488] transition-colors"><Search size={20} /></span>
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Cari Nama / No. Telepon..."
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
              {filteredCustomers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <Users size={64} className="stroke-1 opacity-20" />
                  <p className="mt-4 font-black uppercase tracking-widest text-[10px]">Pelanggan tidak ditemukan</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomerName(c.name);
                        setCustomerType(c.type);
                        setIsCustomerListModalOpen(false);
                      }}
                      className="group bg-white border border-gray-100 rounded-3xl p-5 text-left transition-all hover:shadow-xl hover:border-[#0D9488]/30 hover:-translate-y-1 active:scale-[0.98] shadow-sm flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-[#0D9488] font-black border border-teal-100 shrink-0 uppercase">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-gray-950 uppercase truncate leading-none">{c.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono font-bold mt-2 tracking-tight">{c.phone}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-tighter">{c.type}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-gray-50 shrink-0">
              <p className="text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">Pilih pelanggan untuk mengisi otomatis form kasir</p>
            </div>
          </div>
        </div>
      )}

      {activeReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-scale-in">
            <div className="bg-emerald-50 p-8 border-b border-emerald-100 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl shadow-md mb-4 font-bold">✓</div>
              <h3 className="font-black text-gray-950 text-base uppercase tracking-tight">Transaksi Berhasil</h3>
              <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mt-1">{activeReceipt.invoiceNumber}</p>
            </div>
            <div className="p-8 font-mono text-[10px] text-gray-800 space-y-4 max-h-[50vh] overflow-y-auto">
               <div className="text-center space-y-1">
                 <h4 className="font-black text-sm">TOKO GROSIR POS</h4>
                 <p className="text-gray-500">Bukti Pembayaran Resmi</p>
                 <p className="text-gray-400">--------------------------</p>
               </div>
               <div className="space-y-1 font-bold">
                 <div className="flex justify-between"><span>Pelanggan:</span><span>{activeReceipt.customerName}</span></div>
                 <div className="flex justify-between"><span>Total:</span><span>{formatRupiah(activeReceipt.totalAmount)}</span></div>
                 <div className="flex justify-between text-emerald-600"><span>Bayar:</span><span>{formatRupiah(activeReceipt.amountPaid)}</span></div>
                 <div className="flex justify-between text-blue-600"><span>Kembalian:</span><span>{formatRupiah(activeReceipt.changeAmount)}</span></div>
               </div>
            </div>
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
               <button onClick={() => window.print()} className="flex-1 py-4 bg-white border border-gray-200 text-gray-950 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Printer size={16} /> CETAK</button>
               <button onClick={() => setActiveReceipt(null)} className="flex-1 py-4 bg-[#0D9488] text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-900/15">SELESAI</button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] px-8 py-4 bg-red-600 text-white rounded-full shadow-2xl flex items-center gap-3 animate-slide-in-top font-black text-xs uppercase tracking-widest">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

    </div>
  );
}
