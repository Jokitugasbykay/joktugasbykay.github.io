import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllServiceSlugs, getServiceStats } from '@/lib/testimonials';
import TestimonialDetailClient from '@/components/testimonials/TestimonialDetailClient';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllServiceSlugs();
  return slugs.map((slug) => ({
    slug
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const stats = getServiceStats(slug);

  if (!stats) {
    return {
      title: 'Testimoni Tidak Ditemukan - JOKI.IN',
      description: 'Halaman testimoni layanan yang Anda cari tidak ditemukan di JOKI.IN.'
    };
  }

  const { service, totalReviews, averageRating, satisfactionPercentage } = stats;

  return {
    title: `Testimoni ${service.name} - Ulasan Pelanggan Terverifikasi | JOKI.IN`,
    description: `Lihat ulasan kepuasan mahasiswa (${totalReviews} ulasan, rating ${averageRating.toFixed(1)}/5, ${satisfactionPercentage}% puas) untuk layanan ${service.name} di JOKI.IN. Aman, cepat, dan bergaransi.`,
    openGraph: {
      title: `Testimoni ${service.name} - JOKI.IN`,
      description: `Ulasan resmi pelanggan terverifikasi untuk layanan ${service.name} di JOKI.IN.`,
      url: `https://jokiin.my.id/testimonials/${service.slug}/`
    }
  };
}

export default async function TestimonialDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const stats = getServiceStats(slug);

  if (!stats) {
    notFound();
  }

  return <TestimonialDetailClient stats={stats} />;
}
