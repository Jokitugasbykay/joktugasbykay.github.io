import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/auth-session';
import { PRODUCTS } from './catalog-data';
import type { CatalogProduct, TestimonialReview } from '@/types/catalog';
import reviewModeration from '../../public/assets/review-moderation.js';

const { censorReviewText } = reviewModeration as typeof reviewModeration & { censorReviewText: (value: string) => string };

const photos: Record<string, number> = {
  makalah: 17, ppt: 8, artikel: 30, poster: 13, editing: 34, skripsi: 29, jurnal: 1,
  'bimbingan-parafrase': 33, 'konsultasi-olah-data-kualitatif': 28,
  'konsultasi-olah-data-kuantitatif': 27, 'bimbingan-konversi-artikel': 12,
  'bimbingan-laporan': 31, 'bimbingan-mini-riset': 14, 'bimbingan-proposal-skripsi': 24,
  'bimbingan-proposal-tesis': 5, 'bimbingan-bab-4': 26, 'bimbingan-bab-5': 20,
  'bimbingan-artikel-jurnal': 22, 'bimbingan-slr': 7, 'pembuatan-cv': 3,
};
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

async function read<T>(query: string, signal: AbortSignal): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY }, signal,
  });
  if (!response.ok) throw new Error('Data storefront belum dapat dimuat.');
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error('Respons storefront tidak valid.');
  return rows as T[];
}

type Service = { slug: string; name: string; description: string | null; price: number; sale_percent: number | null; sale_amount: number | null };
type Review = { id: string; rating: number; comment: string | null; created_at: string; customer_name: string | null; services: { name: string } | null };

export async function loadStorefrontServices(signal: AbortSignal): Promise<CatalogProduct[]> {
  const rows = await read<Service>('services?select=slug,name,description,price,sale_percent,sale_amount&status=eq.active&order=id', signal);
  return rows.filter(row => /^[a-z0-9-]+$/.test(row.slug) && Number.isSafeInteger(Number(row.price)) && Number(row.price) > 0).map(row => {
    const meta = PRODUCTS.find(p => p.id === row.slug);
    const originalPrice = Number(row.price);
    const salePercent = Math.min(100, Math.max(0, Number(row.sale_percent) || 0));
    const saleAmount = Math.max(0, Number(row.sale_amount) || 0);
    const priceNum = Math.max(1, Math.round(originalPrice - (saleAmount || originalPrice * salePercent / 100)));
    const photo = photos[row.slug];
    return {
      ...meta, id: row.slug, title: row.name, desc: row.description ?? '', category: meta?.category ?? 'Lainnya',
      benefits: meta?.benefits ?? [], image: photo ? `/assets/catalog/portfolio-${String(photo).padStart(2, '0')}.jpg` : undefined,
      priceNum, price: rupiah.format(priceNum), originalPrice, salePercent, hasSale: priceNum < originalPrice,
    };
  });
}

export async function loadStorefrontReviews(signal: AbortSignal): Promise<TestimonialReview[]> {
  const rows = await read<Review>('reviews?select=id,rating,comment,created_at,customer_name,services(name)&verified=eq.true&order=created_at.desc,id.desc&limit=20', signal);
  return rows.filter(row => row.rating >= 1 && row.rating <= 5).map(row => ({
    id: String(row.id), rating: row.rating, review: censorReviewText(row.comment ?? ''), date: row.created_at.slice(0, 10),
    service: row.services?.name ?? 'Layanan JOKI.IN',
    name: row.customer_name?.trim() ? row.customer_name.trim().slice(0, 1) + '***' : 'Pelanggan',
  }));
}
