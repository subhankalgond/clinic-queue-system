'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ClockIcon, StethoscopeIcon, AlertCircleIcon, VolumeIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

function LiveQueueContent() {
  const params = useParams();
  const id = params?.id as string;

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [token, setToken] = useState<any>(null);
  const [queueState, setQueueState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/tokens/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setToken(data.token);
      setQueueState(data.queue_state);
      setLastUpdated(new Date().toLocaleTimeString());

      // If patient's token is called, trigger gentle Web Audio notification chime
      if (data.token?.status === 'called' && soundEnabled) {
        playBeep();
      }
    } catch {
      setErrorMsg('Connection to live queue interrupted. Retrying...');
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

    fetchQueue();
    // Live update interval: every 5 seconds
    const interval = setInterval(fetchQueue, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('languageChanged', onLangChange);
    };
  }, [id, soundEnabled]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // AudioContext may require user gesture
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p>Connecting to live clinic queue...</p>
      </div>
    );
  }

  if (errorMsg && !token) {
    return (
      <div className="page-container" style={{ maxWidth: '480px', textAlign: 'center', paddingTop: '3rem' }}>
        <AlertCircleIcon size={36} color="#B91C1C" />
        <p style={{ marginTop: '1rem' }}>{errorMsg}</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const isMyTurn = token?.status === 'called';
  const isCompleted = token?.status === 'completed';

  return (
    <div className="page-container" style={{ maxWidth: '480px' }}>
      {/* Live Indicator Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span className="kicker">Screen 3 &middot; {lang === 'hi' ? 'लाइव स्थिति' : 'Real-time Tracker'}</span>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{t.liveQueue}</h1>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {token?.clinic_name || 'Aapka Clinic'}
        </div>
      </div>

      {/* Main Live Queue Editorial Card */}
      <div
        className="editorial-card"
        style={{
          textAlign: 'center',
          padding: '1.75rem 1.25rem',
          backgroundColor: isMyTurn ? '#F0FDF4' : '#FFFFFF',
          borderColor: isMyTurn ? 'var(--primary)' : 'var(--border-hairline)',
        }}
      >
        {/* Doctor Details */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            marginBottom: '1.25rem',
          }}
        >
          <StethoscopeIcon size={16} color="var(--primary)" />
          <strong>{token?.doctor_name}</strong> &bull; {token?.doctor_room}
        </div>

        {/* Big Currently Serving Block */}
        <div
          style={{
            backgroundColor: isMyTurn ? 'var(--primary)' : 'var(--bg-page)',
            color: isMyTurn ? '#FFFFFF' : 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isMyTurn ? '#E7F3EF' : 'var(--text-secondary)',
            }}
          >
            {t.currentlyServing}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '4.5rem',
              fontWeight: 800,
              lineHeight: 1.1,
              margin: '0.25rem 0',
              color: isMyTurn ? '#FFFFFF' : 'var(--primary)',
            }}
          >
            {queueState?.currently_serving_display || 'Waiting'}
          </div>
          {isMyTurn && (
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#FEF08A',
                marginTop: '0.5rem',
              }}
            >
              IT IS YOUR TURN! PLEASE ENTER {token?.doctor_room || 'OPD ROOM'}.
            </div>
          )}
        </div>

        {/* Patient Token & Ahead Count Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}
        >
          <div style={{ borderRight: '1px solid var(--border-hairline)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {t.yourTokenLabel}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {token?.token_display}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {lang === 'hi' ? 'आगे मरीज़' : 'Patients Ahead'}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {isMyTurn ? '0' : queueState?.patients_ahead || 0}
            </div>
          </div>
        </div>

        {/* Estimated Time Strip */}
        {!isMyTurn && !isCompleted && (
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--status-waiting-fg)',
              backgroundColor: 'var(--status-waiting-bg)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              border: '1px solid rgba(180, 83, 9, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <ClockIcon size={18} />
            <span>
              ~ {queueState?.estimated_minutes || 20} min {lang === 'hi' ? 'में आपकी बारी' : 'estimated wait'}
            </span>
          </div>
        )}

        {isCompleted && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--status-completed-bg)',
              color: 'var(--status-completed-fg)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            Consultation Completed. Take care!
          </div>
        )}

        {/* Live Auto-Refresh Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                display: 'inline-block',
              }}
            />
            {t.liveUpdateNotice}
          </span>
          <span>{lastUpdated ? `Updated: ${lastUpdated}` : ''}</span>
        </div>
      </div>

      {/* Helpful Instructions */}
      <div
        style={{
          marginTop: '1.25rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong>Instructions for Patients:</strong>
        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
          <li>Keep this screen open on your phone; it refreshes automatically.</li>
          <li>Proceed to the OPD waiting hall when only 1 or 2 patients remain ahead.</li>
          <li>For questions, approach the reception desk with your token number.</li>
        </ul>
      </div>
    </div>
  );
}

export default function LiveQueuePage() {
  return (
    <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}><p>Connecting to live queue...</p></div>}>
      <LiveQueueContent />
    </Suspense>
  );
}
