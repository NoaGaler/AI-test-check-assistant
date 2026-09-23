import React from 'react';
import { X, BookOpen, CheckCircle, AlertTriangle, XCircle, Code } from 'lucide-react';

interface RubricInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RubricInfoModal: React.FC<RubricInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Evaluation Rubric & Context
              </h3>
              <p className="text-xs text-slate-500">
                Official grading criteria for Question 1: Valid Parentheses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Reference Expected Solution */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-600" />
              <span>Expected Standard Solution (Stack-Based)</span>
            </h4>
            <div className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{`class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in mapping:
                top = stack.pop() if stack else '#'
                if top != mapping[char]: 
                    return False
            else:
                stack.append(char)
        return len(stack) == 0`}</pre>
            </div>
          </div>

          {/* Grading Standards */}
          <div>
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Balanced & Encouraging Grading Standard
            </h4>

            <div className="space-y-3">
              {/* 95-100 */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900 text-xs">
                    Fully Working Stack Logic (95–100 Points)
                  </div>
                  <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                    Uses a LIFO stack appropriately, correctly maps opening/closing brackets, guards against popping from an empty stack, and properly confirms an empty stack at the end.
                  </p>
                </div>
              </div>

              {/* 60-90 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900 text-xs">
                    Minor Syntax or Structural Issues (60–90 Points)
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    Core stack understanding is evident, but with minor handwriting indentation ambiguities, small typographical mistakes, or missing empty-stack guards before popping.
                  </p>
                </div>
              </div>

              {/* 0-40 */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-900 text-xs">
                    Fatal / Critical Logic Errors (0–40 Points)
                  </div>
                  <p className="text-rose-800 text-[11px] mt-0.5 leading-relaxed">
                    Uses wrong data structures (e.g. integer counters which cannot check nesting order like &quot;([)]&quot;), misses stack matching completely, or submits unviable logic.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* OCR Extraction Rules */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
            <h5 className="font-semibold text-slate-800 mb-1 text-xs">
              OCR & Extraction Guidelines
            </h5>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
              <li>
                <strong className="text-slate-800">Line 1:</strong> Student Name
              </li>
              <li>
                <strong className="text-slate-800">Line 2:</strong> Student Email
              </li>
              <li>
                <strong className="text-slate-800">Subsequent lines:</strong> Faithfully transcribe Python code for Question 1
              </li>
              <li>
                Constructive, encouraging tone that avoids penalizing harshly for handwriting quirks while maintaining computational correctness.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium transition-colors"
          >
            Close Rubric
          </button>
        </div>
      </div>
    </div>
  );
};
