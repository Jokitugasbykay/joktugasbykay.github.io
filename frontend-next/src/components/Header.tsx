'use client';

import React, { useEffect, useState } from 'react';
import { getAccount, GOOGLE_RETURN_KEY } from '@/lib/auth-session';

interface HeaderProps {
  cartCount?: number;
  onOpenCart: () => void;
  onOpenTrack: () => void;
}

export default function Header({ cartCount = 0, onOpenCart, onOpenTrack }: HeaderProps) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    try {
      if (sessionStorage.getItem(GOOGLE_RETURN_KEY) &&
          (hash.has('error') || url.searchParams.has('error') || url.searchParams.has('code'))) {
        window.location.replace('/login/' + url.search + url.hash);
        return;
      }
    } catch { /* Account lookup still works when sessionStorage is blocked. */ }

    let active = true;
    const refresh = () => {
      getAccount().then((account) => { if (active) setSignedIn(Boolean(account)); })
        .catch(() => { if (active) setSignedIn(false); });
    };
    refresh();
    window.addEventListener('pageshow', refresh);
    return () => {
      active = false;
      window.removeEventListener('pageshow', refresh);
    };
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
        <a id="authHeaderBtn" className="btn-header" href={signedIn ? '/login/?account=1' : '/login/'}>
          {signedIn ? 'Akun' : 'Masuk'}
        </a>
      </div>
    </header>
  );
}
