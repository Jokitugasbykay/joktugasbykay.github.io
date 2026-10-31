'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '../digital.module.css';
import { DigitalOrderDetails } from '../../../types/digital';
import { DIGITAL_API_ENDPOINTS, formatRupiah } from '../../../data/digital-data';

function PesananContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('order') || searchParams.get('order_code') || '';

  const [order, setOrder] = useState<DigitalOrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderCode) {
      setLoading(false);
      setErrorMessage('Nomor pesanan tidak ditemukan di URL.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let token: string | null = null;
      const match = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);

      const res = await fetch(`${DIGITAL_API_ENDPOINTS.ORDER_STATUS}/${encodeURIComponent(orderCode)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Pesanan tidak ditemukan.');
      }

      setOrder(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat status pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderCode]);

  return (
    <div className={styles.container}>
      <div className={styles.adminBar}>
        Mode ADMIN_ONLY : etalase privat khusus Admin Kayla : data katalog dan gateway pembayaran terisolasi
      </div>

      <header className={styles.header}>
        <div className={styles.navWrap}>
          <Link href="/produk-digital" className={styles.logo} aria-label="JOKI.IN Digital Store">
            <i className={styles.logoIcon}>J</i>
            JOKI.IN
            <small className={styles.logoTag}>Digital Store</small>
          </Link>
          <Link href="/produk-digital" className={styles.backLink} style={{ marginLeft: 'auto' }}>
            Kembali ke Etalase
          </Link>
        </div>
      </header>

      <main className={styles.mainContent} style={{ maxWidth: '640px', margin: '40px auto' }}>
        <div
          style={{
            background: 'var(--card, #ffffff)',
            border: '1px solid var(--line, #e2e7f1)',
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
          }}
        >
          {loading ? (
            <p style={{ color: '#64748b', fontWeight: 600 }}>Memeriksa status pesanan...</p>
          ) : errorMessage ? (
            <div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 14px',
                  borderRadius: '99px',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}
              >
                KESALAHAN
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 12px' }}>{errorMessage}</h2>
              <Link href="/produk-digital" className={styles.btnPrimary} style={{ display: 'inline-block', marginTop: '16px' }}>
                Kembali ke Katalog
              </Link>
            </div>
          ) : order ? (
            <div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '6px 16px',
                  borderRadius: '99px',
                  fontSize: '13px',
                  fontWeight: 800,
                  marginBottom: '16px',
                  background:
                    order.payment_status === 'PAID'
                      ? '#e6f7ef'
                      : order.payment_status === 'PENDING'
                      ? '#fff8e6'
                      : '#fef2f2',
                  color:
                    order.payment_status === 'PAID'
                      ? '#0f8a5f'
                      : order.payment_status === 'PENDING'
                      ? '#b58500'
                      : '#b91c1c',
                }}
              >
                STATUS: {order.payment_status}
              </div>

              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px' }}>
                {order.order_code}
              </h1>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
                Total: <strong style={{ color: '#1d4ed8' }}>{formatRupiah(order.total || order.total_price || 0)}</strong>
              </p>

              <div
                style={{
                  textAlign: 'left',
                  borderTop: '1px solid #e2e7f1',
                  borderBottom: '1px solid #e2e7f1',
                  padding: '16px 0',
                  margin: '20px 0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Pembeli:</span>
                  <span style={{ fontWeight: 600 }}>{order.nama || order.customer_name || 'Admin Kayla'}</span>
                </div>
                {order.items && order.items.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                      Detail Produk:
                    </span>
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '14px',
                          fontWeight: 600,
                          marginBottom: '4px',
                        }}
                      >
                        <span>{item.name || item.produk} ({item.quantity || item.qty}x)</span>
                        <span>{formatRupiah(item.total_price || item.subtotal || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {order.payment_status === 'PENDING' && order.payment_url && (
                <div style={{ marginBottom: '16px' }}>
                  <a
                    href={order.payment_url}
                    className={styles.btnPrimary}
                    style={{ display: 'block', padding: '12px', textDecoration: 'none' }}
                  >
                    Lanjutkan Pembayaran via Mayar
                  </a>
                </div>
              )}

              <button
                type="button"
                className={styles.btnSecondary}
                onClick={fetchOrder}
                style={{ width: '100%', padding: '10px' }}
              >
                Perbarui Status Pembayaran
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function PesananPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.deniedWrap}>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Memuat status pesanan...</p>
        </div>
      }
    >
      <PesananContent />
    </Suspense>
  );
}
