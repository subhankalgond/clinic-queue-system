'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SettingsIcon, CheckCircleIcon, AlertCircleIcon, StethoscopeIcon } from '@/components/EditorialIcons';
import { translations, Language } from '@/lib/i18n';

export default function ClinicSettingsPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [settings, setSettings] = useState<any>({
    online_booking_enabled: 1,
    daily_token_limit: 60,
    opd_morning_timing: '10:00 AM - 02:00 PM',
    opd_evening_timing: '05:00 PM - 09:00 PM',
    sms_enabled: 0,
    whatsapp_enabled: 0,
  });

  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add doctor form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocQual, setNewDocQual] = useState('MBBS, MD');
  const [newDocSpec, setNewDocSpec] = useState('General Medicine');
  const [newDocRoom, setNewDocRoom] = useState('Room 103');
  const [newDocFee, setNewDocFee] = useState<number | string>(350);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/owner/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.settings) setSettings(json.settings);
        if (json.doctors) setDoctors(json.doctors);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to load clinic settings');
      }
    } catch {
      setErrorMsg('Error loading settings.');
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

    fetchSettings();

    return () => window.removeEventListener('languageChanged', onLangChange);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          ...settings,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Settings saved successfully');
      } else {
        setErrorMsg(data.error || 'Failed to save settings');
      }
    } catch {
      setErrorMsg('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocRoom.trim()) return;

    try {
      const res = await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_doctor',
          full_name: newDocName.trim(),
          qualification: newDocQual.trim(),
          specialization: newDocSpec.trim(),
          opd_room: newDocRoom.trim(),
          consultation_fee: Number(newDocFee) || 0,
        }),
      });

      if (res.ok) {
        setShowAddDoc(false);
        setNewDocName('');
        await fetchSettings();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add doctor');
      }
    } catch {
      alert('Error adding doctor');
    }
  };

  const handleToggleDoctor = async (doctorId: string, currentActive: number) => {
    try {
      const res = await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_doctor',
          doctor_id: doctorId,
          is_active: currentActive ? 0 : 1,
        }),
      });
      if (res.ok) {
        await fetchSettings();
      }
    } catch {
      alert('Error updating doctor availability');
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p>Loading clinic rules and configuration...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '780px' }}>
      {/* Editorial Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="kicker">Screen 11 &middot; {lang === 'hi' ? 'क्लिनिक नियम' : 'Clinic Configuration'}</span>
          <h1 style={{ fontSize: '2rem' }}>{t.clinicSettings}</h1>
          <p style={{ fontSize: '0.875rem' }}>
            {lang === 'hi'
              ? 'क्लिनिक के रूल्स आप खुद सेट करो, डेवलपर की ज़रूरत नहीं।'
              : 'Direct control over online booking, token caps, OPD timing shifts, and medical staff.'}
          </p>
        </div>
        <Link href="/owner/reports" className="btn btn-secondary">
          &larr; {t.dailyReports}
        </Link>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--status-active-bg)',
            color: 'var(--status-active-fg)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircleIcon size={18} color="var(--primary)" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-fg)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Main Settings Form (Blueprint Screen 11) */}
      <form onSubmit={handleSaveSettings}>
        <div className="editorial-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Operational Rules</h2>

          {/* Online Token Booking Switch */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 0',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{t.onlineBookingSwitch}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {t.onlineBookingDesc}
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={Boolean(settings.online_booking_enabled)}
                onChange={(e) =>
                  setSettings({ ...settings, online_booking_enabled: e.target.checked ? 1 : 0 })
                }
                style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 700, color: settings.online_booking_enabled ? 'var(--primary)' : 'var(--text-muted)' }}>
                {settings.online_booking_enabled ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          {/* Daily Token Limit */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 0',
              borderBottom: '1px solid var(--border-hairline)',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{t.dailyLimitLabel}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Booking closes automatically when this count is reached.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                min="1"
                max="500"
                className="form-control"
                style={{ width: '100px', textAlign: 'center', fontWeight: 700 }}
                value={settings.daily_token_limit}
                onChange={(e) => setSettings({ ...settings, daily_token_limit: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>/ din (day)</span>
            </div>
          </div>

          {/* OPD Timings */}
          <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
              OPD Timings (Schedule Shifts)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">{t.opdTimingsMorning}</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.opd_morning_timing}
                  onChange={(e) => setSettings({ ...settings, opd_morning_timing: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">{t.opdTimingsEvening}</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.opd_evening_timing}
                  onChange={(e) => setSettings({ ...settings, opd_evening_timing: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? 'SAVING...' : t.saveSettings}
            </button>
          </div>
        </div>
      </form>

      {/* Doctor Management (Blueprint Screen 11: Doctors 2, add/remove) */}
      <div className="editorial-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>{t.manageDoctors}</h2>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Active doctors currently receiving outpatient tokens.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDoc(!showAddDoc)}
            className="btn btn-sm btn-primary"
          >
            + {t.addDoctor}
          </button>
        </div>

        {/* Add Doctor Drawer */}
        {showAddDoc && (
          <form
            onSubmit={handleAddDoctor}
            style={{
              backgroundColor: 'var(--bg-subtle)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>New Doctor Registration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Doctor Name (e.g. Dr. Rajesh Kumar)"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                required
              />
              <input
                type="text"
                className="form-control"
                placeholder="Qualifications (e.g. MBBS, MS)"
                value={newDocQual}
                onChange={(e) => setNewDocQual(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Specialization (e.g. Orthopedics)"
                value={newDocSpec}
                onChange={(e) => setNewDocSpec(e.target.value)}
              />
              <input
                type="text"
                className="form-control"
                placeholder="OPD Room (e.g. Room 104)"
                value={newDocRoom}
                onChange={(e) => setNewDocRoom(e.target.value)}
                required
              />
              <input
                type="number"
                className="form-control"
                placeholder="Fee (₹)"
                value={newDocFee}
                onChange={(e) => setNewDocFee(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary btn-sm">
                Save Doctor
              </button>
              <button
                type="button"
                onClick={() => setShowAddDoc(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Existing Doctors List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {doctors.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: 'var(--bg-page)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: doc.is_active ? 'var(--primary-light)' : 'var(--bg-subtle)',
                    color: doc.is_active ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StethoscopeIcon size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{doc.full_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {doc.qualification} &bull; {doc.specialization} &bull; Room: <strong>{doc.opd_room}</strong> &bull; Fee: ₹{doc.consultation_fee}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleDoctor(doc.id, doc.is_active)}
                className={`btn btn-sm ${doc.is_active ? 'btn-secondary' : 'btn-primary'}`}
              >
                {doc.is_active ? 'Set Inactive' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
