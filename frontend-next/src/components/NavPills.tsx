'use client';

import React, { useState, useEffect, useRef } from 'react';

interface NavPillsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function NavPills({ activeTab, onTabChange }: NavPillsProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentTheme: 'light' | 'dark' = 'light';
    try {
      const saved = localStorage.getItem('jokiin_theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'light' || saved === 'dark') {
        currentTheme = saved;
      } else {
        currentTheme = prefersDark ? 'dark' : 'light';
      }
    } catch {
      currentTheme = 'light';
    }
    setTheme(currentTheme);
    document.documentElement.dataset.theme = currentTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('jokiin_theme', next);
    } catch {}
  };

  useEffect(() => {
    const updateLiquid = () => {
      if (typeof window === 'undefined' || window.innerWidth >= 761) return;
      const nav = navRef.current;
      const indicator = indicatorRef.current;
      const active = nav?.querySelector('.pill.active') as HTMLElement | null;
      if (!nav || !indicator || !active) return;
      const navRect = nav.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const nextX = activeRect.left - navRect.left + nav.scrollLeft - nav.clientLeft - indicator.offsetLeft;
      indicator.style.width = `${activeRect.width}px`;
      indicator.style.transform = `translateX(${nextX}px)`;
    };

    const raf = requestAnimationFrame(updateLiquid);
    window.addEventListener('resize', updateLiquid);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateLiquid);
    };
  }, [activeTab]);

  const tabs = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'layanan', label: 'Layanan' },
    { id: 'harga', label: 'Harga' },
    { id: 'testimoni', label: 'Testimoni' },
    { id: 'informasi', label: 'Informasi', href: '/information/' },
    { id: 'carapesan', label: 'Cara Pesan' },
    { id: 'bantuan', label: 'Bantuan' }
  ];

  return (
    <div className="nav-pills" id="nav-container" ref={navRef}>
      <span
        className="nav-liquid-indicator"
        id="navLiquidIndicator"
        ref={indicatorRef}
        aria-hidden="true"
      ></span>
      {tabs.map((tab) => {
        if (tab.href) {
          return (
            <a
              key={tab.id}
              href={tab.href}
              className={`pill ${activeTab === tab.id ? 'active' : ''}`}
              data-target={tab.id}
            >
              {tab.label}
            </a>
          );
        }
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={`pill ${activeTab === tab.id ? 'active' : ''}`}
            data-target={tab.id}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(tab.id);
            }}
          >
            {tab.label}
          </a>
        );
      })}
      <button
        id="themeToggle"
        type="button"
        className="btn-cart"
        aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
        aria-pressed={theme === 'dark'}
        title={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
        onClick={toggleTheme}
      >
        <svg
          className="theme-moon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
        </svg>
        <svg
          className="theme-sun"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
        </svg>
      </button>
    </div>
  );
}
