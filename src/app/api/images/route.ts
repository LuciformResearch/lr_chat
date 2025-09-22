import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { generated_images } from '@/lib/db/schema';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { eq, desc } from 'drizzle-orm';

/**
 * POST /api/images
 * Sauvegarde une image générée
 * Body: { sessionId, messageId, authUserId (alias: userId), prompt, enhancedPrompt, imageData, imageUrl, mimeType, sizeBytes }
 * Protected by authentication middleware.
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Récupérer l'utilisateur authentifié
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, messageId, authUserId, userId, prompt, enhancedPrompt, imageData, imageUrl, mimeType, sizeBytes } = body;

    const effectiveAuthUserId = authUserId || userId;
    if (!sessionId || !effectiveAuthUserId || !prompt) {
      return NextResponse.json({ error: 'sessionId, authUserId, and prompt are required' }, { status: 400 });
    }

    // Vérification simplifiée : accepter seulement si l'AuthUser est bon
    // Pour l'instant, on ignore les identités et on vérifie seulement l'AuthUser
    console.log('🔍 API Images POST - AuthUser vérifié:', authUser.id);

    const [newImage] = await db.insert(generated_images)
      .values({
        sessionId,
        messageId,
        userId: effectiveAuthUserId,
        prompt,
        enhancedPrompt,
        imageData,
        imageUrl,
        mimeType,
        sizeBytes
      })
      .returning();

    return NextResponse.json(newImage, { status: 201 });
  } catch (error) {
    console.error('Failed to save image:', error);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
});

/**
 * GET /api/images
 * Récupère les images pour une session ou un utilisateur
 * Query Params: ?sessionId=<id>&authUserId=<id> (alias: userId)
 * Protected by authentication middleware.
 */
export const GET = withAuth(async (request: NextRequest) => {
  // Récupérer l'utilisateur authentifié
  const authUser = AuthContext.getUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const userIdParam = searchParams.get('userId');
  const authUserId = searchParams.get('authUserId') || userIdParam;

  if (!sessionId && !authUserId) {
    return NextResponse.json({ error: 'sessionId or authUserId is required' }, { status: 400 });
  }

  // Vérification simplifiée : accepter seulement si l'AuthUser est bon
  // Pour l'instant, on ignore les identités et on vérifie seulement l'AuthUser
  console.log('🔍 API Images GET - AuthUser vérifié:', authUser.id);

  try {
    let query = db.select().from(generated_images);
    
    if (sessionId) {
      query = query.where(eq(generated_images.sessionId, sessionId));
    }
    
    if (authUserId) {
      query = query.where(eq(generated_images.userId, authUserId));
    }
    
    const images = await query.orderBy(desc(generated_images.createdAt));
    
    return NextResponse.json(images);
  } catch (error) {
    console.error('Failed to get images:', error);
    return NextResponse.json({ error: 'Failed to retrieve images' }, { status: 500 });
  }
});
