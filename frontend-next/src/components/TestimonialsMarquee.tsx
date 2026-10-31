'use client';

import React from 'react';
import type { TestimonialReview } from '@/types/catalog';

interface TestimonialsMarqueeProps {
  reviews: TestimonialReview[];
}

export default function TestimonialsMarquee({ reviews }: TestimonialsMarqueeProps) {
  return (
    <section className="tr-24" aria-label="Ulasan Mahasiswa JOKI.IN">
      <div className="tr-24__head">
        <span className="section-subtitle">TESTIMONIALS</span>
        <h3 className="section-title">Apa Kata Mahasiswa</h3>
      </div>
      <div className="tr-24__row" data-mode="auto">
        <div className="tr-24__track" id="homeTestimonialsTrack" aria-live="polite">
          {reviews.map((rev) => (
            <figure key={rev.id} className="tr-24__card">
              <span className="tr-24__service">
                {rev.service} · ★ {rev.rating}/5
              </span>
              <p>{rev.review}</p>
              <footer>
                <div className="tr-24__avatar-circle">
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {rev.name[0] || 'U'}
                  </span>
                </div>
                <span>
                  <b>{rev.name}</b>
                  {rev.university || 'Ulasan pelanggan'}
                </span>
              </footer>
            </figure>
          ))}
          {/* Clone for continuous marquee loop */}
          <div className="tr-24__clone" aria-hidden="true" style={{ display: 'contents' }}>
            {reviews.map((rev) => (
              <figure key={`clone-${rev.id}`} className="tr-24__card">
                <span className="tr-24__service">
                  {rev.service} · ★ {rev.rating}/5
                </span>
                <p>{rev.review}</p>
                <footer>
                  <div className="tr-24__avatar-circle">
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {rev.name[0] || 'U'}
                    </span>
                  </div>
                  <span>
                    <b>{rev.name}</b>
                    {rev.university || 'Ulasan pelanggan'}
                  </span>
                </footer>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
