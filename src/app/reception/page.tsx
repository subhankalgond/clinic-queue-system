'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UsersIcon, SearchIcon, CheckCircleIcon, AlertCircleIcon, ArrowRightIcon, TvIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

export default function ReceptionDashboardPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [tokens, setTokens] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTokens = async () => {
    try {
      const url = new URL('/api/reception/tokens', window.location.origin);
      if (selectedDoctor !== 'all') url.searchParams.set('doctor_id', selectedDoctor);
      if (selectedStatus !== 'all') url.searchParams.set('status', selectedStatus);
      if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
        setStats(data.stats || {});
        setDoctors(data.doctors || []);
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

    fetchTokens();
    const interval = setInterval(fetchTokens, 8000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('languageChanged', onLangChange);
    };
  }, [selectedDoctor, selectedStatus, searchQuery]);

  const handleStatusChange = async (tokenId: string, newStatus: string) => {
    setActionLoading(tokenId);
    try {
      const res = await fetch('/api/reception/tokens', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, status: newStatus }),
      });
      if (res.ok) {
        await fetchTokens();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update token');
      }
    } catch {
      alert('Error updating token status');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page-container">
      {/* Editorial Header Strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span className="kicker">Screen 4 &middot; {lang === 'hi' ? 'रिसेप्शन डेस्क' : 'Reception Desk'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.todaysList}</h1>
          <p style={{ fontSize: '0.875rem' }}>
            {lang === 'hi'
              ? 'रिसेप्शन पर आज के सारे टोकन एक जगह, स्थिति के साथ। रजिस्टर की ज़रूरत खत्म।'
              : "Live queue tracking and patient arrival registration. Paper registers replaced."}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/reception/walk-in" className="btn btn-primary">
            + {lang === 'hi' ? 'वॉक-इन मरीज़' : 'Walk-in Entry'}
          </Link>
          <Link href="/reception/search" className="btn btn-secondary">
            <SearchIcon size={16} /> {lang === 'hi' ? 'मरीज़ खोज' : 'Search Records'}
          </Link>
          <Link href="/tv" target="_blank" className="btn btn-secondary">
            <TvIcon size={16} /> TV Screen
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="editorial-card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            {t.totalPatients}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats.total || 0}
          </div>
        </div>

        <div className="editorial-card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--status-waiting-fg)' }}>
            Waiting
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--status-waiting-fg)' }}>
            {stats.waiting || 0}
          </div>
        </div>

        <div className="editorial-card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--status-arrived-fg)' }}>
            Arrived at Clinic
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--status-arrived-fg)' }}>
            {stats.arrived || 0}
          </div>
        </div>

        <div className="editorial-card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)' }}>
            In Consultation
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            {stats.active || 0}
          </div>
        </div>

        <div className="editorial-card" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--status-completed-fg)' }}>
            Completed
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--status-completed-fg)' }}>
            {stats.completed || 0}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className="editorial-card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div>
          <label className="form-label">{lang === 'hi' ? 'खोजें' : 'Search'}</label>
          <input
            type="text"
            className="form-control"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">{lang === 'hi' ? 'डॉक्टर' : 'Doctor'}</label>
          <select
            className="form-control"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="all">{t.filterDoctor}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.opd_room})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">{lang === 'hi' ? 'स्थिति' : 'Status'}</label>
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">{t.filterStatus}</option>
            <option value="waiting">Waiting (प्रतीक्षारत)</option>
            <option value="arrived">Arrived (आया)</option>
            <option value="called">Called / Chal Raha</option>
            <option value="completed">Completed (संपन्न)</option>
            <option value="skipped">Skipped (आगे बढ़ाया)</option>
            <option value="no_show">No-Show (अनुपस्थित)</option>
          </select>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="table-wrapper">
        <table className="editorial-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>{t.tokenCol}</th>
              <th>{t.patientCol}</th>
              <th>Doctor</th>
              <th>Source</th>
              <th>{t.statusCol}</th>
              <th style={{ textAlign: 'right' }}>{t.actionsCol}</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading queue...' : t.noPatientsFound}
                </td>
              </tr>
            ) : (
              tokens.map((tok) => {
                const isArrived = tok.status === 'arrived';
                const isWaiting = tok.status === 'waiting';
                const isCalled = tok.status === 'called';
                const isCompleted = tok.status === 'completed';

                return (
                  <tr key={tok.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-editorial)',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: isCalled ? 'var(--primary)' : 'var(--text-primary)',
                        }}
                      >
                        {tok.token_display}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tok.patient_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {tok.patient_mobile} &bull; {tok.patient_gender}, {tok.patient_age}y &bull; UID: {tok.patient_uid}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tok.doctor_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tok.doctor_room}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '2px',
                          backgroundColor: tok.source === 'walkin' ? '#E0E7FF' : '#FEF3C7',
                          color: tok.source === 'walkin' ? '#3730A3' : '#92400E',
                        }}
                      >
                        {tok.source}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          isCalled
                            ? 'badge-called'
                            : isArrived
                            ? 'badge-arrived'
                            : isWaiting
                            ? 'badge-waiting'
                            : isCompleted
                            ? 'badge-completed'
                            : 'badge-danger'
                        }`}
                      >
                        {tok.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        {/* Mark Arrived action for online waiting patients */}
                        {isWaiting && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(tok.id, 'arrived')}
                            disabled={actionLoading === tok.id}
                            className="btn btn-sm btn-primary"
                          >
                            <CheckCircleIcon size={14} />
                            {lang === 'hi' ? 'आया' : 'Mark Arrived'}
                          </button>
                        )}

                        {/* Call Patient into Consultation */}
                        {(isArrived || isWaiting) && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(tok.id, 'called')}
                            disabled={actionLoading === tok.id}
                            className="btn btn-sm btn-secondary"
                            title="Call Patient"
                          >
                            {lang === 'hi' ? 'बुलाएं' : 'Call'}
                          </button>
                        )}

                        {/* Mark No Show */}
                        {(isWaiting || isArrived) && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(tok.id, 'no_show')}
                            disabled={actionLoading === tok.id}
                            className="btn btn-sm btn-secondary"
                            style={{ color: 'var(--status-danger-fg)' }}
                            title="Mark No-Show"
                          >
                            No-Show
                          </button>
                        )}

                        {/* View Patient Clinical Record */}
                        <Link
                          href={`/doctor/patient/${tok.patient_id}`}
                          className="btn btn-sm btn-secondary"
                          title="View Medical Profile"
                        >
                          Profile &rarr;
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
