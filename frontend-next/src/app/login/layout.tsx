import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masuk Akun',
  description: 'Masuk atau daftar akun JOKI.IN untuk memantau status pesanan dan layanan tugas kuliah.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
