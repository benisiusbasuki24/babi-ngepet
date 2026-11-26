import React, { useEffect, useState } from 'react';
import { LogOut, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase';
import type { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';

export type AuthTabMode = 'customer' | 'admin';

interface AuthViewProps {
  initialTab?: AuthTabMode;
  currentUser: UserProfile | null;
  onCustomerRegister: (data: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  }) => Promise<void>;
  onAdminGoogleSignIn: () => Promise<void>;
  onSaveProfile: (data: {
    name: string;
    phone: string;
    address: string;
  }) => Promise<void>;
  onLogout: () => Promise<void>;
  onNavigateAfterLogin: (role: 'customer' | 'admin') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialTab = 'customer',
  currentUser,
  onCustomerRegister,
  onAdminGoogleSignIn,
  onSaveProfile,
  onLogout,
  onNavigateAfterLogin,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTabMode>(initialTab);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMsg('');
  }, [initialTab]);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone);
      setAddress(currentUser.address);
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();

    if (!cleanName || cleanPhone.replace(/\D/g, '').length < 6 || cleanAddress.length < 3) {
      setErrorMsg('Lengkapi Nama, Nomor WhatsApp aktif, dan Alamat Pengantaran Anda.');
      return;
    }

    setLoading(true);
    try {
      await onCustomerRegister({
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        email: email.trim(),
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mendaftarkan profil pelanggan.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminGoogleClick = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await onAdminGoogleSignIn();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal masuk sebagai Admin Kasir.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim() || phone.replace(/\D/g, '').length < 6 || address.trim().length < 3) {
      setErrorMsg('Lengkapi nama, nomor WhatsApp, dan alamat pengantaran.');
      return;
    }
    setLoading(true);
    try {
      await onSaveProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setEditingProfile(false);
      if (currentUser) {
        onNavigateAfterLogin(currentUser.role);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan profil.',
      );
    } finally {
      setLoading(false);
    }
  };

  const needsProfileCompletion =
    currentUser && currentUser.role === 'customer' && !currentUser.profileComplete;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-[#E5E2DC] bg-white p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-[#F0EDE6] pb-5">
          <BrandLogo size={42} />
          <div>
            <p className="text-xs font-medium text-[#6B655E]">
              Warung Babi Ngepet · Portal Pelanggan &amp; Admin
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#171615]">
              {needsProfileCompletion
                ? 'Lengkapi Pendaftaran Pelanggan'
                : currentUser
                ? 'Profil Akun Terdaftar'
                : activeTab === 'admin'
                ? 'Login Kasir Admin'
                : 'Pendaftaran & Masuk Pelanggan'}
            </h1>
          </div>
        </div>

        {/* Active Signed-in Session */}
        {currentUser && !needsProfileCompletion && !editingProfile && (
          <div className="rounded-xl border border-[#E5E2DC] bg-[#F8F7F4] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#15803D]">
                  {currentUser.role === 'admin'
                    ? 'Admin Kasir Terverifikasi'
                    : 'Pelanggan Terdaftar (Formulir Aktif)'}
                </p>
                <p className="mt-1 font-display text-lg font-bold text-[#171615]">
                  {currentUser.name}
                </p>
                <p className="font-mono text-xs text-[#524E48] mt-0.5">
                  WhatsApp: {currentUser.phone}
                </p>
                {currentUser.email && (
                  <p className="font-mono text-xs text-[#524E48] mt-0.5">
                    Email: {currentUser.email}
                  </p>
                )}
                {currentUser.address && (
                  <p className="text-xs text-[#5E5A54] mt-0.5">
                    Alamat: {currentUser.address}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD7CE] bg-white px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/8 transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5 border-t border-[#E5E2DC] pt-3">
              <button
                type="button"
                onClick={() => onNavigateAfterLogin(currentUser.role)}
                className="rounded-lg bg-[#C83E2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B23322] transition-colors"
              >
                {currentUser.role === 'admin'
                  ? 'Buka Panel Kasir Admin'
                  : 'Lanjut Pesan Menu'}
              </button>

              {currentUser.role === 'customer' && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="rounded-lg border border-[#DCD7CE] bg-white px-4 py-2 text-xs font-semibold text-[#171615] hover:bg-[#ECE8E0] transition-colors"
                >
                  Edit Profil &amp; Alamat
                </button>
              )}
            </div>
          </div>
        )}

        {/* Profile Completion / Edit Form */}
        {(needsProfileCompletion || editingProfile) && currentUser && (
          <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
            <p className="text-xs leading-relaxed text-[#524E48]">
              Perbarui data WhatsApp dan alamat pengantaran Anda.
            </p>

            <div>
              <label
                htmlFor="prof-name"
                className="block text-xs font-semibold text-[#171615] mb-1.5"
              >
                Nama Lengkap
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="prof-phone"
                className="block text-xs font-semibold text-[#171615] mb-1.5"
              >
                Nomor WhatsApp Aktif
              </label>
              <input
                id="prof-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2.5 text-sm font-mono text-[#171615] focus:border-[#C83E2B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="prof-address"
                className="block text-xs font-semibold text-[#171615] mb-1.5"
              >
                Alamat Pengantaran Utama
              </label>
              <textarea
                id="prof-address"
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/8 px-3 py-2 text-xs font-medium text-[#DC2626]">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-wrap gap-2.5">
              {editingProfile && (
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="rounded-xl border border-[#DCD7CE] bg-white px-4 py-3 text-xs font-semibold text-[#171615]"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#C83E2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#B23322] transition-colors disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span>{loading ? 'Menyimpan...' : 'Simpan Profil'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode Switcher & Forms when not editing profile */}
        {!needsProfileCompletion && !editingProfile && (
          <>
            <div
              role="tablist"
              aria-label="Pilih peran masuk"
              className="grid grid-cols-2 gap-1 rounded-xl bg-[#ECE8E0] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'customer'}
                onClick={() => {
                  setActiveTab('customer');
                  setErrorMsg('');
                }}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'customer'
                    ? 'bg-white text-[#171615] font-semibold'
                    : 'text-[#5E5A54] hover:text-[#171615]'
                }`}
              >
                Formulir Pelanggan
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'admin'}
                onClick={() => {
                  setActiveTab('admin');
                  setErrorMsg('');
                }}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-white text-[#171615] font-semibold'
                    : 'text-[#5E5A54] hover:text-[#171615]'
                }`}
              >
                Login Admin Kasir
              </button>
            </div>

            {activeTab === 'customer' ? (
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#524E48]">
                  <Users className="h-4 w-4 text-[#C83E2B]" />
                  <span>
                    Pelanggan wajib mendaftar dengan mengisi form di bawah ini untuk
                    mulai memesan menu.
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="cust-reg-name"
                    className="block text-xs font-semibold text-[#171615] mb-1"
                  >
                    Nama Lengkap *
                  </label>
                  <input
                    id="cust-reg-name"
                    type="text"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full rounded-xl border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cust-reg-phone"
                    className="block text-xs font-semibold text-[#171615] mb-1"
                  >
                    Nomor WhatsApp Aktif *
                  </label>
                  <input
                    id="cust-reg-phone"
                    type="tel"
                    required
                    maxLength={25}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 087716443331"
                    className="w-full rounded-xl border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2.5 text-sm font-mono text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cust-reg-address"
                    className="block text-xs font-semibold text-[#171615] mb-1"
                  >
                    Alamat Pengantaran / Catatan Meja *
                  </label>
                  <textarea
                    id="cust-reg-address"
                    rows={2}
                    required
                    maxLength={400}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jalan, No. Rumah, Patokan, atau No. Meja Warung"
                    className="w-full rounded-xl border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cust-reg-email"
                    className="block text-xs font-semibold text-[#171615] mb-1"
                  >
                    Email (Opsional)
                  </label>
                  <input
                    id="cust-reg-email"
                    type="email"
                    maxLength={200}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    className="w-full rounded-xl border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                {errorMsg && (
                  <p className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/8 px-3 py-2 text-xs font-medium text-[#DC2626]">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C83E2B] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#B23322] transition-colors disabled:opacity-60 shadow-md"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {loading ? 'Mendaftarkan...' : 'Daftar & Mulai Pesan Menu'}
                  </span>
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E5E2DC] bg-[#F8F7F4] p-4 text-xs text-[#524E48] leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
                  <p>
                    Portal Kasir Admin menggunakan verifikasi Google Admin (
                    <span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>)
                    untuk mengelola antrean pesanan dan katalog menu warung.
                  </p>
                </div>

                {errorMsg && (
                  <p className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/8 px-3 py-2 text-xs font-medium text-[#DC2626]">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAdminGoogleClick}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#171615] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#2E2B29] transition-colors disabled:opacity-60 shadow-md"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {loading
                      ? 'Memverifikasi Admin...'
                      : 'Masuk Panel Kasir dengan Google Admin'}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
