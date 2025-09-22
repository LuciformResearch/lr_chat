import { NextRequest, NextResponse } from 'next/server';
import {
  renameSession,
  deleteSession,
} from '@/lib/db/repo';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

interface RouteParams {
  params: { sessionId: string };
}

/**
 * PUT /api/sessions/[sessionId]
 * Renames a specific session.
 * Body: { title: string }
 * Protected by authentication middleware.
 */
export const PUT = withAuth(async (request: NextRequest, context: RouteParams) => {
  const { sessionId } = await context.params;
  try {
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const updatedSession = await renameSession(sessionId, title);
    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error(`Failed to update session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
});

/**
 * DELETE /api/sessions/[sessionId]
 * Deletes a specific session with complete cleanup (messages, embeddings, archivist memories).
 * Protected by authentication middleware.
 */
export const DELETE = withAuth(async (request: NextRequest, context: RouteParams) => {
  const { sessionId } = await context.params;
  try {
    await deleteSession(sessionId);
    return NextResponse.json({ message: `Session ${sessionId} deleted successfully` }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
});
