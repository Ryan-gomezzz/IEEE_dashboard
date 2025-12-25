import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createServiceClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export async function Notifications() {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createServiceClient();
  const { data: notificationsData, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching notifications:', error);
  }

  const notifications = notificationsData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No new notifications</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                <p className="text-sm text-gray-900">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
