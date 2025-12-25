import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';

export async function AssignedTasks() {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createServiceClient();
  const { data: tasksData } = await supabase
    .from('event_assignments')
    .select('id, team_type, event:events(id,title,proposed_date,chapter:chapters(name))')
    .eq('assigned_to', session.userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const tasks = tasksData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm">No assigned tasks</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              (() => {
                const event = Array.isArray((task as any).event) ? (task as any).event[0] : (task as any).event;
                const chapter = Array.isArray(event?.chapter) ? event?.chapter[0] : event?.chapter;
                const eventId = event?.id;

                return (
                  <Link
                    key={task.id}
                    href={eventId ? `/events/${eventId}` : '/events'}
                    className="block border-b border-gray-200 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <h4 className="font-medium text-gray-900">{event?.title || 'Event'}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {task.team_type} • {chapter?.name || 'Chapter'}
                    </p>
                  </Link>
                );
              })()
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
