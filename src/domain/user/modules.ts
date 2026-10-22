export interface ModuleDefinition {
  key: string;
  name: string;
  description: string;
  category: 'core' | 'operational' | 'pastoral' | 'management';
}

export const AVAILABLE_MODULES: ModuleDefinition[] = [
  { key: 'dashboard', name: 'Dashboard', description: 'Melihat ringkasan metrik dan statistik jemaat', category: 'core' },
  { key: 'members', name: 'Data Jemaat & KKJ', description: 'Mengelola database anggota, kartu keluarga (KKJ), dan sebaran jemaat', category: 'core' },
  { key: 'small_groups', name: 'Kelompok Kecil', description: 'Mengelola kelompok sel, pertemuan rutin, dan anggota komunitas', category: 'operational' },
  { key: 'attendance', name: 'Absensi & Jadwal Ibadah', description: 'Pencatatan kehadiran jemaat, jadwal ibadah, dan barcode check-in', category: 'operational' },
  { key: 'events', name: 'Acara & Kalender', description: 'Membuat acara gereja, pendaftaran peserta, dan manajemen tiket', category: 'operational' },
  { key: 'communication', name: 'Komunikasi & Pesan', description: 'Kirim pengumuman, email broadcast, dan pesan massal', category: 'operational' },
  { key: 'finance', name: 'Keuangan & Persembahan', description: 'Manajemen kas, pencatatan donasi persembahan, dan anggaran gereja', category: 'management' },
  { key: 'ministry', name: 'Pelayanan & Roster', description: 'Penjadwalan pelayan ibadah, skill database, dan relawan', category: 'operational' },
  { key: 'pastoral', name: 'Pastoral Care & Konseling', description: 'Pencatatan konseling pastoral, kunjungan jemaat, dan pokok doa', category: 'pastoral' },
  { key: 'documents', name: 'Dokumen & Arsip', description: 'Penyimpanan sertifikat baptis/nikah dan berkas digital gereja', category: 'management' },
  { key: 'facility', name: 'Fasilitas & Ruangan', description: 'Peminjaman ruangan, peralatan ibadah, dan jadwal perawatan', category: 'management' },
  { key: 'reports', name: 'Laporan & Analitik', description: 'Akses laporan analitik, tren pertumbuhan, dan rekapitulasi data', category: 'management' },
  { key: 'digital', name: 'Digital & Website', description: 'Pengelolaan khotbah online, buletin digital, dan profil website', category: 'operational' },
  { key: 'users', name: 'Manajemen User Admin', description: 'Menambah admin pengurus dan mengatur hak akses modul per user', category: 'management' },
];

