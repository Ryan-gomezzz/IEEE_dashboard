import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents } from '@/lib/calendar/calendar-service';
import { parseISO } from 'date-fns';
import { requireAuth } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }

    const events = await getCalendarEvents(parseISO(startDate), parseISO(endDate));
    
    // Format events for calendar display
    const formattedEvents = events.map((event: any) => ({
      id: event.id,
      title: event.title,
      event_type: event.event_type,
      proposed_date: event.proposed_date,
      chapter: event.chapter,
      status: event.status,
    }));
    
    return NextResponse.json({ events: formattedEvents });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
