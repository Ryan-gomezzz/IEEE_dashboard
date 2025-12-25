# Supabase Setup Guide - Step by Step

This guide will walk you through getting your Supabase credentials and setting up the database.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Organization**: Select or create one
   - **Name**: e.g., "ieee-rit-b-dashboard"
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project" (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is created:

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click on **API** in the settings menu
3. You'll see three important values:

### a) Project URL
- Location: **Project URL** section at the top
- Looks like: `https://xxxxxxxxxxxxx.supabase.co`
- Copy this value

### b) Anon/Public Key
- Location: **Project API keys** section
- Find the key labeled **`anon` `public`**
- Click the eye icon to reveal it
- Copy this value (it's a long string starting with `eyJ...`)

### c) Service Role Key
- Location: **Project API keys** section (same section)
- Find the key labeled **`service_role` `secret`**
- ⚠️ **WARNING**: This key has admin privileges!
- Click the eye icon to reveal it
- Copy this value (also starts with `eyJ...`)

## Step 3: Create .env.local File

1. In your project root (`C:\IEEE_Dashboard`), create a file named `.env.local`
2. Copy the template below and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0IiwiYXVkIjoiYXBpIiwiaWF0IjoxNjE2MjM5MDIyfQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0IiwiYXVkIjoiYXBpIiwiaWF0IjoxNjE2MjM5MDIyfQ.example
SESSION_SECRET=generate-a-random-string-here
```

### Generate SESSION_SECRET (optional but recommended)

Run this command in your terminal to generate a secure random string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or use any random string generator. This is used for session encryption.

## Step 4: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from your project
4. Copy the entire contents of that file
5. Paste into the SQL Editor
6. Click **Run** (or press F5)
7. You should see "Success. No rows returned" - this means it worked!

## Step 5: Create Storage Bucket

1. In Supabase dashboard, go to **Storage** (left sidebar)
2. Click **New Bucket**
3. Name it: `event-documents`
4. Make it **Public** (toggle should be ON)
5. Click **Create Bucket**

## Step 6: Seed the Database

Now that your `.env.local` is configured, run the seeding script:

### Option 1: Using JavaScript (Recommended)
```bash
node scripts/seed-database.js
```

### Option 2: Using TypeScript
```bash
npx ts-node scripts/seed-database.ts
```

**What this does:**
- Creates all 12 chapters (SB, RAS, CS, etc.)
- Creates all roles (SB Chair, Secretary, Treasurer, etc.)
- Creates 10 demo user accounts (all with password: `12345`)

**Expected output:**
```
Starting database seeding...

Seeding chapters...
✓ Seeded chapter: Student Branch
✓ Seeded chapter: Robotics and Automation Society
...

Seeding roles...
✓ Seeded role: SB Chair
✓ Seeded role: SB Secretary
...

Seeding demo users...
✓ Seeded user: SB Chair (sb.chair@ieee.org)
✓ Seeded user: SB Secretary (sb.secretary@ieee.org)
...

Database seeding completed!

All demo accounts use password: 12345
```

## Step 7: Verify Setup

1. In Supabase dashboard, go to **Table Editor** (left sidebar)
2. You should see tables: `chapters`, `roles`, `users`, `events`, etc.
3. Click on `users` table - you should see 10 rows
4. Click on `chapters` table - you should see 12 rows
5. Click on `roles` table - you should see all role definitions

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` file exists in the project root
- Check that all three values are filled in (no `your_...` placeholders)
- Make sure there are no spaces around the `=` sign
- Restart your terminal/command prompt after creating `.env.local`

### "relation does not exist" errors
- Make sure you ran the migration SQL script first
- Check the SQL Editor for any error messages
- Verify tables exist in Table Editor

### "permission denied" errors
- Make sure you copied the correct keys
- Service Role Key should be used for seeding (has admin access)
- Check that your Supabase project is active (not paused)

### Storage bucket errors
- Make sure bucket name is exactly `event-documents`
- Verify bucket is set to Public
- Check bucket exists in Storage section

## Quick Reference: Where to Find Credentials

**Supabase Dashboard → Project Settings → API:**
- **Project URL**: Top of the page
- **anon key**: In "Project API keys" section (labeled `anon` `public`)
- **service_role key**: In "Project API keys" section (labeled `service_role` `secret`)

## Security Notes

⚠️ **Never commit `.env.local` to Git!** It's already in `.gitignore`.

⚠️ **Service Role Key** has full admin access - only use it:
- In server-side code
- For seeding scripts
- Never expose it to the browser/client-side code



