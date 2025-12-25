import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { AssignmentList } from '@/components/assignments/AssignmentList';

export default async function AssignmentsPage() {
  const session = await requireAuth();
  const supabase = await createServiceClient();

  // Get approved events that need assignments
  const { data: events } = await supabase
    .from('events')
    .select('*, chapter:chapters(*)')
    .eq('status', 'approved')
    .order('approved_date', { ascending: false });

  // Get existing assignments
  const { data: assignments } = await supabase
    .from('event_assignments')
    .select('*, assigned_to_user:users!event_assignments_assigned_to_fkey(*), event:events(*)');

  return (
    <div>
      <PageHeader title="Team Assignments" subtitle="Assign team members to approved events" />
      
      <Card>
        <CardContent>
          <AssignmentList events={events || []} assignments={assignments || []} />
        </CardContent>
      </Card>
    </div>
  );
}
