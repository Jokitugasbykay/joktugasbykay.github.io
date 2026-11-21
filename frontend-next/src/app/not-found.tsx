import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '24px' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--accent-green)', marginBottom: '16px' }}>404</h1>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Halaman Tidak Ditemukan</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
        Tautan yang Anda tuju mungkin sudah dipindahkan atau dihapus.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: '10px',
          background: 'var(--accent-green)',
          color: '#04251a',
          fontWeight: 700,
          fontSize: '14px'
        }}
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
