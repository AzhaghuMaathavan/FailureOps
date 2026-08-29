import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Activity, ChevronDown, ChevronRight, User, Bot, ExternalLink } from 'lucide-react';
import { api } from '../api';
import type { ChatResponse, Document } from '../api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: ChatResponse;
}

export function Chat({ documents, activeConversationId, setActiveConversationId }: { documents: Document[], activeConversationId: string | null, setActiveConversationId: (id: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
    } else {
      // Load history
      setLoading(true);
      api.getConversationHistory(activeConversationId)
        .then(history => {
          const mappedMessages: Message[] = history.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            response: m.role === 'assistant' ? {
              answer: m.content,
              citations: m.citations,
              // We don't have pipeline state in historical messages currently, but we have citations
            } : undefined
          }));
          setMessages(mappedMessages);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [activeConversationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const docIds = selectedDocFilter ? [selectedDocFilter] : undefined;
      const res = await api.chat(userMsg.content, activeConversationId || undefined, docIds);
      if (!activeConversationId && res.conversation_id) {
        setActiveConversationId(res.conversation_id);
      }
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        response: res
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to get response'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getDocName = (id: string) => {
    return documents.find(d => d.id === id)?.filename || 'Unknown Document';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bot className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">How can I help you today?</p>
            <p className="text-sm mt-2">Ask a question about your uploaded documents.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl w-full flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[80%]">
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm self-end' : 'bg-gray-100 text-gray-800 rounded-tl-sm self-start'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'assistant' && msg.response && (
                    <div className="flex flex-col gap-2 w-full mt-1 self-start">
                      {msg.response.citations && msg.response.citations.length > 0 && (
                        <ExpandableSection title="Sources" icon={<BookOpen className="w-4 h-4" />}>
                          <div className="space-y-3">
                            {Array.from(new Set((msg.response?.citations || []).map(c => c.lineage?.document_name || getDocName(c.document_id)))).map(docName => {
                              const docCitations = (msg.response?.citations || []).filter(c => (c.lineage?.document_name || getDocName(c.document_id)) === docName);
                              return (
                                <div key={docName} className="flex flex-col gap-1">
                                  <div className="font-semibold text-gray-800 text-[13px] uppercase tracking-wider">{docName}</div>
                                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                    {docCitations.map((cite, idx) => {
                                      const md = cite.lineage?.source_metadata || {};

                                      let sourceText = "";
                                      if (md.slide && md.slide.length > 0) {
                                          sourceText = `Slide ${md.slide.join(', ')}`;
                                      } else if (md.sheet && md.sheet.length > 0) {
                                          sourceText = `Sheet: ${md.sheet.join(', ')}`;
                                      } else if (md.section && md.section.length > 0) {
                                          sourceText = `Section: ${md.section[0]}`;
                                      } else if (md.rows && md.rows.length > 0) {
                                          sourceText = `Rows: ${md.rows[0]}`;
                                      } else if (md.lines && md.lines.length > 0) {
                                          sourceText = `Lines: ${md.lines[0]}`;
                                      } else if (cite.lineage?.page_numbers) {
                                          sourceText = `Page: ${cite.lineage.page_numbers.join(', ')}`;
                                      }

                                      return (
                                        <li key={idx} className="flex items-center group">
                                          <a
                                            href={api.getDownloadUrl(cite.document_id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 hover:text-emerald-600 transition-colors cursor-pointer"
                                            title={`Open ${docName}`}
                                          >
                                            <span className="group-hover:underline">
                                              {sourceText || "Document Source"}
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                          </a>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </ExpandableSection>
                      )}
                      {(msg.response.domain_state || msg.response.evidence_state || msg.response.latencies) && (
                        <ExpandableSection title="Pipeline State" icon={<Activity className="w-4 h-4" />}>
                          <div className="space-y-4 text-sm text-gray-600">
                            {msg.response.iterations !== undefined && (
                              <div className="flex flex-col gap-1 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700 w-28">Agent Iteration:</span>
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                                    {msg.response.iterations} {msg.response.max_iterations ? `/ ${msg.response.max_iterations}` : ''}
                                  </span>
                                </div>
                                {msg.response.stop_reason && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700 w-28">Stop Reason:</span>
                                    <span className="bg-gray-200 px-2 py-0.5 rounded font-mono text-xs text-gray-700">
                                      {msg.response.stop_reason}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {msg.response.decision_history && msg.response.decision_history.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <span className="font-medium text-gray-700 block mb-1">Agent Decisions:</span>
                                {msg.response.decision_history.map((d, i) => (
                                  <div key={i} className="bg-white border border-gray-200 px-3 py-2 rounded-md text-xs shadow-sm flex flex-col gap-1">
                                    <p><span className="font-bold text-gray-700">Iter {d.iteration}:</span> <span className="text-emerald-700 font-semibold">{d.action}</span></p>
                                    {d.goal && <p className="text-gray-600"><span className="font-semibold text-gray-700">Goal:</span> {d.goal}</p>}
                                    {d.unresolved && d.unresolved.length > 0 && <p className="text-orange-600"><span className="font-semibold text-gray-700">Unresolved:</span> {d.unresolved.join(", ")}</p>}
                                    {d.progress && d.progress !== "None" && <p className="text-blue-600"><span className="font-semibold text-gray-700">Progress:</span> {d.progress}</p>}
                                    {d.query && d.query.length > 0 && <p className="font-mono text-gray-600 mt-1 bg-gray-50 px-1 py-0.5 rounded border border-gray-100">Search: {d.query.join(", ")}</p>}
                                    <p className="text-gray-500 italic mt-1">"{d.reason}"</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {msg.response.domain_state && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">Domain State:</span>
                                <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto font-mono leading-relaxed">{msg.response.domain_state}</pre>
                              </div>
                            )}
                            {msg.response.evidence_state && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">Evidence State:</span>
                                <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto font-mono leading-relaxed">{msg.response.evidence_state}</pre>
                              </div>
                            )}
                            {msg.response.latencies && (
                              <div>
                                <span className="font-medium text-gray-700 block mb-1">Latencies:</span>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  {Object.entries(msg.response.latencies).map(([k, v]) => {
                                    const isCount = k.includes('count') || k.includes('chars') || k.includes('chunks') || k.includes('tokens');
                                    return (
                                      <div key={k} className="bg-gray-100 px-3 py-2 rounded-md flex justify-between items-center">
                                        <span className="capitalize text-gray-600">{k.replace(/_/g, ' ')}</span>
                                        <span className="font-mono text-gray-800">{v}{isCount ? '' : 's'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </ExpandableSection>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-3xl w-full flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-sm self-start shadow-sm flex items-center gap-1.5 h-12">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50/50">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-3">
          {documents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Search In:</span>
              <select
                className="text-sm border border-gray-300 rounded bg-white py-1 pl-2 pr-6 focus:outline-none focus:border-emerald-500 text-gray-700"
                value={selectedDocFilter || ''}
                onChange={(e) => setSelectedDocFilter(e.target.value || null)}
                disabled={loading}
              >
                <option value="">All Documents</option>
                {documents.filter(d => d.status === 'COMPLETED').map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.filename}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Agentic RAG..."
              className="w-full pl-5 pr-14 py-4 bg-white rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-sm transition-all text-base"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpandableSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          {title}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/30">
          {children}
        </div>
      )}
    </div>
  );
}
