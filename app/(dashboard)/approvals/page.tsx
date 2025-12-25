import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ApprovalActions } from '@/components/approvals/ApprovalActions';

export default async function ApprovalsPage() {
  const session = await requireAuth();
  const supabase = await createServiceClient();

  // Get user's role
  const { data: user } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .eq('id', session.userId)
    .single();

  // Get pending approvals for this user
  const { data: approvals } = await supabase
    .from('event_approvals')
    .select('*, event:events(*, chapter:chapters(*)), approver:users(*)')
    .eq('status', 'pending')
    .eq('approver_id', session.userId)
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Pending Approvals" />

      <Card>
        <CardContent>
          {!approvals || approvals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending approvals
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval: any) => (
                <div
                  key={approval.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Link href={`/events/${approval.event_id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-primary-600">
                          {approval.event?.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {approval.event?.chapter?.name} • {new Date(approval.event?.proposed_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="warning">
                      {approval.approval_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <ApprovalActions approval={approval} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
