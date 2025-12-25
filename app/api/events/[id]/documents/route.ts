import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { createSecretaryNotification } from '@/lib/notifications/notification-service';
import { isTeamHead } from '@/lib/rbac/roles';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireAuth();
        const eventId = params.id;
        const formData = await request.formData();

        const file = formData.get('file') as File;
        const documentType = formData.get('document_type') as string;

        if (!file || !documentType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!['final_document', 'design_file'].includes(documentType)) {
            return NextResponse.json(
                { error: 'Invalid document type' },
                { status: 400 }
            );
        }

        const allowedTypes =
            documentType === 'final_document'
                ? new Set(['application/pdf'])
                : new Set(['application/pdf', 'image/jpeg', 'image/png']);

        if (!allowedTypes.has(file.type)) {
            return NextResponse.json(
                { error: documentType === 'final_document' ? 'Only PDF files are allowed' : 'Only PDF/JPG/PNG files are allowed' },
                { status: 400 }
            );
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size must be less than 10MB' },
                { status: 400 }
            );
        }

        const supabase = await createServiceClient();

        // Role enforcement for design uploads (Workflow 2)
        if (documentType === 'design_file') {
            const { data: uploader } = await supabase
                .from('users')
                .select('id, role:roles(*)')
                .eq('id', session.userId)
                .single();

            if (!uploader) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Handle role response - it can be an object or array
            const role = Array.isArray((uploader as any)?.role) ? (uploader as any).role[0] : (uploader as any)?.role;
            const uploaderRoleName = role?.name;
            if (!isTeamHead(uploaderRoleName, 'design')) {
                return NextResponse.json(
                    { error: 'Only Design Head can upload design files' },
                    { status: 403 }
                );
            }
        }

        // Verify event exists and belongs to user's chapter (or user is authorized)
        const { data: event } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Workflow enforcement:
        // - design_file: allowed for approved/documentation_submitted
        // - final_document: only when approved (it transitions event -> documentation_submitted)
        if (documentType === 'design_file') {
            if (!['approved', 'documentation_submitted'].includes(event.status)) {
                return NextResponse.json(
                    { error: 'Event must be approved before uploading design files' },
                    { status: 400 }
                );
            }
        } else if (documentType === 'final_document') {
            if (event.status !== 'approved') {
                return NextResponse.json(
                    { error: 'Event must be approved before uploading final documentation' },
                    { status: 400 }
                );
            }

            // Workflow 3 Step 2: Only assigned Documentation Execom can upload final report
            const { data: assignment } = await supabase
                .from('event_assignments')
                .select('*')
                .eq('event_id', eventId)
                .eq('team_type', 'documentation')
                .eq('assigned_to', session.userId)
                .single();

            if (!assignment) {
                return NextResponse.json(
                    { error: 'Only the assigned Documentation Execom can upload the final report' },
                    { status: 403 }
                );
            }
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
        const fileName = `${eventId}/${documentType}-${Date.now()}.${ext}`;
        const filePath = `events/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('event-documents')
            .upload(filePath, buffer, {
                contentType: file.type,
            });

        if (uploadError) {
            throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('event-documents')
            .getPublicUrl(filePath);

        // Create document record
        const { data: document, error: docError } = await supabase
            .from('event_documents')
            .insert({
                event_id: eventId,
                document_type: documentType,
                file_url: urlData.publicUrl,
                uploaded_by: session.userId,
                review_status: 'pending',
            })
            .select()
            .single();

        if (docError) {
            throw docError;
        }

        // If Final Document, notify Secretary
        if (documentType === 'final_document') {
            await createSecretaryNotification(eventId, event.title);

            // Workflow 3 Step 2: move event into DOCUMENTATION_SUBMITTED
            await supabase
                .from('events')
                .update({ status: 'documentation_submitted', updated_at: new Date().toISOString() })
                .eq('id', eventId);
        }

        return NextResponse.json({ document });
    } catch (error: any) {
        console.error('Document upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload document' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAuth();
        const eventId = params.id;

        const supabase = await createServiceClient();
        const { data: documents, error } = await supabase
            .from('event_documents')
            .select('*, uploaded_by:users!uploaded_by(*), reviewed_by:users!reviewed_by(*)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ documents: documents || [] });
    } catch (error: any) {
        console.error('Get documents error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch documents' },
            { status: 500 }
        );
    }
}
