import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel Admin',
  description: 'Panel manajemen pesanan dan operasional resmi JOKI.IN.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
