import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { verifyPassword } from '@/lib/auth/demo-accounts';
import { createSession } from '@/lib/auth/session';
import { getRoleLevel } from '@/lib/rbac/roles';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const supabase = await createServiceClient();
    
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, role:roles(*), chapter:chapters(*)')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const roleLevel = getRoleLevel(user.role.name);
    await createSession(user, user.role.name, roleLevel);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleName: user.role.name,
        roleLevel,
        chapterId: user.chapter_id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
