/**
 * Database Seeding Script
 * 
 * This script seeds the database with:
 * - Chapters
 * - Roles
 * - Demo users (with hashed passwords)
 * 
 * Run this script after setting up your Supabase database and running migrations.
 * 
 * Usage: npx ts-node scripts/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { DEMO_ACCOUNTS } from '../lib/auth/demo-accounts';
import { getRoleLevel } from '../lib/rbac/roles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CHAPTERS = [
  { name: 'Student Branch', code: 'SB' },
  { name: 'Robotics and Automation Society', code: 'RAS' },
  { name: 'Computer Society', code: 'CS' },
  { name: 'Power and Energy Society', code: 'PES' },
  { name: 'Communications Society', code: 'COM' },
  { name: 'Women in Engineering', code: 'WIE' },
  { name: 'Aerospace and Electronic Systems', code: 'AES' },
  { name: 'Signal Processing Society', code: 'SPS' },
  { name: 'Circuits and Systems', code: 'CAS' },
  { name: 'Control Systems Society', code: 'CSS' },
  { name: 'Engineering in Medicine and Biology', code: 'EMB' },
  { name: 'Instrumentation and Measurement', code: 'IM' },
];

const ROLES = [
  // Level 1 - Senior Core
  { name: 'SB Chair', level: 1 },
  { name: 'SB Secretary', level: 1 },
  { name: 'SB Treasurer', level: 1 },
  { name: 'SB Technical Head', level: 1 },
  { name: 'SB Convener', level: 1 },
  
  // Level 2 - Vice Core
  { name: 'Vice Chair', level: 2 },
  { name: 'Vice Secretary', level: 2 },
  { name: 'Vice Treasurer', level: 2 },
  { name: 'Vice Technical Head', level: 2 },
  { name: 'Vice Convener', level: 2 },
  
  // Level 3 - Chapter Leadership
  { name: 'RAS Chair', level: 3 },
  { name: 'CS Chair', level: 3 },
  { name: 'PES Chair', level: 3 },
  { name: 'COM Chair', level: 3 },
  { name: 'WIE Chair', level: 3 },
  { name: 'AES Chair', level: 3 },
  { name: 'SPS Chair', level: 3 },
  { name: 'CAS Chair', level: 3 },
  { name: 'CSS Chair', level: 3 },
  { name: 'EMB Chair', level: 3 },
  { name: 'IM Chair', level: 3 },
  
  // Level 4 - Teams
  { name: 'PR Head', level: 4 },
  { name: 'Design Head', level: 4 },
  { name: 'Documentation Head', level: 4 },
  { name: 'Coverage Head', level: 4 },
  
  // Level 5 - Execom
  { name: 'Execom Member', level: 5 },
];

async function seedChapters() {
  console.log('Seeding chapters...');
  for (const chapter of CHAPTERS) {
    const { error } = await supabase
      .from('chapters')
      .upsert(chapter, { onConflict: 'code' });
    
    if (error) {
      console.error(`Error seeding chapter ${chapter.name}:`, error);
    } else {
      console.log(`✓ Seeded chapter: ${chapter.name}`);
    }
  }
}

async function seedRoles() {
  console.log('Seeding roles...');
  for (const role of ROLES) {
    const { error } = await supabase
      .from('roles')
      .upsert(role, { onConflict: 'name' });
    
    if (error) {
      console.error(`Error seeding role ${role.name}:`, error);
    } else {
      console.log(`✓ Seeded role: ${role.name}`);
    }
  }
}

async function seedUsers() {
  console.log('Seeding demo users...');
  
  for (const account of DEMO_ACCOUNTS) {
    // Get role
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', account.roleName)
      .single();

    if (!role) {
      console.error(`Role not found: ${account.roleName}`);
      continue;
    }

    // Get chapter if needed
    let chapterId = null;
    if (account.chapterCode) {
      const { data: chapter } = await supabase
        .from('chapters')
        .select('id')
        .eq('code', account.chapterCode)
        .single();
      
      if (chapter) {
        chapterId = chapter.id;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(account.password, 10);

    const { error } = await supabase
      .from('users')
      .upsert({
        email: account.email,
        name: account.name,
        password_hash: passwordHash,
        role_id: role.id,
        chapter_id: chapterId,
      }, { onConflict: 'email' });

    if (error) {
      console.error(`Error seeding user ${account.email}:`, error);
    } else {
      console.log(`✓ Seeded user: ${account.name} (${account.email})`);
    }
  }
}

async function main() {
  console.log('Starting database seeding...\n');
  
  try {
    await seedChapters();
    console.log('');
    await seedRoles();
    console.log('');
    await seedUsers();
    console.log('');
    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
