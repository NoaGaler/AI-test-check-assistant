import React from 'react';
import { CheckCircle2, BookOpen, Sparkles, History, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenRubric: () => void;
  onOpenGradebook: () => void;
  gradedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRubric,
  onOpenGradebook,
  gradedCount,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-slate-900 text-base leading-tight tracking-tight">
                AutoGrade AI
              </h1>
              <span className="text-slate-400 text-xs">/</span>
              <span className="text-xs font-medium text-slate-600">
                Exam Logic Evaluator
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Question 1: Valid Parentheses</span>
              <span aria-hidden="true">·</span>
              <span>LeetCode 20</span>
              <span aria-hidden="true">·</span>
              <span>Stack Logic Standard</span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRubric}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="View Official Evaluation Rubric & Reference Solution"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Grading Rubric</span>
          </button>

          <button
            onClick={onOpenGradebook}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="View History and Session Gradebook"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Gradebook</span>
            {gradedCount > 0 && (
              <span className="ml-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                {gradedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
