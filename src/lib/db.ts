import { createClient, Client } from '@libsql/client';
import path from 'path';

let dbClient: Client | null = null;

export function getDb(): Client {
  if (!dbClient) {
    const dbPath = path.join(process.cwd(), 'clinic.db');
    dbClient = createClient({
      url: `file:${dbPath}`,
    });
  }
  return dbClient;
}

export async function initDatabase() {
  const db = getDb();

  // Create tables in sequence
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clinics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      currency TEXT DEFAULT 'INR',
      logo_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('malik', 'doctor', 'receptionist', 'patient')) NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      otp TEXT,
      otp_expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      clinic_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      qualification TEXT,
      specialization TEXT,
      opd_room TEXT NOT NULL,
      consultation_fee INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      patient_uid TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      gender TEXT DEFAULT 'Male',
      age INTEGER DEFAULT 30,
      blood_group TEXT,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS queue_tokens (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      token_number INTEGER NOT NULL,
      token_display TEXT NOT NULL,
      source TEXT CHECK(source IN ('online', 'walkin')) NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time_slot TEXT,
      status TEXT CHECK(status IN ('waiting', 'arrived', 'called', 'in_consultation', 'completed', 'skipped', 'no_show', 'cancelled')) NOT NULL DEFAULT 'waiting',
      called_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      UNIQUE(doctor_id, appointment_date, token_number)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      token_id TEXT UNIQUE,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      symptoms TEXT,
      diagnosis TEXT,
      doctor_notes TEXT,
      advice TEXT,
      follow_up_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      consultation_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      instructions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (consultation_id) REFERENCES consultations(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS medical_documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      consultation_id TEXT,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      id TEXT PRIMARY KEY,
      clinic_id TEXT UNIQUE NOT NULL,
      online_booking_enabled INTEGER DEFAULT 1,
      daily_token_limit INTEGER DEFAULT 60,
      opd_morning_timing TEXT DEFAULT '10:00 AM - 02:00 PM',
      opd_evening_timing TEXT DEFAULT '05:00 PM - 09:00 PM',
      notification_provider TEXT DEFAULT 'manual',
      sms_enabled INTEGER DEFAULT 0,
      whatsapp_enabled INTEGER DEFAULT 0,
      payment_enabled INTEGER DEFAULT 0,
      upi_id TEXT DEFAULT 'clinic@upi',
      language_default TEXT DEFAULT 'en',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      user_id TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indexes for performance and quick searches
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_tokens_lookup ON queue_tokens(doctor_id, appointment_date, status);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_tokens_patient ON queue_tokens(patient_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_patients_search ON patients(mobile, full_name, patient_uid);`);

  // Seed default clinic and staff if not present
  await seedDefaultData(db);
}

async function seedDefaultData(db: Client) {
  const existingClinic = await db.execute({
    sql: 'SELECT id FROM clinics LIMIT 1;',
    args: [],
  });

  if (existingClinic.rows.length === 0) {
    const clinicId = 'clinic_main_01';
    await db.execute({
      sql: `INSERT INTO clinics (id, name, tagline, address, phone, email, currency) 
            VALUES (?, ?, ?, ?, ?, ?, ?);`,
      args: [
        clinicId,
        'Aapka Clinic',
        'Care With Dignity & Modern Queue Management',
        'Main Road, Civil Lines, Sector 4, New Delhi',
        '+91 98765 43210',
        'contact@aapkaclinic.in',
        'INR',
      ],
    });

    // Settings
    await db.execute({
      sql: `INSERT INTO clinic_settings (id, clinic_id, online_booking_enabled, daily_token_limit, opd_morning_timing, opd_evening_timing) 
            VALUES (?, ?, 1, 60, '10:00 AM - 02:00 PM', '05:00 PM - 09:00 PM');`,
      args: ['settings_01', clinicId],
    });

    // Staff Users
    // 1. Malik
    await db.execute({
      sql: `INSERT INTO users (id, clinic_id, role, name, mobile, email) 
            VALUES ('user_malik', ?, 'malik', 'Dr. A. K. Sharma (Malik)', '9876543210', 'malik@aapkaclinic.in');`,
      args: [clinicId],
    });

    // 2. Doctor 1
    await db.execute({
      sql: `INSERT INTO users (id, clinic_id, role, name, mobile, email) 
            VALUES ('user_doc_1', ?, 'doctor', 'Dr. Farhan Akhtar', '9876543211', 'dr.farhan@aapkaclinic.in');`,
      args: [clinicId],
    });
    await db.execute({
      sql: `INSERT INTO doctors (id, user_id, clinic_id, full_name, qualification, specialization, opd_room, consultation_fee) 
            VALUES ('doc_01', 'user_doc_1', ?, 'Dr. Farhan Akhtar', 'MBBS, MD (Medicine)', 'General OPD', 'Room 101', 300);`,
      args: [clinicId],
    });

    // 3. Doctor 2
    await db.execute({
      sql: `INSERT INTO users (id, clinic_id, role, name, mobile, email) 
            VALUES ('user_doc_2', ?, 'doctor', 'Dr. Sunita Verma', '9876543212', 'dr.sunita@aapkaclinic.in');`,
      args: [clinicId],
    });
    await db.execute({
      sql: `INSERT INTO doctors (id, user_id, clinic_id, full_name, qualification, specialization, opd_room, consultation_fee) 
            VALUES ('doc_02', 'user_doc_2', ?, 'Dr. Sunita Verma', 'MBBS, DCH (Pediatrics)', 'Child Specialist', 'Room 102', 400);`,
      args: [clinicId],
    });

    // 4. Receptionist
    await db.execute({
      sql: `INSERT INTO users (id, clinic_id, role, name, mobile, email) 
            VALUES ('user_rec_1', ?, 'receptionist', 'Pooja (Reception Desk)', '9876543213', 'reception@aapkaclinic.in');`,
      args: [clinicId],
    });

    // Seed sample patients
    const patients = [
      { id: 'pat_01', uid: 'CL-2026-0001', name: 'Ramesh Chandra Verma', phone: '9811111111', gender: 'Male', age: 48, blood: 'B+' },
      { id: 'pat_02', uid: 'CL-2026-0002', name: 'Aarav Gupta', phone: '9822222222', gender: 'Male', age: 7, blood: 'O+' },
      { id: 'pat_03', uid: 'CL-2026-0003', name: 'Meena Sharma', phone: '9833333333', gender: 'Female', age: 34, blood: 'A+' },
      { id: 'pat_04', uid: 'CL-2026-0004', name: 'Zubair Khan', phone: '9844444444', gender: 'Male', age: 52, blood: 'AB+' },
      { id: 'pat_05', uid: 'CL-2026-0005', name: 'Priyanka Sen', phone: '9855555555', gender: 'Female', age: 29, blood: 'O-' },
      { id: 'pat_06', uid: 'CL-2026-0006', name: 'Harpreet Singh', phone: '9866666666', gender: 'Male', age: 41, blood: 'B+' },
    ];

    for (const p of patients) {
      await db.execute({
        sql: `INSERT INTO patients (id, clinic_id, patient_uid, full_name, mobile, gender, age, blood_group) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [p.id, clinicId, p.uid, p.name, p.phone, p.gender, p.age, p.blood],
      });
    }

    // Historical Consultations for Ramesh Chandra Verma (Screen 8 blueprint test data)
    await db.execute({
      sql: `INSERT INTO consultations (id, patient_id, doctor_id, symptoms, diagnosis, doctor_notes, advice, created_at)
            VALUES ('cons_01', 'pat_01', 'doc_01', 'Bukhar, Sardi, Badan dard (5 din se)', 'Acute Viral Upper Respiratory Infection', 'Vitals: BP 124/82, Pulse 78, Temp 100.8F. Chest clear.', 'Adequate fluid intake, rest, steam inhalation twice daily.', datetime('now', '-48 days'));`,
      args: [],
    });
    await db.execute({
      sql: `INSERT INTO prescriptions (id, consultation_id, patient_id, medicine_name, dosage, frequency, duration, instructions)
            VALUES ('pres_01', 'cons_01', 'pat_01', 'Tab Paracetamol 650mg', '1 tablet', 'TDS (After meals)', '3 days', 'If fever > 99.5F'),
                   ('pres_02', 'cons_01', 'pat_01', 'Tab Cetirizine 10mg', '1 tablet', 'Night', '5 days', 'May cause mild drowsiness');`,
      args: [],
    });

    await db.execute({
      sql: `INSERT INTO consultations (id, patient_id, doctor_id, symptoms, diagnosis, doctor_notes, advice, created_at)
            VALUES ('cons_02', 'pat_01', 'doc_01', 'Follow-up checkup. Fever subsided, mild throat scratchiness.', 'Post-viral convalescence', 'Throat congestion resolved. Patient feeling much better.', 'Continue warm salt water gargles. Light diet.', datetime('now', '-25 days'));`,
      args: [],
    });

    // Seed Today's Queue for Dr. Farhan Akhtar (doc_01)
    const todayStr = new Date().toISOString().slice(0, 10);

    // Tokens:
    // Token #11: completed
    // Token #12: called (currently serving, like in Blueprint Screen 7 & Screen 9)
    // Token #13: arrived / waiting
    // Token #14: waiting
    // Token #15: waiting
    // Token #16: waiting
    await db.execute({
      sql: `INSERT INTO queue_tokens (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status, called_at, completed_at)
            VALUES ('tok_11', ?, 'doc_01', 'pat_06', 11, '#11', 'online', ?, 'completed', datetime('now', '-40 minutes'), datetime('now', '-15 minutes'));`,
      args: [clinicId, todayStr],
    });

    await db.execute({
      sql: `INSERT INTO queue_tokens (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status, called_at)
            VALUES ('tok_12', ?, 'doc_01', 'pat_01', 12, '#12', 'online', ?, 'called', datetime('now', '-10 minutes'));`,
      args: [clinicId, todayStr],
    });

    await db.execute({
      sql: `INSERT INTO queue_tokens (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status)
            VALUES ('tok_13', ?, 'doc_01', 'pat_02', 13, '#13', 'walkin', ?, 'arrived');`,
      args: [clinicId, todayStr],
    });

    await db.execute({
      sql: `INSERT INTO queue_tokens (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status)
            VALUES ('tok_14', ?, 'doc_01', 'pat_03', 14, '#14', 'online', ?, 'waiting');`,
      args: [clinicId, todayStr],
    });

    await db.execute({
      sql: `INSERT INTO queue_tokens (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status)
            VALUES ('tok_15', ?, 'doc_01', 'pat_04', 15, '#15', 'online', ?, 'waiting');`,
      args: [clinicId, todayStr],
    });

    await db.execute({
      sql: `INSERT INTO queue_tokens (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status)
            VALUES ('tok_16', ?, 'doc_01', 'pat_05', 16, '#16', 'walkin', ?, 'waiting');`,
      args: [clinicId, todayStr],
    });

    // Audit log initialization
    await db.execute({
      sql: `INSERT INTO audit_logs (id, clinic_id, action, target_type, target_id, details)
            VALUES ('log_01', ?, 'SYSTEM_INIT', 'CLINIC', ?, 'Database tables initialized with default staff and queue roster.');`,
      args: [clinicId, clinicId],
    });
  }
}
