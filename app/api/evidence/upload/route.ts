export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const projectId = (formData.get('projectId') as string) || 'aurora';
      const title = (formData.get('title') as string) || (file ? file.name : 'Uploaded Document');
      const documentType = (formData.get('documentType') as string) || 'PROJECT_DOC';
      const description = (formData.get('description') as string) || '';

      if (!file) {
        throw new Error('No file provided in form data');
      }

      authorizeProjectAccess(session, projectId);

      console.info('[FAILUREOPS] Upload received', {
        projectId,
        filename: file.name,
        documentType,
      });

      const backendFormData = new FormData();
      backendFormData.append('file', file, file.name);
      backendFormData.append('title', title);
      backendFormData.append('document_type', documentType);
      backendFormData.append('description', description);

      console.info('[FAILUREOPS] Sending document to RAG', { projectId, filename: file.name });

      const uploadResult = await ragFetch<any>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/documents/upload`,
        session,
        {
          method: 'POST',
          body: backendFormData,
        }
      );

      console.info('[RAG] Upload accepted', {
        documentId: uploadResult.document_id,
        status: uploadResult.status,
      });

      return apiSuccess({
        uploadId: uploadResult.document_id,
        documentId: uploadResult.document_id,
        fileName: uploadResult.filename,
        projectId: uploadResult.project_id,
        status: uploadResult.status,
        ingestTimestamp: new Date().toISOString(),
      }, 202);
    }

    throw new Error('Multipart file upload is required. JSON metadata-only upload is not supported.');
  } catch (error) {
    return apiError(error, 'Evidence file upload rejected by backend.');
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || 'aurora';

    authorizeProjectAccess(session, projectId);

    const docs = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/documents`,
      session
    );
    const list = Array.isArray(docs) ? docs : [];
    console.info('[FAILUREOPS] Document list', {
      projectId,
      count: list.length,
      chunks: list.map((d: any) => ({
        id: d.id,
        status: d.status,
        chunk_count: d.chunk_count,
        embedded_count: d.embedded_count,
      })),
    });
    return apiSuccess(list);
  } catch (error) {
    return apiError(error, 'Failed to retrieve project documents.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'general');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const documentId = searchParams.get('documentId');

    if (!projectId || !documentId) {
      throw new Error('projectId and documentId parameters are required');
    }

    authorizeProjectAccess(session, projectId);

    const result = await ragFetch<any>(
      `/api/v1/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`,
      session,
      { method: 'DELETE' }
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error, 'Failed to delete project document.');
  }
}
