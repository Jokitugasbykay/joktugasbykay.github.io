'use client';

import React from 'react';

interface SearchBoxProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  style?: React.CSSProperties;
}

export default function SearchBox({
  placeholder = 'Cari layanan, harga, atau pertanyaan...',
  value,
  onChange,
  style = { margin: '0 0 28px' }
}: SearchBoxProps) {
  return (
    <div className="search-box" style={style}>
      <span className="icon" style={{ color: 'var(--accent)', marginRight: '10px' }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      <input
        type="text"
        className="searchInputGlobal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
