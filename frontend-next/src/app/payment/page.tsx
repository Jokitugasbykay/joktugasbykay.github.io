'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PaymentRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const target = query ? `/?${query}` : '/';
    if (typeof window !== 'undefined') {
      window.location.replace('/' + window.location.search + window.location.hash);
    } else {
      router.replace(target);
    }
  }, [router, searchParams]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '16px', color: '#586a62', marginBottom: '12px' }}>
        Mengalihkan ke{' '}
        <a href="/" style={{ color: '#087b59', fontWeight: 600 }}>
          halaman utama
        </a>
        ...
      </p>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <p>Mengalihkan ke halaman utama...</p>
        </div>
      }
    >
      <PaymentRedirect />
    </Suspense>
  );
}
