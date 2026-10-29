import React from 'react';
import { ABOUT_SECTIONS } from '../data/information-data';

export default function AboutJokiin() {
  return (
    <section id="aboutJokiin" className="info-card" aria-labelledby="aboutJokiinTitle">
      <header className="about-heading">
        <h3 id="aboutJokiinTitle">Tentang JOKI.IN</h3>
        <p>Layanan, proses, dan ketentuan dalam satu tempat.</p>
      </header>
      {ABOUT_SECTIONS.map((sec) => (
        <div key={sec.id} id={sec.id} className="about-row">
          <h4>
            <span className="about-number" aria-hidden="true">
              {sec.number}
            </span>
            {sec.title}
          </h4>
          <p>{sec.content}</p>
        </div>
      ))}
    </section>
  );
}
