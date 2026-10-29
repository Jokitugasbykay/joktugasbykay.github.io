import React from 'react';
import InfoPageHeader from '../../components/InfoPageHeader';
import AboutJokiin from '../../components/AboutJokiin';
import UpdateFeed from '../../components/UpdateFeed';
import AnnouncementCard from '../../components/AnnouncementCard';
import ChangelogFeed from '../../components/ChangelogFeed';
import InfoSidebar from '../../components/InfoSidebar';

export default function InformationPage() {
  return (
    <div id="tab-informasi">
      <InfoPageHeader />

      <div className="info-layout">
        <section className="info-main">
          <AboutJokiin />
          <UpdateFeed />
          <AnnouncementCard />
          <ChangelogFeed />
        </section>

        <InfoSidebar />
      </div>
    </div>
  );
}
