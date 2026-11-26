import express, { type Request, type Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import type { Order } from './src/types.ts';

dotenv.config();

const PORT = 3000;
const ADMIN_WA_INTL = process.env.ADMIN_WHATSAPP || '6287716443331';

function formatRpServer(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildServerWhatsAppText(order: Order): string {
  const itemsText = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} x${item.quantity} = ${formatRpServer(item.subtotal)}${
          item.note ? ` (${item.note})` : ''
        }`,
    )
    .join('\n');

  return [
    `*NOTIFIKASI PESANAN BARU - WARUNG BABI NGEPET*`,
    `Kode: *${order.orderCode}*`,
    `Pelanggan: ${order.customerName} (${order.customerPhone})`,
    `Alamat: ${order.customerAddress}`,
    `Layanan: ${order.deliveryType === 'cod' ? 'COD (Bayar di Tempat)' : 'Delivery Kurir'}`,
    `Waktu Antar: ${order.deliveryTime}`,
    `Pembayaran: ${order.paymentMethod.toUpperCase()}`,
    ``,
    itemsText,
    ``,
    `Total: *${formatRpServer(order.total)}*`,
    order.notes ? `Catatan: ${order.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Optional WhatsApp Gateway Relay (Fonnte / Wablas / Meta Cloud API)
  app.post('/api/whatsapp-notify', async (req: Request, res: Response) => {
    const { order } = req.body as { order?: Order };
    if (!order || !order.orderCode || !Array.isArray(order.items)) {
      res.status(400).json({ error: 'Payload pesanan tidak valid.' });
      return;
    }

    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL?.trim();
    const gatewayToken = process.env.WHATSAPP_GATEWAY_TOKEN?.trim();

    if (!gatewayUrl) {
      res.json({ channel: 'whatsapp_deeplink', deliveryState: 'siap_kirim' });
      return;
    }

    try {
      const parsed = new URL(gatewayUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        res.json({ channel: 'whatsapp_deeplink', deliveryState: 'siap_kirim' });
        return;
      }
      const messageText = buildServerWhatsAppText(order);
      const response = await fetch(parsed.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayToken ? { Authorization: gatewayToken } : {}),
        },
        body: JSON.stringify({
          target: ADMIN_WA_INTL,
          message: messageText,
          orderCode: order.orderCode,
        }),
      });
      res.json({
        channel: 'whatsapp_gateway',
        deliveryState: response.ok ? 'terkirim' : 'gagal',
      });
    } catch {
      res.json({ channel: 'whatsapp_gateway', deliveryState: 'gagal' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Warung Babi Ngepet server running at http://localhost:${PORT}`);
  });
}

startServer();
