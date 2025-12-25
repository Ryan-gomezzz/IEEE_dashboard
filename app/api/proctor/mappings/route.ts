import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { canAssignProctors, ROLE_NAMES } from '@/lib/rbac/roles';

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
      .select('id, chapter_id, role:roles(name)')
      .eq('id', session.userId)
      .single();

    if (!assigner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const assignerRoleName = (assigner as any)?.role?.name ?? (assigner as any)?.role?.[0]?.name;
    if (!canAssignProctors(assignerRoleName)) {
      return NextResponse.json(
        { error: 'Permission denied: cannot assign proctors' },
        { status: 403 }
      );
    }

    // Optional scoping: Chapter Chair can only assign within their chapter
    if (assignerRoleName === ROLE_NAMES.CHAPTER_CHAIR) {
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

    const { data: mapping, error } = await supabase
      .from('proctor_mappings')
      .insert({
        proctor_id: validated.proctor_id,
        execom_id: validated.execom_id,
      })
      .select()
      .single();

    if (error) {
      // Unique constraints / max-5 trigger bubble up here
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
      .select('id, chapter_id, role:roles(name)')
      .eq('id', session.userId)
      .single();

    if (!assigner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const assignerRoleName = (assigner as any)?.role?.name ?? (assigner as any)?.role?.[0]?.name;
    if (!canAssignProctors(assignerRoleName)) {
      return NextResponse.json(
        { error: 'Permission denied: cannot modify proctor mappings' },
        { status: 403 }
      );
    }

    // Chapter Chair can only remove within their chapter
    if (assignerRoleName === ROLE_NAMES.CHAPTER_CHAIR) {
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


