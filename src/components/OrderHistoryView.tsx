import React, { useMemo, useState } from 'react';
import { FileText, RotateCcw, Search, UserCheck } from 'lucide-react';
import type { Order, UserProfile } from '../types';
import {
  formatDateTime,
  formatRupiah,
  getDeliveryLabel,
  getOrderStatusLabel,
} from '../utils/format';

interface OrderHistoryViewProps {
  orders: Order[];
  currentUser: UserProfile | null;
  onRepeatOrder: (order: Order) => void;
  onTrackOrder: (orderCode: string) => void;
  onOpenReceipt: (order: Order) => void;
  onGoToMenu: () => void;
  onOpenAuth: () => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  orders,
  currentUser,
  onRepeatOrder,
  onTrackOrder,
  onOpenReceipt,
  onGoToMenu,
  onOpenAuth,
}) => {
  const [phoneFilter, setPhoneFilter] = useState('');

  const filteredOrders = useMemo(() => {
    const q = phoneFilter.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.customerPhone.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.orderCode.toLowerCase().includes(q),
    );
  }, [orders, phoneFilter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#5E5A54]">
            Tersinkronisasi Firebase · Repeat Order 1 Klik
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#171615] sm:text-3xl">
            Histori Pesanan
          </h1>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A746C]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            placeholder="Filter kode / nama..."
            aria-label="Filter histori pesanan"
            className="w-full rounded-lg border border-[#DCD7CE] bg-white py-2 pl-9 pr-3 text-sm text-[#171615] placeholder:text-[#8A837A] focus:border-[#C83E2B] focus:outline-none"
          />
        </div>
      </div>

      {!currentUser && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#E5E2DC] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#171615]">
              Masuk dengan Google untuk Sinkronisasi Histori Pesanan
            </p>
            <p className="mt-0.5 text-xs text-[#5E5A54]">
              Pelanggan yang masuk dapat melihat seluruh riwayat pesanan dari
              Firestore dan melakukan Repeat Order kapan saja.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 rounded-lg bg-[#171615] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2E2B29] whitespace-nowrap shrink-0"
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Masuk / Daftar Pelanggan</span>
          </button>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E2DC] bg-white p-10 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-[#171615]">
            Belum ada histori pesanan
          </p>
          <p className="text-sm text-[#5E5A54]">
            Pesanan yang Anda buat akan tersimpan otomatis di Firebase Firestore agar
            mudah dipesan ulang kapan saja.
          </p>
          <button
            type="button"
            onClick={onGoToMenu}
            className="inline-flex items-center justify-center rounded-lg bg-[#C83E2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B23322]"
          >
            Mulai Pesan Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-[#E5E2DC] bg-white p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0EDE6] pb-3.5">
                <div>
                  <p className="font-mono text-xs text-[#6B655E]">
                    {order.orderCode} · {formatDateTime(order.createdAt)} ·{' '}
                    {getDeliveryLabel(order.deliveryType)}
                  </p>
                  <h2 className="mt-1 font-display text-base font-bold text-[#171615]">
                    {order.customerName} ({order.customerPhone})
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-[#171615]">
                    {getOrderStatusLabel(order.status)}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      order.paymentStatus === 'lunas'
                        ? 'text-[#15803D]'
                        : 'text-[#8A837A]'
                    }`}
                  >
                    {order.paymentStatus === 'lunas' ? 'Pembayaran Lunas' : 'Belum Bayar'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-sm text-[#524E48]">
                {order.items.map((item, idx) => (
                  <div key={`${item.menuId}-${idx}`} className="flex justify-between gap-3">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-[#171615]">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EDE6] pt-4">
                <div>
                  <span className="text-xs text-[#6B655E]">Total Pesanan: </span>
                  <span className="font-mono text-base font-bold tabular-nums text-[#171615]">
                    {formatRupiah(order.total)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onTrackOrder(order.orderCode)}
                    className="rounded-lg border border-[#DCD7CE] bg-[#F8F7F4] px-3.5 py-2 text-xs font-semibold text-[#171615] hover:bg-[#ECE8E0] transition-colors"
                  >
                    Pantau Status
                  </button>

                  {order.paymentStatus === 'lunas' && (
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(order)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#15803D]/40 bg-[#15803D]/8 px-3.5 py-2 text-xs font-semibold text-[#15803D] hover:bg-[#15803D]/15 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Kwitansi</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onRepeatOrder(order)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#C83E2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B23322] transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Pesan Lagi</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
