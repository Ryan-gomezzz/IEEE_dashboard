import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isTeamHead } from '@/lib/rbac/roles';

const assignmentSchema = z.object({
  event_id: z.string().uuid(),
  team_type: z.enum(['documentation', 'pr', 'design', 'coverage']),
  assigned_to: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validatedData = assignmentSchema.parse(body);

    const supabase = await createServiceClient();

    // Enforce: only the corresponding Team Head can assign for their team_type (Workflow 2)
    const { data: assigner } = await supabase
      .from('users')
      .select('id, role:roles(*)')
      .eq('id', session.userId)
      .single();

    if (!assigner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle role response - it can be an object or array
    const role = Array.isArray((assigner as any)?.role) ? (assigner as any).role[0] : (assigner as any)?.role;
    const assignerRoleName = role?.name;
    if (!isTeamHead(assignerRoleName, validatedData.team_type)) {
      return NextResponse.json(
        { error: 'Only the corresponding Team Head can assign for this team' },
        { status: 403 }
      );
    }

    // Check if event is approved
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', validatedData.event_id)
      .single();

    if (!event || event.status !== 'approved') {
      return NextResponse.json(
        { error: 'Event must be approved before assigning teams' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('event_assignments')
      .select('*')
      .eq('event_id', validatedData.event_id)
      .eq('team_type', validatedData.team_type)
      .single();

    if (existing) {
      // Update existing assignment
      const { data, error } = await supabase
        .from('event_assignments')
        .update({
          assigned_to: validatedData.assigned_to,
          assigned_by: session.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ assignment: data });
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from('event_assignments')
        .insert({
          ...validatedData,
          assigned_by: session.userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for assigned user
      await supabase.from('notifications').insert({
        user_id: validatedData.assigned_to,
        type: 'assignment',
        message: `You have been assigned to ${event.title} for ${validatedData.team_type} team`,
        related_event_id: validatedData.event_id,
        read: false,
      });

      return NextResponse.json({ assignment: data });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create assignment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('event_id');
    const userId = searchParams.get('user_id');

    const supabase = await createServiceClient();
    let query = supabase
      .from('event_assignments')
      .select('*, assigned_to_user:users!event_assignments_assigned_to_fkey(*), event:events(*)');

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ assignments: assignments || [] });
  } catch (error: any) {
    console.error('Get assignments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
