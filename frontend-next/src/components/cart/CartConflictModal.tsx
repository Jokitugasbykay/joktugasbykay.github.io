'use client';

import React, { useState } from 'react';

interface CartConflictModalProps {
  isOpen: boolean;
  incomingProductType: 'reguler' | 'spesial';
  existingProductType: 'reguler' | 'spesial';
  onConfirmClear: () => void;
  onCancel: () => void;
}

export default function CartConflictModal({
  isOpen,
  incomingProductType,
  existingProductType,
  onConfirmClear,
  onCancel
}: CartConflictModalProps) {
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('right');

  if (!isOpen) return null;

  return (
    <div
      id="cartTypeConflictModal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 9999,
        transition: 'opacity 0.25s ease'
      }}
    >
      <div
        className="spcl-conflict-sheet"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          width: '100%',
          maxWidth: '540px',
          padding: '24px',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.35)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Mobile Grip Handle */}
        <div
          className="grip"
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '999px',
            background: 'var(--border-color)',
            margin: '0 auto 16px'
          }}
        />

        <div className="eyebrow" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-yellow)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          Pemisahan Keranjang
        </div>

        <h3 id="cartConflictTitle" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)' }}>
          Pemisahan Tipe Layanan
        </h3>

        <p id="cartConflictMessage" style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px' }}>
          Keranjang hanya dapat memuat layanan {existingProductType === 'spesial' ? 'Penawaran Spesial' : 'Reguler'} dalam satu transaksi. Untuk menambahkan layanan {incomingProductType === 'spesial' ? 'Penawaran Spesial' : 'Reguler'}, Anda dapat mengosongkan keranjang sebelumnya.
        </p>

        {/* Split Cards Container */}
        <div className="split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div
            id="conflictCardLeft"
            onClick={() => setSelectedSide('left')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: selectedSide === 'left' ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Pertahankan</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Layanan Lama</span>
          </div>

          <div
            id="conflictCardRight"
            onClick={() => setSelectedSide('right')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: selectedSide === 'right' ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Ganti Baru</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kosongkan &amp; Tambah</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btnCancelConflictCart"
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Batal
          </button>

          <button
            id="btnConfirmClearConflictCart"
            type="button"
            onClick={onConfirmClear}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--accent-green)',
              background: 'var(--accent-green)',
              color: '#04251a',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Ganti Layanan
          </button>
        </div>
      </div>
    </div>
  );
}
