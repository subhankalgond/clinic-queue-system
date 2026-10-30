'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchIcon, UsersIcon, CalendarIcon, ArrowRightIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

export default function PatientSearchPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reception/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error(err);
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

    handleSearch('');

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  return (
    <div className="page-container" style={{ maxWidth: '720px' }}>
      {/* Editorial Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="kicker">Screen 6 &middot; {lang === 'hi' ? 'मरीज़ रिकॉर्ड' : 'Patient Search'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.patientSearch}</h1>
          <p style={{ fontSize: '0.875rem' }}>{t.patientSearchSubtitle}</p>
        </div>
        <Link href="/reception" className="btn btn-secondary">
          &larr; {lang === 'hi' ? 'कतार लिस्ट' : 'Queue List'}
        </Link>
      </div>

      {/* Big Search Bar */}
      <div className="editorial-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SearchIcon size={20} />
          </div>
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.75rem', fontSize: '1rem' }}
            placeholder={t.searchQuery}
            value={query}
            onChange={onInputChange}
            autoFocus
          />
        </div>
      </div>

      {/* Patient Search Results Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Searching records...</p>}

        {!loading && patients.length === 0 && (
          <div className="editorial-card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <UsersIcon size={32} color="var(--border-strong)" />
            <p style={{ marginTop: '0.75rem' }}>{t.noRecords}</p>
          </div>
        )}

        {patients.map((pat) => (
          <Link
            key={pat.id}
            href={`/doctor/patient/${pat.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="editorial-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hairline)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                  }}
                >
                  {pat.full_name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>
                    {pat.full_name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {pat.visit_count} {t.visits}
                    </span>
                    <span style={{ margin: '0 0.5rem', color: 'var(--border-strong)' }}>&bull;</span>
                    <span>
                      {t.lastVisit}: {pat.last_visit_date || 'New Patient'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    UID: <strong>{pat.patient_uid}</strong> &bull; Mobile: {pat.mobile} &bull; {pat.gender}, {pat.age}y
                  </div>
                </div>
              </div>

              {/* Arrow navigation */}
              <div
                style={{
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.25rem',
                  paddingLeft: '1rem',
                }}
              >
                &rsaquo;
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
