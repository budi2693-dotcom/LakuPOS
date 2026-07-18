/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  User,
  Shield,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ShoppingBag,
  Info,
  Server,
  CloudLightning
} from 'lucide-react';
import { StaffAccount } from '../types';
import { getStaffAccounts, addStaffAccount } from '../lib/dbManager';
import { loadDbConfig, saveDbConfig } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (user: StaffAccount) => void;
  appTitle?: string;
  appSubtitle?: string;
  onNavigateRoute?: (route: string) => void;
}

export default function Login({ 
  onLoginSuccess,
  appTitle = 'Veloce Point-of-Sale',
  appSubtitle = 'Masuk ke Backoffice untuk mengelola transaksi & barang toko Anda.',
  onNavigateRoute
}: LoginProps) {
  const [dbConfig, setDbConfig] = useState(() => loadDbConfig());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Check and seed default accounts if empty
  const ensureDefaultStaffAccounts = async () => {
    setSeeding(true);
    try {
      const list = await getStaffAccounts();
      if (list.length === 0) {
        // Seed standard accounts
        const defaultOwner: StaffAccount = {
          id: '11111111-1111-1111-1111-111111111111',
          username: 'owner',
          password_hash: 'owner123', // Clean plain-text mapping for ease
          role: 'owner',
          fullname: 'Owner Utama Veloce',
          created_at: new Date().toISOString()
        };

        const defaultKasir: StaffAccount = {
          id: '22222222-2222-2222-2222-222222222222',
          username: 'kasir',
          password_hash: 'kasir123',
          role: 'kasir',
          fullname: 'Kasir Utama Veloce',
          created_at: new Date().toISOString()
        };

        await addStaffAccount(defaultOwner);
        await addStaffAccount(defaultKasir);
        console.log('Successfully seeded default accounts: owner and kasir');
      }
    } catch (e: any) {
      console.error('Error seeding default accounts', e);
      if (dbConfig.mode === 'supabase') {
        setError('Koneksi Supabase aktif, namun tabel "staff_accounts" belum dibuat atau di-setup. Anda bisa beralih ke Mode Lokal di bawah ini untuk masuk dan melihat panduan setup.');
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleDbMode = (mode: 'local' | 'supabase') => {
    const updated = { ...dbConfig, mode };
    saveDbConfig(updated);
    setDbConfig(updated);
    setError(null);
    // Reload database config trigger
    setTimeout(() => {
      ensureDefaultStaffAccounts();
    }, 100);
  };

  useEffect(() => {
    ensureDefaultStaffAccounts();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Username dan password harus diisi.');
      return;
    }

    setLoading(true);
    try {
      const staffList = await getStaffAccounts();
      
      // Match credentials
      const matched = staffList.find(
        (s) => s.username.toLowerCase().trim() === username.toLowerCase().trim()
      );

      if (!matched || matched.password_hash !== password) {
        setError('Username atau password salah.');
        setLoading(false);
        return;
      }

      // Successful login
      onLoginSuccess(matched);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal melakukan login. Terjadi masalah sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        {/* Branding & Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {appTitle}
          </h1>
          <p className="text-sm text-gray-500">
            {appSubtitle}
          </p>
        </div>

        {/* DB Connection Mode Switcher */}
        <div className="flex items-center justify-between bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button
            type="button"
            onClick={() => handleToggleDbMode('local')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              dbConfig.mode === 'local'
                ? 'bg-white text-blue-600 shadow-xs border border-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Server size={13} />
            <span>Mode Lokal (Offline)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!dbConfig.supabaseUrl || !dbConfig.supabaseAnonKey) {
                setError('Koneksi Supabase belum dikonfigurasi di file env atau settings.');
                return;
              }
              handleToggleDbMode('supabase');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              dbConfig.mode === 'supabase'
                ? 'bg-white text-emerald-600 shadow-xs border border-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <CloudLightning size={13} />
            <span>Mode Cloud (Supabase)</span>
          </button>
        </div>

        {/* Demo Alert Box */}
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-xs text-amber-800 space-y-1.5 leading-relaxed">
          <div className="font-semibold flex items-center gap-1 text-sm text-amber-900">
            <Info size={14} className="shrink-0" />
            Kredensial Default Sistem:
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 bg-white/60 rounded border border-amber-200">
              <span className="block font-bold text-gray-700">Akses Owner:</span>
              Username: <strong className="text-purple-700">owner</strong><br />
              Password: <strong className="text-purple-700">owner123</strong>
            </div>
            <div className="p-2 bg-white/60 rounded border border-amber-200">
              <span className="block font-bold text-gray-700">Akses Kasir:</span>
              Username: <strong className="text-blue-700">kasir</strong><br />
              Password: <strong className="text-blue-700">kasir123</strong>
            </div>
          </div>
          <p className="text-[10px] text-amber-600 font-normal mt-1">
            * Owner memiliki hak penuh. Kasir dibatasi hanya kasir/POS & katalog read-only.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="text-red-600 shrink-0" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <User size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username (misal: owner)"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-gray-800"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Key size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || seeding}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : seeding ? 'Menyiapkan Database...' : 'Masuk ke Aplikasi'}
          </button>
        </form>

        {onNavigateRoute && (
          <div className="pt-2 text-center text-xs text-gray-500 border-t border-gray-100">
            {appTitle.includes('Backoffice') ? (
              <span>
                Ingin bertransaksi sebagai kasir?{' '}
                <button
                  type="button"
                  onClick={() => onNavigateRoute('/pos')}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Buka Halaman POS (Kasir)
                </button>
              </span>
            ) : (
              <span>
                Ingin masuk ke menu pengelolaan toko?{' '}
                <button
                  type="button"
                  onClick={() => onNavigateRoute('/backoffice')}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Buka Backoffice Owner
                </button>
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-gray-400">
          Veloce POS &copy; {new Date().getFullYear()} - Versi Offline-First Supabase Sync
        </div>
      </div>
    </div>
  );
}
