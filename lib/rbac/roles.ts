// Role definitions and level mappings
export const ROLE_LEVELS = {
  SENIOR_CORE: 1,
  VICE_CORE: 2,
  CHAPTER_LEADERSHIP: 3,
  TEAMS: 4,
  EXECOM: 5,
} as const;

export const ROLE_NAMES = {
  // Level 1 - Senior Core
  SB_CHAIR: 'SB Chair',
  SB_SECRETARY: 'SB Secretary',
  SB_TREASURER: 'SB Treasurer',
  SB_TECHNICAL_HEAD: 'SB Technical Head',
  SB_CONVENER: 'SB Convener',
  SB_COUNSELLOR: 'Branch Counsellor', // Added role

  // Level 2 - Vice Core
  SB_VICE_CHAIR: 'Vice Chair',
  SB_VICE_SECRETARY: 'Vice Secretary',
  SB_VICE_TREASURER: 'Vice Treasurer',
  SB_VICE_TECHNICAL_HEAD: 'Vice Technical Head',
  SB_VICE_CONVENER: 'Vice Convener',

  // Level 3 - Chapter Leadership
  CHAPTER_CHAIR: 'Chair', // Generic for chapter chairs
  CHAPTER_VICE_CHAIR: 'Vice Chair',
  CHAPTER_SECRETARY: 'Secretary',
  CHAPTER_VICE_SECRETARY: 'Vice Secretary',
  CHAPTER_TREASURER: 'Treasurer',
  CHAPTER_VICE_TREASURER: 'Vice Treasurer',

  // Level 4 - Teams
  PR_HEAD: 'PR Head',
  DESIGN_HEAD: 'Design Head',
  DOCUMENTATION_HEAD: 'Documentation Head',
  COVERAGE_HEAD: 'Coverage Head',
} as const;

export function isSeniorCoreApprover(roleName: string): boolean {
  return (
    roleName === ROLE_NAMES.SB_CHAIR ||
    roleName === ROLE_NAMES.SB_SECRETARY ||
    roleName === ROLE_NAMES.SB_TREASURER ||
    roleName === ROLE_NAMES.SB_TECHNICAL_HEAD ||
    roleName === ROLE_NAMES.SB_CONVENER
  );
}

export function isBranchCounsellor(roleName: string): boolean {
  return roleName === ROLE_NAMES.SB_COUNSELLOR;
}

export function isSbTreasurer(roleName: string): boolean {
  return roleName === ROLE_NAMES.SB_TREASURER;
}

export function isSbSecretary(roleName: string): boolean {
  return roleName === ROLE_NAMES.SB_SECRETARY;
}

export function isChapterChair(roleName: string): boolean {
  return roleName === ROLE_NAMES.CHAPTER_CHAIR;
}

export function isChapterSecretary(roleName: string): boolean {
  return roleName === ROLE_NAMES.CHAPTER_SECRETARY;
}

export function isChapterViceChair(roleName: string): boolean {
  return roleName === ROLE_NAMES.CHAPTER_VICE_CHAIR;
}

export function canCreateEventProposal(roleName: string): boolean {
  // Workflow 1 Step 1: Chapter Chair / Vice Chair / Secretary
  return isChapterChair(roleName) || isChapterViceChair(roleName) || isChapterSecretary(roleName);
}

export function canAssignProctors(roleName: string): boolean {
  // Workflow 4 Step 1: Student Branch Chair / Student Branch Secretary / Chapter Chair
  return roleName === ROLE_NAMES.SB_CHAIR || roleName === ROLE_NAMES.SB_SECRETARY || roleName === ROLE_NAMES.CHAPTER_CHAIR;
}

export function isTeamHead(roleName: string, teamType: 'documentation' | 'pr' | 'design' | 'coverage'): boolean {
  const map: Record<typeof teamType, string> = {
    documentation: ROLE_NAMES.DOCUMENTATION_HEAD,
    pr: ROLE_NAMES.PR_HEAD,
    design: ROLE_NAMES.DESIGN_HEAD,
    coverage: ROLE_NAMES.COVERAGE_HEAD,
  };
  return roleName === map[teamType];
}

export function getRoleLevel(roleName: string): number {
  const upperName = roleName.toUpperCase();

  // Level 1 - Senior Core & Counsellor
  if (upperName.includes('SB') || upperName.includes('COUNSELLOR')) {
    if (
      (upperName.includes('CHAIR') && !upperName.includes('VICE')) ||
      (upperName.includes('SECRETARY') && !upperName.includes('VICE')) ||
      (upperName.includes('TREASURER') && !upperName.includes('VICE')) ||
      upperName.includes('TECHNICAL') ||
      (upperName.includes('CONVENER') && !upperName.includes('VICE')) ||
      upperName.includes('COUNSELLOR')
    ) {
      return ROLE_LEVELS.SENIOR_CORE;
    }
  }

  // Level 2 - Vice Core
  if (upperName.includes('VICE') && (
    upperName.includes('CHAIR') ||
    upperName.includes('SECRETARY') ||
    upperName.includes('TREASURER') ||
    upperName.includes('TECHNICAL') ||
    upperName.includes('CONVENER')
  )) {
    return ROLE_LEVELS.VICE_CORE;
  }

  // Level 4 - Teams
  if (upperName.includes('HEAD') && (
    upperName.includes('PR') ||
    upperName.includes('DESIGN') ||
    upperName.includes('DOCUMENTATION') ||
    upperName.includes('COVERAGE')
  )) {
    return ROLE_LEVELS.TEAMS;
  }

  // Level 3 - Chapter Leadership (default for chapter roles)
  if (upperName.includes('CHAIR') || upperName.includes('SECRETARY') || upperName.includes('TREASURER')) {
    return ROLE_LEVELS.CHAPTER_LEADERSHIP;
  }

  // Default to execom level
  return ROLE_LEVELS.EXECOM;
}

export function canApproveEvents(roleLevel: number): boolean {
  return roleLevel <= ROLE_LEVELS.SENIOR_CORE;
}

export function isSeniorCore(roleLevel: number): boolean {
  return roleLevel === ROLE_LEVELS.SENIOR_CORE;
}

export function isTreasurer(roleName: string): boolean {
  return roleName.toLowerCase().includes('treasurer') && !roleName.toLowerCase().includes('vice');
}

export function isSecretary(roleName: string): boolean {
  return roleName.toLowerCase().includes('secretary') && !roleName.toLowerCase().includes('vice');
}

export function isCounsellor(roleName: string): boolean {
  return roleName.toLowerCase().includes('counsellor');
}
