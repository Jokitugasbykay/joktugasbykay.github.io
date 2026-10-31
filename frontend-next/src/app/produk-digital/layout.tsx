import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Katalog Produk Digital',
  description: 'Katalog produk digital eksklusif, akun premium, dan tools produktivitas JOKI.IN.',
};

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
