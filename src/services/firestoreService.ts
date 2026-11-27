import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { INITIAL_MENU, LEGACY_MENU_IDS } from '../data/initialMenu';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type {
  AdminNotificationLog,
  DeliveryType,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserProfile,
} from '../types';
import { ADMIN_WA_INTL, buildAdminOrderWhatsAppUrl, formatRupiah } from '../utils/format';

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export async function checkIsAdminUser(
  uid: string,
  email: string | null | undefined,
  emailVerified: boolean,
): Promise<boolean> {
  if (!emailVerified) return false;
  if (email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
    return true;
  }
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchCustomerProfile(uid: string): Promise<{
  name: string;
  phone: string;
  address: string;
  email: string;
} | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      name: String(data.name || ''),
      phone: String(data.phone || ''),
      address: String(data.address || ''),
      email: String(data.email || ''),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCustomerProfile(params: {
  uid: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  isNew: boolean;
}): Promise<void> {
  const path = `users/${params.uid}`;
  const cleanName = params.name.trim().slice(0, 120);
  const cleanPhone = params.phone.trim().slice(0, 25);
  const cleanAddress = params.address.trim().slice(0, 400);
  const cleanEmail = params.email.trim().slice(0, 200);

  try {
    if (params.isNew) {
      await setDoc(doc(db, 'users', params.uid), {
        uid: params.uid,
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        email: cleanEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'users', params.uid), {
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddress,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      params.isNew ? OperationType.CREATE : OperationType.UPDATE,
      path,
    );
  }
}

export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
): Unsubscribe {
  const path = 'users';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          phone: String(data.phone || ''),
          address: String(data.address || ''),
          email: String(data.email || ''),
          role: 'customer' as const,
          profileComplete: true,
          createdAt: toIsoString(data.createdAt),
        } as UserProfile;
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

function isLegacySeedOnly(docIds: string[]): boolean {
  return docIds.length > 0 && docIds.every((id) => LEGACY_MENU_IDS.includes(id));
}

function sortMenuItems(items: MenuItem[]): MenuItem[] {
  const orderMap = new Map(INITIAL_MENU.map((item, index) => [item.id, index]));
  return [...items].sort((a, b) => {
    const idxA = orderMap.get(a.id);
    const idxB = orderMap.get(b.id);
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function fetchMenuOnce(): Promise<MenuItem[]> {
  const path = 'menu';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty || isLegacySeedOnly(snap.docs.map((d) => d.id))) {
      return INITIAL_MENU;
    }
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name),
        category: data.category,
        price: Number(data.price),
        description: String(data.description),
        portionInfo: String(data.portionInfo),
        imageUrl: String(data.imageUrl),
        available: Boolean(data.available),
        featured: Boolean(data.featured),
      } as MenuItem;
    });
    return sortMenuItems(items);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeMenu(
  onData: (items: MenuItem[]) => void,
): Unsubscribe {
  const path = 'menu';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      if (snap.empty || isLegacySeedOnly(snap.docs.map((d) => d.id))) {
        onData(INITIAL_MENU);
        return;
      }
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name),
          category: data.category,
          price: Number(data.price),
          description: String(data.description),
          portionInfo: String(data.portionInfo),
          imageUrl: String(data.imageUrl),
          available: Boolean(data.available),
          featured: Boolean(data.featured),
        } as MenuItem;
      });
      onData(sortMenuItems(items));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function seedMenuIfEmptyByAdmin(): Promise<void> {
  const path = 'menu';
  try {
    const snap = await getDocs(collection(db, path));
    const docIds = snap.docs.map((d) => d.id);
    if (!snap.empty && !isLegacySeedOnly(docIds)) return;

    const batch = writeBatch(db);
    for (const legacyId of docIds) {
      if (LEGACY_MENU_IDS.includes(legacyId)) {
        batch.delete(doc(db, path, legacyId));
      }
    }
    for (const item of INITIAL_MENU) {
      batch.set(doc(db, path, item.id), {
        id: item.id,
        name: item.name.slice(0, 160),
        category: item.category,
        price: item.price,
        description: item.description.slice(0, 500),
        portionInfo: item.portionInfo.slice(0, 100),
        imageUrl: item.imageUrl.slice(0, 300),
        available: item.available,
        featured: Boolean(item.featured),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncDefaultMenuByAdmin(): Promise<void> {
  const path = 'menu';
  try {
    const snap = await getDocs(collection(db, path));
    const batch = writeBatch(db);
    for (const d of snap.docs) {
      if (LEGACY_MENU_IDS.includes(d.id)) {
        batch.delete(doc(db, path, d.id));
      }
    }
    for (const item of INITIAL_MENU) {
      batch.set(doc(db, path, item.id), {
        id: item.id,
        name: item.name.slice(0, 160),
        category: item.category,
        price: item.price,
        description: item.description.slice(0, 500),
        portionInfo: item.portionInfo.slice(0, 100),
        imageUrl: item.imageUrl.slice(0, 300),
        available: item.available,
        featured: Boolean(item.featured),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleMenuAvailabilityInFirestore(
  menuId: string,
  available: boolean,
): Promise<void> {
  const path = `menu/${menuId}`;
  try {
    const ref = doc(db, 'menu', menuId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const localItem = INITIAL_MENU.find((m) => m.id === menuId);
      if (!localItem) return;
      await setDoc(ref, {
        ...localItem,
        available,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        available,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateMenuPriceInFirestore(
  menuId: string,
  price: number,
): Promise<void> {
  const path = `menu/${menuId}`;
  const cleanPrice = Math.max(1000, Math.min(50000000, Math.round(price)));
  try {
    const ref = doc(db, 'menu', menuId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const localItem = INITIAL_MENU.find((m) => m.id === menuId);
      if (!localItem) return;
      await setDoc(ref, {
        ...localItem,
        price: cleanPrice,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        price: cleanPrice,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveMenuItemInFirestore(
  item: MenuItem,
  isNew: boolean,
): Promise<void> {
  const cleanId = item.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (!cleanId) {
    throw new Error('ID menu tidak valid.');
  }
  const cleanName = item.name.trim().slice(0, 160);
  if (cleanName.length < 2) {
    throw new Error('Nama menu minimal 2 karakter.');
  }
  const cleanPrice = Math.max(1000, Math.min(50000000, Math.round(Number(item.price) || 0)));
  const cleanDescription = (item.description.trim() || cleanName).slice(0, 500);
  const cleanPortion = (item.portionInfo.trim() || '1 Porsi').slice(0, 100);
  const cleanImage = (
    item.imageUrl.trim() || '/src/assets/images/menu_babi_kecap_1795666125306.jpg'
  ).slice(0, 300);

  const path = `menu/${cleanId}`;
  const ref = doc(db, 'menu', cleanId);

  try {
    const snap = await getDoc(ref);
    if (isNew || !snap.exists()) {
      await setDoc(ref, {
        id: cleanId,
        name: cleanName,
        category: item.category,
        price: cleanPrice,
        description: cleanDescription,
        portionInfo: cleanPortion,
        imageUrl: cleanImage,
        available: Boolean(item.available),
        featured: Boolean(item.featured),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: cleanName,
        category: item.category,
        price: cleanPrice,
        description: cleanDescription,
        portionInfo: cleanPortion,
        imageUrl: cleanImage,
        available: Boolean(item.available),
        featured: Boolean(item.featured),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path,
    );
  }
}

export async function deleteMenuItemFromFirestore(menuId: string): Promise<void> {
  const path = `menu/${menuId}`;
  try {
    await deleteDoc(doc(db, 'menu', menuId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function mapOrderDoc(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    userId: String(data.userId || ''),
    orderCode: String(data.orderCode || ''),
    receiptNumber: data.receiptNumber ? String(data.receiptNumber) : undefined,
    customerName: String(data.customerName || ''),
    customerPhone: String(data.customerPhone || ''),
    customerAddress: String(data.customerAddress || ''),
    deliveryType: (data.deliveryType as DeliveryType) || 'delivery',
    deliveryDate: data.deliveryDate ? String(data.deliveryDate) : undefined,
    deliveryTime: String(data.deliveryTime || ''),
    paymentMethod: (data.paymentMethod as PaymentMethod) || 'transfer',
    paymentStatus: (data.paymentStatus as PaymentStatus) || 'belum_bayar',
    status: (data.status as OrderStatus) || 'menunggu',
    items: Array.isArray(data.items) ? (data.items as OrderItem[]) : [],
    subtotal: Number(data.subtotal || 0),
    deliveryFee: Number(data.deliveryFee || 0),
    total: Number(data.total || 0),
    notes: data.notes ? String(data.notes) : undefined,
    source: (data.source as 'whatsapp_web' | 'kasir_pos') || 'whatsapp_web',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    paidAt: data.paidAt ? toIsoString(data.paidAt) : undefined,
  };
}

export function subscribeOrders(
  user: UserProfile,
  onData: (orders: Order[]) => void,
): Unsubscribe {
  const path = 'orders';
  const q =
    user.role === 'admin'
      ? query(collection(db, path), orderBy('createdAt', 'desc'))
      : query(collection(db, path), where('userId', '==', user.id));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => mapOrderDoc(d.id, d.data()));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeNotifications(
  onData: (logs: AdminNotificationLog[]) => void,
): Unsubscribe {
  const path = 'notifications';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          orderId: String(data.orderId || ''),
          orderCode: String(data.orderCode || ''),
          userId: String(data.userId || ''),
          adminPhone: String(data.adminPhone || ADMIN_WA_INTL),
          channel: data.channel || 'whatsapp_deeplink',
          deliveryState: data.deliveryState || 'siap_kirim',
          messagePreview: String(data.messagePreview || ''),
          waUrl: String(data.waUrl || ''),
          createdAt: toIsoString(data.createdAt),
        } as AdminNotificationLog;
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function createOrderAtomicInFirestore(params: {
  userId: string;
  menuCatalog: MenuItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryType: DeliveryType;
  deliveryDate?: string;
  deliveryTime: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  source: 'whatsapp_web' | 'kasir_pos';
  markPaid?: boolean;
  items: Array<{ menuId: string; quantity: number; note?: string }>;
}): Promise<Order> {
  const resolvedItems: OrderItem[] = [];
  for (const reqItem of params.items) {
    const menuItem = params.menuCatalog.find((m) => m.id === reqItem.menuId);
    if (!menuItem) {
      throw new Error(`Menu ${reqItem.menuId} tidak ditemukan.`);
    }
    const qty = Math.max(1, Math.min(99, Math.floor(Number(reqItem.quantity) || 1)));
    resolvedItems.push({
      menuId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
      subtotal: menuItem.price * qty,
      ...(reqItem.note?.trim() ? { note: reqItem.note.trim().slice(0, 120) } : {}),
    });
  }

  if (resolvedItems.length === 0 || resolvedItems.length > 50) {
    throw new Error('Jumlah item pesanan tidak valid.');
  }

  const subtotal = resolvedItems.reduce((acc, item) => acc + item.subtotal, 0);
  const deliveryFee =
    params.source === 'kasir_pos' && params.paymentMethod === 'tunai'
      ? 0
      : subtotal >= 150000
      ? 0
      : 10000;
  const total = subtotal + deliveryFee;

  const now = new Date();
  const dateStamp = `${String(now.getDate()).padStart(2, '0')}${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`;
  const randCode = Math.floor(100 + Math.random() * 900);
  const orderCode = `BN-${dateStamp}-${randCode}`;

  const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const isPaidImmediately = params.source === 'kasir_pos' && params.markPaid === true;

  const cleanName = params.customerName.trim().slice(0, 120);
  const cleanPhone = params.customerPhone.trim().slice(0, 25);
  const cleanAddress = (params.customerAddress.trim() || 'Ambil di Warung').slice(0, 400);
  const cleanNotes = params.notes?.trim().slice(0, 300);
  const cleanDeliveryDate = (params.deliveryDate || '').trim().slice(0, 100);

  const localOrder: Order = {
    id: orderId,
    userId: params.userId,
    orderCode,
    ...(isPaidImmediately ? { receiptNumber: `KW-${orderCode}` } : {}),
    customerName: cleanName,
    customerPhone: cleanPhone,
    customerAddress: cleanAddress,
    deliveryType: params.deliveryType,
    ...(cleanDeliveryDate ? { deliveryDate: cleanDeliveryDate } : {}),
    deliveryTime: params.deliveryTime.trim().slice(0, 100),
    paymentMethod: params.paymentMethod,
    paymentStatus: isPaidImmediately ? 'lunas' : 'belum_bayar',
    status: params.source === 'kasir_pos' ? 'dimasak' : 'menunggu',
    items: resolvedItems,
    subtotal,
    deliveryFee,
    total,
    ...(cleanNotes ? { notes: cleanNotes } : {}),
    source: params.source,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...(isPaidImmediately ? { paidAt: now.toISOString() } : {}),
  };

  const waUrl = buildAdminOrderWhatsAppUrl(localOrder).slice(0, 3000);
  const preview = `Pesanan Baru ${orderCode} · ${cleanName} (${
    params.deliveryType === 'cod' ? 'COD' : 'Delivery'
  } · ${formatRupiah(total)})`.slice(0, 300);

  // Optional server-side WhatsApp Gateway relay (non-blocking)
  let channel: 'whatsapp_gateway' | 'whatsapp_deeplink' = 'whatsapp_deeplink';
  let deliveryState: 'terkirim' | 'siap_kirim' | 'gagal' = 'siap_kirim';
  try {
    const relayRes = await fetch('/api/whatsapp-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: localOrder }),
    });
    if (relayRes.ok) {
      const relayData = (await relayRes.json()) as {
        channel?: 'whatsapp_gateway' | 'whatsapp_deeplink';
        deliveryState?: 'terkirim' | 'siap_kirim' | 'gagal';
      };
      if (relayData.channel) channel = relayData.channel;
      if (relayData.deliveryState) deliveryState = relayData.deliveryState;
    }
  } catch {
    // Fallback gracefully to whatsapp_deeplink
  }

  const batch = writeBatch(db);
  const orderRef = doc(db, 'orders', orderId);
  const notifRef = doc(db, 'notifications', notifId);

  const firestoreOrderPayload: Record<string, unknown> = {
    id: orderId,
    userId: params.userId,
    orderCode,
    customerName: cleanName,
    customerPhone: cleanPhone,
    customerAddress: cleanAddress,
    deliveryType: params.deliveryType,
    deliveryTime: params.deliveryTime.trim().slice(0, 100),
    paymentMethod: params.paymentMethod,
    paymentStatus: isPaidImmediately ? 'lunas' : 'belum_bayar',
    status: params.source === 'kasir_pos' ? 'dimasak' : 'menunggu',
    items: resolvedItems,
    subtotal,
    deliveryFee,
    total,
    source: params.source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanDeliveryDate) {
    firestoreOrderPayload.deliveryDate = cleanDeliveryDate;
  }
  if (cleanNotes) {
    firestoreOrderPayload.notes = cleanNotes;
  }
  if (isPaidImmediately) {
    firestoreOrderPayload.receiptNumber = `KW-${orderCode}`;
    firestoreOrderPayload.paidAt = serverTimestamp();
  }

  batch.set(orderRef, firestoreOrderPayload);
  batch.set(notifRef, {
    id: notifId,
    orderId,
    orderCode,
    userId: params.userId,
    adminPhone: ADMIN_WA_INTL,
    channel,
    deliveryState,
    messagePreview: preview,
    waUrl,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return localOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function updateOrderInFirestore(
  order: Order,
  patch: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
  },
): Promise<void> {
  const path = `orders/${order.id}`;
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (patch.status) {
    updates.status = patch.status;
  }
  if (patch.paymentMethod) {
    updates.paymentMethod = patch.paymentMethod;
  }
  if (patch.paymentStatus) {
    updates.paymentStatus = patch.paymentStatus;
    if (patch.paymentStatus === 'lunas') {
      updates.receiptNumber = order.receiptNumber || `KW-${order.orderCode}`;
      updates.paidAt = serverTimestamp();
    }
  }

  try {
    await updateDoc(doc(db, 'orders', order.id), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
