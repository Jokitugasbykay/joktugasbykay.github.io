import React from 'react';

export default function Footer() {
  return (
    <footer style={{ marginTop: '50px', padding: '30px 0', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
      <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', margin: 0 }}>
        &copy; {new Date().getFullYear()} JOKI.IN. Teman Tugas Mahasiswa. Seluruh hak cipta dilindungi.
      </p>
    </footer>
  );
}
