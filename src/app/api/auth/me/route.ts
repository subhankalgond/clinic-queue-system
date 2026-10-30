import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('clinic_session')?.value;
  if (!token) {
    return NextResponse.json({ session: null });
  }

  const session = await verifySessionToken(token);
  return NextResponse.json({ session });
}
