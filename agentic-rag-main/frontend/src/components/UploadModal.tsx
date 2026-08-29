import React, { useState, useRef } from 'react';
import { X, Upload, Plus, Trash2, FileText, AlertCircle } from 'lucide-react';
import { api } from '../api';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata state
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('Academic Calendar');
  const [department, setDepartment] = useState('All Departments');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('All');
  const [audience, setAudience] = useState('All Students');
  const [description, setDescription] = useState('');

  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');

  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const [questions, setQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState('');

  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [version, setVersion] = useState('1.0');
  const [priority, setPriority] = useState('1');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) {
        setTitle(e.target.files[0].name.replace('.pdf', '').replace(/_/g, ' '));
      }
    }
  };

  const addArrayItem = (input: string, setInput: (v: string) => void, list: string[], setList: (l: string[]) => void) => {
    const val = input.trim();
    if (val && !list.includes(val)) {
      setList([...list, val]);
      setInput('');
    }
  };

  const removeArrayItem = (index: number, list: string[], setList: (l: string[]) => void) => {
    const newList = [...list];
    newList.splice(index, 1);
    setList(newList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    if (!title || !documentType) {
      setError("Title and Document Type are required.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const metadata = {
        title,
        document_type: documentType,
        department,
        academic_year: academicYear,
        semester,
        applicable_audience: audience,
        description,
        topics,
        keywords,
        example_questions: questions,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil,
        version,
        priority: parseInt(priority) || 1
      };

      await api.uploadDocument(file, metadata);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-start z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col flex-shrink-0">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Upload className="w-6 h-6 text-indigo-600" />
            Upload Document & Knowledge Profile
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form id="upload-form" onSubmit={handleSubmit} className="space-y-8">

            {/* File Selection */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">File Selection</h3>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.md"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Select Document *
                </button>
                {file && (
                  <span className="text-sm text-gray-600 font-medium truncate flex-1">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Basic Info */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Basic Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    placeholder="e.g. Academic Calendar 2026-27" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                  <select value={documentType} onChange={e => setDocumentType(e.target.value)} required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white">
                    <option value="Academic Calendar">Academic Calendar</option>
                    <option value="Timetable">Timetable</option>
                    <option value="Examination Schedule">Examination Schedule</option>
                    <option value="Circular / Notification">Circular / Notification</option>
                    <option value="Regulation">Regulation</option>
                    <option value="Syllabus">Syllabus</option>
                    <option value="Admission Information">Admission Information</option>
                    <option value="Fee Information">Fee Information</option>
                    <option value="Placement Information">Placement Information</option>
                    <option value="Department Information">Department Information</option>
                    <option value="Event / Notice">Event / Notice</option>
                    <option value="General College Document">General College Document</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    placeholder="Short explanation of what this document contains..."></textarea>
                </div>
              </div>

              {/* Applicability */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Applicability</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white">
                      <option value="All Departments">All Departments</option>
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                      placeholder="e.g. 2026-27" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select value={semester} onChange={e => setSemester(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white">
                      <option value="All">All</option>
                      <option value="Odd">Odd</option>
                      <option value="Even">Even</option>
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Semester 3">Semester 3</option>
                      <option value="Semester 4">Semester 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                    <input type="text" value={audience} onChange={e => setAudience(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                      placeholder="e.g. UG, All Students..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Knowledge Profile */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Knowledge Profile (Tags & Questions)</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topics</label>
                  <p className="text-xs text-gray-500 mb-2">High-level topics covered.</p>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem(topicInput, setTopicInput, topics, setTopics))}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm"
                      placeholder="e.g. Holiday, Exam..." />
                    <button type="button" onClick={() => addArrayItem(topicInput, setTopicInput, topics, setTopics)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t}
                        <button type="button" onClick={() => removeArrayItem(i, topics, setTopics)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                  <p className="text-xs text-gray-500 mb-2">Search terms students might use.</p>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem(keywordInput, setKeywordInput, keywords, setKeywords))}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm"
                      placeholder="e.g. day order, suspension..." />
                    <button type="button" onClick={() => addArrayItem(keywordInput, setKeywordInput, keywords, setKeywords)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((k, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {k}
                        <button type="button" onClick={() => removeArrayItem(i, keywords, setKeywords)} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Example Questions</label>
                <p className="text-xs text-gray-500 mb-2">
                  Add questions students may ask about this document. These examples help the RAG understand the document's possible question space.
                  <strong> The examples MUST NOT become fake answers.</strong>
                </p>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={questionInput} onChange={e => setQuestionInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem(questionInput, setQuestionInput, questions, setQuestions))}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm"
                    placeholder="e.g. When is October 17 a holiday?" />
                  <button type="button" onClick={() => addArrayItem(questionInput, setQuestionInput, questions, setQuestions)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Question
                  </button>
                </div>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                      <span>{q}</span>
                      <button type="button" onClick={() => removeArrayItem(i, questions, setQuestions)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Validity & Version */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Validity & Version</h3>
              <p className="text-xs text-gray-500">Use priority/version/effective dates when multiple documents contain overlapping or conflicting information.</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                  <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Until</label>
                  <input type="date" value={effectiveUntil} onChange={e => setEffectiveUntil(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input type="number" value={priority} onChange={e => setPriority(e.target.value)} min="1"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border text-sm" />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="upload-form"
            disabled={uploading || !file}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload & Process
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
