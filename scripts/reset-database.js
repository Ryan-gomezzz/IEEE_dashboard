/**
 * Database Reset Script
 * 
 * WARNING: This script will DELETE ALL DATA from the database!
 * Use with caution - this cannot be undone.
 * 
 * Run with: node scripts/reset-database.js
 * 
 * Make sure to set environment variables in .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables in order of deletion (respecting foreign key constraints)
// Delete child tables first, then parent tables
const TABLES_TO_DELETE = [
  // Child tables first (have foreign keys)
  'notifications',
  'proctor_updates',
  'proctor_mappings',
  'event_documents',
  'event_assignments',
  'event_approvals',
  'calendar_blocks',
  'chapter_documents',
  'events',
  // Parent tables (referenced by others)
  'users',
  'chapters',
  'roles',
];

async function resetDatabase() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
  console.log('Starting database reset...\n');

  try {
    // Disable RLS temporarily for deletion (service role bypasses anyway, but just in case)
    console.log('Deleting data from all tables...\n');

    for (const table of TABLES_TO_DELETE) {
      try {
        // Delete all rows from table
        const { error, count } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)
        
        if (error) {
          // If delete with condition fails, try without condition
          const { error: error2 } = await supabase
            .from(table)
            .delete()
            .gte('created_at', '1970-01-01'); // Another way to delete all
          
          if (error2) {
            console.error(`⚠️  Error deleting from ${table}:`, error2.message);
          } else {
            console.log(`✓ Cleared table: ${table}`);
          }
        } else {
          console.log(`✓ Cleared table: ${table}`);
        }
      } catch (err) {
        console.error(`⚠️  Error with table ${table}:`, err.message);
      }
    }

    // Alternative approach: Use raw SQL to truncate tables (faster and more reliable)
    console.log('\nUsing SQL TRUNCATE for complete reset...\n');
    
    // Truncate in reverse order (child tables first)
    const truncateOrder = [
      'notifications',
      'proctor_updates',
      'proctor_mappings',
      'event_documents',
      'event_assignments',
      'event_approvals',
      'calendar_blocks',
      'chapter_documents',
      'events',
      'users',
      'chapters',
      'roles',
    ];

    // Use RPC or direct SQL execution
    // Since we're using service role, we can use raw SQL
    for (const table of truncateOrder) {
      try {
        // Use Supabase's RPC or execute raw SQL
        // Note: Supabase JS client doesn't support raw SQL directly
        // So we'll use delete with a condition that matches all rows
        const { error } = await supabase
          .from(table)
          .delete()
          .gte('created_at', '1900-01-01'); // Match all dates
        
        if (error) {
          console.error(`⚠️  Could not clear ${table}:`, error.message);
        } else {
          console.log(`✓ Cleared table: ${table}`);
        }
      } catch (err) {
        console.error(`⚠️  Error truncating ${table}:`, err.message);
      }
    }

    console.log('\n✅ Database reset complete!');
    console.log('\nNext steps:');
    console.log('1. Run the seed script to populate with fresh data:');
    console.log('   node scripts/seed-database.js');
    console.log('\n2. Or manually create users and data as needed.');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n⚠️  Are you sure you want to DELETE ALL DATA? Type "RESET" to confirm: ', (answer) => {
  if (answer === 'RESET') {
    rl.close();
    resetDatabase();
  } else {
    console.log('Reset cancelled.');
    rl.close();
    process.exit(0);
  }
});

