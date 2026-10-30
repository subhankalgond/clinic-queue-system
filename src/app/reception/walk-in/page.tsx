'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, PrinterIcon, CheckCircleIcon, AlertCircleIcon, UsersIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';
import PrintSlipModal from '@/components/PrintSlipModal';

export default function WalkInEntryPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState<number | string>(28);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [issuedToken, setIssuedToken] = useState<any>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('clinic_lang') as Language;
    if (saved) setLang(saved);

    const onLangChange = () => {
      const cur = localStorage.getItem('clinic_lang') as Language;
      if (cur) setLang(cur);
    };
    window.addEventListener('languageChanged', onLangChange);

    fetch('/api/booking')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors);
          setSelectedDoctorId(data.doctors[0].id);
        }
      })
      .catch(() => setErrorMsg('Failed to load doctor roster.'));

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, []);

  const handleGenerateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!patientName.trim()) {
      setErrorMsg('Patient name is required.');
      return;
    }
    const cleanPhone = mobile.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reception/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          mobile: cleanPhone,
          doctor_id: selectedDoctorId,
          gender,
          age: Number(age) || 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to issue walk-in token');
        return;
      }

      setIssuedToken(data.token);
      setShowSlipModal(true);
      // Reset form fields
      setPatientName('');
      setMobile('');
    } catch {
      setErrorMsg('Network error while issuing walk-in token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      {/* Editorial Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="kicker">Screen 5 &middot; {lang === 'hi' ? 'वॉक-इन पर्ची' : 'Walk-in Registration'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.walkInTitle}</h1>
          <p style={{ fontSize: '0.875rem' }}>{t.walkInSubtitle}</p>
        </div>
        <Link href="/reception" className="btn btn-secondary">
          &larr; {lang === 'hi' ? 'आज की लिस्ट' : "Today's Queue"}
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
        {/* Registration Form Card */}
        <div className="editorial-card">
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-fg)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleGenerateWalkIn}>
            <div className="form-group">
              <label className="form-label" htmlFor="walkin-name">
                {t.patientName}
              </label>
              <input
                id="walkin-name"
                type="text"
                className="form-control"
                placeholder="Patient full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="walkin-phone">
                {t.phoneNumber}
              </label>
              <input
                id="walkin-phone"
                type="tel"
                className="form-control"
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={14}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="walkin-doctor">
                {t.selectDoctor}
              </label>
              <select
                id="walkin-doctor"
                className="form-control"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} &bull; {d.specialization} ({d.opd_room}) &bull; ₹{d.consultation_fee}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t.gender}</label>
                <select
                  className="form-control"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">{t.male}</option>
                  <option value="Female">{t.female}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t.age}</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-control"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              style={{ marginTop: '0.75rem' }}
            >
              {loading ? 'GENERATING TOKEN...' : t.createToken}
              {!loading && <ArrowRightIcon size={18} />}
            </button>
          </form>
        </div>

        {/* Blueprint Visual Preview Column */}
        <div>
          <div
            className="editorial-card"
            style={{
              textAlign: 'center',
              backgroundColor: 'var(--primary-light)',
              borderColor: 'var(--primary)',
              padding: '2rem 1.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--primary)',
              }}
            >
              {lang === 'hi' ? 'नया टोकन' : 'NEXT TOKEN IN QUEUE'}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-editorial)',
                fontSize: '4.5rem',
                fontWeight: 800,
                color: 'var(--primary)',
                lineHeight: 1,
                margin: '1rem 0',
              }}
            >
              {issuedToken ? issuedToken.token_display : '#--'}
            </div>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {issuedToken ? (
                <>
                  Issued to: <strong>{issuedToken.patient_name}</strong>
                  <br />
                  Doctor: {issuedToken.doctor_name}
                </>
              ) : (
                'Fill patient information to generate instant walk-in token.'
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--primary)',
              }}
            >
              <CheckCircleIcon size={16} color="var(--primary)" />
              Print / Thermal Slip &bull; Unified Line
            </div>

            {issuedToken && (
              <button
                type="button"
                onClick={() => setShowSlipModal(true)}
                className="btn btn-primary btn-full"
                style={{ marginTop: '1.5rem' }}
              >
                <PrinterIcon size={18} /> {t.printSlip}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog for Printing Thermal Slip */}
      <PrintSlipModal
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
        tokenData={issuedToken}
      />
    </div>
  );
}
