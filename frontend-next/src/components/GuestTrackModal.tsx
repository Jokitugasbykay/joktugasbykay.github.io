'use client';

import React, { useState } from 'react';

interface GuestTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestTrackModal({ isOpen, onClose }: GuestTrackModalProps) {
  const [orderCode, setOrderCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTrack = () => {
    const trimmed = orderCode.trim();
    if (!trimmed) {
      setErrorMsg('Silakan masukkan Order ID yang valid.');
      return;
    }
    // Navigate to invoice / tracking
    window.location.assign(`/invoice/?order=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div
      id="guestTrackModal"
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content track-modal-card">
        <button
          type="button"
          onClick={onClose}
          className="track-modal-close"
          aria-label="Tutup"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="track-modal-hero">
          <div className="track-modal-icon">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
              <path d="m7.5 4.27 9 5.15" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
              <circle cx="18" cy="18" r="3" />
              <path d="m22 22-1.5-1.5" />
            </svg>
          </div>
          <span className="track-modal-badge">LACAK PESANAN INSTAN</span>
          <h2 className="track-modal-title">Cek Status Pesanan</h2>
          <p className="track-modal-desc">
            Pantau status pengerjaan tugas & pembayaran pesananmu secara real-time tanpa harus login.
          </p>
        </div>

        <div className="track-modal-body">
          <div className="track-form-group">
            <label className="track-form-label" htmlFor="trackInput">
              <span>Nomor Order ID</span>
              <span className="track-label-hint">Cek di bukti transfer / email</span>
            </label>
            <div className="track-input-wrapper">
              <span className="track-input-prefix" aria-hidden="true">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <line x1="7" y1="9" x2="17" y2="9" />
                  <line x1="7" y1="13" x2="13" y2="13" />
                </svg>
              </span>
              <input
                type="text"
                id="trackInput"
                className="track-input-control"
                placeholder="Contoh: NUG7K9M2P4Q8R3T5V6W7X8Y9Z2A3B atau SPCL..."
                autoComplete="off"
                spellCheck="false"
                value={orderCode}
                onChange={(e) => {
                  setOrderCode(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTrack();
                }}
              />
            </div>
            {errorMsg && (
              <div id="trackError" className="track-error-banner" style={{ display: 'flex', marginTop: '10px' }}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span id="trackErrorMsg">{errorMsg}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-modal-primary"
            style={{ width: '100%', marginTop: '15px' }}
            onClick={handleTrack}
          >
            Lacak Pesanan
          </button>
        </div>
      </div>
    </div>
  );
}
