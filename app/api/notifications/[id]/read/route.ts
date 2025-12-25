import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { markNotificationAsRead } from '@/lib/notifications/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await markNotificationAsRead(params.id, session.userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
