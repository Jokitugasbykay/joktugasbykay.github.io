import type { Metadata } from 'next';
import './globals.css';
import './legacy-storefront.css';

export const metadata: Metadata = {
  title: {
    default: 'JOKI.IN | Teman Tugas Mahasiswa',
    template: '%s | JOKI.IN',
  },
  description: 'Jasa joki tugas kuliah, skripsi, makalah, coding, kalkulus, dan desain PPT terpercaya dengan garansi revisi.',
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
          id="jokiin-theme-init"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('jokiin_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
