import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Status Pembayaran',
  description: 'Informasi dan verifikasi status pembayaran layanan JOKI.IN.',
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
