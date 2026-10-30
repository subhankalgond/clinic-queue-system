import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDatabase } from '@/lib/db';
import { createSessionToken } from '@/lib/auth';
import { UserRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const { mobile, otp } = await req.json();

    if (!mobile || !otp) {
      return NextResponse.json({ error: 'Mobile and OTP are required' }, { status: 400 });
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();
    const db = getDb();

    const userRes = await db.execute({
      sql: 'SELECT id, clinic_id, role, name, mobile, otp, otp_expires_at, is_active FROM users WHERE mobile = ? OR mobile LIKE ? LIMIT 1;',
      args: [cleanMobile, `%${cleanMobile}`],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // Verify OTP (1234 demo OTP or stored OTP)
    const isOtpValid = cleanOtp === '1234' || (user.otp && user.otp === cleanOtp);
    if (!isOtpValid) {
      return NextResponse.json({ error: 'Invalid OTP code. Please check and try again.' }, { status: 401 });
    }

    // If doctor, retrieve doctor ID
    let doctorId: string | undefined;
    if (user.role === 'doctor') {
      const docRes = await db.execute({
        sql: 'SELECT id FROM doctors WHERE user_id = ? LIMIT 1;',
        args: [String(user.id)],
      });
      if (docRes.rows.length > 0) {
        doctorId = String(docRes.rows[0].id);
      }
    }

    // Create JWT Session
    const token = await createSessionToken({
      userId: String(user.id),
      clinicId: String(user.clinic_id),
      role: user.role as UserRole,
      name: String(user.name),
      mobile: String(user.mobile),
      doctorId,
    });

    // Clear one-time OTP
    await db.execute({
      sql: 'UPDATE users SET otp = NULL WHERE id = ?;',
      args: [String(user.id)],
    });

    const response = NextResponse.json({
      success: true,
      role: user.role,
      name: user.name,
      redirectUrl:
        user.role === 'doctor'
          ? '/doctor'
          : user.role === 'malik'
          ? '/owner/reports'
          : '/reception',
    });

    // Set HTTP-only secure cookie
    response.cookies.set('clinic_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('verify-otp error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
