import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { isSbSecretary } from '@/lib/rbac/roles';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const eventId = params.id;
        const body = await request.json();
        const { document_id, status } = body;

        if (!document_id || !status || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid request parameters' },
                { status: 400 }
            );
        }

        const supabase = await createServiceClient();

        // Verify User Role (Must be SB Secretary) (Workflow 3 Step 3)
        const { data: user } = await supabase
            .from('users')
            .select('*, role:roles(*)')
            .eq('id', session.userId)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!isSbSecretary(user.role.name)) {
            return NextResponse.json(
                { error: 'Permission denied. Only Student Branch Secretary can review documents.' },
                { status: 403 }
            );
        }

        // Event must be awaiting review
        const { data: event } = await supabase
            .from('events')
            .select('status')
            .eq('id', eventId)
            .single();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (event.status !== 'documentation_submitted') {
            return NextResponse.json(
                { error: 'Event is not awaiting documentation review' },
                { status: 400 }
            );
        }

        // Update Document Status
        const { data: document, error: docError } = await supabase
            .from('event_documents')
            .update({
                review_status: status,
                reviewed_by: session.userId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', document_id)
            .select()
            .single();

        if (docError) {
            throw docError;
        }

        // IF Approved AND Final Document -> Close Event
        if (status === 'approved' && document.document_type === 'final_document') {
            // Close the event
            await supabase
                .from('events')
                .update({ status: 'closed' })
                .eq('id', eventId)
                .select()
                .single();
        }

        return NextResponse.json({ success: true, document });
    } catch (error: any) {
        console.error('Document review error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to review document' },
            { status: 500 }
        );
    }
}
