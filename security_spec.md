# Security Specification — Warung Babi Ngepet Firestore Rules

## 1. Data Invariants
1. **Menu Integrity**: Only verified Admins (`isAdmin()`) may create, update, or delete `/menu/{menuId}` documents. Public visitors can read the catalog (`get`, `list`).
2. **PII Isolation (`/users/{userId}`)**: Customer contact and address fields (`phone`, `address`, `email`) are strictly readable and writable only by the authenticated owner (`request.auth.uid == userId`) or `isAdmin()`. Users cannot self-assign admin privileges (`role` or `isAdmin` fields are rejected by strict `hasOnly`).
3. **Order Ownership & State Integrity (`/orders/{orderId}`)**:
   - Customer order creation MUST have `userId == request.auth.uid`, `status == 'menunggu'`, `paymentStatus == 'belum_bayar'`, `source == 'whatsapp_web'`, and server timestamps `createdAt == request.time`, `updatedAt == request.time`.
   - Customer list queries are strictly enforced at the rule boundary (`resource.data.userId == request.auth.uid || isAdmin()`).
   - Only `isAdmin()` can update order `status`, `paymentStatus`, `paymentMethod`, `receiptNumber`, or `paidAt`.
4. **Atomic Notification Dispatch (`/notifications/{notifId}`)**:
   - Creating a notification requires `userId == request.auth.uid`, `createdAt == request.time`, and `existsAfter(/databases/$(database)/documents/orders/$(incoming().orderId))` so orphaned notifications cannot be forged.
   - Only `isAdmin()` can read or list `/notifications`.

## 2. Dirty Dozen Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Order Write**: `create /orders/ord1` without `request.auth`.
2. **Identity Spoofing on Order Create**: `create /orders/ord2` with `userId: "other-uid"` while authenticated as `"uid-a"`.
3. **Privilege Escalation via User Profile**: `create /users/uid-a` containing shadow field `isAdmin: true` or `role: "admin"`.
4. **Shadow Field Injection on Order**: `create /orders/ord3` containing extra key `discountOverride: 999999`.
5. **Client Status Shortcutting**: Non-admin customer creates `/orders/ord4` with `status: "selesai"` and `paymentStatus: "lunas"`.
6. **Customer Payment Tampering**: Non-admin customer updates `/orders/ord4` changing `paymentStatus` to `"lunas"`.
7. **PII Blanket Scrape on Users**: Signed-in non-admin attempts `list /users` or `get /users/other-uid`.
8. **Blanket Query Scrape on Orders**: Signed-in non-admin attempts `list /orders` without `where("userId", "==", uid)` filter.
9. **Spoofed Timestamp**: Client creates `/orders/ord5` with backdated `createdAt` (`!= request.time`).
10. **ID Poisoning**: Client writes `/orders/` with 200-character or slash-injected document ID.
11. **Unverified Email Spoof**: User with `email: "order.bangben@gmail.com"` but `email_verified: false` attempts admin update on `/orders`.
12. **Orphaned Notification Spam**: Client creates `/notifications/n1` pointing to a non-existent `orderId`.
