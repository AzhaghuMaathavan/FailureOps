export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { authorizeProjectAccess } from '@/lib/server/authorization';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { ragFetch } from '@/lib/server/rag';

function filenameOf(entry: FormDataEntryValue): string {
  if (typeof entry === 'string') return 'upload.bin';
  const named = entry as File;
  return named.name || 'upload.bin';
}

export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const incoming = formData.get('file');
      const projectId = (formData.get('projectId') as string) || 'aurora';
      const title = (formData.get('title') as string) || '';
      const documentType = (formData.get('documentType') as string) || 'PROJECT_DOC';
      const description = (formData.get('description') as string) || '';
      const visibility = (formData.get('visibility') as string) || 'PRIVATE';
      const department = (formData.get('department') as string) || '';
      const sync = (formData.get('sync') as string) || 'false';

      if (!incoming || typeof incoming === 'string') {
        throw new Error('No file provided in form data');
      }

      const blob = incoming as Blob;
      const filename = filenameOf(incoming);
      const bytes = Buffer.from(await blob.arrayBuffer());

      console.info('[FAILUREOPS_UPLOAD]', {
        project_id: projectId,
        filename,
        content_type: blob.type || 'unknown',
        bytes: bytes.length,
      });

      if (bytes.length === 0) {
        throw new Error('Uploaded file is empty');
      }

      authorizeProjectAccess(session, projectId);

      const forwarded = new File([bytes], filename, {
        type: blob.type || 'application/octet-stream',
      });
      const backendFormData = new FormData();
      backendFormData.append('file', forwarded, filename);
      backendFormData.append('project_id', projectId);
      backendFormData.append('title', title || filename);
      backendFormData.append('document_type', documentType);
      backendFormData.append('source_type', documentType);
      backendFormData.append('description', description);
      backendFormData.append('visibility', visibility || 'PRIVATE');
      if (department) backendFormData.append('department', department);
      backendFormData.append('sync', sync);

      console.info('[FAILUREOPS] Sending document to RAG', {
        projectId,
        filename,
        documentType,
        bytes: bytes.length,
      });

      const uploadResult = await ragFetch<any>(
        `/api/documents/upload`,
        session,
        {
          method: 'POST',
          body: backendFormData,
        }
      );

      console.info('[RAG] Upload accepted', {
        documentId: uploadResult.document_id,
        status: uploadResult.status,
        bytes: uploadResult.bytes,
      });

      return apiSuccess({
        uploadId: uploadResult.document_id,
        documentId: uploadResult.document_id,
        fileName: uploadResult.filename,
        projectId: uploadResult.project_id,
        status: uploadResult.status,
        bytes: uploadResult.bytes ?? bytes.length,
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
