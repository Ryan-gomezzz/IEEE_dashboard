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
  // Use standard pattern: select full role object to handle both array and object responses
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('id, role:roles(*)')
    .neq('id', proposedBy);

  if (usersError) {
    console.error('Error fetching users for approval records:', usersError);
    throw new Error(`Failed to fetch users for approval records: ${usersError.message}`);
  }

  if (!allUsers || allUsers.length === 0) {
    throw new Error('No users found to create approval records');
  }

  // Handle role response - it can be an object or array depending on Supabase version
  const seniorCore = allUsers.filter((user: any) => {
    const role = Array.isArray(user.role) ? user.role[0] : user.role;
    const roleName = role?.name;
    return roleName && isSeniorCoreApprover(roleName);
  });

  if (seniorCore.length === 0) {
    throw new Error('No Senior Core approvers found. At least one Senior Core member must exist to create approval records.');
  }

  if (seniorCore.length < 2) {
    throw new Error(`Only ${seniorCore.length} Senior Core approver(s) found. Minimum 2 required for approval workflow.`);
  }

  console.log(`Creating approval records for ${seniorCore.length} Senior Core members for event ${eventId}`);

  // Create senior core approval records - ensure no duplicates
  const approvalRecords = seniorCore.map((member) => ({
    event_id: eventId,
    approver_id: member.id,
    approval_type: 'senior_core' as const,
    status: 'pending' as const,
  }));

  const { error: insertError } = await supabase
    .from('event_approvals')
    .insert(approvalRecords);

  if (insertError) {
    console.error('Error creating approval records:', insertError);
    throw new Error(`Failed to create approval records: ${insertError.message}`);
  }

  console.log(`Successfully created ${approvalRecords.length} approval records`);
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

  // Count distinct approvers who have approved (Workflow 1: Minimum 2 distinct approvals required)
  const approvedSeniorCoreApprovers = new Set(
    seniorCoreApprovals
      .filter(a => a.status === 'approved')
      .map(a => a.approver_id)
  );
  const seniorCoreApproved = approvedSeniorCoreApprovers.size;

  const treasurerApproved = treasurerApprovals.some(a => a.status === 'approved');
  const treasurerPending = treasurerApprovals.some(a => a.status === 'pending');
  const counsellorApproved = counsellorApprovals.some(a => a.status === 'approved');
  const counsellorPending = counsellorApprovals.some(a => a.status === 'pending');

  return {
    seniorCore: {
      required: 2,
      approved: seniorCoreApproved,
      pending: seniorCoreApprovals.filter(a => a.status === 'pending').length,
      rejected: seniorCoreApprovals.some(a => a.status === 'rejected'),
      distinctApprovers: approvedSeniorCoreApprovers.size,
    },
    treasurer: {
      required: 1,
      approved: treasurerApproved ? 1 : 0,
      pending: treasurerPending ? 1 : 0,
      rejected: treasurerApprovals.some(a => a.status === 'rejected'),
    },
    counsellor: {
      required: 1,
      approved: counsellorApproved ? 1 : 0,
      pending: counsellorPending ? 1 : 0,
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

  console.log(`Submitting approval for event ${data.event_id} by user ${data.approver_id}: ${data.approval_type} - ${data.status}`);

  // Enforce strict stage gating by current event status
  const { data: currentEventForGate, error: eventError } = await supabase
    .from('events')
    .select('status')
    .eq('id', data.event_id)
    .single();

  if (eventError) {
    console.error(`Error fetching event ${data.event_id}:`, eventError);
    throw new Error('Event not found');
  }

  if (!currentEventForGate) {
    throw new Error('Event not found');
  }

  try {
    assertApprovalTypeAllowedForEventStatus(currentEventForGate.status as EventStatus, data.approval_type);
  } catch (error) {
    console.error(`Approval type not allowed for event status:`, error);
    throw error;
  }

  // Update or create approval record
  const { data: existing, error: existingError } = await supabase
    .from('event_approvals')
    .select('*')
    .eq('event_id', data.event_id)
    .eq('approver_id', data.approver_id)
    .eq('approval_type', data.approval_type)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected if no record exists
    console.error('Error fetching existing approval:', existingError);
    throw existingError;
  }

  if (!existing) {
    // Strict workflow: approvals must be pre-created and tied to an approver.
    console.error(`No approval record found for event ${data.event_id}, approver ${data.approver_id}, type ${data.approval_type}`);
    throw new Error('No approval is assigned to this user for this event');
  }

  if (existing.status !== 'pending') {
    console.warn(`Approval ${existing.id} is no longer pending (current status: ${existing.status})`);
    throw new Error(`This approval is no longer pending (current status: ${existing.status})`);
  }

  // Prevent duplicate approval from same approver
  if (data.status === 'approved' && existing.status === 'approved') {
    throw new Error('You have already approved this event');
  }

  const { error: updateError } = await supabase
    .from('event_approvals')
    .update({
      status: data.status,
      comments: data.comments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (updateError) {
    console.error('Error updating approval record:', updateError);
    throw updateError;
  }

  console.log(`Approval record ${existing.id} updated to ${data.status}`);

  // Update event status based on approvals
  await updateEventStatus(data.event_id);

  return { success: true };
}

async function updateEventStatus(eventId: string) {
  const supabase = await createServiceClient();

  try {
    // Fetch current event to check status transitions
    const { data: currentEvent, error: eventError } = await supabase
      .from('events')
      .select('status, proposed_date')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error(`Error fetching event ${eventId}:`, eventError);
      return;
    }

    if (!currentEvent) {
      console.warn(`Event ${eventId} not found`);
      return;
    }

    console.log(`Updating event status for ${eventId}. Current status: ${currentEvent.status}`);

    const approvalStatus = await getEventApprovalStatus(eventId);
    
    // Debug logging
    console.log(`Approval status for event ${eventId}:`, {
      seniorCore: approvalStatus.seniorCore,
      treasurer: approvalStatus.treasurer,
      counsellor: approvalStatus.counsellor,
    });
    
    const newStatus = computeEventStatusFromApprovals({
      seniorCoreApprovedCount: approvalStatus.seniorCore.approved,
      seniorCoreRejected: approvalStatus.seniorCore.rejected,
      treasurerApproved: approvalStatus.treasurer.approved >= 1,
      treasurerRejected: approvalStatus.treasurer.rejected,
      counsellorApproved: approvalStatus.counsellor.approved >= 1,
      counsellorRejected: approvalStatus.counsellor.rejected,
    });

    console.log(`Computed new status for event ${eventId}: ${newStatus} (from ${currentEvent.status})`);
    console.log(`Status transition details:`, {
      currentStatus: currentEvent.status,
      newStatus,
      treasurerApproved: approvalStatus.treasurer.approved >= 1,
      treasurerApprovedCount: approvalStatus.treasurer.approved,
    });

  // Create missing approval records as the workflow advances
  if (newStatus === 'treasurer_pending') {
    if (!approvalStatus.treasurer.approved && approvalStatus.treasurer.pending === 0) {
      try {
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, role:roles(*)');

        if (usersError) {
          console.error('Error fetching users for treasurer approval:', usersError);
          throw new Error(`Failed to fetch users for treasurer approval: ${usersError.message}`);
        }

        if (!allUsers || allUsers.length === 0) {
          throw new Error('No users found to create treasurer approval record');
        }

        // Handle role response - it can be an object or array
        const treasurer = allUsers.find((u: any) => {
          const role = Array.isArray(u.role) ? u.role[0] : u.role;
          return role?.name === ROLE_NAMES.SB_TREASURER;
        });

        if (!treasurer) {
          throw new Error('SB Treasurer role not found in users table. Cannot proceed with approval workflow.');
        }

        const { error: insertError } = await supabase.from('event_approvals').insert({
          event_id: eventId,
          approver_id: treasurer.id,
          approval_type: 'treasurer',
          status: 'pending',
        });

        if (insertError) {
          console.error('Error creating treasurer approval record:', insertError);
          throw new Error(`Failed to create treasurer approval record: ${insertError.message}`);
        }

        console.log(`Created treasurer approval record for event ${eventId}`);
      } catch (error) {
        // For treasurer, we should throw because the workflow can't proceed without it
        console.error(`Critical error creating treasurer approval record for event ${eventId}:`, error);
        throw error;
      }
    }
  }

  if (newStatus === 'counsellor_pending') {
    if (!approvalStatus.counsellor.approved && approvalStatus.counsellor.pending === 0) {
      try {
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, role:roles(*)');

        if (usersError) {
          console.error('Error fetching users for counsellor approval:', usersError);
          console.warn(`Warning: Could not create counsellor approval record for event ${eventId}. Status will still be updated to counsellor_pending.`);
          // Don't throw - allow status update to proceed
        } else if (!allUsers || allUsers.length === 0) {
          console.warn(`Warning: No users found. Could not create counsellor approval record for event ${eventId}. Status will still be updated to counsellor_pending.`);
        } else {
          // Handle role response - it can be an object or array
          const counsellor = allUsers.find((u: any) => {
            const role = Array.isArray(u.role) ? u.role[0] : u.role;
            return role?.name === ROLE_NAMES.SB_COUNSELLOR;
          });

          if (!counsellor) {
            console.warn(`Warning: Branch Counsellor user not found in database. Please ensure branch.counsellor@ieee.org user exists. Status will still be updated to counsellor_pending.`);
            console.warn(`To fix: Run the seed script (node scripts/seed-database.js) to create the Branch Counsellor user.`);
          } else {
            const { error: insertError } = await supabase.from('event_approvals').insert({
              event_id: eventId,
              approver_id: counsellor.id,
              approval_type: 'counsellor',
              status: 'pending',
            });

            if (insertError) {
              console.error('Error creating counsellor approval record:', insertError);
              console.warn(`Warning: Could not create counsellor approval record. Status will still be updated to counsellor_pending.`);
            } else {
              console.log(`Created counsellor approval record for event ${eventId}`);
            }
          }
        }
      } catch (error) {
        // Log but don't throw - allow status update to proceed
        console.error(`Error in counsellor approval record creation for event ${eventId}:`, error);
        console.warn(`Status will still be updated to counsellor_pending.`);
      }
    }
  }

    // Update logic: Only if status changed
    if (newStatus !== currentEvent.status) {
      console.log(`Status changed for event ${eventId}: ${currentEvent.status} -> ${newStatus}`);

      // Handle calendar block updates for rejections (decrement if was approved)
      if (newStatus === 'rejected' && CALENDAR_COUNTED_STATUSES.includes(currentEvent.status as EventStatus)) {
        try {
          await updateCalendarBlock(new Date(currentEvent.proposed_date), false);
          console.log(`Calendar block decremented for rejected event ${eventId}`);
        } catch (calendarError) {
          console.error(`Error decrementing calendar block for rejected event ${eventId}:`, calendarError);
        }
      }

      // 1. Update Database
      if (newStatus === 'approved') {
        // Validate calendar availability at approval time (prevents race conditions)
        try {
          const { checkDateAvailability } = await import('@/lib/calendar/calendar-service');
          const proposedDate = new Date(currentEvent.proposed_date);
          const availability = await checkDateAvailability(proposedDate);
          
          if (!availability.available) {
            throw new Error(`Cannot approve event: ${availability.reason}`);
          }
        } catch (calendarError: any) {
          console.error(`Calendar validation failed for event ${eventId}:`, calendarError);
          throw new Error(`Calendar validation failed: ${calendarError.message || calendarError.reason || 'Maximum 2 events per day limit reached'}`);
        }

        const { error: updateError } = await supabase
          .from('events')
          .update({
            status: newStatus,
            approved_date: currentEvent.proposed_date || new Date().toISOString(),
          })
          .eq('id', eventId);

        if (updateError) {
          console.error(`Error updating event ${eventId} to approved:`, updateError);
          throw updateError;
        }

        // Trigger notifications for teams
        try {
          const { createTeamNotifications } = await import('@/lib/notifications/notification-service');
          await createTeamNotifications(eventId);
          console.log(`Team notifications created for approved event ${eventId}`);
        } catch (notifError) {
          console.error(`Error creating team notifications for event ${eventId}:`, notifError);
          // Don't throw - event approval should succeed even if notifications fail
        }

      } else {
        const { error: updateError, data: updatedEvent } = await supabase
          .from('events')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', eventId)
          .select()
          .single();

        if (updateError) {
          console.error(`Error updating event ${eventId} status to ${newStatus}:`, updateError);
          throw updateError;
        }
        
        console.log(`Successfully updated event ${eventId} status to ${newStatus}`, updatedEvent);
      }

      // 2. Handle Calendar Blocking
      const wasCounted = CALENDAR_COUNTED_STATUSES.includes(currentEvent.status as EventStatus);
      const isCounted = CALENDAR_COUNTED_STATUSES.includes(newStatus);

      if (!wasCounted && isCounted) {
        // Transition IN to counted state -> Block/Increment
        try {
          await updateCalendarBlock(new Date(currentEvent.proposed_date), true);
          console.log(`Calendar block updated for event ${eventId}`);
        } catch (calendarError) {
          console.error(`Error updating calendar block for event ${eventId}:`, calendarError);
          // Don't throw - event status update should succeed even if calendar update fails
        }
      } else if (wasCounted && !isCounted) {
        // Transition OUT of counted state -> Decrement (e.g., if event is rejected after approval)
        try {
          await updateCalendarBlock(new Date(currentEvent.proposed_date), false);
          console.log(`Calendar block decremented for event ${eventId}`);
        } catch (calendarError) {
          console.error(`Error decrementing calendar block for event ${eventId}:`, calendarError);
        }
      }
    } else {
      console.log(`No status change for event ${eventId} (still ${currentEvent.status})`);
    }
  } catch (error) {
    console.error(`Failed to update event status for ${eventId}:`, error);
    // Re-throw to let caller handle it
    throw error;
  }
}
