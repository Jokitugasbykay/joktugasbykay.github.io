'use client';

import React from 'react';
import type { ReviewItem } from '@/lib/testimonials';
import { anonymizeCustomerName } from '@/lib/testimonials';

interface TestimonialCardProps {
  review: ReviewItem;
  serviceName: string;
}

export default function TestimonialCard({ review, serviceName }: TestimonialCardProps) {
  const anonName = anonymizeCustomerName(review.customer_name);
  const formattedDate = new Date(review.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const ratingNum = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 5)));
  const satisfactionLabel =
    ratingNum >= 5 ? 'Sangat Puas' : ratingNum >= 4 ? 'Puas' : ratingNum >= 3 ? 'Cukup Puas' : 'Perlu Ditingkatkan';

  const avatarSrc = review.user_photo || '/assets/review-avatars/default.jpg';

  return (
    <article
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'border-color 0.2s ease, transform 0.2s ease'
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--border-color)',
              border: '2px solid var(--accent-green)'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={anonName}
              width={44}
              height={44}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('default.jpg')) {
                  target.src = '/assets/review-avatars/default.jpg';
                }
              }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{anonName}</div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--accent-green)',
                fontWeight: 600
              }}
            >
              <span>Pesanan Terverifikasi</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2px', color: 'var(--accent-yellow)', fontSize: '15px' }} aria-label={`Rating ${ratingNum} dari 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} style={{ opacity: i < ratingNum ? 1 : 0.25 }}>
              ★
            </span>
          ))}
        </div>
      </header>

      <blockquote
        style={{
          margin: 0,
          color: 'var(--text-main)',
          fontSize: '14px',
          lineHeight: '1.6',
          fontStyle: 'normal'
        }}
      >
        "{review.comment}"
      </blockquote>

      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}
      >
        <span>
          Layanan: <strong style={{ color: 'var(--text-main)' }}>{serviceName}</strong> ({satisfactionLabel})
        </span>
        <time dateTime={review.created_at}>{formattedDate}</time>
      </footer>
    </article>
  );
}
