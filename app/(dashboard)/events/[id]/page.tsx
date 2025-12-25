import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const supabase = await createServiceClient();

  const { data: event } = await supabase
    .from('events')
    .select('*, chapter:chapters(*), proposed_by_user:users!events_proposed_by_fkey(*)')
    .eq('id', params.id)
    .single();

  if (!event) {
    notFound();
  }

  const { data: approvals } = await supabase
    .from('event_approvals')
    .select('*, approver:users(*)')
    .eq('event_id', params.id);

  const seniorCoreApprovals = approvals?.filter((a: any) => a.approval_type === 'senior_core') || [];
  const treasurerApprovals = approvals?.filter((a: any) => a.approval_type === 'treasurer') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Proposed by {event.proposed_by_user?.name} • {new Date(event.created_at).toLocaleDateString()}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="mt-1">{event.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Type</p>
              <p className="mt-1 capitalize">{event.event_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proposed Date</p>
              <p className="mt-1">{new Date(event.proposed_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Chapter</p>
              <p className="mt-1">{event.chapter?.name}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Senior Core (2 required)</p>
              <div className="space-y-2">
                {seniorCoreApprovals.map((approval: any) => (
                  <div key={approval.id} className="flex items-center justify-between">
                    <span className="text-sm">{approval.approver?.name}</span>
                    <Badge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'}>
                      {approval.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Treasurer (1 required)</p>
              <div className="space-y-2">
                {treasurerApprovals.map((approval: any) => (
                  <div key={approval.id} className="flex items-center justify-between">
                    <span className="text-sm">{approval.approver?.name}</span>
                    <Badge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'}>
                      {approval.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href="/events">
          <Button variant="outline">Back to Events</Button>
        </Link>
        {event.status === 'proposed' && (
          <Link href={`/events/${params.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
