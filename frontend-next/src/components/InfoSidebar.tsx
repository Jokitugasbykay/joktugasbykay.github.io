import React from 'react';
import { OPERATIONAL_STEPS_DATA, SYSTEM_STATUS_DATA } from '../data/information-data';

export default function InfoSidebar() {
  return (
    <aside className="info-sidebar" aria-label="Sidebar Informasi">
      <div className="info-card">
        <h3 className="info-card-title">Status Sistem</h3>
        {SYSTEM_STATUS_DATA.map((st) => (
          <div key={st.name} className="status-row">
            <span>{st.name}</span>
            <div
              className="status-indicator"
              style={st.color ? { color: st.color } : undefined}
            >
              <span
                className="status-dot-small"
                style={st.dotColor ? { background: st.dotColor } : undefined}
              />
              {' '}{st.status}
            </div>
          </div>
        ))}
      </div>

      <div className="info-card">
        <h3 className="info-card-title">Informasi Operasional</h3>
        <ul className="op-steps">
          {OPERATIONAL_STEPS_DATA.map((step) => (
            <li
              key={step.step}
              className="op-step"
              style={
                step.highlight
                  ? { color: 'var(--primary)', fontWeight: 700 }
                  : undefined
              }
            >
              {step.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="info-card">
        <h3 className="info-card-title">Follow JOKI.IN</h3>
        <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)', margin: 0 }}>
          Ikuti kami untuk informasi promo dan tips akademik.
        </p>
        <div className="compact-social">
          <a
            href="https://www.instagram.com/allaboutjoki.in?stkn=MWhoNXozOTh3enpubg=="
            className="compact-social-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kunjungi Instagram JOKI.IN"
          >
            <img src="/assets/icon/instagram-logo.webp" alt="Instagram" width="18" height="18" />
            Instagram
          </a>
          <a
            href="https://www.tiktok.com/@jokiintugasmahasiswa?_r=1&_t=ZS-99m1BX7I0w9"
            className="compact-social-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kunjungi TikTok JOKI.IN"
          >
            <img src="/assets/icon/tiktok icon.png" alt="TikTok" width="18" height="18" />
            TikTok
          </a>
        </div>
      </div>
    </aside>
  );
}
