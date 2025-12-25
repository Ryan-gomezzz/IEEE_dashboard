# IEEE RIT-B Dashboard Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials

3. **Set up Supabase database**
   - Run the SQL migration: `supabase/migrations/001_initial_schema.sql`
   - Create storage bucket: `event-documents` (public access)

4. **Seed the database**
   ```bash
   # Using JavaScript version (no TypeScript compilation needed)
   node scripts/seed-database.js
   
   # OR using TypeScript version
   npx ts-node scripts/seed-database.ts
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Database Schema

The migration creates:
- 12 tables (users, roles, chapters, events, approvals, etc.)
- Enums for event types, statuses, and approval types
- Indexes for performance
- Triggers for automatic timestamp updates

## Demo Accounts

All accounts use password: **12345**

- sb.chair@ieee.org (SB Chair)
- sb.secretary@ieee.org (SB Secretary)
- sb.treasurer@ieee.org (SB Treasurer)
- sb.technical@ieee.org (SB Technical Head)
- sb.convener@ieee.org (SB Convener)
- ras.chair@ieee.org (RAS Chair)
- cs.chair@ieee.org (CS Chair)
- pr.head@ieee.org (PR Head)
- design.head@ieee.org (Design Head)
- documentation.head@ieee.org (Documentation Head)

## Features Implemented

✅ Authentication with demo accounts
✅ Role-based access control (5 levels)
✅ Unified calendar system
✅ Event proposal and approval workflow
✅ Team notifications and assignments
✅ Event documentation lifecycle
✅ Proctor system for tracking execom productivity
✅ Chapter document repository
✅ Dashboard with notifications
✅ Profile page

## Important Notes

- For production, configure Row Level Security (RLS) policies in Supabase
- Branch Counsellor approval can be bypassed in demo mode
- File uploads require Supabase Storage bucket setup
- Calendar blocking logic enforces 2 events per day maximum
- 10-day advance requirement is enforced for event proposals

## Troubleshooting

**Migration errors:**
- Ensure PostgreSQL extensions are enabled
- Check that you have proper database permissions

**Authentication errors:**
- Verify Supabase credentials are correct
- Check that users table exists and is populated

**File upload errors:**
- Ensure storage bucket `event-documents` exists
- Check bucket permissions (should be public for demo)
