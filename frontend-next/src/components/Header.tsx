'use client';

import React, { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth-session';

const SUPABASE_URL = 'https://xdbnwjvxqtpkoaigedsk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z';

interface HeaderProps {
  cartCount?: number;
  onOpenCart: () => void;
  onOpenTrack: () => void;
}

export default function Header({ cartCount = 0, onOpenCart, onOpenTrack }: HeaderProps) {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((user) => { if (user?.id) setAccount(user.email || 'Akun Saya'); })
      .catch(() => {});
  }, []);

  return (
    <header>
      <a
        className="logo"
        href="/"
        aria-label="Beranda JOKI.IN"
        style={{ textDecoration: 'none' }}
      >
        <img
          draggable={false}
          className="header-brand-lockup header-brand-light"
          src="/assets/brand-light-lockup.png?v=20261001-wordmark"
          alt="JOKI.IN"
        />
        <img
          draggable={false}
          className="header-brand-lockup header-brand-dark"
          src="/assets/brand-dark-lockup.png?v=20261001-wordmark"
          alt="JOKI.IN"
        />
      </a>
      <div className="checkout-title" id="checkoutHeaderTitle" style={{ display: 'none' }}>
        Penyelesaian Pesanan
      </div>
      <div className="header-actions" id="mainHeaderActions">
        <button
          id="cartHeaderBtn"
          className="btn-cart"
          type="button"
          onClick={onOpenCart}
        >
          <span id="cartIconWrapper">🛒</span> Keranjang{' '}
          <span
            id="cartHeaderBadge"
            className="cart-header-badge"
            style={{ display: cartCount > 0 ? 'inline-block' : 'none' }}
          >
            {cartCount}
          </span>
        </button>
        <button
          id="ordersHeaderBtn"
          className="btn-cart"
          type="button"
          onClick={onOpenTrack}
        >
          Pesanan Saya
        </button>
        <a id="authHeaderBtn" className="btn-header" href="/login/">
          {account || 'Masuk'}
        </a>
      </div>
    </header>
  );
}
