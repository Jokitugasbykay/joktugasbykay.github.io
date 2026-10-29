import React from 'react';
import { CHANGELOG_DATA } from '../data/information-data';

export default function ChangelogFeed() {
  return (
    <div className="info-card">
      <h3 className="info-card-title">Riwayat Pembaruan</h3>
      <ul className="changelog-list" id="changelogContainer">
        {CHANGELOG_DATA.map((c) => (
          <li key={c.id} className="changelog-item">
            <span className="changelog-date">{c.date}</span>
            <span className="changelog-desc">{c.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
