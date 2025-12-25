import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createEventProposal } from '@/lib/events/event-service';
import { checkDateAvailability, validateTenDayAdvance } from '@/lib/calendar/calendar-service';
import { z } from 'zod';
import { parseISO } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/server';
import { canCreateEventProposal } from '@/lib/rbac/roles';

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  event_type: z.enum(['technical', 'non_technical', 'workshop', 'outreach']),
  proposed_date: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validatedData = eventSchema.parse(body);

    const proposedDate = parseISO(validatedData.proposed_date);

    // Validate 10-day advance
    const tenDayCheck = await validateTenDayAdvance(proposedDate);
    if (!tenDayCheck.valid) {
      return NextResponse.json(
        { error: tenDayCheck.reason },
        { status: 400 }
      );
    }

    // Check date availability
    const availability = await checkDateAvailability(proposedDate);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason },
        { status: 400 }
      );
    }

    // Get user's chapter
    const supabase = await createServiceClient();
    const { data: user } = await supabase
      .from('users')
      .select('chapter_id, role:roles(name)')
      .eq('id', session.userId)
      .single();

    if (!user?.chapter_id) {
      return NextResponse.json(
        { error: 'User must be associated with a chapter' },
        { status: 400 }
      );
    }

    const roleName = (user as any)?.role?.name ?? (user as any)?.role?.[0]?.name;
    if (!canCreateEventProposal(roleName)) {
      return NextResponse.json(
        { error: 'Only Chapter Chair / Vice Chair / Secretary can create event proposals' },
        { status: 403 }
      );
    }

    const event = await createEventProposal({
      ...validatedData,
      proposed_by: session.userId,
      chapter_id: user.chapter_id,
    });

    return NextResponse.json({ event });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return NextResponse.json(
        { error: `Invalid request data: ${errorMessages}`, details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event proposal' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const chapterId = searchParams.get('chapter_id');

    const supabase = await createServiceClient();
    let query = supabase
      .from('events')
      .select('*, chapter:chapters(*), proposed_by_user:users!events_proposed_by_fkey(*)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    }

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
