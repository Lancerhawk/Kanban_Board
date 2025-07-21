import React, { useState } from 'react';
import './FeatureModal.css';

const currentFeatures = [
  'Beautiful, fully responsive calendar with drag, drop, and resize',
  'Event color coding and categorization',
  'Persistent event storage (database integration)',
  'Touch and mobile support',
  'Custom event modal with color picker',
  'Horizontal scroll for calendar grid on small screens',
  'Modern, professional UI/UX',
];

const upcomingFeatures = [
  'Recurring events',
  'Event reminders and notifications',
  'Calendar dashboard widget',
  'Google/Outlook calendar sync',
  'Dark mode',
  'More event types and icons',
];

export default function FeatureModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="feature-fab"
        aria-label="Show features"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open && (
        <div className="feature-modal-overlay" onClick={() => setOpen(false)}>
          <div className="feature-modal-content" onClick={e => e.stopPropagation()}>
            <button className="feature-modal-close no-gradient" onClick={() => setOpen(false)} aria-label="Close features">×</button>
            <h2>🚀 New Features</h2>
            <ul className="feature-list">
              {currentFeatures.map(f => <li key={f}>✅ {f}</li>)}
            </ul>
            <h3>🔮 Upcoming</h3>
            <ul className="feature-list upcoming">
              {upcomingFeatures.map(f => <li key={f}>⏳ {f}</li>)}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}