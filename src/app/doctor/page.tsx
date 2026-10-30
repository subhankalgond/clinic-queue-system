'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StethoscopeIcon, CheckCircleIcon, AlertCircleIcon, UsersIcon, ArrowRightIcon, FileTextIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

export default function DoctorConsultationPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [queueData, setQueueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick consultation notes
  const [quickSymptoms, setQuickSymptoms] = useState('');
  const [quickDiagnosis, setQuickDiagnosis] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickMed, setQuickMed] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchDoctorQueue = async () => {
    try {
      const res = await fetch('/api/doctor/queue');
      if (res.ok) {
        const data = await res.json();
        setQueueData(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to fetch doctor queue');
      }
    } catch {
      setErrorMsg('Error loading doctor queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('clinic_lang') as Language;
    if (saved) setLang(saved);

    const onLangChange = () => {
      const cur = localStorage.getItem('clinic_lang') as Language;
      if (cur) setLang(cur);
    };
    window.addEventListener('languageChanged', onLangChange);

    fetchDoctorQueue();
    const interval = setInterval(fetchDoctorQueue, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('languageChanged', onLangChange);
    };
  }, []);

  const handleAction = async (action: 'NEXT' | 'SKIP' | 'HOLD' | 'COMPLETE', targetTokenId?: string) => {
    setActionLoading(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      // If saving consultation details while completing or moving next
      if (queueData?.current_token && (quickSymptoms.trim() || quickDiagnosis.trim())) {
        await fetch(`/api/doctor/patient/${queueData.current_token.patient_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctor_id: queueData.doctor?.id,
            symptoms: quickSymptoms,
            diagnosis: quickDiagnosis,
            doctor_notes: quickNotes,
            prescriptions: quickMed ? [{ medicine_name: quickMed, dosage: '1 tablet', frequency: 'TDS', duration: '5 days' }] : [],
          }),
        });
        setQuickSymptoms('');
        setQuickDiagnosis('');
        setQuickNotes('');
        setQuickMed('');
      }

      const res = await fetch('/api/doctor/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          target_token_id: targetTokenId,
          doctor_id: queueData?.doctor?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Action failed');
      } else {
        await fetchDoctorQueue();
      }
    } catch {
      setErrorMsg('Network error executing queue action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSkipped = async (tokenId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/doctor/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESUME', target_token_id: tokenId }),
      });
      if (res.ok) await fetchDoctorQueue();
    } catch {
      setErrorMsg('Failed to resume patient');
    } finally {
      setActionLoading(false);
    }
  };

  const current = queueData?.current_token;
  const upcoming = queueData?.upcoming_tokens || [];
  const skipped = queueData?.skipped_tokens || [];
  const doctor = queueData?.doctor;

  return (
    <div className="page-container" style={{ maxWidth: '820px' }}>
      {/* Editorial Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span className="kicker">Screen 7 &middot; {lang === 'hi' ? 'डॉक्टर पैनल' : 'Doctor Panel'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.doctorPanel}</h1>
          <p style={{ fontSize: '0.875rem' }}>
            {doctor ? `${doctor.full_name} &bull; ${doctor.specialization} (${doctor.opd_room})` : 'Consultation Room'}
          </p>
        </div>

        {/* Queue Summary Counter */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div
            style={{
              padding: '0.5rem 0.875rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              fontSize: '0.8125rem',
            }}
          >
            Completed Today: <strong>{queueData?.summary?.completed || 0}</strong>
          </div>
          <div
            style={{
              padding: '0.5rem 0.875rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              fontSize: '0.8125rem',
            }}
          >
            Remaining: <strong>{queueData?.summary?.remaining || 0}</strong>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-fg)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Main Calling Box: Screen 7 Blueprint Style */}
      <div
        className="editorial-card"
        style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: current ? '#FFFFFF' : 'var(--bg-subtle)',
        }}
      >
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          {t.currentPatient} ({lang === 'hi' ? 'अभी' : 'NOW SERVING'})
        </div>

        {current ? (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-editorial)',
                fontSize: '5rem',
                fontWeight: 800,
                color: 'var(--primary)',
                lineHeight: 1,
                margin: '0.5rem 0',
              }}
            >
              {current.token_display}
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {current.patient_name} &bull;{' '}
              <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {current.visit_count ? `${Number(current.visit_count) + 1}th visit` : '1st visit'}
              </span>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 1rem 0' }}>
              UID: {current.patient_uid} &bull; Phone: {current.patient_mobile} &bull; {current.patient_gender}, {current.patient_age} yrs
            </div>

            <Link
              href={`/doctor/patient/${current.patient_id}`}
              className="btn btn-sm btn-secondary"
              style={{ marginBottom: '1.25rem' }}
            >
              <FileTextIcon size={14} /> {lang === 'hi' ? 'पूरी हिस्ट्री देखें' : 'View Full Clinical History'} &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ padding: '2rem 1rem' }}>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '3rem', color: 'var(--text-muted)' }}>
              #--
            </div>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
              {t.noCurrentPatient}
            </p>
          </div>
        )}

        {/* Upcoming 3 tokens strip (Blueprint Screen 7: "AGLE: #13 · #14 · #15") */}
        <div
          style={{
            borderTop: '1px solid var(--border-hairline)',
            paddingTop: '1rem',
            marginTop: '0.75rem',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8125rem' }}>
            {lang === 'hi' ? 'अगले' : 'UPCOMING'}:
          </strong>{' '}
          {upcoming.length > 0 ? (
            upcoming.map((u: any, idx: number) => (
              <span key={u.id} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {u.token_display} ({u.patient_name})
                {idx < upcoming.length - 1 ? '  &bull;  ' : ''}
              </span>
            ))
          ) : (
            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
              {lang === 'hi' ? 'कोई प्रतीक्षारत नहीं' : 'No more tokens in line'}
            </span>
          )}
        </div>

        {/* Primary Action: NEXT PATIENT Button */}
        <div style={{ marginTop: '1.75rem' }}>
          <button
            type="button"
            onClick={() => handleAction('NEXT')}
            disabled={actionLoading || upcoming.length === 0}
            className="btn btn-primary btn-lg btn-full"
            style={{
              padding: '1.125rem 2rem',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            {actionLoading ? 'UPDATING QUEUE...' : t.nextButton} ▶
          </button>
        </div>

        {/* Secondary Doctor Controls: SKIP, HOLD, COMPLETE */}
        {current && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => handleAction('SKIP')}
              disabled={actionLoading}
              className="btn btn-secondary"
            >
              {t.skipButton}
            </button>
            <button
              type="button"
              onClick={() => handleAction('HOLD')}
              disabled={actionLoading}
              className="btn btn-secondary"
            >
              {t.holdButton}
            </button>
            <button
              type="button"
              onClick={() => handleAction('COMPLETE')}
              disabled={actionLoading}
              className="btn btn-secondary"
              style={{ color: 'var(--primary)', fontWeight: 600 }}
            >
              {t.completeButton}
            </button>
          </div>
        )}
      </div>

      {/* Quick Clinical Note Drawer (Optional fast note taking right inside Screen 7) */}
      {current && (
        <div className="editorial-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Quick Consultation Record</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Saves automatically when you click Next / Complete
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">{t.symptoms}</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Fever 3 days, cough, headache"
                value={quickSymptoms}
                onChange={(e) => setQuickSymptoms(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">{t.diagnosis}</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Acute URTI, viral syndrome"
                value={quickDiagnosis}
                onChange={(e) => setQuickDiagnosis(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">{t.prescriptions} (Quick Rx)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Tab Paracetamol 650mg TDS x 3 days, Syrup Ambroxol"
              value={quickMed}
              onChange={(e) => setQuickMed(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Temporarily Skipped / Held Patients */}
      {skipped.length > 0 && (
        <div className="editorial-card" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', color: 'var(--status-skipped-fg)' }}>
            Temporarily Skipped / Held Patients ({skipped.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {skipped.map((s: any) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <span style={{ fontWeight: 700 }}>{s.token_display}</span>
                <span style={{ fontSize: '0.8125rem' }}>{s.patient_name}</span>
                <button
                  type="button"
                  onClick={() => handleResumeSkipped(s.id)}
                  disabled={actionLoading}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
