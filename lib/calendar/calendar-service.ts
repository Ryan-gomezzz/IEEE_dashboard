import { createServiceClient } from '@/lib/supabase/server';
import { addDays, format, parseISO } from 'date-fns';

export async function checkDateAvailability(date: Date): Promise<{ available: boolean; reason?: string }> {
  const supabase = await createServiceClient();
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Calendar locking is driven by APPROVED events only (Workflow 6)
  // We prefer calendar_blocks for performance but fallback to a direct count for safety.
  const { data: block } = await supabase
    .from('calendar_blocks')
    .select('*')
    .eq('event_date', dateStr)
    .single();

  const blockCount = block?.event_count ?? null;

  let approvedCount = blockCount;
  if (approvedCount === null) {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('proposed_date', dateStr)
      .eq('status', 'approved');

    if (error) throw error;
    approvedCount = count ?? 0;
  }

  if (approvedCount >= 2) {
    return { available: false, reason: 'Maximum 2 events per day limit reached' };
  }

  return { available: true };
}

export async function validateTenDayAdvance(proposedDate: Date): Promise<{ valid: boolean; reason?: string }> {
  const today = new Date();
  const minDate = addDays(today, 10);
  
  if (proposedDate < minDate) {
    return {
      valid: false,
      reason: `Events must be proposed at least 10 days in advance. Earliest date: ${format(minDate, 'yyyy-MM-dd')}`,
    };
  }

  return { valid: true };
}

export async function updateCalendarBlock(date: Date, increment: boolean = true) {
  const supabase = await createServiceClient();
  const dateStr = format(date, 'yyyy-MM-dd');

  // Get current block or create new one
  const { data: existingBlock } = await supabase
    .from('calendar_blocks')
    .select('*')
    .eq('event_date', dateStr)
    .single();

  const newCount = (existingBlock?.event_count || 0) + (increment ? 1 : -1);
  const blocked = newCount >= 2;

  if (existingBlock) {
    await supabase
      .from('calendar_blocks')
      .update({
        event_count: newCount,
        blocked,
        updated_at: new Date().toISOString(),
      })
      .eq('event_date', dateStr);
  } else {
    await supabase
      .from('calendar_blocks')
      .insert({
        event_date: dateStr,
        event_count: newCount,
        blocked,
      });
  }
}

export async function getCalendarEvents(startDate: Date, endDate: Date) {
  const supabase = await createServiceClient();
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data: events, error } = await supabase
    .from('events')
    .select('*, chapter:chapters(*)')
    .gte('proposed_date', startStr)
    .lte('proposed_date', endStr)
    // Workflow 6: calendar shows ONLY APPROVED events
    .eq('status', 'approved')
    .order('proposed_date', { ascending: true });

  if (error) {
    throw error;
  }

  return events || [];
}
