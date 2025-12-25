import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { createSecretaryNotification } from '@/lib/notifications/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
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

    // Verify event exists and is APPROVED
    const { data: event } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('id', params.id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

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
      .eq('event_id', params.id)
      .eq('team_type', 'documentation')
      .eq('assigned_to', session.userId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: 'Only the assigned Documentation Execom can upload the final report' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${params.id}-${Date.now()}.pdf`;
    const filePath = `documentation/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
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
        event_id: params.id,
        document_type: 'final_document',
        file_url: urlData.publicUrl,
        uploaded_by: session.userId,
        review_status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    // Workflow 3 Step 2: move event into DOCUMENTATION_SUBMITTED
    await supabase
      .from('events')
      .update({ status: 'documentation_submitted', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    // Notify SB Secretary for review
    await createSecretaryNotification(params.id, event.title);

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Documentation upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload documentation' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const supabase = await createServiceClient();

    const { data: documents, error } = await supabase
      .from('event_documents')
      .select('*, uploaded_by_user:users!event_documents_uploaded_by_fkey(*)')
      .eq('event_id', params.id)
      .eq('document_type', 'final_document')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error: any) {
    console.error('Get documentation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documentation' },
      { status: 500 }
    );
  }
}
