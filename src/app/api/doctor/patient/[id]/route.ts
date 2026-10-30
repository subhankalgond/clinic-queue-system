import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['doctor', 'receptionist', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // 1. Fetch Patient Profile
    const patientRes = await db.execute({
      sql: 'SELECT * FROM patients WHERE id = ? OR patient_uid = ? LIMIT 1;',
      args: [id, id],
    });

    if (patientRes.rows.length === 0) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }
    const patient = patientRes.rows[0];

    // 2. Fetch Consultations History
    const consultationsRes = await db.execute({
      sql: `
        SELECT 
          c.*,
          d.full_name as doctor_name,
          d.qualification as doctor_qualification,
          d.specialization as doctor_specialization
        FROM consultations c
        JOIN doctors d ON c.doctor_id = d.id
        WHERE c.patient_id = ?
        ORDER BY c.created_at DESC;
      `,
      args: [String(patient.id)],
    });

    // 3. Fetch Prescriptions for each consultation
    const consultations = [];
    for (const cons of consultationsRes.rows) {
      const presRes = await db.execute({
        sql: 'SELECT * FROM prescriptions WHERE consultation_id = ? ORDER BY created_at ASC;',
        args: [String(cons.id)],
      });
      consultations.push({
        ...cons,
        prescriptions: presRes.rows,
      });
    }

    // 4. Fetch Medical Documents
    const docsRes = await db.execute({
      sql: 'SELECT * FROM medical_documents WHERE patient_id = ? ORDER BY created_at DESC;',
      args: [String(patient.id)],
    });

    return NextResponse.json({
      patient,
      consultations,
      documents: docsRes.rows,
    });
  } catch (error) {
    console.error('get patient history error:', error);
    return NextResponse.json({ error: 'Failed to retrieve patient medical records' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const {
      doctor_id,
      symptoms,
      diagnosis,
      doctor_notes,
      advice,
      follow_up_date,
      prescriptions = [],
    } = await req.json();

    const db = getDb();
    const doctorId = doctor_id || auth.session?.doctorId || 'doc_01';

    // Verify patient
    const patRes = await db.execute({
      sql: 'SELECT id, full_name FROM patients WHERE id = ? OR patient_uid = ? LIMIT 1;',
      args: [id, id],
    });
    if (patRes.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    const realPatientId = String(patRes.rows[0].id);

    const consultationId = `cons_${crypto.randomUUID().slice(0, 8)}`;

    // Insert consultation
    await db.execute({
      sql: `INSERT INTO consultations 
            (id, patient_id, doctor_id, symptoms, diagnosis, doctor_notes, advice, follow_up_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        consultationId,
        realPatientId,
        doctorId,
        symptoms || '',
        diagnosis || '',
        doctor_notes || '',
        advice || '',
        follow_up_date || null,
      ],
    });

    // Insert prescribed medications
    if (Array.isArray(prescriptions)) {
      for (const p of prescriptions) {
        if (p.medicine_name?.trim()) {
          await db.execute({
            sql: `INSERT INTO prescriptions 
                  (id, consultation_id, patient_id, medicine_name, dosage, frequency, duration, instructions)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              `pres_${crypto.randomUUID().slice(0, 8)}`,
              consultationId,
              realPatientId,
              p.medicine_name.trim(),
              p.dosage || '1 tablet',
              p.frequency || 'Once daily',
              p.duration || '3 days',
              p.instructions || 'After meals',
            ],
          });
        }
      }
    }

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, clinic_id, user_id, user_role, action, target_type, target_id, details)
            VALUES (?, 'clinic_main_01', ?, 'doctor', 'RECORD_CONSULTATION', 'CONSULTATION', ?, ?);`,
      args: [
        `log_${Date.now()}`,
        auth.session?.userId || 'unknown',
        consultationId,
        `Recorded clinical diagnosis and consultation notes for patient ${patRes.rows[0].full_name}`,
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Consultation notes and prescription recorded securely.',
      consultation_id: consultationId,
    });
  } catch (error) {
    console.error('save consultation error:', error);
    return NextResponse.json({ error: 'Failed to save consultation records' }, { status: 500 });
  }
}
