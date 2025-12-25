export type EventType = 'technical' | 'non_technical' | 'workshop' | 'outreach';
export type EventStatus =
  | 'proposed'
  | 'senior_core_pending'
  | 'treasurer_pending'
  | 'counsellor_pending'
  | 'approved'
  | 'documentation_submitted'
  | 'closed'
  | 'rejected';
export type ApprovalType = 'senior_core' | 'treasurer' | 'counsellor';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type TeamType = 'documentation' | 'pr' | 'design' | 'coverage';
export type DocumentType = 'final_document' | 'design_file';
export type ChapterDocumentType = 'minutes' | 'weekly_report';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  chapter_id: string | null;
  role?: Role;
  chapter?: Chapter;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  level: number;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  proposed_date: string;
  proposed_by: string;
  chapter_id: string;
  status: EventStatus;
  approved_date: string | null;
  created_at: string;
  updated_at: string;
  chapter?: Chapter;
  proposed_by_user?: User;
}

export interface EventApproval {
  id: string;
  event_id: string;
  approver_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  comments: string | null;
  created_at: string;
  updated_at: string;
  approver?: User;
  event?: Event;
}

export interface EventAssignment {
  id: string;
  event_id: string;
  team_type: TeamType;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  assigned_to_user?: User;
  event?: Event;
}

export interface EventDocument {
  id: string;
  event_id: string;
  document_type: DocumentType;
  file_url: string;
  uploaded_by: string;
  reviewed_by: string | null;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ProctorMapping {
  id: string;
  proctor_id: string;
  execom_id: string;
  created_at: string;
  updated_at: string;
  proctor?: User;
  execom?: User;
}

export interface ProctorUpdate {
  id: string;
  proctor_id: string;
  execom_id: string;
  update_text: string;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
  proctor?: User;
  execom?: User;
}

export interface ChapterDocument {
  id: string;
  chapter_id: string;
  document_type: ChapterDocumentType;
  title: string;
  file_url: string;
  document_date: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  chapter?: Chapter;
  uploaded_by_user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  related_event_id: string | null;
  read: boolean;
  created_at: string;
}

export interface CalendarBlock {
  id: string;
  event_date: string;
  event_count: number;
  blocked: boolean;
  created_at: string;
  updated_at: string;
}
