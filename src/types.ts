export type MenuCategory =
  | 'Lauk Satuan'
  | 'Paket Nasi'
  | 'Menu Kiloan'
  | 'Minuman & Tambahan';

export const MENU_CATEGORIES: MenuCategory[] = [
  'Lauk Satuan',
  'Paket Nasi',
  'Menu Kiloan',
  'Minuman & Tambahan',
];

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
  portionInfo: string;
  imageUrl: string;
  available: boolean;
  featured?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}

export type DeliveryType = 'delivery' | 'cod';

export type PaymentMethod = 'cod' | 'transfer' | 'qris' | 'tunai';

export type OrderStatus =
  | 'menunggu'
  | 'dimasak'
  | 'diantar'
  | 'selesai'
  | 'dibatalkan';

export type PaymentStatus = 'belum_bayar' | 'lunas';

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  orderCode: string;
  receiptNumber?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryType: DeliveryType;
  deliveryTime: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  source: 'whatsapp_web' | 'kasir_pos';
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface AdminNotificationLog {
  id: string;
  orderId: string;
  orderCode: string;
  userId: string;
  adminPhone: string;
  channel: 'whatsapp_gateway' | 'whatsapp_deeplink';
  deliveryState: 'terkirim' | 'siap_kirim' | 'gagal';
  messagePreview: string;
  waUrl: string;
  createdAt: string;
}

export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  role: UserRole;
  profileComplete: boolean;
}

export type AppView = 'menu' | 'track' | 'history' | 'admin' | 'auth';
