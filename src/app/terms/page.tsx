import React from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="page-container" style={{ maxWidth: '780px' }}>
      <div className="editorial-card" style={{ padding: '2.5rem 2rem' }}>
        <span className="kicker">Legal Documentation &middot; Service Agreement</span>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Terms &amp; Conditions</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Effective Date: October 2026 &bull; Aapka Clinic Queue Management System
        </p>

        <hr className="hairline-divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.7, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1. Outpatient Token Booking</h2>
            <p>
              Outpatient tokens issued through this digital platform or walk-in counters grant estimated queue positions for medical consultations. A booked token indicates your turn in the clinic queue but does not constitute an exact emergency reservation.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>2. Estimated Times &amp; Clinical Priority</h2>
            <p>
              Estimated waiting intervals are approximations based on running consultation averages. While our real-time algorithms calculate queue progress dynamically, doctors may prioritize medical emergencies or complex clinical situations at their professional discretion.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>3. Cancellations &amp; No-Shows</h2>
            <p>
              If a patient is unable to attend, they may cancel their token through their confirmation link prior to the consultation call. If a called token is unacknowledged after multiple announcements, the system marks the turn as &ldquo;Skipped&rdquo; or &ldquo;No-Show&rdquo; to prevent delaying waiting patients.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>4. Medical Advice Disclaimer</h2>
            <p>
              This website is an administrative queue management utility. It does not provide automated diagnostic assessments or emergency triage. In case of acute medical emergencies, patients must immediately report to the nearest hospital casualty department.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-hairline)' }}>
          <Link href="/" className="btn btn-secondary">
            &larr; Return to Token Booking
          </Link>
        </div>
      </div>
    </div>
  );
}
