import type { CatalogProduct } from '@/types/catalog';

export const PRODUCTS: CatalogProduct[] = [
                {
                    id: "makalah", icon: "📄", image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=900&q=80", title: "Jasa Makalah", category: "Akademik", popularity: 8,
                    requiresDriveLink: true,
                    desc: "Pendampingan penyusunan makalah yang rapi dan terstruktur.",
                    benefits: ["Struktur makalah yang jelas", "Formatting dan layout rapi", "Penyesuaian sesuai ketentuan", "Referensi dan daftar pustaka", "Revisi sesuai kesepakatan"],
                    target: "Mahasiswa yang membutuhkan bantuan penyusunan dan formatting makalah.",
                    notIncluded: ["Riset data primer", "Wawancara lapangan"],
                    estimatedTime: "1 Hari Kerja", revisionTerms: "Maksimal 2x Revisi Minor",
                    price: "Rp2.000 / lembar · min. 10 lembar", priceNum: 2000, features: ["Pengetikan", "Formatting", "Layout", "Revisi sesuai ketentuan"]
                },
                {
                    id: "ppt", icon: "📊", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80", title: "Desain PPT", category: "Desain", popularity: 9,
                    requiresDriveLink: true,
                    desc: "Presentasi yang lebih rapi, menarik, dan mudah dipahami.",
                    benefits: ["Desain slide profesional", "Layout konsisten", "Penyesuaian materi", "Visualisasi informasi", "File PPT siap digunakan", "Revisi sesuai kesepakatan"],
                    target: "Presentasi tugas kuliah, seminar, proposal, dan kebutuhan akademik lainnya.",
                    notIncluded: ["Pembuatan materi dari nol", "Animasi kompleks/Video 3D"],
                    estimatedTime: "1 Hari Kerja", revisionTerms: "Maksimal 2x Revisi",
                    price: "Mulai dari Rp10.000", priceNum: 10000, features: ["Desain slide", "Layout", "Penyesuaian materi"]
                },
                {
                    id: "poster", icon: "🎨", image: "https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=900&q=80", title: "Desain Poster", category: "Desain", popularity: 7,
                    requiresDriveLink: true,
                    desc: "Desain visual yang disesuaikan dengan kebutuhan dan identitas acara.",
                    benefits: ["Desain custom", "Penyesuaian ukuran", "Layout profesional", "Pemilihan visual", "File final siap digunakan", "Revisi sesuai kesepakatan"],
                    target: "Keperluan event, kampanye, organisasi, dan tugas visual.",
                    notIncluded: ["Pencetakan fisik", "Fotografi produk"],
                    estimatedTime: "1 Hari Kerja", revisionTerms: "Maksimal 2x Revisi",
                    price: "Mulai dari Rp45.000", priceNum: 45000, features: ["Desain custom", "Revisi", "File final"]
                },
                {
                    id: "pembuatan-cv", icon: "📄", image: "/assets/catalog/portfolio-03.jpg", title: "Pembuatan CV", category: "Desain", popularity: 8,
                    requiresDriveLink: false,
                    desc: "Jasa pembuatan CV profesional, menarik, dan ATS-friendly untuk kebutuhan magang, kerja, atau beasiswa.",
                    benefits: ["Format ATS-friendly", "Desain modern & profesional", "Penataan layout terstruktur", "Optimasi kata kunci (keyword)", "File PDF & Word siap pakai", "Revisi sesuai kesepakatan"],
                    target: "Mahasiswa & fresh graduate untuk kebutuhan magang, lamaran kerja, atau beasiswa.",
                    notIncluded: ["Penulisan portofolio kompleks", "Desain video CV"],
                    estimatedTime: "1 Hari Kerja", revisionTerms: "Maksimal 2x Revisi",
                    price: "Rp10.000", priceNum: 10000, features: ["ATS-Friendly", "Desain Modern", "File PDF & Word"]
                },
                {
                    id: "editing", icon: "✍️", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80", title: "Edit & Revisi Karya Ilmiah", category: "Editing", popularity: 6,
                    requiresDriveLink: true,
                    desc: "Penyuntingan kata dan kalimat, revisi, serta perapian struktur dan format dokumen karya ilmiah.",
                    benefits: ["Penyuntingan kata dan kalimat", "Perbaikan ejaan dan typo", "Revisi sesuai catatan yang disepakati", "Perapian struktur karya ilmiah", "Penyesuaian format dokumen", "Pemeriksaan akhir dokumen"],
                    target: "Makalah, artikel ilmiah, laporan, dan skripsi yang sudah memiliki naskah dan membutuhkan penyuntingan.",
                    notIncluded: ["Penerjemahan", "Penulisan ulang secara drastis"],
                    estimatedTime: "1 Hari Kerja", revisionTerms: "Maksimal 1x Revisi",
                    price: "Mulai dari Rp60.000", priceNum: 60000, features: ["Formatting", "Perapian", "Proofreading"]
                },
                {
                    id: "skripsi", icon: "📚", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80", title: "Bantuan Skripsi", category: "Penelitian", popularity: 10,
                    requiresDriveLink: true,
                    desc: "Konsultasi dan pendampingan formatting untuk tugas akhir mahasiswa.",
                    benefits: ["Bantuan formatting", "Perapian struktur dokumen", "Pendampingan penyusunan", "Bantuan daftar isi otomatis", "Penyesuaian sitasi/referensi", "Review format"],
                    target: "Mahasiswa tingkat akhir yang butuh pendampingan format dan struktur.",
                    notIncluded: ["Mengerjakan skripsi secara penuh", "Pengolahan SPSS"],
                    estimatedTime: "Fleksibel", revisionTerms: "Sesuai kesepakatan",
                    price: "Mulai dari Rp20.000", priceNum: 20000, features: ["Daftar isi otomatis", "Daftar pustaka", "Bantuan pengolahan"]
                },
                {
                    id: "turnitin", icon: "🔎", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80", title: "Cek Turnitin", category: "Pengecekan", popularity: 11,
                    requiresDriveLink: true,
                    desc: "Pengecekan similarity untuk karya ilmiah dengan proses cepat.",
                    benefits: ["Pemeriksaan similarity", "Laporan hasil pengecekan", "Informasi persentase", "Identifikasi bagian plagiasi", "Hasil PDF dikirim ke customer"],
                    target: "Pengecekan plagiasi sebelum submit tugas atau karya ilmiah.",
                    notIncluded: ["Jasa penurunan persentase (parafrase)"],
                    estimatedTime: "1-2 Jam", revisionTerms: "Tidak ada revisi",
                    price: "Rp10.000", priceNum: 10000, features: ["Cek Plagiasi", "File PDF Hasil", "Proses Cepat"]
                },
                {
                    id: "artikel", icon: "📝", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80", title: "Jasa Artikel", category: "Penulisan", popularity: 5,
                    requiresDriveLink: true,
                    desc: "Jasa pembuatan artikel populer atau tugas artikel sesuai tema.",
                    benefits: ["Riset materi dasar", "Penulisan terstruktur", "Bebas plagiasi", "Sesuai gaya bahasa", "Revisi minor"],
                    target: "Tugas artikel bebas, artikel blog, dan konten teks lainnya.",
                    notIncluded: ["Publikasi ke media massa"],
                    estimatedTime: "1-2 Hari Kerja", revisionTerms: "Maksimal 1x Revisi",
                    price: "Rp8.000 / lembar", priceNum: 8000, features: ["Riset Materi", "Bebas Plagiasi", "Revisi Minor"]
                },
                {
                    id: "jurnal", icon: "📑", image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=900&q=80", title: "Bantuan Jurnal", category: "Penelitian", popularity: 4,
                    requiresDriveLink: true,
                    desc: "Pendampingan review jurnal dan penyesuaian format template.",
                    benefits: ["Penyesuaian template jurnal", "Pengecekan struktur", "Bantuan review literatur", "Kualitas format akademik"],
                    target: "Persiapan submit jurnal akademik tingkat mahasiswa.",
                    notIncluded: ["Penulisan jurnal dari nol", "Jaminan *Accepted*"],
                    estimatedTime: "1-2 Hari Kerja", revisionTerms: "Maksimal 2x Revisi",
                    price: "Mulai dari Rp80.000", priceNum: 80000, features: ["Format Standar", "Riset Mendalam", "Kualitas Akademik"]
                },
                {
                    id: "gemini-pro-18-bulan", title: "Gemini Pro 18 Bulan", category: "Digital", popularity: 10, icon: "✨",
                    image: "/assets/catalog/gemini-pro.png",
                    reviewImage: "/assets/ui-art/gemini.png",
                    desc: "Akses penuh Gemini Advanced 18 bulan, Garansi selama 1 minggu, Akun pribadi siap pakai",
                    benefits: ["Akses penuh Gemini Advanced 18 bulan", "Garansi selama 1 minggu", "Akun pribadi siap pakai"],
                    target: "Mahasiswa dan pengguna yang membutuhkan AI asisten akademik premium.",
                    notIncluded: [],
                    estimatedTime: "Instan (10-30 Menit)", revisionTerms: "Garansi selama 1 minggu",
                    price: "Rp 20.000", priceNum: 20000, originalPrice: 50000, hasSale: true, salePercent: 60,
                    features: ["Gemini Advanced", "Garansi 1 Minggu", "Akun Pribadi"],
                    batasBeli: 1, batas_beli_per_orang: 1, isLimitedEdition: true,
                    _isBannerOnly: true
                }
            ];

export const CATEGORIES = [
  { id: 'Semua', name: 'Semua' },
  { id: 'Akademik', name: 'Akademik' },
  { id: 'Desain', name: 'Desain' },
  { id: 'Editing', name: 'Editing' },
  { id: 'Penelitian', name: 'Penelitian' },
  { id: 'Pengecekan', name: 'Pengecekan' },
  { id: 'Penulisan', name: 'Penulisan' }
];

export const ORDER_STEPS = [
  { num: "01", title: "Pilih Layanan", desc: "Pilih layanan sesuai kebutuhan." },
  { num: "02", title: "Kirim Detail", desc: "Selesaikan pesanan via Checkout." },
  { num: "03", title: "Pembayaran", desc: "Lakukan pembayaran pesanan." },
  { num: "04", title: "Pengerjaan", desc: "Pesanan dikerjakan tim." },
  { num: "05", title: "Selesai", desc: "File akhir dikirim." }
];

export const FAQ_ITEMS = [
  { q: "Apakah bisa pesan tanpa login?", a: "Ya. JOKI.IN mendukung checkout sebagai tamu. Kamu tidak wajib membuat akun untuk melakukan pemesanan." },
  { q: "Bagaimana cara memesan layanan?", a: "Pilih layanan -> klik Checkout atau Tambah ke Keranjang -> isi detail tugas -> pilih pembayaran -> lakukan pembayaran." },
  { q: "Apa perbedaan Checkout dan Keranjang?", a: "Checkout langsung hanya membeli layanan yang dipilih. Keranjang digunakan untuk mengumpulkan beberapa layanan sebelum checkout." },
  { q: "Bagaimana cara melihat status pesanan?", a: "Klik tombol \"Pesanan Saya\" pada header. Customer dapat melihat status: Pending Order -> Sedang Dikerjakan -> Selesai." },
  { q: "Berapa lama pengerjaan tugas?", a: "Estimasi pengerjaan ditampilkan pada detail pesanan dan dapat berbeda tergantung jenis layanan dan tingkat kesulitan tugas." },
  { q: "Bagaimana cara mengirim file tugas?", a: "Pada bagian Detail Tugas saat checkout, customer dapat memberikan keterangan dan link Google Drive yang berisi file tugas." },
  { q: "Apakah pembayaran langsung dikonfirmasi?", a: "Setelah pembayaran berhasil, sistem mencatat order dan menampilkan status pembayaran/order." },
  { q: "Bagaimana jika ingin bertanya kepada admin?", a: "Customer dapat menghubungi admin melalui WhatsApp." },
  { q: "Apakah bisa melakukan revisi?", a: "Revisi mengikuti ketentuan masing-masing layanan. Detail ketentuan ditampilkan pada informasi layanan." }
];

export const REVIEWS = [
  { id: "REV-1", name: "Rizky A.", university: "Universitas Indonesia", service: "Jasa Makalah", rating: 5, date: "2026-09-28", review: "Pengerjaan cepat banget, cuma 1 hari selesai dan hasilnya rapi sesuai format kampus. Rekomen!" },
  { id: "REV-2", name: "Nadya P.", university: "Universitas Gadjah Mada", service: "Desain PPT", rating: 5, date: "2026-09-27", review: "PPT seminarku dapet pujian dari dosen penguji karena desainnya visual dan informatif. Makasih JOKI.IN!" },
  { id: "REV-3", name: "Dimas S.", university: "Institut Teknologi Bandung", service: "Cek Turnitin", rating: 5, date: "2026-09-25", review: "Cek Turnitin resmi tanpa filter repository, no repo 100%. Hasil keluar dalam hitungan menit." },
  { id: "REV-4", name: "Fathir M.", university: "Universitas Brawijaya", service: "Bantuan Skripsi", rating: 5, date: "2026-09-24", review: "Revisi bab 4 dan 5 dibantu sampai tuntas dan acc. Sangat membantu mahasiswa akhir!" }
];
