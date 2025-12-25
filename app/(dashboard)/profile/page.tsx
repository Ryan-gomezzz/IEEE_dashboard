import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';

export default async function ProfilePage() {
  const session = await requireAuth();
  const supabase = await createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('*, role:roles(*), chapter:chapters(*)')
    .eq('id', session.userId)
    .single();

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <PageHeader title="Profile" />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="mt-1 font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-1 font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="mt-1 font-medium">{user.role?.name}</p>
            </div>
            {user.chapter && (
              <div>
                <p className="text-sm text-gray-500">Chapter</p>
                <p className="mt-1 font-medium">{user.chapter.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Account Created</p>
              <p className="mt-1 font-medium">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="mt-1 font-medium">
                {new Date(user.updated_at).toLocaleDateString()}
              </p>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This is a demo account. Password changes are not available in demo mode.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
