import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    // Allow receptionist, doctor, malik
    const auth = await authenticateRequest(req, ['receptionist', 'doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctor_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const db = getDb();

    let query = `
      SELECT 
        qt.*,
        p.full_name as patient_name,
        p.mobile as patient_mobile,
        p.patient_uid,
        p.gender as patient_gender,
        p.age as patient_age,
        d.full_name as doctor_name,
        d.opd_room as doctor_room
      FROM queue_tokens qt
      JOIN patients p ON qt.patient_id = p.id
      JOIN doctors d ON qt.doctor_id = d.id
      WHERE qt.appointment_date = ?
    `;
    const params: (string | number)[] = [dateStr];

    if (doctorId && doctorId !== 'all') {
      query += ` AND qt.doctor_id = ?`;
      params.push(doctorId);
    }

    if (status && status !== 'all') {
      query += ` AND qt.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (p.full_name LIKE ? OR p.mobile LIKE ? OR qt.token_display LIKE ? OR p.patient_uid LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY qt.token_number ASC;`;

    const tokensRes = await db.execute({ sql: query, args: params });

    // Aggregate counts for summary pills
    const statsRes = await db.execute({
      sql: `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
          SUM(CASE WHEN status = 'arrived' THEN 1 ELSE 0 END) as arrived,
          SUM(CASE WHEN status IN ('called', 'in_consultation') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
          SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
        FROM queue_tokens
        WHERE appointment_date = ?;
      `,
      args: [dateStr],
    });

    const doctorsList = await db.execute('SELECT id, full_name, specialization, opd_room FROM doctors WHERE is_active = 1;');

    return NextResponse.json({
      tokens: tokensRes.rows,
      stats: statsRes.rows[0] || {},
      doctors: doctorsList.rows,
      date: dateStr,
    });
  } catch (error) {
    console.error('reception tokens error:', error);
    return NextResponse.json({ error: 'Failed to fetch reception queue tokens' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['receptionist', 'doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { tokenId, status } = await req.json();

    const validStatuses = ['waiting', 'arrived', 'called', 'in_consultation', 'completed', 'skipped', 'no_show', 'cancelled'];
    if (!tokenId || !status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid token ID or status provided' }, { status: 400 });
    }

    const db = getDb();

    let extraSet = '';
    const updateArgs: (string | number)[] = [status];

    if (status === 'called') {
      extraSet = ', called_at = CURRENT_TIMESTAMP';
    } else if (status === 'completed') {
      extraSet = ', completed_at = CURRENT_TIMESTAMP';
    }

    updateArgs.push(tokenId);

    await db.execute({
      sql: `UPDATE queue_tokens SET status = ? ${extraSet} WHERE id = ?;`,
      args: updateArgs,
    });

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, clinic_id, user_id, user_role, action, target_type, target_id, details)
            VALUES (?, 'clinic_main_01', ?, ?, 'UPDATE_TOKEN_STATUS', 'TOKEN', ?, ?);`,
      args: [
        `log_${Date.now()}`,
        auth.session?.userId || 'unknown',
        auth.session?.role || 'staff',
        tokenId,
        `Status updated to '${status}' by ${auth.session?.name}`,
      ],
    });

    return NextResponse.json({ success: true, message: `Token status updated to ${status}` });
  } catch (error) {
    console.error('update token status error:', error);
    return NextResponse.json({ error: 'Failed to update token status' }, { status: 500 });
  }
}
