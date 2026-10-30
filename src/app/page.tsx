'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StethoscopeIcon, CalendarIcon, UsersIcon, CheckCircleIcon, AlertCircleIcon, ArrowRightIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';
import Link from 'next/link';

interface DoctorOption {
  id: string;
  full_name: string;
  qualification: string;
  specialization: string;
  opd_room: string;
  consultation_fee: number;
  today_tokens: number;
}

export default function TokenBookingPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState<number | string>(32);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(60);
  const [opdMorning, setOpdMorning] = useState('10:00 AM - 02:00 PM');
  const [opdEvening, setOpdEvening] = useState('05:00 PM - 09:00 PM');

  useEffect(() => {
    const saved = localStorage.getItem('clinic_lang') as Language;
    if (saved) setLang(saved);

    const onLangChange = () => {
      const cur = localStorage.getItem('clinic_lang') as Language;
      if (cur) setLang(cur);
    };
    window.addEventListener('languageChanged', onLangChange);

    // Fetch clinic info and doctors
    fetch('/api/booking')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors);
          setSelectedDoctorId(data.doctors[0].id);
        }
        if (data.settings) {
          setOnlineBookingEnabled(Boolean(data.settings.online_booking_enabled));
          setDailyLimit(Number(data.settings.daily_token_limit) || 60);
          if (data.settings.opd_morning_timing) setOpdMorning(data.settings.opd_morning_timing);
          if (data.settings.opd_evening_timing) setOpdEvening(data.settings.opd_evening_timing);
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Failed to load clinic availability.');
      })
      .finally(() => setFetching(false));

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, []);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  const handleShareLink = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedDoctorId) {
      setErrorMsg('Please select a doctor / OPD.');
      return;
    }
    if (!patientName.trim()) {
      setErrorMsg('Please enter patient name.');
      return;
    }
    const cleanPhone = mobile.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          patient_name: patientName.trim(),
          mobile: cleanPhone,
          gender,
          age: Number(age) || 30,
          day,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to book token.');
        return;
      }

      // Success: redirect to Screen 2 Token Confirm
      router.push(`/confirm/${data.token.id}`);
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '640px' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="kicker">Screen 1 &middot; {lang === 'hi' ? 'मरीज़ पोर्टल' : 'Patient Portal'}</span>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{t.bookToken}</h1>
        <p style={{ fontSize: '0.9375rem', maxWidth: '480px', margin: '0 auto' }}>
          {t.bookTokenSubtitle}
        </p>

        {/* Timings Badge Strip */}
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.75rem',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            <strong>Morning OPD:</strong> {opdMorning}
          </span>
          <span style={{ color: 'var(--border-strong)' }}>&bull;</span>
          <span>
            <strong>Evening OPD:</strong> {opdEvening}
          </span>
        </div>
      </div>

      {/* Booking Disabled Notice */}
      {!onlineBookingEnabled && (
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-fg)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            border: '1px solid rgba(153, 27, 27, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircleIcon size={24} />
          <div>
            <strong>{t.bookingClosed}</strong>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              Direct walk-in registration remains available at the clinic reception desk.
            </div>
          </div>
        </div>
      )}

      {/* Main Booking Card */}
      <div className="editorial-card">
        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-fg)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircleIcon size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Doctor Selection */}
          <div className="form-group">
            <label className="form-label" htmlFor="doctor-select">
              {t.selectDoctor}
            </label>
            <select
              id="doctor-select"
              className="form-control"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={fetching || !onlineBookingEnabled}
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.full_name} &mdash; {doc.specialization} ({doc.opd_room})
                </option>
              ))}
            </select>
            {selectedDoctor && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.35rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {selectedDoctor.qualification} &bull; Room: {selectedDoctor.opd_room}
                </span>
                <span>
                  Today: <strong>{selectedDoctor.today_tokens} / {dailyLimit}</strong> tokens
                </span>
              </div>
            )}
          </div>

          {/* Day Selection (Aaj / Kal) */}
          <div className="form-group">
            <label className="form-label">{t.chooseDay}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDay('today')}
                className={`btn ${day === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'center' }}
              >
                <CalendarIcon size={16} />
                {t.today}
              </button>
              <button
                type="button"
                onClick={() => setDay('tomorrow')}
                className={`btn ${day === 'tomorrow' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'center' }}
              >
                <CalendarIcon size={16} />
                {t.tomorrow}
              </button>
            </div>
          </div>

          <hr className="hairline-divider" />

          {/* Patient Details */}
          <div className="form-group">
            <label className="form-label" htmlFor="patient-name">
              {t.patientName}
            </label>
            <input
              id="patient-name"
              type="text"
              className="form-control"
              placeholder={t.patientNamePlaceholder}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              disabled={!onlineBookingEnabled}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mobile-number">
              {t.phoneNumber}
            </label>
            <input
              id="mobile-number"
              type="tel"
              className="form-control"
              placeholder={t.phonePlaceholder}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={14}
              required
              disabled={!onlineBookingEnabled}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="gender-select">
                {t.gender}
              </label>
              <select
                id="gender-select"
                className="form-control"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={!onlineBookingEnabled}
              >
                <option value="Male">{t.male}</option>
                <option value="Female">{t.female}</option>
                <option value="Other">{t.other}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="patient-age">
                {t.age}
              </label>
              <input
                id="patient-age"
                type="number"
                min="1"
                max="120"
                className="form-control"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                disabled={!onlineBookingEnabled}
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading || !onlineBookingEnabled}
            style={{ marginTop: '0.75rem' }}
          >
            {loading ? 'GENERATING TOKEN...' : t.bookButton}
            {!loading && <ArrowRightIcon size={18} />}
          </button>
        </form>

        <hr className="hairline-divider" />

        {/* Share & Useful Options */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleShareLink}
            className="btn btn-sm btn-secondary"
          >
            {shareSuccess ? (
              <>
                <CheckCircleIcon size={14} color="#0D4E3C" /> {t.copiedLink}
              </>
            ) : (
              t.shareLink
            )}
          </button>

          <Link href="/tv" target="_blank" className="btn btn-sm btn-secondary">
            Waiting Hall TV Screen &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
