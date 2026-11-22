import { DigitalCategory, DigitalHeroSlide, DigitalProduct } from '../types/digital';


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
  { id: 'topup', t: 'Top Up Game', d: 'Diamond dan mata uang game', hue: 160 },
  { id: 'voucher', t: 'Voucher & Langganan', d: 'Akun premium dan voucher', hue: 160 },
  { id: 'pulsa', t: 'Pulsa & Data', d: 'Pulsa dan paket internet', hue: 160 },
  { id: 'pln', t: 'PLN & Tagihan', d: 'Token listrik dan pembayaran', hue: 160 },
  { id: 'software', t: 'Software', d: 'Aplikasi dan lisensi digital', hue: 160 },
  { id: 'giftcard', t: 'Gift Card', d: 'Saldo untuk layanan digital', hue: 160 },
  { id: 'lainnya', t: 'Lainnya', d: 'Produk digital lainnya', hue: 160 },
];

export const normalizeDigitalCategory = (value: unknown): string => {
  const category = String(value || '').toLowerCase();
  if (category.includes('top') || category.includes('diamond') || category.includes('game')) return 'topup';
  if (category.includes('voucher') || category.includes('langganan') || category.includes('premium')) return 'voucher';
  if (category.includes('pulsa') || category.includes('data')) return 'pulsa';
  if (category.includes('pln') || category.includes('tagihan') || category.includes('listrik')) return 'pln';
  if (category.includes('software') || category.includes('aplikasi') || category.includes('ai') || category.includes('kreatif')) return 'software';
  if (category.includes('gift') || category.includes('card')) return 'giftcard';
  return 'lainnya';
};

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

export const DEFAULT_DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: 'prod-mlbb-5',
    c: 'topup',
    n: 'Mobile Legends 5 Diamonds',
    pv: 'Mobile Legends',
    ds: 'Top up 5 Diamond Mobile Legends Bang Bang resmi dan instan.',
    pr: 2590,
    st: 999,
    slug: 'mlbb-5-diamonds',
    is_active: true,
  },
  {
    id: 'prod-mlbb-10',
    c: 'topup',
    n: 'Mobile Legends 10 Diamonds',
    pv: 'Mobile Legends',
    ds: 'Top up 10 Diamond Mobile Legends Bang Bang resmi dan hemat (Best Value).',
    pr: 4300,
    st: 999,
    slug: 'mlbb-10-diamonds',
    is_active: true,
    is_limited_edition: true,
  },
  {
    id: 'prod-mlbb-wp',
    c: 'topup',
    n: 'Mobile Legends Weekly Diamond Pass',
    pv: 'Mobile Legends',
    ds: 'Langganan Weekly Diamond Pass Mobile Legends Bang Bang, klaim diamond harian lebih hemat.',
    pr: 32525,
    st: 999,
    slug: 'mlbb-weekly-diamond-pass',
    is_active: true,
  },
  {
    id: 'prod-gi-60',
    c: 'topup',
    n: 'Genshin Impact 60 Genesis Crystal',
    pv: 'Genshin Impact',
    ds: 'Top up 60 Genesis Crystal Genshin Impact ID resmi via UID & Server.',
    pr: 16500,
    st: 999,
    slug: 'genshin-60-genesis-crystal',
    is_active: true,
  },
  {
    id: 'prod-gi-330',
    c: 'topup',
    n: 'Genshin Impact 330 Genesis Crystal',
    pv: 'Genshin Impact',
    ds: 'Top up 330 Genesis Crystal (300 + 30 Bonus) Genshin Impact ID resmi via UID & Server.',
    pr: 81000,
    st: 999,
    slug: 'genshin-330-genesis-crystal',
    is_active: true,
  },
  {
    id: 'prod-gi-1090',
    c: 'topup',
    n: 'Genshin Impact 1090 Genesis Crystal',
    pv: 'Genshin Impact',
    ds: 'Top up 1090 Genesis Crystal (900 + 110 Bonus) Genshin Impact ID resmi via UID & Server.',
    pr: 255000,
    st: 999,
    slug: 'genshin-1090-genesis-crystal',
    is_active: true,
  },
  {
    id: 'prod-gi-2240',
    c: 'topup',
    n: 'Genshin Impact 2240 Genesis Crystal',
    pv: 'Genshin Impact',
    ds: 'Top up 2240 Genesis Crystal (1980 + 260 Bonus) Genshin Impact ID resmi via UID & Server.',
    pr: 489000,
    st: 999,
    slug: 'genshin-2240-genesis-crystal',
    is_active: true,
  },
  {
    id: 'prod-gi-3880',
    c: 'topup',
    n: 'Genshin Impact 3880 Genesis Crystal',
    pv: 'Genshin Impact',
    ds: 'Top up 3880 Genesis Crystal (3280 + 600 Bonus) Genshin Impact ID resmi via UID & Server.',
    pr: 815000,
    st: 999,
    slug: 'genshin-3880-genesis-crystal',
    is_active: true,
  },
  {
    id: 'prod-gi-8080',
    c: 'topup',
    n: 'Genshin Impact 8080 Genesis Crystal',
    pv: 'Genshin Impact',
    ds: 'Top up 8080 Genesis Crystal (6480 + 1600 Bonus) Genshin Impact ID resmi via UID & Server.',
    pr: 1629000,
    st: 999,
    slug: 'genshin-8080-genesis-crystal',
    is_active: true,
  },
  {
    id: 'prod-cn-60',
    c: 'topup',
    n: 'Chronal Nexus 60 (ID)',
    pv: 'Chronal Nexus',
    ds: 'Top up 60 Chronal Nexus ID resmi dan instan.',
    pr: 16500,
    st: 999,
    slug: 'chronal-nexus-60',
    is_active: true,
  },
  {
    id: 'prod-cn-330',
    c: 'topup',
    n: 'Chronal Nexus 330 (300+30) (ID)',
    pv: 'Chronal Nexus',
    ds: 'Top up 330 Chronal Nexus (300 + 30 Bonus) ID resmi dan instan.',
    pr: 81000,
    st: 999,
    slug: 'chronal-nexus-330',
    is_active: true,
  },
  {
    id: 'prod-cn-1090',
    c: 'topup',
    n: 'Chronal Nexus 1090 (900+110) (ID)',
    pv: 'Chronal Nexus',
    ds: 'Top up 1090 Chronal Nexus (900 + 110 Bonus) ID resmi dan instan.',
    pr: 255000,
    st: 999,
    slug: 'chronal-nexus-1090',
    is_active: true,
  },
  {
    id: 'prod-cn-2240',
    c: 'topup',
    n: 'Chronal Nexus 2240 (1980+260) (ID)',
    pv: 'Chronal Nexus',
    ds: 'Top up 2240 Chronal Nexus (1980 + 260 Bonus) ID resmi dan instan.',
    pr: 489000,
    st: 999,
    slug: 'chronal-nexus-2240',
    is_active: true,
  },
  {
    id: 'prod-cn-3880',
    c: 'topup',
    n: 'Chronal Nexus 3880 (3280+600) (ID)',
    pv: 'Chronal Nexus',
    ds: 'Top up 3880 Chronal Nexus (3280 + 600 Bonus) ID resmi dan instan.',
    pr: 815000,
    st: 999,
    slug: 'chronal-nexus-3880',
    is_active: true,
  },
  {
    id: 'prod-cn-8080',
    c: 'topup',
    n: 'Chronal Nexus 8080 (6480+1600) (ID)',
    pv: 'Chronal Nexus',
    ds: 'Top up 8080 Chronal Nexus (6480 + 1600 Bonus) ID resmi dan instan.',
    pr: 1629000,
    st: 999,
    slug: 'chronal-nexus-8080',
    is_active: true,
  },
];
