export const runtime = 'nodejs';
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

    const formData = await req.formData();
    const incoming = formData.get('file');
    const projectId = (formData.get('project_id') as string) || (formData.get('projectId') as string) || 'aurora';
    const title = (formData.get('title') as string) || '';
    const documentType =
      (formData.get('document_type') as string) ||
      (formData.get('documentType') as string) ||
      (formData.get('source_type') as string) ||
      (formData.get('sourceType') as string) ||
      'PROJECT_DOC';
    const description = (formData.get('description') as string) || '';
    const visibility = (formData.get('visibility') as string) || 'PRIVATE';
    const sync = (formData.get('sync') as string) || 'false';

    if (!incoming || typeof incoming === 'string') {
      throw new Error('No file provided in form data');
    }

    authorizeProjectAccess(session, projectId);

    const blob = incoming as File;
    const filename = blob.name || 'upload.bin';
    const bytes = Buffer.from(await blob.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error('Uploaded file is empty');
    }

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
    backendFormData.append('visibility', visibility);
    backendFormData.append('sync', sync);

    const uploadResult = await ragFetch<any>('/api/documents/upload', session, {
      method: 'POST',
      body: backendFormData,
    });

    return apiSuccess({
      uploadId: uploadResult.document_id,
      documentId: uploadResult.document_id,
      fileName: uploadResult.filename,
      projectId: uploadResult.project_id,
      status: uploadResult.status,
      errorMessage: uploadResult.error_message,
      bytes: uploadResult.bytes ?? bytes.length,
      ingestTimestamp: new Date().toISOString(),
    }, uploadResult.status === 'COMPLETED' ? 200 : 202);
  } catch (error) {
    return apiError(error, 'Document upload rejected by backend.');
  }
}
