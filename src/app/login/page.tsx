'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StethoscopeIcon, ShieldCheckIcon, AlertCircleIcon, ArrowRightIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

export default function StaffLoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('1234');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('clinic_lang') as Language;
    if (saved) setLang(saved);

    const onLangChange = () => {
      const cur = localStorage.getItem('clinic_lang') as Language;
      if (cur) setLang(cur);
    };
    window.addEventListener('languageChanged', onLangChange);
    return () => window.removeEventListener('languageChanged', onLangChange);
  }, []);

  const handleSendOtp = async () => {
    if (!mobile.trim()) {
      setErrorMsg('Please enter your registered staff mobile number.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setInfoMsg(data.message || 'OTP sent successfully. Demo OTP: 1234');
      } else {
        setErrorMsg(data.error || 'Failed to send OTP');
      }
    } catch {
      setErrorMsg('Network error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim() || !otp.trim()) {
      setErrorMsg('Both mobile number and OTP code are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Redirection based on role
        router.push(data.redirectUrl || '/reception');
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Login failed. Invalid OTP code.');
      }
    } catch {
      setErrorMsg('Network error verifying credentials');
    } finally {
      setLoading(false);
    }
  };

  const setDemoStaff = (phone: string, roleName: string) => {
    setMobile(phone);
    setOtp('1234');
    setOtpSent(true);
    setInfoMsg(`Pre-filled ${roleName} credentials. Click "LOGIN" to enter.`);
    setErrorMsg('');
  };

  return (
    <div className="page-container" style={{ maxWidth: '460px', paddingTop: '2rem' }}>
      <div className="editorial-card" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
        {/* Brand Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
          }}
        >
          <StethoscopeIcon size={30} />
        </div>

        <span className="kicker">Screen 12 &middot; {lang === 'hi' ? 'स्टाफ लॉगिन' : 'Authorized Staff'}</span>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{t.clinicName}</h1>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.75rem' }}>{t.staffLoginSubtitle}</p>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-fg)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircleIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--status-active-bg)',
              color: 'var(--status-active-fg)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              textAlign: 'left',
            }}
          >
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleVerifyLogin} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-mobile">
              {t.enterMobile}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="staff-mobile"
                type="tel"
                className="form-control"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={14}
                required
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
              >
                {t.requestOtp}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="staff-otp">
              {t.enterOtp}
            </label>
            <input
              id="staff-otp"
              type="password"
              className="form-control"
              placeholder="&bull; &bull; &bull; &bull;"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              style={{ letterSpacing: '0.25em', fontWeight: 700, fontSize: '1.25rem', textAlign: 'center' }}
              required
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {t.demoNotice}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: '0.75rem' }}
          >
            {loading ? 'VERIFYING...' : t.verifyAndLogin}
            {!loading && <ArrowRightIcon size={18} />}
          </button>
        </form>

        <hr className="hairline-divider" />

        {/* 1-Click Fast Evaluation Helpers */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Instant Role Test Logins:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setDemoStaff('9876543210', 'Clinic Malik / Owner')}
              className="btn btn-sm btn-secondary"
              style={{ justifyContent: 'space-between', width: '100%' }}
            >
              <span>1. Dr. A.K. Sharma (Malik / Admin)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>9876543210</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoStaff('9876543211', 'Dr. Farhan Akhtar (Doctor)')}
              className="btn btn-sm btn-secondary"
              style={{ justifyContent: 'space-between', width: '100%' }}
            >
              <span>2. Dr. Farhan Akhtar (Doctor OPD 1)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>9876543211</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoStaff('9876543213', 'Pooja (Reception)')}
              className="btn btn-sm btn-secondary"
              style={{ justifyContent: 'space-between', width: '100%' }}
            >
              <span>3. Pooja (Reception Desk)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>9876543213</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
