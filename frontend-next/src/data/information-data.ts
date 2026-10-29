import { AboutSection, AnnouncementItem, ChangelogItem, OperationalStep, SystemStatusItem, UpdateItem } from '../types/information';

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    number: '01',
    id: 'info-about',
    title: 'Tentang Kami',
    content:
      'JOKI.IN membantu mahasiswa memenuhi kebutuhan tugas melalui layanan yang dapat dipilih sesuai kebutuhan. Anda dapat mengirim detail tugas, berkonsultasi dengan admin, dan memantau pesanan melalui website.',
  },
  {
    number: '02',
    id: 'info-why',
    title: 'Mengapa JOKI.IN?',
    content:
      'Pilihan layanan dan harga tersedia di website, detail kebutuhan dicatat saat pemesanan, dan status pembayaran serta pengerjaan dapat dilacak. Admin dapat dihubungi untuk membahas kebutuhan sebelum Anda memesan.',
  },
  {
    number: '03',
    id: 'info-revision',
    title: 'Garansi & Revisi',
    content:
      'Jika hasil tugas belum sesuai detail yang disepakati, hubungi admin dengan nomor pesanan dan catatan perbaikan. Cakupan, batas waktu, dan biaya revisi dikonfirmasi bersama admin sesuai layanan. Perubahan topik atau tambahan kebutuhan di luar pesanan awal perlu disepakati kembali.',
  },
  {
    number: '04',
    id: 'info-terms',
    title: 'Syarat & Ketentuan',
    content:
      'Pastikan detail tugas, lampiran, tenggat, dan kontak yang dikirim sudah benar. Periksa layanan serta total biaya sebelum membayar. Perubahan pesanan, pembatalan, dan permintaan pengembalian dana perlu dikonfirmasi dengan admin sesuai kondisi pesanan. Gunakan hasil layanan secara bertanggung jawab dan sesuai aturan institusi Anda.',
  },
  {
    number: '05',
    id: 'info-privacy',
    title: 'Kebijakan Privasi',
    content:
      'Data yang Anda kirim, seperti nama, NIM jika diisi, Gmail, nomor WhatsApp, detail tugas, dan lampiran, digunakan untuk memproses pesanan, menghubungi Anda, dan mengirim hasil tugas. Pemrosesan pesanan menggunakan layanan penyimpanan dan pembayaran terkait, termasuk Supabase, Google Drive, dan Mayar. Jangan mengirim kata sandi atau data sensitif yang tidak diperlukan. Hubungi admin untuk pertanyaan atau permintaan terkait data pribadi.',
  },
];

export const UPDATES_DATA: UpdateItem[] = [
  {
    id: 'update-1',
    date: '29 September 2026',
    title: 'Invoice Otomatis & Pembaruan Mobile',
    desc: 'Invoice tersedia di Detail Pesanan setelah pembayaran Paid dan dapat dicetak atau disimpan sebagai PDF. Tampilan promo mobile, tombol rekomendasi, dan navigasi popup diperbarui.',
    type: 'FITUR BARU',
    badgeClass: 'badge-feature',
  },
  {
    id: 'update-2',
    date: '14 September 2026',
    title: 'Pembaruan Proses Pemesanan',
    desc: 'Alur pemesanan diperbarui agar pemilihan layanan, pengisian detail, pembayaran, dan pelacakan pesanan lebih jelas. Rekomendasi produk kini juga dapat bergeser otomatis untuk memudahkan melihat pilihan layanan.',
    type: 'UPDATE TERBARU',
    badgeClass: 'badge-feature',
  },
  {
    id: 'update-3',
    date: '13 September 2026',
    title: 'Penyegaran Tampilan JOKI.IN',
    desc: 'Banner kini menyesuaikan mode terang dan gelap, visual welcome popup diperbarui, dan tampilan header dirapikan. Warna harga layanan juga dibuat hijau agar lebih mudah terbaca.',
    type: 'UPDATE TERBARU',
    badgeClass: 'badge-feature',
  },
  {
    id: 'update-4',
    date: '11 September 2026',
    title: 'Penambahan Fitur Mode Gelap',
    desc: 'Website JOKI.IN kini mendukung mode gelap (Dark Mode) untuk memberikan kenyamanan membaca saat malam hari. Aktifkan melalui ikon bulan/matahari di sudut kanan atas.',
    type: 'FITUR BARU',
    badgeClass: 'badge-feature',
  },
  {
    id: 'update-5',
    date: '10 September 2026',
    title: 'Perbaikan Fitur Lacak Pesanan',
    desc: 'Telah dilakukan perbaikan (Bug Fix) pada sistem pelacakan pesanan. Kini list pesanan akan otomatis muncul dengan lebih cepat dan akurat setelah memasukkan Order ID.',
    type: 'BUG FIX',
    badgeClass: 'badge-bug',
  },
  {
    id: 'update-6',
    date: '08 September 2026',
    title: 'Pembaruan Sistem Pemesanan',
    desc: 'Sistem pemesanan JOKI.IN telah diperbarui untuk memberikan proses order yang lebih sederhana dan cepat bagi mahasiswa.',
    type: 'UPDATE',
    badgeClass: 'badge-update',
  },
  {
    id: 'update-7',
    date: '07 September 2026',
    title: 'Jam Operasional Layanan',
    desc: 'Admin JOKI.IN tersedia untuk membantu konsultasi dan pemesanan pada jam operasional 08:00 - 22:00 WIB.',
    type: 'INFO',
    badgeClass: 'badge-info',
  },
  {
    id: 'update-8',
    date: '05 September 2026',
    title: 'Peluncuran Fitur Status Pesanan',
    desc: 'Sekarang pengguna dapat memantau status pesanan secara mandiri dengan lebih mudah langsung dari halaman website.',
    type: 'FITUR BARU',
    badgeClass: 'badge-feature',
  },
];

export const ANNOUNCEMENTS_DATA: AnnouncementItem[] = [
  {
    id: 'announce-1',
    date: '06 September 2026',
    title: 'Perubahan Jam Layanan Weekend',
    desc: 'Pada hari Sabtu dan Minggu, waktu respons admin dapat mengalami sedikit keterlambatan. Silakan lakukan pemesanan lebih awal untuk menghindari antrean pengerjaan.',
    type: 'PENTING',
    badgeClass: 'badge-urgent',
  },
];

export const CHANGELOG_DATA: ChangelogItem[] = [
  { id: 'ch-1', date: '11 Sep 2026', desc: 'Penambahan fitur Mode Gelap (Dark Mode).' },
  { id: 'ch-2', date: '10 Sep 2026', desc: 'Perbaikan bug pada fitur Lacak Pesanan.' },
  { id: 'ch-3', date: '08 Sep 2026', desc: 'Pembaruan UI dan sistem pemesanan.' },
  { id: 'ch-4', date: '05 Sep 2026', desc: 'Penambahan fitur Lacak Pesanan dan Status Pesanan.' },
  { id: 'ch-5', date: '01 Sep 2026', desc: 'Penyempurnaan tampilan mobile responsive.' },
  { id: 'ch-6', date: '28 Agu 2026', desc: 'Pembaruan daftar FAQ dan Bantuan.' },
];

export const SYSTEM_STATUS_DATA: SystemStatusItem[] = [
  { name: 'Website', status: 'Normal' },
  { name: 'Pemesanan', status: 'Normal' },
  { name: 'Pembayaran', status: 'Normal' },
  { name: 'Lacak Pesanan', status: 'Normal' },
  { name: 'Google Drive', status: 'Aktif', color: 'var(--primary)', dotColor: 'var(--primary)' },
];

export const OPERATIONAL_STEPS_DATA: OperationalStep[] = [
  { step: 1, text: 'Konsultasikan kebutuhan' },
  { step: 2, text: 'Tentukan layanan' },
  { step: 3, text: 'Konfirmasi detail tugas' },
  { step: 4, text: 'Pembayaran' },
  { step: 5, text: 'Pembayaran diverifikasi' },
  { step: 6, text: 'Pesanan diproses' },
  { step: 7, text: 'Sedang dikerjakan' },
  { step: 8, text: 'Tugas selesai' },
  { step: 9, text: 'Pesanan selesai', highlight: true },
];
