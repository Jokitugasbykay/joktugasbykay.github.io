import React from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import CatalogSection from '@/components/CatalogSection';
import StepsSection from '@/components/StepsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';
import styles from '@/components/storefront.module.css';

export const metadata: Metadata = {
  title: 'JOKI.IN | Teman Tugas Mahasiswa',
  description: 'Jasa joki tugas kuliah, skripsi, makalah, coding, kalkulus, dan desain PPT terpercaya dengan garansi revisi.'
};

export default function HomePage() {
  return (
    <div className={styles.storefrontRoot}>
      <Navbar />
      <main>
        <Hero />
        <CatalogSection />
        <StepsSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}
