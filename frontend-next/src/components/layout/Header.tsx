'use client';

import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
}

export default function Header({ theme, onToggleTheme, cartCount = 0, onOpenCart }: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border-color)',
        gap: '16px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-green)', letterSpacing: '-0.02em' }}>
            JOKI.IN
          </span>
        </Link>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '999px',
            background: 'rgba(31, 209, 139, 0.12)',
            color: 'var(--accent-green)',
            border: '1px solid rgba(31, 209, 139, 0.25)'
          }}
        >
          Next.js App Router
        </span>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onToggleTheme}
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          aria-label="Ganti tema warna"
        >
          Tema: {theme === 'dark' ? 'Gelap' : 'Terang'}
        </button>

        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1px solid var(--accent-green)',
              background: 'transparent',
              color: 'var(--accent-green)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Keranjang ({cartCount})
          </button>
        )}

        <Link
          href="/testimonials/"
          style={{
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          Testimoni
        </Link>

        <Link
          href="/login/"
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          Masuk Staf
        </Link>
      </nav>
    </header>
  );
}
