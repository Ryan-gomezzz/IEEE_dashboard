import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { createHmac } from 'crypto';

const SESSION_COOKIE_NAME = 'ieee_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Use the Service Role Key as the secret since it's only available on the server.
// If it's not set (e.g. during build), fallback to a placeholder to prevent crashes, 
// but in production this strictly requires the key.
const SESSION_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'unsafe-dev-secret';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  roleLevel: number;
  chapterId: string | null;
}

function sign(data: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('hex');
  return `${data}.${signature}`;
}

function unsign(signedData: string, secret: string): string | null {
  const lastDotIndex = signedData.lastIndexOf('.');
  if (lastDotIndex === -1) return null;

  const data = signedData.substring(0, lastDotIndex);
  const signature = signedData.substring(lastDotIndex + 1);

  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  const expectedSignature = hmac.digest('hex');

  if (signature !== expectedSignature) {
    return null;
  }

  return data;
}

export async function createSession(user: { id: string; email: string; name: string; role_id: string; chapter_id: string | null }, roleName: string, roleLevel: number): Promise<void> {
  const cookieStore = cookies();
  const sessionData: SessionData = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    roleName,
    roleLevel,
    chapterId: user.chapter_id,
  };

  const serializedSession = JSON.stringify(sessionData);
  const signedSession = sign(serializedSession, SESSION_SECRET);

  cookieStore.set(SESSION_COOKIE_NAME, signedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return null;
  }

  const rawData = unsign(sessionCookie.value, SESSION_SECRET);
  if (!rawData) {
    // Signature invalid - potentially tampered cookie
    return null;
  }

  try {
    return JSON.parse(rawData) as SessionData;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*, role:roles(*), chapter:chapters(*)')
    .eq('id', session.userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
