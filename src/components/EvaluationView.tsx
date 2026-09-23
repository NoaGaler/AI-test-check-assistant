import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Code,
  Terminal,
  Play,
  RotateCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Mail,
  User,
  ExternalLink,
  FileCheck,
  FileText
} from 'lucide-react';
import { EvaluationResult, InteractiveTestResult } from '../types';

interface EvaluationViewProps {
  evaluation: EvaluationResult | null;
  isEvaluating: boolean;
  onReEvaluateCode: (codeText: string, studentName: string, studentEmail: string) => Promise<void>;
  onOpenStackTracer: (testStr?: string) => void;
  sourceType?: 'uploaded' | 'sample' | 'camera' | 'drawn';
  sourceName?: string | null;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  evaluation,
  isEvaluating,
  onReEvaluateCode,
  onOpenStackTracer,
  sourceType,
  sourceName,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [editableName, setEditableName] = useState('');
  const [editableEmail, setEditableEmail] = useState('');
  const [isCodeModified, setIsCodeModified] = useState(false);
  const [showJsonRaw, setShowJsonRaw] = useState(false);
  const [testResults, setTestResults] = useState<InteractiveTestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Sync state whenever evaluation updates
  React.useEffect(() => {
    if (evaluation) {
      setEditableCode(evaluation.transcribed_code);
      setEditableName(evaluation.student_name);
      setEditableEmail(evaluation.student_email);
      setIsCodeModified(false);
      setTestResults(null);
    }
  }, [evaluation]);

  if (isEvaluating) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[500px] text-center shadow-xs">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <Code className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          {sourceType === 'uploaded'
            ? sourceName?.toLowerCase().endsWith('.pdf')
              ? 'Analyzing Uploaded PDF Document'
              : 'Analyzing Real Uploaded Scan'
            : 'Analyzing Exam Submission'}
        </h3>
        {sourceType === 'uploaded' && sourceName && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border my-2 ${
            sourceName?.toLowerCase().endsWith('.pdf')
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {sourceName?.toLowerCase().endsWith('.pdf') ? (
              <FileText className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Document: {sourceName}</span>
          </div>
        )}
        <div className="flex flex-col gap-1 text-xs text-slate-500 mt-2 max-w-sm">
          <span>1. Grading with Gemini 2.5 Flash via @google/genai SDK...</span>
          <span>2. OCR extracting student name, email, and Python syntax...</span>
          <span>3. Mentally tracing stack logic on LeetCode test cases...</span>
          <span>4. Applying balanced & encouraging rubric scoring...</span>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[500px] text-center shadow-xs">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <Terminal className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">
          No Exam Paper Evaluated Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select a sample paper on the left or upload an exam image, then click
          &quot;Evaluate Exam Paper&quot; to begin.
        </p>
      </div>
    );
  }

  // Strictly formatted JSON output conforming to required schema
  const requiredJsonOutput = {
    student_name: evaluation.student_name,
    student_email: evaluation.student_email,
    transcribed_code: evaluation.transcribed_code,
    is_correct: evaluation.is_correct,
    score: evaluation.score,
    feedback: evaluation.feedback,
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(requiredJsonOutput, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editableCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRunInteractiveTests = async () => {
    try {
      setIsRunningTests(true);
      const res = await fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editableCode }),
      });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
      }
    } catch (err) {
      console.error('Failed to run tests:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Determine score color & tier
  const score = evaluation.score;
  const isFatal = score <= 40;
  const isMinor = score > 40 && score < 95;
  const isPerfect = score >= 95;

  const scoreTheme = isPerfect
    ? {
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        indicator: 'bg-emerald-500',
        tierLabel: 'Fully Working Stack Logic',
        tierRange: '95–100 pts',
      }
    : isMinor
    ? {
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        indicator: 'bg-amber-500',
        tierLabel: 'Minor Structural / Syntax Issues',
        tierRange: '60–90 pts',
      }
    : {
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        indicator: 'bg-rose-500',
        tierLabel: 'Fatal / Critical Logic Error',
        tierRange: '0–40 pts',
      };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-xs space-y-4 p-5">
      {/* 1. Header Details & Score Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${scoreTheme.bg} ${scoreTheme.border}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`w-2.5 h-2.5 rounded-full ${scoreTheme.indicator}`}
            />
            <span className={`text-xs font-semibold uppercase tracking-wider ${scoreTheme.text}`}>
              {scoreTheme.tierLabel}
            </span>
            <span className="text-slate-400 text-xs">·</span>
            <span className="text-xs text-slate-500">
              Rubric: {scoreTheme.tierRange}
            </span>
            {sourceType === 'uploaded' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                sourceName?.toLowerCase().endsWith('.pdf')
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {sourceName?.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-3 h-3 text-rose-600" />
                ) : (
                  <FileCheck className="w-3 h-3 text-emerald-600" />
                )}
                {sourceName?.toLowerCase().endsWith('.pdf') ? 'PDF Upload' : 'Real Upload'}
                {sourceName ? `: ${sourceName}` : ''}
              </span>
            )}
            {sourceType === 'sample' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <FileText className="w-3 h-3 text-indigo-600" />
                Benchmark Mock Sample
              </span>
            )}
            {evaluation.model_used && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                  evaluation.model_used.includes('2.5-flash')
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-purple-50 text-purple-800 border-purple-200'
                }`}
                title={
                  evaluation.model_used === 'gemini-2.5-flash'
                    ? 'Evaluated using primary model (gemini-2.5-flash)'
                    : `Evaluated using fallback model (${evaluation.model_used})`
                }
              >
                <span>
                  {evaluation.model_used === 'gemini-2.5-flash'
                    ? 'Model: gemini-2.5-flash'
                    : `Model: ${evaluation.model_used}`}
                </span>
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-800 font-medium">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{evaluation.student_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{evaluation.student_email}</span>
            </div>
          </div>
        </div>

        {/* Score Ring Display */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900 leading-none">
              {score}
              <span className="text-sm font-normal text-slate-500">/100</span>
            </div>
            <div className="text-[11px] font-medium mt-1 flex items-center justify-end gap-1">
              {evaluation.is_correct ? (
                <span className="text-emerald-700 flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Solved
                </span>
              ) : (
                <span className="text-rose-700 flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> Flaws Detected
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Balanced & Encouraging Feedback */}
      <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-200">
        <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5 flex items-center justify-between">
          <span>Evaluator Feedback</span>
          <span className="text-[11px] font-normal text-slate-500 lowercase">
            balanced & constructive
          </span>
        </h4>
        <p className="text-xs leading-relaxed text-slate-700">
          {evaluation.feedback}
        </p>

        {/* Detected specific issues & positive notes */}
        {((evaluation.positive_notes && evaluation.positive_notes.length > 0) ||
          (evaluation.detected_issues && evaluation.detected_issues.length > 0)) && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-3">
            {evaluation.positive_notes && evaluation.positive_notes.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Strengths Observed</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                  {evaluation.positive_notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.detected_issues && evaluation.detected_issues.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-rose-800 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>Areas for Improvement</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                  {evaluation.detected_issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Transcribed Code Inspector & Editor */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-900 text-slate-200 px-3 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-100 font-mono text-[11px]">
              Transcribed Python Code (Question 1)
            </span>
            {isCodeModified && (
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                Modified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors text-[11px]"
              title="Copy Code"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>

            {isCodeModified && (
              <button
                onClick={() =>
                  onReEvaluateCode(editableCode, editableName, editableEmail)
                }
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-[11px] transition-colors"
              >
                <RotateCw className="w-3 h-3" /> Re-Grade
              </button>
            )}
          </div>
        </div>

        {/* Code editor textarea with line numbers styling */}
        <div className="relative bg-slate-950 font-mono text-xs">
          <textarea
            value={editableCode}
            onChange={(e) => {
              setEditableCode(e.target.value);
              setIsCodeModified(true);
            }}
            rows={12}
            spellCheck={false}
            className="w-full bg-slate-950 text-slate-200 p-3 font-mono text-xs focus:outline-hidden resize-y leading-relaxed border-none selection:bg-indigo-500/30"
          />
        </div>

        <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Edit code freely to test corrections or fix OCR typos.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenStackTracer()}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px]"
            >
              <Layers className="w-3 h-3" /> Stack Stepper
            </button>
            <button
              onClick={handleRunInteractiveTests}
              disabled={isRunningTests}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] transition-colors"
            >
              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              {isRunningTests ? 'Tracing...' : 'Run Test Suite'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Interactive Test Suite Results */}
      {testResults && (
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-slate-800">
              Canonical LeetCode 20 Test Results
            </h5>
            <span className="text-[11px] text-slate-500 font-mono">
              Passed: {testResults.filter((r) => r.passed).length} /{' '}
              {testResults.length}
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {testResults.map((t, idx) => (
              <div
                key={idx}
                className="bg-white p-2 rounded border border-slate-200 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-800 font-semibold">
                    input: &quot;{t.input}&quot;
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      exp: {String(t.expected)}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        t.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">{t.trace}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Required Output JSON Inspector */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowJsonRaw(!showJsonRaw)}
          className="w-full bg-slate-100 hover:bg-slate-200/80 px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>Required Backend JSON Output Format</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyJson();
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" /> Copied JSON
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy JSON
                </>
              )}
            </button>
            {showJsonRaw ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </button>

        {showJsonRaw && (
          <div className="bg-slate-900 p-3 overflow-x-auto text-[11px] font-mono text-emerald-400 max-h-60 leading-relaxed border-t border-slate-200">
            <pre>{JSON.stringify(requiredJsonOutput, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
