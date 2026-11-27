import React from 'react';
import { ExternalLink, Printer, X } from 'lucide-react';
import type { Order } from '../types';
import {
  ADMIN_WA_DISPLAY,
  buildCustomerReceiptWhatsAppUrl,
  formatDateTime,
  formatRupiah,
  getDeliveryLabel,
  getPaymentMethodLabel,
} from '../utils/format';
import { BrandLogo } from './BrandLogo';

interface KwitansiModalProps {
  order: Order | null;
  onClose: () => void;
}

export const KwitansiModal: React.FC<KwitansiModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const receiptNo = order.receiptNumber || `KW-${order.orderCode}`;
  const waCustomerUrl = buildCustomerReceiptWhatsAppUrl(order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Kwitansi Pembayaran"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-2xl">
        {/* Modal Actions Header */}
        <div className="flex items-center justify-between border-b border-[#E5E2DC] px-5 py-3.5 no-print">
          <h2 className="font-display text-base font-bold text-[#171615]">
            Kwitansi Pembayaran Resmi
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kwitansi"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5E5A54] hover:bg-[#F0EDE6] hover:text-[#171615]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Kwitansi Body */}
        <div id="kwitansi-printable" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white">
          {/* Header with Logo & Lunas Stamp */}
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E2DC] pb-5">
            <div className="flex items-center gap-3">
              <BrandLogo size={48} />
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight text-[#171615]">
                  Warung Babi Ngepet
                </h3>
                <p className="text-xs text-[#5E5A54]">
                  Kuliner Babi Kecap &amp; Babi Rica Khas Nusantara
                </p>
                <p className="font-mono text-xs text-[#5E5A54]">
                  WhatsApp Resmi: {ADMIN_WA_DISPLAY}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block rounded-md border-2 border-[#15803D] px-3 py-1 text-xs font-bold tracking-widest text-[#15803D]">
                LUNAS
              </div>
              <p className="mt-1.5 font-mono text-xs font-semibold text-[#171615]">
                {receiptNo}
              </p>
            </div>
          </div>

          {/* Customer & Order Meta */}
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#F8F7F4] p-4 sm:grid-cols-2 text-xs">
            <div className="space-y-1">
              <p className="text-[#6B655E]">Diterima Dari</p>
              <p className="text-sm font-semibold text-[#171615]">
                {order.customerName}
              </p>
              <p className="font-mono text-[#524E48]">{order.customerPhone}</p>
              <p className="text-[#524E48]">{order.customerAddress}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-[#6B655E]">Detail Transaksi</p>
              <p className="font-mono font-medium text-[#171615]">
                Order: {order.orderCode}
              </p>
              <p className="text-[#524E48]">
                Lunas: {formatDateTime(order.paidAt || order.updatedAt)}
              </p>
              <p className="text-[#524E48]">
                {getDeliveryLabel(order.deliveryType)} · {order.deliveryDate ? `${order.deliveryDate} — ` : ''}{order.deliveryTime}
              </p>
              <p className="font-medium text-[#171615]">
                Bayar: {getPaymentMethodLabel(order.paymentMethod)}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E2DC] text-xs font-semibold text-[#5E5A54]">
                  <th className="py-2 pr-3">Menu</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Harga</th>
                  <th className="py-2 pl-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6]">
                {order.items.map((item, idx) => (
                  <tr key={`${item.menuId}-${idx}`}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-[#171615]">{item.name}</p>
                      {item.note && (
                        <p className="text-xs text-[#6B655E]">Catatan: {item.note}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#524E48]">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[#524E48]">
                      {formatRupiah(item.price)}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono font-medium tabular-nums text-[#171615]">
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-[#E5E2DC] pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-[#5E5A54]">
              <span>Subtotal Menu</span>
              <span className="font-mono tabular-nums">
                {formatRupiah(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-[#5E5A54]">
              <span>Ongkos Kirim</span>
              <span className="font-mono tabular-nums">
                {order.deliveryFee === 0 ? 'Gratis' : formatRupiah(order.deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#ECE9E2] pt-2.5 text-base font-bold text-[#171615]">
              <span>Total Pembayaran Lunas</span>
              <span className="font-mono tabular-nums text-[#15803D]">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>

          <p className="border-t border-dashed border-[#DCD7CE] pt-4 text-center text-xs text-[#6B655E]">
            Terima kasih telah menikmati hidangan Warung Babi Ngepet. Simpan kwitansi
            digital ini sebagai bukti pembayaran yang sah.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2.5 border-t border-[#E5E2DC] bg-[#F8F7F4] p-4 sm:flex-row no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#D9D4CC] bg-white px-4 py-2.5 text-sm font-semibold text-[#171615] transition-colors hover:bg-[#ECE8E0]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <a
            href={waCustomerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#116932]"
          >
            <span>Kirim Kwitansi ke WA Pelanggan</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
