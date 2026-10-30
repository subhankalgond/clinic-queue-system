export type UserRole = 'malik' | 'doctor' | 'receptionist' | 'patient';

export type TokenStatus =
  | 'waiting'
  | 'arrived'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'skipped'
  | 'no_show'
  | 'cancelled';

export interface Clinic {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  logo_url: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  clinic_id: string;
  full_name: string;
  qualification: string;
  specialization: string;
  opd_room: string;
  consultation_fee: number;
  is_active: number;
  mobile?: string;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  patient_uid: string;
  full_name: string;
  mobile: string;
  gender: string;
  age: number;
  blood_group?: string;
  address?: string;
  visit_count?: number;
  last_visit_date?: string;
  created_at: string;
}

export interface QueueToken {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  token_number: number;
  token_display: string;
  source: 'online' | 'walkin';
  appointment_date: string;
  appointment_time_slot: string;
  status: TokenStatus;
  called_at?: string;
  completed_at?: string;
  created_at: string;
  // Join fields
  patient_name?: string;
  patient_mobile?: string;
  patient_uid?: string;
  doctor_name?: string;
  doctor_room?: string;
  doctor_specialization?: string;
}

export interface Consultation {
  id: string;
  token_id: string;
  patient_id: string;
  doctor_id: string;
  symptoms: string;
  diagnosis: string;
  doctor_notes: string;
  advice: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  // Join fields
  doctor_name?: string;
  prescriptions?: Prescription[];
}

export interface Prescription {
  id: string;
  consultation_id: string;
  patient_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  created_at: string;
}

export interface ClinicSettings {
  id: string;
  clinic_id: string;
  online_booking_enabled: number;
  daily_token_limit: number;
  opd_morning_timing: string;
  opd_evening_timing: string;
  notification_provider: string;
  sms_enabled: number;
  whatsapp_enabled: number;
  payment_enabled: number;
  upi_id: string;
  language_default: 'en' | 'hi';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  clinic_id: string;
  user_id?: string;
  user_role?: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}
