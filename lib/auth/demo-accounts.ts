import bcrypt from 'bcryptjs';

export interface DemoAccount {
  email: string;
  name: string;
  password: string;
  roleName: string;
  chapterCode: string | null;
}

// All demo accounts use password: 12345
export const DEMO_PASSWORD = '12345';
const PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'sb.chair@ieee.org',
    name: 'SB Chair',
    password: DEMO_PASSWORD,
    roleName: 'SB Chair',
    chapterCode: 'SB',
  },
  {
    email: 'sb.secretary@ieee.org',
    name: 'SB Secretary',
    password: DEMO_PASSWORD,
    roleName: 'SB Secretary',
    chapterCode: 'SB',
  },
  {
    email: 'sb.treasurer@ieee.org',
    name: 'SB Treasurer',
    password: DEMO_PASSWORD,
    roleName: 'SB Treasurer',
    chapterCode: 'SB',
  },
  {
    email: 'sb.technical@ieee.org',
    name: 'SB Technical Head',
    password: DEMO_PASSWORD,
    roleName: 'SB Technical Head',
    chapterCode: 'SB',
  },
  {
    email: 'sb.convener@ieee.org',
    name: 'SB Convener',
    password: DEMO_PASSWORD,
    roleName: 'SB Convener',
    chapterCode: 'SB',
  },
  {
    email: 'ras.chair@ieee.org',
    name: 'RAS Chair',
    password: DEMO_PASSWORD,
    roleName: 'RAS Chair',
    chapterCode: 'RAS',
  },
  {
    email: 'cs.chair@ieee.org',
    name: 'CS Chair',
    password: DEMO_PASSWORD,
    roleName: 'CS Chair',
    chapterCode: 'CS',
  },
  {
    email: 'pr.head@ieee.org',
    name: 'PR Head',
    password: DEMO_PASSWORD,
    roleName: 'PR Head',
    chapterCode: null,
  },
  {
    email: 'design.head@ieee.org',
    name: 'Design Head',
    password: DEMO_PASSWORD,
    roleName: 'Design Head',
    chapterCode: null,
  },
  {
    email: 'documentation.head@ieee.org',
    name: 'Documentation Head',
    password: DEMO_PASSWORD,
    roleName: 'Documentation Head',
    chapterCode: null,
  },
];

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string = DEMO_PASSWORD): Promise<string> {
  return bcrypt.hash(password, 10);
}
