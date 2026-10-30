import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctor_id') || 'doc_01';
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    // Get clinic info
    const clinicRes = await db.execute('SELECT name, tagline, address FROM clinics LIMIT 1;');
    const clinic = clinicRes.rows[0];

    // Get doctor info
    const docRes = await db.execute({
      sql: 'SELECT full_name, specialization, opd_room FROM doctors WHERE id = ? LIMIT 1;',
      args: [doctorId],
    });
    const doctor = docRes.rows[0];

    // Get currently called token (active)
    const activeRes = await db.execute({
      sql: `
        SELECT id, token_number, token_display, called_at
        FROM queue_tokens 
        WHERE doctor_id = ? AND appointment_date = ? AND status = 'called'
        ORDER BY called_at DESC
        LIMIT 1;
      `,
      args: [doctorId, dateStr],
    });
    const activeToken = activeRes.rows[0] || null;

    // Get upcoming next 3 tokens
    const nextRes = await db.execute({
      sql: `
        SELECT id, token_number, token_display, status
        FROM queue_tokens 
        WHERE doctor_id = ? 
          AND appointment_date = ? 
          AND status IN ('waiting', 'arrived')
        ORDER BY token_number ASC
        LIMIT 3;
      `,
      args: [doctorId, dateStr],
    });

    // Check if there was a call within last 20 seconds for audio announcement
    let announceToken = null;
    if (activeToken && activeToken.called_at) {
      const calledTime = new Date(String(activeToken.called_at)).getTime();
      const diffSec = (Date.now() - calledTime) / 1000;
      if (diffSec < 20) {
        announceToken = {
          number: activeToken.token_number,
          display: activeToken.token_display,
          room: doctor?.opd_room || 'Room 1',
        };
      }
    }

    // List of all active doctors for tabs/switching
    const doctorsList = await db.execute('SELECT id, full_name, specialization, opd_room FROM doctors WHERE is_active = 1;');

    return NextResponse.json({
      clinic,
      doctor,
      active_token: activeToken,
      upcoming_tokens: nextRes.rows,
      announce: announceToken,
      doctors: doctorsList.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TV queue error:', error);
    return NextResponse.json({ error: 'Failed to fetch TV queue display data' }, { status: 500 });
  }
}
