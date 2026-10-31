'use client';

import React from 'react';
import type { CatalogProduct } from '@/types/catalog';

interface CartItem {
  product: CatalogProduct;
  quantity: number;
}

interface CartModalProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onClear: () => void;
  onCheckout: () => void;
}

export default function CartModal({
  isOpen,
  items,
  onClose,
  onClear,
  onCheckout
}: CartModalProps) {
  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.product.priceNum * item.quantity, 0);
  const formattedTotal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(total);

  return (
    <div
      id="cartModal"
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <button
          type="button"
          onClick={onClose}
          className="modal-close-btn-left"
          aria-label="Tutup"
        >
          ✕
        </button>
        <div className="modal-header">
          <h2>Keranjang Saya</h2>
        </div>
        <div className="ba-03__banner" id="cartThresholdBanner" data-state="locked">
          <p className="ba-03__msg" id="cartThresholdText">
            Diskon 5% untuk transaksi di atas <strong>Rp1.500.000</strong>.
          </p>
          <div
            className="ba-03__track"
            id="cartThresholdTrack"
            role="progressbar"
            aria-label="Target nilai pesanan"
            aria-valuenow={Math.min(100, Math.round((total / 1500000) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="ba-03__fill"
              id="cartThresholdFill"
              style={{ width: `${Math.min(100, Math.round((total / 1500000) * 100))}%` }}
            ></span>
          </div>
          <div className="ba-03__scale">
            <span>Rp0</span>
            <span>Rp1.500.000</span>
          </div>
        </div>

        <div
          className="modal-body"
          id="cartItemsContainer"
          style={{ marginBottom: '10px', maxHeight: '40vh', overflowY: 'auto' }}
        >
          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
              Keranjang masih kosong.
            </p>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{item.product.title}</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.quantity}x {item.product.price}
                  </span>
                </div>
                <strong style={{ color: 'var(--primary)' }}>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0
                  }).format(item.product.priceNum * item.quantity)}
                </strong>
              </div>
            ))
          )}
        </div>

        <div className="cart-total-section">
          <span>Total:</span>
          <span id="cartTotalPrice">{formattedTotal}</span>
        </div>

        <div className="modal-footer" style={{ marginTop: '25px' }}>
          <button type="button" onClick={onClear} className="btn-modal-secondary">
            Hapus Semua
          </button>
          <button
            type="button"
            onClick={onCheckout}
            className="btn-modal-primary"
            disabled={items.length === 0}
          >
            Checkout
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-outline"
          style={{
            width: '100%',
            border: 'none',
            marginTop: '15px',
            padding: '10px',
            background: 'transparent',
            boxShadow: 'none',
            cursor: 'pointer'
          }}
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
