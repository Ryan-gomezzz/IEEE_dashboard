import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { Badge } from '@/components/ui/Badge';

export default async function EventsPage() {
  await requireAuth();
  const supabase = await createServiceClient();

  const { data: events } = await supabase
    .from('events')
    .select('*, chapter:chapters(*)')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div>
      <PageHeader 
        title="Events" 
        action={{
          label: 'Propose New Event',
          href: '/events/propose',
        }}
      />

      <Card>
        <CardContent>
          {!events || events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events found. <Link href="/events/propose" className="text-primary-600 hover:underline">Propose one</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event: any) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.chapter?.name} • {new Date(event.proposed_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      event.status === 'approved' ? 'success' :
                      event.status === 'closed' ? 'default' :
                      event.status.includes('pending') ? 'warning' : 'info'
                    }>
                      {event.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
