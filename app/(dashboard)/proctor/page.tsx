import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { ProctorDashboard } from '@/components/proctor/ProctorDashboard';
import { ROLE_NAMES, isChapterChair, canAssignProctors } from '@/lib/rbac/roles';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default async function ProctorPage() {
  const session = await requireAuth();
  const supabase = await createServiceClient();

  const { data: viewer } = await supabase
    .from('users')
    .select('id, role:roles(*), role_id, chapter_id')
    .eq('id', session.userId)
    .single();

  // Handle role response - it can be an object or array
  const role = Array.isArray((viewer as any)?.role) ? (viewer as any).role[0] : (viewer as any)?.role;
  const viewerRoleName = role?.name;
  const viewerRoleLevel = role?.level;

  const canAssign = canAssignProctors(viewerRoleName);

  // Get assigned execoms for this proctor
  const { data: mappings } = await supabase
    .from('proctor_mappings')
    .select('*, execom:users!proctor_mappings_execom_id_fkey(*)')
    .eq('proctor_id', session.userId);

  // Get proctor updates
  const { data: updates } = await supabase
    .from('proctor_updates')
    .select('*, execom:users!proctor_updates_execom_id_fkey(*)')
    .eq('proctor_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Senior Core + SB Chair visibility: show all updates (Workflow 4 Step 4)
  let visibleUpdates = updates || [];
  if (viewerRoleName === ROLE_NAMES.SB_CHAIR || viewerRoleLevel === 1) {
    const { data: allUpdates } = await supabase
      .from('proctor_updates')
      .select('*, execom:users!proctor_updates_execom_id_fkey(*), proctor:users!proctor_updates_proctor_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    visibleUpdates = allUpdates || [];
  }

  return (
    <div>
      <PageHeader title="Proctor System" subtitle="Track execom productivity" />

      {canAssign && (
        <div className="mb-4">
          <Link href="/proctor/assign">
            <Button size="sm">Assign Proctors</Button>
          </Link>
        </div>
      )}
      
      <ProctorDashboard 
        execoms={mappings?.map(m => m.execom) || []} 
        updates={visibleUpdates}
      />
    </div>
  );
}
