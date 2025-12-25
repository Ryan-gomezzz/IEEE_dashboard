import { createServiceClient } from '@/lib/supabase/server';

export async function createTeamNotifications(eventId: string) {
  const supabase = await createServiceClient();

  const { data: allUsers, error: userError } = await supabase
    .from('users')
    .select('id, role:roles(*)');

  if (userError) throw userError;

  const TEAM_HEAD_ROLES = new Set(['PR Head', 'Design Head', 'Documentation Head', 'Coverage Head']);
  // Handle role response - it can be an object or array
  const teamHeads = (allUsers || []).filter((u: any) => {
    const role = Array.isArray(u.role) ? u.role[0] : u.role;
    return role?.name && TEAM_HEAD_ROLES.has(role.name);
  });

  if (teamHeads.length === 0) return;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('title, proposed_date, chapter:chapters(name)')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;

  const eventName = event?.title || 'New Event';
  const eventDate = event?.proposed_date;
  const chapter = Array.isArray((event as any)?.chapter) ? (event as any).chapter[0] : (event as any)?.chapter;
  const chapterName = chapter?.name || 'Unknown Chapter';

  for (const head of teamHeads) {
    await supabase.from('notifications').insert({
      user_id: head.id,
      type: 'event_approved',
      // Workflow 2 requires: Event Name, Event Date, Chapter Name
      message: `Approved Event: ${eventName} | Date: ${eventDate} | Chapter: ${chapterName}`,
      related_event_id: eventId,
      read: false,
    });
  }
}

export async function createSecretaryNotification(eventId: string, docTitle: string) {
  const supabase = await createServiceClient();

  const { data: allUsers, error: userError } = await supabase
    .from('users')
    .select('id, role:roles(*)');

  if (userError) throw userError;

  // Handle role response - it can be an object or array
  const secretaries = (allUsers || []).filter((u: any) => {
    const role = Array.isArray(u.role) ? u.role[0] : u.role;
    return role?.name === 'SB Secretary';
  });
  if (secretaries.length === 0) return;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('title')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;

  for (const secretary of secretaries) {
    await supabase.from('notifications').insert({
      user_id: secretary.id,
      type: 'document_review',
      message: `Final document "${docTitle}" for event "${event?.title}" was uploaded and needs your approval to close the event.`,
      related_event_id: eventId,
      read: false,
    });
  }
}

export async function getUserNotifications(userId: string, limit: number = 10) {
  const supabase = await createServiceClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return notifications || [];
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
