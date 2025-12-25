import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { isSbSecretary } from '@/lib/rbac/roles';
import { z } from 'zod';

const reviewSchema = z.object({
  document_id: z.string().uuid(),
  approved: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    const supabase = await createServiceClient();

    // Verify user is SB Secretary (Workflow 3 Step 3)
    const { data: user } = await supabase
      .from('users')
      .select('*, role:roles(*)')
      .eq('id', session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle role response - it can be an object or array
    const role = Array.isArray((user as any)?.role) ? (user as any).role[0] : (user as any)?.role;
    const roleName = role?.name;

    if (!isSbSecretary(roleName)) {
      return NextResponse.json(
        { error: 'Only Student Branch Secretary can review final documentation' },
        { status: 403 }
      );
    }

    // Event must be in documentation_submitted to be reviewable
    const { data: event } = await supabase
      .from('events')
      .select('status')
      .eq('id', params.id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'documentation_submitted') {
      return NextResponse.json(
        { error: `Event is not awaiting documentation review. Current status: ${event.status}` },
        { status: 400 }
      );
    }

    // Verify document exists, belongs to event, and is a final_document
    const { data: document } = await supabase
      .from('event_documents')
      .select('*')
      .eq('id', validatedData.document_id)
      .eq('event_id', params.id)
      .single();

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or does not belong to this event' },
        { status: 404 }
      );
    }

    if (document.document_type !== 'final_document') {
      return NextResponse.json(
        { error: 'Only final documents can be reviewed by Secretary' },
        { status: 400 }
      );
    }

    // Update document review status
    const { error: updateError } = await supabase
      .from('event_documents')
      .update({
        review_status: validatedData.approved ? 'approved' : 'rejected',
        reviewed_by: session.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedData.document_id);

    if (updateError) {
      throw updateError;
    }

    // If approved, check if we should close the event
    if (validatedData.approved) {
      // Workflow 3 Step 3: approve => CLOSED (terminal)
      await supabase
        .from('events')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Review error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to review document' },
      { status: 500 }
    );
  }
}
