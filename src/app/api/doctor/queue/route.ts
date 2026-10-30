import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctor_id') || auth.session?.doctorId || 'doc_01';
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const db = getDb();

    // Doctor info
    const docRes = await db.execute({
      sql: 'SELECT id, full_name, qualification, specialization, opd_room FROM doctors WHERE id = ?;',
      args: [doctorId],
    });
    const doctor = docRes.rows[0];

    // Current called patient
    const currentRes = await db.execute({
      sql: `
        SELECT 
          qt.*,
          p.full_name as patient_name,
          p.mobile as patient_mobile,
          p.patient_uid,
          p.gender as patient_gender,
          p.age as patient_age,
          p.blood_group as patient_blood_group,
          (SELECT COUNT(*) FROM queue_tokens past WHERE past.patient_id = p.id AND past.status = 'completed') as visit_count
        FROM queue_tokens qt
        JOIN patients p ON qt.patient_id = p.id
        WHERE qt.doctor_id = ? AND qt.appointment_date = ? AND qt.status = 'called'
        ORDER BY qt.called_at DESC
        LIMIT 1;
      `,
      args: [doctorId, dateStr],
    });
    const currentToken = currentRes.rows[0] || null;

    // Next 3 upcoming patients (waiting or arrived)
    const upcomingRes = await db.execute({
      sql: `
        SELECT 
          qt.*,
          p.full_name as patient_name,
          p.patient_uid,
          p.gender as patient_gender,
          p.age as patient_age
        FROM queue_tokens qt
        JOIN patients p ON qt.patient_id = p.id
        WHERE qt.doctor_id = ? 
          AND qt.appointment_date = ? 
          AND qt.status IN ('arrived', 'waiting')
        ORDER BY 
          CASE WHEN qt.status = 'arrived' THEN 0 ELSE 1 END,
          qt.token_number ASC
        LIMIT 3;
      `,
      args: [doctorId, dateStr],
    });

    // Skipped patients for quick resume
    const skippedRes = await db.execute({
      sql: `
        SELECT qt.*, p.full_name as patient_name, p.patient_uid
        FROM queue_tokens qt
        JOIN patients p ON qt.patient_id = p.id
        WHERE qt.doctor_id = ? AND qt.appointment_date = ? AND qt.status = 'skipped'
        ORDER BY qt.token_number ASC;
      `,
      args: [doctorId, dateStr],
    });

    // Overall summary for doctor
    const summaryRes = await db.execute({
      sql: `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status IN ('waiting', 'arrived') THEN 1 ELSE 0 END) as remaining
        FROM queue_tokens
        WHERE doctor_id = ? AND appointment_date = ?;
      `,
      args: [doctorId, dateStr],
    });

    return NextResponse.json({
      doctor,
      current_token: currentToken,
      upcoming_tokens: upcomingRes.rows,
      skipped_tokens: skippedRes.rows,
      summary: summaryRes.rows[0] || {},
    });
  } catch (error) {
    console.error('doctor queue get error:', error);
    return NextResponse.json({ error: 'Failed to fetch doctor consultation queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const auth = await authenticateRequest(req, ['doctor', 'malik']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { action, doctor_id, target_token_id } = await req.json();
    const doctorId = doctor_id || auth.session?.doctorId || 'doc_01';
    const dateStr = new Date().toISOString().slice(0, 10);
    const db = getDb();

    if (action === 'NEXT') {
      // 1. If there's an ongoing called token, mark it completed
      await db.execute({
        sql: `
          UPDATE queue_tokens 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
          WHERE doctor_id = ? AND appointment_date = ? AND status = 'called';
        `,
        args: [doctorId, dateStr],
      });

      // 2. Select next available patient (priority to arrived, then waiting, by token_number)
      const nextCandidate = await db.execute({
        sql: `
          SELECT id, token_number, token_display 
          FROM queue_tokens 
          WHERE doctor_id = ? 
            AND appointment_date = ? 
            AND status IN ('arrived', 'waiting')
          ORDER BY 
            CASE WHEN status = 'arrived' THEN 0 ELSE 1 END,
            token_number ASC
          LIMIT 1;
        `,
        args: [doctorId, dateStr],
      });

      if (nextCandidate.rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All patients attended! Queue is currently clear.',
          current_token: null,
        });
      }

      const nextId = String(nextCandidate.rows[0].id);
      const tokenDisplay = String(nextCandidate.rows[0].token_display);

      // Call this token
      await db.execute({
        sql: `UPDATE queue_tokens SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        args: [nextId],
      });

      // Audit log
      await db.execute({
        sql: `INSERT INTO audit_logs (id, clinic_id, user_id, user_role, action, target_type, target_id, details)
              VALUES (?, 'clinic_main_01', ?, 'doctor', 'CALL_NEXT_PATIENT', 'TOKEN', ?, ?);`,
        args: [
          `log_${Date.now()}`,
          auth.session?.userId || 'unknown',
          nextId,
          `Doctor called token ${tokenDisplay}`,
        ],
      });

      return NextResponse.json({ success: true, message: `Called ${tokenDisplay}`, next_id: nextId });
    }

    if (action === 'SKIP') {
      // Mark current called token as skipped
      await db.execute({
        sql: `
          UPDATE queue_tokens 
          SET status = 'skipped' 
          WHERE doctor_id = ? AND appointment_date = ? AND status = 'called';
        `,
        args: [doctorId, dateStr],
      });

      // Then call the next patient
      const nextCandidate = await db.execute({
        sql: `
          SELECT id, token_number, token_display 
          FROM queue_tokens 
          WHERE doctor_id = ? 
            AND appointment_date = ? 
            AND status IN ('arrived', 'waiting')
          ORDER BY 
            CASE WHEN status = 'arrived' THEN 0 ELSE 1 END,
            token_number ASC
          LIMIT 1;
        `,
        args: [doctorId, dateStr],
      });

      if (nextCandidate.rows.length > 0) {
        const nextId = String(nextCandidate.rows[0].id);
        await db.execute({
          sql: `UPDATE queue_tokens SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?;`,
          args: [nextId],
        });
      }

      return NextResponse.json({ success: true, message: 'Patient skipped and next token called.' });
    }

    if (action === 'HOLD') {
      await db.execute({
        sql: `
          UPDATE queue_tokens 
          SET status = 'skipped' 
          WHERE doctor_id = ? AND appointment_date = ? AND status = 'called';
        `,
        args: [doctorId, dateStr],
      });
      return NextResponse.json({ success: true, message: 'Patient held temporarily.' });
    }

    if (action === 'RESUME' && target_token_id) {
      // Mark any other active token as skipped or completed
      await db.execute({
        sql: `
          UPDATE queue_tokens 
          SET status = 'skipped' 
          WHERE doctor_id = ? AND appointment_date = ? AND status = 'called';
        `,
        args: [doctorId, dateStr],
      });

      // Call targeted resumed token
      await db.execute({
        sql: `UPDATE queue_tokens SET status = 'called', called_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        args: [target_token_id],
      });

      return NextResponse.json({ success: true, message: 'Resumed patient into consultation.' });
    }

    if (action === 'COMPLETE') {
      await db.execute({
        sql: `
          UPDATE queue_tokens 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
          WHERE doctor_id = ? AND appointment_date = ? AND status = 'called';
        `,
        args: [doctorId, dateStr],
      });
      return NextResponse.json({ success: true, message: 'Consultation marked as completed.' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('doctor queue action error:', error);
    return NextResponse.json({ error: 'Failed to perform queue action' }, { status: 500 });
  }
}
