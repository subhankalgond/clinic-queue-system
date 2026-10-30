'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { StethoscopeIcon, TvIcon, UsersIcon, SearchIcon, SettingsIcon, LogOutIcon } from './EditorialIcons';

interface UserSession {
  name: string;
  role: string;
  mobile: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Read language and session on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('clinic_lang') as 'en' | 'hi';
    if (savedLang) setLang(savedLang);

    // Fetch session
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session) {
          setSession(data.session);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    localStorage.setItem('clinic_lang', nextLang);
    window.dispatchEvent(new Event('languageChanged'));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
    router.push('/login');
    router.refresh();
  };

  const isTvPage = pathname === '/tv';
  if (isTvPage) {
    // Hide standard navbar on full-screen TV view
    return null;
  }

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-hairline)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1140px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StethoscopeIcon size={22} />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-editorial)',
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                display: 'block',
              }}
            >
              Aapka Clinic
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Queue System
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          className="hide-on-mobile"
        >
          {/* Public Patient links */}
          <Link
            href="/"
            className={`btn btn-sm ${pathname === '/' ? 'btn-primary' : 'btn-secondary'}`}
          >
            {lang === 'hi' ? 'टोकन बुकिंग' : 'Book Token'}
          </Link>

          <Link
            href="/tv"
            target="_blank"
            className="btn btn-sm btn-secondary"
            title="Waiting Room TV Screen"
          >
            <TvIcon size={16} />
            {lang === 'hi' ? 'टीवी स्क्रीन' : 'TV Display'}
          </Link>

          {/* Role-based navigation */}
          {session?.role === 'receptionist' && (
            <>
              <Link
                href="/reception"
                className={`btn btn-sm ${pathname === '/reception' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <UsersIcon size={16} />
                {lang === 'hi' ? 'आज की लिस्ट' : "Today's Queue"}
              </Link>
              <Link
                href="/reception/walk-in"
                className={`btn btn-sm ${pathname === '/reception/walk-in' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {lang === 'hi' ? 'वॉक-इन' : 'Walk-in Entry'}
              </Link>
              <Link
                href="/reception/search"
                className={`btn btn-sm ${pathname === '/reception/search' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <SearchIcon size={16} />
                {lang === 'hi' ? 'मरीज़ खोज' : 'Search'}
              </Link>
            </>
          )}

          {session?.role === 'doctor' && (
            <>
              <Link
                href="/doctor"
                className={`btn btn-sm ${pathname === '/doctor' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <StethoscopeIcon size={16} />
                {lang === 'hi' ? 'डॉक्टर पैनल' : 'Doctor Panel'}
              </Link>
              <Link
                href="/reception/search"
                className={`btn btn-sm ${pathname === '/reception/search' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <SearchIcon size={16} />
                {lang === 'hi' ? 'मरीज़ हिस्ट्री' : 'Patient History'}
              </Link>
            </>
          )}

          {session?.role === 'malik' && (
            <>
              <Link
                href="/owner/reports"
                className={`btn btn-sm ${pathname === '/owner/reports' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {lang === 'hi' ? 'रिपोर्ट' : 'Reports'}
              </Link>
              <Link
                href="/owner/settings"
                className={`btn btn-sm ${pathname === '/owner/settings' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <SettingsIcon size={16} />
                {lang === 'hi' ? 'सेटिंग्स' : 'Settings'}
              </Link>
              <Link
                href="/reception"
                className="btn btn-sm btn-secondary"
              >
                {lang === 'hi' ? 'रिसेप्शन' : 'Reception'}
              </Link>
              <Link
                href="/doctor"
                className="btn btn-sm btn-secondary"
              >
                {lang === 'hi' ? 'डॉक्टर' : 'Doctor'}
              </Link>
            </>
          )}

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            className="btn btn-sm btn-secondary"
            style={{ fontWeight: 600, minWidth: '48px' }}
            title="Switch Language (English / हिंदी)"
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>

          {/* User profile / Login */}
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.25rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                {session.name.split(' ')[0]} ({session.role})
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-sm btn-secondary"
                title="Log Out"
                style={{ padding: '0.375rem 0.5rem' }}
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className={`btn btn-sm ${pathname === '/login' ? 'btn-primary' : 'btn-secondary'}`}
            >
              {lang === 'hi' ? 'स्टाफ लॉगिन' : 'Staff Login'}
            </Link>
          )}
        </nav>

        {/* Mobile Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="show-on-mobile">
          <button
            type="button"
            onClick={toggleLang}
            className="btn btn-sm btn-secondary"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
          >
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-sm btn-secondary"
            aria-label="Toggle navigation menu"
            style={{ padding: '0.4rem 0.65rem' }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-hairline)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
        >
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`btn btn-full ${pathname === '/' ? 'btn-primary' : 'btn-secondary'}`}
          >
            {lang === 'hi' ? 'टोकन बुकिंग' : 'Book Token'}
          </Link>
          <Link
            href="/tv"
            target="_blank"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-full btn-secondary"
          >
            <TvIcon size={16} />
            {lang === 'hi' ? 'टीवी स्क्रीन (प्रतीक्षालय)' : 'TV Display (Waiting Room)'}
          </Link>

          {/* Quick Staff Jump */}
          <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
            <span className="kicker" style={{ marginBottom: '0.5rem' }}>Staff Sections</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <Link
                href="/reception"
                onClick={() => setMobileMenuOpen(false)}
                className={`btn btn-sm ${pathname.startsWith('/reception') ? 'btn-primary' : 'btn-secondary'}`}
              >
                Reception
              </Link>
              <Link
                href="/doctor"
                onClick={() => setMobileMenuOpen(false)}
                className={`btn btn-sm ${pathname.startsWith('/doctor') ? 'btn-primary' : 'btn-secondary'}`}
              >
                Doctor Panel
              </Link>
              <Link
                href="/owner/reports"
                onClick={() => setMobileMenuOpen(false)}
                className={`btn btn-sm ${pathname.startsWith('/owner') ? 'btn-primary' : 'btn-secondary'}`}
              >
                Owner Reports
              </Link>
              <Link
                href="/owner/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-sm btn-secondary"
              >
                Settings
              </Link>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '0.5rem' }}>
            {session ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem' }}>
                  {session.name} ({session.role})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="btn btn-sm btn-danger"
                >
                  <LogOutIcon size={14} /> Log Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-full btn-secondary"
              >
                {lang === 'hi' ? 'स्टाफ लॉगिन' : 'Staff Login'}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
