import React, { useEffect, useState } from 'react';
import { LogOut, ShieldCheck, UserCheck, UserPlus } from 'lucide-react';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase';
import type { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';

export type AuthTabMode = 'customer' | 'admin';

interface AuthViewProps {
  initialTab?: AuthTabMode;
  currentUser: UserProfile | null;
  onGoogleSignIn: (targetRole: AuthTabMode) => Promise<void>;
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
  onGoogleSignIn,
  onSaveProfile,
  onLogout,
  onNavigateAfterLogin,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTabMode>(initialTab);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
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
    }
  }, [currentUser]);

  const handleGoogleClick = async (mode: AuthTabMode) => {
    setErrorMsg('');
    setLoading(true);
    try {
      await onGoogleSignIn(mode);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan akun Google.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim() || phone.replace(/\D/g, '').length < 8 || address.trim().length < 3) {
      setErrorMsg('Lengkapi nama, nomor WhatsApp aktif, dan alamat pengantaran.');
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
        err instanceof Error ? err.message : 'Gagal menyimpan profil ke Firestore.',
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
              Warung Babi Ngepet · Firebase Auth &amp; Firestore
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#171615]">
              {needsProfileCompletion
                ? 'Lengkapi Registrasi Pelanggan'
                : currentUser
                ? 'Profil Akun Terhubung'
                : activeTab === 'admin'
                ? 'Login Kasir Admin'
                : 'Masuk & Registrasi Pelanggan'}
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
                    : 'Pelanggan Terdaftar (Firestore Sync)'}
                </p>
                <p className="mt-1 font-display text-lg font-bold text-[#171615]">
                  {currentUser.name}
                </p>
                <p className="font-mono text-xs text-[#524E48] mt-0.5">
                  {currentUser.email}
                </p>
                {currentUser.phone && (
                  <p className="font-mono text-xs text-[#524E48] mt-0.5">
                    WhatsApp: {currentUser.phone}
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

        {/* Registration / Profile Completion Form for Signed-In Customers */}
        {(needsProfileCompletion || editingProfile) && currentUser && (
          <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
            <p className="text-xs leading-relaxed text-[#524E48]">
              Lengkapi data WhatsApp dan alamat pengantaran Anda agar tersimpan di
              Firestore untuk checkout cepat dan pengiriman kwitansi digital.
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
                placeholder="Nama lengkap Anda"
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
                placeholder="Contoh: 081234567890"
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
                placeholder="Jalan, nomor rumah, dan patokan terdekat"
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
                <span>
                  {loading ? 'Menyimpan...' : 'Simpan Profil Pelanggan'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Mode Switcher & Google Sign-In when not editing profile */}
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
                Pelanggan (Masuk / Daftar)
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
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-[#524E48]">
                  Masuk atau daftar akun pelanggan dengan 1 klik melalui akun Google
                  Anda untuk menyimpan alamat pengantaran, memantau status pesanan
                  secara real-time, dan mengakses histori repeat order di semua
                  perangkat.
                </p>

                {errorMsg && (
                  <p className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/8 px-3 py-2 text-xs font-medium text-[#DC2626]">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleClick('customer')}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#C83E2B] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#B23322] transition-colors disabled:opacity-60"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {loading
                      ? 'Menghubungkan ke Google...'
                      : currentUser
                      ? 'Ganti Akun Google Pelanggan'
                      : 'Masuk / Daftar dengan Google'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E5E2DC] bg-[#F8F7F4] p-4 text-xs text-[#524E48] leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
                  <p>
                    Panel <strong>Kasir Admin</strong> terhubung dengan Firebase
                    Authentication. Gunakan akun Google Admin terdaftar (
                    <span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>)
                    untuk membuka antrean pesanan real-time, kelola stok menu, dan
                    penerbitan kwitansi.
                  </p>
                </div>

                {currentUser && currentUser.role !== 'admin' && (
                  <p className="rounded-lg border border-[#D97706]/40 bg-[#D97706]/10 px-3 py-2.5 text-xs font-medium text-[#92400E]">
                    Akun saat ini (<span className="font-mono">{currentUser.email}</span>
                    ) terdaftar sebagai Pelanggan. Silakan masuk dengan akun Google
                    Admin.
                  </p>
                )}

                {errorMsg && (
                  <p className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/8 px-3 py-2 text-xs font-medium text-[#DC2626]">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleClick('admin')}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#171615] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#2E2B29] transition-colors disabled:opacity-60"
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
