import { createServiceClient } from '@/lib/supabase/server';
import { EventStatus, ApprovalType } from '@/lib/types';
import { updateCalendarBlock } from '@/lib/calendar/calendar-service';
import { computeEventStatusFromApprovals, assertApprovalTypeAllowedForEventStatus } from '@/lib/events/workflow';
import { isSeniorCoreApprover, ROLE_NAMES } from '@/lib/rbac/roles';

// Statuses that count towards the calendar limit (2/day)
const CALENDAR_COUNTED_STATUSES: EventStatus[] = ['approved'];

export async function createEventProposal(data: {
  title: string;
  description: string;
  event_type: string;
  proposed_date: string;
  proposed_by: string;
  chapter_id: string;
}) {
  const supabase = await createServiceClient();

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...data,
      // Workflow 1 Step 1: Status must be PENDING_SENIOR_CORE_APPROVAL
      status: 'senior_core_pending',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // NOTE: We do NOT block the calendar here anymore to prevent DOS attacks.
  // The block is applied only after Senior Core approval in updateEventStatus.

  // Create initial approval records
  await createApprovalRecords(event.id, data.proposed_by);

  return event;
}

async function createApprovalRecords(eventId: string, proposedBy: string) {
  const supabase = await createServiceClient();

  // Get users and roles so we can pick the exact 5 Senior Core approvers.
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, role:roles(name)')
    .neq('id', proposedBy);

  const seniorCore = allUsers?.filter((user: any) => isSeniorCoreApprover(user.role?.name)) || [];

  if (seniorCore && seniorCore.length > 0) {
    // Create senior core approval records
    for (const member of seniorCore) {
      await supabase.from('event_approvals').insert({
        event_id: eventId,
        approver_id: member.id,
        approval_type: 'senior_core',
        status: 'pending',
      });
    }
  }
}

export async function getEventApprovalStatus(eventId: string) {
  const supabase = await createServiceClient();

  const { data: approvals } = await supabase
    .from('event_approvals')
    .select('*, approver:users(*), event:events(*)')
    .eq('event_id', eventId);

  const seniorCoreApprovals = approvals?.filter(a => a.approval_type === 'senior_core') || [];
  const treasurerApprovals = approvals?.filter(a => a.approval_type === 'treasurer') || [];
  const counsellorApprovals = approvals?.filter(a => a.approval_type === 'counsellor') || [];

  const seniorCoreApproved = seniorCoreApprovals.filter(a => a.status === 'approved').length;
  const treasurerApproved = treasurerApprovals.some(a => a.status === 'approved');
  const counsellorApproved = counsellorApprovals.some(a => a.status === 'approved');

  return {
    seniorCore: {
      required: 2,
      approved: seniorCoreApproved,
      pending: seniorCoreApprovals.filter(a => a.status === 'pending').length,
      rejected: seniorCoreApprovals.some(a => a.status === 'rejected'),
    },
    treasurer: {
      required: 1,
      approved: treasurerApproved ? 1 : 0,
      pending: treasurerApprovals.some(a => a.status === 'pending') ? 1 : 0,
      rejected: treasurerApprovals.some(a => a.status === 'rejected'),
    },
    counsellor: {
      required: 1,
      approved: counsellorApproved ? 1 : 0,
      pending: counsellorApprovals.some(a => a.status === 'pending') ? 1 : 0,
      rejected: counsellorApprovals.some(a => a.status === 'rejected'),
    },
  };
}

export async function submitApproval(data: {
  event_id: string;
  approver_id: string;
  approval_type: ApprovalType;
  status: 'approved' | 'rejected';
  comments?: string;
}) {
  const supabase = await createServiceClient();

  // Enforce strict stage gating by current event status
  const { data: currentEventForGate } = await supabase
    .from('events')
    .select('status')
    .eq('id', data.event_id)
    .single();

  if (!currentEventForGate) {
    throw new Error('Event not found');
  }

  assertApprovalTypeAllowedForEventStatus(currentEventForGate.status as EventStatus, data.approval_type);

  // Update or create approval record
  const { data: existing } = await supabase
    .from('event_approvals')
    .select('*')
    .eq('event_id', data.event_id)
    .eq('approver_id', data.approver_id)
    .eq('approval_type', data.approval_type)
    .single();

  if (!existing) {
    // Strict workflow: approvals must be pre-created and tied to an approver.
    throw new Error('No approval is assigned to this user for this event');
  }

  if (existing.status !== 'pending') {
    throw new Error('This approval is no longer pending');
  }

  if (existing) {
    await supabase
      .from('event_approvals')
      .update({
        status: data.status,
        comments: data.comments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  }

  // Update event status based on approvals
  await updateEventStatus(data.event_id);

  return { success: true };
}

async function updateEventStatus(eventId: string) {
  const supabase = await createServiceClient();

  // Fetch current event to check status transitions
  const { data: currentEvent } = await supabase
    .from('events')
    .select('status, proposed_date')
    .eq('id', eventId)
    .single();

  if (!currentEvent) return;

  const approvalStatus = await getEventApprovalStatus(eventId);
  const newStatus = computeEventStatusFromApprovals({
    seniorCoreApprovedCount: approvalStatus.seniorCore.approved,
    seniorCoreRejected: approvalStatus.seniorCore.rejected,
    treasurerApproved: approvalStatus.treasurer.approved >= 1,
    treasurerRejected: approvalStatus.treasurer.rejected,
    counsellorApproved: approvalStatus.counsellor.approved >= 1,
    counsellorRejected: approvalStatus.counsellor.rejected,
  });

  // Create missing approval records as the workflow advances
  if (newStatus === 'treasurer_pending') {
    if (!approvalStatus.treasurer.approved && approvalStatus.treasurer.pending === 0) {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, role:roles(name)');

      const treasurer = allUsers?.find((u: any) => u.role?.name === ROLE_NAMES.SB_TREASURER);
      if (!treasurer) throw new Error('SB Treasurer role not found in users table');

      await supabase.from('event_approvals').insert({
        event_id: eventId,
        approver_id: treasurer.id,
        approval_type: 'treasurer',
        status: 'pending',
      });
    }
  }

  if (newStatus === 'counsellor_pending') {
    if (!approvalStatus.counsellor.approved && approvalStatus.counsellor.pending === 0) {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, role:roles(name)');

      const counsellor = allUsers?.find((u: any) => u.role?.name === ROLE_NAMES.SB_COUNSELLOR);
      if (!counsellor) throw new Error('Branch Counsellor role not found in users table');

      await supabase.from('event_approvals').insert({
        event_id: eventId,
        approver_id: counsellor.id,
        approval_type: 'counsellor',
        status: 'pending',
      });
    }
  }

  // Update logic: Only if status changed
  if (newStatus !== currentEvent.status) {
    // 1. Update Database
    if (newStatus === 'approved') {
      await supabase
        .from('events')
        .update({
          status: newStatus,
          approved_date: currentEvent.proposed_date || new Date().toISOString(),
        })
        .eq('id', eventId);

      // Trigger notifications for teams
      const { createTeamNotifications } = await import('@/lib/notifications/notification-service');
      await createTeamNotifications(eventId);

    } else {
      await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);
    }

    // 2. Handle Calendar Blocking
    const wasCounted = CALENDAR_COUNTED_STATUSES.includes(currentEvent.status as EventStatus);
    const isCounted = CALENDAR_COUNTED_STATUSES.includes(newStatus);

    if (!wasCounted && isCounted) {
      // Transition IN to counted state -> Block/Increment
      await updateCalendarBlock(new Date(currentEvent.proposed_date), true);
    }
  }
}
