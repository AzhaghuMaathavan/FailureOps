import { z } from 'zod';

export const PrivacyLevelSchema = z.enum(['PRIVATE', 'ORGANIZATION', 'ANONYMOUS_LEARNING', 'PUBLIC']);

export const EvidenceSourceTypeSchema = z.enum([
  'PRODUCT_PLAN',
  'CUSTOMER_FEEDBACK',
  'PRODUCT_METRICS',
  'ENGINEERING_METRICS',
  'TEAM_OPERATIONS',
  'INCIDENT_REPORTS',
]);

// 1. Project Registration Validation
export const ProjectRegistrationSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(60, 'Product name cannot exceed 60 characters').trim(),
  company: z.string().min(2, 'Company name must be at least 2 characters').max(60, 'Company name cannot exceed 60 characters').trim(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').trim(),
  industry: z.string().min(2).max(40),
  stage: z.string().min(2).max(30),
  targetUsers: z.string().max(120).trim(),
  expectedLaunchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Launch date must be in YYYY-MM-DD format'),
  privacyLevel: PrivacyLevelSchema.default('PRIVATE'),
  sourcesUploaded: z.array(EvidenceSourceTypeSchema).min(1, 'At least one evidence source is required'),
});

export type ProjectRegistrationInput = z.infer<typeof ProjectRegistrationSchema>;

// 2. Evidence Upload Metadata Validation
const ALLOWED_EXTENSIONS = ['pdf', 'csv', 'json', 'txt', 'docx', 'xlsx', 'md'];

export const EvidenceUploadMetadataSchema = z.object({
  sourceType: EvidenceSourceTypeSchema,
  fileName: z.string().min(1).max(120).refine(name => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_EXTENSIONS.includes(ext);
  }, {
    message: 'File extension not permitted. Accepted formats: PDF, CSV, JSON, TXT, DOCX, XLSX, MD',
  }),
  fileSize: z.number().max(25 * 1024 * 1024, 'File size cannot exceed 25MB'),
  mimeType: z.string().max(80),
});

export type EvidenceUploadInput = z.infer<typeof EvidenceUploadMetadataSchema>;

// 3. Analysis Job Dispatch Validation
export const AnalysisJobSchema = z.object({
  projectId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid project identifier format'),
});

// 4. Truth Engine Assumption Query Validation
export const TruthEngineQuerySchema = z.object({
  projectId: z.string().min(1).max(64),
  assumptionText: z.string().min(4, 'Claim must be at least 4 characters').max(300, 'Claim cannot exceed 300 characters').trim(),
});

// 5. Global Search Validation
export const SearchQuerySchema = z.object({
  query: z.string().max(150, 'Search query cannot exceed 150 characters').default(''),
  filter: z.enum(['ALL', 'HISTORICAL_CASES', 'ORGANIZATIONAL_MEMORY', 'ACTIVE_PROJECTS']).default('ALL'),
});

// 6. Save to Organizational Memory Validation
export const SaveMemorySchema = z.object({
  pattern: z.string().min(3).max(150).trim(),
  evidenceSummary: z.array(z.string()).min(1),
  intervention: z.string().min(5).max(400).trim(),
  experimentDesign: z.string().max(300).default(''),
  outcome: z.string().min(3).max(250).trim(),
  confidence: z.number().min(0).max(100),
  context: z.object({
    industry: z.string(),
    stage: z.string(),
    targetMarket: z.string(),
  }),
  tags: z.array(z.string().max(30)).max(12),
});
