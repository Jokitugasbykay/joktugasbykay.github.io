import type { CatalogProduct, CatalogCategory, OrderStep, TestimonialReview } from '@/types/catalog';

export const CATEGORIES: CatalogCategory[] = [
  { id: 'semua', name: 'Semua Layanan' },
  { id: 'Akademik', name: 'Akademik & Makalah' },
  { id: 'Desain', name: 'Desain & PPT' },
  { id: 'Penelitian', name: 'Skripsi & Jurnal' },
  { id: 'Pengecekan', name: 'Cek Turnitin' },
  { id: 'Editing', name: 'Editing & Revisi' },
  { id: 'Penulisan', name: 'Penulisan Artikel' }
];

export const PRODUCTS: CatalogProduct[] = [
  {
    id: 'makalah',
    title: 'Jasa Makalah',
    category: 'Akademik',
    price: 'Rp2.000 / lembar (min. 10 lembar)',
    priceNum: 2000,
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=900&q=80',
    desc: 'Pendampingan penyusunan makalah yang rapi, terstruktur, dan disesuaikan dengan panduan kampus.',
    benefits: ['Struktur makalah jelas & logis', 'Formatting & layout standar akademik', 'Referensi & sitasi valid', 'Garansi revisi minor'],
    features: ['Pengetikan', 'Formatting', 'Layout', 'Daftar Pustaka'],
    estimatedTime: '1-2 Hari Kerja',
    revisionTerms: 'Maksimal 2x Revisi Minor',
    popularity: 9
  },
  {
    id: 'ppt',
    title: 'Desain PPT',
    category: 'Desain',
    price: 'Rp5.000 / slide',
    priceNum: 5000,
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80',
    desc: 'Slide presentasi modern, estetik, dan komunikatif untuk seminar, proposal, atau tugas kelompok.',
    benefits: ['Desain slide profesional', 'Infografis & visual menarik', 'Animasi & transisi halus', 'File PPT siap presentasi'],
    features: ['Master Slide', 'Visual Hierarchy', 'Icons & Graphic Assets', 'Export PDF/PPTX'],
    estimatedTime: '1 Hari Kerja',
    revisionTerms: 'Revisi minor sepuasnya',
    popularity: 10
  },
  {
    id: 'skripsi',
    title: 'Bantuan Skripsi & Proposal',
    category: 'Penelitian',
    price: 'Mulai dari Rp50.000 / bab',
    priceNum: 50000,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
    desc: 'Bimbingan dan penyusunan proposal penelitian, bab 1 sampai 5, serta pengolahan data statistik.',
    benefits: ['Metodologi penelitian tepat', 'Pembahasan mendalam', 'Format panduan kampus', 'Bimbingan privat via WA'],
    features: ['Bab 1-3 Proposal', 'Bab 4-5 Pembahasan', 'Analisis Data', 'Jurnal Rujukan'],
    estimatedTime: '3-7 Hari Kerja',
    revisionTerms: 'Garansi sampai acc dosen',
    popularity: 10
  },
  {
    id: 'turnitin',
    title: 'Cek Turnitin Resmi',
    category: 'Pengecekan',
    price: 'Rp5.000 / file',
    priceNum: 5000,
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80',
    desc: 'Cek persentase plagiarisme Turnitin No Repository (aman tanpa tersimpan di database).',
    benefits: ['No Repository 100% aman', 'Hasil cepat dalam 5-15 menit', 'Laporan PDF lengkap per kalimat', 'Konsultasi penurunan skor'],
    features: ['Filter exclude quote', 'Filter exclude biblio', 'Laporan PDF resmi'],
    estimatedTime: '15 Menit',
    revisionTerms: 'Hasil cek akurat',
    popularity: 8
  },
  {
    id: 'editing',
    title: 'Edit & Parafrase Ilmiah',
    category: 'Editing',
    price: 'Rp3.000 / halaman',
    priceNum: 3000,
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
    desc: 'Parafrase manual untuk menurunkan skor Turnitin dan perbaikan tata bahasa baku sesuai KBBI.',
    benefits: ['Parafrase murni manusia (bukan AI)', 'Skor plagiasi turun drastis', 'Gaya bahasa akademis baku', 'Pengecekan typo dan ejaan'],
    features: ['Parafrase Manual', 'Cek Ejaan KBBI', 'Formatting Margin & Font'],
    estimatedTime: '1-2 Hari Kerja',
    revisionTerms: 'Garansi lolos batas Turnitin',
    popularity: 9
  },
  {
    id: 'pembuatan-cv',
    title: 'Pembuatan CV & Portfolio',
    category: 'Desain',
    price: 'Rp25.000 / desain',
    priceNum: 25000,
    image: '/assets/catalog/portfolio-03.jpg',
    desc: 'CV ATS-Friendly dan CV Kreatif untuk magang, beasiswa, maupun melamar kerja.',
    benefits: ['Format ATS-friendly terbaca sistem', 'Desain modern & rapi', 'Penataan kata kunci profesional', 'File editable DOCX & PDF'],
    features: ['Template ATS', 'Konsultasi Pengalaman', 'File Siap Kirim'],
    estimatedTime: '1 Hari Kerja',
    revisionTerms: '2x Revisi',
    popularity: 7
  },
  {
    id: 'artikel',
    title: 'Jasa Artikel & Opini',
    category: 'Penulisan',
    price: 'Rp15.000 / artikel',
    priceNum: 15000,
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
    desc: 'Penulisan artikel ilmiah populer, esai beasiswa, dan tugas review bacaan.',
    benefits: ['Tulisan orisinal tanpa plagiasi', 'Alur argumen kuat & runtut', 'Rujukan artikel kredibel', 'Gaya bahasa mengalir'],
    features: ['Esai Beasiswa', 'Artikel Populer', 'Review Jurnal'],
    estimatedTime: '1-2 Hari Kerja',
    revisionTerms: '2x Revisi',
    popularity: 6
  },
  {
    id: 'poster',
    title: 'Desain Poster Ilmiah',
    category: 'Desain',
    price: 'Rp30.000 / poster',
    priceNum: 3000,
    image: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=900&q=80',
    desc: 'Desain poster ilmiah untuk seminar nasional, konferensi, infografis tugas, atau expo kampus.',
    benefits: ['Format resolusi tinggi siap cetak', 'Tata letak hierarki visual jelas', 'Warna serasi sesuai tema', 'File mentah AI/PSD/PDF'],
    features: ['Ukuran A1/A2/A3/A4', 'Infografis Data', 'Export High Res'],
    estimatedTime: '1-2 Hari Kerja',
    revisionTerms: 'Revisi sampai fix',
    popularity: 7
  },
  {
    id: 'jurnal',
    title: 'Bantuan Publikasi Jurnal',
    category: 'Penelitian',
    price: 'Mulai dari Rp75.000',
    priceNum: 75000,
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=900&q=80',
    desc: 'Konversi skripsi menjadi manuskrip jurnal nasional SINTA atau internasional terindeks.',
    benefits: ['Template sesuai target jurnal', 'Penyusunan abstrak bilingual', 'Sitasi Mendeley / Zotero', 'Bantuan proses submit'],
    features: ['Konversi Skripsi ke Jurnal', 'Formatting Author Guidelines', 'Daftar Pustaka Otomatis'],
    estimatedTime: '3-5 Hari Kerja',
    revisionTerms: 'Garansi revisi reviewer',
    popularity: 8
  }
];

export const ORDER_STEPS: OrderStep[] = [
  { num: 1, title: 'Konsultasikan Kebutuhan', desc: 'Pilih layanan yang sesuai dan isi form detail tugas Anda.' },
  { num: 2, title: 'Konfirmasi & Estimasi', desc: 'Admin akan memeriksa rincian tugas dan memberikan konfirmasi biaya.' },
  { num: 3, title: 'Pembayaran Aman', desc: 'Bayar via QRIS atau transfer instan yang terverifikasi otomatis oleh Mayar.' },
  { num: 4, title: 'Pengerjaan & Selesai', desc: 'Tugas dikerjakan tepat waktu dan hasil dikirimkan lengkap dengan garansi revisi.' }
];

export const REVIEWS: TestimonialReview[] = [
  {
    id: 'rev-1',
    name: 'Rizky A.',
    university: 'Universitas Indonesia',
    service: 'Bantuan Skripsi',
    rating: 5,
    date: '28 Oktober 2026',
    review: 'Bantu banget pas revisi bab 4 olah data SPSS. Dosen langsung acc dalam 2 hari!'
  },
  {
    id: 'rev-2',
    name: 'Nadia P.',
    university: 'Universitas Gadjah Mada',
    service: 'Desain PPT',
    rating: 5,
    date: '25 Oktober 2026',
    review: 'Slide presentasi sidang proposalnya estetik dan rapi banget. Penguji muji visualnya.'
  },
  {
    id: 'rev-3',
    name: 'Dimas S.',
    university: 'Institut Teknologi Bandung',
    service: 'Cek Turnitin & Parafrase',
    rating: 5,
    date: '20 Oktober 2026',
    review: 'Skor awal 38% berhasil turun jadi 12%. No repository beneran aman dan terpercaya.'
  },
  {
    id: 'rev-4',
    name: 'Anisa W.',
    university: 'Universitas Brawijaya',
    service: 'Jasa Makalah',
    rating: 5,
    date: '15 Oktober 2026',
    review: 'Makalahnya rapi dan sitasi Mendeley-nya presisi. Sangat membantu pas deadline numpuk.'
  }
];
