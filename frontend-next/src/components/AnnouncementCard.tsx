import React from 'react';
import { ANNOUNCEMENTS_DATA } from '../data/information-data';

export default function AnnouncementCard() {
  return (
    <div className="info-card" style={{ borderColor: 'var(--border-highlight)' }}>
      <h3 className="info-card-title" style={{ color: 'var(--primary-dark)' }}>
        Pengumuman
      </h3>
      <div id="announcementContainer">
        {ANNOUNCEMENTS_DATA.map((a) => (
          <article key={a.id} className="update-item" style={{ border: 'none' }}>
            <div className="update-header">
              <span className={`info-badge ${a.badgeClass}`}>{a.type}</span>
              <span className="update-date">{a.date}</span>
            </div>
            <h4 className="update-title" style={{ color: 'var(--error)' }}>
              {a.title}
            </h4>
            <p className="update-desc">{a.desc}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
