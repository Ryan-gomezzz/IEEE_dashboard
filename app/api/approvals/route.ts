import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { submitApproval, getEventApprovalStatus } from '@/lib/events/event-service';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isBranchCounsellor, isSbTreasurer, isSeniorCoreApprover } from '@/lib/rbac/roles';

const approvalSchema = z.object({
  event_id: z.string().uuid(),
  approval_type: z.enum(['senior_core', 'treasurer', 'counsellor']),
  status: z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validatedData = approvalSchema.parse(body);

    // Verify user has permission to approve this type
    const supabase = await createServiceClient();
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
    const roleName = role?.name as string;
    const canApprove =
      (validatedData.approval_type === 'senior_core' && isSeniorCoreApprover(roleName)) ||
      (validatedData.approval_type === 'treasurer' && isSbTreasurer(roleName)) ||
      (validatedData.approval_type === 'counsellor' && isBranchCounsellor(roleName));

    if (!canApprove) {
      return NextResponse.json(
        { error: 'You do not have permission to approve this type of approval' },
        { status: 403 }
      );
    }

    // Additional validation: ensure user has an approval record for this event
    const { data: approvalRecord } = await supabase
      .from('event_approvals')
      .select('*')
      .eq('event_id', validatedData.event_id)
      .eq('approver_id', session.userId)
      .eq('approval_type', validatedData.approval_type)
      .single();

    if (!approvalRecord) {
      return NextResponse.json(
        { error: 'No approval record found for this event. You are not assigned to approve this event.' },
        { status: 403 }
      );
    }

    await submitApproval({
      ...validatedData,
      approver_id: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit approval' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const approvalType = searchParams.get('type');
    const status = searchParams.get('status') || 'pending';

    const supabase = await createServiceClient();
    const { data: user } = await supabase
      .from('users')
      .select('*, role:roles(*)')
      .eq('id', session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let query = supabase
      .from('event_approvals')
      .select('*, event:events(*, chapter:chapters(*)), approver:users(*)')
      .eq('status', status);

    if (approvalType) {
      query = query.eq('approval_type', approvalType);
    }

    // Filter by user's allowed approval type (strict workflow roles)
    // Handle role response - it can be an object or array
    const role = Array.isArray((user as any)?.role) ? (user as any).role[0] : (user as any)?.role;
    const roleName = role?.name as string;
    if (isSeniorCoreApprover(roleName)) {
      query = query.eq('approval_type', 'senior_core');
    } else if (isSbTreasurer(roleName)) {
      query = query.eq('approval_type', 'treasurer');
    } else if (isBranchCounsellor(roleName)) {
      query = query.eq('approval_type', 'counsellor');
    } else {
      // Not an approver role -> can never have approvals
      return NextResponse.json({ approvals: [] });
    }
    
    // Always filter by approver_id to show only approvals for this user
    query = query.eq('approver_id', session.userId);

    const { data: approvals, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ approvals: approvals || [] });
  } catch (error: any) {
    console.error('Get approvals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
