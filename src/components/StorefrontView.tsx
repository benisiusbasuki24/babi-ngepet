import React, { useMemo, useState } from 'react';
import { Lock, Minus, Plus, Search, UserPlus, UtensilsCrossed } from 'lucide-react';
import { MENU_CATEGORIES, type CartItem, type MenuCategory, type MenuItem } from '../types';
import { formatRupiah } from '../utils/format';

interface StorefrontViewProps {
  menu: MenuItem[];
  cart: CartItem[];
  canOrder: boolean;
  needsProfileCompletion: boolean;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQty: (menuId: string, delta: number) => void;
  onNavigateTrack: () => void;
  onRequireAuth: () => void;
}

const CATEGORIES: Array<'Semua' | MenuCategory> = ['Semua', ...MENU_CATEGORIES];

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  menu,
  cart,
  canOrder,
  needsProfileCompletion,
  onAddToCart,
  onUpdateQty,
  onNavigateTrack,
  onRequireAuth,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | MenuCategory>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCat =
        selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  const getCartQty = (menuId: string) =>
    cart.find((c) => c.menuItem.id === menuId)?.quantity || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10 space-y-12">
      {/* Hero Split Showcase */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-[#E5E2DC] bg-white p-6 sm:p-8 lg:p-10">
          <div className="space-y-5">
            <p className="text-xs font-medium tracking-wide text-[#5E5A54]">
              Warung Babi Ngepet · Pemesanan Khusus Pelanggan Terdaftar
            </p>
            <h1 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-[#171615] sm:text-4xl lg:text-[2.65rem] [text-wrap:balance]">
              Babi Kecap &amp; Babi Rica Khas Warung, Siap Antar ke Meja Anda.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#524E48]">
              Pilih lauk satuan, paket nasi hangat, atau porsi kiloan untuk keluarga.
              Daftar sebagai pelanggan untuk memesan via Delivery atau COD dan pantau
              status dapur secara real-time.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 pt-4 border-t border-[#F0EDE6]">
            {canOrder ? (
              <a
                href="#katalog-menu"
                className="inline-flex items-center justify-center rounded-lg bg-[#C83E2B] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B23322] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C83E2B]"
              >
                Pilih Menu Sekarang
              </a>
            ) : (
              <button
                type="button"
                onClick={onRequireAuth}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C83E2B] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B23322] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C83E2B]"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span>
                  {needsProfileCompletion
                    ? 'Lengkapi Registrasi Pelanggan'
                    : 'Daftar / Masuk untuk Memesan'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateTrack}
              className="inline-flex items-center justify-center rounded-lg border border-[#D9D4CC] bg-white px-5 py-3 text-sm font-medium text-[#171615] transition-colors hover:bg-[#F3F0EA] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171615]"
            >
              Lacak Status Pesanan
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 relative min-h-[280px] overflow-hidden rounded-2xl border border-[#E5E2DC] bg-[#171615]">
          {!failedImages['hero'] ? (
            <img
              src="/src/assets/images/menu_paket_rica_nasi_1795666126474.jpg"
              alt="Hidangan Babi Kecap dan Babi Rica Warung Babi Ngepet"
              referrerPolicy="no-referrer"
              onError={() => setFailedImages((prev) => ({ ...prev, hero: true }))}
              className="h-full w-full object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center bg-[#23201E] p-8 text-[#F8F7F4]">
              <UtensilsCrossed className="h-10 w-10 text-[#D99B26] mb-3" />
              <p className="font-display text-lg font-semibold">
                Hidangan Khas Warung Babi Ngepet
              </p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-6">
            <p className="text-sm font-medium text-white">
              Buka Setiap Hari 10.00 – 21.30 WITA · Delivery &amp; COD Tersedia
            </p>
            <p className="mt-0.5 text-xs text-white/80">
              Admin WhatsApp Resmi: 0877-1644-3331 · Gratis Ongkir min. Rp 150.000
            </p>
          </div>
        </div>
      </section>

      {/* 4-Column Service Guarantees Strip */}
      <section
        aria-label="Keunggulan layanan"
        className="grid grid-cols-1 gap-4 border-y border-[#E5E2DC] py-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <p className="text-xs font-mono text-[#8A837A]">01. PELANGGAN TERDAFTAR</p>
          <p className="mt-1 text-sm font-semibold text-[#171615]">
            Alamat &amp; WhatsApp Tersimpan Aman
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-[#8A837A]">02. DELIVERY &amp; COD</p>
          <p className="mt-1 text-sm font-semibold text-[#171615]">
            Pilih Jam Antar atau Kirim Cepat
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-[#8A837A]">03. PANTAU REAL-TIME</p>
          <p className="mt-1 text-sm font-semibold text-[#171615]">
            Update Langsung dari Dapur &amp; Kurir
          </p>
        </div>
        <div>
          <p className="text-xs font-mono text-[#8A837A]">04. KWITANSI DIGITAL</p>
          <p className="mt-1 text-sm font-semibold text-[#171615]">
            Bukti Lunas Resmi via WhatsApp
          </p>
        </div>
      </section>

      {/* Registered-Customer Gate Banner */}
      {!canOrder && (
        <section className="flex flex-col gap-4 rounded-2xl border border-[#C83E2B]/30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 shrink-0 text-[#C83E2B] mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-[#171615]">
                {needsProfileCompletion
                  ? 'Lengkapi Profil Pelanggan untuk Membuka Pemesanan'
                  : 'Pemesanan Khusus Pelanggan Terdaftar'}
              </h2>
              <p className="mt-0.5 text-xs text-[#524E48]">
                {needsProfileCompletion
                  ? 'Anda sudah masuk dengan Google. Lengkapi nomor WhatsApp dan alamat pengantaran terlebih dahulu sebelum menambahkan menu ke keranjang.'
                  : 'Anda dapat melihat seluruh daftar menu di bawah ini. Untuk melakukan pemesanan dan pengiriman ke WhatsApp Admin, silakan daftar atau masuk sebagai pelanggan.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequireAuth}
            className="rounded-lg bg-[#C83E2B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#B23322] whitespace-nowrap shrink-0 transition-colors"
          >
            {needsProfileCompletion ? 'Lengkapi Profil Sekarang' : 'Masuk / Daftar Pelanggan'}
          </button>
        </section>
      )}

      {/* Menu Catalog */}
      <section id="katalog-menu" className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#171615] sm:text-3xl">
              Pilihan Menu Warung
            </h2>
            <p className="mt-1 text-sm text-[#5E5A54]">
              Dimasak segar setiap hari dengan bumbu rempah Nusantara.
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A746C]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu favorit..."
              aria-label="Cari menu"
              className="w-full rounded-lg border border-[#DCD7CE] bg-white py-2.5 pl-9 pr-4 text-sm text-[#171615] placeholder:text-[#8A837A] focus:border-[#C83E2B] focus:outline-none"
            />
          </div>
        </div>

        {/* Interactive Category Segmented Filter Bar */}
        <div
          role="tablist"
          aria-label="Kategori menu"
          className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#ECE8E0] p-1.5 w-fit max-w-full"
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#171615] shadow-xs font-semibold'
                    : 'text-[#5E5A54] hover:text-[#171615]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* 3-Column Menu Grid */}
        {filteredMenu.length === 0 ? (
          <div className="rounded-xl border border-[#E5E2DC] bg-white p-10 text-center">
            <p className="text-base font-medium text-[#171615]">
              Menu tidak ditemukan
            </p>
            <p className="mt-1 text-sm text-[#5E5A54]">
              Coba kata kunci lain atau pilih kategori Semua.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenu.map((item) => {
              const qty = getCartQty(item.id);
              const imgFailed = failedImages[item.id];
              return (
                <article
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E2DC] bg-white transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ECE8E0]">
                      {!imgFailed ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                            !item.available ? 'grayscale opacity-60' : ''
                          }`}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-[#2A2623] p-4 text-center text-[#F8F7F4]">
                          <UtensilsCrossed className="h-7 w-7 text-[#D99B26] mb-2" />
                          <span className="text-xs font-medium">{item.name}</span>
                        </div>
                      )}

                      {!item.available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                          <span className="rounded-md bg-[#171615] px-3 py-1.5 text-xs font-semibold text-white">
                            Stok Habis Hari Ini
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 pb-3">
                      <p className="text-xs text-[#6B655E]">
                        {item.category} · {item.portionInfo}
                      </p>
                      <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-[#171615]">
                        {item.name}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#5E5A54] line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[#F0EDE6] px-5 py-4">
                    <span className="font-mono text-base font-semibold tabular-nums text-[#171615]">
                      {formatRupiah(item.price)}
                    </span>

                    {!item.available ? (
                      <span className="text-xs font-medium text-[#8A837A]">
                        Tidak tersedia
                      </span>
                    ) : !canOrder ? (
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2 text-xs font-semibold text-[#171615] transition-colors hover:bg-[#ECE8E0] whitespace-nowrap shrink-0"
                      >
                        <Lock className="h-3 w-3 text-[#C83E2B]" aria-hidden="true" />
                        <span>Daftar untuk Pesan</span>
                      </button>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#C83E2B] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#B23322] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C83E2B]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Tambah</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] p-1">
                        <button
                          type="button"
                          aria-label={`Kurangi ${item.name}`}
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#171615] hover:bg-[#ECE8E0] transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.5rem] text-center font-mono text-sm font-semibold tabular-nums text-[#171615]">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Tambah ${item.name}`}
                          onClick={() => onUpdateQty(item.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#C83E2B] text-white hover:bg-[#B23322] transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
