import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { canAssignProctors, isChapterChair, ROLE_NAMES } from '@/lib/rbac/roles';

const mappingSchema = z.object({
  proctor_id: z.string().uuid(),
  execom_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = mappingSchema.parse(body);

    const supabase = await createServiceClient();

    const { data: assigner } = await supabase
      .from('users')
      .select('id, chapter_id, role:roles(*)')
      .eq('id', session.userId)
      .single();

    if (!assigner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle role response - it can be an object or array
    const role = Array.isArray((assigner as any)?.role) ? (assigner as any).role[0] : (assigner as any)?.role;
    const assignerRoleName = role?.name;
    
    if (!canAssignProctors(assignerRoleName)) {
      return NextResponse.json(
        { error: 'Permission denied: cannot assign proctors' },
        { status: 403 }
      );
    }

    // Optional scoping: Chapter Chair can only assign within their chapter
    if (isChapterChair(assignerRoleName)) {
      const { data: proctorUser } = await supabase
        .from('users')
        .select('chapter_id')
        .eq('id', validated.proctor_id)
        .single();

      const { data: execomUser } = await supabase
        .from('users')
        .select('chapter_id')
        .eq('id', validated.execom_id)
        .single();

      if (!proctorUser || !execomUser) {
        return NextResponse.json({ error: 'Invalid proctor or execom' }, { status: 400 });
      }

      if (proctorUser.chapter_id !== assigner.chapter_id || execomUser.chapter_id !== assigner.chapter_id) {
        return NextResponse.json(
          { error: 'Chapter Chair can only assign within their chapter' },
          { status: 403 }
        );
      }
    }

    // Check if execom is already assigned to another proctor (Workflow 4: unique execom constraint)
    const { data: existingExecomMapping } = await supabase
      .from('proctor_mappings')
      .select('*')
      .eq('execom_id', validated.execom_id)
      .single();

    if (existingExecomMapping) {
      return NextResponse.json(
        { error: 'This execom is already assigned to another proctor. Each execom can only have one proctor.' },
        { status: 400 }
      );
    }

    // Check current mentee count for proctor (Workflow 4: max 5 execoms per proctor)
    const { count: menteeCount } = await supabase
      .from('proctor_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('proctor_id', validated.proctor_id);

    if (menteeCount !== null && menteeCount >= 5) {
      return NextResponse.json(
        { error: 'Proctor already has maximum 5 mentees. Cannot assign more execoms.' },
        { status: 400 }
      );
    }

    const { data: mapping, error } = await supabase
      .from('proctor_mappings')
      .insert({
        proctor_id: validated.proctor_id,
        execom_id: validated.execom_id,
      })
      .select()
      .single();

    if (error) {
      // Handle database constraint violations with better error messages
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('proctor_mappings_unique_execom')) {
          return NextResponse.json(
            { error: 'This execom is already assigned to another proctor' },
            { status: 400 }
          );
        }
      }
      if (error.code === 'P0001') { // Trigger exception (max 5 mentees)
        return NextResponse.json(
          { error: 'Proctor already has maximum 5 mentees' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ mapping });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to assign proctor mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = mappingSchema.parse(body);

    const supabase = await createServiceClient();

    const { data: assigner } = await supabase
      .from('users')
      .select('id, chapter_id, role:roles(*)')
      .eq('id', session.userId)
      .single();

    if (!assigner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle role response - it can be an object or array
    const role = Array.isArray((assigner as any)?.role) ? (assigner as any).role[0] : (assigner as any)?.role;
    const assignerRoleName = role?.name;
    
    if (!canAssignProctors(assignerRoleName)) {
      return NextResponse.json(
        { error: 'Permission denied: cannot modify proctor mappings' },
        { status: 403 }
      );
    }

    // Chapter Chair can only remove within their chapter
    if (isChapterChair(assignerRoleName)) {
      const { data: execomUser } = await supabase
        .from('users')
        .select('chapter_id')
        .eq('id', validated.execom_id)
        .single();

      if (!execomUser || execomUser.chapter_id !== assigner.chapter_id) {
        return NextResponse.json(
          { error: 'Chapter Chair can only modify within their chapter' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('proctor_mappings')
      .delete()
      .eq('proctor_id', validated.proctor_id)
      .eq('execom_id', validated.execom_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to remove proctor mapping' },
      { status: 500 }
    );
  }
}


