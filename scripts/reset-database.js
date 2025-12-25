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
    // Delete in correct order (child tables first to respect foreign keys)
    console.log('Deleting data from all tables...\n');

    for (const table of TABLES_TO_DELETE) {
      try {
        // First, try to get count of rows
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (count === 0) {
          console.log(`✓ Table ${table} is already empty`);
          continue;
        }

        // Delete all rows - use a condition that matches all rows
        // We'll delete in batches if needed, but try all at once first
        const { error } = await supabase
          .from(table)
          .delete()
          .gte('created_at', '1900-01-01'); // Match all dates (should match all rows)
        
        if (error) {
          // If that fails, try deleting without condition (some Supabase versions support this)
          const { error: error2 } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Always true condition
          
          if (error2) {
            console.error(`⚠️  Error deleting from ${table}:`, error2.message);
            console.error(`   You may need to run the SQL script directly in Supabase SQL Editor`);
            continue;
          }
        }
        
        // Verify deletion
        const { count: remainingCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (remainingCount === 0) {
          console.log(`✓ Cleared table: ${table} (${count} rows deleted)`);
        } else {
          console.log(`⚠️  Table ${table} still has ${remainingCount} rows remaining`);
          console.log(`   You may need to run the SQL script directly in Supabase SQL Editor`);
        }
      } catch (err) {
        console.error(`⚠️  Error with table ${table}:`, err.message);
        console.error(`   You may need to run the SQL script directly in Supabase SQL Editor`);
      }
    }

    console.log('\n✅ Database reset complete!');
    console.log('\n📝 Note: If some tables still have data, use the SQL script instead:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy and paste contents of scripts/reset-database.sql');
    console.log('   3. Run the SQL script');
    console.log('\nNext steps:');
    console.log('1. Run the seed script to populate with fresh data:');
    console.log('   node scripts/seed-database.js');
    console.log('\n2. Or manually create users and data as needed.');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    console.error('\n💡 Try using the SQL script instead:');
    console.error('   1. Open Supabase Dashboard → SQL Editor');
    console.error('   2. Copy and paste contents of scripts/reset-database.sql');
    console.error('   3. Run the SQL script');
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

