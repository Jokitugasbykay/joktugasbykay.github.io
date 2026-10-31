'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { InvoiceOrder, InvoiceItem } from '@/types/invoice';
import styles from './invoice.module.css';

const SUPABASE_URL = 'https://xdbnwjvxqtpkoaigedsk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z';

function money(value?: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(value?: string | null) {
  if (!value || value === '-') return '-';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime())
    ? '-'
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
      }).format(d);
}

function InvoiceContent() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoice() {
      try {
        const rawCode = (searchParams.get('order') || '').trim().toUpperCase().replace(/^#/, '');
        if (!/^(NUG[A-HJ-NP-Z2-9]{26}|SPCL[A-HJ-NP-Z2-9]{23})$/.test(rawCode)) {
          throw new Error('Nomor invoice tidak valid.');
        }

        const isSpcl = rawCode.startsWith('SPCL');
        const tipe = isSpcl ? 'SPESIAL' : 'REGULER';

        const response = await fetch(`${SUPABASE_URL}/functions/v1/jokiin-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ action: 'track', orderCode: rawCode })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || 'Invoice belum dapat dimuat.');
        }

        const row = result.order;
        if (!row || row.payment_status !== 'PAID') {
          throw new Error('Invoice tersedia setelah pembayaran terkonfirmasi Paid.');
        }

        const items: InvoiceItem[] = Array.isArray(row.items) ? row.items : [];
        const calculatedSubtotal =
          row.subtotal ??
          items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 1), 0);

        setOrder({
          id: row.order_code,
          orderCode: row.order_code,
          tipe,
          customer: row.customer,
          nama: row.customer?.name,
          task: row.task,
          deadline: row.task?.deadline,
          items,
          createdAt: row.created_at,
          subtotal: calculatedSubtotal,
          discount: row.discount,
          serviceFee: row.service_fee,
          paymentFee: row.payment_fee,
          total: row.total_price,
          adminName: 'Tim JOKI.IN'
        });
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invoice belum dapat dimuat. Silakan coba lagi.');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [searchParams]);

  const isSpecial = order?.orderCode?.startsWith('SPCL') || order?.tipe === 'SPESIAL';
  const items = order?.items || [];

  return (
    <div className={styles.invoiceWrapper}>
      <nav className={styles.invoiceToolbar} aria-label="Invoice Toolbar">
        <a href="/" className={styles.backLink}>Kembali ke JOKI.IN</a>
        <button
          type="button"
          className={styles.printBtn}
          disabled={!order}
          onClick={() => window.print()}
        >
          Cetak Invoice
        </button>
      </nav>

      {loading && <p className={styles.invoiceStatus} role="status">Memuat invoice...</p>}

      {error && !loading && (
        <p className={`${styles.invoiceStatus} ${styles.statusError}`} role="status">
          {error}
        </p>
      )}

      {order && !loading && (
        <main className={styles.invoicePaper}>
          <header className={styles.invoiceHeading}>
            <div>
              <img
                className={styles.invoiceWordmark}
                src="/assets/brand-light-lockup.png"
                alt="JOKI.IN"
                width="180"
                height="45"
              />
              <p className={styles.tagline}>Teman tugas mahasiswa</p>
            </div>
            <h1 className={styles.invoiceTitle}>
              {isSpecial ? 'INVOICE SPESIAL' : 'INVOICE'}
            </h1>
          </header>

          <dl className={styles.invoiceFields}>
            <div className={styles.fieldGroup}>
              <dt>Nama Admin</dt>
              <dd>{order.adminName || 'Tim JOKI.IN'}</dd>
            </div>
            <div className={styles.fieldGroup}>
              <dt>Nama Klien</dt>
              <dd>{order.nama || order.customer?.name || '-'}</dd>
            </div>
            <div className={styles.fieldGroup}>
              <dt>Nomor Invoice</dt>
              <dd>{order.orderCode || order.id || '-'}</dd>
            </div>
            <div className={styles.fieldGroup}>
              <dt>Tipe Pesanan</dt>
              <dd>
                {isSpecial
                  ? 'PENAWARAN SPESIAL (LIMITED EDITION)'
                  : 'PESANAN REGULER'}
              </dd>
            </div>
            <div className={styles.fieldGroup}>
              <dt>Tanggal Invoice</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
            {!isSpecial && (
              <div className={styles.fieldGroup}>
                <dt>Tanggal Deadline</dt>
                <dd>{formatDate(order.deadline || order.task?.deadline)}</dd>
              </div>
            )}
          </dl>

          <div className={styles.invoiceTableWrap}>
            <table className={styles.invoiceTable}>
              <thead>
                <tr>
                  <th>Deskripsi</th>
                  <th className={styles.textCenter}>Jumlah</th>
                  <th className={styles.textRight}>Harga Satuan</th>
                  <th className={styles.textRight}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => {
                  const qty = Number(i.quantity || i.qty || 1);
                  const price = Number(i.price || i.harga_satuan || 0);
                  const itemSubtotal = price * qty;
                  return (
                    <tr key={idx}>
                      <td>
                        {i.name || i.produk || i.title || 'Layanan'}
                        {isSpecial && <small> (LIMITED EDITION)</small>}
                      </td>
                      <td className={styles.textCenter}>{qty}</td>
                      <td className={styles.textRight}>{money(price)}</td>
                      <td className={styles.textRight}>
                        <strong>{money(itemSubtotal)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.invoiceTotals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <strong>{money(order.subtotal)}</strong>
            </div>
            {Number(order.discount) > 0 && (
              <div className={styles.totalRow}>
                <span>Diskon</span>
                <strong>-{money(order.discount)}</strong>
              </div>
            )}
            {Number(order.serviceFee) > 0 && (
              <div className={styles.totalRow}>
                <span>Biaya Layanan</span>
                <strong>{money(order.serviceFee)}</strong>
              </div>
            )}
            {Number(order.paymentFee) > 0 && (
              <div className={styles.totalRow}>
                <span>Biaya Pembayaran</span>
                <strong>{money(order.paymentFee)}</strong>
              </div>
            )}
            <div className={styles.totalRow}>
              <span>Nilai PPN (0%)</span>
              <strong>{money(0)}</strong>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Total Akhir</span>
              <strong>{money(order.total)}</strong>
            </div>
          </div>

          <p className={styles.invoiceNote}>
            Terima kasih telah mempercayakan pesanan Anda kepada JOKI.IN.
          </p>
        </main>
      )}
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<p className={styles.invoiceStatus} role="status">Memuat invoice...</p>}>
      <InvoiceContent />
    </Suspense>
  );
}
