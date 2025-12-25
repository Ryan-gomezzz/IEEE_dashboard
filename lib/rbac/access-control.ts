import { requireAuth, getSession } from '@/lib/auth/session';
import { requirePermission } from './permissions';
import { Permission } from './permissions';

export async function requireAuthAndPermission(permission: Permission) {
  const session = await requireAuth();
  requirePermission(session.roleLevel, permission);
  return session;
}

export async function checkAccess(permission: Permission): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session) return false;
    const { hasPermission } = await import('./permissions');
    return hasPermission(session.roleLevel, permission);
  } catch {
    return false;
  }
}
