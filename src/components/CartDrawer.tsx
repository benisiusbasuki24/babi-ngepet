import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type {
  CartItem,
  DeliveryType,
  MenuItem,
  Order,
  PaymentMethod,
  UserProfile,
} from '../types';
import { createOrderAtomicInFirestore } from '../services/firestoreService';
import {
  ADMIN_WA_DISPLAY,
  buildAdminOrderWhatsAppUrl,
  formatRupiah,
} from '../utils/format';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  menuCatalog: MenuItem[];
  currentUser: UserProfile | null;
  onUpdateQty: (menuId: string, delta: number) => void;
  onUpdateItemNote: (menuId: string, note: string) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order) => void;
  onGoToTracking: (orderCode: string) => void;
  onOpenRegistration: () => void;
}

const DELIVERY_SLOTS = [
  'Secepatnya (± 30–45 Menit)',
  '11:00 – 12:00 WITA (Makan Siang)',
  '12:30 – 13:30 WITA (Siang)',
  '15:00 – 16:00 WITA (Sore)',
  '17:30 – 18:30 WITA (Makan Malam)',
  '19:00 – 20:30 WITA (Malam)',
];

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  menuCatalog,
  currentUser,
  onUpdateQty,
  onUpdateItemNote,
  onClearCart,
  onOrderCreated,
  onGoToTracking,
  onOpenRegistration,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY_SLOTS[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
      setCustomerName(currentUser.name);
      setCustomerPhone(currentUser.phone);
      setCustomerAddress(currentUser.address);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const isRegisteredCustomer = Boolean(
    currentUser?.role === 'customer' && currentUser.profileComplete,
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0,
  );
  const deliveryFee = cart.length === 0 ? 0 : subtotal >= 150000 ? 0 : 10000;
  const total = subtotal + deliveryFee;

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    if (type === 'cod') {
      setPaymentMethod('cod');
    } else if (paymentMethod === 'cod') {
      setPaymentMethod('transfer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isRegisteredCustomer || !currentUser) {
      setErrorMsg('Hanya pelanggan terdaftar yang dapat melakukan pemesanan.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Keranjang belanja Anda masih kosong.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setErrorMsg('Mohon lengkapi nama, nomor WhatsApp, dan alamat pengantaran.');
      return;
    }

    setSubmitting(true);
    try {
      const createdOrder = await createOrderAtomicInFirestore({
        userId: currentUser.id,
        menuCatalog,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryType,
        deliveryTime,
        paymentMethod,
        notes: notes.trim(),
        source: 'whatsapp_web',
        items: cart.map((c) => ({
          menuId: c.menuItem.id,
          quantity: c.quantity,
          note: c.note,
        })),
      });

      setSubmittedOrder(createdOrder);
      onOrderCreated(createdOrder);
      onClearCart();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mengirim pesanan ke Firestore.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSuccessAndClose = () => {
    setSubmittedOrder(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px] no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang Belanja dan Checkout"
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-[#F8F7F4] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#C83E2B]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-[#171615]">
              {submittedOrder ? 'Pesanan Berhasil Dibuat' : 'Keranjang Pesanan'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleResetSuccessAndClose}
            aria-label="Tutup keranjang"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5E5A54] hover:bg-[#F0EDE6] hover:text-[#171615] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!isRegisteredCustomer ? (
            <div className="rounded-xl border border-[#C83E2B]/30 bg-white p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#C83E2B]/10 text-[#C83E2B]">
                <Lock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#171615]">
                  Pemesanan Khusus Pelanggan Terdaftar
                </h3>
                <p className="mt-1.5 text-sm text-[#524E48]">
                  Masuk dan lengkapi registrasi akun pelanggan (Nama, No. WhatsApp,
                  Alamat) terlebih dahulu untuk melakukan pemesanan.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenRegistration}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#C83E2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#B23322]"
              >
                Masuk &amp; Lengkapi Registrasi Pelanggan
              </button>
            </div>
          ) : submittedOrder ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#15803D]/30 bg-white p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[#15803D] mt-0.5" />
                  <div>
                    <p className="font-display text-base font-bold text-[#171615]">
                      Pesanan {submittedOrder.orderCode} Tersinkron ke Firebase
                    </p>
                    <p className="mt-1 text-sm text-[#524E48]">
                      Notifikasi pesanan baru telah diteruskan otomatis ke Kasir Admin
                      Warung Babi Ngepet ({ADMIN_WA_DISPLAY}).
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#F0EDE6] pt-3 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#5E5A54]">Layanan</span>
                    <span className="font-medium text-[#171615]">
                      {submittedOrder.deliveryType === 'cod'
                        ? 'COD (Bayar di Tempat)'
                        : 'Delivery Kurir'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5E5A54]">Waktu Antar</span>
                    <span className="font-medium text-[#171615]">
                      {submittedOrder.deliveryTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5E5A54]">Total Tagihan</span>
                    <span className="font-mono font-bold tabular-nums text-[#171615]">
                      {formatRupiah(submittedOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={buildAdminOrderWhatsAppUrl(submittedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#116932]"
                >
                  <span>Kirim Rincian ke WhatsApp Admin ({ADMIN_WA_DISPLAY})</span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const code = submittedOrder.orderCode;
                    setSubmittedOrder(null);
                    onGoToTracking(code);
                  }}
                  className="flex w-full items-center justify-center rounded-xl border border-[#D9D4CC] bg-white px-5 py-3 text-sm font-semibold text-[#171615] transition-colors hover:bg-[#F0EDE6]"
                >
                  Pantau Status Pesanan Real-Time
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-10 text-center space-y-2">
              <p className="font-display text-base font-semibold text-[#171615]">
                Keranjang masih kosong
              </p>
              <p className="text-sm text-[#5E5A54]">
                Pilih babi panggang, sate, atau nasi campur dari katalog menu untuk
                mulai memesan.
              </p>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Item List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-[#5E5A54]">
                    DAFTAR PESANAN ({cart.reduce((a, b) => a + b.quantity, 0)} ITEM)
                  </h3>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#C83E2B] hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Kosongkan</span>
                  </button>
                </div>

                <div className="divide-y divide-[#ECE9E2] rounded-xl border border-[#E5E2DC] bg-white">
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#171615]">
                            {item.menuItem.name}
                          </p>
                          <p className="font-mono text-xs tabular-nums text-[#5E5A54]">
                            {formatRupiah(item.menuItem.price)} / porsi
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] p-1">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.menuItem.id, -1)}
                            aria-label={`Kurangi ${item.menuItem.name}`}
                            className="flex h-6 w-6 items-center justify-center rounded bg-white text-[#171615] hover:bg-[#ECE8E0]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[1.25rem] text-center font-mono text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.menuItem.id, 1)}
                            aria-label={`Tambah ${item.menuItem.name}`}
                            className="flex h-6 w-6 items-center justify-center rounded bg-[#C83E2B] text-white hover:bg-[#B23322]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) =>
                          onUpdateItemNote(item.menuItem.id, e.target.value)
                        }
                        placeholder="Catatan item (mis. sambal dipisah, kulit ekstra garing)"
                        className="w-full rounded-md border border-[#E5E2DC] bg-[#F8F7F4] px-2.5 py-1.5 text-xs text-[#171615] placeholder:text-[#8A837A] focus:border-[#C83E2B] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery & Time Options */}
              <div className="space-y-4 rounded-xl border border-[#E5E2DC] bg-white p-4">
                <div>
                  <label className="block text-xs font-semibold text-[#171615] mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-[#C83E2B]" />
                      Metode Pengantaran
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeliveryTypeChange('delivery')}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                        deliveryType === 'delivery'
                          ? 'border-[#C83E2B] bg-[#C83E2B]/8 text-[#171615] font-semibold'
                          : 'border-[#DCD7CE] bg-[#F8F7F4] text-[#5E5A54]'
                      }`}
                    >
                      Delivery Kurir
                      <span className="block text-[11px] font-normal text-[#6B655E]">
                        Transfer / QRIS
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeliveryTypeChange('cod')}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                        deliveryType === 'cod'
                          ? 'border-[#C83E2B] bg-[#C83E2B]/8 text-[#171615] font-semibold'
                          : 'border-[#DCD7CE] bg-[#F8F7F4] text-[#5E5A54]'
                      }`}
                    >
                      COD (Bayar di Tempat)
                      <span className="block text-[11px] font-normal text-[#6B655E]">
                        Tunai saat pesanan tiba
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="delivery-time"
                    className="block text-xs font-semibold text-[#171615] mb-1.5"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#C83E2B]" />
                      Pilihan Waktu Pengantaran
                    </span>
                  </label>
                  <select
                    id="delivery-time"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3 py-2.5 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  >
                    {DELIVERY_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171615] mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(deliveryType === 'cod'
                      ? (['cod', 'qris', 'transfer'] as PaymentMethod[])
                      : (['transfer', 'qris', 'cod'] as PaymentMethod[])
                    ).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                          paymentMethod === m
                            ? 'border-[#171615] bg-[#171615] text-white'
                            : 'border-[#DCD7CE] bg-[#F8F7F4] text-[#5E5A54]'
                        }`}
                      >
                        {m === 'cod' ? 'COD Tunai' : m === 'qris' ? 'QRIS' : 'Transfer'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-3 rounded-xl border border-[#E5E2DC] bg-white p-4">
                <h3 className="text-xs font-semibold tracking-wide text-[#5E5A54]">
                  DATA PENERIMA &amp; WHATSAPP
                </h3>

                <div>
                  <label
                    htmlFor="cust-name"
                    className="block text-xs font-medium text-[#171615] mb-1"
                  >
                    Nama Pelanggan
                  </label>
                  <input
                    id="cust-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Made Wirawan"
                    className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3 py-2 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cust-phone"
                    className="block text-xs font-medium text-[#171615] mb-1"
                  >
                    Nomor WhatsApp (Untuk Kwitansi &amp; Konfirmasi)
                  </label>
                  <input
                    id="cust-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3 py-2 text-sm font-mono text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cust-address"
                    className="block text-xs font-medium text-[#171615] mb-1"
                  >
                    Alamat Pengantaran Lengkap
                  </label>
                  <textarea
                    id="cust-address"
                    rows={2}
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Jalan, nomor rumah, patokan terdekat..."
                    className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3 py-2 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cust-notes"
                    className="block text-xs font-medium text-[#171615] mb-1"
                  >
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    id="cust-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mis. titip di pos satpam / minta kembalian"
                    className="w-full rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3 py-2 text-sm text-[#171615] focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 px-3 py-2 text-xs font-medium text-[#DC2626]">
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Sticky Checkout Footer */}
        {isRegisteredCustomer && !submittedOrder && cart.length > 0 && (
          <div className="border-t border-[#E5E2DC] bg-white p-5 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-[#5E5A54]">
                <span>Subtotal Menu</span>
                <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5E5A54]">
                <span>Ongkos Kirim {subtotal >= 150000 ? '(Gratis ≥ Rp 150rb)' : ''}</span>
                <span className="font-mono tabular-nums">
                  {deliveryFee === 0 ? 'Gratis' : formatRupiah(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#F0EDE6] pt-2 text-base font-bold text-[#171615]">
                <span>Total Tagihan</span>
                <span className="font-mono tabular-nums text-[#C83E2B]">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C83E2B] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#B23322] disabled:opacity-60"
            >
              {submitting
                ? 'Menyimpan ke Firebase...'
                : 'Pesan & Notifikasi WhatsApp Admin'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
