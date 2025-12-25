import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './session';
import { Permission, requirePermission } from '@/lib/rbac/permissions';

export async function protectApiRoute(
  request: NextRequest,
  permission?: Permission
) {
  try {
    const session = await requireAuth();
    
    if (permission) {
      const { getSession } = await import('./session');
      const sessionData = await getSession();
      if (sessionData) {
        requirePermission(sessionData.roleLevel, permission);
      }
    }

    return { session, error: null };
  } catch (error: any) {
    return {
      session: null,
      error: NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status: 401 }
      ),
    };
  }
}
