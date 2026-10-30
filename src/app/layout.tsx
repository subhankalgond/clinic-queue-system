import type { Metadata, Viewport } from "next";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0D4E3C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Aapka Clinic — Professional Queue & Consultation System",
  description: "Real-time queue tracking, token booking, and clinical record management for modern outpatient healthcare.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${ibmPlexSans.variable}`}>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Suspense fallback={<div style={{ height: "60px", backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-hairline)" }} />}>
          <Navbar />
        </Suspense>
        <main style={{ flex: 1 }}>{children}</main>
        <footer
          style={{
            borderTop: "1px solid var(--border-hairline)",
            backgroundColor: "var(--bg-subtle)",
            padding: "1.5rem 1rem",
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
          }}
        >
          <div
            style={{
              maxWidth: "1140px",
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <strong>Aapka Clinic</strong> &copy; 2026 &middot; Queue Management System
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Main Road, Civil Lines, Sector 4, New Delhi &middot; Support: +91 98765 43210
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.25rem" }}>
              <a href="/privacy" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                Privacy Policy
              </a>
              <a href="/terms" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                Terms of Service
              </a>
              <a href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                Staff Portal
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
