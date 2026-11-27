import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  FileText,
  Search,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { Order, OrderStatus, UserProfile } from '../types';
import {
  ADMIN_WA_DISPLAY,
  buildAdminOrderWhatsAppUrl,
  formatDateTime,
  formatRupiah,
  getDeliveryLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from '../utils/format';

interface OrderTrackingViewProps {
  orders: Order[];
  currentUser: UserProfile | null;
  initialSearchCode?: string;
  firestoreConnected: boolean;
  onOpenReceipt: (order: Order) => void;
  onGoToMenu: () => void;
  onOpenAuth: () => void;
}

const STEPS: Array<{
  key: OrderStatus;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    key: 'menunggu',
    label: 'Menunggu Konfirmasi',
    description: 'Pesanan masuk ke kasir & WhatsApp admin.',
    icon: Clock,
  },
  {
    key: 'dimasak',
    label: 'Sedang Dimasak',
    description: 'Dapur sedang menyiapkan hidangan segar Anda.',
    icon: ChefHat,
  },
  {
    key: 'diantar',
    label: 'Dalam Pengantaran',
    description: 'Kurir Warung Babi Ngepet menuju alamat Anda.',
    icon: Truck,
  },
  {
    key: 'selesai',
    label: 'Selesai',
    description: 'Pesanan telah diterima pelanggan.',
    icon: CheckCircle2,
  },
];

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  orders,
  currentUser,
  initialSearchCode = '',
  firestoreConnected,
  onOpenReceipt,
  onGoToMenu,
  onOpenAuth,
}) => {
  const [query, setQuery] = useState(initialSearchCode);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  useEffect(() => {
    if (initialSearchCode) {
      setQuery(initialSearchCode);
    }
  }, [initialSearchCode]);

  const matchedOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderCode.toLowerCase().includes(q) ||
        o.customerPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        o.customerName.toLowerCase().includes(q),
    );
  }, [orders, query]);

  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = matchedOrders.find((o) => o.id === selectedOrderId);
      if (found) return found;
    }
    return matchedOrders[0] || null;
  }, [matchedOrders, selectedOrderId]);

  const currentStepIdx = activeOrder
    ? STEPS.findIndex((s) => s.key === activeOrder.status)
    : -1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#5E5A54]">
            Firestore Real-Time Sync ·{' '}
            {firestoreConnected ? 'Terhubung Langsung' : 'Menunggu Login'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#171615] sm:text-3xl">
            Lacak Status Pesanan
          </h1>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A746C]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedOrderId('');
            }}
            placeholder="Filter kode (BN-...) atau nama"
            aria-label="Filter kode pesanan"
            className="w-full rounded-lg border border-[#DCD7CE] bg-white py-2.5 pl-9 pr-3 text-sm text-[#171615] placeholder:text-[#8A837A] focus:border-[#C83E2B] focus:outline-none"
          />
        </div>
      </div>

      {!currentUser && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#E5E2DC] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#171615]">
              Masuk untuk Memantau Pesanan Anda Secara Real-Time
            </p>
            <p className="mt-0.5 text-xs text-[#5E5A54]">
              Setiap perubahan status dari dapur Warung Babi Ngepet akan tersinkron
              otomatis melalui Firebase Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 rounded-lg bg-[#171615] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2E2B29] whitespace-nowrap shrink-0"
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Masuk dengan Google</span>
          </button>
        </div>
      )}

      {/* Quick Order Selector */}
      {matchedOrders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {matchedOrders.slice(0, 6).map((ord) => {
            const isSelected = activeOrder?.id === ord.id;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => setSelectedOrderId(ord.id)}
                className={`rounded-lg border px-3.5 py-2 text-left text-xs transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'border-[#171615] bg-[#171615] text-white'
                    : 'border-[#E5E2DC] bg-white text-[#171615] hover:bg-[#F0EDE6]'
                }`}
              >
                <span className="font-mono font-semibold">{ord.orderCode}</span>
                <span className="mx-1.5 opacity-60">·</span>
                <span>{ord.customerName}</span>
              </button>
            );
          })}
        </div>
      )}

      {!activeOrder ? (
        <div className="rounded-2xl border border-[#E5E2DC] bg-white p-10 text-center space-y-4">
          <p className="font-display text-lg font-semibold text-[#171615]">
            {currentUser
              ? 'Belum ada pesanan aktif untuk dilacak'
              : 'Belum ada pesanan yang ditampilkan'}
          </p>
          <p className="text-sm text-[#5E5A54]">
            Buat pesanan dari katalog menu untuk memantau status pemasakan dan
            pengantaran secara langsung.
          </p>
          <button
            type="button"
            onClick={onGoToMenu}
            className="inline-flex items-center justify-center rounded-lg bg-[#C83E2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B23322]"
          >
            Kembali ke Menu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Status Timeline Column */}
          <div className="lg:col-span-7 rounded-2xl border border-[#E5E2DC] bg-white p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F0EDE6] pb-4">
              <div>
                <p className="font-mono text-xs text-[#6B655E]">
                  {activeOrder.orderCode} · Diperbarui{' '}
                  {formatDateTime(activeOrder.updatedAt)}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-[#171615]">
                  {getOrderStatusLabel(activeOrder.status)}
                </h2>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#6B655E]">Status Pembayaran</p>
                <p
                  className={`mt-0.5 text-sm font-bold ${
                    activeOrder.paymentStatus === 'lunas'
                      ? 'text-[#15803D]'
                      : 'text-[#B45309]'
                  }`}
                >
                  {activeOrder.paymentStatus === 'lunas'
                    ? 'LUNAS'
                    : 'Belum Dibayar'}
                </p>
              </div>
            </div>

            {activeOrder.status === 'dibatalkan' ? (
              <div className="flex items-start gap-3 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/8 p-4">
                <XCircle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#DC2626]">
                    Pesanan Dibatalkan
                  </p>
                  <p className="mt-0.5 text-xs text-[#524E48]">
                    Silakan hubungi admin Warung Babi Ngepet ({ADMIN_WA_DISPLAY}) untuk
                    informasi lebih lanjut.
                  </p>
                </div>
              </div>
            ) : (
              <ol className="space-y-5">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const completed = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <li key={step.key} className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                          isCurrent
                            ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                            : completed
                            ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D]'
                            : 'border-[#E5E2DC] bg-[#F8F7F4] text-[#9A938A]'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="pt-0.5">
                        <p
                          className={`text-sm font-semibold ${
                            completed ? 'text-[#171615]' : 'text-[#8A837A]'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-[#6B655E] mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex flex-wrap gap-3 border-t border-[#F0EDE6] pt-4">
              <a
                href={buildAdminOrderWhatsAppUrl(activeOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-4 py-2.5 text-xs font-semibold text-[#171615] hover:bg-[#ECE8E0] transition-colors"
              >
                <span>Hubungi Admin WA ({ADMIN_WA_DISPLAY})</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>

              {activeOrder.paymentStatus === 'lunas' && (
                <button
                  type="button"
                  onClick={() => onOpenReceipt(activeOrder)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#116932] transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lihat &amp; Cetak Kwitansi</span>
                </button>
              )}
            </div>
          </div>

          {/* Order Detail Summary Column */}
          <div className="lg:col-span-5 rounded-2xl border border-[#E5E2DC] bg-white p-6 space-y-5 h-fit">
            <h3 className="font-display text-base font-bold text-[#171615]">
              Rincian Pengantaran &amp; Menu
            </h3>

            <div className="space-y-2 text-xs text-[#524E48] border-b border-[#F0EDE6] pb-4">
              <div className="flex justify-between gap-4">
                <span className="text-[#6B655E]">Pemesan</span>
                <span className="font-semibold text-[#171615] text-right">
                  {activeOrder.customerName} ({activeOrder.customerPhone})
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#6B655E]">Layanan</span>
                <span className="font-medium text-[#171615] text-right">
                  {getDeliveryLabel(activeOrder.deliveryType)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#6B655E]">Hari &amp; Waktu Antar</span>
                <span className="font-medium text-[#171615] text-right">
                  {activeOrder.deliveryDate ? `${activeOrder.deliveryDate} — ${activeOrder.deliveryTime}` : activeOrder.deliveryTime}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#6B655E]">Metode Bayar</span>
                <span className="font-medium text-[#171615] text-right">
                  {getPaymentMethodLabel(activeOrder.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#6B655E]">Alamat</span>
                <span className="text-right max-w-[65%]">
                  {activeOrder.customerAddress}
                </span>
              </div>
            </div>

            <ul className="divide-y divide-[#F0EDE6] text-sm">
              {activeOrder.items.map((item, idx) => (
                <li
                  key={`${item.menuId}-${idx}`}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="font-medium text-[#171615]">
                      {item.name} × {item.quantity}
                    </p>
                    {item.note && (
                      <p className="text-xs text-[#6B655E]">Catatan: {item.note}</p>
                    )}
                  </div>
                  <span className="font-mono text-xs font-medium tabular-nums text-[#171615]">
                    {formatRupiah(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-[#E5E2DC] pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-xs text-[#5E5A54]">
                <span>Ongkos Kirim</span>
                <span className="font-mono tabular-nums">
                  {activeOrder.deliveryFee === 0
                    ? 'Gratis'
                    : formatRupiah(activeOrder.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[#171615]">
                <span>Total</span>
                <span className="font-mono tabular-nums text-[#C83E2B]">
                  {formatRupiah(activeOrder.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
