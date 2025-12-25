import { ApprovalType, EventStatus } from '@/lib/types';

export const TERMINAL_EVENT_STATUSES: ReadonlySet<EventStatus> = new Set<EventStatus>([
  'closed',
  'rejected',
]);

export function isTerminalEventStatus(status: EventStatus): boolean {
  return TERMINAL_EVENT_STATUSES.has(status);
}

export function assertNotTerminalEvent(status: EventStatus) {
  if (isTerminalEventStatus(status)) {
    throw new Error(`Event is ${status} and cannot be modified`);
  }
}

// Strict approval stage gating (Workflow 1)
export function assertApprovalTypeAllowedForEventStatus(
  eventStatus: EventStatus,
  approvalType: ApprovalType
) {
  assertNotTerminalEvent(eventStatus);

  const allowed: Record<EventStatus, ApprovalType[]> = {
    proposed: [], // not used in strict workflow, but kept for compatibility
    senior_core_pending: ['senior_core'],
    treasurer_pending: ['treasurer'],
    counsellor_pending: ['counsellor'],
    approved: [],
    documentation_submitted: [],
    closed: [],
    rejected: [],
  };

  if (!allowed[eventStatus]?.includes(approvalType)) {
    throw new Error(
      `Invalid approval action: ${approvalType} cannot approve when event status is ${eventStatus}`
    );
  }
}

export type ApprovalSummary = {
  seniorCoreApprovedCount: number;
  seniorCoreRejected: boolean;
  treasurerApproved: boolean;
  treasurerRejected: boolean;
  counsellorApproved: boolean;
  counsellorRejected: boolean;
};

// Workflow 1 status resolution:
// - Any rejection => REJECTED (terminal) (confirmed by user)
// - 2 senior approvals => treasurer_pending
// - treasurer approval => counsellor_pending
// - counsellor approval => approved
export function computeEventStatusFromApprovals(summary: ApprovalSummary): EventStatus {
  if (
    summary.seniorCoreRejected ||
    summary.treasurerRejected ||
    summary.counsellorRejected
  ) {
    return 'rejected';
  }

  if (summary.counsellorApproved) return 'approved';
  if (summary.treasurerApproved) return 'counsellor_pending';
  if (summary.seniorCoreApprovedCount >= 2) return 'treasurer_pending';

  return 'senior_core_pending';
}


