# IEEE RIT-B Unified Operations Dashboard

Enterprise-grade internal operations platform for IEEE RIT-B Student Branch.

## Features

- **Unified Calendar System**: Avoid event clashes across 12 IEEE societies
- **Event Approval Workflow**: Multi-stage approval process (Senior Core → Treasurer → Branch Counsellor)
- **Team Notifications & Assignments**: Assign execoms to events and notify team heads
- **Event Documentation Lifecycle**: Complete documentation workflow with secretary review
- **Proctor System**: Track execom productivity with bi-weekly updates
- **Chapter Document Repository**: Store and manage Minutes of Meet and Weekly Reports
- **Role-Based Access Control**: 5-level access hierarchy with granular permissions

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Supabase
- **Styling**: Tailwind CSS
- **Authentication**: Session-based (demo accounts)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Environment variables configured

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SESSION_SECRET=your_random_session_secret_here
```

### 3. Set Up Supabase Database

1. Create a new Supabase project
2. Go to SQL Editor in Supabase dashboard
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`
4. Create a storage bucket named `event-documents` with public access

### 4. Seed Database

Run the seeding script to populate chapters, roles, and demo users:

```bash
# Install ts-node if needed
npm install -g ts-node

# Run seed script
npx ts-node scripts/seed-database.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and you'll be redirected to the login page.

## Demo Accounts

All demo accounts use password: **12345**

- `sb.chair@ieee.org` - SB Chair
- `sb.secretary@ieee.org` - SB Secretary
- `sb.treasurer@ieee.org` - SB Treasurer
- `sb.technical@ieee.org` - SB Technical Head
- `sb.convener@ieee.org` - SB Convener
- `ras.chair@ieee.org` - RAS Chair
- `cs.chair@ieee.org` - CS Chair
- `pr.head@ieee.org` - PR Head
- `design.head@ieee.org` - Design Head
- `documentation.head@ieee.org` - Documentation Head

## Project Structure

```
/app
  /(auth)           # Authentication pages
  /(dashboard)      # Protected dashboard pages
  /api              # API routes
/components         # React components
  /ui               # Base UI components
  /layout           # Layout components
  /dashboard        # Dashboard widgets
  /events           # Event-related components
  /approvals        # Approval components
  /assignments      # Assignment components
  /proctor          # Proctor components
/lib                # Utility libraries
  /auth             # Authentication utilities
  /rbac             # Role-based access control
  /supabase         # Supabase clients
  /events           # Event service logic
  /calendar         # Calendar service logic
  /notifications    # Notification service
/supabase           # Database migrations
/scripts            # Utility scripts
```

## Key Features Explained

### Event Approval Workflow

1. Chapter proposes event (minimum 10 days in advance)
2. 2 Senior Core members must approve
3. Treasurer must approve
4. Branch Counsellor must approve (can be bypassed in demo)
5. Event marked as APPROVED
6. Team heads notified automatically

### Calendar System

- Maximum 2 events per day
- 10-day advance requirement enforced
- Visual indicators for blocked dates
- Chapter name and event type displayed

### Documentation Lifecycle

1. Documentation team uploads final document
2. Secretary reviews document
3. On approval, event status changes to CLOSED
4. Event archived

## Security

- Role-based access control (RBAC) throughout
- API route protection with session validation
- Input validation with Zod schemas
- File upload restrictions (type and size)
- Secure file storage in Supabase Storage

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Notes

- This is a demo system with hardcoded accounts
- Branch Counsellor approval can be bypassed in demo mode
- File uploads require Supabase Storage bucket setup
- RLS policies should be configured in Supabase for production

## License

Private - IEEE RIT-B Student Branch Internal Use
