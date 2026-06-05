# Church Management System SaaS - API Contract

Dokumentasi ini merinci kontrak API (Request/Response) untuk frontend developer.
**Base URL**: `http://localhost:3000/api`

## 1. Authentication (`/auth`)

### POST `/auth/register`
Mendaftarkan gereja (tenant) baru dan user administrator pertamanya.
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "admin@gereja.com",
  "password": "password123",
  "name": "Nama Admin",
  "churchName": "Gereja Kemenangan",
  "tenantId": "kemenangan-slug"
}
```
- **Response Sukses (201)**:
```json
{
  "id": "user-uuid",
  "email": "admin@gereja.com",
  "name": "Nama Admin"
}
```

### POST `/auth/login`
Masuk ke sistem.
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "admin@gereja.com",
  "password": "password123",
  "tenantId": "kemenangan-slug"
}
```
- **Response Sukses (200)**:
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "user-uuid",
    "name": "Nama Admin",
    "email": "admin@gereja.com",
    "role": "Admin",
    "organization_id": "kemenangan-slug"
  }
}
```

### GET `/auth/me`
Mendapatkan profil user yang sedang login.
- **Auth Required**: JWT
- **Response Sukses (200)**:
```json
{
  "id": "user-uuid",
  "name": "Nama Admin",
  "email": "admin@gereja.com",
  "role": "Admin",
  "organization_id": "kemenangan-slug"
}
```

---

## 2. Super Admin (`/super-admin`)
*Endpoint ini hanya dapat diakses oleh user dengan role Super Admin.*

### GET `/super-admin/revenue`
Mendapatkan ringkasan pendapatan platform.
- **Auth Required**: JWT + SuperAdmin Role
- **Response Sukses (200)**:
```json
{
  "totalMRR": 5000000,
  "activeSubscriptions": 25,
  "pendingInvoices": 12
}
```

### GET `/super-admin/tenants`
Mendapatkan daftar semua tenant (gereja).
- **Response Sukses (200)**: `Array<Tenant>`

### PATCH `/super-admin/tenants/:id/suspend`
Menonaktifkan akses tenant secara manual.
- **Response Sukses (200)**: `{ "id": "sub-uuid", "status": "suspended", ... }`

### PATCH `/super-admin/tenants/:id/activate`
Mengaktifkan kembali tenant yang ditangguhkan.
- **Response Sukses (200)**: `{ "id": "sub-uuid", "status": "active", ... }`

---

## 3. Billing & Plans (`/billing`)

### GET `/billing/plans`
Mendapatkan daftar paket berlangganan.
- **Auth Required**: JWT
- **Response Sukses (200)**:
```json
[
  {
    "id": "uuid",
    "name": "Pro",
    "price_monthly": 150000,
    "price_yearly": 1500000,
    "max_members": 500,
    "max_users": 5,
    "features": ["event_management", "small_groups"],
    "is_current_plan": true
  }
]
```

### GET `/billing/subscription`
Mendapatkan detail langganan aktif tenant saat ini.
- **Auth Required**: JWT
- **Response Sukses (200)**:
```json
{
  "plan": { "id": "uuid", "name": "Pro", ... },
  "status": "active",
  "trial_ends_at": "2026-05-10T...",
  "current_period_end": "2026-06-10T...",
  "pending_plan_id": null,
  "pending_plan_effective_at": null
}
```

### POST `/billing/upgrade`
Upgrade, downgrade, atau beralih ke paket Free.
- **Auth Required**: JWT
- **Request Body**: `{ "plan_id": "plan-uuid" }`
- **Response Sukses (200)**:
```json
{
  "success": true,
  "type": "upgrade",
  "message": "Berhasil upgrade ke Pro",
  "invoice": { "paymentUrl": "https://checkout.xendit.co/..." }
}
```
*Jika downgrade:*
```json
{
  "success": true,
  "type": "downgrade",
  "message": "Downgrade dijadwalkan pada 20/05/2026"
}
```

### DELETE `/billing/subscription`
Membatalkan langganan berbayar (berhenti di akhir periode).
- **Response Sukses (200)**: `{ "success": true, "message": "Langganan dibatalkan, efektif pada ..." }`

---

## 4. Invoices (`/billing/invoices`)

### GET `/billing/invoices`
Daftar riwayat tagihan untuk gereja saat ini.
- **Response Sukses (200)**: `Array<Invoice>`

### GET `/billing/invoices/:id`
Detail invoice dengan sinkronisasi status Xendit terbaru.
- **Response Sukses (200)**:
```json
{
  "id": "uuid",
  "status": "paid",
  "amount": 150000,
  "invoiceUrl": "...",
  "subscription": { "plan": { "name": "Pro" } }
}
```

### POST `/billing/invoices/generate`
(Manual/Super Admin) Memicu pembuatan invoice bulanan.
- **Query**: `?tenantId=uuid` (Opsional untuk Super Admin)
- **Response Sukses (201)**: `{ "invoice": { ... }, "paymentUrl": "..." }`

### POST `/billing/invoices/:id/send-email`
Mengirim ulang link pembayaran invoice ke email tenant.
- **Response Sukses (200)**: `{ "sent": true, "recipient": "email@example.com" }`

---

## 5. Webhooks (`/webhooks`)

### POST `/webhooks/xendit`
Callback otomatis dari Xendit.
- **Auth Required**: Header `x-callback-token`
- **Logic**: Mengupdate status invoice dan masa aktif langganan di database.
- **Response**: `200 OK` (Selalu kembali 200 agar Xendit tidak retrying).

---

## Format Error Umum
Jika terjadi kesalahan, sistem mengembalikan format:
- **Response Error (4xx/5xx)**:
```json
{
  "error": "Pesan kesalahan yang deskriptif"
}
```
