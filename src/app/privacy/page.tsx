import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="page-container" style={{ maxWidth: '780px' }}>
      <div className="editorial-card" style={{ padding: '2.5rem 2rem' }}>
        <span className="kicker">Legal Documentation &middot; Privacy Compliance</span>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Privacy Policy</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Effective Date: October 2026 &bull; Aapka Clinic Patient Queue Management System
        </p>

        <hr className="hairline-divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.7, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1. Scope & Overview</h2>
            <p>
              This Privacy Policy explains how <strong>Aapka Clinic</strong> collects, stores, uses, and safeguards personal healthcare and contact information when patients book outpatient tokens, access live queue trackers, or visit our physical clinic rooms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>2. Data We Collect</h2>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Patient Identity & Contact Data:</strong> Full name, age, gender, 10-digit mobile number, and allocated unique clinic identifier (Patient UID).
              </li>
              <li>
                <strong>Queue & Consultation Records:</strong> Token timestamps, appointment dates, source (online or walk-in), arrival status, and doctor queue progression.
              </li>
              <li>
                <strong>Clinical Records:</strong> Attending doctor notes, recorded symptoms, diagnosis, and prescription details entered securely by authorized practitioners.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>3. Public Waiting Hall Privacy Guard</h2>
            <p>
              Under strict medical data privacy standards, our waiting room television displays and public live queue links <strong>never broadcast patient full names, mobile numbers, or diagnostic details</strong>. Only token sequence numbers (e.g., #12) and assigned outpatient rooms are displayed publicly.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>4. Role-Based Access Controls</h2>
            <p>
              Medical history is restricted strictly to licensed medical doctors and administrators. Reception personnel have access only to operational queue states, arrivals, and contact lookups. Every status modification is recorded in an immutable database audit log.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>5. Patient Rights & Contact</h2>
            <p>
              Patients have the right to inspect, verify, or request updates to their registered demographic details by contacting the clinic reception desk at our premises or calling +91 98765 43210.
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
