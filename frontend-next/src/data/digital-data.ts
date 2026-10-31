import { DigitalCategory, DigitalHeroSlide, DigitalProduct } from '../types/digital';

export const ADMIN_KAYLA_ID = '92e7a1cb-2136-496a-913b-00cd402c04f5';

export const DIGITAL_API_ENDPOINTS = {
  AUTH_VERIFY: '/api/digital-store/auth-verify',
  PRODUCTS: '/api/digital-store/products',
  CHECKOUT: '/api/digital-store/checkout',
  ORDER_STATUS: '/api/digital-store/orders',
} as const;

export const formatRupiah = (amount: number): string => {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
};

export const DEFAULT_DIGITAL_CATEGORIES: DigitalCategory[] = [
  { id: 'unggulan', t: 'Produk Unggulan', d: 'Pilihan yang paling sering dibuka', hue: 230 },
  { id: 'ai', t: 'AI & Premium Apps', d: 'Aplikasi premium untuk kerja dan belajar', hue: 255 },
  { id: 'kreatif', t: 'Kreativitas & Editing', d: 'Desain dan video tanpa ribet', hue: 285 },
  { id: 'game', t: 'Top Up Game', d: 'Diamond, voucher, dan koin', hue: 212 },
  { id: 'sosmed', t: 'Social Media Services', d: 'Layanan untuk akun sosial', hue: 240 },
  { id: 'ebook', t: 'E-book & Digital Assets', d: 'Template dan aset siap pakai', hue: 268 },
];

export const DEFAULT_DIGITAL_HERO_SLIDES: DigitalHeroSlide[] = [
  {
    c: 's0',
    l: 'Promo Spesial Admin',
    h: 'Katalog Produk Digital Terisolasi & Eksklusif',
    p: 'Akses instan lisensi premium, akun edukasi, dan tools riset terbaik khusus Admin Kayla.',
    a: 'Jelajahi Produk',
    b: 'Lihat Kategori',
    art: ['PRO', 'AI', 'PREMIUM'],
  },
  {
    c: 's1',
    l: 'Produktivitas & Riset',
    h: 'AI & Tools Akademik Tingkat Lanjut',
    p: 'Kompilasi langganan riset dan komputasi untuk menunjang kebutuhan tugas dan proyek.',
    a: 'Buka Katalog AI',
    art: ['GPT', 'GEMINI', 'RESEARCH'],
  },
];

export const SAMPLE_DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: '03d664e2-a799-45f8-8952-3e1e1a7efe59',
    c: 'ai',
    n: 'Gemini Pro 18 Bulan',
    pv: 'Google Workspace',
    ds: 'Akses penuh Gemini Advanced 18 bulan dengan penyimpanan cloud terintegrasi.',
    pr: 50000,
    st: 10,
    old: 75000,
    slug: 'gemini-pro-18-bulan',
    is_active: true,
  },
  {
    id: 'ai-chatgpt-plus',
    c: 'ai',
    n: 'ChatGPT Plus Shared Private',
    pv: 'OpenAI',
    ds: 'Akses GPT-4o, browsing web, code analysis, dan image generation berkecepatan tinggi.',
    pr: 45000,
    st: 8,
    old: 60000,
    slug: 'chatgpt-plus-shared',
    is_active: true,
  },
  {
    id: 'kreatif-canva-pro',
    c: 'kreatif',
    n: 'Canva Pro Edu 1 Tahun',
    pv: 'Canva',
    ds: 'Akses fitur brand kit, jutaan aset grafis premium, dan magic resize tanpa watermark.',
    pr: 25000,
    st: 15,
    old: 35000,
    slug: 'canva-pro-edu',
    is_active: true,
  },
  {
    id: 'tools-turnitin-no-repo',
    c: 'ai',
    n: 'Turnitin Akun Instructor No Repository',
    pv: 'Turnitin LLC',
    ds: 'Pengecekan orisinalitas tanpa menyimpan berkas ke database utama (zero repository).',
    pr: 35000,
    st: 5,
    old: 50000,
    slug: 'turnitin-instructor-no-repo',
    is_active: true,
  },
];
