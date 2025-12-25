import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createServiceClient } from '@/lib/supabase/server';

export async function UpcomingEvents() {
  const supabase = await createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: eventsData, error } = await supabase
    .from('events')
    .select('id, title, proposed_date, chapter:chapters(name)')
    .eq('status', 'approved')
    .gte('proposed_date', today)
    .order('proposed_date', { ascending: true })
    .limit(5);

  if (error) {
    console.error('Error fetching upcoming events:', error);
  }

  const events = eventsData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming events</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                <h4 className="font-medium text-gray-900">{event.title}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(event.proposed_date).toLocaleDateString()} • {(Array.isArray((event as any).chapter) ? (event as any).chapter[0]?.name : (event as any).chapter?.name)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
