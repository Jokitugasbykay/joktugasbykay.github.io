'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../digital.module.css';
import { DigitalProduct } from '../../../types/digital';
import {
  DIGITAL_API_ENDPOINTS,
  SAMPLE_DIGITAL_PRODUCTS,
  formatRupiah,
} from '../../../data/digital-data';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = searchParams.get('slug') || 'gemini-pro-18-bulan';
  const initialQty = Math.max(1, parseInt(searchParams.get('qty') || '1', 10));

  const [product, setProduct] = useState<DigitalProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(initialQty);
  const [name, setName] = useState<string>('Admin Kayla');
  const [email, setEmail] = useState<string>('kaylafisika24@gmail.com');
  const [whatsapp, setWhatsapp] = useState<string>('081234567890');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Cari produk di data lokal terlebih dahulu
    const found = SAMPLE_DIGITAL_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
    if (found) {
      setProduct(found);
    } else {
      // Coba fetch dari API jika tidak ada di sampel
      let token: string | null = null;
      const match = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);

      fetch(`${DIGITAL_API_ENDPOINTS.PRODUCTS}/${encodeURIComponent(slug)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.product) {
            setProduct({
              id: data.product.id,
              c: data.product.kategori || 'ai',
              n: data.product.nama,
              pv: 'JOKI.IN Store',
              ds: data.product.deskripsi || '',
              pr: Number(data.product.harga_dasar) * (1 - (Number(data.product.diskon_persen) || 0) / 100),
              st: Number(data.product.stok) || 1,
              slug: data.product.slug,
            });
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  const unitPrice = product ? product.pr : 50000;
  const totalPrice = unitPrice * quantity;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Format email tidak valid.');
      return;
    }
    const cleanWa = whatsapp.replace(/\D/g, '');
    if (cleanWa.length < 9 || cleanWa.length > 15) {
      setErrorMessage('Nomor WhatsApp harus valid (9-15 digit).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let token: string | null = null;
      const match = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);

      const res = await fetch(DIGITAL_API_ENDPOINTS.CHECKOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          slug: product?.slug || slug,
          qty: quantity,
          customer: {
            name: name.trim(),
            email: email.trim(),
            whatsapp: cleanWa,
          },
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.ok) {
        throw new Error(resData.error || 'Terjadi kesalahan saat memproses checkout.');
      }

      if (resData.payment_url) {
        window.location.href = resData.payment_url;
      } else {
        router.push(`/produk-digital/pesanan?order=${encodeURIComponent(resData.order_code)}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat pesanan digital.');
      setLoading(false);
    }
  };

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

      <main className={styles.mainContent} style={{ maxWidth: '900px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '20px 0 24px' }}>
          Konfirmasi Checkout Produk Digital
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Formulir Data Pemesan */}
          <div
            style={{
              background: 'var(--card, #ffffff)',
              border: '1px solid var(--line, #e2e7f1)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px' }}>Data Pembeli</h2>
            <form onSubmit={handleSubmitOrder}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Alamat Email (Untuk Pengiriman Lisensi/Akun)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              {errorMessage && (
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={styles.btnPrimary}
                style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              >
                {loading ? 'Memproses Pesanan...' : 'Bayar Sekarang via Mayar'}
              </button>
            </form>
          </div>

          {/* Ringkasan Pesanan */}
          <div
            style={{
              background: 'var(--card, #ffffff)',
              border: '1px solid var(--line, #e2e7f1)',
              borderRadius: '16px',
              padding: '24px',
              height: 'fit-content',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px' }}>Ringkasan Pesanan</h2>
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e7f1', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>
                {product ? product.n : 'Memuat produk...'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {product?.pv} · {product?.c}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ color: '#64748b' }}>Harga Satuan</span>
              <span style={{ fontWeight: 600 }}>{formatRupiah(unitPrice)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                fontSize: '14px',
              }}
            >
              <span style={{ color: '#64748b' }}>Jumlah Item</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
                <button
                  type="button"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  onClick={() => setQuantity(Math.min(product?.st || 10, quantity + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid #e2e7f1',
                fontSize: '17px',
                fontWeight: 800,
              }}
            >
              <span>Total Pembayaran</span>
              <span style={{ color: '#1d4ed8' }}>{formatRupiah(totalPrice)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.deniedWrap}>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Memuat halaman checkout...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
