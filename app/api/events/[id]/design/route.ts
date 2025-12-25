import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';

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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, JPG, and PNG files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${params.id}-${Date.now()}.${fileExt}`;
    const filePath = `designs/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
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
        event_id: params.id,
        document_type: 'design_file',
        file_url: urlData.publicUrl,
        uploaded_by: session.userId,
        review_status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Design upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload design file' },
      { status: 500 }
    );
  }
}
