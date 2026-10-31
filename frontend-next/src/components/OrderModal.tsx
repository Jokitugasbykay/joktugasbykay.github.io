'use client';

import React, { useState } from 'react';
import type { CatalogProduct } from '@/types/catalog';
import styles from './storefront.module.css';

interface OrderModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
}

export default function OrderModal({ product, onClose }: OrderModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nim, setNim] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ orderCode: string; paymentUrl?: string } | null>(null);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanWa = whatsapp.trim();
    const cleanTitle = taskTitle.trim();

    if (!cleanName || !cleanEmail || !cleanWa || !cleanTitle) {
      setErrorMsg('Nama, email, WhatsApp, dan judul tugas wajib diisi.');
      return;
    }

    const rawWa = cleanWa.replace(/\D/g, '');
    let normalizedWa = rawWa;
    if (normalizedWa.startsWith('0')) normalizedWa = '62' + normalizedWa.slice(1);
    if (!/^(?:62|60)[0-9]{8,14}$/.test(normalizedWa)) {
      setErrorMsg('Nomor WhatsApp tidak valid. Masukkan nomor WhatsApp aktif (contoh: 081234567890).');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        customer: {
          name: cleanName,
          email: cleanEmail,
          whatsapp: normalizedWa,
          nim: nim.trim()
        },
        task: {
          title: cleanTitle,
          deadline: deadline || 'Fleksibel',
          notes: notes.trim(),
          drive_url: driveUrl.trim()
        },
        items: [
          {
            slug: product.id,
            name: product.title,
            price: product.priceNum,
            quantity: 1
          }
        ]
      };

      const res = await fetch('/api/checkout/reguler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Pemesanan gagal diproses (${res.status}).`);
      }

      setSuccessData({
        orderCode: data.order_code || data.orderId || 'JOKI-' + Date.now(),
        paymentUrl: data.payment_url
      });
    } catch (err: unknown) {
      // Fallback: order through official Admin WhatsApp
      const waText = encodeURIComponent(
        `Halo Admin JOKI.IN, saya mau pesan layanan ${product.title}!\n\nNama: ${cleanName}\nEmail: ${cleanEmail}\nNIM: ${nim.trim() || '-'}\nJudul Tugas: ${cleanTitle}\nDeadline: ${deadline || '-'}\nCatatan: ${notes.trim() || '-'}`
      );
      const waUrl = `https://wa.me/601155639233?text=${waText}`;
      setSuccessData({
        orderCode: 'WA-' + Date.now(),
        paymentUrl: waUrl
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modalOrderTitle">
      <div className={styles.modalCard}>
        <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Tutup Form">
          &times;
        </button>

        {!successData ? (
          <>
            <h2 id="modalOrderTitle" className={styles.modalTitle}>
              Pesan {product.title}
            </h2>
            <p className={styles.modalSubtitle}>
              {product.price} - Isi detail tugas kamu untuk segera diproses tim JOKI.IN.
            </p>

            {errorMsg && (
              <div style={{ color: '#ef4444', marginBottom: '14px', fontSize: '0.88rem' }} role="alert">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderName">Nama Lengkap</label>
                <input
                  id="orderName"
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="Contoh: Kayla"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderEmail">Email Aktif</label>
                <input
                  id="orderEmail"
                  type="email"
                  required
                  className={styles.formInput}
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderWa">Nomor WhatsApp</label>
                <input
                  id="orderWa"
                  type="tel"
                  required
                  className={styles.formInput}
                  placeholder="08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderNim">NIM & Kampus (Opsional)</label>
                <input
                  id="orderNim"
                  type="text"
                  className={styles.formInput}
                  placeholder="NIM / Jurusan / Universitas"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderTaskTitle">Judul / Topik Tugas</label>
                <input
                  id="orderTaskTitle"
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="Contoh: Makalah Analisis Algoritma Sorting"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderDeadline">Deadline Pengumpulan</label>
                <input
                  id="orderDeadline"
                  type="date"
                  className={styles.formInput}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderDrive">Link Google Drive Materi (Opsional)</label>
                <input
                  id="orderDrive"
                  type="url"
                  className={styles.formInput}
                  placeholder="https://drive.google.com/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="orderNotes">Catatan Khusus Pengerjaan</label>
                <textarea
                  id="orderNotes"
                  className={styles.formTextarea}
                  placeholder="Tuliskan format font, margin, jumlah halaman, atau instruksi khusus dosen..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancelBtn} onClick={onClose}>
                  Batal
                </button>
                <button type="submit" className={styles.modalSubmitBtn} disabled={loading}>
                  {loading ? 'Memproses...' : 'Kirim Pesanan'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h2 className={styles.modalTitle}>Pesanan Berhasil Dicatat!</h2>
            <p className={styles.modalSubtitle}>
              Nomor Pesanan: <strong>{successData.orderCode}</strong>
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Detail tugas telah kami terima. Silakan lanjutkan konfirmasi dengan Admin untuk memulai pengerjaan.
            </p>
            {successData.paymentUrl && (
              <a
                href={successData.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryCta}
                style={{ display: 'inline-block', textDecoration: 'none' }}
              >
                Lanjutkan ke Pembayaran / Admin
              </a>
            )}
            <div style={{ marginTop: '20px' }}>
              <button type="button" className={styles.modalCancelBtn} onClick={onClose}>
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
