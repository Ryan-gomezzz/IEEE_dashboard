import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { getRoleLevel, isSeniorCore, isTreasurer } from '@/lib/rbac/roles';
import Link from 'next/link';

export async function PendingApprovals() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  const supabase = await createServiceClient();
  
  // Get user's role to determine what approvals they can see
  const { data: user } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .eq('id', session.userId)
    .single();

  if (!user) {
    return null;
  }

  // Handle role response - it can be an object or array
  const role = Array.isArray((user as any)?.role) ? (user as any).role[0] : (user as any)?.role;
  const roleName = role?.name;

  if (!roleName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Unable to load approvals</p>
        </CardContent>
      </Card>
    );
  }

  const roleLevel = getRoleLevel(roleName);
  
  // Build query based on user's role
  let query = supabase
    .from('event_approvals')
    .select('*, event:events(*, chapter:chapters(*)), approver:users(*)')
    .eq('status', 'pending')
    .eq('approver_id', session.userId);

  // If user is senior core, show only senior_core approvals
  if (isSeniorCore(roleLevel)) {
    query = query.eq('approval_type', 'senior_core');
  } else if (isTreasurer(roleName)) {
    query = query.eq('approval_type', 'treasurer');
  } else if (roleName === 'Branch Counsellor') {
    query = query.eq('approval_type', 'counsellor');
  }

  const { data: approvals, error } = await query.order('created_at', { ascending: false }).limit(5);

  if (error) {
    console.error('Error fetching pending approvals:', error);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {!approvals || approvals.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending approvals</p>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval: any) => (
              <Link
                key={approval.id}
                href={`/events/${approval.event_id}`}
                className="block border-b border-gray-200 pb-3 last:border-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
              >
                <h4 className="font-medium text-gray-900 text-sm">{approval.event?.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const event = approval.event;
                    const chapter = Array.isArray(event?.chapter) ? event?.chapter[0] : event?.chapter;
                    return `${chapter?.name || 'Unknown'} • ${approval.approval_type.replace('_', ' ')}`;
                  })()}
                </p>
              </Link>
            ))}
            {approvals.length >= 5 && (
              <Link
                href="/approvals"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
