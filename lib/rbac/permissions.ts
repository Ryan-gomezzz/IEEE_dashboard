import { ROLE_LEVELS } from './roles';

export enum Permission {
  // Event permissions
  VIEW_EVENTS = 'view_events',
  CREATE_EVENT = 'create_event',
  EDIT_EVENT = 'edit_event',
  DELETE_EVENT = 'delete_event',
  APPROVE_EVENT = 'approve_event',
  
  // Approval permissions
  APPROVE_SENIOR_CORE = 'approve_senior_core',
  APPROVE_TREASURER = 'approve_treasurer',
  APPROVE_COUNSELLOR = 'approve_counsellor',
  
  // Assignment permissions
  VIEW_ASSIGNMENTS = 'view_assignments',
  ASSIGN_TEAM = 'assign_team',
  
  // Document permissions
  UPLOAD_DOCUMENT = 'upload_document',
  REVIEW_DOCUMENT = 'review_document',
  DELETE_DOCUMENT = 'delete_document',
  
  // Calendar permissions
  VIEW_CALENDAR = 'view_calendar',
  BLOCK_CALENDAR = 'block_calendar',
  
  // Proctor permissions
  VIEW_PROCctor_UPDATES = 'view_proctor_updates',
  CREATE_PROCctor_UPDATE = 'create_proctor_update',
  ASSIGN_EXECOM = 'assign_execom',
  
  // Chapter documents
  UPLOAD_CHAPTER_DOCUMENT = 'upload_chapter_document',
  VIEW_CHAPTER_DOCUMENTS = 'view_chapter_documents',
}

const PERMISSIONS_BY_LEVEL: Record<number, Permission[]> = {
  [ROLE_LEVELS.SENIOR_CORE]: [
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENT,
    Permission.EDIT_EVENT,
    Permission.APPROVE_EVENT,
    Permission.APPROVE_SENIOR_CORE,
    Permission.VIEW_ASSIGNMENTS,
    Permission.ASSIGN_TEAM,
    Permission.VIEW_CALENDAR,
    Permission.UPLOAD_DOCUMENT,
    Permission.REVIEW_DOCUMENT,
    Permission.VIEW_PROCctor_UPDATES,
    Permission.UPLOAD_CHAPTER_DOCUMENT,
    Permission.VIEW_CHAPTER_DOCUMENTS,
  ],
  [ROLE_LEVELS.VICE_CORE]: [
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENT,
    Permission.VIEW_ASSIGNMENTS,
    Permission.VIEW_CALENDAR,
    Permission.UPLOAD_DOCUMENT,
    Permission.UPLOAD_CHAPTER_DOCUMENT,
    Permission.VIEW_CHAPTER_DOCUMENTS,
  ],
  [ROLE_LEVELS.CHAPTER_LEADERSHIP]: [
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENT,
    Permission.VIEW_ASSIGNMENTS,
    Permission.VIEW_CALENDAR,
    Permission.UPLOAD_DOCUMENT,
    Permission.UPLOAD_CHAPTER_DOCUMENT,
    Permission.VIEW_CHAPTER_DOCUMENTS,
  ],
  [ROLE_LEVELS.TEAMS]: [
    Permission.VIEW_EVENTS,
    Permission.VIEW_ASSIGNMENTS,
    Permission.ASSIGN_TEAM,
    Permission.VIEW_CALENDAR,
    Permission.UPLOAD_DOCUMENT,
  ],
  [ROLE_LEVELS.EXECOM]: [
    Permission.VIEW_EVENTS,
    Permission.VIEW_CALENDAR,
  ],
};

export function hasPermission(roleLevel: number, permission: Permission): boolean {
  const permissions = PERMISSIONS_BY_LEVEL[roleLevel] || [];
  return permissions.includes(permission);
}

export function requirePermission(roleLevel: number, permission: Permission): void {
  if (!hasPermission(roleLevel, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
