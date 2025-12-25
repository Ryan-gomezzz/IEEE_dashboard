import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const execom = searchParams.get('execom') === 'true';

    const supabase = await createServiceClient();
    let query = supabase
      .from('users')
      .select('id, name, email, role:roles(*), chapter:chapters(*)')
      .order('name', { ascending: true });

    if (execom) {
      // Workflow dropdowns should list execom members (not team heads)
      query = query.eq('role.level', 5);
    }

    const { data: users, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
