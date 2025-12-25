import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  execom_id: z.string().uuid(),
  update_text: z.string().min(1),
  period_start: z.string(),
  period_end: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const supabase = await createServiceClient();

    // Verify proctor mapping exists (Workflow 4 Step 3)
    const { data: mapping } = await supabase
      .from('proctor_mappings')
      .select('*')
      .eq('proctor_id', session.userId)
      .eq('execom_id', validatedData.execom_id)
      .single();

    if (!mapping) {
      return NextResponse.json(
        { error: 'You are not assigned as proctor for this execom' },
        { status: 403 }
      );
    }

    // Validate bi-weekly period (Workflow 4 Step 3: one update per execom per bi-weekly period)
    const { data: existingUpdate } = await supabase
      .from('proctor_updates')
      .select('*')
      .eq('proctor_id', session.userId)
      .eq('execom_id', validatedData.execom_id)
      .eq('period_start', validatedData.period_start)
      .eq('period_end', validatedData.period_end)
      .single();

    if (existingUpdate) {
      return NextResponse.json(
        { error: 'An update for this execom already exists for this bi-weekly period' },
        { status: 400 }
      );
    }

    // Validate period dates
    const periodStart = new Date(validatedData.period_start);
    const periodEnd = new Date(validatedData.period_end);
    const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 13 || daysDiff > 15) {
      return NextResponse.json(
        { error: 'Period must be approximately 2 weeks (13-15 days)' },
        { status: 400 }
      );
    }

    // Create update
    const { data: update, error } = await supabase
      .from('proctor_updates')
      .insert({
        proctor_id: session.userId,
        execom_id: validatedData.execom_id,
        update_text: validatedData.update_text,
        period_start: validatedData.period_start,
        period_end: validatedData.period_end,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation for bi-weekly period
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An update for this execom already exists for this bi-weekly period' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ update });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Proctor update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create proctor update' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const execomId = searchParams.get('execom_id');

    const supabase = await createServiceClient();
    let query = supabase
      .from('proctor_updates')
      .select('*, execom:users!proctor_updates_execom_id_fkey(*), proctor:users!proctor_updates_proctor_id_fkey(*)')
      .order('created_at', { ascending: false });

    // Senior core can see all updates, proctors can only see their own (Workflow 4 Step 4)
    const { data: user } = await supabase
      .from('users')
      .select('*, role:roles(*)')
      .eq('id', session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle role response - it can be an object or array
    const role = Array.isArray((user as any)?.role) ? (user as any).role[0] : (user as any)?.role;
    const isSeniorCore = role?.level === 1;

    if (!isSeniorCore) {
      query = query.eq('proctor_id', session.userId);
    }

    if (execomId) {
      query = query.eq('execom_id', execomId);
    }

    const { data: updates, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ updates: updates || [] });
  } catch (error: any) {
    console.error('Get proctor updates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch proctor updates' },
      { status: 500 }
    );
  }
}
