# Skenario Pengujian - SaaS Billing Integration (Fase 3.5)

Dokumen ini berisi langkah-langkah untuk melakukan verifikasi end-to-end pada sistem penagihan dan manajemen langganan.

## 1. Onboarding & Masa Trial
**Tujuan**: Memastikan gereja baru mendapatkan paket Free dengan trial 14 hari.
- **Langkah**:
  1. Lakukan registrasi gereja baru melalui `/register`.
  2. Login dan masuk ke halaman `/billing`.
- **Ekspektasi**:
  - Halaman Billing menampilkan paket "Free".
  - Status berstatus "trialing".
  - Tanggal berakhir trial adalah 14 hari dari hari ini.
  - (Cek DB) Tabel `subscriptions` memiliki data baru untuk tenant tersebut.

## 2. Alur Upgrade (Immediate Payment)
**Tujuan**: Memastikan proses upgrade ke paket lebih mahal mengarah ke Xendit.
- **Langkah**:
  1. Dari halaman `/billing`, klik "Kelola Paket" atau langsung ke `/billing/upgrade`.
  2. Pilih paket "Pro" (atau paket yang lebih mahal dari saat ini).
  3. Klik "Upgrade Sekarang" dan konfirmasi.
- **Ekspektasi**:
  - Browser melakukan redirect ke URL `checkout.xendit.co`.
  - Muncul invoice Xendit dengan nominal yang sesuai dengan paket Pro.

## 3. Simulasi Pembayaran Berhasil (Webhook)
**Tujuan**: Memastikan sistem merespon notifikasi pembayaran dari Xendit.
- **Langkah**:
  1. (Gunakan Postman/Curl) Kirim POST request ke `/api/webhooks/xendit`.
  2. Body Request (Sesuaikan `external_id` dengan ID Invoice di DB Anda):
     ```json
     {
       "external_id": "invoice-uuid-anda",
       "status": "PAID",
       "amount": 150000,
       "paid_at": "2026-04-29T12:00:00Z"
     }
     ```
  3. Sertakan header `x-callback-token` yang sesuai dengan `.env`.
- **Ekspektasi**:
  - API mengembalikan status `200 OK`.
  - (Cek DB) Status `Invoice` berubah jadi `paid`.
  - (Cek DB) Status `Subscription` berubah jadi `active`.
  - (Cek UI) Halaman `/billing/invoices` menunjukkan invoice tersebut sudah "Paid".

## 4. Alur Downgrade (Scheduled Change)
**Tujuan**: Memastikan downgrade tidak langsung memotong hak akses user.
- **Langkah**:
  1. Saat berada di paket "Pro", pilih paket "Basic" di halaman `/billing/upgrade`.
  2. Konfirmasi pilihan downgrade.
- **Ekspektasi**:
  - Sistem menampilkan pesan bahwa perubahan dijadwalkan di akhir periode.
  - Paket aktif tetap "Pro".
  - Field `pending_plan_id` di database terisi.
  - Muncul banner info di UI tentang jadwal perubahan.

## 5. Penegakan Limit (Plan Enforcement)
**Tujuan**: Memastikan limitasi paket berfungsi (misal: jumlah user).
- **Langkah**:
  1. Pastikan Anda di paket dengan limit `max_users: 2`.
  2. Coba tambahkan user ke-3 (melalui registrasi atau admin panel).
- **Ekspektasi**:
  - API/Backend mengembalikan error `403 Forbidden`.
  - Muncul pesan "Upgrade required: You have reached the maximum number of users".

## 6. Skenario Akun Ditangguhkan (Suspended)
**Tujuan**: Memastikan user tidak bisa menggunakan sistem jika menunggak.
- **Langkah**:
  1. Ubah status subscription di database menjadi `suspended` secara manual (atau via Super Admin).
  2. Login sebagai admin gereja tersebut.
- **Ekspektasi**:
  - Muncul blocking banner "Akun Ditangguhkan" di dashboard.
  - User tidak bisa mengakses menu "Anggota" atau "Acara".
  - Hanya menu "Billing" yang mungkin masih bisa diakses (tergantung implementasi sidebar).

## 7. Kontrol Super Admin
**Tujuan**: Memastikan platform owner bisa mengelola tenant.
- **Langkah**:
  1. Login sebagai Super Admin.
  2. Masuk ke `/super-admin/tenants`.
  3. Cari tenant yang baru dibuat, klik tombol "Suspend" (Ikon Shield).
- **Ekspektasi**:
  - Status tenant di tabel berubah jadi `suspended`.
  - Notifikasi sukses muncul.
  - Klik "Activate" untuk memulihkan.
