'use client';

import React from 'react';
import type { CatalogProduct } from '@/types/catalog';

interface ServiceDetailModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
  onCheckout: (p: CatalogProduct) => void;
}

export default function ServiceDetailModal({ product, onClose, onCheckout }: ServiceDetailModalProps) {
  if (!product) return null;

  return (
    <div
      id="serviceDetailModal"
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div
          className="modal-header"
          style={{
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '15px',
            marginBottom: '20px'
          }}
        >
          <div className="service-detail-heading">
            <div id="detailSvcIcon" style={{ fontSize: '2.5em', marginBottom: '10px' }}>
              {product.icon || '📄'}
            </div>
            <div>
              <h2 id="detailSvcTitle">{product.title}</h2>
              <p id="detailSvcPrice" className="service-detail-price">
                {product.price}
              </p>
            </div>
          </div>
          <p
            id="detailSvcDesc"
            style={{
              color: 'var(--text-secondary)',
              fontStyle: 'normal',
              fontSize: '0.95em',
              marginTop: '5px'
            }}
          >
            {product.desc}
          </p>
        </div>

        <div className="modal-body">
          <h4 className="layanan-section-title">Termasuk Dalam Layanan</h4>
          <ul
            id="detailSvcBenefits"
            className="detail-list"
            style={{ listStyleType: '✓ ', color: 'var(--text-main)' }}
          >
            {product.benefits.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>

          {product.notIncluded && product.notIncluded.length > 0 && (
            <>
              <h4 className="layanan-section-title">Yang Tidak Termasuk</h4>
              <ul
                id="detailSvcNotIncluded"
                className="detail-list"
                style={{ listStyleType: '✕ ', color: 'var(--text-secondary)' }}
              >
                {product.notIncluded.map((ni, idx) => (
                  <li key={idx}>{ni}</li>
                ))}
              </ul>
            </>
          )}

          <div
            style={{
              background: 'var(--surface-secondary)',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.9em',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <strong style={{ color: 'var(--text-main)' }}>Estimasi Pengerjaan:</strong>
              <span id="detailSvcTime" style={{ color: 'var(--text-secondary)' }}>
                {product.estimatedTime || '1-2 Hari Kerja'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: 'var(--text-main)' }}>Ketentuan Revisi:</strong>
              <span id="detailSvcRevision" style={{ color: 'var(--text-secondary)' }}>
                {product.revisionTerms || 'Maksimal 2x Revisi Minor'}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            id="btnDetailOrder"
            type="button"
            className="btn-modal-primary"
            onClick={() => onCheckout(product)}
          >
            Checkout
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-modal-secondary"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
