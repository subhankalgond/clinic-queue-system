import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UserRole } from './types';

const SECRET_KEY = process.env.JWT_SECRET || 'aapkaclinic-editorial-secret-key-2026-production-ready';
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  userId: string;
  clinicId: string;
  role: UserRole;
  name: string;
  mobile: string;
  doctorId?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('clinic_session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function authenticateRequest(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ authorized: boolean; session?: SessionPayload; error?: string }> {
  const token = req.cookies.get('clinic_session')?.value;
  if (!token) {
    return { authorized: false, error: 'Unauthorized: Session missing' };
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return { authorized: false, error: 'Unauthorized: Invalid or expired token' };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { authorized: false, error: `Forbidden: Requires role [${allowedRoles.join(', ')}]` };
  }

  return { authorized: true, session };
}
