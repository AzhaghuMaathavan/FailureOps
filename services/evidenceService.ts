import { EvidenceSourceType, UploadProgress } from '@/types';

export async function simulateFileUpload(
  filename: string,
  category: EvidenceSourceType,
  onProgress: (progress: UploadProgress) => void
): Promise<void> {
  const stages: Array<UploadProgress['stage']> = [
    'RECEIVED',
    'PARSED',
    'NORMALIZED',
    'CHUNKED',
    'EMBEDDED',
    'INDEXED',
    'COMPLETED',
  ];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const percent = Math.round(((i + 1) / stages.length) * 100);
    onProgress({
      file: filename,
      category,
      stage,
      progress: percent,
    });
    // Realistic non-blocking pipeline delay (250-400ms per stage)
    await new Promise(r => setTimeout(r, 320));
  }
}
