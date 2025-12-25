import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { DocumentReview } from '@/components/events/DocumentReview';
import { isSbSecretary } from '@/lib/rbac/roles';

export default async function ReviewPage() {
  const session = await requireAuth();
  const supabase = await createServiceClient();

  // Get user's role to verify they are SB Secretary
  const { data: user } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .eq('id', session.userId)
    .single();

  if (!user || !isSbSecretary(user.role.name)) {
    return (
      <div>
        <PageHeader title="Review Documentation" />
        <Card>
          <CardContent>
            <div className="text-center py-8 text-red-600">
              You do not have permission to review documents. Only the Student Branch Secretary can review documentation.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get events with pending documentation review
  const { data: events } = await supabase
    .from('events')
    .select('*, chapter:chapters(*)')
    .eq('status', 'documentation_submitted')
    .order('approved_date', { ascending: false });

  // Get pending documents
  const { data: documents } = await supabase
    .from('event_documents')
    .select('*, event:events(*), uploaded_by_user:users!event_documents_uploaded_by_fkey(*)')
    .eq('document_type', 'final_document')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Review Documentation" subtitle="Review and approve event documentation" />
      
      <Card>
        <CardContent>
          <DocumentReview documents={documents || []} />
        </CardContent>
      </Card>
    </div>
  );
}
