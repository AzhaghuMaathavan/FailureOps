const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export interface Document {
  id: string;
  filename: string;
  status: 'PENDING' | 'COMPLETED' | 'ERROR' | 'FAILED' | 'PARTIAL_SUCCESS';
  error_message?: string;
  chunk_count?: number;
  embedded_count?: number;
  page_count?: number;
  file_size?: number;
  created_at?: string;
  updated_at?: string;
  
  // Metadata
  title?: string;
  document_type?: string;
  department?: string;
  academic_year?: string;
  semester?: string;
  applicable_audience?: string;
  description?: string;
  topics?: string[];
  keywords?: string[];
  example_questions?: string[];
  effective_from?: string;
  effective_until?: string;
  version?: string;
  priority?: number;
}

export interface Citation {
  document_id: string;
  lineage?: {
    document_name?: string; page_ids?: string[]; page_numbers?: number[];
    block_ids?: string[];
    source_metadata?: {
      slide?: number[];
      sheet?: string[];
      section?: string[];
      rows?: number[];
      lines?: number[];
      [key: string]: any;
    };
  };
}

export interface Latencies {
  total?: number;
  generation?: number;
  retrieval?: number;
  [key: string]: number | undefined;
}

export interface Decision {
  iteration: number;
  action: string;
  query?: string[];
  reason: string;
  goal?: string;
  unresolved?: string[];
  progress?: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id?: string;
  domain_state?: string;
  evidence_state?: string;
  iterations?: number;
  max_iterations?: number;
  stop_reason?: string;
  citations?: Citation[];
  latencies?: Latencies;
  decision_history?: Decision[];
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface ConversationHistory {
  id: string;
  title: string;
  messages: Message[];
}

export const api = {
  getDocuments: async (): Promise<Document[]> => {
    const res = await fetch(`${BASE_URL}/documents/`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  uploadDocument: async (file: File, metadata?: Record<string, any>): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            // Backend expects a JSON string for arrays
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
    }

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },
  deleteDocument: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },
  retryDocument: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/documents/${id}/retry`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to retry processing');
  },
  chat: async (query: string, conversation_id?: string, document_ids?: string[]): Promise<ChatResponse> => {
    const res = await fetch(`${BASE_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, conversation_id, document_ids }),
    });
    if (!res.ok) throw new Error('Failed to chat');
    return res.json();
  },
  getConversations: async (): Promise<Conversation[]> => {
    const res = await fetch(`${BASE_URL}/conversations/`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },
  getConversationHistory: async (id: string): Promise<ConversationHistory> => {
    const res = await fetch(`${BASE_URL}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation history');
    return res.json();
  },
  deleteConversation: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },
  getDownloadUrl: (id: string): string => {
    return `${BASE_URL}/documents/${id}/download`;
  }
};
