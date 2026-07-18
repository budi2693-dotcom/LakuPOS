/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Gauge,
  AlertTriangle,
  Play,
  CheckCircle,
  HelpCircle,
  RefreshCcw,
} from 'lucide-react';
import { Product, DatabaseConfig } from '../types';
import { generateBulkDummyProducts } from '../data';
import { localBulkAddProducts } from '../lib/indexedDb';
import { supabaseBulkAddProducts } from '../lib/supabase';
import { clearProducts } from '../lib/dbManager';

interface DummyDataGeneratorProps {
  currentConfig: DatabaseConfig;
  onGenerationComplete: () => void;
}

export default function DummyDataGenerator({
  currentConfig,
  onGenerationComplete,
}: DummyDataGeneratorProps) {
  const [amount, setAmount] = useState<number>(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{ elapsedMs: number; ratePerSec: number } | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleGenerate = async () => {
    setIsRunning(true);
    setProgress(10);
    setLogs([]);
    setStats(null);
    
    addLog(`Memulai proses pembuatan ${amount.toLocaleString('id-ID')} barang dummy...`);

    const isSupabase = currentConfig.mode === 'supabase';
    
    setTimeout(async () => {
      try {
        const startTime = performance.now();
        
        // 1. Generate items in memory
        addLog('Mengompilasi rancangan nama, harga, dan SKU barang...');
        const dummyItems = generateBulkDummyProducts(amount);
        setProgress(35);
        addLog(`Berhasil merancang ${dummyItems.length} produk di memori.`);

        // 2. Commit transaction to database
        addLog(`Menyimpan ke database mode: ${isSupabase ? 'Supabase Cloud PostgreSQL' : 'IndexedDB Lokal (Offline)'}...`);
        setProgress(50);

        if (isSupabase) {
          addLog('Mengirimkan data dalam bentuk chunk 1000 baris ke Supabase Cloud. Mohon tunggu...');
          await supabaseBulkAddProducts(dummyItems);
        } else {
          addLog('Membuka transaksi batch berkecepatan tinggi di IndexedDB...');
          await localBulkAddProducts(dummyItems);
        }

        const endTime = performance.now();
        const elapsedMs = Math.round(endTime - startTime);
        const ratePerSec = Math.round((amount / (elapsedMs / 1000)));

        setProgress(100);
        addLog('Proses penyimpanan ke database berhasil diselesaikan!');
        
        setStats({ elapsedMs, ratePerSec });
        onGenerationComplete();
      } catch (err: any) {
        console.error(err);
        addLog(`Gagal membuat barang dummy: ${err.message || err}`);
        setProgress(0);
      } finally {
        setIsRunning(false);
      }
    }, 300);
  };

  const handleClearAll = async () => {
    if (!confirm('AWAS: Ini akan menghapus SELURUH data barang dari sistem, baik lokal maupun cloud. Anda yakin?')) {
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setStats(null);
    addLog('Menghapus semua data barang dari database...');

    try {
      await clearProducts();
      addLog('Semua data barang berhasil dihapus!');
      onGenerationComplete();
    } catch (err: any) {
      console.error(err);
      addLog(`Gagal menghapus data: ${err.message || err}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-6">
      
      {/* Intro and Warning */}
      <div className="space-y-2">
        <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles size={18} className="text-blue-500 animate-pulse" />
          Penguji Performa &amp; Generator Data Massal
        </h4>
        <p className="text-xs text-gray-500 leading-relaxed">
          Uji secara langsung kemampuan aplikasi ini dalam menampung hingga <strong>puluhan ribu barang</strong>. Generator data ini akan menciptakan ribuan barang simulasi dengan SKU terindeks secara instan untuk melatih kecepatan pencarian, penyaringan, dan grafik dashboard.
        </p>
      </div>

      {/* Selector and Action Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* Configuration */}
        <div className="space-y-4">
          {/* Amount selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Jumlah Barang yang akan Dibuat:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[100, 1000, 5000, 10000].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAmount(num)}
                  disabled={isRunning}
                  className={`py-2 px-1 border text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    amount === num
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {num.toLocaleString('id-ID')} Pcs
                </button>
              ))}
            </div>
          </div>

          {/* Warning notice depending on DB Mode */}
          <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
            currentConfig.mode === 'supabase'
              ? 'bg-amber-50 border-amber-100 text-amber-800'
              : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${currentConfig.mode === 'supabase' ? 'text-amber-500' : 'text-blue-500'}`} />
            <div className="space-y-1">
              <p className="font-semibold">
                Mode Aktif: {currentConfig.mode === 'supabase' ? 'Supabase Cloud (PostgreSQL)' : 'IndexedDB Lokal (Offline)'}
              </p>
              <p className="leading-relaxed">
                {currentConfig.mode === 'supabase'
                  ? 'Karena menggunakan koneksi cloud server, pembuatan 1,000+ barang mungkin memakan waktu beberapa detik (tergantung latensi jaringan).'
                  : 'Sangat disarankan! IndexedDB menggunakan memori asinkron berkinerja tinggi, mampu menyimpan 10,000 barang dalam waktu kurang dari satu detik saja.'}
              </p>
            </div>
          </div>

          {/* Trigger button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isRunning}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                <span>Memproses Data Dummy...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Hasilkan {amount.toLocaleString('id-ID')} Barang Dummy Instan</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isRunning}
            className="w-full py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer mt-2"
          >
            Hapus Semua Data Barang
          </button>
        </div>

        {/* Logs and Performance Gauge */}
        <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col justify-between max-h-[300px] md:max-h-full">
          <div className="bg-gray-50/75 px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>Logs Konsol Generator</span>
            {isRunning && <span className="text-blue-600 flex items-center gap-1"><Zap size={12} className="animate-pulse" /> Sedang memuat...</span>}
          </div>
          
          <div className="p-3 bg-gray-950 font-mono text-[10px] text-emerald-400 overflow-y-auto space-y-1.5 flex-1 min-h-[140px] max-h-[200px]">
            {logs.length === 0 ? (
              <div className="text-gray-500 italic py-6 text-center">
                Belum ada proses berjalan. Klik tombol di samping untuk menguji performa.
              </div>
            ) : (
              logs.map((log, index) => <div key={index}>{log}</div>)
            )}
          </div>

          {/* Performance Rate Panel */}
          {stats && (
            <div className="p-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between text-xs text-blue-800 animate-fade-in">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-blue-600 animate-bounce" />
                <div>
                  <p className="font-semibold">Performa Penulisan DB</p>
                  <p className="text-[10px] text-blue-600">Diselesaikan dalam {stats.elapsedMs.toLocaleString('id-ID')} ms</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold block">{stats.ratePerSec.toLocaleString('id-ID')} unit/detik</span>
                <span className="text-[9px] text-blue-500 uppercase tracking-wider font-semibold">Tingkat Kecepatan</span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isRunning && (
            <div className="h-1 bg-gray-100 w-full">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
