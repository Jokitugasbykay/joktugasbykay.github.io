export const SITE_CONFIG = {
  name: 'JOKI.IN',
  description: 'Solusi Tugas Kuliah dan Layanan Edukasi Cepat Terpercaya',
  url: 'https://jokiin.my.id',
  apiBase: 'https://jokiin.my.id',
  supabaseUrl: '/api/supabase',
  supabaseAnonKey: 'public-proxy',
  limits: {
    regularMaxQty: 2,
    specialMaxQty: 1
  },
  hours: {
    nightStart: 22,
    nightEnd: 5
  }
} as const;

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export const MAYAR_CONFIG = {
  createPaymentUrl: 'https://jokiin-payment-api.gamingyoga14.workers.dev/api/create-mayar-payment',
  checkoutSpecialUrl: 'https://jokiin-payment-api.gamingyoga14.workers.dev/api/checkout/spesial',
  statusUrl: 'https://jokiin-payment-api.gamingyoga14.workers.dev/api/check-status',
  promoUrl: 'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo',
  uploadFileUrl: 'https://jokiin-payment-api.gamingyoga14.workers.dev/api/upload-task-file',
  whatsappAdmin: '601155639233'
} as const;

export function validDriveUrl(value: string): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(u.hostname) && !u.username && !u.password;
  } catch (_) {
    return false;
  }
}

export function normalizeWhatsAppNumber(number: string): string {
  let cleaned = number.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

export function maximumOrderQuantity(isSpecial: boolean, batasBeli?: number): number {
  if (isSpecial) {
    return batasBeli !== undefined ? Math.max(1, Number(batasBeli) || 1) : SITE_CONFIG.limits.specialMaxQty;
  }
  if (batasBeli !== undefined && Number(batasBeli) > 0) {
    return Math.max(SITE_CONFIG.limits.regularMaxQty, Number(batasBeli) || SITE_CONFIG.limits.regularMaxQty);
  }
  return SITE_CONFIG.limits.regularMaxQty;
}

export function isNightOperationalHours(date = new Date()): boolean {
  try {
    const hourWIB = parseInt(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false
      }).format(date),
      10
    );
    return hourWIB >= SITE_CONFIG.hours.nightStart || hourWIB < SITE_CONFIG.hours.nightEnd;
  } catch (_) {
    const localHour = date.getHours();
    return localHour >= SITE_CONFIG.hours.nightStart || localHour < SITE_CONFIG.hours.nightEnd;
  }
}


