'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VolumeIcon, TvIcon, StethoscopeIcon } from '@/components/EditorialIcons';

export default function WaitingRoomTVPage() {
  const [data, setData] = useState<any>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc_01');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioLang, setAudioLang] = useState<'hi' | 'en'>('hi');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const lastTokenRef = useRef<string | null>(null);

  // Time clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const playChimeAndVoice = (tokenDisplay: string, room: string) => {
    try {
      // 1. Play high-quality dual chime
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.18); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.36); // G5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);

      // 2. Synthesize clear vocal announcement
      if ('speechSynthesis' in window) {
        setTimeout(() => {
          const numOnly = tokenDisplay.replace('#', '');
          const speechText =
            audioLang === 'hi'
              ? `टोकन नंबर ${numOnly}, कृपया ${room} में पधारें।`
              : `Token number ${numOnly}, please proceed to ${room}.`;

          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.rate = 0.9;
          utterance.lang = audioLang === 'hi' ? 'hi-IN' : 'en-US';
          window.speechSynthesis.speak(utterance);
        }, 600);
      }
    } catch {
      // Audio playback requires explicit user gesture
    }
  };

  const fetchTVQueue = async () => {
    try {
      const res = await fetch(`/api/queue/tv?doctor_id=${selectedDoctorId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);

        const activeDisplay = json.active_token?.token_display;
        if (activeDisplay && activeDisplay !== lastTokenRef.current) {
          lastTokenRef.current = activeDisplay;
          setLastAnnouncedToken(activeDisplay);
          if (audioEnabled) {
            playChimeAndVoice(activeDisplay, json.doctor?.opd_room || 'OPD Room');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTVQueue();
    const interval = setInterval(fetchTVQueue, 4000);
    return () => clearInterval(interval);
  }, [selectedDoctorId, audioEnabled, audioLang]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activeToken = data?.active_token;
  const upcomingTokens = data?.upcoming_tokens || [];
  const doctor = data?.doctor;
  const clinic = data?.clinic;

  return (
    <div
      style={{
        backgroundColor: '#0F172A', // Dark High-Contrast TV Canvas
        color: '#F8FAFC',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #1E293B',
          paddingBottom: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: '#1E293B',
              padding: '0.6rem',
              borderRadius: '6px',
              color: '#34D399',
            }}
          >
            <StethoscopeIcon size={28} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
              }}
            >
              {clinic?.name || 'AAPKA CLINIC'} &bull; OUTPATIENT DEPARTMENT
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
              {doctor ? `${doctor.full_name} (${doctor.specialization} &bull; ${doctor.opd_room})` : 'General OPD'}
            </div>
          </div>
        </div>

        {/* Live Clock & Control Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '1.5rem',
              fontWeight: 700,
              backgroundColor: '#1E293B',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              color: '#38BDF8',
            }}
          >
            {currentTime}
          </div>

          {/* Doctor Switcher for Multidoctor Clinics */}
          {data?.doctors && data.doctors.length > 1 && (
            <select
              style={{
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #334155',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              {data.doctors.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.opd_room})
                </option>
              ))}
            </select>
          )}

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next && activeToken) {
                playChimeAndVoice(activeToken.token_display, doctor?.opd_room || 'Room');
              }
            }}
            style={{
              backgroundColor: audioEnabled ? '#0D4E3C' : '#334155',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.5rem 0.875rem',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            <VolumeIcon size={16} />
            {audioEnabled ? 'Voice ON' : 'Voice OFF'}
          </button>

          {/* Language Toggle for Speech */}
          {audioEnabled && (
            <button
              type="button"
              onClick={() => setAudioLang(audioLang === 'hi' ? 'en' : 'hi')}
              style={{
                backgroundColor: '#1E293B',
                color: '#38BDF8',
                border: '1px solid #334155',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 700,
              }}
            >
              {audioLang === 'hi' ? 'हिंदी आवाज़' : 'English Voice'}
            </button>
          )}

          {/* Fullscreen Mode Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              border: '1px solid #334155',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            <TvIcon size={16} /> {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Main Waiting Hall Grid: Blueprint Screen 9 Layout */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '2rem',
          alignItems: 'stretch',
        }}
      >
        {/* Left Big Panel: ABHI CHAL RAHA (NOW CALLING) */}
        <div
          style={{
            backgroundColor: '#020617',
            border: '2px solid #1E293B',
            borderRadius: '12px',
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#94A3B8',
              marginBottom: '1rem',
            }}
          >
            {audioLang === 'hi' ? 'अभी चल रहा' : 'CURRENTLY CALLING'}
          </div>

          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '11rem',
              fontWeight: 900,
              lineHeight: 1,
              color: '#34D399', // High contrast emerald glow
              textShadow: '0 0 40px rgba(52, 211, 153, 0.3)',
              margin: '1rem 0',
            }}
          >
            {activeToken ? activeToken.token_display : '#--'}
          </div>

          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#F8FAFC',
              marginTop: '1rem',
            }}
          >
            {activeToken ? `PLEASE PROCEED TO ${doctor?.opd_room || 'OPD ROOM'}` : 'PLEASE WAIT FOR NEXT TOKEN'}
          </div>
        </div>

        {/* Right Panel: AGLE (UPCOMING TOKENS) */}
        <div
          style={{
            backgroundColor: '#1E293B',
            border: '2px solid #334155',
            borderRadius: '12px',
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#94A3B8',
                borderBottom: '2px solid #334155',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              {audioLang === 'hi' ? 'अगले टोकन' : 'UPCOMING TOKENS'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {upcomingTokens.length > 0 ? (
                upcomingTokens.map((t: any, index: number) => (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: 600 }}>
                      Next #{index + 1}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '3rem',
                        fontWeight: 800,
                        color: '#F8FAFC',
                      }}
                    >
                      {t.token_display}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748B' }}>
                  No more tokens waiting
                </div>
              )}
            </div>
          </div>

          {/* Privacy Note at Bottom */}
          <div
            style={{
              borderTop: '1px solid #334155',
              paddingTop: '1rem',
              fontSize: '0.75rem',
              color: '#64748B',
              textAlign: 'center',
            }}
          >
            Aapka Clinic &bull; Live Queue Broadcast &bull; Patient privacy protected
          </div>
        </div>
      </div>
    </div>
  );
}
