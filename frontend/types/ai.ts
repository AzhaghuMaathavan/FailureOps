export interface CustomAIConfig {
  provider: 'default' | 'custom';
  is_active: boolean;
  endpoint_url?: string | null;
  model_name?: string | null;
  has_api_key: boolean;
  status: 'CONNECTED' | 'ERROR' | 'NOT_CONFIGURED';
  latency_ms?: number | null;
  last_tested_at?: string | null;
  error_message?: string | null;
}

export interface CustomAITestResult {
  success: boolean;
  provider: string;
  model?: string;
  latency_ms?: number;
  code?: string;
  message?: string;
}
