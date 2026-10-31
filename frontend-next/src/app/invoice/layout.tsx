import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice & Pembayaran',
  description: 'Detail dan status invoice pemesanan layanan tugas JOKI.IN.',
};

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
