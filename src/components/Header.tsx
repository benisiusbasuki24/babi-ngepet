import React from 'react';
import { ShoppingBag, UserPlus } from 'lucide-react';
import type { AppView, UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  cartCount: number;
  onOpenCart: () => void;
  currentUser: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  cartCount,
  onOpenCart,
  currentUser,
}) => {
  const isRegisteredCustomer = Boolean(
    currentUser?.role === 'customer' && currentUser.profileComplete,
  );

  const authLabel = currentUser
    ? currentUser.profileComplete
      ? 'Akun Saya'
      : 'Lengkapi Profil'
    : 'Masuk / Daftar';

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'menu', label: 'Menu' },
    { id: 'track', label: 'Lacak Pesanan' },
    { id: 'history', label: 'Histori' },
    { id: 'auth', label: authLabel },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E2DC] bg-[#F8F7F4]/95 backdrop-blur-sm no-print">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('menu')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C83E2B] rounded-md"
        >
          <BrandLogo size={34} />
          <span className="font-display text-lg font-bold tracking-tight text-[#171615] whitespace-nowrap shrink-0">
            Warung Babi Ngepet
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Customer Nav Links */}
        <nav
          aria-label="Navigasi pelanggan"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-1.5 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C83E2B] ${
                  isActive
                    ? 'border-[#C83E2B] text-[#171615] font-semibold'
                    : 'border-transparent text-[#5E5A54] hover:text-[#171615] hover:border-[#D4CFC7]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center shrink-0">
          {isRegisteredCustomer ? (
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 rounded-lg bg-[#171615] px-4 py-2.5 text-sm font-medium text-[#F8F7F4] transition-colors hover:bg-[#2E2B29] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C83E2B]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>Keranjang</span>
              <span className="font-mono text-xs tabular-nums text-[#F8F7F4]/90">
                ({cartCount})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C83E2B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B23322] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C83E2B]"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Daftar untuk Pesan</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Strip */}
      <nav
        aria-label="Navigasi seluler"
        className="flex md:hidden items-center gap-4 overflow-x-auto border-t border-[#ECE9E2] px-4 py-2 text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-[#C83E2B] text-[#171615] font-semibold'
                  : 'border-transparent text-[#5E5A54]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
