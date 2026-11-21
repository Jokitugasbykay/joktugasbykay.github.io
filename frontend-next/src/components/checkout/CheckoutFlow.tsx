'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  SITE_CONFIG,
  MAYAR_CONFIG,
  formatRupiah,
  validDriveUrl,
  normalizeWhatsAppNumber,
  maximumOrderQuantity,
  isNightOperationalHours
} from '@/lib/constants';
import type {
  CartItem,
  CustomerData,
  TaskData,
  CheckoutOrder,
  CheckoutValidationErrors
} from '@/lib/types';

interface CheckoutFlowProps {
  initialItems: CartItem[];
  initialOrderId?: string | null;
  onBackToCatalog?: () => void;
}

export default function CheckoutFlow({
  initialItems,
  initialOrderId,
  onBackToCatalog
}: CheckoutFlowProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [customer, setCustomer] = useState<CustomerData>({
    name: '',
    nim: '',
    whatsapp: '',
    waCountry: '62',
    email: ''
  });
  const [task, setTask] = useState<TaskData>({
    title: '',
    deadline: '',
    notes: '',
    googleDriveUrl: ''
  });
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [errors, setErrors] = useState<CheckoutValidationErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<CheckoutOrder | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Persistent draft key for idempotency across retries and status recovery
  const draftKeyRef = useRef<string>('');
  if (!draftKeyRef.current) {
    if (typeof window !== 'undefined') {
      try {
        const savedPending = JSON.parse(
          sessionStorage.getItem('jokiin_pending_mayar_order') ||
          localStorage.getItem('jokiin_pending_mayar_order') ||
          'null'
        );
        if (savedPending?.draftKey && /^(?:[0-9a-f-]{36}|req-[a-z0-9-]+)$/i.test(savedPending.draftKey)) {
          draftKeyRef.current = savedPending.draftKey;
        }
      } catch (_) {}
    }
    if (!draftKeyRef.current) {
      draftKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `req-${Date.now()}-abc12345`;
    }
  }

  // Detect whether this order is for a special product or regular product
  const hasSpecial = items.some(
    (i) => i.isSpecial === true || i.id === 'gemini-pro-18-bulan' || i.id?.startsWith('spcl-')
  );
  const hasRegular = items.some(
    (i) => !i.isSpecial && i.id !== 'gemini-pro-18-bulan' && !i.id?.startsWith('spcl-')
  );
  const isSpecialOrder = hasSpecial && !hasRegular && items.length === 1;

  const subtotal = items.reduce((sum, item) => sum + item.harga * item.quantity, 0);
  const discountAmount = appliedPromo ? Math.round(subtotal * (appliedPromo.percent / 100)) : 0;
  const totalAfterPromo = Math.max(0, subtotal - discountAmount);
  // Volume discount in worker.js line 313: if (subtotal > 1500000) total -= Math.round(total * 0.05);
  const largeOrderDiscount = subtotal > 1500000 ? Math.round(totalAfterPromo * 0.05) : 0;
  const serviceFee = 0;
  const total = Math.max(0, totalAfterPromo - largeOrderDiscount + serviceFee);

  // Status recovery on mount if initialOrderId is present
  useEffect(() => {
    if (!initialOrderId) return;

    let isMounted = true;
    async function recoverOrderStatus(orderId: string) {
      try {
        const headers: Record<string, string> = {};
        if (draftKeyRef.current) {
          headers['x-order-key'] = draftKeyRef.current;
        }
        const res = await fetch(`${MAYAR_CONFIG.statusUrl}?order_id=${encodeURIComponent(orderId)}`, {
          headers
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!isMounted || !data || !data.order_id) return;

        let savedDetails: any = null;
        try {
          savedDetails = JSON.parse(
            sessionStorage.getItem('jokiin_mayar_order') ||
            sessionStorage.getItem('jokiin_pending_mayar_order') ||
            localStorage.getItem('jokiin_pending_mayar_order') ||
            'null'
          );
        } catch (_) {}

        setCompletedOrder({
          id: data.order_id,
          orderCode: data.order_code,
          gateway: 'mayar',
          total: Number(data.amount || savedDetails?.total || 0),
          paymentStatus: data.payment_status || 'PENDING',
          paymentMethod: data.payment_method || savedDetails?.paymentMethod || undefined,
          paymentUrl: data.payment_url || savedDetails?.paymentUrl || undefined,
          expiryTime: data.expires_at || savedDetails?.expiryTime || undefined,
          customer: {
            name: savedDetails?.customer?.name || data.customer?.name || 'Pelanggan JOKI.IN',
            email: savedDetails?.customer?.email || data.customer?.email || '',
            whatsapp: savedDetails?.customer?.whatsapp || data.customer?.whatsapp || ''
          },
          task: {
            title: savedDetails?.task?.title || data.task?.title || 'Pesanan JOKI.IN',
            deadline: savedDetails?.task?.deadline || data.task?.deadline || '-',
            notes: savedDetails?.task?.notes || data.task?.notes || ''
          },
          items: savedDetails?.items || []
        });
      } catch (_) {}
    }

    recoverOrderStatus(initialOrderId);
    return () => {
      isMounted = false;
    };
  }, [initialOrderId]);

  // Polling for payment status if order is PENDING
  useEffect(() => {
    if (!completedOrder || completedOrder.paymentStatus !== 'PENDING') return;
    const orderId = completedOrder.orderCode || completedOrder.id;
    if (!orderId) return;

    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 30;

    const checkStatus = async () => {
      try {
        const headers: Record<string, string> = {};
        if (draftKeyRef.current) {
          headers['x-order-key'] = draftKeyRef.current;
        }
        const res = await fetch(`${MAYAR_CONFIG.statusUrl}?order_id=${encodeURIComponent(orderId)}`, {
          headers
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data && data.payment_status) {
          const status = String(data.payment_status).toUpperCase();
          if (status === 'PAID') {
            setCompletedOrder((prev) => (prev ? { ...prev, paymentStatus: 'PAID', paymentMethod: data.payment_method || prev.paymentMethod } : null));
            try {
              sessionStorage.removeItem('jokiin_pending_mayar_order');
              localStorage.removeItem('jokiin_pending_mayar_order');
              localStorage.removeItem('jokiin_cart');
            } catch (_) {}
            setIsPolling(false);
          } else if (status === 'CANCELED') {
            setCompletedOrder((prev) => (prev ? { ...prev, paymentStatus: 'CANCELED' } : null));
            try {
              sessionStorage.removeItem('jokiin_pending_mayar_order');
              localStorage.removeItem('jokiin_pending_mayar_order');
            } catch (_) {}
            setIsPolling(false);
          }
        }
      } catch (_) {}
    };

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setIsPolling(false);
        return;
      }
      await checkStatus();
    }, 4000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setIsPolling(false);
    };
  }, [completedOrder?.id, completedOrder?.paymentStatus]);

  const handleQtyChange = (id: string, delta: number) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.id !== id) return item;
          const maxQ = maximumOrderQuantity(item.isSpecial);
          const nextQ = item.quantity + delta;
          if (nextQ < 1) return null;
          return {
            ...item,
            quantity: Math.min(maxQ, nextQ)
          };
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      setPromoMessage(null);
      return;
    }
    if (!/^[A-Z0-9]{4,24}$/.test(code)) {
      setAppliedPromo(null);
      setPromoMessage({
        text: 'Kode promo hanya boleh berisi 4-24 karakter huruf atau angka.',
        isError: true
      });
      return;
    }

    try {
      const res = await fetch(`${MAYAR_CONFIG.promoUrl}?code=${encodeURIComponent(code)}`);
      const data = await res.json().catch(() => null);

      if (res.ok) {
        if (data?.valid && Number(data.discount_percent) > 0) {
          setAppliedPromo({ code, percent: Number(data.discount_percent) });
          setPromoMessage({
            text: `Diskon ${data.discount_percent}% berhasil digunakan.`,
            isError: false
          });
        } else {
          setAppliedPromo(null);
          setPromoMessage({
            text: 'Kode promo tidak berlaku atau sudah berakhir.',
            isError: true
          });
        }
      } else if (res.status === 400) {
        setAppliedPromo(null);
        setPromoMessage({
          text: 'Format kode promo tidak valid.',
          isError: true
        });
      } else if (res.status === 403) {
        setAppliedPromo(null);
        setPromoMessage({
          text: 'Akses validasi promo ditolak (Origin tidak diizinkan).',
          isError: true
        });
      } else if (res.status === 409) {
        setAppliedPromo(null);
        setPromoMessage({
          text: data?.error || 'Kode promo tidak berlaku atau terdapat konflik promo.',
          isError: true
        });
      } else if (res.status === 502 || res.status === 503) {
        setAppliedPromo(null);
        setPromoMessage({
          text: 'Layanan validasi promo sedang sibuk. Silakan coba sesaat lagi.',
          isError: true
        });
      } else {
        setAppliedPromo(null);
        setPromoMessage({
          text: data?.error || 'Gagal memverifikasi kode promo.',
          isError: true
        });
      }
    } catch (_) {
      setAppliedPromo(null);
      setPromoMessage({
        text: 'Koneksi ke layanan promo terputus. Periksa jaringan Anda.',
        isError: true
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: CheckoutValidationErrors = {};

    if (hasSpecial && hasRegular) {
      setGeneralError('Penawaran Spesial harus dibayar terpisah. Kosongkan keranjang reguler atau selesaikan pesanan reguler dulu.');
      return false;
    }

    if (hasSpecial && items.length > 1) {
      setGeneralError('Layanan Penawaran Spesial dibatasi maksimal 1 item per transaksi.');
      return false;
    }

    if (!customer.name.trim()) {
      newErrors.name = 'Nama lengkap wajib diisi.';
    }

    const cleanWa = customer.whatsapp.replace(/\D/g, '');
    if (!cleanWa) {
      newErrors.whatsapp = 'Nomor WhatsApp wajib diisi.';
    } else if (!/^[0-9]+$/.test(cleanWa)) {
      newErrors.whatsapp = 'Nomor WhatsApp hanya boleh berisi angka (0-9).';
    }

    const cleanEmail = customer.email.trim().toLowerCase();
    if (!cleanEmail) {
      newErrors.email = 'Email wajib diisi.';
    } else if (!/^[^\s@]+@gmail\.com$/.test(cleanEmail)) {
      newErrors.email = 'Email wajib menggunakan akun @gmail.com.';
    }

    if (!isSpecialOrder) {
      if (!task.title.trim()) {
        newErrors.title = 'Judul tugas wajib diisi.';
      }

      if (!task.deadline.trim()) {
        newErrors.deadline = 'Deadline tugas wajib diisi.';
      }

      if (!task.notes.trim()) {
        newErrors.notes = 'Catatan tugas wajib diisi.';
      }

      if (task.googleDriveUrl.trim() && !validDriveUrl(task.googleDriveUrl.trim())) {
        newErrors.googleDriveUrl = 'Link Google Drive tidak valid. Gunakan link dari drive.google.com.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProcessCheckout = async () => {
    if (isSubmitting) return;
    setGeneralError(null);

    if (items.length === 0) {
      setGeneralError('Keranjang belanja kosong. Silakan pilih layanan terlebih dahulu.');
      return;
    }

    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const fullWa = normalizeWhatsAppNumber(customer.waCountry + customer.whatsapp.replace(/^0+/, ''));

      if (isSpecialOrder) {
        const specialPayload = {
          slug: items[0].id,
          qty: items[0].quantity,
          nama: customer.name.trim(),
          email: customer.email.trim().toLowerCase(),
          whatsapp: fullWa,
          nim: customer.nim.trim() || undefined,
          payment_method: 'Mayar'
        };

        const response = await fetch(MAYAR_CONFIG.checkoutSpecialUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(specialPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 400) {
            setGeneralError(result.error || 'Data kontak Penawaran Spesial belum lengkap.');
          } else if (response.status === 403) {
            setGeneralError('Akses ditolak (Origin tidak diizinkan). Silakan akses melalui situs resmi https://jokiin.my.id.');
          } else if (response.status === 409) {
            setGeneralError(result.error || 'Pesanan Penawaran Spesial harus dibayar terpisah atau stok habis.');
          } else if (response.status === 502) {
            setGeneralError('Layanan pembayaran Mayar sedang sibuk. Silakan coba kembali.');
          } else {
            setGeneralError(result.error || 'Gagal memproses pesanan khusus.');
          }
          return;
        }

        const orderData = result.order || result;
        const newOrder: CheckoutOrder = {
          id: orderData.order_code || orderData.id || `SPCL-${Date.now()}`,
          orderCode: orderData.order_code,
          gateway: 'mayar',
          total: Number(orderData.total || orderData.total_price || total),
          paymentStatus: orderData.payment_status || 'PENDING',
          paymentUrl: result.paymentUrl || result.payment_url || orderData.payment_url,
          expiryTime: result.expires_at || orderData.expires_at,
          customer: {
            name: customer.name.trim(),
            nim: customer.nim.trim() || undefined,
            whatsapp: fullWa,
            email: customer.email.trim().toLowerCase()
          },
          task: {
            title: 'Penawaran Spesial (Akun Digital)',
            deadline: '-',
            notes: 'Akun dikirim langsung ke Gmail dan WhatsApp.'
          },
          items: items.map((i) => ({
            productId: i.id,
            name: i.nama,
            price: i.harga,
            quantity: i.quantity
          }))
        };

        setCompletedOrder(newOrder);
        try {
          const pendingData = {
            id: newOrder.id,
            draftKey: draftKeyRef.current,
            orderCode: newOrder.orderCode,
            total: newOrder.total,
            paymentUrl: newOrder.paymentUrl,
            expiryTime: newOrder.expiryTime,
            paymentStatus: newOrder.paymentStatus,
            gateway: 'mayar'
          };
          sessionStorage.setItem('jokiin_pending_mayar_order', JSON.stringify(pendingData));
          localStorage.setItem('jokiin_pending_mayar_order', JSON.stringify(pendingData));
          localStorage.setItem('jokiin_last_order_id', newOrder.id);
          sessionStorage.setItem('jokiin_mayar_order', JSON.stringify(newOrder));
        } catch (_) {}
      } else {
        const regularPayload = {
          draftKey: draftKeyRef.current,
          amount: total,
          customer: {
            name: customer.name.trim(),
            nim: customer.nim.trim() || undefined,
            whatsapp: fullWa,
            email: customer.email.trim().toLowerCase()
          },
          task: {
            title: task.title.trim(),
            deadline: task.deadline.trim(),
            notes: task.notes.trim(),
            googleDriveUrl: task.googleDriveUrl.trim() || undefined
          },
          items: items.map((i) => ({
            productId: i.id,
            name: i.nama,
            price: i.harga,
            quantity: i.quantity
          })),
          promo: appliedPromo ? appliedPromo.code : undefined,
          paymentMethod: 'midtrans_qris'
        };

        const response = await fetch(MAYAR_CONFIG.createPaymentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(regularPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 400) {
            setGeneralError(result.error || 'Data pesanan atau detail kontak belum lengkap. Periksa kembali formulir.');
          } else if (response.status === 403) {
            setGeneralError('Akses ditolak (Origin tidak diizinkan). Silakan akses melalui situs resmi https://jokiin.my.id.');
          } else if (response.status === 409) {
            if (result.code === 'CART_TYPE_CONFLICT') {
              setGeneralError('Penawaran Spesial harus dibayar terpisah dari pesanan reguler.');
            } else {
              setGeneralError(result.error || 'Harga berubah atau promo sudah berakhir. Silakan muat ulang layanan.');
            }
          } else if (response.status === 502) {
            setGeneralError('Layanan pembayaran Mayar sedang sibuk. Silakan coba beberapa saat lagi.');
          } else {
            setGeneralError(result.error || 'Gagal membuat transaksi pembayaran.');
          }
          return;
        }

        const newOrder: CheckoutOrder = {
          id: result.order_id || `NUG-${Date.now()}`,
          orderCode: result.order_code,
          gateway: 'mayar',
          total: Number(result.total) || total,
          paymentStatus: result.payment_status || 'PENDING',
          paymentUrl: result.paymentUrl,
          expiryTime: result.expires_at,
          customer: regularPayload.customer,
          task: regularPayload.task,
          items: regularPayload.items
        };

        setCompletedOrder(newOrder);
        try {
          const pendingData = {
            id: newOrder.id,
            draftKey: draftKeyRef.current,
            orderCode: newOrder.orderCode,
            total: newOrder.total,
            paymentUrl: newOrder.paymentUrl,
            expiryTime: newOrder.expiryTime,
            paymentStatus: newOrder.paymentStatus,
            gateway: 'mayar'
          };
          sessionStorage.setItem('jokiin_pending_mayar_order', JSON.stringify(pendingData));
          localStorage.setItem('jokiin_pending_mayar_order', JSON.stringify(pendingData));
          localStorage.setItem('jokiin_last_order_id', newOrder.id);
          sessionStorage.setItem('jokiin_mayar_order', JSON.stringify(newOrder));
        } catch (_) {}
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setGeneralError('Waktu permintaan habis (timeout). Silakan periksa jaringan dan coba lagi.');
      } else {
        setGeneralError(err.message || 'Koneksi terputus. Periksa jaringan Anda dan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyOrderId = () => {
    if (!completedOrder) return;
    const textToCopy = completedOrder.orderCode || completedOrder.id;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  if (completedOrder) {
    const isPaid = completedOrder.paymentStatus === 'PAID';
    const isCanceled = completedOrder.paymentStatus === 'CANCELED';

    let badgeText = 'Menunggu Pembayaran';
    let badgeBg = 'rgba(245, 158, 11, 0.15)';
    let badgeColor = '#f59e0b';
    let titleText = 'Menunggu Pembayaran QRIS';
    let descText = 'Silakan selesaikan pembayaran untuk memulai pengerjaan tugas Anda.';

    if (isPaid) {
      badgeText = 'Pembayaran Terverifikasi';
      badgeBg = 'rgba(31, 209, 139, 0.2)';
      badgeColor = 'var(--accent-green)';
      titleText = 'Pesanan Berhasil Dibayar';
      descText = 'Terima kasih, pembayaran Anda telah diterima. Tim kami sedang menyiapkan pengerjaan tugas Anda.';
    } else if (isCanceled) {
      badgeText = 'Pembayaran Dibatalkan';
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeColor = '#ef4444';
      titleText = 'Pembayaran Tidak Berhasil';
      descText = 'Pembayaran telah dibatalkan atau waktu pembayaran telah kedaluwarsa. Silakan buat pesanan baru.';
    }

    return (
      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '24px 16px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '999px',
              background: badgeBg,
              color: badgeColor,
              fontWeight: 700,
              fontSize: '12px',
              marginBottom: '16px'
            }}
          >
            {badgeText}
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', color: 'var(--text-main)' }}>
            {titleText}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px' }}>
            {descText}
          </p>

          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nomor Pesanan</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  {completedOrder.orderCode || completedOrder.id}
                </strong>
                <button
                  type="button"
                  onClick={copyOrderId}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    fontSize: '11px',
                    color: 'var(--accent-green)',
                    cursor: 'pointer'
                  }}
                >
                  {copiedId ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Pembayaran</span>
              <strong style={{ fontSize: '16px', color: 'var(--accent-green)' }}>
                {formatRupiah(completedOrder.total)}
              </strong>
            </div>
          </div>

          {isCanceled && (
            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--accent-green)',
                color: '#04251a',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(31, 209, 139, 0.25)'
              }}
            >
              Buat Pesanan Baru
            </button>
          )}

          {!isPaid && !isCanceled && completedOrder.paymentUrl && (
            <a
              href={completedOrder.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--accent-green)',
                color: '#04251a',
                fontWeight: 700,
                fontSize: '15px',
                textAlign: 'center',
                textDecoration: 'none',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(31, 209, 139, 0.25)'
              }}
            >
              Bayar Sekarang via QRIS (Mayar)
            </a>
          )}

          {!isPaid && !isCanceled && isPolling && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Memeriksa status pembayaran secara berkala...
            </p>
          )}

          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '16px 0 40px' }}>
      {onBackToCatalog && (
        <button
          type="button"
          onClick={onBackToCatalog}
          style={{
            border: 'none',
            padding: 0,
            marginBottom: '20px',
            background: 'transparent',
            color: 'var(--accent-green)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Kembali ke Katalog
        </button>
      )}

      {generalError && (
        <div
          role="alert"
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            lineHeight: 1.5
          }}
        >
          {generalError}
        </div>
      )}

      {/* STEP 1: PRODUK YANG DIBELI */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              color: '#04251a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px'
            }}
          >
            1
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Produk yang Dibeli
          </h2>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Belum ada produk yang dipilih.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {items.map((item) => {
              const maxQ = maximumOrderQuantity(item.isSpecial);
              const isAtMax = item.quantity >= maxQ;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
                      {item.nama}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: 600 }}>
                      {formatRupiah(item.harga)}
                    </div>
                    {item.isSpecial ? (
                      <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>
                        Batas 1x per hari
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>
                        Batas 2x per hari
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(item.id, -1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      aria-label="Kurangi jumlah"
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '14px', minWidth: '24px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={isAtMax}
                      onClick={() => handleQtyChange(item.id, 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        opacity: isAtMax ? 0.35 : 1,
                        cursor: isAtMax ? 'not-allowed' : 'pointer'
                      }}
                      aria-label="Tambah jumlah"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isNightOperationalHours() && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              fontSize: '13px',
              color: 'var(--text-muted)'
            }}
          >
            <strong style={{ color: '#d97706', display: 'block', marginBottom: '2px' }}>
              Jam Istirahat Admin (22:00 - 05:00 WIB)
            </strong>
            Checkout tetap aktif normal. Pesanan Anda akan diverifikasi dan diproses mulai pukul 05:00 WIB.
          </div>
        )}
      </section>

      {/* STEP 2: DETAIL TUGAS */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              color: '#04251a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px'
            }}
          >
            2
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Detail Tugas
          </h2>
        </div>

        {isSpecialOrder ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--text-muted)'
            }}
          >
            <strong style={{ color: 'var(--accent-green)', display: 'block', marginBottom: '4px' }}>
              Penawaran Spesial (Akun Digital Siap Pakai)
            </strong>
            Produk ini tidak memerlukan rincian tugas atau berkas lampiran. Informasi akun akan dikirimkan langsung ke alamat Gmail dan nomor WhatsApp Anda setelah pembayaran terverifikasi.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="field-title"
                style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                Judul / Nama Tugas <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="field-title"
                type="text"
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                placeholder="Contoh: Makalah Manajemen Pemasaran Bab 1-3"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: errors.title ? '#ef4444' : 'var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.title && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-deadline"
                style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                Deadline Tugas <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="field-deadline"
                type="date"
                value={task.deadline}
                onChange={(e) => setTask({ ...task, deadline: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: errors.deadline ? '#ef4444' : 'var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              {errors.deadline && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                  {errors.deadline}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-notes"
                style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                Catatan &amp; Instruksi Tugas <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="field-notes"
                rows={3}
                value={task.notes}
                onChange={(e) => setTask({ ...task, notes: e.target.value })}
                placeholder="Jelaskan kebutuhan, format sitasi, atau instruksi dosen..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: errors.notes ? '#ef4444' : 'var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {errors.notes && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                  {errors.notes}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                Upload File Lampiran / Tugas <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>(Opsional)</span>
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b'
                  }}
                >
                  Dalam Perbaikan
                </span>
              </label>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-color)',
                  background: 'var(--bg-primary)',
                  textAlign: 'center',
                  opacity: 0.7
                }}
              >
                <p style={{ fontSize: '12px', color: '#f59e0b', margin: 0, fontWeight: 600 }}>
                  Fitur upload file langsung sedang dalam perbaikan. Silakan gunakan link Google Drive pada kolom di bawah.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="field-googleDriveUrl"
                style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                Link Dokumen / Google Drive <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>(Opsional)</span>
              </label>
              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '8px'
                }}
              >
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                  Pastikan akses Google Drive diatur ke Anyone with the link (Siapa saja yang memiliki link).
                </p>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginBottom: '10px'
                  }}
                >
                  Buka Google Drive
                </a>
                <input
                  id="field-googleDriveUrl"
                  type="url"
                  value={task.googleDriveUrl}
                  onChange={(e) => setTask({ ...task, googleDriveUrl: e.target.value })}
                  placeholder="Contoh: https://drive.google.com/..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: errors.googleDriveUrl ? '#ef4444' : 'var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {errors.googleDriveUrl && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                  {errors.googleDriveUrl}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* STEP 3: KODE PROMO */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              color: '#04251a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px'
            }}
          >
            3
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Kode Promo
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={promoCodeInput}
            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
            placeholder="Ketik Kode Promo Kamu"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-main)',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--accent-green)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Gunakan
          </button>
        </div>

        {promoMessage && (
          <p
            style={{
              margin: '10px 0 0',
              fontSize: '13px',
              fontWeight: 600,
              color: promoMessage.isError ? '#ef4444' : 'var(--accent-green)'
            }}
          >
            {promoMessage.text}
          </p>
        )}
      </section>

      {/* STEP 4: DETAIL KONTAK */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              color: '#04251a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px'
            }}
          >
            4
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Detail Kontak <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 400 }}>*wajib</span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="field-name"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
            >
              Nama Lengkap <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="field-name"
              type="text"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              placeholder="Masukkan nama lengkap Anda"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: errors.name ? '#ef4444' : 'var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            {errors.name && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="field-nim"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
            >
              NIM <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>(Opsional)</span>
            </label>
            <input
              id="field-nim"
              type="text"
              inputMode="numeric"
              value={customer.nim}
              onChange={(e) => setCustomer({ ...customer, nim: e.target.value })}
              placeholder="Masukkan nomor induk mahasiswa (opsional)"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="field-whatsapp"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
            >
              Nomor WhatsApp <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={customer.waCountry}
                onChange={(e) => setCustomer({ ...customer, waCountry: e.target.value })}
                style={{
                  width: '100px',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px'
                }}
              >
                <option value="62">ID +62</option>
                <option value="60">MY +60</option>
              </select>
              <input
                id="field-whatsapp"
                type="tel"
                inputMode="numeric"
                value={customer.whatsapp}
                onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })}
                placeholder="81234567890"
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: errors.whatsapp ? '#ef4444' : 'var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Masukkan nomor tanpa angka 0 di depan.
            </p>
            {errors.whatsapp && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                {errors.whatsapp}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="field-email"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}
            >
              Gmail <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="field-email"
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              placeholder="nama@gmail.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: errors.email ? '#ef4444' : 'var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Pastikan alamat Gmail aktif untuk menerima berkas hasil tugas.
            </p>
            {errors.email && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#ef4444' }}>
                {errors.email}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* STEP 5: KONFIRMASI TRANSAKSI */}
      <section
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-green)',
              color: '#04251a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px'
            }}
          >
            5
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Konfirmasi Transaksi
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
            <span>Subtotal Produk</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatRupiah(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--accent-green)' }}>
              <span>Diskon Promo ({appliedPromo?.code})</span>
              <span style={{ fontWeight: 600 }}>-{formatRupiah(discountAmount)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
            <span>Biaya Layanan</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatRupiah(serviceFee)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '16px'
            }}
          >
            <strong style={{ color: 'var(--text-main)' }}>Total Pembayaran</strong>
            <strong style={{ color: 'var(--accent-green)', fontSize: '20px' }}>{formatRupiah(total)}</strong>
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            fontSize: '13px'
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Metode Pembayaran:</div>
          <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>QRIS (Mayar - Verifikasi Otomatis)</div>
        </div>

        <button
          type="button"
          disabled={isSubmitting || items.length === 0}
          onClick={handleProcessCheckout}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--accent-green)',
            color: '#04251a',
            fontSize: '16px',
            fontWeight: 800,
            border: 'none',
            cursor: isSubmitting || items.length === 0 ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || items.length === 0 ? 0.6 : 1,
            boxShadow: '0 4px 16px rgba(31, 209, 139, 0.3)',
            transition: 'opacity 0.2s ease'
          }}
        >
          {isSubmitting ? 'Memproses Pesanan...' : 'Beli Sekarang'}
        </button>
      </section>
    </div>
  );
}
