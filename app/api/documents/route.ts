import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isChapterChair, isChapterSecretary } from '@/lib/rbac/roles';

const uploadSchema = z.object({
  title: z.string().min(1),
  document_type: z.enum(['minutes', 'weekly_report']),
  document_date: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const title = formData.get('title');
    const documentType = formData.get('document_type');
    const documentDate = formData.get('document_date');

    if (!file || !title || !documentType || !documentDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validated = uploadSchema.parse({
      title: String(title),
      document_type: String(documentType),
      document_date: String(documentDate),
    });

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

    // Get user's chapter
    const { data: user } = await supabase
      .from('users')
      .select('chapter_id, role:roles(name)')
      .eq('id', session.userId)
      .single();

    if (!user?.chapter_id) {
      return NextResponse.json(
        { error: 'User must be associated with a chapter' },
        { status: 400 }
      );
    }

    // Workflow 5 Step 1: only Chapter Chair / Secretary can upload
    const roleName = (user as any)?.role?.name ?? (user as any)?.role?.[0]?.name;
    if (!isChapterChair(roleName) && !isChapterSecretary(roleName)) {
      return NextResponse.json(
        { error: 'Only Chapter Chair / Secretary can upload chapter documents' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${user.chapter_id}-${Date.now()}.pdf`;
    const filePath = `chapter-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
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
      .from('chapter_documents')
      .insert({
        chapter_id: user.chapter_id,
        document_type: validated.document_type,
        title: validated.title,
        file_url: urlData.publicUrl,
        uploaded_by: session.userId,
        document_date: validated.document_date,
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const chapterId = searchParams.get('chapter_id');
    const documentType = searchParams.get('document_type');

    const supabase = await createServiceClient();
    let query = supabase
      .from('chapter_documents')
      .select('*, chapter:chapters(*), uploaded_by_user:users!chapter_documents_uploaded_by_fkey(*)')
      .order('created_at', { ascending: false });

    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    }

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    const { data: documents, error } = await query;

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
