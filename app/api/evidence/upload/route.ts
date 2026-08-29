export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { apiSuccess, apiError, apiRateLimitExceeded } from '@/lib/server/response';
import { EvidenceUploadMetadataSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const rate = checkRateLimit(req, 'upload');
    if (!rate.success) return apiRateLimitExceeded(rate.resetSeconds);

    const body = await req.json();
    const validated = EvidenceUploadMetadataSchema.parse(body);

    // Simulated server-side validation & quarantine ingest
    // In production, file buffer is streamed to isolated scanning sandbox
    const uploadReceipt = {
      uploadId: `UPL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      fileName: validated.fileName,
      sourceType: validated.sourceType,
      fileSize: validated.fileSize,
      mimeType: validated.mimeType,
      status: 'QUEUED_FOR_SEGMENTATION',
      ingestTimestamp: new Date().toISOString(),
      enclaveEncrypted: true,
    };

    return apiSuccess(uploadReceipt, 202);
  } catch (error) {
    return apiError(error, 'Evidence file upload rejected by security validation.');
  }
}
