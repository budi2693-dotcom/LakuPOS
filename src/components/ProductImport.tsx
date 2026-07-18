import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Product } from '../types';

// Helper to generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ProductImportProps {
  onBack: () => void;
  onImportProducts: (products: Product[]) => Promise<void>;
}

export default function ProductImport({ onBack, onImportProducts }: ProductImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const parseExcel = async (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // header: 1 gives array of arrays
          const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (rows.length < 3) {
            reject(new Error("File terlalu pendek atau format salah. Harus menggunakan template yang benar."));
            return;
          }

          const headers = rows[0].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
          
          const importedProducts: Product[] = [];
          
          // Start from row 2 (index 2) because row 0 is header, row 1 is instruction
          for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            // If row is empty, skip
            if (!row || row.length === 0 || (!row[1] && !row[2])) continue;

            const getValue = (colName: string) => {
              const idx = headers.findIndex(h => h === colName);
              if (idx === -1) return undefined;
              return row[idx];
            };

            const skuRaw = getValue('data_kode_barang');
            const nameRaw = getValue('data_nama_barang');
            
            if (!skuRaw || !nameRaw) continue; // Wajib ada SKU dan Nama

            const priceBuyRaw = getValue('data_harga_beli') || 0;
            const priceSellRaw = getValue('data_harga_jual') || 0;
            const stockRaw = getValue('data_stok') || 0;
            const barangJasa = getValue('data_barang_jasa'); // 0 = stok, 1 = unlimited
            const minStock = getValue('minimum_stok') || 0;
            const discountType = getValue('tipe_diskon') || 0; // 0 = %, 1 = Rp
            const discount = getValue('diskon') || 0;
            const category = getValue('kategori') || 'Lain-lain';
            const description = getValue('keterangan') || '';

            const isUnlimited = barangJasa == '1';

            importedProducts.push({
              id: generateUUID(),
              sku: String(skuRaw).trim(),
              name: String(nameRaw).trim(),
              price_buy: parseFloat(String(priceBuyRaw)) || 0,
              price_sell: parseFloat(String(priceSellRaw)) || 0,
              stock: isUnlimited ? 0 : (parseFloat(String(stockRaw)) || 0),
              use_stock: !isUnlimited,
              min_stock: parseFloat(String(minStock)) || 0,
              discount: parseFloat(String(discount)) || 0,
              discount_type: discountType == '1' ? 'Rp' : '%',
              category: String(category).trim(),
              description: String(description).trim(),
              show_in_transaction: true,
              price_sell_member: 0,
              price_sell_grosir: 0,
              price_sell_agen: 0,
              price_tiers: [],
              units: [],
              bundle_items: [],
              created_at: new Date().toISOString()
            });
          }
          
          resolve(importedProducts);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Silakan pilih file Excel terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const products = await parseExcel(file);
      
      if (products.length === 0) {
        throw new Error("Tidak ada data produk yang valid ditemukan di dalam file. Pastikan Anda mengisi mulai dari baris ke-3 sesuai template.");
      }

      await onImportProducts(products);
      setSuccess(products.length);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || "Gagal memproses file. Pastikan format sesuai template.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('barang');

    const columns = [
      { header: 'alasan_gagal', key: 'alasan_gagal', width: 20 },
      { header: 'data_kode_barang', key: 'data_kode_barang', width: 25 },
      { header: 'data_nama_barang', key: 'data_nama_barang', width: 35 },
      { header: 'data_harga_beli', key: 'data_harga_beli', width: 20 },
      { header: 'data_harga_jual', key: 'data_harga_jual', width: 20 },
      { header: 'data_stok', key: 'data_stok', width: 15 },
      { header: 'data_barang_jasa', key: 'data_barang_jasa', width: 20 },
      { header: 'data_show_toko', key: 'data_show_toko', width: 20 },
      { header: 'minimum_stok', key: 'minimum_stok', width: 15 },
      { header: 'tipe_diskon', key: 'tipe_diskon', width: 15 },
      { header: 'diskon', key: 'diskon', width: 15 },
      { header: 'berat_dan_satuan', key: 'berat_dan_satuan', width: 20 },
      { header: 'berat', key: 'berat', width: 15 },
      { header: 'letak_rak', key: 'letak_rak', width: 15 },
      { header: 'keterangan', key: 'keterangan', width: 30 },
      { header: 'kategori', key: 'kategori', width: 20 },
      { header: 'gambar', key: 'gambar', width: 15 },
    ];
    worksheet.columns = columns;

    const headerRow = worksheet.getRow(1);
    const mandatoryCols = ['data_kode_barang', 'data_harga_jual', 'data_nama_barang', 'data_stok'];
    
    headerRow.eachCell((cell, colNumber) => {
      const colKey = columns[colNumber - 1].key;
      if (mandatoryCols.includes(colKey)) {
        cell.font = { bold: true, color: { argb: 'FFFF0000' } };
      } else {
        cell.font = { bold: true };
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    const instructions = [
      'Abaikan kolom ini.', 
      'Masukkan kode barang unik (Wajib)', 
      'Nama barang maksimal 80 karakter (Wajib)', 
      'Harga beli modal (Wajib)', 
      'Harga jual ke pelanggan (Wajib)', 
      'Jumlah stok (Wajib)', 
      '0 = Punya stok, 1 = Jasa/Unlimited (Wajib)', 
      '0 = Tampil, 1 = Sembunyikan (Wajib)', 
      'Batas minimum stok untuk pengingat', 
      '0 = %, 1 = Rp', 
      'Angka diskon (Misal 10)', 
      'Contoh: PCS', 
      'Berat dalam gram', 
      'Lokasi di gudang/toko', 
      'Penjelasan produk', 
      'Kelompok produk', 
      'Abaikan'
    ];
    
    const instrRow = worksheet.addRow(instructions);
    instrRow.font = { italic: true, color: { argb: 'FF555555' } };
    instrRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFCC' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    
    const example = [
      '', 'SKU-1001', 'Contoh Barang', '10000', '15000', '50', '0', '0', '5', '0', '10', 'PCS', '200', 'Rak A1', 'Barang bagus', 'Umum', ''
    ];
    const exampleRow = worksheet.addRow(example);
    exampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'TEMPLATE_BARANG_LAKUPOS.xlsx');
  };

  return (
    <div className="bg-white min-h-[calc(100vh-64px)] rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Import Produk Baru Sekaligus</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>Database</span>
              <span className="text-gray-300">/</span>
              <span>Barang atau Jasa</span>
              <span className="text-gray-300">/</span>
              <span className="text-teal-600 font-medium">Import Produk Baru Sekaligus</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-5xl">
        <div className="bg-[#E6F7F5] border border-[#BDE5DF] rounded-lg p-4 mb-8 flex gap-3 text-[#008A69]">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <p className="text-[14px]">
            Pelajari cara untuk import produk dalam jumlah banyak via excel. 
            <a href="#" className="font-bold underline ml-1">Lihat Panduan Pengguna</a>
          </p>
        </div>

        <div className="space-y-10">
          {/* Step 1 */}
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">Pilih template berikut sesuai dengan kebutuhan anda</h3>
              <p className="text-[14px] text-gray-600 mb-4">Template memasukkan produk dalam jumlah banyak.</p>
              <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-white border border-[#00A980] text-[#00A980] px-5 py-2.5 rounded hover:bg-[#F2FBF9] transition-colors font-semibold text-[14px]"
              >
                Unduh Template
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">Ketentuan umum import produk:</h3>
              <ul className="list-disc pl-5 text-[14px] text-gray-600 space-y-1.5">
                <li>Kolom <strong className="text-red-500 font-bold">bertanda merah</strong> wajib diisi (<span className="text-gray-900 font-medium">data_kode_barang, data_harga_jual, data_nama_barang, dan data_stok</span>).</li>
                <li>Maksimal Import <strong>500 produk</strong> (Termasuk Gambar).</li>
                <li>Pastikan <strong>Tipe Data</strong> anda <strong>TEXT</strong>.</li>
                <li>Pastikan data anda tidak mengandung karakter seperti koma (,), titik dua (:), titik koma (;), petik (').</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
            <div className="w-full max-w-2xl">
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">Select File yang telah anda edit di sini</h3>
              <ul className="list-disc pl-5 text-[14px] text-gray-600 space-y-1 mb-4">
                <li>Pastikan file sesuai format <strong>(.xls / .xlsx)</strong></li>
                <li>Ukuran File Maksimal <strong>10 MB</strong></li>
              </ul>

              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[#00A980] rounded-xl p-10 bg-[#F8FDFB] text-center w-full relative"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xls,.xlsx,.csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center">
                  <FileSpreadsheet size={48} className="text-[#00A980] mb-4" strokeWidth={1.5} />
                  {file ? (
                    <div className="text-center relative z-20">
                      <p className="text-gray-900 font-bold text-[16px]">{file.name}</p>
                      <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFile(null);
                          if(fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-red-500 text-sm font-semibold mt-3 hover:underline"
                      >
                        Hapus File
                      </button>
                    </div>
                  ) : (
                    <>
                      <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg shadow-sm font-semibold text-[14px] mb-3 hover:bg-gray-50 transition-colors pointer-events-none">
                        Pilih File
                      </button>
                      <p className="text-[14px] text-gray-500">Tidak ada file terpilih!</p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-600">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-[14px]">{error}</p>
                </div>
              )}

              {success !== null && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 text-green-700">
                  <CheckCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-[14px] font-medium">Sukses! {success} produk berhasil ditambahkan ke database.</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6 pb-20">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">4</div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-4">Klik Submit untuk unggah excel</h3>
              <button 
                onClick={handleSubmit}
                disabled={!file || loading}
                className="bg-[#00A980] text-white px-8 py-3 rounded-lg font-bold text-[15px] hover:bg-[#00906D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    Submit File
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
