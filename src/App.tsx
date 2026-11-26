import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { AdminKasirView } from './components/AdminKasirView';
import { AuthView, type AuthTabMode } from './components/AuthView';
import { BrandLogo } from './components/BrandLogo';
import { CartDrawer } from './components/CartDrawer';
import { Header } from './components/Header';
import { KwitansiModal } from './components/KwitansiModal';
import { OrderHistoryView } from './components/OrderHistoryView';
import { OrderTrackingView } from './components/OrderTrackingView';
import { StorefrontView } from './components/StorefrontView';
import { INITIAL_MENU } from './data/initialMenu';
import { auth, googleProvider } from './firebase';
import {
  checkIsAdminUser,
  createOrderAtomicInFirestore,
  deleteMenuItemFromFirestore,
  fetchCustomerProfile,
  fetchMenuOnce,
  saveCustomerProfile,
  saveMenuItemInFirestore,
  seedMenuIfEmptyByAdmin,
  subscribeMenu,
  subscribeNotifications,
  subscribeOrders,
  subscribeUsers,
  syncDefaultMenuByAdmin,
  toggleMenuAvailabilityInFirestore,
  updateMenuPriceInFirestore,
  updateOrderInFirestore,
} from './services/firestoreService';
import type {
  AdminNotificationLog,
  AppView,
  CartItem,
  DeliveryType,
  MenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserProfile,
} from './types';
import { ADMIN_WA_DISPLAY, formatRupiah, playAdminAlertChime } from './utils/format';

const CART_STORAGE_KEY = 'bn_cart_v1';

interface ToastMessage {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('menu');
  const [authTab, setAuthTab] = useState<AuthTabMode>('customer');
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AdminNotificationLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [trackSearchCode, setTrackSearchCode] = useState('');
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const seenOrderIdsRef = useRef<Set<string> | null>(null);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToast({ id, ...msg });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 5500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  // Initial public menu load
  useEffect(() => {
    fetchMenuOnce()
      .then((items) => setMenu(items))
      .catch((err) => console.error('Gagal memuat katalog menu:', err))
      .finally(() => setLoading(false));
  }, []);

  // Firebase Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setOrders([]);
        setNotifications([]);
        seenOrderIdsRef.current = null;
        setAuthReady(true);
        return;
      }

      try {
        const isAdmin = await checkIsAdminUser(
          fbUser.uid,
          fbUser.email,
          fbUser.emailVerified,
        );

        if (isAdmin) {
          await seedMenuIfEmptyByAdmin();
          setCurrentUser({
            id: fbUser.uid,
            name: fbUser.displayName || 'Admin Kasir Warung Babi Ngepet',
            phone: ADMIN_WA_DISPLAY,
            address: 'Kasir Utama Warung Babi Ngepet',
            email: fbUser.email || '',
            role: 'admin',
            profileComplete: true,
          });
          setActiveView('admin');
        } else {
          const existingProfile = await fetchCustomerProfile(fbUser.uid);
          setCurrentUser({
            id: fbUser.uid,
            name: existingProfile?.name || fbUser.displayName || 'Pelanggan',
            phone: existingProfile?.phone || '',
            address: existingProfile?.address || '',
            email: fbUser.email || '',
            role: 'customer',
            profileComplete: Boolean(
              existingProfile?.name &&
                existingProfile?.phone &&
                existingProfile?.address,
            ),
          });
        }
      } catch (err) {
        console.error('Gagal memverifikasi profil Firebase:', err);
        setCurrentUser({
          id: fbUser.uid,
          name: fbUser.displayName || 'Pelanggan',
          phone: '',
          address: '',
          email: fbUser.email || '',
          role: 'customer',
          profileComplete: false,
        });
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore listeners (attached strictly when authReady && currentUser != null)
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const unsubMenu = subscribeMenu((items) => {
      setMenu(items);
    });

    const unsubOrders = subscribeOrders(currentUser, (incomingOrders) => {
      if (currentUser.role === 'admin') {
        if (seenOrderIdsRef.current !== null) {
          const newIncoming = incomingOrders.find(
            (o) => !seenOrderIdsRef.current?.has(o.id),
          );
          if (newIncoming) {
            if (soundEnabledRef.current) {
              playAdminAlertChime();
            }
            showToast({
              text: `Pesanan baru ${newIncoming.orderCode} dari ${newIncoming.customerName} (${formatRupiah(
                newIncoming.total,
              )}) — Notifikasi WA Admin siap.`,
            });
          }
        }
        seenOrderIdsRef.current = new Set(incomingOrders.map((o) => o.id));
      }
      setOrders(incomingOrders);
    });

    let unsubNotifs: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;
    if (currentUser.role === 'admin') {
      unsubNotifs = subscribeNotifications((logs) => {
        setNotifications(logs);
      });
      unsubUsers = subscribeUsers((usrList) => {
        setUsersList(usrList);
      });
    } else {
      setNotifications([]);
      setUsersList([]);
    }

    return () => {
      unsubMenu();
      unsubOrders();
      unsubNotifs?.();
      unsubUsers?.();
    };
  }, [authReady, currentUser, showToast]);

  const handleCustomerRegister = async (data: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  }) => {
    let uid = auth.currentUser?.uid;
    if (!uid) {
      const cred = await signInAnonymously(auth);
      uid = cred.user.uid;
    }
    await saveCustomerProfile({
      uid,
      email: data.email || '',
      name: data.name,
      phone: data.phone,
      address: data.address,
      isNew: true,
    });
    setCurrentUser({
      id: uid,
      name: data.name,
      phone: data.phone,
      address: data.address,
      email: data.email || '',
      role: 'customer',
      profileComplete: true,
    });
    showToast({ text: `Selamat datang, ${data.name}! Pendaftaran berhasil.` });
    setActiveView('menu');
  };

  const handleAdminGoogleSignIn = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const isAdmin = await checkIsAdminUser(
      fbUser.uid,
      fbUser.email,
      fbUser.emailVerified,
    );

    if (!isAdmin) {
      throw new Error(
        `Akun ${fbUser.email || ''} belum terdaftar sebagai Admin Kasir.`,
      );
    }

    showToast({ text: 'Berhasil masuk ke Console Kasir Admin.' });
    setActiveView('admin');
  };

  const handleSaveCustomerProfile = async (data: {
    name: string;
    phone: string;
    address: string;
  }) => {
    if (!currentUser) return;
    await saveCustomerProfile({
      uid: currentUser.id,
      email: currentUser.email,
      name: data.name,
      phone: data.phone,
      address: data.address,
      isNew: !currentUser.profileComplete,
    });
    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            name: data.name,
            phone: data.phone,
            address: data.address,
            profileComplete: true,
          }
        : null,
    );
    showToast({ text: 'Registrasi selesai! Anda sekarang dapat memesan menu.' });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setOrders([]);
    setNotifications([]);
    setActiveView('menu');
    showToast({ text: 'Anda telah keluar dari akun.' });
  };

  const isRegisteredCustomer = Boolean(
    currentUser?.role === 'customer' && currentUser.profileComplete,
  );
  const needsProfileCompletion = Boolean(
    currentUser?.role === 'customer' && !currentUser.profileComplete,
  );

  const openCustomerAuthGate = () => {
    setAuthTab('customer');
    setActiveView('auth');
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!item.available) return;
    if (!isRegisteredCustomer) {
      openCustomerAuthGate();
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (menuId: string, delta: number) => {
    if (!isRegisteredCustomer) {
      openCustomerAuthGate();
      return;
    }
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === menuId
            ? { ...c, quantity: c.quantity + delta }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const handleUpdateItemNote = (menuId: string, note: string) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === menuId ? { ...c, note } : c)),
    );
  };

  const handleRepeatOrder = (order: Order) => {
    if (!isRegisteredCustomer) {
      openCustomerAuthGate();
      return;
    }
    const nextCart: CartItem[] = [];
    let unavailableCount = 0;

    for (const orderItem of order.items) {
      const currentMenu = menu.find((m) => m.id === orderItem.menuId);
      if (currentMenu && currentMenu.available) {
        nextCart.push({
          menuItem: currentMenu,
          quantity: orderItem.quantity,
          note: orderItem.note,
        });
      } else {
        unavailableCount += 1;
      }
    }

    if (nextCart.length === 0) {
      showToast({
        text: 'Maaf, seluruh menu pada pesanan tersebut sedang tidak tersedia hari ini.',
      });
      return;
    }

    setCart(nextCart);
    setCartOpen(true);
    if (unavailableCount > 0) {
      showToast({
        text: `${nextCart.length} menu dimasukkan ke keranjang (${unavailableCount} menu sedang habis).`,
      });
    }
  };

  const handleUpdateOrder = async (
    orderId: string,
    patch: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
    },
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || currentUser?.role !== 'admin') return;
    await updateOrderInFirestore(target, patch);
  };

  const handleToggleMenuAvailability = async (
    menuId: string,
    available: boolean,
  ) => {
    if (currentUser?.role !== 'admin') return;
    await toggleMenuAvailabilityInFirestore(menuId, available);
  };

  const handleUpdateMenuPrice = async (menuId: string, price: number) => {
    if (currentUser?.role !== 'admin') return;
    await updateMenuPriceInFirestore(menuId, price);
    showToast({ text: 'Harga menu berhasil diperbarui di Firestore.' });
  };

  const handleSaveMenuItem = async (item: MenuItem, isNew: boolean) => {
    if (currentUser?.role !== 'admin') return;
    await saveMenuItemInFirestore(item, isNew);
    showToast({
      text: isNew
        ? `Menu "${item.name}" berhasil ditambahkan ke katalog.`
        : `Detail menu "${item.name}" berhasil diperbarui.`,
    });
  };

  const handleDeleteMenuItem = async (menuId: string) => {
    if (currentUser?.role !== 'admin') return;
    await deleteMenuItemFromFirestore(menuId);
    showToast({ text: 'Menu berhasil dihapus dari katalog.' });
  };

  const handleSyncDefaultMenu = async () => {
    if (currentUser?.role !== 'admin') return;
    await syncDefaultMenuByAdmin();
    showToast({ text: '6 menu utama Warung Babi Ngepet berhasil dipulihkan.' });
  };

  const handleCreatePosOrder = async (payload: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryType: DeliveryType;
    deliveryTime: string;
    paymentMethod: PaymentMethod;
    markPaid: boolean;
    items: Array<{ menuId: string; quantity: number }>;
  }): Promise<Order> => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Silakan masuk sebagai Admin Kasir terlebih dahulu.');
    }
    return createOrderAtomicInFirestore({
      userId: currentUser.id,
      menuCatalog: menu,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress,
      deliveryType: payload.deliveryType,
      deliveryTime: payload.deliveryTime,
      paymentMethod: payload.paymentMethod,
      source: 'kasir_pos',
      markPaid: payload.markPaid,
      items: payload.items,
    });
  };

  const cartCount = isRegisteredCustomer
    ? cart.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const receiptOrder = receiptOrderId
    ? orders.find((o) => o.id === receiptOrderId) || null
    : null;

  // =========================================================================
  // ROLE 1: DEDICATED ADMIN KASIR POS APPLICATION
  // =========================================================================
  if (currentUser?.role === 'admin') {
    return (
      <>
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-40 flex max-w-sm items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white shadow-lg no-print"
          >
            <p className="flex-1 leading-relaxed">{toast.text}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white px-1"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        )}

        <AdminKasirView
          adminUser={currentUser}
          menu={menu}
          orders={orders}
          notifications={notifications}
          users={usersList}
          firestoreConnected={authReady && currentUser !== null}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          onUpdateOrder={handleUpdateOrder}
          onToggleMenuAvailability={handleToggleMenuAvailability}
          onUpdateMenuPrice={handleUpdateMenuPrice}
          onSaveMenuItem={handleSaveMenuItem}
          onDeleteMenuItem={handleDeleteMenuItem}
          onSyncDefaultMenu={handleSyncDefaultMenu}
          onCreatePosOrder={handleCreatePosOrder}
          onOpenReceipt={(ord) => setReceiptOrderId(ord.id)}
          onLogout={handleLogout}
        />

        <KwitansiModal
          order={receiptOrder}
          onClose={() => setReceiptOrderId(null)}
        />
      </>
    );
  }

  // =========================================================================
  // ROLE 2: DEDICATED CUSTOMER STOREFRONT APPLICATION
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#171615]">
      <Header
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'auth') setAuthTab('customer');
          setActiveView(view);
        }}
        cartCount={cartCount}
        onOpenCart={() => {
          if (!isRegisteredCustomer) {
            openCustomerAuthGate();
          } else {
            setCartOpen(true);
          }
        }}
        currentUser={currentUser}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-40 flex max-w-sm items-center gap-3 rounded-xl border border-[#171615]/15 bg-[#171615] px-4 py-3 text-xs text-white shadow-lg no-print"
        >
          <p className="flex-1 leading-relaxed">{toast.text}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white px-1"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1">
        {loading ? (
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-6">
            <div className="h-64 animate-pulse rounded-2xl bg-[#ECE8E0]" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 animate-pulse rounded-xl bg-[#ECE8E0]" />
              ))}
            </div>
          </div>
        ) : activeView === 'auth' || activeView === 'admin' ? (
          <AuthView
            initialTab={activeView === 'admin' ? 'admin' : authTab}
            currentUser={currentUser}
            onCustomerRegister={handleCustomerRegister}
            onAdminGoogleSignIn={handleAdminGoogleSignIn}
            onSaveProfile={handleSaveCustomerProfile}
            onLogout={handleLogout}
            onNavigateAfterLogin={(role) =>
              setActiveView(role === 'admin' ? 'admin' : 'menu')
            }
          />
        ) : activeView === 'menu' ? (
          <StorefrontView
            menu={menu}
            cart={cart}
            canOrder={isRegisteredCustomer}
            needsProfileCompletion={needsProfileCompletion}
            onAddToCart={handleAddToCart}
            onUpdateQty={handleUpdateQty}
            onNavigateTrack={() => setActiveView('track')}
            onRequireAuth={openCustomerAuthGate}
          />
        ) : activeView === 'track' ? (
          <OrderTrackingView
            orders={orders}
            currentUser={currentUser}
            initialSearchCode={trackSearchCode}
            firestoreConnected={authReady && currentUser !== null}
            onOpenReceipt={(ord) => setReceiptOrderId(ord.id)}
            onGoToMenu={() => setActiveView('menu')}
            onOpenAuth={openCustomerAuthGate}
          />
        ) : (
          <OrderHistoryView
            orders={orders}
            currentUser={currentUser}
            onRepeatOrder={handleRepeatOrder}
            onTrackOrder={(code) => {
              setTrackSearchCode(code);
              setActiveView('track');
            }}
            onOpenReceipt={(ord) => setReceiptOrderId(ord.id)}
            onGoToMenu={() => setActiveView('menu')}
            onOpenAuth={openCustomerAuthGate}
          />
        )}
      </main>

      <footer className="border-t border-[#E5E2DC] bg-white py-8 no-print">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <div>
              <p className="font-display text-sm font-bold text-[#171615]">
                Warung Babi Ngepet
              </p>
              <p className="text-xs text-[#6B655E]">
                Pemesanan Online · Delivery &amp; COD · WhatsApp Admin {ADMIN_WA_DISPLAY}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#5E5A54]">
            <button
              type="button"
              onClick={() => setActiveView('menu')}
              className="hover:text-[#171615]"
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveView('track')}
              className="hover:text-[#171615]"
            >
              Lacak Pesanan
            </button>
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className="hover:text-[#171615]"
            >
              Histori &amp; Repeat Order
            </button>
            <button
              type="button"
              onClick={openCustomerAuthGate}
              className="hover:text-[#171615]"
            >
              Masuk / Daftar Pelanggan
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('admin');
                setActiveView('admin');
              }}
              className="hover:text-[#171615]"
            >
              Portal Kasir Admin
            </button>
          </div>
        </div>
      </footer>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        menuCatalog={menu}
        currentUser={currentUser}
        onUpdateQty={handleUpdateQty}
        onUpdateItemNote={handleUpdateItemNote}
        onClearCart={() => setCart([])}
        onOrderCreated={(order) => {
          setOrders((prev) =>
            prev.some((o) => o.id === order.id) ? prev : [order, ...prev],
          );
        }}
        onGoToTracking={(code) => {
          setCartOpen(false);
          setTrackSearchCode(code);
          setActiveView('track');
        }}
        onOpenRegistration={() => {
          setCartOpen(false);
          openCustomerAuthGate();
        }}
      />

      <KwitansiModal
        order={receiptOrder}
        onClose={() => setReceiptOrderId(null)}
      />
    </div>
  );
}
