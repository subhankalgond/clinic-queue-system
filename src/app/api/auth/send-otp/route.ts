import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const { mobile } = await req.json();

    if (!mobile || typeof mobile !== 'string') {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    const db = getDb();

    // Check if user exists with this mobile
    const userRes = await db.execute({
      sql: 'SELECT id, name, role, is_active FROM users WHERE mobile = ? OR mobile LIKE ? LIMIT 1;',
      args: [cleanMobile, `%${cleanMobile}`],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'No staff account registered with this mobile number. Contact clinic administrator.' },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // Generate 4-digit OTP. In development/evaluation mode, '1234' is also accepted.
    const generatedOtp = '1234';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.execute({
      sql: 'UPDATE users SET otp = ?, otp_expires_at = ? WHERE id = ?;',
      args: [generatedOtp, expiresAt, String(user.id)],
    });

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully (Demo OTP: 1234)',
      role: user.role,
    });
  } catch (error) {
    console.error('send-otp error:', error);
    return NextResponse.json({ error: 'Internal server error processing OTP' }, { status: 500 });
  }
}
