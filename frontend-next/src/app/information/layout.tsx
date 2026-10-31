import type { Metadata } from 'next';
import HeaderNav from '../../components/HeaderNav';
import Footer from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Pusat Informasi',
  description: 'Pusat informasi resmi, pembaruan sistem, ketentuan layanan, dan status operasional JOKI.IN.',
};

export default function InformationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <HeaderNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
