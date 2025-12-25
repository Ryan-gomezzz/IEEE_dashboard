import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default async function DocumentsPage() {
  await requireAuth();
  const supabase = await createServiceClient();

  const { data: documents } = await supabase
    .from('chapter_documents')
    .select('*, chapter:chapters(*), uploaded_by_user:users!chapter_documents_uploaded_by_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader 
        title="Chapter Documents" 
        subtitle="Minutes of Meet and Weekly Activity Reports"
        action={{
          label: 'Upload Document',
          href: '/documents/upload',
        }}
      />

      <Card>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents found. <Link href="/documents/upload" className="text-primary-600 hover:underline">Upload one</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {doc.chapter?.name} • {doc.uploaded_by_user?.name} • {new Date(doc.document_date || doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="info">
                        {doc.document_type === 'minutes' ? 'Minutes' : 'Weekly Report'}
                      </Badge>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm">View</Button>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
