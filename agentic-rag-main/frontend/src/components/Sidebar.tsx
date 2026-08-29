import { useState, useMemo } from 'react';
import { Upload, RefreshCw, FileText, AlertCircle, CheckCircle2, Clock, PlusCircle, MessageSquare, Search, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Document, Conversation } from '../api';
import { DocumentModal } from './DocumentModal';
import { UploadModal } from './UploadModal';

interface SidebarProps {
  documents: Document[];
  onRefresh: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({ documents, onRefresh, conversations, activeConversationId, onNewChat, onSelectConversation, onDeleteConversation }: SidebarProps) {
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      setSelectedDocument(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const lowerQ = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.filename.toLowerCase().includes(lowerQ) || 
      (doc.title && doc.title.toLowerCase().includes(lowerQ))
    );
  }, [documents, searchQuery]);

  // Derived stats
  const totalDocs = documents.length;
  const readyDocs = documents.filter(d => d.status === 'COMPLETED').length;
  const processingDocs = documents.filter(d => d.status === 'PENDING').length;
  const failedDocs = documents.filter(d => d.status === 'ERROR' || d.status === 'FAILED').length;

  return (
    <>
      <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="font-semibold text-gray-800 text-lg">Agentic RAG</h1>
          <button
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
            title="Refresh Workspace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Conversations Section */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Conversations</span>
            </h2>
            {conversations.length === 0 ? (
              <div className="text-center text-xs text-gray-400 mt-2 mb-2">
                No recent chats.
              </div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conv) => (
                  <li
                    key={conv.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      activeConversationId === conv.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
                      <span className="text-sm font-medium truncate" title={conv.title}>
                        {conv.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Documents Section */}
          <div className="p-4 flex-1">
            <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Document Library</span>
            </h2>

            {/* Stats */}
            {totalDocs > 0 && (
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                <div className="bg-white border border-gray-200 rounded p-1.5 text-center shadow-sm">
                  <div className="text-[10px] text-gray-500 font-medium mb-0.5">Total</div>
                  <div className="text-xs font-semibold text-gray-800">{totalDocs}</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded p-1.5 text-center shadow-sm">
                  <div className="text-[10px] text-green-700 font-medium mb-0.5">Ready</div>
                  <div className="text-xs font-semibold text-green-800">{readyDocs}</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded p-1.5 text-center shadow-sm">
                  <div className="text-[10px] text-amber-700 font-medium mb-0.5">Proc</div>
                  <div className="text-xs font-semibold text-amber-800">{processingDocs}</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded p-1.5 text-center shadow-sm">
                  <div className="text-[10px] text-red-700 font-medium mb-0.5">Failed</div>
                  <div className="text-xs font-semibold text-red-800">{failedDocs}</div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setUploadModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 mb-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-xs"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>

            {/* Search */}
            {totalDocs > 0 && (
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            {filteredDocuments.length === 0 ? (
              <div className="text-center text-xs text-gray-400 mt-4">
                {totalDocs === 0 ? 'No documents uploaded yet.' : 'No documents match search.'}
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    className="bg-white border border-gray-200 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                        <div className="flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-800 font-medium truncate" title={doc.title || doc.filename}>
                            {doc.title || doc.filename}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 pl-5">
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm truncate max-w-[80px]">
                            {doc.document_type || 'Unknown'}
                          </span>
                          {doc.department && (
                            <span className="text-[10px] text-gray-500 truncate max-w-[60px]">{doc.department}</span>
                          )}
                          {doc.academic_year && (
                            <span className="text-[10px] text-gray-500">{doc.academic_year}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {doc.status === 'COMPLETED' && (
                        <span className="flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                        </span>
                      )}
                      {doc.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          <Clock className="w-2.5 h-2.5" /> Processing
                        </span>
                      )}
                      {(doc.status === 'ERROR' || doc.status === 'FAILED') && (
                        <span className="flex items-center gap-1 text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          <AlertCircle className="w-2.5 h-2.5" /> Failed
                        </span>
                      )}
                      
                      <span className="text-gray-400 ml-auto flex gap-1.5">
                        {doc.page_count !== undefined && doc.page_count > 0 && <span>{doc.page_count}p</span>}
                        {doc.chunk_count !== undefined && doc.chunk_count > 0 && <span>{doc.chunk_count}c</span>}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {selectedDocument && (
        <DocumentModal
          document={documents.find(d => d.id === selectedDocument.id) || selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onRefresh={onRefresh}
          onDelete={handleDeleteDocument}
        />
      )}

      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            setUploadModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
