export type CommunityPostType =
  | 'QUESTION'
  | 'LESSON'
  | 'FAILURE_REPORT'
  | 'RECOVERY'
  | 'DISCUSSION';

export type CommunityVisibility =
  | 'PRIVATE'
  | 'ORGANIZATION'
  | 'COMMUNITY'
  | 'GLOBAL_SANITIZED';

export interface EvidenceReference {
  document_title: string;
  location: string;
  excerpt?: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  organization_id: string;
  content: string;
  is_accepted: boolean;
  helpful_count: number;
  created_at: string;
  has_voted_helpful?: boolean;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  organization_id: string;
  post_type: CommunityPostType;
  title: string;
  summary: string;
  content: string;
  product_context?: string;
  failure_dimension?: string;
  pattern?: string;
  similarity_score?: number;
  observed_failure?: string;
  recovery_strategy?: string;
  verified_outcome?: string;
  evidence_references?: EvidenceReference[];
  visibility: CommunityVisibility;
  status: 'DRAFT' | 'PUBLISHED' | 'FLAGGED' | 'REMOVED';
  helpful_count: number;
  comment_count: number;
  accepted_comment_id?: string | null;
  created_at: string;
  updated_at?: string;
  tags: string[];
  comments?: CommunityComment[];
  has_voted_helpful?: boolean;
}

export interface CommunityTag {
  id: string;
  name: string;
  usage_count: number;
}

export interface SensitiveScanResult {
  has_sensitive_data: boolean;
  findings: Array<{
    category: string;
    description: string;
    sample: string;
  }>;
  warning?: string | null;
}
