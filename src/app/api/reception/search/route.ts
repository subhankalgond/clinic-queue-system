import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['receptionist', 'doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    const db = getDb();

    let sql = `
      SELECT 
        p.id,
        p.patient_uid,
        p.full_name,
        p.mobile,
        p.gender,
        p.age,
        p.blood_group,
        p.created_at,
        COUNT(qt.id) as visit_count,
        MAX(qt.appointment_date) as last_visit_date
      FROM patients p
      LEFT JOIN queue_tokens qt ON p.id = qt.patient_id
    `;
    const params: string[] = [];

    if (query) {
      sql += ` WHERE (p.full_name LIKE ? OR p.mobile LIKE ? OR p.patient_uid LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    sql += ` GROUP BY p.id ORDER BY p.full_name ASC LIMIT 50;`;

    const patientsRes = await db.execute({ sql, args: params });

    return NextResponse.json({
      patients: patientsRes.rows,
    });
  } catch (error) {
    console.error('patient search error:', error);
    return NextResponse.json({ error: 'Failed to search patients' }, { status: 500 });
  }
}
