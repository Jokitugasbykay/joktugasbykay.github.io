import type { Metadata } from 'next';
import Storefront from '@/components/Storefront';

export const metadata: Metadata = {
  title: 'Pusat Informasi',
  description: 'Pusat informasi resmi, pembaruan sistem, ketentuan layanan, dan status operasional JOKI.IN.',
};

export default function InformationLayout({ children }: { children: React.ReactNode }) {
  return <Storefront information={children} />;
}
