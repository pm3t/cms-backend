# Church Management System - Billing API Documentation

Dokumentasi ini merinci endpoint yang tersedia untuk modul Billing & Subscription.

## Autentikasi
Semua endpoint (kecuali Webhooks) memerlukan header:
`Authorization: Bearer <jwt_token>`

---

## 1. Paket & Langganan (Plans & Subscriptions)

### GET `/api/billing/plans`
Mengambil semua paket yang tersedia.
- **Response**: Array of Plan objects dengan tambahan field `is_current_plan`.

### POST `/api/billing/upgrade`
Melakukan upgrade, downgrade, atau beralih ke paket Free.
- **Body**: `{ "plan_id": "uuid" }`
- **Logic**: 
  - Upgrade -> Langsung aktif, generate invoice.
  - Downgrade -> Dijadwalkan efektif di akhir periode.
  - Ke Free -> Batalkan langganan berbayar, efektif segera.

### DELETE `/api/billing/subscription`
Membatalkan perpanjangan otomatis di akhir periode.
- **Response**: Konfirmasi jadwal pembatalan.

---

## 2. Faktur (Invoices)

### GET `/api/billing/invoices`
Mendapatkan riwayat invoice untuk tenant saat ini.

### GET `/api/billing/invoices/:id`
Mendapatkan detail invoice (menyertakan sinkronisasi status Xendit secara *real-time*).

### POST `/api/billing/invoices/generate`
(Manual/Super Admin) Memicu pembuatan invoice bulanan untuk tenant tertentu.
- **Query**: `?tenantId=uuid` (Opsional untuk Super Admin).

### POST `/api/billing/invoices/:id/send-email`
Mengirim ulang link pembayaran invoice ke email tenant.

---

## 3. Integrasi Xendit (External)

### POST `/api/webhooks/xendit`
Endpoint callback untuk notifikasi pembayaran dari Xendit.
- **Headers**: `x-callback-token` (Wajib diverifikasi).
- **Events handled**: `PAID`, `EXPIRED`, `FAILED`.

---

## 4. Cron Jobs (Internal)
Sistem menjalankan tugas otomatis setiap hari pukul 08:00 WIB:
1. **checkOverdueSubscriptions**: Mensuspend akun jika grace period habis.
2. **checkPendingPlanChanges**: Menerapkan downgrade yang sudah dijadwalkan.
3. **checkTrialEndingReminders**: Mengirim email pengingat H-3 trial berakhir.
