'use client';

import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  activeCategory,
  onSelectCategory
}: CategoryFilterProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '6px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
      role="tablist"
      aria-label="Filter kategori produk"
    >
      {categories.map(cat => {
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectCategory(cat)}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
              background: isActive ? 'var(--accent-green)' : 'var(--bg-card)',
              color: isActive ? '#04251a' : 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s, border-color 0.2s, color 0.2s'
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
