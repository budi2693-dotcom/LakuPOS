/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudLightning,
  AlertCircle,
  CheckCircle,
  Copy,
  Terminal,
  UploadCloud,
  DownloadCloud,
  ArrowRightLeft,
  Server,
  Key,
  Layers,
} from 'lucide-react';
import { DatabaseConfig } from '../types';
import { SUPABASE_SETUP_SQL, SUPABASE_ALTER_SQL, testSupabaseConnection, loadDbConfig, saveDbConfig } from '../lib/supabase';
import { syncLocalToSupabase, syncSupabaseToLocal } from '../lib/dbManager';

interface DatabaseSettingsProps {
  currentConfig: DatabaseConfig;
  onConfigChange: (newConfig: DatabaseConfig) => void;
  localProductCount: number;
}

export default function DatabaseSettings({
  currentConfig,
  onConfigChange,
  localProductCount,
}: DatabaseSettingsProps) {
  // Local input states
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig.supabaseAnonKey);
  const [selectedMode, setSelectedMode] = useState<'local' | 'supabase'>(currentConfig.mode);

  // Status states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync inputs if prop config changes
  useEffect(() => {
    setSupabaseUrl(currentConfig.supabaseUrl);
    setSupabaseAnonKey(currentConfig.supabaseAnonKey);
    setSelectedMode(currentConfig.mode);
  }, [currentConfig]);

  // Handle Save settings
  const handleSaveSettings = async (modeOverride?: 'local' | 'supabase') => {
    const mode = modeOverride !== undefined ? modeOverride : selectedMode;
    
    const newConfig: DatabaseConfig = {
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      mode,
    };

    saveDbConfig(newConfig);
    onConfigChange(newConfig);
    setTestResult(null);
  };

  // Connection tester
  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Mohon isi URL dan Anon Key terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const isOk = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
    setIsTesting(false);

    if (isOk) {
      setTestResult({
        success: true,
        message: 'Koneksi ke Supabase Berhasil! Endpoint aktif dan siap digunakan.',
      });
    } else {
      setTestResult({
        success: false,
        message: 'Koneksi gagal. Pastikan URL dan API Key benar, dan tabel "products" sudah dibuat di Supabase.',
      });
    }
  };

  // Copy SQL script to clipboard
  const [copiedType, setCopiedType] = useState<'setup' | 'alter' | null>(null);
  
  const handleCopySQL = (type: 'setup' | 'alter') => {
    const textToCopy = type === 'setup' ? SUPABASE_SETUP_SQL : SUPABASE_ALTER_SQL;
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Sync local data up to Supabase
  const handleUploadSync = async () => {
    if (currentConfig.mode !== 'supabase') {
      alert('Mohon ubah status database menjadi "Supabase" terlebih dahulu.');
      return;
    }

    if (localProductCount === 0) {
      alert('Tidak ada barang di database lokal untuk disinkronkan.');
      return;
    }

    if (!confirm(`Apakah Anda ingin mengunggah ${localProductCount} barang lokal ke tabel Supabase?`)) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    const res = await syncLocalToSupabase();
    setIsSyncing(false);

    if (res.error) {
      setSyncResult({
        success: false,
        message: `Sinkronisasi gagal: ${res.error}. Pastikan tabel "products" telah dibuat dengan benar di Supabase.`,
      });
    } else {
      setSyncResult({
        success: true,
        message: `Sinkronisasi berhasil! ${res.successCount} barang lokal berhasil disalin/diunggah ke Supabase Cloud.`,
      });
    }
  };

  // Sync Supabase down to local
  const handleDownloadSync = async () => {
    if (currentConfig.mode !== 'supabase') {
      alert('Mohon ubah status database menjadi "Supabase" terlebih dahulu.');
      return;
    }

    if (!confirm('Tindakan ini akan mengunduh seluruh data dari Supabase dan menimpa data di IndexedDB lokal Anda. Lanjutkan?')) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    const res = await syncSupabaseToLocal();
    setIsSyncing(false);

    if (res.error) {
      setSyncResult({
        success: false,
        message: `Gagal mengunduh: ${res.error}. Pastikan kredensial benar dan koneksi internet stabil.`,
      });
    } else {
      setSyncResult({
        success: true,
        message: `Unduh selesai! ${res.successCount} data produk dari Supabase berhasil diimpor ke IndexedDB lokal Anda.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* DB Selection & Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DB Selector and Status */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Metode Penyimpanan Data
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pilih apakah Anda ingin menggunakan basis data lokal IndexedDB gratis (bisa menampung puluhan ribu barang offline di browser) atau terintegrasi langsung dengan Supabase PostgreSQL Cloud Anda.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex flex-col gap-2">
              {/* Option Local DB */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('local');
                  handleSaveSettings('local');
                }}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center gap-3 ${
                  selectedMode === 'local'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-100'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${selectedMode === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Server size={16} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-gray-900">IndexedDB Lokal (Offline)</p>
                  <p className="text-[10px] text-gray-400">Penyimpanan langsung pada browser Anda</p>
                </div>
              </button>

              {/* Option Supabase DB */}
              <button
                type="button"
                disabled={!currentConfig.supabaseUrl || !currentConfig.supabaseAnonKey}
                onClick={() => {
                  setSelectedMode('supabase');
                  handleSaveSettings('supabase');
                }}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedMode === 'supabase'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-100'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                title={(!currentConfig.supabaseUrl || !currentConfig.supabaseAnonKey) ? 'Isi kredensial Supabase terlebih dahulu sebelum mengaktifkan mode ini' : ''}
              >
                <div className={`p-2 rounded-lg shrink-0 ${selectedMode === 'supabase' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <CloudLightning size={16} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-gray-900">Supabase Cloud Server</p>
                  <p className="text-[10px] text-gray-400">Sinkronisasi database PostgreSQL waktu-nyata</p>
                </div>
              </button>
            </div>

            {/* Mode status indicator */}
            <div className="pt-2 text-xs border-t border-gray-50">
              Status Aktif saat ini:{' '}
              <span className={`font-bold inline-flex items-center gap-1 ${
                currentConfig.mode === 'supabase' ? 'text-emerald-600' : 'text-blue-600'
              }`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0"></span>
                {currentConfig.mode === 'supabase' ? 'Supabase Cloud PostgreSQL' : 'IndexedDB Lokal (Offline)'}
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 space-y-4">
          <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Key size={18} className="text-emerald-500" />
            Integrasi &amp; Kredensial Supabase
          </h4>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Supabase Anon Public API Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer transition-colors"
              >
                {isTesting ? 'Menguji...' : 'Uji Koneksi'}
              </button>
              
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors"
              >
                Simpan Kredensial
              </button>
            </div>

            {/* Test connection alert message */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-fade-in ${
                testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync panel (Visible only if Supabase URL has been provided) */}
      {currentConfig.supabaseUrl && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-amber-500" />
            Alat Sinkronisasi Data (Two-Way Sync)
          </h4>
          <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
            Pindahkan dan samakan isi database lokal browser Anda (IndexedDB) dengan database cloud Supabase dengan mudah. Sempurna untuk transisi dan pencadangan data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Sync Up: Local -> Cloud */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <UploadCloud size={16} className="text-blue-500" />
                  Kirim Data: Lokal ➔ Supabase
                </h5>
                <p className="text-[11px] text-gray-400">
                  Mengunggah semua barang di IndexedDB lokal Anda ke dalam tabel produk di Supabase Cloud. Duplikasi dihindari berdasarkan SKU unik.
                </p>
                <p className="text-xs text-gray-700 font-semibold pt-1.5">
                  Jumlah barang lokal saat ini: <span className="text-blue-600 font-mono font-bold">{localProductCount} barang</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleUploadSync}
                disabled={isSyncing || localProductCount === 0 || currentConfig.mode !== 'supabase'}
                className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                Mulai Unggah data lokal ke Cloud
              </button>
            </div>

            {/* Sync Down: Cloud -> Local */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col justify-between">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <DownloadCloud size={16} className="text-emerald-500" />
                  Unduh Data: Supabase ➔ Lokal
                </h5>
                <p className="text-[11px] text-gray-400">
                  Mengunduh seluruh produk terdaftar di Supabase Cloud untuk disimpan ke dalam IndexedDB lokal Anda secara massal. Data lokal lama Anda akan ditimpa.
                </p>
                <p className="text-xs text-gray-700 font-semibold pt-1.5">
                  Mendukung performa sangat tinggi untuk pencarian offline instan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSync}
                disabled={isSyncing || currentConfig.mode !== 'supabase'}
                className="mt-4 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                Unduh Semua Data dari Cloud ke Lokal
              </button>
            </div>
          </div>

          {/* Sync status alert */}
          {syncResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-fade-in ${
              syncResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              {syncResult.success ? (
                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-semibold">{syncResult.success ? 'Sukses' : 'Gagal'}</span>
                <p>{syncResult.message}</p>
                {!syncResult.success && syncResult.message.includes('column') && (
                  <div className="mt-2 p-2 bg-red-100/60 rounded border border-red-200 text-[11px] text-red-900 leading-relaxed font-sans">
                    <strong>💡 SOLUSI ERROR SCHEMA CACHE / MISSING COLUMN:</strong> Jika Anda melihat pesan error bahwa kolom <code>bundle_items</code>, <code>units</code>, atau kolom lainnya tidak ditemukan, silakan salin dan jalankan <strong>Script Migrasi SQL (ALTER TABLE)</strong> yang ada di bagian bawah halaman ini pada SQL Editor Supabase Anda untuk menambahkan kolom-kolom baru tersebut tanpa menghapus data yang sudah ada!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SQL Setup & Migration Instructions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* NEW TABLE SETUP */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Terminal size={16} className="text-blue-500" />
                A. Pembuatan Tabel Baru (Fresh Setup)
              </h4>
              <p className="text-[11px] text-gray-500">
                Gunakan ini jika Anda baru pertama kali membuat tabel produk di Supabase:
              </p>
            </div>
            <button
              onClick={() => handleCopySQL('setup')}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedType === 'setup' ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedType === 'setup' ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs text-gray-600">
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>Buka <strong>SQL Editor</strong> di Supabase Dashboard.</li>
              <li>Buat tab query baru, tempelkan kode di bawah ini, lalu jalankan (Run).</li>
            </ol>
            <div className="relative">
              <pre className="p-3 bg-gray-950 text-gray-100 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[180px] select-all leading-relaxed">
                {SUPABASE_SETUP_SQL}
              </pre>
            </div>
          </div>
        </div>

        {/* EXISTiNG TABLE MIGRATION (ALTER TABLE) */}
        <div className="bg-white p-5 rounded-xl border border-red-100 bg-red-50/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-red-950 flex items-center gap-2">
                <Terminal size={16} className="text-red-500" />
                B. Migrasi Tabel Lama (Alter Schema)
              </h4>
              <p className="text-[11px] text-red-700 font-medium">
                Sangat Penting! Jalankan ini untuk mengatasi error "Could not find column":
              </p>
            </div>
            <button
              onClick={() => handleCopySQL('alter')}
              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedType === 'alter' ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedType === 'alter' ? 'Tersalin!' : 'Salin SQL Migrasi'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs text-red-950">
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>Jika Anda mendapat error "column not found" atau "schema cache", jalankan script di bawah ini.</li>
              <li>Ini akan menambah kolom-kolom baru (tipe barang, multi-satuan, dll) <strong>tanpa menghapus</strong> data Anda yang sudah ada.</li>
            </ol>
            <div className="relative">
              <pre className="p-3 bg-red-950/20 text-red-950 border border-red-100 rounded-lg font-mono text-[10px] overflow-x-auto max-h-[180px] select-all leading-relaxed">
                {SUPABASE_ALTER_SQL}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
