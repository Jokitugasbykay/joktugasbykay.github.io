'use client';

import React from 'react';

interface HomeCategoriesProps {
  onSelectCategory: (cat: string) => void;
  onConsultWA: () => void;
}

export default function HomeCategories({ onSelectCategory, onConsultWA }: HomeCategoriesProps) {
  const categories = [
    { id: 'semua', label: 'Semua', icon: '/assets/ui-art/document.png' },
    { id: 'makalah', label: 'Tugas Makalah', icon: '/assets/ui-art/writing.png' },
    { id: 'ppt', label: 'Presentasi', icon: '/assets/ui-art/presentation.png' },
    { id: 'laporan', label: 'Tugas Laporan', icon: '/assets/ui-art/book.png' },
    { id: 'pengetikan', label: 'Pengetikan', icon: '/assets/ui-art/keyboard.png' },
    { id: 'desain', label: 'Desain & Editing', icon: '/assets/ui-art/palette.png' },
    { id: 'analisis', label: 'Analisis Data', icon: '/assets/ui-art/chart.png' },
    { id: 'konsultasi', label: 'Konsultasi', icon: '/assets/ui-art/chat.png', isAction: true }
  ];

  return (
    <div className="home-categories" aria-label="Kategori layanan">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className="home-category"
          onClick={() => {
            if (cat.isAction) onConsultWA();
            else onSelectCategory(cat.id);
          }}
        >
          <span>
            <img className="ui-art-icon" src={cat.icon} width={64} height={64} alt="" />
          </span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
