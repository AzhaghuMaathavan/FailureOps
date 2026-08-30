import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Filter, 
  ShieldAlert, 
  Cpu, 
  RefreshCw,
  FileText,
  Search,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import type { 
  Document, 
  AnalysisResponse, 
  SignalSeverity 
} from '../api';

interface IntelligenceViewProps {
  documents: Document[];
  onRefreshDocuments: () => void;
}

export function IntelligenceView({ documents, onRefreshDocuments }: IntelligenceViewProps) {
  const [query, setQuery] = useState('Identify engineering failure risks, build stability, and review velocity trends');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signals' | 'evidence' | 'events' | 'pipeline'>('signals');
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  const presets = [
    { label: 'Release Risks & CI Pipeline', query: 'Identify engineering failure risks, build stability, and review velocity trends' },
    { label: 'Bug Backlog & Developer Overtime', query: 'Analyze unresolved defects, sprint backlog slip, and developer overtime hours' },
    { label: 'Academic & Institutional Compliance', query: 'Assess student attendance drop, dropout rates, exam scheduling, and fee arrears' }
  ];

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSelectedSignalId(null);

    try {
      const payload = {
        project_id: 'proj_failureops_default',
        query: query.trim(),
        document_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        options: { max_chunks: 20 }
      };

      const res = await api.runIntelligenceAnalysis(payload);
      setAnalysisResult(res);
      if (res.status === 'failed' && res.error_message) {
        setError(res.error_message);
      }
    } catch (err: any) {
      console.error('Intelligence analysis error:', err);
      setError(err.message || 'Failed to execute intelligence analysis. Check backend logs.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const getSeverityBadge = (severity: SignalSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'LOW':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">LOW</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">{severity}</span>;
    }
  };

  const getDirectionIcon = (dir: string) => {
    if (dir === 'INCREASING') return <TrendingUp className="w-4 h-4 text-red-600 inline" />;
    if (dir === 'DECREASING') return <TrendingDown className="w-4 h-4 text-emerald-600 inline" />;
    return <Minus className="w-4 h-4 text-gray-500 inline" />;
  };

  // Filter evidence items if a specific signal is selected
  const activeSignal = analysisResult?.signals.find(s => s.signal_id === selectedSignalId);
  const displayedEvidence = activeSignal 
    ? (analysisResult?.evidence || []).filter(e => activeSignal.supporting_evidence_ids.includes(e.evidence_id))
    : (analysisResult?.evidence || []);

  const totalGraphTime = analysisResult?.processing_metadata?.execution_latencies?.total_graph_execution 
    || analysisResult?.processing_metadata?.execution_latencies?.retrieve_evidence;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">FailureOps Intelligence Service</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded border border-indigo-200">
              LangGraph Orchestrated
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real RAG Retrieval &rarr; Evidence Agent &rarr; Signal Agent &rarr; Grounded Structured Intelligence
          </p>
        </div>

        <button
          onClick={onRefreshDocuments}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Refresh Documents"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Analysis Controls Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Analysis Goal / Query
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask for risks, failure trends, anomalies, or metric changes..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
              <button
                onClick={() => handleRunAnalysis()}
                disabled={loading || !query.trim()}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
                  loading || !query.trim()
                    ? 'bg-indigo-300 text-white cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Pipeline...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run Intelligence Analysis
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Presets:</span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(p.query)}
                className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors border border-gray-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Document Scope Filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                Target Documents Scope ({selectedDocIds.length > 0 ? `${selectedDocIds.length} Selected` : 'All Documents'})
              </span>
              {selectedDocIds.length > 0 && (
                <button
                  onClick={() => setSelectedDocIds([])}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Clear Selection (Search All)
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No documents uploaded yet. Upload documents using the sidebar to analyze them.</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                {documents.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-medium shadow-xs' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 opacity-70" />
                      <span className="truncate max-w-[200px]" title={doc.title || doc.filename}>
                        {doc.title || doc.filename}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-6 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 mb-1">
              <Cpu className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Executing LangGraph Intelligence Pipeline</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Traversing 7 StateGraph nodes: <br />
              <span className="font-mono text-indigo-600">validate_request &rarr; retrieve_evidence &rarr; evidence_agent &rarr; validate_evidence &rarr; signal_agent &rarr; validate_signals &rarr; finalize_output</span>
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800 text-sm">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Analysis Failed</p>
              <p className="text-xs mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {analysisResult && !loading && (
          <div className="space-y-6">
            {/* Status Summary Banner */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${
                  analysisResult.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                  analysisResult.status === 'insufficient_evidence' ? 'bg-amber-50 text-amber-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 uppercase">
                      Status: {analysisResult.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">ID: {analysisResult.analysis_id.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Project: <span className="font-mono text-gray-700">{analysisResult.project_id}</span>
                  </p>
                </div>
              </div>

              {/* Metrics Badges */}
              <div className="flex items-center gap-4 text-xs">
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500">Signals:</span>{' '}
                  <span className="font-bold text-gray-900">{analysisResult.signals.length}</span>
                </div>
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500">Evidence Items:</span>{' '}
                  <span className="font-bold text-gray-900">{analysisResult.evidence.length}</span>
                </div>
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500">Confidence:</span>{' '}
                  <span className="font-bold text-indigo-600">
                    {Math.round((analysisResult.confidence_summary?.overall_confidence || 0) * 100)}%
                  </span>
                </div>
                {totalGraphTime !== undefined && (
                  <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-gray-700">{totalGraphTime.toFixed(2)}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 flex items-center gap-6">
              <button
                onClick={() => setActiveTab('signals')}
                className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'signals'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                Signals ({analysisResult.signals.length})
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'evidence'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Evidence Items ({analysisResult.evidence.length})
                {selectedSignalId && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'events'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Events & Claims ({(analysisResult.events?.length || 0) + (analysisResult.claims?.length || 0)})
              </button>
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'pipeline'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Cpu className="w-4 h-4" />
                Pipeline Diagnostics
              </button>
            </div>

            {/* TAB 1: SIGNALS VIEW */}
            {activeTab === 'signals' && (
              <div className="space-y-6">
                {/* Risk Dimensions / Failure DNA Summary Banner if available */}
                {analysisResult.risk_dimensions && analysisResult.risk_dimensions.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          Deterministic Risk Dimensions (Failure DNA)
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Normalized 0–100 dimension risk scoring derived strictly from verified document evidence.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {analysisResult.risk_dimensions.map((dim, idx) => (
                        <div key={idx} className="bg-gray-50/80 border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800">{dim.dimension}</span>
                            {getSeverityBadge(dim.severity)}
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xl font-extrabold text-gray-900">
                              {dim.risk_score}
                              <span className="text-xs text-gray-400 font-normal"> / 100</span>
                            </span>
                            {dim.change_percent !== null && dim.change_percent !== undefined && (
                              <span className="text-xs text-gray-500 font-medium flex items-center gap-0.5">
                                {getDirectionIcon(dim.trend)}
                                {dim.change_percent > 0 ? `+${dim.change_percent}%` : `${dim.change_percent}%`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                            <span>{dim.evidence_count} Evidence Items</span>
                            <span>{Math.round(dim.confidence * 100)}% Conf</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.signals.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <p className="font-semibold text-gray-800">No Operational Signals Detected</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analysisResult.status === 'insufficient_evidence' 
                        ? 'No sufficient evidence was found in the indexed documents matching the query.' 
                        : 'The Evidence Agent did not detect measurable metric anomalies or trend shifts.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisResult.signals.map((sig) => {
                      const isSelected = selectedSignalId === sig.signal_id;
                      const hasRiskScore = sig.risk_score !== null && sig.risk_score !== undefined;

                      return (
                        <div
                          key={sig.signal_id}
                          onClick={() => {
                            setSelectedSignalId(isSelected ? null : sig.signal_id);
                            if (!isSelected) setActiveTab('evidence');
                          }}
                          className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                            isSelected 
                              ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/20' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Card Header: Title, Category, Severity & Prominent Risk Score */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-gray-900 text-sm">{sig.canonical_name}</h3>
                                {getSeverityBadge(sig.severity)}
                                {sig.scoring_method && (
                                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                                    {sig.scoring_method.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-mono text-gray-500 uppercase">{sig.category}</span>
                            </div>
                            
                            <div className="text-right shrink-0">
                              {hasRiskScore ? (
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Risk Score</span>
                                  <div className="text-lg font-black text-gray-900 leading-tight">
                                    {sig.risk_score}
                                    <span className="text-xs text-gray-400 font-normal"> / 100</span>
                                  </div>
                                </div>
                              ) : sig.current_value !== null && sig.current_value !== undefined ? (
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Observed Value</span>
                                  <div className="text-base font-bold text-gray-900 leading-tight">
                                    {sig.current_value}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <p className="text-xs text-gray-700 mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed">
                            {sig.explanation || 'Operational signal synthesized from verified document evidence.'}
                          </p>

                          {/* 1. Raw Telemetry Metric Section */}
                          <div className="mb-3 bg-gray-50/90 p-3 rounded-lg border border-gray-200/80">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Raw Telemetry Metric</span>
                              <span className="font-semibold text-gray-600 flex items-center gap-1">
                                {getDirectionIcon(sig.metric_trend || sig.direction)}
                                {sig.metric_trend || sig.direction || 'UNKNOWN'}
                              </span>
                            </div>

                            {/* Chronological Observations Row: Baseline, Previous, Current */}
                            <div className="grid grid-cols-3 gap-2 text-xs mb-2.5 pb-2 border-b border-gray-200/60">
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-medium">Baseline:</span>
                                <span className="font-semibold text-gray-800">
                                  {sig.baseline_value !== null && sig.baseline_value !== undefined ? `${sig.baseline_value}${sig.unit ? ` ${sig.unit}` : ''}` : (sig.previous_value ?? 'N/A')}
                                </span>
                                {sig.baseline_timestamp && (
                                  <span className="text-[10px] text-gray-400 block truncate">{sig.baseline_timestamp}</span>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-medium">Previous:</span>
                                <span className="font-semibold text-gray-800">
                                  {sig.previous_value !== null && sig.previous_value !== undefined ? `${sig.previous_value}${sig.unit ? ` ${sig.unit}` : ''}` : 'N/A'}
                                </span>
                                {sig.previous_timestamp && (
                                  <span className="text-[10px] text-gray-400 block truncate">{sig.previous_timestamp}</span>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-medium">Current:</span>
                                <span className="font-semibold text-gray-800">
                                  {sig.current_value !== null && sig.current_value !== undefined ? `${sig.current_value}${sig.unit ? ` ${sig.unit}` : ''}` : 'N/A'}
                                </span>
                                {sig.current_timestamp && (
                                  <span className="text-[10px] text-gray-400 block truncate">{sig.current_timestamp}</span>
                                )}
                              </div>
                            </div>

                            {/* Explicit Percentage Changes: Total (Baseline -> Current) vs Period (Previous -> Current) */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-medium">Total Change (Baseline):</span>
                                <span className="font-semibold text-gray-800">
                                  {(() => {
                                    const baseVal = sig.baseline_to_current_change_percent ?? sig.baseline_to_current_change ?? sig.metric_change_percent ?? sig.percentage_change;
                                    return baseVal !== null && baseVal !== undefined
                                      ? (baseVal > 0 ? `+${baseVal}%` : `${baseVal}%`)
                                      : 'N/A';
                                  })()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[10px] uppercase font-medium">Period Change (Previous):</span>
                                <span className="font-semibold text-gray-800">
                                  {(() => {
                                    const prevVal = sig.previous_to_current_change_percent ?? sig.previous_to_current_change;
                                    return prevVal !== null && prevVal !== undefined
                                      ? (prevVal > 0 ? `+${prevVal}%` : `${prevVal}%`)
                                      : 'N/A';
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Normalized Risk Score Movement Section */}
                          <div className="mb-3 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100">
                            <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Risk Score Movement (0-100)</span>
                              <span className="font-semibold text-indigo-800">
                                {sig.risk_trend || 'STABLE'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500 block text-[11px]">Previous Risk:</span>
                                <span className="font-semibold text-gray-800">
                                  {sig.previous_risk_score ?? sig.previous_score ?? 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[11px]">Current Risk:</span>
                                <span className="font-semibold text-gray-800">
                                  {sig.risk_score ?? 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[11px]">Risk Change:</span>
                                <span className="font-semibold text-gray-800 flex items-center gap-1">
                                  {getDirectionIcon(sig.risk_trend || 'STABLE')}
                                  {sig.risk_change_percent !== null && sig.risk_change_percent !== undefined
                                    ? (sig.risk_change_percent > 0 ? `+${sig.risk_change_percent}%` : `${sig.risk_change_percent}%`)
                                    : '0%'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Confidence & Drilldown Footer */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                            <span className="text-gray-500 font-medium">
                              Confidence: <strong className="text-indigo-600">{Math.round(sig.confidence * 100)}%</strong>
                            </span>
                            <span className="text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                              {sig.evidence_count || sig.supporting_evidence_ids.length} Supporting Evidence &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Candidate Relationships */}
                {analysisResult.relationships && analysisResult.relationships.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Grounded Candidate Relationships
                    </h3>
                    <div className="space-y-2">
                      {analysisResult.relationships.map((rel, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                          <div>
                            <span className="font-semibold text-gray-900">{rel.source_signal_name}</span>
                            <span className="mx-2 text-indigo-600 font-bold">&rarr;</span>
                            <span className="font-semibold text-gray-900">{rel.target_signal_name}</span>
                            <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-medium">
                              {rel.relationship_type}
                            </span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            Strength: <span className="font-semibold text-gray-700">{rel.strength}</span> | 
                            Confidence: <span className="font-semibold text-gray-700">{rel.confidence}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: EVIDENCE VIEW */}
            {activeTab === 'evidence' && (
              <div className="space-y-4">
                {selectedSignalId && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs text-indigo-900">
                    <span>
                      Showing evidence filtered for signal:{' '}
                      <strong>{activeSignal?.canonical_name}</strong>
                    </span>
                    <button
                      onClick={() => setSelectedSignalId(null)}
                      className="text-indigo-700 hover:text-indigo-900 font-semibold underline"
                    >
                      Show All Evidence
                    </button>
                  </div>
                )}

                {displayedEvidence.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    <p className="font-semibold text-gray-800">No Evidence Items Extracted</p>
                    <p className="text-xs text-gray-500 mt-1">No structured evidence statements were produced for this scope.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedEvidence.map((ev) => (
                      <div
                        key={ev.evidence_id}
                        className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-gray-300 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold border border-gray-200">
                              {ev.fact_type}
                            </span>
                            {ev.metric_name && (
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {ev.metric_name}
                              </span>
                            )}
                            <span className="text-xs font-mono text-gray-400">ID: {ev.evidence_id}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            Confidence: {Math.round(ev.extraction_confidence * 100)}%
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-900 leading-relaxed">
                          {ev.statement}
                        </p>

                        {/* Values if available */}
                        {(ev.current_value !== null || ev.previous_value !== null || ev.baseline_value !== null) && (
                          <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              {ev.baseline_value !== null && ev.baseline_value !== undefined && (
                                <div>
                                  <span className="text-gray-500 block text-[10px] uppercase font-medium">Baseline:</span>
                                  <span className="font-semibold text-gray-800">{ev.baseline_value} {ev.unit || ''}</span>
                                  {ev.baseline_timestamp && <span className="text-[10px] text-gray-400 block truncate">{ev.baseline_timestamp}</span>}
                                </div>
                              )}
                              {ev.previous_value !== null && ev.previous_value !== undefined && (
                                <div>
                                  <span className="text-gray-500 block text-[10px] uppercase font-medium">Previous:</span>
                                  <span className="font-semibold text-gray-800">{ev.previous_value} {ev.unit || ''}</span>
                                  {ev.previous_timestamp && <span className="text-[10px] text-gray-400 block truncate">{ev.previous_timestamp}</span>}
                                </div>
                              )}
                              {ev.current_value !== null && ev.current_value !== undefined && (
                                <div>
                                  <span className="text-gray-500 block text-[10px] uppercase font-medium">Current:</span>
                                  <span className="font-semibold text-gray-800">{ev.current_value} {ev.unit || ''}</span>
                                  {ev.current_timestamp && <span className="text-[10px] text-gray-400 block truncate">{ev.current_timestamp}</span>}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 pt-1.5 border-t border-gray-200/60 text-[11px]">
                              {(ev.baseline_to_current_change_percent !== null && ev.baseline_to_current_change_percent !== undefined || ev.baseline_to_current_change !== null && ev.baseline_to_current_change !== undefined) && (
                                <div>
                                  <span className="text-gray-500">Total Change:</span>{' '}
                                  <span className="font-semibold text-gray-800">
                                    {((val) => val && val > 0 ? `+${val}%` : `${val}%`)(ev.baseline_to_current_change_percent ?? ev.baseline_to_current_change)}
                                  </span>
                                </div>
                              )}
                              {(ev.previous_to_current_change_percent !== null && ev.previous_to_current_change_percent !== undefined || ev.previous_to_current_change !== null && ev.previous_to_current_change !== undefined) && (
                                <div>
                                  <span className="text-gray-500">Period Change:</span>{' '}
                                  <span className="font-semibold text-gray-800">
                                    {((val) => val && val > 0 ? `+${val}%` : `${val}%`)(ev.previous_to_current_change_percent ?? ev.previous_to_current_change)}
                                  </span>
                                </div>
                              )}
                              {ev.direction && ev.direction !== 'UNKNOWN' && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Trend:</span>{' '}
                                  {getDirectionIcon(ev.direction)}
                                  <span className="font-semibold text-gray-800">{ev.direction}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Source Citation & Document Opener */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-medium">{ev.source_document_name}</span>
                            {ev.page_numbers && ev.page_numbers.length > 0 && (
                              <span className="text-gray-400">(Pages: {ev.page_numbers.join(', ')})</span>
                            )}
                          </div>

                          <a
                            href={api.getDownloadUrl(ev.source_document_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open Real Source Document
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EVENTS & CLAIMS */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Extracted Events ({(analysisResult.events || []).length})
                  </h3>
                  {(analysisResult.events || []).length === 0 ? (
                    <p className="text-xs text-gray-500 italic bg-white p-4 rounded-lg border">No discrete events detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {analysisResult.events.map((evt) => (
                        <div key={evt.event_id} className="bg-white p-4 rounded-xl border border-gray-200 text-xs space-y-2.5 shadow-xs hover:border-gray-300 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded border border-purple-200">
                                {evt.event_type}
                              </span>
                              {evt.timestamp && (
                                <span className="text-gray-500 text-[11px] font-mono">[{evt.timestamp}]</span>
                              )}
                            </div>
                            <span className="text-gray-500 font-medium">
                              Confidence: <strong className="text-purple-700">{Math.round(evt.confidence * 100)}%</strong>
                            </span>
                          </div>

                          <p className="text-sm font-medium text-gray-900 leading-relaxed">{evt.description}</p>

                          {/* Source Provenance & Document Opener */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-semibold">{evt.source_document_name || 'Document'}</span>
                              {evt.page_numbers && evt.page_numbers.length > 0 ? (
                                <span className="text-gray-500 font-mono">(Page: {evt.page_numbers.join(', ')})</span>
                              ) : evt.citation ? (
                                <span className="text-gray-400 font-mono">({evt.citation})</span>
                              ) : null}
                            </div>

                            {evt.source_document_id && evt.source_document_id !== 'unknown' && (
                              <a
                                href={api.getDownloadUrl(evt.source_document_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open Real Source Document
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Subjective Claims ({(analysisResult.claims || []).length})
                  </h3>
                  {(analysisResult.claims || []).length === 0 ? (
                    <p className="text-xs text-gray-500 italic bg-white p-4 rounded-lg border">No subjective claims detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {analysisResult.claims.map((clm) => (
                        <div key={clm.claim_id} className="bg-white p-4 rounded-xl border border-gray-200 text-xs space-y-2.5 shadow-xs hover:border-gray-300 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded border border-amber-200">
                              CLAIM {clm.source_speaker_or_entity ? `by ${clm.source_speaker_or_entity}` : ''}
                            </span>
                            <span className="text-gray-500 font-medium">
                              Confidence: <strong className="text-amber-700">{Math.round(clm.confidence * 100)}%</strong>
                            </span>
                          </div>

                          <p className="text-sm font-medium text-gray-900 leading-relaxed">{clm.statement}</p>

                          {/* Source Provenance & Document Opener */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-semibold">{clm.source_document_name || 'Document'}</span>
                              {clm.page_numbers && clm.page_numbers.length > 0 ? (
                                <span className="text-gray-500 font-mono">(Page: {clm.page_numbers.join(', ')})</span>
                              ) : clm.citation ? (
                                <span className="text-gray-400 font-mono">({clm.citation})</span>
                              ) : null}
                            </div>

                            {clm.source_document_id && clm.source_document_id !== 'unknown' && (
                              <a
                                href={api.getDownloadUrl(clm.source_document_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open Real Source Document
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: PIPELINE DIAGNOSTICS */}
            {activeTab === 'pipeline' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    LangGraph Node Traversal Sequence
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {(analysisResult.processing_metadata?.node_path || []).map((node, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-mono font-semibold rounded-md border border-indigo-200">
                          {node}
                        </span>
                        {idx < (analysisResult.processing_metadata.node_path?.length || 0) - 1 && (
                          <span className="text-gray-400">&rarr;</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Execution Latencies
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {Object.entries(analysisResult.processing_metadata?.execution_latencies || {}).map(([key, val]) => (
                      <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 block truncate" title={key}>{key}</span>
                        <span className="font-mono font-bold text-gray-900">{val.toFixed(4)}s</span>
                      </div>
                    ))}
                  </div>
                </div>

                {analysisResult.warnings && analysisResult.warnings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Validation Warnings ({analysisResult.warnings.length})
                    </h3>
                    <div className="space-y-1.5">
                      {analysisResult.warnings.map((w, idx) => (
                        <div key={idx} className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                          <strong>[{w.code}]</strong> {w.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
