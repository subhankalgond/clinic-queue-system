import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['receptionist', 'doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { patient_name, mobile, doctor_id, gender = 'Male', age = 30 } = await req.json();

    if (!patient_name?.trim() || !mobile?.trim() || !doctor_id) {
      return NextResponse.json({ error: 'Patient name, mobile, and doctor are required' }, { status: 400 });
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    const db = getDb();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Verify Doctor
    const docRes = await db.execute({
      sql: 'SELECT id, full_name, opd_room, consultation_fee FROM doctors WHERE id = ?;',
      args: [doctor_id],
    });
    if (docRes.rows.length === 0) {
      return NextResponse.json({ error: 'Selected doctor is not available' }, { status: 404 });
    }
    const doctor = docRes.rows[0];

    // Find or create patient
    let patientId = '';
    let patientUid = '';
    const existingPatientRes = await db.execute({
      sql: 'SELECT id, patient_uid FROM patients WHERE mobile = ? LIMIT 1;',
      args: [cleanMobile],
    });

    if (existingPatientRes.rows.length > 0) {
      patientId = String(existingPatientRes.rows[0].id);
      patientUid = String(existingPatientRes.rows[0].patient_uid);
      await db.execute({
        sql: 'UPDATE patients SET full_name = ?, gender = ?, age = ? WHERE id = ?;',
        args: [patient_name.trim(), gender, Number(age) || 30, patientId],
      });
    } else {
      patientId = `pat_${crypto.randomUUID().slice(0, 8)}`;
      const totalPatRes = await db.execute('SELECT COUNT(*) as total FROM patients;');
      const patIndex = Number(totalPatRes.rows[0]?.total || 0) + 1;
      patientUid = `CL-${new Date().getFullYear()}-${String(patIndex).padStart(4, '0')}`;

      await db.execute({
        sql: `INSERT INTO patients (id, clinic_id, patient_uid, full_name, mobile, gender, age) 
              VALUES (?, 'clinic_main_01', ?, ?, ?, ?, ?);`,
        args: [patientId, patientUid, patient_name.trim(), cleanMobile, gender, Number(age) || 30],
      });
    }

    // Atomic Next Token Calculation for today and this doctor
    const maxTokenRes = await db.execute({
      sql: `SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token 
            FROM queue_tokens 
            WHERE doctor_id = ? AND appointment_date = ?;`,
      args: [doctor_id, todayStr],
    });
    const nextTokenNum = Number(maxTokenRes.rows[0]?.next_token || 1);
    const tokenDisplay = `#${nextTokenNum}`;
    const tokenId = `tok_${crypto.randomUUID().slice(0, 10)}`;

    // Walk-in patients are marked 'arrived' immediately upon issuance at the counter
    await db.execute({
      sql: `INSERT INTO queue_tokens 
            (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status)
            VALUES (?, 'clinic_main_01', ?, ?, ?, ?, 'walkin', ?, 'arrived');`,
      args: [tokenId, doctor_id, patientId, nextTokenNum, tokenDisplay, todayStr],
    });

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, clinic_id, user_id, user_role, action, target_type, target_id, details)
            VALUES (?, 'clinic_main_01', ?, ?, 'REGISTER_WALKIN', 'TOKEN', ?, ?);`,
      args: [
        `log_${Date.now()}`,
        auth.session?.userId || 'unknown',
        auth.session?.role || 'receptionist',
        tokenId,
        `Walk-in token ${tokenDisplay} created for patient ${patient_name} (Doctor: ${doctor.full_name})`,
      ],
    });

    // Clinic details for print slip
    const clinicRes = await db.execute('SELECT name, tagline, address, phone FROM clinics LIMIT 1;');
    const clinic = clinicRes.rows[0];

    return NextResponse.json({
      success: true,
      token: {
        id: tokenId,
        token_number: nextTokenNum,
        token_display: tokenDisplay,
        source: 'walkin',
        status: 'arrived',
        appointment_date: todayStr,
        patient_name: patient_name.trim(),
        patient_mobile: cleanMobile,
        patient_uid: patientUid,
        doctor_name: doctor.full_name,
        doctor_room: doctor.opd_room,
        consultation_fee: doctor.consultation_fee,
        issued_at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        clinic_name: clinic?.name || 'Aapka Clinic',
        clinic_address: clinic?.address || 'Main Road, Civil Lines',
        clinic_phone: clinic?.phone || '+91 98765 43210',
      },
    });
  } catch (error) {
    console.error('walk-in registration error:', error);
    return NextResponse.json({ error: 'Failed to register walk-in patient' }, { status: 500 });
  }
}
