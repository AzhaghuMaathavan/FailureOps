export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { serverConfig } from '@/lib/server/config';

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

      const backendFormData = new FormData();
      backendFormData.append('file', file, file.name);
      backendFormData.append('title', title);
      backendFormData.append('document_type', documentType);
      backendFormData.append('description', description);

      const resp = await fetch(
        `${serverConfig.ragInternalUrl}/api/v1/projects/${encodeURIComponent(projectId)}/documents/upload`,
        {
          method: 'POST',
          headers: {
            'x-organization-id': session.organizationId,
            'x-user-id': session.userId,
          },
          body: backendFormData,
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Backend document upload failed (${resp.status}): ${err}`);
      }

      const uploadResult = await resp.json();
      return apiSuccess({
        uploadId: uploadResult.document_id,
        documentId: uploadResult.document_id,
        fileName: uploadResult.filename,
        projectId: uploadResult.project_id,
        status: uploadResult.status,
        ingestTimestamp: new Date().toISOString(),
      }, 202);
    } else {
      // JSON metadata registration fallback
      const body = await req.json();
      const projectId = body.projectId || 'aurora';
      return apiSuccess({
        uploadId: `UPL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        fileName: body.fileName || 'document.txt',
        projectId,
        status: 'PENDING',
        ingestTimestamp: new Date().toISOString(),
      }, 202);
    }
  } catch (error) {
    return apiError(error, 'Evidence file upload rejected by backend.');
  }
}

