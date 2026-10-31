import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Area Produk Digital',
  description: 'Area etalase produk digital JOKI.IN.',
};

export default function DigitalHomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
