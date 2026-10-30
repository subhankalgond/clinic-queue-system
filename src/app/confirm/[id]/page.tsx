'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, ClockIcon, StethoscopeIcon, ArrowRightIcon, AlertCircleIcon, PrinterIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';
import PrintSlipModal from '@/components/PrintSlipModal';

function TokenConfirmContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [token, setToken] = useState<any>(null);
  const [queueState, setQueueState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('clinic_lang') as Language;
    if (saved) setLang(saved);

    const onLangChange = () => {
      const cur = localStorage.getItem('clinic_lang') as Language;
      if (cur) setLang(cur);
    };
    window.addEventListener('languageChanged', onLangChange);

    fetch(`/api/tokens/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setToken(data.token);
          setQueueState(data.queue_state);
        }
      })
      .catch(() => setErrorMsg('Failed to load token confirmation.'))
      .finally(() => setLoading(false));

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this consultation token?')) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/tokens/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(t.tokenCancelledSuccess);
        router.push('/');
      } else {
        alert(data.error || 'Failed to cancel token');
      }
    } catch {
      alert('Error cancelling token');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!token) return;
    const text = encodeURIComponent(
      `*Aapka Clinic Token Confirmation*\nToken: ${token.token_display}\nDoctor: ${token.doctor_name}\nDate: ${token.appointment_date}\nTrack Live Queue: ${window.location.origin}/live/${token.id}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p>Loading booking confirmation from database...</p>
      </div>
    );
  }

  if (errorMsg || !token) {
    return (
      <div className="page-container" style={{ maxWidth: '500px', textAlign: 'center', paddingTop: '3rem' }}>
        <AlertCircleIcon size={40} color="#B91C1C" />
        <h2 style={{ margin: '1rem 0 0.5rem' }}>Token Not Found</h2>
        <p style={{ marginBottom: '1.5rem' }}>{errorMsg || 'We could not locate the requested token.'}</p>
        <Link href="/" className="btn btn-primary">
          Back to Token Booking
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '520px' }}>
      {/* Editorial Confirmation Container */}
      <div className="editorial-card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <span className="kicker">Screen 2 &middot; {lang === 'hi' ? 'पुष्टिकरण' : 'Confirmation'}</span>

        {/* Big Success Check Circle */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0.75rem auto 1rem auto',
          }}
        >
          <CheckCircleIcon size={36} color="var(--primary)" />
        </div>

        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{t.tokenConfirmed}</h1>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {token.clinic_name} &bull; {token.clinic_address}
        </div>

        <hr className="hairline-divider" />

        {/* Big Token Number */}
        <div style={{ margin: '1.25rem 0' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            {t.yourToken}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '4.5rem',
              fontWeight: 700,
              color: 'var(--primary)',
              lineHeight: 1,
              margin: '0.5rem 0',
            }}
          >
            {token.token_display}
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {token.patient_name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            UID: {token.patient_uid} &bull; Date: {token.appointment_date}
          </div>
        </div>

        {/* Doctor & Room Info */}
        <div
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            textAlign: 'left',
            margin: '1.25rem 0',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <StethoscopeIcon size={18} color="var(--primary)" />
            <strong style={{ fontSize: '0.9375rem' }}>{token.doctor_name}</strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {token.doctor_specialization} &bull; {token.doctor_room}
          </div>
        </div>

        {/* Estimated Time Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--status-waiting-fg)',
            backgroundColor: 'var(--status-waiting-bg)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            border: '1px solid rgba(180, 83, 9, 0.2)',
          }}
        >
          <ClockIcon size={20} />
          <span>
            {t.estimatedTime}: {queueState?.estimated_time || '~ 25 min'}
          </span>
        </div>

        {/* Primary Action: Go to Live Queue */}
        <Link
          href={`/live/${token.id}`}
          className="btn btn-primary btn-lg btn-full"
          style={{ marginBottom: '0.75rem' }}
        >
          {t.viewLiveQueue}
          <ArrowRightIcon size={18} />
        </Link>

        {/* Secondary Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="btn btn-secondary"
          >
            <PrinterIcon size={16} /> {lang === 'hi' ? 'पर्ची प्रिंट' : 'Print Slip'}
          </button>
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="btn btn-secondary"
          >
            {lang === 'hi' ? 'व्हाट्सएप शेयर' : 'WhatsApp Share'}
          </button>
        </div>

        {/* Cancellation Option */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)' }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelLoading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--status-danger-fg)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {cancelLoading ? 'Cancelling...' : t.cancelToken}
          </button>
        </div>
      </div>

      {/* Printable Thermal Slip Modal */}
      <PrintSlipModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        tokenData={{
          token_display: token.token_display,
          patient_name: token.patient_name,
          patient_uid: token.patient_uid,
          patient_mobile: token.patient_mobile,
          doctor_name: token.doctor_name,
          doctor_room: token.doctor_room,
          appointment_date: token.appointment_date,
          clinic_name: token.clinic_name,
          clinic_address: token.clinic_address,
          clinic_phone: token.clinic_phone,
        }}
      />
    </div>
  );
}

export default function TokenConfirmPage() {
  return (
    <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}><p>Loading confirmation...</p></div>}>
      <TokenConfirmContent />
    </Suspense>
  );
}
