import { useState } from 'react';
import { X, FileText, CheckCircle2, Clock, AlertCircle, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../api';
import type { Document } from '../api';

interface DocumentModalProps {
  document: Document;
  onClose: () => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export function DocumentModal({ document, onClose, onRefresh, onDelete }: DocumentModalProps) {
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await api.retryDocument(document.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to retry document");
      setRetrying(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Document Details
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Title / Filename</h3>
            <p className="text-base font-medium text-gray-900 break-words">{document.title || document.filename}</p>
            <a 
              href={api.getDownloadUrl(document.id)}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" /> Open Original Document
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</h3>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {document.status === 'COMPLETED' && <><CheckCircle2 className="w-4 h-4 text-green-600" /> <span className="text-green-700">Ready</span></>}
                {document.status === 'PENDING' && <><Clock className="w-4 h-4 text-amber-600" /> <span className="text-amber-700">Processing</span></>}
                {(document.status === 'ERROR' || document.status === 'FAILED') && <><AlertCircle className="w-4 h-4 text-red-600" /> <span className="text-red-700">Failed</span></>}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">File Size</h3>
              <p className="text-sm text-gray-900">{formatSize(document.file_size)}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pages</h3>
              <p className="text-sm text-gray-900">{document.page_count ?? 0}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Chunks</h3>
              <p className="text-sm text-gray-900">{document.chunk_count ?? 0}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Embeddings</h3>
              <p className="text-sm text-gray-900">{document.embedded_count ?? 0}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Uploaded</h3>
              <p className="text-sm text-gray-900">{document.created_at ? new Date(document.created_at).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
             <h3 className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-3">Knowledge Profile</h3>
             <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
               <div><span className="text-gray-500 block text-[10px] uppercase">Document Type</span> <span className="font-medium text-gray-900">{document.document_type || 'Unknown'}</span></div>
               <div><span className="text-gray-500 block text-[10px] uppercase">Department</span> <span className="font-medium text-gray-900">{document.department || 'All'}</span></div>
               <div><span className="text-gray-500 block text-[10px] uppercase">Academic Year</span> <span className="font-medium text-gray-900">{document.academic_year || '-'}</span></div>
               <div><span className="text-gray-500 block text-[10px] uppercase">Semester</span> <span className="font-medium text-gray-900">{document.semester || 'All'}</span></div>
               <div><span className="text-gray-500 block text-[10px] uppercase">Version</span> <span className="font-medium text-gray-900">{document.version || '1.0'}</span></div>
             </div>
             {document.topics && document.topics.length > 0 && (
               <div className="mt-3">
                 <span className="text-gray-500 block text-[10px] uppercase mb-1">Topics</span>
                 <div className="flex flex-wrap gap-1.5">
                   {document.topics.map((t, i) => (
                     <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">{t}</span>
                   ))}
                 </div>
               </div>
             )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
             <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Processing Timeline</h3>
             <ul className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
               <li className="relative flex items-center justify-between gap-2">
                 <div className="flex items-center gap-3">
                   <div className="w-4 h-4 rounded-full bg-emerald-500 z-10 ring-4 ring-white shadow"></div>
                   <span className="text-sm font-medium text-gray-700">Upload & Render</span>
                 </div>
               </li>
               <li className="relative flex items-center justify-between gap-2">
                 <div className="flex items-center gap-3">
                   <div className={`w-4 h-4 rounded-full z-10 ring-4 ring-white shadow ${(document.page_count || 0) > 0 ? 'bg-emerald-500' : (document.status === 'PENDING' ? 'bg-blue-400 animate-pulse' : 'bg-gray-300')}`}></div>
                   <span className="text-sm font-medium text-gray-700">Nemotron Parse VLM</span>
                 </div>
               </li>
               <li className="relative flex items-center justify-between gap-2">
                 <div className="flex items-center gap-3">
                   <div className={`w-4 h-4 rounded-full z-10 ring-4 ring-white shadow ${(document.chunk_count || 0) > 0 ? 'bg-emerald-500' : (document.status === 'PENDING' && (document.page_count || 0) > 0 ? 'bg-blue-400 animate-pulse' : 'bg-gray-300')}`}></div>
                   <span className="text-sm font-medium text-gray-700">Semantic Chunking</span>
                 </div>
               </li>
               <li className="relative flex items-center justify-between gap-2">
                 <div className="flex items-center gap-3">
                   <div className={`w-4 h-4 rounded-full z-10 ring-4 ring-white shadow ${(document.embedded_count || 0) > 0 && document.embedded_count === document.chunk_count ? 'bg-emerald-500' : (document.status === 'PENDING' && (document.chunk_count || 0) > 0 ? 'bg-blue-400 animate-pulse' : 'bg-gray-300')}`}></div>
                   <span className="text-sm font-medium text-gray-700">pgvector Indexing</span>
                 </div>
               </li>
             </ul>
          </div>

          {(document.status === 'ERROR' || document.status === 'FAILED') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-red-800 flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4" /> Processing Failed
              </h3>
              <p className="text-sm text-red-700 break-words">{document.error_message || "An unknown error occurred during processing."}</p>
            </div>
          )}

          {deleting && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Are you absolutely sure?</h3>
              <p className="text-xs text-red-700 mb-3">
                This will permanently remove the document, all parsed pages, chunks, and embeddings. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleting(false)} className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={() => onDelete(document.id)} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700">Yes, Delete</button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 rounded-b-xl">
          <div>
            {(document.status === 'ERROR' || document.status === 'FAILED') && !deleting && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry Processing'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!deleting && (
              <button
                onClick={() => setDeleting(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
