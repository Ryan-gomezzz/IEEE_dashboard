import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createServiceClient } from '@/lib/supabase/server';

export async function ChapterActivity() {
  const supabase = await createServiceClient();
  const { data: activitiesData } = await supabase
    .from('chapter_documents')
    .select('id, title, document_type, document_date, chapter:chapters(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const activities = activitiesData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chapter Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                {(() => {
                  const chapter = Array.isArray((activity as any).chapter) ? (activity as any).chapter[0] : (activity as any).chapter;
                  return (
                    <>
                      <h4 className="font-medium text-gray-900">{chapter?.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.document_type === 'minutes' ? 'Minutes' : 'Weekly Report'}: {activity.title}
                        {activity.document_date ? ` • ${new Date(activity.document_date).toLocaleDateString()}` : ''}
                      </p>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
