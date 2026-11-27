import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  LogOut,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Utensils,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { MENU_IMAGE_PRESETS } from '../data/initialMenu';
import {
  MENU_CATEGORIES,
  type AdminNotificationLog,
  type DeliveryType,
  type MenuCategory,
  type MenuItem,
  type Order,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type UserProfile,
} from '../types';
import {
  ADMIN_WA_DISPLAY,
  buildCustomerReceiptWhatsAppUrl,
  formatDateTime,
  formatRupiah,
  getDeliveryLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getWibDeliveryDateOptions,
  DELIVERY_SLOTS_WIB,
} from '../utils/format';
import { BrandLogo } from './BrandLogo';

interface AdminKasirViewProps {
  adminUser: UserProfile;
  menu: MenuItem[];
  orders: Order[];
  notifications: AdminNotificationLog[];
  users: UserProfile[];
  firestoreConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onUpdateOrder: (
    orderId: string,
    patch: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
    },
  ) => Promise<void>;
  onToggleMenuAvailability: (menuId: string, available: boolean) => Promise<void>;
  onUpdateMenuPrice: (menuId: string, price: number) => Promise<void>;
  onSaveMenuItem: (item: MenuItem, isNew: boolean) => Promise<void>;
  onDeleteMenuItem: (menuId: string) => Promise<void>;
  onSyncDefaultMenu: () => Promise<void>;
  onCreatePosOrder: (payload: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryType: DeliveryType;
    deliveryDate: string;
    deliveryTime: string;
    paymentMethod: PaymentMethod;
    markPaid: boolean;
    items: Array<{ menuId: string; quantity: number }>;
  }) => Promise<Order>;
  onOpenReceipt: (order: Order) => void;
  onLogout: () => Promise<void>;
}

type AdminSection = 'orders' | 'notifications' | 'menu' | 'users' | 'receipts';

const SECTION_TITLES: Record<AdminSection, string> = {
  orders: 'Antrean & Kasir POS',
  notifications: 'Notifikasi WhatsApp Admin',
  menu: 'Kelola & Edit Menu',
  users: 'Daftar Pelanggan Terdaftar',
  receipts: 'Laporan & Kwitansi Lunas',
};

export const AdminKasirView: React.FC<AdminKasirViewProps> = ({
  adminUser,
  menu,
  orders,
  notifications,
  users,
  firestoreConnected,
  soundEnabled,
  onToggleSound,
  onUpdateOrder,
  onToggleMenuAvailability,
  onUpdateMenuPrice,
  onSaveMenuItem,
  onDeleteMenuItem,
  onSyncDefaultMenu,
  onCreatePosOrder,
  onOpenReceipt,
  onLogout,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('orders');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPosModal, setShowPosModal] = useState(false);

  // Price editing state per menu ID
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  // Full menu editor modal state
  const [menuEditorOpen, setMenuEditorOpen] = useState(false);
  const [editingMenuIsNew, setEditingMenuIsNew] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState('');
  const [menuFormName, setMenuFormName] = useState('');
  const [menuFormCategory, setMenuFormCategory] = useState<MenuCategory>('Lauk Satuan');
  const [menuFormPrice, setMenuFormPrice] = useState('25000');
  const [menuFormPortion, setMenuFormPortion] = useState('1 Porsi Lauk');
  const [menuFormDescription, setMenuFormDescription] = useState('');
  const [menuFormImageUrl, setMenuFormImageUrl] = useState(MENU_IMAGE_PRESETS[0].url);
  const [menuFormAvailable, setMenuFormAvailable] = useState(true);
  const [menuFormFeatured, setMenuFormFeatured] = useState(false);
  const [menuFormError, setMenuFormError] = useState('');
  const [savingMenuForm, setSavingMenuForm] = useState(false);
  const [confirmDeleteMenuId, setConfirmDeleteMenuId] = useState<string | null>(null);
  const [deletingMenuId, setDeletingMenuId] = useState<string | null>(null);
  const [confirmSyncDefault, setConfirmSyncDefault] = useState(false);
  const [syncingDefault, setSyncingDefault] = useState(false);

  // Manual Kasir POS Form State
  const dateOptions = useMemo(() => getWibDeliveryDateOptions(), []);
  const [posName, setPosName] = useState('');
  const [posPhone, setPosPhone] = useState('');
  const [posAddress, setPosAddress] = useState('Ambil di Warung / Makan di Tempat');
  const [posDeliveryType, setPosDeliveryType] = useState<DeliveryType>('delivery');
  const [posDeliveryDate, setPosDeliveryDate] = useState(dateOptions[0].value);
  const [posDeliveryTime, setPosDeliveryTime] = useState(DELIVERY_SLOTS_WIB[0]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('tunai');
  const [posMarkPaid, setPosMarkPaid] = useState(true);
  const [posQuantities, setPosQuantities] = useState<Record<string, number>>({});
  const [posSubmitting, setPosSubmitting] = useState(false);
  const [posError, setPosError] = useState('');

  const metrics = useMemo(() => {
    const activeQueue = orders.filter(
      (o) => o.status === 'menunggu' || o.status === 'dimasak' || o.status === 'diantar',
    ).length;
    const paidOrders = orders.filter(
      (o) => o.paymentStatus === 'lunas' && o.status !== 'dibatalkan',
    );
    const paidRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      totalOrders: orders.length,
      activeQueue,
      paidCount: paidOrders.length,
      paidRevenue,
      totalNotifs: notifications.length,
    };
  }, [orders, notifications]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch =
        !q ||
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const paidOrdersList = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'lunas'),
    [orders],
  );

  const handleSaveMenuPrice = async (item: MenuItem) => {
    const raw = priceDrafts[item.id];
    const parsed = Number(raw);
    if (!parsed || parsed < 1000) return;
    setSavingPriceId(item.id);
    try {
      await onUpdateMenuPrice(item.id, parsed);
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } finally {
      setSavingPriceId(null);
    }
  };

  const openCreateMenuModal = () => {
    setEditingMenuIsNew(true);
    setEditingMenuId('');
    setMenuFormName('');
    setMenuFormCategory('Lauk Satuan');
    setMenuFormPrice('25000');
    setMenuFormPortion('1 Porsi Lauk');
    setMenuFormDescription('');
    setMenuFormImageUrl(MENU_IMAGE_PRESETS[0].url);
    setMenuFormAvailable(true);
    setMenuFormFeatured(false);
    setMenuFormError('');
    setMenuEditorOpen(true);
  };

  const openEditMenuModal = (item: MenuItem) => {
    setEditingMenuIsNew(false);
    setEditingMenuId(item.id);
    setMenuFormName(item.name);
    setMenuFormCategory(item.category);
    setMenuFormPrice(String(item.price));
    setMenuFormPortion(item.portionInfo);
    setMenuFormDescription(item.description);
    setMenuFormImageUrl(item.imageUrl);
    setMenuFormAvailable(item.available);
    setMenuFormFeatured(Boolean(item.featured));
    setMenuFormError('');
    setMenuEditorOpen(true);
  };

  const handleSubmitMenuForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setMenuFormError('');

    const cleanName = menuFormName.trim();
    if (cleanName.length < 2) {
      setMenuFormError('Nama menu minimal 2 karakter.');
      return;
    }
    const parsedPrice = Number(menuFormPrice);
    if (!parsedPrice || parsedPrice < 1000) {
      setMenuFormError('Harga menu minimal Rp 1.000.');
      return;
    }
    if (!menuFormDescription.trim()) {
      setMenuFormError('Deskripsi menu wajib diisi.');
      return;
    }

    const generatedId = editingMenuIsNew
      ? `bn-${cleanName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`
      : editingMenuId;

    setSavingMenuForm(true);
    try {
      await onSaveMenuItem(
        {
          id: generatedId,
          name: cleanName,
          category: menuFormCategory,
          price: Math.round(parsedPrice),
          portionInfo: menuFormPortion.trim() || '1 Porsi',
          description: menuFormDescription.trim(),
          imageUrl: menuFormImageUrl.trim() || MENU_IMAGE_PRESETS[0].url,
          available: menuFormAvailable,
          featured: menuFormFeatured,
        },
        editingMenuIsNew,
      );
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[generatedId];
        return next;
      });
      setMenuEditorOpen(false);
    } catch (err) {
      setMenuFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan perubahan menu.',
      );
    } finally {
      setSavingMenuForm(false);
    }
  };

  const handleConfirmDeleteMenu = async (menuId: string) => {
    setDeletingMenuId(menuId);
    try {
      await onDeleteMenuItem(menuId);
      setConfirmDeleteMenuId(null);
    } finally {
      setDeletingMenuId(null);
    }
  };

  const handleConfirmSyncDefault = async () => {
    setSyncingDefault(true);
    try {
      await onSyncDefaultMenu();
      setConfirmSyncDefault(false);
      setPriceDrafts({});
    } finally {
      setSyncingDefault(false);
    }
  };

  const handleSubmitPosOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosError('');
    const items = Object.entries(posQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([menuId, quantity]) => ({ menuId, quantity }));

    if (!posName.trim() || !posPhone.trim()) {
      setPosError('Nama pelanggan dan nomor WhatsApp wajib diisi.');
      return;
    }
    if (items.length === 0) {
      setPosError('Pilih minimal 1 item menu.');
      return;
    }

    setPosSubmitting(true);
    try {
      const created = await onCreatePosOrder({
        customerName: posName.trim(),
        customerPhone: posPhone.trim(),
        customerAddress: posAddress.trim() || 'Makan di Tempat',
        deliveryType: posDeliveryType,
        deliveryDate: posDeliveryDate,
        deliveryTime: posDeliveryTime,
        paymentMethod: posPaymentMethod,
        markPaid: posMarkPaid,
        items,
      });
      setShowPosModal(false);
      setPosName('');
      setPosPhone('');
      setPosQuantities({});
      if (created.paymentStatus === 'lunas') {
        onOpenReceipt(created);
      }
    } catch (err) {
      setPosError(err instanceof Error ? err.message : 'Gagal membuat pesanan kasir.');
    } finally {
      setPosSubmitting(false);
    }
  };

  const navItems: Array<{
    id: AdminSection;
    label: string;
    count?: number;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'orders',
      label: 'Antrean & Kasir',
      count: metrics.activeQueue,
      icon: ClipboardList,
    },
    {
      id: 'notifications',
      label: 'Log WA Admin',
      count: metrics.totalNotifs,
      icon: Bell,
    },
    {
      id: 'menu',
      label: 'Menu & Harga',
      count: menu.length,
      icon: Utensils,
    },
    {
      id: 'users',
      label: 'Pelanggan',
      count: users.length,
      icon: Users,
    },
    {
      id: 'receipts',
      label: 'Kwitansi Lunas',
      count: metrics.paidCount,
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F1F5F9] text-[#0F172A]">
      {/* Dedicated Dark-Slate Admin Sidebar */}
      <aside className="w-full lg:w-[260px] shrink-0 bg-[#0F172A] text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 no-print">
        <div>
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandLogo size={34} />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold tracking-tight truncate">
                  Kasir Babi Ngepet
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  Console Operasional
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Keluar
            </button>
          </div>

          <nav
            aria-label="Navigasi Kasir Admin"
            className="flex lg:flex-col gap-1 overflow-x-auto p-3"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center justify-between gap-2.5 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#C83E2B] text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive ? 'text-white/90' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Account Info Footer inside Sidebar */}
        <div className="hidden lg:block border-t border-slate-800 p-4 space-y-3">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-white truncate">{adminUser.name}</p>
            <p className="font-mono text-[11px] text-slate-400 truncate">
              {adminUser.email}
            </p>
            <p className="text-[11px] text-emerald-400">
              WA Admin: {ADMIN_WA_DISPLAY}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Keluar Mode Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Operational Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Bar */}
        <header className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-8 flex flex-wrap items-center justify-between gap-4 no-print">
          <div>
            <p className="text-xs text-slate-500">
              Kasir Warung Babi Ngepet / {SECTION_TITLES[activeSection]} ·{' '}
              <span
                className={
                  firestoreConnected
                    ? 'text-[#16A34A] font-semibold'
                    : 'text-[#D97706]'
                }
              >
                {firestoreConnected ? 'Firestore Real-Time Aktif' : 'Menghubungkan'}
              </span>
            </p>
            <h1 className="font-display text-xl font-bold text-slate-900">
              {SECTION_TITLES[activeSection]}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleSound}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
              <span>{soundEnabled ? 'Alert Suara On' : 'Alert Suara Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPosModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C83E2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B23322] whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Buat Order Kasir</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 space-y-6">
          {/* 4-Column Operational KPI Strip */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Antrean Perlu Diproses</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#C83E2B]">
                {metrics.activeQueue}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Total Semua Order</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {metrics.totalOrders}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Pendapatan Lunas</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#16A34A]">
                {formatRupiah(metrics.paidRevenue)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Notifikasi WA Terkirim</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {metrics.totalNotifs}
              </p>
            </div>
          </div>

          {/* SECTION 1: ANTREAN & KASIR POS */}
          {activeSection === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: 'Semua' },
                      { id: 'menunggu', label: 'Menunggu' },
                      { id: 'dimasak', label: 'Dimasak' },
                      { id: 'diantar', label: 'Diantar' },
                      { id: 'selesai', label: 'Selesai' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        statusFilter === tab.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kode / nama / WA..."
                    aria-label="Cari pesanan"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  Belum ada pesanan pada filter status ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-3.5">
                        <div>
                          <p className="font-mono text-xs text-slate-500">
                            {order.orderCode} · {formatDateTime(order.createdAt)} ·{' '}
                            {getDeliveryLabel(order.deliveryType)} · {order.deliveryDate || 'Hari Ini (WIB)'} ({order.deliveryTime})
                          </p>
                          <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                            {order.customerName}{' '}
                            <span className="font-mono text-sm font-normal text-slate-600">
                              ({order.customerPhone})
                            </span>
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Alamat: {order.customerAddress}
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                            {formatRupiah(order.total)}
                          </p>
                          <p className="text-xs font-semibold text-slate-700">
                            {getOrderStatusLabel(order.status)} ·{' '}
                            <span
                              className={
                                order.paymentStatus === 'lunas'
                                  ? 'text-[#16A34A]'
                                  : 'text-[#D97706]'
                              }
                            >
                              {order.paymentStatus === 'lunas'
                                ? `LUNAS (${getPaymentMethodLabel(order.paymentMethod)})`
                                : `Belum Bayar (${getPaymentMethodLabel(order.paymentMethod)})`}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${item.menuId}-${idx}`}
                            className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-slate-800">
                              {item.name} × {item.quantity}
                              {item.note ? ` (${item.note})` : ''}
                            </span>
                            <span className="font-mono tabular-nums text-slate-600">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="text-xs text-slate-600">
                          Catatan Pelanggan:{' '}
                          <span className="font-medium text-slate-900">{order.notes}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {order.status === 'menunggu' && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrder(order.id, { status: 'dimasak' })}
                              className="rounded-lg bg-[#C83E2B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#B23322]"
                            >
                              Konfirmasi &amp; Masak
                            </button>
                          )}
                          {order.status === 'dimasak' && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrder(order.id, { status: 'diantar' })}
                              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Kirim Kurir / Siap COD
                            </button>
                          )}
                          {order.status === 'diantar' && (
                            <button
                              type="button"
                              onClick={() => onUpdateOrder(order.id, { status: 'selesai' })}
                              className="rounded-lg bg-[#16A34A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#15803D]"
                            >
                              Tandai Pesanan Selesai
                            </button>
                          )}
                          {order.status !== 'selesai' && order.status !== 'dibatalkan' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateOrder(order.id, { status: 'dibatalkan' })
                              }
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-red-50"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {order.paymentStatus !== 'lunas' ? (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateOrder(order.id, { paymentStatus: 'lunas' })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#16A34A] bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-[#15803D] hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Tandai Pembayaran Lunas</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(order)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Buka Kwitansi</span>
                              </button>
                              <a
                                href={buildCustomerReceiptWhatsAppUrl(order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#116932]"
                              >
                                <span>Kirim Kwitansi ke WA Pelanggan</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: LOG WHATSAPP ADMIN */}
          {activeSection === 'notifications' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#C83E2B]" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Log Notifikasi Otomatis ke WhatsApp Admin ({ADMIN_WA_DISPLAY})
                </h2>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Belum ada notifikasi pesanan baru.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-xs text-slate-500">
                          {formatDateTime(notif.createdAt)} · Tujuan: {notif.adminPhone} ·{' '}
                          <span className="font-semibold text-[#16A34A]">
                            {notif.deliveryState === 'terkirim'
                              ? 'Terkirim via Gateway'
                              : notif.deliveryState === 'siap_kirim'
                              ? 'Diteruskan via WhatsApp Admin'
                              : 'Perlu Kirim Manual'}
                          </span>
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {notif.messagePreview}
                        </p>
                      </div>
                      <a
                        href={notif.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                      >
                        <span>Buka Pesan WA</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: DAFTAR PELANGGAN TERDAFTAR */}
          {activeSection === 'users' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Daftar Pelanggan Terdaftar ({users.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pelanggan yang telah mendaftar melalui formulir di aplikasi.
                  </p>
                </div>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">Nama Pelanggan</th>
                    <th className="px-4 py-3">Nomor WhatsApp</th>
                    <th className="px-4 py-3">Alamat Pengantaran</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-5 py-3 text-right">Tanggal Daftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Belum ada pelanggan yang mendaftar.
                      </td>
                    </tr>
                  ) : (
                    users.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {usr.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-700">
                          <a
                            href={`https://wa.me/62${usr.phone.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#15803D] hover:underline"
                          >
                            {usr.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs">
                          {usr.address}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                          {usr.email || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-500">
                          {usr.createdAt ? formatDateTime(usr.createdAt) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SECTION 3: KELOLA & EDIT MENU */}
          {activeSection === 'menu' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Daftar Menu Warung ({menu.length} Item)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tambah menu baru, ubah nama, kategori, deskripsi, foto, harga, atau
                    status stok secara real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {confirmSyncDefault ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-amber-900">
                        Pulihkan 6 menu bawaan?
                      </span>
                      <button
                        type="button"
                        disabled={syncingDefault}
                        onClick={handleConfirmSyncDefault}
                        className="rounded bg-amber-600 px-2.5 py-1 font-semibold text-white hover:bg-amber-700"
                      >
                        {syncingDefault ? 'Memproses...' : 'Ya, Pulihkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSyncDefault(false)}
                        className="rounded border border-amber-300 bg-white px-2.5 py-1 font-medium text-slate-700"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmSyncDefault(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Menu Bawaan</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openCreateMenuModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#C83E2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B23322] whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Tambah Menu Baru</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="px-5 py-3">Menu &amp; Deskripsi</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Harga Cepat (Rp)</th>
                      <th className="px-4 py-3">Status Stok</th>
                      <th className="px-5 py-3 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {menu.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-sm text-slate-500"
                        >
                          Belum ada menu tersimpan. Klik &ldquo;Tambah Menu Baru&rdquo; atau
                          &ldquo;Menu Bawaan&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      menu.map((item) => {
                        const draft = priceDrafts[item.id];
                        const hasDraft =
                          draft !== undefined && Number(draft) !== item.price;
                        const isConfirmingDelete = confirmDeleteMenuId === item.id;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3 min-w-[230px]">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="h-11 w-14 shrink-0 rounded-lg object-cover border border-slate-200 bg-slate-100"
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate max-w-xs">
                                    {item.portionInfo} · {item.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                              {item.category}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1000}
                                  step={500}
                                  value={draft ?? item.price}
                                  onChange={(e) =>
                                    setPriceDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  aria-label={`Harga ${item.name}`}
                                  className="w-28 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                                />
                                {hasDraft && (
                                  <button
                                    type="button"
                                    disabled={savingPriceId === item.id}
                                    onClick={() => handleSaveMenuPrice(item)}
                                    className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                                  >
                                    {savingPriceId === item.id ? '...' : 'Simpan'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`text-xs font-semibold ${
                                  item.available ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                }`}
                              >
                                {item.available ? 'Tersedia' : 'Stok Habis'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              {isConfirmingDelete ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={deletingMenuId === item.id}
                                    onClick={() => handleConfirmDeleteMenu(item.id)}
                                    className="rounded-lg bg-[#DC2626] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                                  >
                                    {deletingMenuId === item.id
                                      ? 'Hapus...'
                                      : 'Konfirmasi Hapus'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteMenuId(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditMenuModal(item)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onToggleMenuAvailability(item.id, !item.available)
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                                  >
                                    {item.available ? 'Set Habis' : 'Set Tersedia'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteMenuId(item.id)}
                                    aria-label={`Hapus ${item.name}`}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-[#DC2626] hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 4: LAPORAN & KWITANSI LUNAS */}
          {activeSection === 'receipts' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">No. Kwitansi</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Tanggal Lunas</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">Aksi Kwitansi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paidOrdersList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Belum ada pesanan berstatus Lunas.
                      </td>
                    </tr>
                  ) : (
                    paidOrdersList.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                          {order.receiptNumber || `KW-${order.orderCode}`}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">
                            {order.customerName}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            {order.customerPhone}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {formatDateTime(order.paidAt || order.updatedAt)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700">
                          {getPaymentMethodLabel(order.paymentMethod)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-[#16A34A]">
                          {formatRupiah(order.total)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(order)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                            >
                              Cetak
                            </button>
                            <a
                              href={buildCustomerReceiptWhatsAppUrl(order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#15803D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#116932]"
                            >
                              Kirim WA
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* MANUAL KASIR POS MODAL */}
      {showPosModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Buat Order Kasir Manual"
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Catat Order Kasir / Chat WhatsApp
              </h2>
              <button
                type="button"
                onClick={() => setShowPosModal(false)}
                aria-label="Tutup form kasir"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitPosOrder}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Pelanggan
                  </label>
                  <input
                    type="text"
                    required
                    value={posName}
                    onChange={(e) => setPosName(e.target.value)}
                    placeholder="Nama pemesan"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={posPhone}
                    onChange={(e) => setPosPhone(e.target.value)}
                    placeholder="08..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat / Keterangan Meja
                </label>
                <input
                  type="text"
                  value={posAddress}
                  onChange={(e) => setPosAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#C83E2B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hari &amp; Tanggal Pengantaran (WIB)
                  </label>
                  <select
                    value={posDeliveryDate}
                    onChange={(e) => setPosDeliveryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
                  >
                    {dateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Waktu Pengantaran (WIB)
                  </label>
                  <select
                    value={posDeliveryTime}
                    onChange={(e) => setPosDeliveryTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                  >
                    {DELIVERY_SLOTS_WIB.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Layanan
                  </label>
                  <select
                    value={posDeliveryType}
                    onChange={(e) =>
                      setPosDeliveryType(e.target.value as DeliveryType)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <option value="delivery">Delivery / Ambil</option>
                    <option value="cod">COD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pembayaran
                  </label>
                  <select
                    value={posPaymentMethod}
                    onChange={(e) =>
                      setPosPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <option value="tunai">Tunai di Kasir</option>
                    <option value="qris">QRIS</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="cod">COD</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-800">Pilih Menu</p>
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50">
                  {menu.map((item) => {
                    const qty = posQuantities[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            {item.name}
                          </p>
                          <p className="font-mono text-[11px] tabular-nums text-slate-500">
                            {formatRupiah(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPosQuantities((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                              }))
                            }
                            className="h-7 w-7 rounded border border-slate-300 bg-white text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-semibold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPosQuantities((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1,
                              }))
                            }
                            className="h-7 w-7 rounded bg-[#C83E2B] text-xs font-bold text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={posMarkPaid}
                  onChange={(e) => setPosMarkPaid(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#16A34A]"
                />
                <span>Langsung tandai Lunas &amp; terbitkan Kwitansi</span>
              </label>

              {posError && (
                <p className="text-xs font-medium text-[#DC2626]">{posError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPosModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={posSubmitting}
                  className="rounded-lg bg-[#C83E2B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B23322]"
                >
                  {posSubmitting ? 'Menyimpan...' : 'Simpan Order Kasir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* FULL MENU EDITOR MODAL (TAMBAH / EDIT MENU) */}
      {menuEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={editingMenuIsNew ? 'Tambah Menu Baru' : 'Edit Detail Menu'}
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingMenuIsNew ? 'Tambah Menu Baru' : 'Edit Detail Menu'}
              </h2>
              <button
                type="button"
                onClick={() => setMenuEditorOpen(false)}
                aria-label="Tutup editor menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitMenuForm}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Menu
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={menuFormName}
                    onChange={(e) => setMenuFormName(e.target.value)}
                    placeholder="Contoh: Babi Kecap Spesial"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={menuFormCategory}
                    onChange={(e) =>
                      setMenuFormCategory(e.target.value as MenuCategory)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                  >
                    {MENU_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    max={50000000}
                    step={500}
                    value={menuFormPrice}
                    onChange={(e) => setMenuFormPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Info Porsi / Catatan Singkat
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={menuFormPortion}
                  onChange={(e) => setMenuFormPortion(e.target.value)}
                  placeholder="Contoh: 1 Porsi + Nasi · Pedas Mantap"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deskripsi Menu
                </label>
                <textarea
                  rows={2}
                  required
                  maxLength={500}
                  value={menuFormDescription}
                  onChange={(e) => setMenuFormDescription(e.target.value)}
                  placeholder="Jelaskan cita rasa dan isi porsi hidangan..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#C83E2B] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Pilih Foto Hidangan atau Masukkan Path Gambar
                </label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {MENU_IMAGE_PRESETS.map((preset) => {
                    const selected = menuFormImageUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setMenuFormImageUrl(preset.url)}
                        title={preset.label}
                        className={`overflow-hidden rounded-lg border-2 transition-all ${
                          selected
                            ? 'border-[#C83E2B] ring-1 ring-[#C83E2B]'
                            : 'border-slate-200 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="h-12 w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={menuFormImageUrl}
                  onChange={(e) => setMenuFormImageUrl(e.target.value)}
                  placeholder="/src/assets/images/..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:border-[#C83E2B] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-5 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={menuFormAvailable}
                    onChange={(e) => setMenuFormAvailable(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#16A34A]"
                  />
                  <span>Tersedia untuk dipesan hari ini</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={menuFormFeatured}
                    onChange={(e) => setMenuFormFeatured(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#C83E2B]"
                  />
                  <span>Tandai menu unggulan</span>
                </label>
              </div>

              {menuFormError && (
                <p className="text-xs font-medium text-[#DC2626]">{menuFormError}</p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setMenuEditorOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMenuForm}
                  className="rounded-lg bg-[#C83E2B] px-5 py-2 text-xs font-semibold text-white hover:bg-[#B23322]"
                >
                  {savingMenuForm
                    ? 'Menyimpan...'
                    : editingMenuIsNew
                    ? 'Tambah Menu'
                    : 'Simpan Perubahan Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
