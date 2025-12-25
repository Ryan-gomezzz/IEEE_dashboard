import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { ROLE_NAMES, canAssignProctors, isChapterChair } from '@/lib/rbac/roles';
import { ProctorAssign } from '@/components/proctor/ProctorAssign';

export default async function ProctorAssignPage() {
  const session = await requireAuth();
  const supabase = await createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('id, chapter_id, role:roles(*)')
    .eq('id', session.userId)
    .single();

  // Handle role response - it can be an object or array
  const role = Array.isArray((user as any)?.role) ? (user as any).role[0] : (user as any)?.role;
  const roleName = role?.name;

  if (!user || !canAssignProctors(roleName)) {
    return (
      <div>
        <PageHeader title="Assign Proctors" />
        <Card>
          <CardContent>
            <div className="text-center py-8 text-red-600">
              You do not have permission to assign proctors.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Candidate pool:
  // - SB Chair / SB Secretary can assign across all
  // - Chapter Chair limited to their chapter (enforced server-side too)
  const userIsChapterChair = isChapterChair(roleName);

  let usersQuery = supabase
    .from('users')
    .select('id, name, email, chapter_id, role:roles(level,name)')
    .order('name', { ascending: true });

  if (userIsChapterChair) {
    usersQuery = usersQuery.eq('chapter_id', user.chapter_id);
  }

  const { data: users } = await usersQuery;
  const normalizedUsers = (users || []).map((u: any) => ({
    ...u,
    // normalize potential array-typed joins
    role: Array.isArray(u.role) ? u.role[0] : u.role,
  }));

  const { data: mappings } = await supabase
    .from('proctor_mappings')
    .select('*, proctor:users!proctor_mappings_proctor_id_fkey(id,name,email), execom:users!proctor_mappings_execom_id_fkey(id,name,email)');

  return (
    <div>
      <PageHeader title="Assign Proctors" subtitle="Assign mentees to a proctor (max 5 each)" />
      <Card>
        <CardContent>
          <ProctorAssign users={normalizedUsers} mappings={mappings || []} />
        </CardContent>
      </Card>
    </div>
  );
}


