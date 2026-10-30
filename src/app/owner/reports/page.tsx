'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UsersIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, FileTextIcon, SettingsIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

export default function DailyReportsPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/reports?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
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

    fetchReports(dateStr);

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, [dateStr]);

  const metrics = reportData?.today_metrics || {};
  const weeklyTrend = reportData?.weekly_trend || [];
  const doctorBreakdown = reportData?.doctor_breakdown || [];

  // Find max count for scaling chart
  const maxVal = Math.max(10, ...weeklyTrend.map((d: any) => d.count || 0));

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
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
          <span className="kicker">Screen 10 &middot; {lang === 'hi' ? 'मालिक रिपोर्ट' : 'Owner Analytics'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.dailyReports}</h1>
          <p style={{ fontSize: '0.875rem' }}>
            {lang === 'hi'
              ? 'मालिक को क्लिनिक का पूरा दिन एक नज़र में, फोन पे।'
              : 'End-of-day operational summary, patient throughput, and 7-day trend analysis.'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto', minHeight: '38px', padding: '0.4rem 0.75rem' }}
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />

          <a
            href={`/api/owner/reports?date=${dateStr}&export=csv`}
            download
            className="btn btn-primary btn-sm"
          >
            <FileTextIcon size={14} /> {t.exportCsv}
          </a>

          <Link href="/owner/settings" className="btn btn-secondary btn-sm">
            <SettingsIcon size={14} /> {t.clinicSettings}
          </Link>
        </div>
      </div>

      {/* Blueprint Screen 10 Top Cards: MAREEZ & AVG WAIT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Big Patients Card */}
        <div className="editorial-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            {lang === 'hi' ? 'कुल मरीज़ (आज)' : 'TOTAL PATIENTS'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '3.5rem',
              fontWeight: 800,
              color: 'var(--primary)',
              lineHeight: 1.1,
              margin: '0.5rem 0',
            }}
          >
            {metrics.total_tokens || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Online: {metrics.online_bookings || 0} &bull; Walk-in: {metrics.walkin_entries || 0}
          </div>
        </div>

        {/* Big Avg Wait Card */}
        <div className="editorial-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            {lang === 'hi' ? 'औसत इंतज़ार' : 'AVG WAIT TIME'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '3.5rem',
              fontWeight: 800,
              color: 'var(--status-waiting-fg)',
              lineHeight: 1.1,
              margin: '0.5rem 0',
            }}
          >
            {metrics.avg_wait_minutes || 14}m
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            From arrival to consultation call
          </div>
        </div>

        {/* Completed Card */}
        <div className="editorial-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            {lang === 'hi' ? 'परामर्श संपन्न' : 'COMPLETED'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '3.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              margin: '0.5rem 0',
            }}
          >
            {metrics.completed || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Waiting now: {metrics.waiting || 0}
          </div>
        </div>

        {/* No-Shows Card */}
        <div className="editorial-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            {lang === 'hi' ? 'अनुपस्थित (NO-SHOW)' : 'NO-SHOWS'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '3.5rem',
              fontWeight: 800,
              color: 'var(--status-danger-fg)',
              lineHeight: 1.1,
              margin: '0.5rem 0',
            }}
          >
            {metrics.no_show || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Cancelled: {metrics.cancelled || 0}
          </div>
        </div>
      </div>

      {/* 7-Day Patient Volume Chart (Blueprint Screen 10) */}
      <div className="editorial-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem' }}>{t.weeklyTrend}</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Total Clinic Database Patients: <strong>{reportData?.total_registered_patients || 0}</strong>
          </span>
        </div>

        {/* Editorial SVG / Flex Bar Chart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '1rem',
            height: '180px',
            padding: '1rem 0.5rem 0 0.5rem',
            borderBottom: '2px solid var(--border-strong)',
          }}
        >
          {weeklyTrend.map((item: any, i: number) => {
            const heightPercent = Math.max(12, Math.round((item.count / maxVal) * 100));
            const isToday = i === weeklyTrend.length - 1;

            return (
              <div
                key={item.date}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: isToday ? 'var(--primary)' : 'var(--text-secondary)' }}>
                  {item.count}
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '48px',
                    height: `${heightPercent}%`,
                    backgroundColor: isToday ? 'var(--primary)' : '#A3C4BC',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`${item.date}: ${item.count} patients (${item.completed} completed)`}
                />
              </div>
            );
          })}
        </div>

        {/* Day Labels Row: Som, Mangal, Budh, Guru, Shukr, Shani, Aaj */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.5rem 0.5rem 0 0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {weeklyTrend.map((item: any, i: number) => {
            const isToday = i === weeklyTrend.length - 1;
            return (
              <div key={item.date} style={{ flex: 1, textAlign: 'center', color: isToday ? 'var(--primary)' : 'inherit' }}>
                {isToday ? (lang === 'hi' ? 'आज' : 'Today') : item.dayName}
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Doctor Performance Table */}
      <div className="editorial-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Doctor Outpatient Breakdown ({dateStr})</h2>
        <div className="table-wrapper">
          <table className="editorial-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>OPD Room</th>
                <th>Total Tokens</th>
                <th>Completed</th>
                <th>In Waiting</th>
              </tr>
            </thead>
            <tbody>
              {doctorBreakdown.map((doc: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{doc.doctor_name}</td>
                  <td>{doc.opd_room}</td>
                  <td>{doc.total_tokens || 0}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{doc.completed || 0}</td>
                  <td style={{ color: 'var(--status-waiting-fg)', fontWeight: 600 }}>{doc.waiting || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
