'use client';

import React from 'react';
import { PrinterIcon } from './EditorialIcons';

interface PrintSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: {
    token_display: string;
    token_number?: number;
    patient_name: string;
    patient_uid?: string;
    patient_mobile?: string;
    doctor_name: string;
    doctor_room?: string;
    appointment_date: string;
    issued_at?: string;
    clinic_name?: string;
    clinic_address?: string;
    clinic_phone?: string;
    consultation_fee?: number;
  } | null;
}

export default function PrintSlipModal({ isOpen, onClose, tokenData }: PrintSlipModalProps) {
  if (!isOpen || !tokenData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(26, 29, 32, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          maxWidth: '380px',
          width: '100%',
          padding: '1.5rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Thermal Receipt Container */}
        <div
          id="printable-slip"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            color: '#111827',
            border: '1px dashed #9CA3AF',
            padding: '1.25rem',
            backgroundColor: '#FCFAF7',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.125rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tokenData.clinic_name || 'AAPKA CLINIC'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4B5563', marginBottom: '0.5rem' }}>
            {tokenData.clinic_address || 'Civil Lines, Sector 4, New Delhi'}
            <br />
            Tel: {tokenData.clinic_phone || '+91 98765 43210'}
          </div>

          <div style={{ borderTop: '1px dashed #9CA3AF', margin: '0.5rem 0' }} />

          <div style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            OPD CONSULTATION TOKEN
          </div>

          <div
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: '0.5rem 0',
              color: '#0D4E3C',
            }}
          >
            {tokenData.token_display}
          </div>

          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {tokenData.doctor_name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4B5563', marginBottom: '0.5rem' }}>
            {tokenData.doctor_room ? `Room: ${tokenData.doctor_room}` : 'OPD Consultation'}
          </div>

          <div style={{ borderTop: '1px dashed #9CA3AF', margin: '0.5rem 0' }} />

          <div style={{ textAlign: 'left', fontSize: '0.8125rem', lineHeight: 1.6 }}>
            <div>
              <strong>Patient:</strong> {tokenData.patient_name}
            </div>
            {tokenData.patient_uid && (
              <div>
                <strong>ID:</strong> {tokenData.patient_uid}
              </div>
            )}
            <div>
              <strong>Date:</strong> {tokenData.appointment_date}
            </div>
            <div>
              <strong>Time:</strong> {tokenData.issued_at || new Date().toLocaleTimeString()}
            </div>
            {tokenData.consultation_fee !== undefined && (
              <div>
                <strong>Fee:</strong> ₹{tokenData.consultation_fee} (Paid)
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #9CA3AF', margin: '0.75rem 0 0.5rem 0' }} />

          <div style={{ fontSize: '0.6875rem', color: '#4B5563' }}>
            Track live queue on phone: <strong>aapkaclinic.in</strong>
            <br />
            Please take seat in the waiting hall.
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <PrinterIcon size={18} /> Print Slip
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ minWidth: '80px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
