/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  Key,
  X,
  AlertCircle,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { StaffAccount } from '../types';
import {
  getStaffAccounts,
  addStaffAccount,
  updateStaffAccount,
  deleteStaffAccount
} from '../lib/dbManager';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for creating / editing
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'kasir'>('kasir');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStaffAccounts();
      setStaffList(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat daftar staf.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setUsername('');
    setFullname('');
    setPassword('');
    setRole('kasir');
    setError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (staff: StaffAccount) => {
    setIsEditing(true);
    setEditingId(staff.id);
    setUsername(staff.username);
    setFullname(staff.fullname);
    setPassword(''); // Leave empty to keep existing password, or fill to change
    setRole(staff.role);
    setError(null);
    setShowForm(true);
  };

  const handleDelete = async (staff: StaffAccount) => {
    if (staff.username === 'owner') {
      alert('Akun owner utama bawaan sistem tidak boleh dihapus!');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus staf "${staff.fullname}" (${staff.username})?`)) {
      setLoading(true);
      try {
        await deleteStaffAccount(staff.id);
        setSuccessMsg(`Staf "${staff.fullname}" berhasil dihapus.`);
        setTimeout(() => setSuccessMsg(null), 3000);
        await loadStaff();
      } catch (err: any) {
        setError(err.message || 'Gagal menghapus staf.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !fullname.trim()) {
      setError('Username dan nama lengkap harus diisi.');
      return;
    }

    if (!isEditing && !password) {
      setError('Password harus diisi untuk akun staf baru.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingId) {
        // Edit existing staff
        const existing = staffList.find((s) => s.id === editingId);
        if (!existing) throw new Error('Staf tidak ditemukan.');

        const updated: StaffAccount = {
          ...existing,
          username: username.toLowerCase().trim(),
          fullname: fullname.trim(),
          role,
          // If password is set, update it, otherwise keep the old hash/password
          password_hash: password ? password : existing.password_hash,
        };

        await updateStaffAccount(updated);
        setSuccessMsg(`Profil staf "${fullname}" berhasil diperbarui.`);
      } else {
        // Create new staff
        // Check duplication
        const duplicate = staffList.some((s) => s.username === username.toLowerCase().trim());
        if (duplicate) {
          setError(`Username "${username}" sudah digunakan staf lain.`);
          setLoading(false);
          return;
        }

        const newStaff: StaffAccount = {
          id: crypto.randomUUID(),
          username: username.toLowerCase().trim(),
          password_hash: password, // Plain text is hashed locally / checked
          role,
          fullname: fullname.trim(),
          created_at: new Date().toISOString(),
        };

        await addStaffAccount(newStaff);
        setSuccessMsg(`Staf baru "${fullname}" berhasil didaftarkan.`);
      }

      setShowForm(false);
      setTimeout(() => setSuccessMsg(null), 3500);
      await loadStaff();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan akun staf.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            Manajemen Akun Staf (Backoffice)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola hak akses Owner dan Kasir. Akun kasir hanya memiliki akses kasir/POS dan katalog barang (read-only).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Registrasi Staf Baru
        </button>
      </div>

      {/* Message Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800 flex items-center gap-2 animate-fade-in">
          <Check className="text-emerald-600" size={18} />
          {successMsg}
        </div>
      )}

      {error && !showForm && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="text-red-600" size={18} />
          {error}
        </div>
      )}

      {/* Main Grid View */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Cari staf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <button
            onClick={loadStaff}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Staff Table */}
        {loading && staffList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <RefreshCw className="animate-spin text-blue-500" size={24} />
            <span className="text-xs">Memuat data staf...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Tidak ada data staf ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Hak Akses / Role</th>
                  <th className="py-3 px-4">Tanggal Pendaftaran</th>
                  <th className="py-3 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {staff.fullname}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      {staff.username}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          staff.role === 'owner'
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}
                      >
                        {staff.role === 'owner' ? (
                          <>
                            <Shield size={12} />
                            Owner (Pemilik)
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} />
                            Kasir (Restricted)
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {new Date(staff.created_at || '').toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Edit Akun"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(staff)}
                          disabled={staff.username === 'owner'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            staff.username === 'owner'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                          }`}
                          title="Hapus Akun"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Dialog Modal for Register/Edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Users className="text-blue-600" size={18} />
                {isEditing ? 'Ubah Profil Staf' : 'Pendaftaran Staf Baru'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="text-red-600 shrink-0" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Nama Lengkap Staf <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing && username === 'owner'}
                  placeholder="Contoh: budi_kasir (tanpa spasi)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Password Login {isEditing && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diubah)</span>}</span>
                  {!isEditing && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Key size={14} />
                  </span>
                  <input
                    type="password"
                    required={!isEditing}
                    placeholder={isEditing ? "Tulis password baru jika ingin mengubah" : "Tulis password minimal 4 karakter"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Hak Akses / Role <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={isEditing && username === 'owner'}
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'owner' | 'kasir')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-gray-100"
                >
                  <option value="kasir">Kasir (Hanya akses kasir & katalog read-only)</option>
                  <option value="owner">Owner (Akses penuh seluruh Backoffice)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-50 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg font-medium text-gray-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="animate-spin" size={14} />}
                  Simpan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
