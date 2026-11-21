import rawData from '@/data/testimonialsData.json';

export interface ServiceItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  category?: string;
}

export interface ReviewItem {
  id: number;
  service_id: number;
  rating: number;
  comment: string;
  customer_name: string;
  user_photo: string | null;
  created_at: string;
}

export interface ServiceReviewStats {
  service: ServiceItem;
  totalReviews: number;
  averageRating: number;
  satisfactionPercentage: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: ReviewItem[];
}

const CATEGORY_MAP: Record<string, string> = {
  makalah: 'Akademik',
  ppt: 'Desain',
  artikel: 'Penulisan',
  poster: 'Desain',
  editing: 'Editing',
  skripsi: 'Penelitian',
  turnitin: 'Pengecekan',
  jurnal: 'Penelitian',
  'bimbingan-parafrase': 'Editing',
  'konsultasi-olah-data-kualitatif': 'Konsultasi',
  'konsultasi-olah-data-kuantitatif': 'Konsultasi',
  'bimbingan-konversi-artikel': 'Penulisan',
  'bimbingan-laporan': 'Akademik',
  'bimbingan-mini-riset': 'Penelitian',
  'bimbingan-proposal-skripsi': 'Penelitian',
  'bimbingan-proposal-tesis': 'Penelitian',
  'bimbingan-bab-4': 'Penelitian',
  'bimbingan-bab-5': 'Penelitian',
  'bimbingan-artikel-jurnal': 'Penelitian',
  'bimbingan-slr': 'Penelitian',
  'gemini-pro-18-bulan': 'Digital',
  'pembuatan-cv': 'Karir'
};

export const ALL_SERVICES: ServiceItem[] = (rawData.services as ServiceItem[]).map(s => ({
  ...s,
  category: CATEGORY_MAP[s.slug] || 'Lainnya'
}));

export const ALL_REVIEWS: ReviewItem[] = rawData.reviews as ReviewItem[];

export function anonymizeCustomerName(name: string): string {
  if (!name) return 'Mahasiswa';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    if (first.length <= 2) return first;
    return first.slice(0, 2) + '*'.repeat(Math.min(3, Math.max(1, first.length - 2)));
  }
  const first = parts[0];
  const initial = parts[parts.length - 1];
  const maskedFirst = first.length <= 2 ? first : first.slice(0, 2) + '*'.repeat(Math.min(3, Math.max(1, first.length - 2)));
  return `${maskedFirst} ${initial}`;
}

export function resolveServiceSlug(rawSlug: string): string | null {
  const normalized = rawSlug.toLowerCase().trim();
  // Direct match
  const direct = ALL_SERVICES.find(s => s.slug === normalized);
  if (direct) return direct.slug;

  // Specific alias mappings
  if (normalized === 'joki-olah-data-kualitatif') return 'konsultasi-olah-data-kualitatif';
  if (normalized === 'joki-olah-data-kuantitatif') return 'konsultasi-olah-data-kuantitatif';
  if (normalized === 'joki-konversi-artikel') return 'bimbingan-konversi-artikel';
  if (normalized === 'joki-laporan') return 'bimbingan-laporan';
  if (normalized === 'joki-mini-riset') return 'bimbingan-mini-riset';
  if (normalized === 'joki-proposal-skripsi') return 'bimbingan-proposal-skripsi';
  if (normalized === 'joki-proposal-tesis') return 'bimbingan-proposal-tesis';
  if (normalized === 'joki-bab-4') return 'bimbingan-bab-4';
  if (normalized === 'joki-bab-5') return 'bimbingan-bab-5';
  if (normalized === 'joki-artikel-jurnal') return 'bimbingan-artikel-jurnal';
  if (normalized === 'joki-slr') return 'bimbingan-slr';
  if (normalized === 'joki-pembuatan-cv') return 'pembuatan-cv';
  if (normalized === 'joki-parafrase') return 'bimbingan-parafrase';
  if (normalized === 'joki-turnitin' || normalized === 'cek-turnitin') return 'turnitin';

  // If prefixed with joki- (e.g. joki-makalah -> makalah)
  if (normalized.startsWith('joki-')) {
    const stripped = normalized.slice(5);
    const match = ALL_SERVICES.find(s => s.slug === stripped || s.slug === 'bimbingan-' + stripped || s.slug === 'konsultasi-' + stripped);
    if (match) return match.slug;
  }

  return null;
}

export function getAllServiceSlugs(): string[] {
  const slugs: string[] = [];
  const PUBLIC_SLUG_MAP: Record<string, string> = {
    makalah: 'joki-makalah',
    ppt: 'joki-ppt',
    artikel: 'joki-artikel',
    poster: 'joki-poster',
    editing: 'joki-editing',
    skripsi: 'joki-skripsi',
    turnitin: 'joki-turnitin',
    jurnal: 'joki-jurnal',
    'bimbingan-parafrase': 'joki-bimbingan-parafrase',
    'konsultasi-olah-data-kualitatif': 'joki-olah-data-kualitatif',
    'konsultasi-olah-data-kuantitatif': 'joki-olah-data-kuantitatif',
    'bimbingan-konversi-artikel': 'joki-konversi-artikel',
    'bimbingan-laporan': 'joki-laporan',
    'bimbingan-mini-riset': 'joki-mini-riset',
    'bimbingan-proposal-skripsi': 'joki-proposal-skripsi',
    'bimbingan-proposal-tesis': 'joki-proposal-tesis',
    'bimbingan-bab-4': 'joki-bab-4',
    'bimbingan-bab-5': 'joki-bab-5',
    'bimbingan-artikel-jurnal': 'joki-artikel-jurnal',
    'bimbingan-slr': 'joki-slr',
    'pembuatan-cv': 'joki-pembuatan-cv',
    'gemini-pro-18-bulan': 'gemini-pro-18-bulan'
  };
  for (const s of ALL_SERVICES) {
    slugs.push(s.slug);
    if (PUBLIC_SLUG_MAP[s.slug]) {
      slugs.push(PUBLIC_SLUG_MAP[s.slug]);
    } else if (!s.slug.startsWith('joki-')) {
      slugs.push(`joki-${s.slug}`);
    }
  }
  return Array.from(new Set(slugs));
}

export function getServiceStats(slug: string): ServiceReviewStats | null {
  const canonicalSlug = resolveServiceSlug(slug);
  if (!canonicalSlug) return null;

  const service = ALL_SERVICES.find(s => s.slug === canonicalSlug);
  if (!service) return null;

  const reviews = ALL_REVIEWS.filter(r => r.service_id === service.id);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  let totalScore = 0;
  let positiveCount = 0;

  for (const r of reviews) {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    totalScore += Number(r.rating) || 5;
    if (Number(r.rating) >= 4) {
      positiveCount++;
    }
  }

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0;
  const satisfactionPercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 100;

  return {
    service,
    totalReviews,
    averageRating,
    satisfactionPercentage,
    distribution,
    reviews: reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  };
}
