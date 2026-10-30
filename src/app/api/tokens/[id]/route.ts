import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const db = getDb();

    const tokenRes = await db.execute({
      sql: `
        SELECT 
          qt.*,
          p.full_name as patient_name,
          p.mobile as patient_mobile,
          p.patient_uid,
          d.full_name as doctor_name,
          d.qualification as doctor_qualification,
          d.specialization as doctor_specialization,
          d.opd_room as doctor_room,
          c.name as clinic_name,
          c.address as clinic_address,
          c.phone as clinic_phone
        FROM queue_tokens qt
        JOIN patients p ON qt.patient_id = p.id
        JOIN doctors d ON qt.doctor_id = d.id
        JOIN clinics c ON qt.clinic_id = c.id
        WHERE qt.id = ? OR qt.token_display = ?
        LIMIT 1;
      `,
      args: [id, id],
    });

    if (tokenRes.rows.length === 0) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const token = tokenRes.rows[0];

    // Find currently serving token for this doctor & appointment_date
    const servingRes = await db.execute({
      sql: `
        SELECT token_number, token_display 
        FROM queue_tokens 
        WHERE doctor_id = ? AND appointment_date = ? AND status = 'called'
        LIMIT 1;
      `,
      args: [String(token.doctor_id), String(token.appointment_date)],
    });

    const currentlyServing = servingRes.rows.length > 0 ? Number(servingRes.rows[0].token_number) : 0;
    const currentlyServingDisplay = servingRes.rows.length > 0 ? String(servingRes.rows[0].token_display) : 'Waiting';

    // Count how many patients ahead of this token
    const aheadRes = await db.execute({
      sql: `
        SELECT COUNT(*) as ahead_count 
        FROM queue_tokens 
        WHERE doctor_id = ? 
          AND appointment_date = ? 
          AND token_number < ?
          AND status IN ('waiting', 'arrived', 'called');
      `,
      args: [String(token.doctor_id), String(token.appointment_date), Number(token.token_number)],
    });

    const aheadCount = Number(aheadRes.rows[0]?.ahead_count || 0);
    const estimatedMinutes = Math.max(5, aheadCount * 8);

    return NextResponse.json({
      token,
      queue_state: {
        currently_serving_number: currentlyServing,
        currently_serving_display: currentlyServingDisplay,
        patients_ahead: aheadCount,
        estimated_minutes: estimatedMinutes,
        estimated_time: `~ ${estimatedMinutes} min`,
      },
    });
  } catch (error) {
    console.error('token fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve token details' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const { action } = await req.json();

    if (action === 'cancel') {
      const db = getDb();

      // Check current status
      const existingRes = await db.execute({
        sql: 'SELECT id, status, token_display FROM queue_tokens WHERE id = ?;',
        args: [id],
      });

      if (existingRes.rows.length === 0) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }

      const currentStatus = String(existingRes.rows[0].status);
      if (currentStatus === 'completed') {
        return NextResponse.json({ error: 'Cannot cancel an already completed consultation.' }, { status: 400 });
      }

      await db.execute({
        sql: `UPDATE queue_tokens SET status = 'cancelled' WHERE id = ?;`,
        args: [id],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, clinic_id, action, target_type, target_id, details)
              VALUES (?, 'clinic_main_01', 'CANCEL_TOKEN', 'TOKEN', ?, 'Token cancelled by patient/reception');`,
        args: [`log_${Date.now()}`, id],
      });

      return NextResponse.json({ success: true, message: 'Token cancelled successfully' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('token action error:', error);
    return NextResponse.json({ error: 'Failed to process token action' }, { status: 500 });
  }
}
