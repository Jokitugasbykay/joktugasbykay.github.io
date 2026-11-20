'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DIGITAL_API_ENDPOINTS, formatRupiah } from '../../../data/digital-data';
import styles from '../digital.module.css';

type Product = { nama: string; harga_dasar: number; diskon_persen: number; stok: number; batas_beli_per_orang: number };

function CheckoutContent() {
  const params = useSearchParams();
  const slug = params.get('slug') ?? '';
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [productLoading, setProductLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const request = useRef<{ details: string; key: string } | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setError('');
    setOrderCode('');
    setProductLoading(true);
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Pilih produk digital terlebih dahulu.');
      setProductLoading(false);
      return;
    }
    fetch(DIGITAL_API_ENDPOINTS.PRODUCTS + '/' + encodeURIComponent(slug), { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.product) throw new Error(data.error || 'Produk digital tidak tersedia.');
        return data.product as Product;
      })
      .then(item => {
        setProduct(item);
        const limit = Math.min(10, item.stok, item.batas_beli_per_orang || 10);
        setQuantity(Math.max(1, Math.min(limit, parseInt(params.get('qty') || '1', 10) || 1)));
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message || 'Katalog gagal dimuat.'); })
      .finally(() => { if (!controller.signal.aborted) setProductLoading(false); });
    return () => controller.abort();
  }, [slug, params]);

  const limit = product ? Math.min(10, product.stok, product.batas_beli_per_orang || 10) : 0;
  const unitPrice = product ? Math.round(product.harga_dasar * (1 - (product.diskon_persen || 0) / 100)) : 0;
  const total = unitPrice * quantity;
  const orderUrl = '/produk-digital/pesanan/?order=';

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !product || quantity > limit || total < 500 || orderCode) return;
    const form = new FormData(event.currentTarget);
    const customer = {
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      whatsapp: String(form.get('whatsapp') || '').replace(/[+()\s-]/g, ''),
    };
    if (!customer.name || !/^(?:08[0-9]{7,12}|628[0-9]{7,11})$/.test(customer.whatsapp)) {
      setError('Isi nama dan nomor WhatsApp Indonesia yang valid.');
      return;
    }
    const details = { slug, qty: quantity, customer, expected_total: total };
    const fingerprint = JSON.stringify(details);
    if (request.current?.details !== fingerprint) {
      request.current = { details: fingerprint, key: 'digital-' + crypto.randomUUID() };
    }
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch(DIGITAL_API_ENDPOINTS.CHECKOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, request_key: request.current.key }),
      });
      const data = await response.json();
      if (response.ok && data.payment_status === 'PAID') {
        window.location.assign(orderUrl + encodeURIComponent(data.order_code));
        return;
      }
      if (response.ok && data.payment_url) {
        window.location.assign(data.payment_url);
        return;
      }
      if (data.order_code) setOrderCode(data.order_code);
      setError(data.error || 'Tautan pembayaran tidak tersedia.');
    } catch {
      setError('Koneksi terputus. Coba lagi dengan data yang sama untuk memeriksa permintaan ini.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.navWrap}>
          <Link href="/produk-digital/" className={styles.logo} aria-label="Kembali ke Produk Digital">
            <img className={styles.logoImage} width={124} height={40} src="/assets/produk-digital/jokiin-logo-white.png" alt="JOKI.IN Digital Store" />
          </Link>
          <Link href="/produk-digital/" className={styles.ordersLink}>Kembali ke etalase</Link>
        </div>
      </header>
      <main className={styles.checkoutPage}>
        <h1>Checkout Produk Digital</h1>
        {productLoading && <p role="status">Memuat rincian produk...</p>}
        {error && <p className={styles.checkoutError} role="alert">{error}</p>}
        {orderCode && <Link href={orderUrl + encodeURIComponent(orderCode)}>Lihat status pesanan</Link>}
        {product && (
          <div className={styles.checkoutGrid}>
            <section className={styles.checkoutPanel} aria-label="Ringkasan pesanan">
              <h2>Ringkasan pesanan</h2>
              <p>{product.nama}</p>
              <span>{formatRupiah(unitPrice)} / item</span>
              <div className={styles.checkoutLine}>
                <span>Jumlah</span>
                <div className={styles.quantityControl}>
                  <button type="button" aria-label="Kurangi jumlah" disabled={pending || quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
                  <output>{quantity}</output>
                  <button type="button" aria-label="Tambah jumlah" disabled={pending || quantity >= limit} onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>
              <div className={styles.checkoutLine}><span>Total</span><strong>{formatRupiah(total)}</strong></div>
              {limit < 1 && <p role="status">Stok produk habis.</p>}
            </section>
            <form className={styles.checkoutPanel} onSubmit={pay} aria-busy={pending}>
              <h2>Data pembeli</h2>
              <label>Nama lengkap<input name="name" autoComplete="name" maxLength={100} required disabled={pending} /></label>
              <label>Email tujuan pengiriman<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending} /></label>
              <label>Nomor WhatsApp<input name="whatsapp" type="tel" autoComplete="tel" maxLength={24} required disabled={pending} /></label>
              <button className={styles.checkoutPay} disabled={pending || quantity > limit || total < 500 || !!orderCode}>
                {pending && <span className={styles.checkoutSpinner} aria-hidden="true" />}
                {pending ? 'Menyiapkan tautan Mayar…' : 'Lanjut ke Mayar'}
              </button>
              <p className={styles.checkoutHint}>Pilih metode pembayaran di halaman Mayar.</p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<p role="status">Memuat checkout...</p>}><CheckoutContent /></Suspense>;
}
