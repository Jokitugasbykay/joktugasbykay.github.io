import type { Metadata } from 'next';
import './globals.css';
import HeaderNav from '../components/HeaderNav';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Pusat Informasi - JOKI.IN',
  description: 'Pusat informasi resmi, pembaruan sistem, ketentuan layanan, dan status operasional JOKI.IN.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = saved || (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <HeaderNav />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
