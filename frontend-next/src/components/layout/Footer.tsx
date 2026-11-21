import React from 'react';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: '60px',
        padding: '32px 0',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        color: 'var(--text-muted)',
        fontSize: '13px'
      }}
    >
      <div>
        <strong style={{ color: 'var(--accent-green)', fontWeight: 800 }}>JOKI.IN</strong>
        <span style={{ marginLeft: '8px' }}>Solusi Tugas Kuliah dan Layanan Edukasi Cepat Terpercaya</span>
      </div>
      <div>Hak Cipta 2026 JOKI.IN Team. Seluruh hak cipta dilindungi.</div>
    </footer>
  );
}
