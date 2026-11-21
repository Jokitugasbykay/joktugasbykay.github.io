import type { Metadata } from 'next';
import TestimonialsHubClient from '@/components/testimonials/TestimonialsHubClient';

export const metadata: Metadata = {
  title: 'Testimoni Layanan & Ulasan Mahasiswa Terverifikasi | JOKI.IN',
  description: 'Daftar ulasan dan kepuasan mahasiswa untuk setiap layanan di JOKI.IN, mulai dari joki makalah, PPT, skripsi, olah data, hingga turnitin. 100% ulasan pelanggan terverifikasi.',
  openGraph: {
    title: 'Testimoni & Ulasan Layanan JOKI.IN',
    description: 'Ulasan kepuasan mahasiswa terverifikasi untuk seluruh layanan JOKI.IN.',
    url: 'https://jokiin.my.id/testimonials/'
  }
};

export default function TestimonialsPage() {
  return <TestimonialsHubClient />;
}
