'use client';

import React, { useState } from 'react';
import type { AdminOrder } from '@/types/admin';
import styles from './admin.module.css';

export default function AdminOrdersPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'folder'>('orders');
  const [token, setToken] = useState('');
  const [statusFilter, setStatusFilter] = useState('paid');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Masukkan token lalu tekan Muat. Token hanya disimpan di memori halaman ini.');
  const [isError, setIsError] = useState(false);

  // Folder panel state
  const [adminSession, setAdminSession] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [folderMessage, setFolderMessage] = useState('');
  const [folderLoading, setFolderLoading] = useState(false);

  const rupiah = (n: number) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

  const formatWhen = (s?: string | null) => {
    if (!s) return '-';
    const d = new Date(String(s).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
    return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleString('id-ID');
  };

  const safeLink = (href?: string, text?: string) => {
    if (!href) return '-';
    try {
      const u = new URL(href);
      if (u.protocol !== 'https:') return text || href;
      return (
        <a href={u.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {text || u.href}
        </a>
      );
    } catch {
      return href || '-';
    }
  };

  const handleLoadOrders = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setIsError(true);
      setMessage('Token admin wajib diisi.');
      return;
    }

    setLoading(true);
    setIsError(false);
    setMessage('Memuat…');

    try {
      const res = await fetch(`/api/admin-orders.php?status=${encodeURIComponent(statusFilter)}`, {
        headers: { 'X-Admin-Token': trimmed },
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Galat ${res.status}`);
      }

      const list: AdminOrder[] = data.orders || [];
      setOrders(list);
      setIsError(false);
      setMessage(list.length ? `${list.length} pesanan.` : 'Belum ada pesanan pada filter ini.');
    } catch (err: unknown) {
      setOrders([]);
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Gagal memuat pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFolder = async () => {
    const trimmedSession = adminSession.trim();
    const trimmedUrl = folderUrl.trim();
    if (!trimmedSession) {
      setFolderMessage('Token sesi admin diperlukan.');
      return;
    }

    setFolderLoading(true);
    setFolderMessage('Menyimpan folder…');

    try {
      const paymentApi = 'https://jokiin-payment-api.gamingyoga14.workers.dev';
      const res = await fetch(`${paymentApi}/api/task-folder`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${trimmedSession}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder_url: trimmedUrl })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan folder.');
      }
      setFolderMessage('Folder lampiran diperbarui.');
    } catch (err: unknown) {
      setFolderMessage(err instanceof Error ? err.message : 'Gagal menyimpan folder.');
    } finally {
      setFolderLoading(false);
    }
  };

  return (
    <main className={styles.adminMain}>
      <header className={styles.adminHeading}>
        <img className={styles.brandLight} src="/assets/brand-light-lockup.png" alt="JOKI.IN" width="150" height="38" />
        <img className={styles.brandDark} src="/assets/brand-dark-lockup.png" alt="JOKI.IN" width="150" height="38" />
        <h1 className={styles.title}>Pesanan</h1>
      </header>

      <nav className={styles.bar} aria-label="Tab admin">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Pesanan
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'folder' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('folder')}
        >
          Folder Lampiran
        </button>
      </nav>

      {activeTab === 'folder' && (
        <section className={styles.panel} aria-labelledby="folderTitle">
          <h2 id="folderTitle" className={styles.panelTitle}>Folder Google Drive untuk lampiran pelanggan</h2>
          <p className={styles.panelDesc}>
            Tempel link folder utama sekali saja. Sistem akan membuat dan memakai subfolder tanggal hari ini secara otomatis. Gunakan akun admin JOKI.IN yang memiliki akses ke Supabase.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveFolder(); }}>
            <div className={styles.bar}>
              <input
                type="password"
                className={styles.inputField}
                autoComplete="off"
                placeholder="Token sesi admin Supabase"
                aria-label="Token sesi admin Supabase"
                value={adminSession}
                onChange={(e) => setAdminSession(e.target.value)}
              />
            </div>
            <div className={styles.bar}>
              <input
                type="url"
                className={styles.inputField}
                placeholder="https://drive.google.com/drive/folders/..."
                aria-label="URL Folder Google Drive"
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
              />
              <button
                type="submit"
                className={styles.actionBtn}
                disabled={folderLoading}
              >
                {folderLoading ? 'Menyimpan...' : 'Simpan folder'}
              </button>
            </div>
          </form>
          {folderMessage && <p role="status" className={styles.msg}>{folderMessage}</p>}
        </section>
      )}

      {activeTab === 'orders' && (
        <section aria-labelledby="ordersTitle">
          <h2 id="ordersTitle" className="sr-only" style={{ display: 'none' }}>Daftar Pesanan</h2>
          <form className={styles.bar} onSubmit={(e) => { e.preventDefault(); handleLoadOrders(); }}>
            <input
              type="password"
              className={styles.inputField}
              placeholder="Token admin (ADMIN_TOKEN)"
              autoComplete="off"
              aria-label="Token admin"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <select
              className={styles.selectField}
              aria-label="Filter status pesanan"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="paid">Sudah dibayar</option>
              <option value="pending">Menunggu pembayaran</option>
              <option value="canceled">Dibatalkan/kedaluwarsa</option>
              <option value="all">Semua</option>
            </select>
            <button
              type="submit"
              className={styles.actionBtn}
              disabled={loading}
            >
              {loading ? 'Memuat...' : 'Muat'}
            </button>
          </form>

          <div role="status" className={`${styles.msg} ${isError ? styles.msgErr : ''}`}>
            {message}
          </div>

          <div>
            {orders.map((o) => {
              const waClean = String(o.customer?.whatsapp || '').replace(/\D/g, '');
              const waLink = waClean ? `https://wa.me/${waClean}` : '';
              const badgeClass =
                o.payment_status === 'PAID'
                  ? styles.badgePAID
                  : o.payment_status === 'PENDING'
                  ? styles.badgePENDING
                  : styles.badgeCANCELED;

              return (
                <article key={o.order_id} className={styles.orderCard}>
                  <div className={styles.cardHead}>
                    <span className={`${styles.statusBadge} ${badgeClass}`}>
                      {o.payment_status}
                    </span>
                    <span className={styles.orderId}>{o.order_id}</span>
                  </div>
                  <dl className={styles.detailList}>
                    <dt className={styles.detailDt}>Total</dt>
                    <dd className={styles.detailDd}>
                      {rupiah(o.amount)} {o.promo ? `(promo ${o.promo})` : ''}
                    </dd>

                    <dt className={styles.detailDt}>{o.paid_at ? 'Dibayar' : 'Dibuat'}</dt>
                    <dd className={styles.detailDd}>{formatWhen(o.paid_at || o.created_at)}</dd>

                    <dt className={styles.detailDt}>Layanan</dt>
                    <dd className={styles.detailDd}>
                      {(o.items || [])
                        .map((i) => `${i.name || i.slug || 'Layanan'} × ${i.quantity || i.qty || 1}`)
                        .join('\n') || '-'}
                    </dd>

                    <dt className={styles.detailDt}>Nama</dt>
                    <dd className={styles.detailDd}>{o.customer?.name || '-'}</dd>

                    <dt className={styles.detailDt}>WhatsApp</dt>
                    <dd className={styles.detailDd}>
                      {waLink ? safeLink(waLink, o.customer?.whatsapp) : '-'}
                    </dd>

                    <dt className={styles.detailDt}>Email</dt>
                    <dd className={styles.detailDd}>{o.customer?.email || '-'}</dd>

                    <dt className={styles.detailDt}>NIM</dt>
                    <dd className={styles.detailDd}>{o.customer?.nim || '-'}</dd>

                    <dt className={styles.detailDt}>Judul tugas</dt>
                    <dd className={styles.detailDd}>{o.task?.title || '-'}</dd>

                    <dt className={styles.detailDt}>Deadline</dt>
                    <dd className={styles.detailDd}>{o.task?.deadline || '-'}</dd>

                    <dt className={styles.detailDt}>Catatan</dt>
                    <dd className={styles.detailDd}>{o.task?.notes || '-'}</dd>

                    <dt className={styles.detailDt}>Link Drive</dt>
                    <dd className={styles.detailDd}>
                      {o.task?.drive_url ? safeLink(o.task.drive_url) : '-'}
                    </dd>

                    {Array.isArray(o.task?.attachments) &&
                      o.task.attachments.map((file, idx) => (
                        <React.Fragment key={idx}>
                          <dt className={styles.detailDt}>Lampiran {idx + 1}</dt>
                          <dd className={styles.detailDd}>
                            {safeLink(file.drive_url, file.name)}
                          </dd>
                        </React.Fragment>
                      ))}
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
