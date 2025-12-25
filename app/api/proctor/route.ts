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

    // Verify proctor mapping exists
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

    // Senior core can see all updates, proctors can only see their own
    const { data: user } = await supabase
      .from('users')
      .select('*, role:roles(*)')
      .eq('id', session.userId)
      .single();

    const isSeniorCore = user?.role?.level === 1;

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
