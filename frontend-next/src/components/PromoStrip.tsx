'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CatalogProduct } from '@/types/catalog';

export interface PromoApiResponse {
  penawaran_spesial_aktif?: boolean;
  promo_judul?: string;
  promo_deadline?: string | null;
  server_time?: string;
  banners?: Array<{
    id?: string;
    judul?: string;
    gambar_url?: string;
    tampil_di_atas?: boolean;
    urutan?: number;
    is_active?: boolean;
    status?: string;
  }>;
  product?: {
    id?: string;
    slug?: string;
    nama?: string;
    name?: string;
    is_active?: boolean;
    status?: string;
    harga_dasar?: number;
    priceNum?: number;
    diskon_persen?: number;
    deskripsi?: string;
    [key: string]: unknown;
  } | null;
  featured_product?: {
    id?: string;
    slug?: string;
    nama?: string;
    name?: string;
    is_active?: boolean;
    status?: string;
    harga_dasar?: number;
    priceNum?: number;
    diskon_persen?: number;
    deskripsi?: string;
    [key: string]: unknown;
  } | null;
  coupon?: string;
  coupon_code?: string;
  discount_percent?: number;
  campaign_id?: string;
  promo_id?: string;
  label?: string;
  badge?: string;
  text?: string;
  lead?: string;
  is_active?: boolean;
  status?: string;
  used?: boolean;
}

export interface PromoClaimPayload {
  coupon?: string;
  product?: CatalogProduct | null;
  title?: string;
}

export interface PromoStripProps {
  onClaimPromo?: (payload: PromoClaimPayload) => void;
  apiEndpoint?: string;
  initialData?: PromoApiResponse | null;
}

export function validatePromoEligibility(data: unknown): {
  valid: boolean;
  campaignId: string;
  deadlineMs: number;
  offsetMs: number;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }

  const promo = data as PromoApiResponse;

  // 1. penawaran_spesial_aktif must be strictly true
  if (promo.penawaran_spesial_aktif !== true) {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }

  // 2. Account / voucher already redeemed
  if (promo.used === true) {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }

  // 3. Product check: if a product is linked, it must be active and not inactive
  const prod = promo.featured_product ?? promo.product;
  if (prod) {
    if (prod.is_active === false || prod.status === 'inactive') {
      return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
    }
  }
  if (promo.is_active === false || promo.status === 'inactive') {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }

  // 4. Deadline validation
  if (!promo.promo_deadline || typeof promo.promo_deadline !== 'string') {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }
  const deadlineMs = Date.parse(promo.promo_deadline);
  if (!Number.isFinite(deadlineMs)) {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }

  const serverTimeMs = promo.server_time ? Date.parse(promo.server_time) : Date.now();
  const offsetMs = Number.isFinite(serverTimeMs) ? serverTimeMs - Date.now() : 0;
  const currentServerTime = Date.now() + offsetMs;

  if (deadlineMs <= currentServerTime) {
    return { valid: false, campaignId: '', deadlineMs: 0, offsetMs: 0 };
  }

  const campaignId = String(
    promo.campaign_id ||
    promo.promo_id ||
    (promo.banners && promo.banners[0] ? promo.banners[0].id : '') ||
    promo.promo_judul ||
    'default'
  );

  return { valid: true, campaignId, deadlineMs, offsetMs };
}

export function computeTimeLeft(deadlineMs: number, offsetMs: number = 0): {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  expired: boolean;
} {
  const nowServer = Date.now() + offsetMs;
  const remainingMs = Math.max(0, deadlineMs - nowServer);
  if (remainingMs <= 0) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', expired: true };
  }
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    expired: false
  };
}

export default function PromoStrip({
  onClaimPromo,
  apiEndpoint = '/api/promo/banner',
  initialData = null
}: PromoStripProps) {
  // Always default to hidden so there is no layout flash on refresh or initial render
  const [hidden, setHidden] = useState<boolean>(true);
  const [expired, setExpired] = useState<boolean>(false);
  const [promoData, setPromoData] = useState<PromoApiResponse | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyPromoPayload = useCallback((payload: unknown) => {
    const check = validatePromoEligibility(payload);
    if (!check.valid) {
      setHidden(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Check sessionStorage for active dismissal
    let isDismissed = false;
    try {
      const specificDismissal = Number(sessionStorage.getItem(`jokiin_promo_dismissed_until:${check.campaignId}`)) || 0;
      const globalDismissal = Number(sessionStorage.getItem('jokiin_promo_dismissed_until')) || 0;
      const dismissedUntil = Math.max(specificDismissal, globalDismissal);
      if (dismissedUntil > Date.now()) {
        isDismissed = true;
      }
    } catch (_) {
      isDismissed = false;
    }

    if (isDismissed) {
      setHidden(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const promo = payload as PromoApiResponse;
    setPromoData(promo);
    setActiveCampaignId(check.campaignId);
    setExpired(false);
    setHidden(false);

    const initialRemaining = computeTimeLeft(check.deadlineMs, check.offsetMs);
    if (initialRemaining.expired) {
      setHidden(true);
      setExpired(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setTimeLeft(initialRemaining);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      const remaining = computeTimeLeft(check.deadlineMs, check.offsetMs);
      if (remaining.expired) {
        setHidden(true);
        setExpired(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
  }, []);

  const fetchLivePromo = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal
      });
      if (!res.ok) {
        setHidden(true);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data) {
        setHidden(true);
        return;
      }
      applyPromoPayload(data);
    } catch (_) {
      // Fail closed: maintain hidden state on network or abort errors
      setHidden(true);
    }
  }, [apiEndpoint, applyPromoPayload]);

  useEffect(() => {
    if (initialData) {
      applyPromoPayload(initialData);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetchLivePromo(controller.signal).finally(() => {
      clearTimeout(timeoutId);
    });

    const handleFocus = () => {
      fetchLivePromo();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      window.removeEventListener('focus', handleFocus);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fetchLivePromo, applyPromoPayload, initialData]);

  const handleClose = () => {
    const dismissUntil = Date.now() + 120 * 60 * 1000;
    try {
      if (activeCampaignId) {
        sessionStorage.setItem(`jokiin_promo_dismissed_until:${activeCampaignId}`, String(dismissUntil));
      }
      sessionStorage.setItem('jokiin_promo_dismissed_until', String(dismissUntil));
    } catch (_) {}
    setHidden(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClaim = () => {
    if (expired || hidden) return;
    const couponCode = promoData?.coupon || promoData?.coupon_code || '';
    const associatedProduct = promoData?.featured_product ?? promoData?.product ?? null;

    if (onClaimPromo) {
      onClaimPromo({
        coupon: couponCode,
        product: associatedProduct ? ({
          id: associatedProduct.id || associatedProduct.slug || 'promo-product',
          title: associatedProduct.nama || associatedProduct.name || promoData?.promo_judul || 'Promo Spesial',
          category: 'Spesial',
          priceNum: Number(associatedProduct.harga_dasar || associatedProduct.priceNum || 0),
          price: `Rp ${Number(associatedProduct.harga_dasar || associatedProduct.priceNum || 0).toLocaleString('id-ID')}`,
          desc: associatedProduct.deskripsi || '',
          benefits: ['Penawaran Spesial Terbatas', 'Garansi Revisi', 'Proses Cepat'],
          rating: '5.0',
          reviewsCount: 100
        } as CatalogProduct) : null,
        title: promoData?.promo_judul || 'Penawaran Spesial'
      });
    } else {
      if (typeof window !== 'undefined' && typeof (window as unknown as { switchTab?: (tab: string) => void }).switchTab === 'function') {
        (window as unknown as { switchTab: (tab: string) => void }).switchTab('harga');
      }
    }
  };

  const discountVal = Number(promoData?.discount_percent) || 0;
  const leadText = discountVal > 0 ? `Diskon s.d ${discountVal}%` : (promoData?.lead || '');
  const couponCode = promoData?.coupon || promoData?.coupon_code || '';
  const bodyText = promoData?.promo_judul || promoData?.text || '';
  const badgeText = promoData?.badge || promoData?.label || 'PROMO TERBATAS';
  const tickerText = bodyText;

  return (
    <aside
      className="promo-strip"
      id="promoStrip"
      aria-label="Promo terbatas"
      hidden={hidden}
      data-expired={expired ? 'true' : 'false'}
    >
      <div className="promo-strip__head">
        <span className="promo-strip__badge" id="promoBadge">
          {badgeText}
        </span>
        <button
          className="promo-strip__claim"
          id="promoClaim"
          type="button"
          onClick={handleClaim}
          disabled={expired || hidden}
        >
          {expired ? 'Promo berakhir' : 'Klaim Promo →'}
        </button>
        <button
          className="promo-strip__close"
          id="promoClose"
          type="button"
          aria-label="Tutup promo"
          onClick={handleClose}
        >
          ×
        </button>
      </div>
      <div className="promo-strip__static">
        <span className="promo-strip__lead" id="promoLead" hidden={!leadText}>
          {leadText}
        </span>
        <span className="promo-strip__text" id="promoText">
          {bodyText}
        </span>
        <span className="promo-strip__coupon" hidden={!couponCode}>
          Kupon: <strong id="promoCoupon">{couponCode}</strong>
        </span>
      </div>
      <div className="promo-strip__ticker" aria-label="Informasi promo">
        <span className="promo-strip__ticker-group" id="promoTicker">
          {tickerText}
        </span>
        <span className="promo-strip__ticker-group" id="promoTickerCopy" aria-hidden="true">
          {tickerText}
        </span>
      </div>
      <span className="promo-strip__countdown" id="promoCountdown" aria-label="Sisa waktu promo">
        <span className="promo-strip__time">
          <b id="promoDays">{timeLeft.days}</b>
          <small>HARI</small>
        </span>
        <span className="promo-strip__time">
          <b id="promoHours">{timeLeft.hours}</b>
          <small>JAM</small>
        </span>
        <span className="promo-strip__time">
          <b id="promoMinutes">{timeLeft.minutes}</b>
          <small>MNT</small>
        </span>
        <span className="promo-strip__time">
          <b id="promoSeconds">{timeLeft.seconds}</b>
          <small>DTK</small>
        </span>
      </span>
    </aside>
  );
}
