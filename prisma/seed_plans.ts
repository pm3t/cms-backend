import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      name: 'Free',
      price_monthly: 0,
      price_yearly: 0,
      max_members: 50,
      max_users: 2,
      max_storage_gb: 1,
      features: [
        // Core — selalu tersedia di semua plan
        'member_directory',       // Direktori & database jemaat
        'attendance_tracking',    // Pencatatan kehadiran ibadah
        'basic_reporting',        // Laporan dasar jemaat & kehadiran
        'announcements',          // Pengumuman gereja
      ]
    },
    {
      name: 'Basic',
      price_monthly: 149000,
      price_yearly: 1490000, // ~10 bulan
      max_members: 200,
      max_users: 5,
      max_storage_gb: 5,
      features: [
        // Free tier features
        'member_directory',
        'attendance_tracking',
        'basic_reporting',
        'announcements',
        // Basic additions
        'event_management',       // Manajemen acara & jadwal ibadah
        'small_groups',           // Kelompok sel / komunitas
        'pastoral_care',          // Kunjungan & konseling pastoral
        'document_library',       // Perpustakaan digital dokumen gereja
        'email_support',          // Dukungan teknis via email
      ]
    },
    {
      name: 'Pro',
      price_monthly: 299000,
      price_yearly: 2990000,
      max_members: 1000,
      max_users: 20,
      max_storage_gb: 20,
      features: [
        // Basic tier features
        'member_directory',
        'attendance_tracking',
        'basic_reporting',
        'announcements',
        'event_management',
        'small_groups',
        'pastoral_care',
        'document_library',
        // Pro additions
        'advanced_reporting',     // Analisis & laporan keuangan lanjutan
        'online_giving',          // Keuangan & persembahan online (QRIS/Transfer)
        'finance_advanced',       // Proyek keuangan, anggaran, & pledge
        'ministry_management',    // Manajemen pelayanan & relawan (volunteer)
        'bulk_messaging',         // Kirim pesan masal (WhatsApp/Email)
        'facility_management',    // Peminjaman ruangan & manajemen fasilitas
        'digital_ministry',       // Khotbah digital & buletin online
        'priority_support',       // Dukungan prioritas 24/7
      ]
    },
    {
      name: 'Enterprise',
      price_monthly: 599000,
      price_yearly: 5990000,
      max_members: null,
      max_users: null,
      max_storage_gb: null,
      features: [
        // All Pro features
        'member_directory',
        'attendance_tracking',
        'basic_reporting',
        'announcements',
        'event_management',
        'small_groups',
        'pastoral_care',
        'document_library',
        'advanced_reporting',
        'online_giving',
        'finance_advanced',
        'ministry_management',
        'bulk_messaging',
        'facility_management',
        'digital_ministry',
        // Enterprise-only
        'newsletter',             // Newsletter & buletin email terjadwal
        'mobile_app_integration', // Aplikasi mobile Eklesia untuk jemaat
        'api_access',             // Akses API untuk integrasi sistem eksternal
        'custom_domain',          // Domain kustom untuk website gereja
        'dedicated_manager',      // Dedicated account manager
        'sso_authentication',     // Autentikasi SSO (Single Sign-On)
      ]
    }
  ];

  console.log('Starting seed for subscription plans...');

  for (const plan of plans) {
    console.log(`Upserting plan: ${plan.name}`);
    
    await prisma.$executeRaw`
      INSERT INTO plans (id, name, price_monthly, price_yearly, max_members, max_users, max_storage_gb, features, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${plan.name}, 
        ${plan.price_monthly}, 
        ${plan.price_yearly}, 
        ${plan.max_members}, 
        ${plan.max_users}, 
        ${plan.max_storage_gb}, 
        ${JSON.stringify(plan.features)}::jsonb,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (name) DO UPDATE SET
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        max_members = EXCLUDED.max_members,
        max_users = EXCLUDED.max_users,
        max_storage_gb = EXCLUDED.max_storage_gb,
        features = EXCLUDED.features,
        updated_at = CURRENT_TIMESTAMP
    `;
  }
  
  console.log('Seed plans completed!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
