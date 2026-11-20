import { DigitalCategory, DigitalHeroSlide } from '../types/digital';

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
  { id: 'game', t: 'Game', d: 'Top up dan kebutuhan gaming', hue: 160 },
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
  if (category.includes('top') || category.includes('diamond')) return 'topup';
  if (category.includes('game')) return 'game';
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
