import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDb();
    const clinicRes = await db.execute('SELECT * FROM clinics LIMIT 1;');
    const settingsRes = await db.execute('SELECT * FROM clinic_settings LIMIT 1;');
    const doctorsRes = await db.execute('SELECT * FROM doctors ORDER BY created_at ASC;');

    return NextResponse.json({
      clinic: clinicRes.rows[0],
      settings: settingsRes.rows[0],
      doctors: doctorsRes.rows,
    });
  } catch (error) {
    console.error('get settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const db = getDb();

    if (action === 'update_settings') {
      const {
        online_booking_enabled,
        daily_token_limit,
        opd_morning_timing,
        opd_evening_timing,
        sms_enabled,
        whatsapp_enabled,
      } = body;

      await db.execute({
        sql: `
          UPDATE clinic_settings 
          SET online_booking_enabled = ?,
              daily_token_limit = ?,
              opd_morning_timing = ?,
              opd_evening_timing = ?,
              sms_enabled = ?,
              whatsapp_enabled = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE clinic_id = 'clinic_main_01';
        `,
        args: [
          online_booking_enabled ? 1 : 0,
          Number(daily_token_limit) || 60,
          opd_morning_timing || '10:00 AM - 02:00 PM',
          opd_evening_timing || '05:00 PM - 09:00 PM',
          sms_enabled ? 1 : 0,
          whatsapp_enabled ? 1 : 0,
        ],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, clinic_id, user_id, user_role, action, target_type, target_id, details)
              VALUES (?, 'clinic_main_01', ?, 'malik', 'UPDATE_SETTINGS', 'SETTINGS', 'clinic_main_01', 'Updated clinic rules and OPD timings');`,
        args: [`log_${Date.now()}`, auth.session?.userId || 'unknown'],
      });

      return NextResponse.json({ success: true, message: 'Clinic settings updated successfully.' });
    }

    if (action === 'add_doctor') {
      const { full_name, qualification, specialization, opd_room, consultation_fee } = body;
      if (!full_name || !opd_room) {
        return NextResponse.json({ error: 'Doctor name and OPD room are required' }, { status: 400 });
      }

      const docId = `doc_${crypto.randomUUID().slice(0, 8)}`;
      await db.execute({
        sql: `
          INSERT INTO doctors 
          (id, clinic_id, full_name, qualification, specialization, opd_room, consultation_fee, is_active)
          VALUES (?, 'clinic_main_01', ?, ?, ?, ?, ?, 1);
        `,
        args: [
          docId,
          full_name.trim(),
          qualification?.trim() || 'MBBS',
          specialization?.trim() || 'General OPD',
          opd_room.trim(),
          Number(consultation_fee) || 0,
        ],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, clinic_id, user_id, user_role, action, target_type, target_id, details)
              VALUES (?, 'clinic_main_01', ?, 'malik', 'ADD_DOCTOR', 'DOCTOR', ?, ?);`,
        args: [
          `log_${Date.now()}`,
          auth.session?.userId || 'unknown',
          docId,
          `Added doctor ${full_name} (${opd_room})`,
        ],
      });

      return NextResponse.json({ success: true, message: 'Doctor added successfully.' });
    }

    if (action === 'toggle_doctor') {
      const { doctor_id, is_active } = body;
      await db.execute({
        sql: 'UPDATE doctors SET is_active = ? WHERE id = ?;',
        args: [is_active ? 1 : 0, doctor_id],
      });
      return NextResponse.json({ success: true, message: 'Doctor availability status updated.' });
    }

    return NextResponse.json({ error: 'Invalid settings action' }, { status: 400 });
  } catch (error) {
    console.error('settings update error:', error);
    return NextResponse.json({ error: 'Failed to update clinic settings' }, { status: 500 });
  }
}
