import type { DeliveryType, Order, OrderStatus, PaymentMethod } from '../types';

export const ADMIN_WA_DISPLAY = '087716443331';
export const ADMIN_WA_INTL = '6287716443331';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatTimeOnly(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith('62')) {
    return digits;
  }
  return `62${digits}`;
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'menunggu':
      return 'Menunggu Konfirmasi';
    case 'dimasak':
      return 'Sedang Dimasak';
    case 'diantar':
      return 'Dalam Pengantaran';
    case 'selesai':
      return 'Selesai';
    case 'dibatalkan':
      return 'Dibatalkan';
  }
}

export function getDeliveryLabel(type: DeliveryType): string {
  return type === 'cod' ? 'COD (Bayar di Tempat)' : 'Delivery Kurir Warung';
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cod':
      return 'COD (Tunai saat Terima)';
    case 'transfer':
      return 'Transfer Bank';
    case 'qris':
      return 'QRIS';
    case 'tunai':
      return 'Tunai di Kasir';
  }
}

export function buildAdminOrderWhatsAppMessage(order: Order): string {
  const lines = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} x${item.quantity} = ${formatRupiah(item.subtotal)}${
          item.note ? ` (Catatan: ${item.note})` : ''
        }`,
    )
    .join('\n');

  return [
    `*PESANAN BARU - WARUNG BABI NGEPET*`,
    `Kode Pesanan: *${order.orderCode}*`,
    `Waktu Order: ${formatDateTime(order.createdAt)}`,
    ``,
    `*Data Pelanggan:*`,
    `Nama: ${order.customerName}`,
    `No. WhatsApp: ${order.customerPhone}`,
    `Alamat: ${order.customerAddress}`,
    ``,
    `*Pengantaran & Pembayaran:*`,
    `Layanan: ${getDeliveryLabel(order.deliveryType)}`,
    `Waktu Antar: ${order.deliveryTime}`,
    `Metode Bayar: ${getPaymentMethodLabel(order.paymentMethod)}`,
    ``,
    `*Rincian Pesanan:*`,
    lines,
    ``,
    `Subtotal: ${formatRupiah(order.subtotal)}`,
    `Ongkos Kirim: ${order.deliveryFee === 0 ? 'Gratis' : formatRupiah(order.deliveryFee)}`,
    `*TOTAL TAGIHAN: ${formatRupiah(order.total)}*`,
    order.notes ? `\nCatatan Tambahan: ${order.notes}` : '',
    ``,
    `Mohon konfirmasi & proses pesanan ini ya Admin. Terima kasih!`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildAdminOrderWhatsAppUrl(order: Order): string {
  const text = buildAdminOrderWhatsAppMessage(order);
  return `https://wa.me/${ADMIN_WA_INTL}?text=${encodeURIComponent(text)}`;
}

export function buildCustomerReceiptWhatsAppMessage(order: Order): string {
  const lines = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.quantity}x) — ${formatRupiah(item.subtotal)}`,
    )
    .join('\n');

  return [
    `*KWITANSI RESMI - WARUNG BABI NGEPET*`,
    `No. Kwitansi: *${order.receiptNumber || `KW-${order.orderCode}`}*`,
    `Kode Pesanan: ${order.orderCode}`,
    `Status Pembayaran: *LUNAS*`,
    `Tanggal Lunas: ${formatDateTime(order.paidAt || order.updatedAt)}`,
    ``,
    `Kepada: *${order.customerName}* (${order.customerPhone})`,
    `Layanan: ${getDeliveryLabel(order.deliveryType)} · ${order.deliveryTime}`,
    `Metode Bayar: ${getPaymentMethodLabel(order.paymentMethod)}`,
    ``,
    `*Rincian Item:*`,
    lines,
    ``,
    `Subtotal: ${formatRupiah(order.subtotal)}`,
    `Ongkos Kirim: ${order.deliveryFee === 0 ? 'Gratis' : formatRupiah(order.deliveryFee)}`,
    `*TOTAL DIBAYAR: ${formatRupiah(order.total)}*`,
    ``,
    `Terima kasih sudah memesan di Warung Babi Ngepet!`,
    `Untuk pesan ulang kapan saja, simpan nomor kami: ${ADMIN_WA_DISPLAY}`,
  ].join('\n');
}

export function buildCustomerReceiptWhatsAppUrl(order: Order): string {
  const normalized = normalizeWhatsAppPhone(order.customerPhone);
  const text = buildCustomerReceiptWhatsAppMessage(order);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function playAdminAlertChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [587.33, 880, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.11);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + i * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.11 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.11);
      osc.stop(ctx.currentTime + i * 0.11 + 0.26);
    });
  } catch {
    // Ignore audio context blocks when browser hasn't received user gesture yet
  }
}
