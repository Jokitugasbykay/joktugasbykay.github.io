export const API_ENDPOINTS = {
    AUTH_VERIFY: '/api/digital-store/auth-verify',
    PRODUCTS: '/api/digital-store/products',
    CHECKOUT: '/api/digital-store/checkout',
    ORDER_STATUS: '/api/digital-store/order',
};
export const formatRupiah = (amount) => {
    return 'Rp ' + amount.toLocaleString('id-ID');
};
export const DEFAULT_CATEGORIES = [
    { id: 'unggulan', t: 'Produk Unggulan', d: 'Pilihan yang paling sering dibuka', hue: 230 },
    { id: 'ai', t: 'AI & Premium Apps', d: 'Aplikasi premium untuk kerja dan belajar', hue: 255 },
    { id: 'kreatif', t: 'Kreativitas & Editing', d: 'Desain dan video tanpa ribet', hue: 285 },
    { id: 'game', t: 'Top Up Game', d: 'Diamond, voucher, dan koin', hue: 212 },
    { id: 'sosmed', t: 'Social Media Services', d: 'Layanan untuk akun sosial', hue: 240 },
    { id: 'ebook', t: 'E-book & Digital Assets', d: 'Template dan aset siap pakai', hue: 268 },
];
const createProduct = (c, n, pv, ds, pr, st, extra = {}) => ({
    c,
    n,
    pv,
    ds,
    pr,
    st,
    ...extra,
});
export const SAMPLE_PRODUCTS = [
    createProduct('unggulan', 'Contoh Produk A', 'Penyedia contoh', 'Deskripsi singkat produk unggulan untuk keperluan desain.', 25000, 12, { old: 35000, slug: 'contoh-produk-a' }),
    createProduct('unggulan', 'Contoh Produk B dengan Nama yang Cukup Panjang', 'Penyedia contoh', 'Teks panjang diuji agar kartu tetap rapi dan tinggi sejajar.', 50000, 5, { slug: 'contoh-produk-b' }),
    createProduct('unggulan', 'Contoh Produk C', 'Penyedia contoh', 'Produk yang sedang tidak tersedia.', 15000, 0, { slug: 'contoh-produk-c' }),
    createProduct('unggulan', 'Contoh Produk D', 'Penyedia contoh', 'Deskripsi singkat produk.', 99000, 30, { old: 120000, slug: 'contoh-produk-d' }),
    createProduct('unggulan', 'Contoh Produk E', 'Penyedia contoh', 'Deskripsi singkat produk.', 45000, 8, { slug: 'contoh-produk-e' }),
    createProduct('ai', 'Contoh Langganan AI 1', 'Aplikasi AI', 'Akses premium bulanan, data contoh.', 75000, 20, { slug: 'contoh-langganan-ai-1' }),
    createProduct('ai', 'Contoh Langganan AI 2', 'Aplikasi AI', 'Paket premium dengan masa aktif 1 bulan.', 120000, 6, { old: 150000, slug: 'contoh-langganan-ai-2' }),
    createProduct('ai', 'Contoh Aplikasi Produktivitas', 'Aplikasi', 'Catatan, dokumen, dan kolaborasi.', 60000, 0, { slug: 'contoh-aplikasi-produktivitas' }),
    createProduct('ai', 'Contoh Aplikasi Riset', 'Aplikasi AI', 'Bantu cari dan rangkum sumber.', 90000, 14, { slug: 'contoh-aplikasi-riset' }),
    createProduct('kreatif', 'Contoh Desain Pro', 'Desain', 'Lisensi desain bulanan, data contoh.', 55000, 9, { slug: 'contoh-desain-pro' }),
    createProduct('kreatif', 'Contoh Editor Video', 'Video', 'Paket editing video untuk kreator.', 65000, 11, { old: 80000, slug: 'contoh-editor-video' }),
    createProduct('kreatif', 'Contoh Musik Bebas Royalti', 'Audio', 'Pustaka musik untuk konten.', 40000, 25, { slug: 'contoh-musik-bebas-royalti' }),
    createProduct('game', 'Contoh Top Up 100', 'Game A', 'Isi ulang cepat, data contoh.', 15000, 99, { slug: 'contoh-top-up-100' }),
    createProduct('game', 'Contoh Top Up 500', 'Game A', 'Paket menengah, data contoh.', 70000, 99, { old: 78000, slug: 'contoh-top-up-500' }),
    createProduct('game', 'Contoh Voucher Game', 'Game B', 'Voucher digital, data contoh.', 50000, 0, { slug: 'contoh-voucher-game' }),
    createProduct('game', 'Contoh Koin Game', 'Game C', 'Koin permainan, data contoh.', 30000, 40, { slug: 'contoh-koin-game' }),
    createProduct('sosmed', 'Contoh Layanan Sosmed 1', 'Layanan', 'Layanan akun, data contoh.', 20000, 50, { slug: 'contoh-layanan-sosmed-1' }),
    createProduct('sosmed', 'Contoh Layanan Sosmed 2', 'Layanan', 'Layanan akun, data contoh.', 35000, 50, { slug: 'contoh-layanan-sosmed-2' }),
];
export const DEFAULT_HERO_SLIDES = [
    {
        c: 's0',
        l: 'Promo contoh',
        h: 'Semua kebutuhan digitalmu, di satu tempat.',
        p: 'Temukan aplikasi premium, kebutuhan gaming, dan produk digital pilihanmu.',
        a: 'Jelajahi Produk',
        b: 'Lihat Kategori',
        art: ['AI', 'Pro', '>'],
    },
    {
        c: 's1',
        l: 'Contoh banner',
        h: 'Aplikasi premium untuk kerja dan belajar.',
        p: 'Langganan AI dan aplikasi produktivitas dalam satu katalog.',
        a: 'Lihat AI & Premium Apps',
        art: ['AI', 'P', '='],
    },
    {
        c: 's2',
        l: 'Contoh banner',
        h: 'Top up game lebih cepat dan rapi.',
        p: 'Pilih game, pilih nominal, selesaikan pesanan.',
        a: 'Lihat Top Up Game',
        b: 'Semua Kategori',
        art: ['+', '$', '*'],
    },
];
