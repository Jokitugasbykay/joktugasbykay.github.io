import React from 'react';
import { UPDATES_DATA } from '../data/information-data';

export default function UpdateFeed() {
  return (
    <div className="info-card">
      <h3 className="info-card-title">Update Terbaru</h3>
      <div id="updateContainer">
        {UPDATES_DATA.map((u) => (
          <article key={u.id} className="update-item">
            <div className="update-header">
              <span className={`info-badge ${u.badgeClass}`}>{u.type}</span>
              <span className="update-date">{u.date}</span>
            </div>
            <h4 className="update-title">{u.title}</h4>
            <p className="update-desc">{u.desc}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
