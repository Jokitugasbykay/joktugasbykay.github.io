import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JOKI.IN | Teman Tugas Mahasiswa',
  description: 'Jasa joki tugas kuliah, skripsi, makalah, coding, kalkulus, dan desain PPT terpercaya dengan garansi revisi.',
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
