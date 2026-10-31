import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pesanan Produk Digital',
  description: 'Detail dan status pesanan produk digital JOKI.IN.',
};

export default function DigitalPesananLayout({ children }: { children: React.ReactNode }) {
  return children;
}
