import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import * as xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import { Product } from '../types';

// ---- UUID helper ----
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface ProductImportProps {
  onBack: () => void;
  onImportProducts: (products: Product[]) => Promise<void>;
}

// ================================================================
// Definisi kolom PERSIS format Kasir Pintar
// ================================================================
const KP_COLUMNS = [
  {
    header: 'alasan_gagal',
    key: 'alasan_gagal',
    width: 30,
    mandatory: false,
    instruction: 'Abaikan kolom ini. \nKolom ini akan berisi pesan kesalahan (jika ada), setelah anda melakukan proses upload',
  },
  {
    header: 'data_kode_barang',
    key: 'data_kode_barang',
    width: 28,
    mandatory: true,
    instruction: 'Masukkan kode barang:\n- maksimal 20 karakter\n- dilarang menggunakan spasi / simbol, kecuali tanda strip (-) diperbolehkan.\n- Kode bisa terdiri atas huruf saja, angka saja, huruf&angka, atau huruf&angka&strip.\n- kode harus unik (tidak boleh sama dengan yg lain)\n(Wajib diisi)',
  },
  {
    header: 'data_nama_barang',
    key: 'data_nama_barang',
    width: 38,
    mandatory: true,
    instruction: 'isi nama barang:\n- maksimal 80 karakter (Wajib diisi)\n- diperbolehkan menggunakan huruf, angka, dan simbol khusus berikut: _ . ; : ! ? " \' ( ) @ # % ^ & * + = - / |',
  },
  {
    header: 'data_harga_beli',
    key: 'data_harga_beli',
    width: 22,
    mandatory: true,
    instruction: 'isi harga beli\n- Harus lebih rendah dari harga jual\n- Apabila Anda ingin menginputkan angka desimal, gunakan titik (.) contoh: 1000.50\n(Wajib diisi)',
  },
  {
    header: 'data_harga_jual',
    key: 'data_harga_jual',
    width: 22,
    mandatory: true,
    instruction: '- isi harga jual barang anda\n- Apabila Anda ingin menginputkan angka desimal, gunakan titik (.) contoh: 1000.50\n(Wajib diisi)',
  },
  {
    header: 'data_stok',
    key: 'data_stok',
    width: 15,
    mandatory: true,
    instruction: '- Masukan jumlah stok pada produk saat ini\n- Apabila Anda ingin menginputkan angka desimal, gunakan titik (.) contoh: 5.5\n(Wajib diisi)',
  },
  {
    header: 'data_barang_jasa',
    key: 'data_barang_jasa',
    width: 22,
    mandatory: true,
    instruction: 'Isilah barang_jasa dengan ketentuan:\n- Nilai 0 = untuk barang yang mempunyai stok\n- Nilai 1 = jasa yang stoknya unlimited\n(Wajib diisi)',
  },
  {
    header: 'data_show_toko',
    key: 'data_show_toko',
    width: 20,
    mandatory: true,
    instruction: 'Isilah show_toko dengan:\n- Nilai 0 = untuk menampilkan barang di toko & olshopin\n- Nilai 1 = untuk tidak menampilkan barang di toko & olshopin\n- Nilai 2  = untuk menampilkan barang di menu favorit\n-Nilai 3 = untuk tidak menampilkan barang di Olshopin \n(Wajib diisi)',
  },
  {
    header: 'minimum_stok',
    key: 'minimum_stok',
    width: 18,
    mandatory: false,
    instruction: 'Isilah minimum_stok dengan angka stok batas minimal. \nJika tidak diisi maka sistem akan memberitahu anda setiap stok barang mencapai nilai 0 atau habis.',
  },
  {
    header: 'tipe_diskon',
    key: 'tipe_diskon',
    width: 16,
    mandatory: false,
    instruction: '- Akun Free, Tipe Diskon hanya bisa Tipe Persen (%) Nilai = 0\n- Akun Pro, bisa tipe Diskon Rupliah (Rp) Nilai = 1',
  },
  {
    header: 'diskon',
    key: 'diskon',
    width: 14,
    mandatory: false,
    instruction: 'Isilah Diskon dengan menuliskan angkanya saja.\nContoh: 10\n- isi angka 0 = jika tidak ada diskon\n- Diskon tipe % (Persen) maksimal 100%',
  },
  {
    header: 'berat_dan_satuan',
    key: 'berat_dan_satuan',
    width: 22,
    mandatory: false,
    instruction: 'isilah satuan barang.\nContoh : ml\n240 ml',
  },
  {
    header: 'berat',
    key: 'berat',
    width: 14,
    mandatory: false,
    instruction: 'Data berat hanya digunakan di toko online (olshopin) untuk kalkulasi biaya ongkir. Isi dengan angka dan satuannya adalah gram.\nContoh: 1000',
  },
  {
    header: 'letak_rak',
    key: 'letak_rak',
    width: 16,
    mandatory: false,
    instruction: 'isi letak rak barang jika diperlukan',
  },
  {
    header: 'keterangan',
    key: 'keterangan',
    width: 32,
    mandatory: false,
    instruction: 'Keterangan Maksimal 255 Karakter',
  },
  {
    header: 'kategori',
    key: 'kategori',
    width: 22,
    mandatory: false,
    instruction: 'isilah kategori.\nJika ingin mengelompokkan produk',
  },
  {
    header: 'gambar',
    key: 'gambar',
    width: 20,
    mandatory: false,
    instruction: 'Anda dapat insert gambar secara langsung.\nLakukan penyesuaian agar gambar / cell memiliki ukuran yang pas.',
  },
];

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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  // ================================================================
  // Parser: baca file Excel format Kasir Pintar
  // Baris 0 = header kolom, Baris 1 = instruksi (dilewati), Baris 2+ = data
  // ================================================================
  const parseExcel = async (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (rows.length < 2) {
            reject(new Error('File kosong atau tidak sesuai format template Kasir Pintar.'));
            return;
          }

          // Normalisasi header ke lowercase
          const headers = rows[0].map((h) => String(h ?? '').toLowerCase().trim());

          const getValue = (row: any[], colName: string) => {
            const idx = headers.indexOf(colName);
            if (idx === -1) return undefined;
            const val = row[idx];
            return val !== undefined && val !== null && val !== '' ? val : undefined;
          };

          const importedProducts: Product[] = [];

          // Data dimulai baris index 2 (baris ke-3 di Excel — setelah header & instruksi)
          // Tapi jika file langsung punya data di baris ke-2 (tanpa baris instruksi), tetap bisa
          const dataStart = 2;

          for (let i = dataStart; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const skuRaw  = getValue(row, 'data_kode_barang');
            const nameRaw = getValue(row, 'data_nama_barang');
            if (!skuRaw || !nameRaw) continue; // wajib ada

            const hargaBeli  = getValue(row, 'data_harga_beli')  ?? 0;
            const hargaJual  = getValue(row, 'data_harga_jual')  ?? 0;
            const stok       = getValue(row, 'data_stok')        ?? 0;
            const barangJasa = getValue(row, 'data_barang_jasa') ?? 0;
            const showToko   = getValue(row, 'data_show_toko')   ?? 0;
            const minStok    = getValue(row, 'minimum_stok')     ?? 0;
            const tipeDiskon = getValue(row, 'tipe_diskon')      ?? 0;
            const diskon     = getValue(row, 'diskon')           ?? 0;
            const satuan     = getValue(row, 'berat_dan_satuan') ?? '';
            const berat      = getValue(row, 'berat')            ?? 0;
            const letakRak   = getValue(row, 'letak_rak')        ?? '';
            const keterangan = getValue(row, 'keterangan')       ?? '';
            const kategori   = getValue(row, 'kategori')         ?? 'Lain-lain';

            const isUnlimited = String(barangJasa).trim() === '1';
            const isHidden    = String(showToko).trim() === '1';

            importedProducts.push({
              id: generateUUID(),
              sku:             String(skuRaw).trim(),
              name:            String(nameRaw).trim(),
              price_buy:       parseFloat(String(hargaBeli).replace(',', '.')) || 0,
              price_sell:      parseFloat(String(hargaJual).replace(',', '.')) || 0,
              stock:           isUnlimited ? 0 : parseFloat(String(stok).replace(',', '.')) || 0,
              use_stock:       !isUnlimited,
              min_stock:       parseFloat(String(minStok).replace(',', '.')) || 0,
              discount:        parseFloat(String(diskon).replace(',', '.')) || 0,
              discount_type:   String(tipeDiskon).trim() === '1' ? 'Rp' : '%',
              category:        String(kategori).trim() || 'Lain-lain',
              description:     String(keterangan).trim(),
              location:        String(letakRak).trim(),
              show_in_transaction: !isHidden,
              price_sell_member: 0,
              price_sell_grosir: 0,
              price_sell_agen: 0,
              price_tiers: [],
              units: [],
              bundle_items: [],
              created_at: new Date().toISOString(),
            });
          }

          resolve(importedProducts);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const products = await parseExcel(file);
      if (products.length === 0) {
        throw new Error(
          'Tidak ada data produk yang valid. Pastikan data dimulai dari baris ke-3 dan kolom data_kode_barang / data_nama_barang tidak kosong.'
        );
      }
      await onImportProducts(products);
      setSuccess(products.length);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Gagal memproses file.');
    } finally {
      setLoading(false);
    }
  };

  // ================================================================
  // Download template persis format Kasir Pintar
  // ================================================================
  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('barang');

    // Set kolom
    worksheet.columns = KP_COLUMNS.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));

    // ---- Baris 1: Header ----
    const headerRow = worksheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell, colNumber) => {
      const col = KP_COLUMNS[colNumber - 1];
      cell.font = {
        name: 'Arial',
        size: 10,
        color: { argb: col?.mandatory ? 'FFFF0000' : 'FF000000' }, // Merah untuk wajib, hitam untuk opsional
      };
      // Tidak ada background fill
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // ---- Baris 2: Instruksi ----
    const instrRow = worksheet.addRow(KP_COLUMNS.map((c) => c.instruction));
    instrRow.height = 120;
    instrRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } };
      // Tidak ada background fill
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });

    // ---- Baris 3-6: Contoh data persis seperti screenshot Kasir Pintar ----
    const exampleRows = [
      [
        '', '8995227500247', 'LARUTAN J.BIJI 320ml CONTOH', 5000, 6000, 6, 0, 0, 0, 0, 0, 'ml', 1000, 'Y01', 'Larutan cap kaki tiga anak membantu meredakan panas dalam', 'minuman', '😀'
      ],
      [
        '', '2435rerddfrd', 'LARUTAN Cap Kaki Tiga CONTOH', 2500, 4000, 10, 0, 0, 0, 0, 0, 'kl', 100, '84j', '', 'minuman', ''
      ],
      [
        '', '9556001051509', 'MILO KALENG 240ml CONTOH', 8000, 10000, 6, 1, 0, 0, 0, 0, '240 ml', 200, 'Y01', 'Susu milo menjadi minuman sehat dengan rasa coklat yang enak.', 'minuman', '😀'
      ],
      [
        '', 'dfgd454', 'MILO KALENG 241ml CONTOH', 9000, 12000, 7, 0, 0, 0, 0, 50, '241 ml', 201, 'Y02', '', 'minuman', ''
      ]
    ];

    exampleRows.forEach(rowData => {
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Freeze 2 baris pertama (header + instruksi)
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TEMPLATE_BARANG_KASIRPINTAR.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ================================================================
  // UI
  // ================================================================
  return (
    <div className="bg-white h-full rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center gap-4 shrink-0 shadow-sm">
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

      {/* Body */}
      <div className="p-8 max-w-5xl flex-1 overflow-y-auto custom-scrollbar">

        {/* Banner info */}
        <div className="bg-[#E6F7F5] border border-[#BDE5DF] rounded-lg p-4 mb-8 flex gap-3 text-[#008A69]">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <p className="text-[14px]">
            Template menggunakan format <strong>Kasir Pintar</strong> — Anda dapat langsung paste
            data ekspor dari Kasir Pintar ke template ini tanpa mengubah nama kolom apapun.
          </p>
        </div>

        <div className="space-y-10">

          {/* Step 1 */}
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">Unduh template format Kasir Pintar</h3>
              <p className="text-[14px] text-gray-600 mb-4">
                Template ini identik dengan format ekspor Kasir Pintar. Copy-paste langsung data Anda ke kolom yang sesuai.
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-white border border-[#00A980] text-[#00A980] px-5 py-2.5 rounded hover:bg-[#F2FBF9] transition-colors font-semibold text-[14px]"
              >
                <Download size={16} />
                Unduh Template (Format Kasir Pintar)
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-3">Ketentuan kolom:</h3>
              <div className="overflow-x-auto">
                <table className="text-[13px] border-collapse w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Kolom</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Keterangan</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Wajib</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { col: 'data_kode_barang', ket: 'Kode / SKU unik barang', wajib: true },
                      { col: 'data_nama_barang', ket: 'Nama barang (maks. 80 karakter)', wajib: true },
                      { col: 'data_harga_beli', ket: 'Harga beli / modal', wajib: true },
                      { col: 'data_harga_jual', ket: 'Harga jual ke pelanggan', wajib: true },
                      { col: 'data_stok', ket: 'Jumlah stok saat ini', wajib: true },
                      { col: 'data_barang_jasa', ket: '0 = punya stok, 1 = jasa/unlimited', wajib: true },
                      { col: 'data_show_toko', ket: '0 = tampil, 1 = sembunyikan', wajib: true },
                      { col: 'minimum_stok', ket: 'Batas minimum stok untuk notifikasi', wajib: false },
                      { col: 'tipe_diskon', ket: '0 = Persen (%), 1 = Rupiah (Rp)', wajib: false },
                      { col: 'diskon', ket: 'Angka diskon (contoh: 10)', wajib: false },
                      { col: 'berat_dan_satuan', ket: 'Satuan barang (contoh: PCS, Kg)', wajib: false },
                      { col: 'berat', ket: 'Berat (gram)', wajib: false },
                      { col: 'letak_rak', ket: 'Lokasi rak / gudang', wajib: false },
                      { col: 'keterangan', ket: 'Deskripsi / catatan produk', wajib: false },
                      { col: 'kategori', ket: 'Kelompok / kategori produk', wajib: false },
                      { col: 'gambar', ket: 'Gambar produk (langsung insert Excel)', wajib: false },
                      { col: 'alasan_gagal', ket: 'Abaikan — kolom sistem Kasir Pintar', wajib: false },
                    ].map((r) => (
                      <tr key={r.col} className="even:bg-gray-50">
                        <td className={`border border-gray-200 px-3 py-1.5 font-mono text-[12px] ${r.wajib ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{r.col}</td>
                        <td className="border border-gray-200 px-3 py-1.5 text-gray-600">{r.ket}</td>
                        <td className="border border-gray-200 px-3 py-1.5 text-center">
                          {r.wajib ? <span className="text-red-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Step 3 – Upload file */}
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
            <div className="w-full max-w-2xl">
              <h3 className="text-[16px] font-bold text-gray-900 mb-2">Pilih file Excel yang sudah diisi</h3>
              <ul className="list-disc pl-5 text-[14px] text-gray-600 space-y-1 mb-4">
                <li>Format: <strong>.xls / .xlsx</strong></li>
                <li>Ukuran maksimal: <strong>10 MB</strong></li>
                <li>Data dimulai dari <strong>baris ke-3</strong> (baris 1 = header, baris 2 = instruksi)</li>
                <li>File ekspor Kasir Pintar langsung bisa di-import tanpa diubah</li>
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
                  accept=".xls,.xlsx"
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
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-red-500 text-sm font-semibold mt-3 hover:underline"
                      >
                        Hapus File
                      </button>
                    </div>
                  ) : (
                    <>
                      <button className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg shadow-sm font-semibold text-[14px] mb-3 pointer-events-none">
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
                  <p className="text-[14px] font-medium">
                    Sukses! <strong>{success.toLocaleString('id-ID')}</strong> produk berhasil ditambahkan ke database.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 4 – Submit */}
          <div className="flex gap-6 pb-20">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shrink-0">4</div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 mb-4">Klik Submit untuk proses import</h3>
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="bg-[#00A980] text-white px-8 py-3 rounded-lg font-bold text-[15px] hover:bg-[#00906D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
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
