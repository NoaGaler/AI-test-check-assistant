import React, { useState } from 'react';
import {
  X,
  History,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { GradedSubmission } from '../types';

interface GradebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: GradedSubmission[];
  onClearHistory: () => void;
  onSelectSubmission: (submission: GradedSubmission) => void;
}

export const GradebookModal: React.FC<GradebookModalProps> = ({
  isOpen,
  onClose,
  submissions,
  onClearHistory,
  onSelectSubmission,
}) => {
  const [filter, setFilter] = useState<'all' | 'perfect' | 'minor' | 'fatal'>('all');

  if (!isOpen) return null;

  const filteredSubmissions = submissions.filter((s) => {
    if (filter === 'all') return true;
    return s.category === filter;
  });

  const averageScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length
        )
      : 0;

  const exportCSV = () => {
    const headers = ['Student Name', 'Student Email', 'Score', 'Is Correct', 'Category', 'Feedback'];
    const rows = submissions.map((s) => [
      `"${s.student_name.replace(/"/g, '""')}"`,
      `"${s.student_email.replace(/"/g, '""')}"`,
      s.score,
      s.is_correct ? 'TRUE' : 'FALSE',
      s.category,
      `"${s.feedback.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gradebook_q1_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonStr = JSON.stringify(submissions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gradebook_q1_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Exam Session Gradebook
              </h3>
              <p className="text-xs text-slate-500">
                {submissions.length} submissions evaluated in this session · Avg Score: {averageScore}/100
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {submissions.length > 0 && (
              <>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
                  title="Export to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
                  title="Export to JSON"
                >
                  <FileJson className="w-3.5 h-3.5 text-indigo-600" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={onClearHistory}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter by Tier:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilter('perfect')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'perfect'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Perfect (95-100)
            </button>
            <button
              onClick={() => setFilter('minor')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'minor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Minor (60-90)
            </button>
            <button
              onClick={() => setFilter('fatal')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filter === 'fatal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fatal (0-40)
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No submissions match the selected criteria.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Evaluation Status</th>
                    <th className="py-2.5 px-3">Feedback Summary</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubmissions.map((sub) => {
                    const badge =
                      sub.category === 'perfect'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : sub.category === 'minor'
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-rose-700 bg-rose-50 border-rose-200';

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {sub.student_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {sub.student_email}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {sub.score}/100
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold inline-flex items-center gap-1 ${badge}`}
                          >
                            {sub.category === 'perfect' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : sub.category === 'minor' ? (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            )}
                            {sub.category === 'perfect'
                              ? 'Fully Working'
                              : sub.category === 'minor'
                              ? 'Minor Flaws'
                              : 'Fatal Error'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {sub.feedback}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              onSelectSubmission(sub);
                              onClose();
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium transition-colors"
          >
            Close Gradebook
          </button>
        </div>
      </div>
    </div>
  );
};
