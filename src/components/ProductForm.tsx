import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  Edit2,
  Trash2,
  RefreshCw,
  Barcode,
  Info,
  Plus,
  X,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import { Product, ProductUnit, BundleItem, PriceTier } from '../types';
import { DEFAULT_CATEGORIES } from '../data';
import { generateUUID } from '../lib/utils';

interface ProductFormProps {
  product: Product | null;
  existingSkus: string[];
  allProducts: Product[];
  onSave: (product: Product) => void;
  onClose: () => void;
}

export default function ProductForm({
  product,
  existingSkus,
  allProducts,
  onSave,
  onClose,
}: ProductFormProps) {
  const skuInputRef = React.useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('Default');
  const [showInTransaction, setShowInTransaction] = useState(true);
  const [useStock, setUseStock] = useState(true);
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [priceBuy, setPriceBuy] = useState(0);
  const [priceSell, setPriceSell] = useState(0);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [minStock, setMinStock] = useState(0);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'%' | 'Rp'>('%');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [units, setUnits] = useState<ProductUnit[]>([]);
  
  // Multisatuan States
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);

  
  const [baseUnitName, setBaseUnitName] = useState('');
  const [baseUnitBarcode, setBaseUnitBarcode] = useState('');
  
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);
  const [tempUnitName, setTempUnitName] = useState('');
  const [tempUnitBarcode, setTempUnitBarcode] = useState('');
  const [tempUnitRatio, setTempUnitRatio] = useState(0);
  const [tempUnitPrice, setTempUnitPrice] = useState(0);

  // Custom Tipe Harga
  const [priceSellMember, setPriceSellMember] = useState(0);
  const [priceSellGrosir, setPriceSellGrosir] = useState(0);
  const [priceSellAgen, setPriceSellAgen] = useState(0);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);

  const [showPriceTypeModal, setShowPriceTypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'Member' | 'Grosir' | 'Agen'>('Member');
  const [tempPriceValue, setTempPriceValue] = useState(0);
  const [tempTiers, setTempTiers] = useState<PriceTier[]>([]);
  const [newTierMinQty, setNewTierMinQty] = useState<number>(2);
  const [newTierPrice, setNewTierPrice] = useState<number>(0);
  
  // Scanner States
  const [showScanMethodModal, setShowScanMethodModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isBluetoothScanning, setIsBluetoothScanning] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const checkHasChanges = () => {
    if (product) {
      // Editing mode
      const p = product as any;
      const initialUseStock = p.use_stock !== false;
      const initialStock = p.stock;
      const initialSku = p.sku || '';
      const initialPriceBuy = p.price_buy || 0;
      const initialPriceSell = p.price_sell || 0;
      const initialCategory = p.category || DEFAULT_CATEGORIES[0];
      const initialMinStock = p.min_stock || 0;
      const initialWeight = p.weight || '';
      const initialWeightUnit = p.weight_unit || '';
      const initialDiscount = p.discount || 0;
      const initialDiscountType = p.discount_type || '%';
      const initialLocation = p.location || '';
      const initialDescription = p.description || '';
      const initialShowInTx = p.show_in_transaction !== false;
      const initialType = p.product_type || 'physical';

      const hasDiff = 
        name !== (p.name || '') ||
        productType !== initialType ||
        showInTransaction !== initialShowInTx ||
        useStock !== initialUseStock ||
        (useStock && stock !== initialStock) ||
        sku !== initialSku ||
        priceBuy !== initialPriceBuy ||
        priceSell !== initialPriceSell ||
        category !== initialCategory ||
        (useStock && minStock !== initialMinStock) ||
        weight !== initialWeight ||
        weightUnit !== initialWeightUnit ||
        discount !== initialDiscount ||
        discountType !== initialDiscountType ||
        location !== initialLocation ||
        description !== initialDescription;
      
      return hasDiff;
    } else {
      // Adding new mode
      return (
        name.trim() !== '' ||
        productType !== 'Default' ||
        !showInTransaction ||
        !useStock ||
        stock !== 0 ||
        sku !== '' ||
        priceBuy !== 0 ||
        priceSell !== 0 ||
        category !== DEFAULT_CATEGORIES[0] ||
        minStock !== 0 ||
        weight !== '' ||
        weightUnit !== '' ||
        discount !== 0 ||
        location !== '' ||
        description !== ''
      );
    }
  };

  const handleBackClick = () => {
    if (checkHasChanges()) {
      setShowExitConfirmModal(true);
    } else {
      onClose();
    }
  };

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setPriceBuy(product.price_buy);
      setPriceSell(product.price_sell);
      setStock(product.stock);
      setMinStock(product.min_stock);
      setCategory(product.category || DEFAULT_CATEGORIES[0]);
      setLocation(product.location || '');
      setDescription(product.description || '');
      setImageUrl(product.image_url || '');
      setUnits(product.units || []);
      setPriceSellMember(product.price_sell_member || 0);
      setPriceSellGrosir(product.price_sell_grosir || 0);
      setPriceSellAgen(product.price_sell_agen || 0);
      setPriceTiers(product.price_tiers || []);
      setUseStock(product.use_stock !== false);
      setDiscount(product.discount || 0);
      setDiscountType((product.discount_type === 'Rp' ? 'Rp' : '%'));
      setShowInTransaction(product.show_in_transaction !== false);
      
      if (product.units && product.units.length > 0) {
        setProductType('Multisatuan');
        setBaseUnitName(product.units[0].unitName);
        setBaseUnitBarcode(product.units[0].sku_unit || '');
      } else if (product.item_type) {
        setProductType(product.item_type);
      }
    } else {
      setSku('');
      setPriceTiers([]);
      setUseStock(true);
      setStock(0);
    }
  }, [product]);

  // Camera stream controller for barcode scanner
  useEffect(() => {
    if (showCameraScanner) {
      setScannerError(null);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setScannerError("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCameraScanner]);

  // Frame processing using native BarcodeDetector API
  useEffect(() => {
    let active = true;
    let detectionInterval: any = null;

    if (showCameraScanner && !scannerError) {
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a']
        });

        detectionInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && active) {
                const detectedCode = barcodes[0].rawValue;
                setSku(detectedCode);
                
                // Audio feedback beep
                try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                  osc.start();
                  osc.stop(audioCtx.currentTime + 0.12);
                } catch (e) {}

                setShowCameraScanner(false);
                setShowScanMethodModal(false);
                active = false;
              }
            } catch (err) {
              console.error("Barcode detection error:", err);
            }
          }
        }, 300);
      }
    }

    return () => {
      active = false;
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [showCameraScanner, scannerError]);

  // Synchronize base unit price with main selling price when it changes on the main page
  useEffect(() => {
    if (productType === 'Multisatuan' && units.length > 0) {
      if (units[0].price_sell_umum !== priceSell) {
        setUnits(prev => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          updated[0] = { ...updated[0], price_sell_umum: priceSell };
          for (let i = 1; i < updated.length; i++) {
            updated[i] = {
              ...updated[i],
              price_sell_umum: updated[i].conversionMultiplier * priceSell
            };
          }
          return updated;
        });
      }
    }
  }, [priceSell, productType]);

  const generateRandomSku = () => {
    const skus = Array.isArray(existingSkus) ? existingSkus : [];
    const numericSkus = skus
      .map(s => String(s || '').trim())
      .filter(s => /^\d{13}$/.test(s))
      .map(s => parseInt(s, 10));

    let nextNum = 1;
    if (numericSkus.length > 0) {
      const maxVal = Math.max(...numericSkus);
      if (maxVal >= 1) {
        nextNum = maxVal + 1;
      }
    }

    let nextSku = String(nextNum).padStart(13, '0');
    
    // Safety check loop to ensure uniqueness
    while (skus.some(s => String(s || '').trim() === nextSku)) {
      nextNum++;
      nextSku = String(nextNum).padStart(13, '0');
    }
    
    setSku(nextSku);
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama barang wajib diisi");
      return;
    }
    if (!sku.trim()) {
      alert("Kode barang wajib diisi");
      return;
    }

    const newProduct: Product = {
      id: product?.id || generateUUID(),
      sku,
      name: name.trim(),
      description: description.trim(),
      price_buy: priceBuy,
      price_sell: priceSell,
      price_sell_member: priceSellMember,
      price_sell_grosir: priceSellGrosir,
      price_sell_agen: priceSellAgen,
      price_tiers: priceTiers,
      stock: useStock ? stock : 0,
      use_stock: useStock,
      min_stock: minStock,
      category,
      location,
      discount,
      discount_type: discountType,
      show_in_transaction: showInTransaction,
      image_url: imageUrl,
      product_type: productType === 'Paket' ? 'bundle' : 'physical',
      item_type: productType as Product['item_type'],
      units: productType === 'Multisatuan' ? units : [],
      bundle_items: product?.bundle_items || []
    };

    onSave(newProduct);
  };

  const calculateMargin = () => {
    if (priceBuy === 0) return priceSell > 0 ? 100 : 0;
    return Math.round(((priceSell - priceBuy) / priceBuy) * 100);
  };

  const handleOpenUnitsModal = () => {
    if (!name.trim()) {
      alert("Silakan isi Nama Barang terlebih dahulu sebelum mengatur Multisatuan.");
      return;
    }
    if (!sku.trim()) {
      alert("Silakan isi Kode Barang (SKU) terlebih dahulu sebelum mengatur Multisatuan.");
      return;
    }
    if (priceSell <= 0) {
      alert("Silakan isi Harga Jual terlebih dahulu. Harga jual ini akan menjadi acuan harga satuan terkecil.");
      return;
    }

    if (units.length === 0) {
      setBaseUnitBarcode('');
    } else {
      // Ensure base unit price is synced with main selling price
      if (units.length > 0 && units[0].price_sell_umum !== priceSell) {
        setUnits(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], price_sell_umum: priceSell };
          return updated;
        });
      }
    }
    setShowUnitsModal(true);
  };

  const resetTempUnit = () => {
    setTempUnitName('');
    setTempUnitBarcode('');
    setTempUnitRatio(0);
    setTempUnitPrice(0);
  };

  const openAddUnitModal = (unit?: ProductUnit) => {
    if (unit) {
      setEditingUnit(unit);
      setTempUnitName(unit.unitName);
      setTempUnitBarcode(unit.sku_unit || '');
      setTempUnitRatio(unit.conversionMultiplier);
      setTempUnitPrice(unit.price_sell_umum);
    } else {
      setEditingUnit(null);
      resetTempUnit();
    }
    setShowAddUnitModal(true);
  };

  const openPriceModal = (type: 'Member' | 'Grosir' | 'Agen') => {
    setSelectedType(type);
    const basePrice = type === 'Member' ? priceSellMember : type === 'Grosir' ? priceSellGrosir : priceSellAgen;
    setTempPriceValue(basePrice || priceSell);
    
    const customerTypeMap = type === 'Member' ? 'Langganan' : type;
    const existingTiers = priceTiers.filter(t => t.customerType === customerTypeMap);
    setTempTiers(existingTiers);
    
    setNewTierMinQty(2);
    setNewTierPrice(Math.round((basePrice || priceSell) * 0.95));
    setShowPriceTypeModal(true);
  };

  const handleClearMember = () => {
    setPriceSellMember(0);
    setPriceTiers(prev => prev.filter(t => t.customerType !== 'Langganan'));
  };

  const handleClearGrosir = () => {
    setPriceSellGrosir(0);
    setPriceTiers(prev => prev.filter(t => t.customerType !== 'Grosir'));
  };

  const handleClearAgen = () => {
    setPriceSellAgen(0);
    setPriceTiers(prev => prev.filter(t => t.customerType !== 'Agen'));
  };

  const addTempTier = () => {
    if (newTierMinQty <= 1) {
      alert("Minimal kuantitas harus 2 Pcs atau lebih");
      return;
    }
    if (newTierPrice <= 0) {
      alert("Harga jual per Pcs harus lebih dari Rp 0");
      return;
    }
    if (tempPriceValue > 0 && newTierPrice >= tempPriceValue) {
      alert(`Harga grosir (${formatRupiah(newTierPrice)}) harus lebih murah dari harga dasar (${formatRupiah(tempPriceValue)})`);
      return;
    }
    if (tempTiers.some(t => t.minQty === newTierMinQty)) {
      alert(`Jenjang harga untuk minimal ${newTierMinQty} Pcs sudah terdaftar.`);
      return;
    }

    const customerTypeMap = selectedType === 'Member' ? 'Langganan' : selectedType;
    const newTier: PriceTier = {
      id: generateUUID(),
      customerType: customerTypeMap,
      minQty: newTierMinQty,
      price: newTierPrice
    };

    setTempTiers(prev => [...prev, newTier].sort((a, b) => a.minQty - b.minQty));
    
    setNewTierMinQty(prev => prev + 1);
    setNewTierPrice(Math.round(newTierPrice * 0.95));
  };

  const deleteUnit = (id: string) => {
    if (confirm("Hapus satuan ini?")) {
      setUnits(units.filter(u => u.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-[100dvh] overflow-hidden font-sans">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 pt-5 pb-0 relative z-20">
        {/* Title + breadcrumb */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[22px] font-bold text-gray-900">
            {isEditing ? 'Edit Barang' : 'Tambah Barang'}
          </h1>
          <button onClick={handleBackClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-1 text-[13px] text-gray-500 mb-4">
          <span>Database</span>
          <span>/</span>
          <button onClick={handleBackClick} className="text-[#00A980] hover:underline cursor-pointer">
            Barang atau Jasa
          </button>
          {sku && (
            <>
              <span>/</span>
              <span className="text-gray-700 font-medium">{sku}</span>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto scrollbar-none -mb-px">
          {[
            { key: 'data', label: 'Data Barang' },
            { key: 'harga', label: 'Tipe Harga' },
            { key: 'satuan', label: 'Multi Satuan' },
            { key: 'varian', label: 'Varian' },
            { key: 'imei', label: 'Multi IMEI' },
            { key: 'paket', label: 'Paket' },
            { key: 'bahan', label: 'Bahan Baku' },
          ].map(tab => (
            <button
              type="button"
              key={tab.key}
              onClick={() => {
                if (tab.key === 'satuan') { handleOpenUnitsModal(); return; }
                if (tab.key === 'harga') { openPriceModal('Member'); return; }
              }}
              className={`px-5 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                tab.key === 'data'
                  ? 'border-[#00A980] text-[#00A980]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE BODY ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white relative z-0 pb-24">
        <form onSubmit={handleSubmit}>
          <div className="max-w-4xl mx-auto px-6 py-6">

            {/* TOP SECTION: Avatar left + Olshopin meter right */}
            <div className="flex items-start justify-between mb-8">
              {/* Foto Utama Produk */}
              <div>
                <p className="text-[13px] font-semibold text-gray-700 mb-3">Foto Utama Produk</p>
                <div className="relative w-[90px] h-[90px]">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Product" className="w-full h-full rounded-full object-cover border-2 border-gray-200" />
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-[28px] select-none"
                      style={{ backgroundColor: '#00A980' }}
                    >
                      {name ? name.substring(0, 2).toUpperCase() : 'PA'}
                    </div>
                  )}
                  {/* Edit icon */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Masukkan URL Gambar:');
                      if (url) setImageUrl(url);
                    }}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow border border-gray-200 text-gray-500 hover:text-[#00A980] cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>

              {/* Olshopin Meter */}
              <div className="text-right">
                <p className="text-[13px] text-gray-500">
                  Olshopin Meter :{' '}
                  <span className="text-amber-500 font-semibold cursor-pointer hover:underline">
                    Yuk Lebih Dilengkapi
                  </span>
                  <Info size={13} className="inline ml-1 text-gray-400" />
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                  <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                  <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00A980] w-[30%] rounded-full" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Foto Produk Toko Online */}
            <div className="mb-8">
              <p className="text-[14px] font-bold text-gray-800 mb-1">Foto Produk Toko Online (Olshopin)</p>
              <p className="text-[12px] text-gray-500 mb-3">
                Anda bisa upload beberapa foto produk menarik yang akan ditampilkan di toko online anda (olshopin)
              </p>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Masukkan URL Gambar:');
                  if (url) setImageUrl(url);
                }}
                className="w-[90px] h-[90px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-[#00A980] hover:text-[#00A980] transition-colors cursor-pointer text-[11px] gap-1"
              >
                <Plus size={22} />
                <span className="font-medium text-center leading-tight mt-1">Tambahkan<br />Gambar</span>
              </button>
            </div>

            {/* ── MAIN FIELDS 2-COLUMN ─────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Row: Kode | Nama */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Kode</label>
                  <div className="flex gap-2">
                    <input
                      ref={skuInputRef}
                      type="text"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                      placeholder="Kode barang"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980]"
                    />
                    <button
                      type="button"
                      onClick={generateRandomSku}
                      className="px-2.5 border border-gray-300 rounded text-[#00A980] hover:bg-emerald-50 cursor-pointer"
                      title="Generate kode"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScanMethodModal(true)}
                      className="px-2.5 border border-gray-300 rounded text-[#00A980] hover:bg-emerald-50 cursor-pointer"
                      title="Scan barcode"
                    >
                      <Barcode size={16} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Pastikan kode barang belum digunakan. Cek kode otomatis (sub-item) hanya tersedia di Aplikasi
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Nama</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nama barang"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980]"
                    required
                  />
                </div>
              </div>

              {/* Row: Tipe Barang | Kategori */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Tipe Barang</label>
                  <div className="relative">
                    <select
                      value={productType}
                      onChange={e => setProductType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] appearance-none bg-white focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] cursor-pointer"
                    >
                      <option value="Default">Default</option>
                      <option value="Multisatuan">Multisatuan</option>
                      <option value="Varian">Varian</option>
                      <option value="Paket">Paket</option>
                      <option value="Bahan Baku">Bahan Baku</option>
                      <option value="Imei">Imei</option>
                      <option value="Addon">Addon</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Kategori</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] appearance-none bg-white focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] cursor-pointer"
                      >
                        {DEFAULT_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        {!DEFAULT_CATEGORIES.includes(category) && category && (
                          <option value={category}>{category}</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Harga Beli | Harga Jual */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Harga Beli{' '}
                    <span className="text-[#00A980] font-normal text-[12px] cursor-pointer hover:underline">
                      (Lakukan Edit Harga Beli di Manajemen Stok)
                    </span>
                  </label>
                  <div className="flex items-center border border-gray-300 rounded focus-within:border-[#00A980] focus-within:ring-1 focus-within:ring-[#00A980]">
                    <span className="px-3 text-[13px] text-gray-500 border-r border-gray-200 py-2">Rp</span>
                    <input
                      type="number"
                      value={priceBuy || ''}
                      onChange={e => setPriceBuy(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 text-[13px] outline-none bg-transparent"
                    />
                    <button type="button" className="px-3 text-gray-400 hover:text-[#00A980] cursor-pointer py-2">
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#00A980] mt-1 cursor-pointer hover:underline">
                    Tips! Coba kalkulator HPP &amp; markup untuk menghitung harga jual produk dengan akurat.{' '}
                    <span className="text-[#00A980] font-bold underline">Klik Disini</span>
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Harga Jual</label>
                  <div className="flex items-center border border-gray-300 rounded focus-within:border-[#00A980] focus-within:ring-1 focus-within:ring-[#00A980]">
                    <span className="px-3 text-[13px] text-gray-500 border-r border-gray-200 py-2">Rp</span>
                    <input
                      type="number"
                      value={priceSell || ''}
                      onChange={e => setPriceSell(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 text-[13px] outline-none bg-transparent"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Disarankan Harga Jual Di Atas Rp {priceBuy.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Row: Jenis Stok | Stok */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Jenis Stok (Barang/Jasa)</label>
                  <div className="relative">
                    <select
                      value={useStock ? 'barang' : 'jasa'}
                      onChange={e => setUseStock(e.target.value === 'barang')}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] appearance-none bg-white focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] cursor-pointer"
                    >
                      <option value="barang">Barang (Limited Stock)</option>
                      <option value="jasa">Jasa (Unlimited)</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Stok{' '}
                    <span className="text-[#00A980] font-normal text-[12px] cursor-pointer hover:underline">
                      (Lakukan Edit Stok di Manajemen Stok)
                    </span>
                  </label>
                  <div className={`flex items-center border border-gray-300 rounded focus-within:border-[#00A980] focus-within:ring-1 focus-within:ring-[#00A980] ${!useStock ? 'bg-gray-100' : 'bg-white'}`}>
                    <input
                      type="number"
                      disabled={!useStock}
                      value={useStock ? (stock || '') : ''}
                      onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder={useStock ? '0' : 'Unlimited'}
                      className="flex-1 px-3 py-2 text-[13px] outline-none bg-transparent disabled:text-gray-400"
                    />
                    <div className="flex flex-col border-l border-gray-300">
                       <button type="button" onClick={() => useStock && setStock(s => s+1)} disabled={!useStock} className="px-2 py-0.5 border-b border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><ChevronUp size={12} /></button>
                       <button type="button" onClick={() => useStock && setStock(s => Math.max(0, s-1))} disabled={!useStock} className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><ChevronDown size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row: Batas Min Stok | Satuan */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Batas Minimum Stok <div className="w-4 h-4 rounded-full bg-[#00A980] text-white flex items-center justify-center text-[10px] cursor-help">i</div>
                  </label>
                  <input
                    type="number"
                    value={minStock || ''}
                    onChange={e => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Satuan</label>
                  <input
                    type="text"
                    value={weightUnit}
                    onChange={e => setWeightUnit(e.target.value)}
                    placeholder="Contoh: pcs, kg, liter"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980]"
                  />
                </div>
              </div>

              {/* Row: Berat | Diskon */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    Berat (dalam gram) <div className="w-4 h-4 rounded-full bg-[#00A980] text-white flex items-center justify-center text-[10px] cursor-help">i</div>
                  </label>
                  <div className="flex items-center border border-gray-300 rounded focus-within:border-[#00A980] focus-within:ring-1 focus-within:ring-[#00A980] bg-white">
                    <input
                      type="number"
                      value={weight || ''}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-3 py-2 text-[13px] outline-none bg-transparent"
                    />
                    <div className="flex flex-col border-l border-gray-300">
                       <button type="button" onClick={() => setWeight(w => String((parseInt(w)||0)+1))} className="px-2 py-0.5 border-b border-gray-300 text-gray-500 hover:bg-gray-100"><ChevronUp size={12} /></button>
                       <button type="button" onClick={() => setWeight(w => String(Math.max(0, (parseInt(w)||0)-1)))} className="px-2 py-0.5 text-gray-500 hover:bg-gray-100"><ChevronDown size={12} /></button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Diskon</label>
                  <div className="flex h-[38px]">
                    <input
                      type="number"
                      value={discount || ''}
                      onChange={e => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="flex-1 px-3 border border-gray-300 rounded-l text-[13px] focus:outline-none focus:border-[#00A980]"
                    />
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === '%' ? 'Rp' : '%')}
                      className="px-4 border border-l-0 border-gray-300 rounded-r text-[13px] bg-white hover:bg-gray-50 text-gray-700 cursor-pointer font-medium whitespace-nowrap flex items-center gap-1"
                    >
                      {discountType} <ChevronDown size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row: Letak Rak | Keterangan */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Letak Rak</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Keterangan</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] resize-none"
                  />
                </div>
              </div>

              {/* Tampilkan Barang (full width) */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Tampilkan Barang</label>
                <div className="relative w-1/2 pr-4">
                  <select
                    value={showInTransaction ? 'tampil' : 'sembunyikan'}
                    onChange={e => setShowInTransaction(e.target.value === 'tampil')}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] appearance-none bg-white focus:outline-none focus:border-[#00A980] focus:ring-1 focus:ring-[#00A980] cursor-pointer"
                  >
                    <option value="tampil">Tampilkan di Toko &amp; Olshopin</option>
                    <option value="sembunyikan">Sembunyikan</option>
                  </select>
                  <ChevronDown className="absolute right-7 top-2.5 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Deskripsi Olshopin */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-[13px] font-semibold text-gray-700">Deskripsi Olshopin</label>
                  <span className="text-[11px] font-bold text-amber-500 border border-amber-300 rounded px-1.5 py-0.5">Pro</span>
                </div>
                <p className="text-[12px] text-gray-500 mb-2">Deskripsikan Barang Lebih Menarik dan Lebih Lengkap di Toko Online Anda</p>
                <div className="border border-gray-300 rounded overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 text-gray-600 text-[13px]">
                    <button type="button" className="font-bold w-7 h-7 hover:bg-gray-200 rounded cursor-pointer flex items-center justify-center">B</button>
                    <button type="button" className="italic w-7 h-7 hover:bg-gray-200 rounded cursor-pointer flex items-center justify-center">I</button>
                    <button type="button" className="underline w-7 h-7 hover:bg-gray-200 rounded cursor-pointer flex items-center justify-center">U</button>
                    <span className="w-px h-4 bg-gray-300 mx-1" />
                    <button type="button" className="w-7 h-7 hover:bg-gray-200 rounded cursor-pointer flex items-center justify-center font-bold">...</button>
                  </div>
                  <textarea
                    rows={8}
                    placeholder=""
                    className="w-full px-3 py-2 text-[13px] focus:outline-none resize-none"
                  />
                  <div className="text-right text-[11px] text-gray-400 px-3 pb-2 border-t border-gray-100 bg-gray-50">Characters: 0/2000</div>
                </div>
              </div>

            </div>{/* end fields */}

            {/* Simpan button - pinned relative to form */}
            <div className="flex justify-end mt-12 pb-10 border-t border-gray-200 pt-6">
              <button
                type="submit"
                className="px-14 py-2.5 bg-[#00A980] hover:bg-[#00906D] text-white font-bold text-[15px] rounded cursor-pointer transition-colors shadow-sm"
              >
                Simpan
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Price Type Modal */}
      {showPriceTypeModal && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col h-[100dvh] animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowPriceTypeModal(false)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer">
                <ChevronLeft size={24} className="text-gray-900" />
              </button>
              <h2 className="text-[17px] font-bold text-gray-900">
                Atur Tipe Harga (Berjenjang)
              </h2>
            </div>
            <button 
              onClick={() => {
                if (tempPriceValue <= 0) {
                  alert("Harga Jual tingkat minimal 1 harus diisi");
                  return;
                }
                
                const customerTypeMap = selectedType === 'Member' ? 'Langganan' : selectedType;
                
                if (selectedType === 'Member') {
                  setPriceSellMember(tempPriceValue);
                } else if (selectedType === 'Grosir') {
                  setPriceSellGrosir(tempPriceValue);
                } else if (selectedType === 'Agen') {
                  setPriceSellAgen(tempPriceValue);
                }

                // Sync main priceTiers
                setPriceTiers(prev => {
                  const cleaned = prev.filter(t => t.customerType !== customerTypeMap);
                  return [...cleaned, ...tempTiers].sort((a, b) => a.minQty - b.minQty);
                });

                setShowPriceTypeModal(false);
              }} 
              className="w-10 h-10 border-2 border-[#0D9488] text-[#0D9488] rounded-xl flex items-center justify-center bg-white cursor-pointer hover:bg-teal-50"
            >
              <Check size={24} strokeWidth={3} />
            </button>
          </div>
          
          <div className="p-4 space-y-6 flex-1 overflow-y-auto font-sans">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Pilih Tipe Pelanggan</label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => {
                    const type = e.target.value as 'Member' | 'Grosir' | 'Agen';
                    setSelectedType(type);
                    
                    const basePrice = type === 'Member' ? priceSellMember : type === 'Grosir' ? priceSellGrosir : priceSellAgen;
                    setTempPriceValue(basePrice || priceSell);
                    
                    const customerTypeMap = type === 'Member' ? 'Langganan' : type;
                    const existingTiers = priceTiers.filter(t => t.customerType === customerTypeMap);
                    setTempTiers(existingTiers);
                    
                    setNewTierMinQty(2);
                    setNewTierPrice(Math.round((basePrice || priceSell) * 0.95));
                  }}
                  className="w-full px-4 py-3 border border-[#0D9488] rounded-xl text-[15px] appearance-none focus:outline-none ring-1 ring-[#0D9488] bg-white font-bold text-gray-900"
                >
                  <option value="Member">Member (Langganan)</option>
                  <option value="Grosir">Grosir</option>
                  <option value="Agen">Agen</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ChevronLeft size={20} className="-rotate-90" />
                </div>
              </div>
            </div>

            {/* BASE TIER: Min 1 (Wajib) */}
            <div className="border border-gray-200 rounded-xl p-4 bg-teal-50/50">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#0D9488] rounded-full"></span>
                  <span className="font-bold text-sm text-gray-800">Tier 1 (Wajib - Min 1 Pcs)</span>
                </div>
                <span className="text-xs font-semibold bg-teal-100 text-[#0D9488] px-2 py-0.5 rounded-full">Default</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">Harga Jual per Pcs (Min 1 Pcs)</label>
                <input
                  type="text"
                  value={formatRupiah(tempPriceValue)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTempPriceValue(parseInt(val) || 0);
                  }}
                  className="w-full px-4 py-3 border border-[#0D9488] rounded-xl text-[15px] focus:outline-none ring-1 ring-[#0D9488] font-bold text-gray-900 bg-white"
                />
              </div>
            </div>

            {/* OTHER TIERS SECTION */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-gray-800">Jenjang Grosir Lainnya (Kuantitas Lebih Banyak)</span>
                <span className="text-xs text-gray-500">Total: {tempTiers.length} Jenjang</span>
              </div>

              {tempTiers.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {tempTiers.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-white shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">Min. {t.minQty} Pcs</span>
                          <span className="text-xs text-gray-400">Harga Satuan Grosir</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-[#0D9488] text-[15px]">{formatRupiah(t.price)}</span>
                        <button
                          type="button"
                          onClick={() => setTempTiers(prev => prev.filter(item => item.id !== t.id))}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Jenjang"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                  Belum ada jenjang grosir kuantitas banyak. Gunakan form di bawah untuk menambahkan.
                </div>
              )}
            </div>

            {/* FORM TAMBAH JENJANG BARU */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
              <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Tambah Jenjang Kuantitas Baru</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">Minimal Pembelian (Pcs)</label>
                  <input
                    type="number"
                    min={2}
                    value={newTierMinQty || ''}
                    onChange={(e) => setNewTierMinQty(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-[#0D9488] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">Harga Satuan (Rp)</label>
                  <input
                    type="text"
                    value={formatRupiah(newTierPrice)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewTierPrice(parseInt(val) || 0);
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:border-[#0D9488] bg-white text-gray-900"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addTempTier}
                className="w-full py-2.5 bg-[#0D9488] text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Tambah Jenjang Harga</span>
              </button>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-gray-500 bg-teal-50/30 p-3 rounded-lg border border-teal-100/30">
              <Info size={16} className="text-[#0D9488] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-gray-700 font-bold block mb-0.5">Aturan Harga Berjenjang:</strong>
                Sistem mengharuskan harga dasar untuk <strong>Min 1 Pcs</strong> diset terlebih dahulu. Anda kemudian dapat menambahkan potongan harga grosir untuk kuantitas minimal yang lebih besar (misal: Min 5 Pcs, Min 10 Pcs).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Method Chooser Modal */}
      {showScanMethodModal && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <Barcode size={22} className="text-[#0D9488]" />
                  Pilih Metode Scanner
                </h3>
                <button 
                  onClick={() => setShowScanMethodModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bluetooth / Physical Scanner Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowScanMethodModal(false);
                    setIsBluetoothScanning(true);
                    // Focus SKU Input with a brief delay
                    setTimeout(() => {
                      if (skuInputRef.current) {
                        skuInputRef.current.focus();
                        skuInputRef.current.select();
                      }
                    }, 200);
                  }}
                  className="p-5 border-2 border-dashed border-gray-200 hover:border-[#0D9488] rounded-2xl flex flex-col items-center text-center gap-3 transition-all hover:bg-teal-50/20 group text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-[#0D9488] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Barcode size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Scanner Bluetooth / USB</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Mengaktifkan kursor langsung ke kolom Kode. Silakan langsung scan barang Anda.
                    </p>
                  </div>
                </button>

                {/* Camera Scanner Option */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCameraScanner(true);
                  }}
                  className="p-5 border-2 border-dashed border-gray-200 hover:border-amber-500 rounded-2xl flex flex-col items-center text-center gap-3 transition-all hover:bg-amber-50/20 group text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Kamera HP / Perangkat</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Gunakan kamera terintegrasi pada perangkat Anda untuk mendeteksi barcode.
                    </p>
                  </div>
                </button>
              </div>

              <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-xs text-[#0D9488] flex items-start gap-2.5">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <strong>Tips:</strong> Bluetooth scanner akan emulasi ketikan keyboard. Memilih opsi bluetooth di atas akan memastikan input siap menerima sinyal scan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Live Scanner Overlay Modal */}
      {showCameraScanner && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex flex-col items-center justify-between p-4 md:p-6 backdrop-blur-md">
          {/* Header */}
          <div className="w-full max-w-lg flex justify-between items-center text-white pt-2">
            <div className="flex items-center gap-2">
              <Camera className="text-amber-400" size={22} />
              <span className="font-semibold text-sm tracking-wide">Pindai Kode via Kamera</span>
            </div>
            <button 
              onClick={() => {
                setShowCameraScanner(false);
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Viewfinder Center Area */}
          <div className="relative w-full max-w-md aspect-square max-h-[60vh] bg-black/40 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Overlay Lines */}
            <div className="absolute inset-0 border-4 border-black/40 flex items-center justify-center">
              <div className="w-64 h-48 relative border-2 border-white/50 rounded-xl flex flex-col justify-between p-2">
                {/* 4 neon corner indicators */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-500 -mt-1 -ml-1 rounded-tl-md"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-500 -mt-1 -mr-1 rounded-tr-md"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-500 -mt-1 -ml-1 rounded-bl-md"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-500 -mt-1 -mr-1 rounded-br-md"></div>

                {/* Laser scan line animation */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
              </div>
            </div>

            {/* Error Message */}
            {scannerError && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <Info size={32} className="text-red-400" />
                <p className="text-sm font-medium">{scannerError}</p>
                <p className="text-xs text-gray-400">Silakan gunakan mode manual atau bluetooth scanner sebagai alternatif.</p>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div className="w-full max-w-lg flex flex-col items-center gap-3 pb-4">
            <p className="text-xs text-gray-300 text-center max-w-xs leading-normal">
              Posisikan barcode berada di dalam area kotak bidik dengan pencahayaan yang cukup.
            </p>
            
            <div className="flex gap-3 w-full">
              {/* Simulation button (extremely robust testing fallback) */}
              <button
                type="button"
                onClick={() => {
                  // Simulate scan with random code starting with '1'
                  const simCode = '1' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
                  setSku(simCode);
                  
                  // Audio feedback
                  try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.1);
                  } catch(e) {}

                  setShowCameraScanner(false);
                  setShowScanMethodModal(false);
                }}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl uppercase transition-colors"
              >
                Simulasi Scan Sukses
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCameraScanner(false);
                }}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/25 text-white font-bold text-sm rounded-xl uppercase transition-colors"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multisatuan Modals */}
      {showUnitsModal && (
        <div className="fixed inset-0 bg-gray-50 z-[60] flex flex-col h-[100dvh] animate-fade-in">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white shadow-sm shrink-0">
            <button onClick={() => setShowUnitsModal(false)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer">
              <ChevronLeft size={24} className="text-gray-900" />
            </button>
            <h2 className="text-[15px] font-bold text-gray-900 uppercase tracking-wide flex-1 text-center pr-10">
              Multisatuan
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-[#f3f4f6] text-gray-700 text-[13px] p-4 rounded-xl leading-relaxed">
              Tipe Satuan dibuat dengan format satuan terkecil hingga satuan terbesar. Usahakan untuk satuan pertama adalah satuan PCS, per Unit atau per Buah. Contoh PCS = 1 Produk = Rp 1.000, sehingga untuk satuan berikutnya seperti lusin, 1 lusin = 12 PCS = Rp 12.000
              <br/><br/>
              Catatan: Harga satuan terkecil mengikuti harga jual pada data barang
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden relative mt-6">
              <div className="bg-[#dcfce7] text-[#00A980] px-3 py-1.5 text-[12px] font-medium absolute top-0 left-0 rounded-br-lg">
                Satuan Terkecil
              </div>
              <div className="p-4 pt-10">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-gray-900">{baseUnitName || 'pcs'}</span>
                  <span className="text-gray-500 text-[13px]">{baseUnitBarcode || <em className="text-gray-400">Kosong (Tanpa barcode)</em>}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex gap-12">
                    <div>
                      <div className="text-[12px] text-gray-500 mb-0.5">Jumlah</div>
                      <div className="font-medium text-gray-900 text-[14px]">1</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-gray-500 mb-0.5">Harga</div>
                      <div className="font-medium text-gray-900 text-[14px]">{formatRupiah(priceSell)}</div>
                    </div>
                  </div>
                  <button onClick={() => {
                    setEditingUnit(null); // special case for base unit
                    setTempUnitName(baseUnitName);
                    setTempUnitBarcode(baseUnitBarcode);
                    setTempUnitRatio(1);
                    setTempUnitPrice(priceSell);
                    setShowAddUnitModal(true);
                  }} className="text-[#00A980] p-1.5">
                    <Edit2 size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            {units.length > 1 && (
              <>
                <div className="text-center font-medium text-[15px] text-gray-800 pt-6 pb-2">
                  Tipe Satuan Lainnya
                </div>
                {units.slice(1).map(unit => (
                  <div key={unit.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-gray-900">{unit.unitName}</div>
                      <div className="text-gray-500 text-[13px]">{unit.sku_unit || <em className="text-gray-400">Kosong (Tanpa barcode)</em>}</div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex gap-12">
                        <div>
                          <div className="text-[12px] text-gray-500 mb-0.5">Jumlah</div>
                          <div className="font-medium text-gray-900 text-[14px]">{unit.conversionMultiplier}</div>
                        </div>
                        <div>
                          <div className="text-[12px] text-gray-500 mb-0.5">Harga</div>
                          <div className="font-medium text-gray-900 text-[14px]">{formatRupiah(unit.price_sell_umum)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingUnit(unit);
                          setTempUnitName(unit.unitName);
                          setTempUnitBarcode(unit.sku_unit || '');
                          setTempUnitRatio(unit.conversionMultiplier);
                          setTempUnitPrice(unit.price_sell_umum);
                          setShowAddUnitModal(true);
                        }} className="text-[#00A980] p-1.5">
                          <Edit2 size={18} strokeWidth={2} />
                        </button>
                        <button onClick={() => deleteUnit(unit.id)} className="text-red-500 p-1.5">
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="flex justify-end pt-6">
              <button onClick={() => {
                setEditingUnit({ id: 'new' } as any);
                setTempUnitName('');
                setTempUnitBarcode('');
                setTempUnitRatio(0);
                setTempUnitPrice(0);
                setShowAddUnitModal(true);
              }} className="bg-[#F59E0B] text-white px-5 py-2.5 rounded-full font-bold text-[14px] flex items-center gap-2 shadow-sm">
                <Plus size={18} strokeWidth={2.5} />
                Tipe Satuan
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-white border-t border-gray-100">
             <button onClick={() => setShowUnitsModal(false)} className="w-full bg-[#00A980] hover:bg-[#008f6c] text-white font-bold py-3.5 rounded-full shadow-sm transition-colors text-[14px] uppercase tracking-wide">
               SIMPAN
             </button>
          </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex flex-col justify-end">
          <div className="bg-white rounded-t-[20px] overflow-hidden flex flex-col animate-slide-up max-h-[90vh]">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowAddUnitModal(false)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full cursor-pointer">
                <X size={24} className="text-gray-900" />
              </button>
              <h2 className="text-[16px] font-bold text-gray-900 uppercase">
                {editingUnit === null ? 'Tambah Tipe Satuan' : 'Tambah Tipe Satuan'}
              </h2>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-5">
              {editingUnit === null && (
                <div className="text-center text-[15px] text-gray-900 mb-2">
                  Masukkan Nama Satuan Terkecil
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700">Nama Satuan*</label>
                <input
                  type="text"
                  value={tempUnitName}
                  onChange={(e) => setTempUnitName(e.target.value)}
                  placeholder={editingUnit === null ? "Cth: PCS, Lembar, Bungkus" : "Nama Satuan"}
                  className="w-full p-3 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-[#00A980]"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-gray-700">Barcode (Optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={tempUnitBarcode}
                    onChange={(e) => setTempUnitBarcode(e.target.value)}
                    placeholder="Barcode"
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-[#00A980]"
                  />
                  <Barcode size={32} className="text-[#00A980] shrink-0" strokeWidth={1.5} />
                </div>
                {editingUnit === null && (
                  <button onClick={() => setTempUnitBarcode(sku)} className="text-[13px] text-[#00A980] font-medium mt-2 inline-block">
                    Gunakan kode barang induk
                  </button>
                )}
              </div>
              
              {editingUnit !== null && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700">Jumlah*</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={tempUnitRatio || ''}
                      onChange={(e) => {
                         const val = parseInt(e.target.value) || 0;
                         setTempUnitRatio(val);
                         setTempUnitPrice(val * priceSell); // auto calculate based on smallest unit
                      }}
                      placeholder="Jumlah"
                      className="flex-1 p-3 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-[#00A980]"
                    />
                    <span className="text-[14px] font-medium text-gray-800 w-12">{baseUnitName || 'pcs'}</span>
                  </div>
                </div>
              )}

              {editingUnit !== null && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700">Harga*</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={tempUnitPrice || ''}
                      onChange={(e) => setTempUnitPrice(parseInt(e.target.value) || 0)}
                      placeholder="Harga"
                      className="flex-1 p-3 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:border-[#00A980]"
                    />
                    <span className="text-[14px] font-medium text-gray-800 text-center">/</span>
                    <span className="text-[13px] text-gray-500 truncate max-w-[100px]">({tempUnitName || 'Nama Satuan'})</span>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 text-gray-800 p-3 rounded-xl flex items-start gap-2.5 text-[12px] mt-2">
                <Info size={16} className="text-gray-600 shrink-0 mt-0.5" />
                <span>Nama Satuan, Barcode dan Jumlah harus unik</span>
              </div>
            </div>
            
            <div className="p-5 pt-3">
               <button onClick={() => {
                 if (!tempUnitName.trim()) {
                   alert("Nama satuan wajib diisi");
                   return;
                 }
                 if (editingUnit !== null && tempUnitRatio <= 1) {
                   alert("Jumlah harus lebih dari 1");
                   return;
                 }
                 
                 if (editingUnit === null) {
                   setBaseUnitName(tempUnitName);
                   setBaseUnitBarcode(tempUnitBarcode);
                   if (units.length > 0) {
                     setUnits(prev => {
                       const updated = [...prev];
                       updated[0] = { ...updated[0], unitName: tempUnitName, sku_unit: tempUnitBarcode };
                       return updated;
                     });
                   } else {
                     setUnits([{
                        id: generateUUID(),
                        unitName: tempUnitName,
                        conversionMultiplier: 1,
                        price_sell_umum: priceSell,
                        sku_unit: tempUnitBarcode,
                        price_sell_member: 0,
                        price_sell_grosir: 0,
                        price_sell_agen: 0
                     }]);
                   }
                 } else if (editingUnit.id === 'new') {
                   setUnits(prev => [...prev, {
                      id: generateUUID(),
                      unitName: tempUnitName,
                      conversionMultiplier: tempUnitRatio,
                      price_sell_umum: tempUnitPrice,
                      sku_unit: tempUnitBarcode,
                      price_sell_member: 0,
                      price_sell_grosir: 0,
                      price_sell_agen: 0
                   }]);
                 } else {
                   setUnits(prev => prev.map(u => u.id === editingUnit.id ? {
                     ...u,
                     unitName: tempUnitName,
                     conversionMultiplier: tempUnitRatio,
                     price_sell_umum: tempUnitPrice,
                     sku_unit: tempUnitBarcode
                   } : u));
                 }
                 setShowAddUnitModal(false);
               }} className={`w-full font-bold py-3.5 rounded-full shadow-sm transition-colors text-[14px] uppercase tracking-wide ${editingUnit === null ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]' : 'bg-[#00A980] text-white hover:bg-[#008f6c]'}`}>
                 Input Satuan{editingUnit === null ? ' Terkecil' : ''}
               </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl p-6 space-y-6 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-1">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Peringatan</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Data belum disimpan, apakah anda yakin ingin kembali?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onClose();
                }}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[15px] rounded-xl transition-colors cursor-pointer text-center"
              >
                Ya
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[15px] rounded-xl transition-colors cursor-pointer text-center"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
