import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    await initDatabase();
    const db = getDb();

    const clinicRes = await db.execute('SELECT * FROM clinics LIMIT 1;');
    const settingsRes = await db.execute('SELECT * FROM clinic_settings LIMIT 1;');
    const doctorsRes = await db.execute(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.doctor_id = d.id AND qt.appointment_date = date('now')) as today_tokens
      FROM doctors d 
      WHERE d.is_active = 1 
      ORDER BY d.full_name ASC;
    `);

    return NextResponse.json({
      clinic: clinicRes.rows[0] || null,
      settings: settingsRes.rows[0] || null,
      doctors: doctorsRes.rows,
    });
  } catch (error) {
    console.error('get booking metadata error:', error);
    return NextResponse.json({ error: 'Failed to load clinic information' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const { doctor_id, patient_name, mobile, gender = 'Male', age = 30, day = 'today' } = body;

    // Validations
    if (!doctor_id || !patient_name?.trim() || !mobile?.trim()) {
      return NextResponse.json(
        { error: 'Doctor selection, Patient name, and Mobile number are required.' },
        { status: 400 }
      );
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 1. Check clinic settings
    const settingsRes = await db.execute('SELECT * FROM clinic_settings LIMIT 1;');
    const settings = settingsRes.rows[0];
    if (settings && !settings.online_booking_enabled) {
      return NextResponse.json(
        { error: 'Online token booking is currently disabled by the clinic administration.' },
        { status: 403 }
      );
    }

    // Determine target appointment date
    const targetDate = new Date();
    if (day === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const appointmentDate = targetDate.toISOString().slice(0, 10);

    // 2. Check token limit for doctor
    const limit = Number(settings?.daily_token_limit || 60);
    const countRes = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM queue_tokens WHERE doctor_id = ? AND appointment_date = ?;',
      args: [doctor_id, appointmentDate],
    });
    const currentTokens = Number(countRes.rows[0]?.count || 0);
    if (currentTokens >= limit) {
      return NextResponse.json(
        { error: `Daily token limit (${limit} tokens) reached for this doctor on ${appointmentDate}.` },
        { status: 409 }
      );
    }

    // 3. Find or create patient record (avoid duplicate patients)
    let patientId = '';
    let patientUid = '';
    const existingPatientRes = await db.execute({
      sql: 'SELECT id, patient_uid FROM patients WHERE mobile = ? LIMIT 1;',
      args: [cleanMobile],
    });

    if (existingPatientRes.rows.length > 0) {
      patientId = String(existingPatientRes.rows[0].id);
      patientUid = String(existingPatientRes.rows[0].patient_uid);
      // Update patient name if changed
      await db.execute({
        sql: 'UPDATE patients SET full_name = ?, gender = ?, age = ? WHERE id = ?;',
        args: [patient_name.trim(), gender, Number(age) || 30, patientId],
      });
    } else {
      patientId = `pat_${crypto.randomUUID().slice(0, 8)}`;
      // Generate next patient UID: CL-YYYY-XXXX
      const totalPatRes = await db.execute('SELECT COUNT(*) as total FROM patients;');
      const patIndex = Number(totalPatRes.rows[0]?.total || 0) + 1;
      patientUid = `CL-${targetDate.getFullYear()}-${String(patIndex).padStart(4, '0')}`;

      await db.execute({
        sql: `INSERT INTO patients (id, clinic_id, patient_uid, full_name, mobile, gender, age) 
              VALUES (?, 'clinic_main_01', ?, ?, ?, ?, ?);`,
        args: [patientId, patientUid, patient_name.trim(), cleanMobile, gender, Number(age) || 30],
      });
    }

    // 4. Generate Next Atomic Token Number for doctor & date
    const maxTokenRes = await db.execute({
      sql: `SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token 
            FROM queue_tokens 
            WHERE doctor_id = ? AND appointment_date = ?;`,
      args: [doctor_id, appointmentDate],
    });
    const nextTokenNum = Number(maxTokenRes.rows[0]?.next_token || 1);
    const tokenDisplay = `#${nextTokenNum}`;
    const tokenId = `tok_${crypto.randomUUID().slice(0, 10)}`;

    // 5. Insert queue token
    await db.execute({
      sql: `INSERT INTO queue_tokens 
            (id, clinic_id, doctor_id, patient_id, token_number, token_display, source, appointment_date, status)
            VALUES (?, 'clinic_main_01', ?, ?, ?, ?, 'online', ?, 'waiting');`,
      args: [tokenId, doctor_id, patientId, nextTokenNum, tokenDisplay, appointmentDate],
    });

    // 6. Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, clinic_id, action, target_type, target_id, details)
            VALUES (?, 'clinic_main_01', 'BOOK_TOKEN_ONLINE', 'TOKEN', ?, ?);`,
      args: [
        `log_${crypto.randomUUID().slice(0, 8)}`,
        tokenId,
        `Token ${tokenDisplay} booked online for patient ${patient_name} (Phone: ${cleanMobile})`,
      ],
    });

    // Estimate waiting time
    // Calculate how many patients are ahead
    const activeTokenRes = await db.execute({
      sql: `SELECT token_number FROM queue_tokens 
            WHERE doctor_id = ? AND appointment_date = ? AND status = 'called' 
            LIMIT 1;`,
      args: [doctor_id, appointmentDate],
    });
    const currentActiveTokenNum = activeTokenRes.rows.length > 0 ? Number(activeTokenRes.rows[0].token_number) : 0;
    const ahead = Math.max(0, nextTokenNum - currentActiveTokenNum - 1);
    const estimatedMinutes = Math.max(10, ahead * 10);

    return NextResponse.json({
      success: true,
      token: {
        id: tokenId,
        token_number: nextTokenNum,
        token_display: tokenDisplay,
        appointment_date: appointmentDate,
        patient_name: patient_name.trim(),
        patient_uid: patientUid,
        patients_ahead: ahead,
        estimated_minutes: estimatedMinutes,
        estimated_time: `~ ${estimatedMinutes} mins`,
      },
    });
  } catch (error) {
    console.error('booking creation error:', error);
    return NextResponse.json({ error: 'Failed to generate token. Please try again.' }, { status: 500 });
  }
}
