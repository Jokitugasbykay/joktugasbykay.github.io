'use client';

import React, { useState } from 'react';

export default function PromoStrip() {
  // Default in legacy is hidden
  const [hidden, setHidden] = useState(true);

  return (
    <aside className="promo-strip" id="promoStrip" aria-label="Promo terbatas" hidden={hidden}>
      <div className="promo-strip__head">
        <span className="promo-strip__badge" id="promoBadge">PROMO TERBATAS</span>
        <button className="promo-strip__claim" id="promoClaim" type="button">Klaim Promo</button>
        <button className="promo-strip__close" id="promoClose" type="button" aria-label="Tutup promo" onClick={() => setHidden(true)}>x</button>
      </div>
      <div className="promo-strip__static">
        <span className="promo-strip__lead" id="promoLead"></span>
        <span className="promo-strip__text" id="promoText"></span>
        <span className="promo-strip__coupon">Kupon: <strong id="promoCoupon">JOKIHEMAT</strong></span>
      </div>
      <div className="promo-strip__ticker" aria-label="Informasi promo">
        <span className="promo-strip__ticker-group" id="promoTicker"></span>
        <span className="promo-strip__ticker-group" id="promoTickerCopy" aria-hidden="true"></span>
      </div>
      <span className="promo-strip__countdown" aria-label="Sisa waktu promo">
        <span className="promo-strip__time"><b id="promoDays">00</b><small>HARI</small></span>
        <span className="promo-strip__time"><b id="promoHours">00</b><small>JAM</small></span>
        <span className="promo-strip__time"><b id="promoMinutes">00</b><small>MNT</small></span>
        <span className="promo-strip__time"><b id="promoSeconds">00</b><small>DTK</small></span>
      </span>
    </aside>
  );
}
