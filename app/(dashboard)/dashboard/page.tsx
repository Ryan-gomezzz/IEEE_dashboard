import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { CalendarPreview } from '@/components/dashboard/CalendarPreview';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';
import { AssignedTasks } from '@/components/dashboard/AssignedTasks';
import { Notifications } from '@/components/dashboard/Notifications';
import { ChapterActivity } from '@/components/dashboard/ChapterActivity';

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {session.name}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <UpcomingEvents />
        </div>
        
        <CalendarPreview />
        
        <PendingApprovals />
        
        <AssignedTasks />
        
        <Notifications />
        
        <ChapterActivity />
      </div>
    </div>
  );
}
