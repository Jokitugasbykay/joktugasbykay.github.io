import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout Produk Digital',
  description: 'Konfirmasi dan pembayaran pesanan produk digital JOKI.IN.',
};

export default function DigitalCheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
