'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StethoscopeIcon, CalendarIcon, FileTextIcon, CheckCircleIcon, AlertCircleIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

function PatientHistoryContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // New consultation form state
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    { medicine_name: '', dosage: '1 tablet', frequency: 'Twice daily (BD)', duration: '5 days', instructions: 'After meals' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/doctor/patient/${id}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      setData(json);
    } catch {
      setErrorMsg('Failed to load patient history.');
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

    fetchHistory();

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, [id]);

  const addPrescriptionRow = () => {
    setPrescriptions([
      ...prescriptions,
      { medicine_name: '', dosage: '1 tablet', frequency: 'Twice daily (BD)', duration: '5 days', instructions: 'After meals' },
    ]);
  };

  const removePrescriptionRow = (idx: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== idx));
  };

  const updatePrescriptionRow = (idx: number, field: keyof PrescriptionItem, val: string) => {
    const updated = [...prescriptions];
    updated[idx][field] = val;
    setPrescriptions(updated);
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/doctor/patient/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          diagnosis,
          doctor_notes: doctorNotes,
          advice,
          follow_up_date: followUpDate || null,
          prescriptions: prescriptions.filter((p) => p.medicine_name.trim().length > 0),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        // Reset form
        setSymptoms('');
        setDiagnosis('');
        setDoctorNotes('');
        setAdvice('');
        setPrescriptions([{ medicine_name: '', dosage: '1 tablet', frequency: 'Twice daily (BD)', duration: '5 days', instructions: 'After meals' }]);
        await fetchHistory();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save record');
      }
    } catch {
      alert('Error saving consultation record');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p>Loading patient clinical timeline...</p>
      </div>
    );
  }

  if (errorMsg || !data?.patient) {
    return (
      <div className="page-container" style={{ maxWidth: '500px', textAlign: 'center', paddingTop: '3rem' }}>
        <AlertCircleIcon size={36} color="#B91C1C" />
        <p style={{ marginTop: '1rem' }}>{errorMsg || 'Patient record could not be found.'}</p>
        <Link href="/reception/search" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Search
        </Link>
      </div>
    );
  }

  const patient = data.patient;
  const consultations = data.consultations || [];

  return (
    <div className="page-container" style={{ maxWidth: '860px' }}>
      {/* Top Navigation Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span className="kicker">Screen 8 &middot; {lang === 'hi' ? 'चिकित्सा इतिहास' : 'Clinical History'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.clinicalHistory}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary">
            &larr; Back
          </button>
          <Link href="/doctor" className="btn btn-primary">
            Doctor Panel &rarr;
          </Link>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div
        className="editorial-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          backgroundColor: 'var(--bg-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {patient.full_name}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {t.patientUid}: <strong>{patient.patient_uid}</strong> &bull; Mobile: {patient.mobile} &bull; {patient.gender}, {patient.age} yrs
            {patient.blood_group ? ` &bull; Blood Group: ${patient.blood_group}` : ''}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            {consultations.length} {t.visits}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded in system</div>
        </div>
      </div>

      {/* Chronological Visits Timeline (Blueprint Screen 8 Design) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{t.timelineOfVisits}</h2>

        {consultations.length === 0 ? (
          <div className="editorial-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No prior consultations recorded for this patient. Enter initial consultation notes below.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {consultations.map((c: any) => (
              <div
                key={c.id}
                className="editorial-card"
                style={{
                  borderLeft: '4px solid var(--primary)',
                  padding: '1.25rem 1.5rem',
                }}
              >
                {/* Visit Date & Doctor Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-hairline)',
                    paddingBottom: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                    <CalendarIcon size={16} color="var(--primary)" />
                    <span>
                      {new Date(c.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Attending: <strong>{c.doctor_name || 'Dr. Farhan Akhtar'}</strong> ({c.doctor_specialization || 'OPD'})
                  </div>
                </div>

                {/* Symptoms & Diagnosis */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {t.symptoms}:
                  </div>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {c.symptoms || 'General routine consultation'}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {t.diagnosis}:
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {c.diagnosis || 'Clinical evaluation'}
                  </div>
                </div>

                {/* Prescribed Medicines */}
                {c.prescriptions && c.prescriptions.length > 0 && (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      margin: '0.75rem 0',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      {t.prescriptions}:
                    </div>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {c.prescriptions.map((p: any) => (
                        <li key={p.id}>
                          <strong>{p.medicine_name}</strong> &mdash; {p.dosage} &bull; {p.frequency} &bull; {p.duration} ({p.instructions})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Doctor Advice / Notes */}
                {(c.doctor_notes || c.advice) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {c.doctor_notes && <div><strong>Notes:</strong> {c.doctor_notes}</div>}
                    {c.advice && <div><strong>Advice:</strong> {c.advice}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Consultation Record Form */}
      <div className="editorial-card" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{t.addConsultationNotes}</h2>
        <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
          Record symptoms, clinical diagnosis, and prescribe medications for {patient.full_name}.
        </p>

        {saveSuccess && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--status-active-bg)',
              color: 'var(--status-active-fg)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircleIcon size={18} color="var(--primary)" />
            Clinical consultation record successfully saved to database.
          </div>
        )}

        <form onSubmit={handleSaveConsultation}>
          <div className="form-group">
            <label className="form-label">{t.symptoms}</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Bukhar 3 din se, gale mein kharash, badan dard"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.diagnosis}</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Acute Pharyngitis with Viral Fever"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Doctor Clinical Notes</label>
            <textarea
              className="form-control"
              style={{ minHeight: '70px' }}
              placeholder="Vitals, examination observations, systemic review..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.doctorAdvice}</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Salt water gargle 3 times daily, adequate bed rest, light soft diet"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>

          {/* Dynamic Prescription Rows */}
          <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {t.prescriptions} (Medicines)
              </label>
              <button
                type="button"
                onClick={addPrescriptionRow}
                className="btn btn-sm btn-secondary"
              >
                + {t.addMedicine}
              </button>
            </div>

            {prescriptions.map((p, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Medicine name (e.g. Tab Paracetamol 650mg)"
                  value={p.medicine_name}
                  onChange={(e) => updatePrescriptionRow(idx, 'medicine_name', e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder={t.dosage}
                  value={p.dosage}
                  onChange={(e) => updatePrescriptionRow(idx, 'dosage', e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder={t.frequency}
                  value={p.frequency}
                  onChange={(e) => updatePrescriptionRow(idx, 'frequency', e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder={t.duration}
                  value={p.duration}
                  onChange={(e) => updatePrescriptionRow(idx, 'duration', e.target.value)}
                />
                {prescriptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrescriptionRow(idx)}
                    className="btn btn-sm btn-secondary"
                    style={{ color: 'var(--status-danger-fg)' }}
                    title="Remove row"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={submitting}
          >
            {submitting ? 'SAVING MEDICAL RECORD...' : t.saveConsultation}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PatientHistoryPage() {
  return (
    <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}><p>Loading clinical records...</p></div>}>
      <PatientHistoryContent />
    </Suspense>
  );
}
