import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageScanner } from './components/ImageScanner';
import { EvaluationView } from './components/EvaluationView';
import { StackTracerModal } from './components/StackTracerModal';
import { RubricInfoModal } from './components/RubricInfoModal';
import { GradebookModal } from './components/GradebookModal';
import { EvaluationResult, GradedSubmission, SampleExamPaper } from './types';
import { SAMPLE_EXAM_PAPERS } from './utils/samplePapers';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

export default function App() {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gradedSubmissions, setGradedSubmissions] = useState<GradedSubmission[]>([]);
  const [activeSample, setActiveSample] = useState<SampleExamPaper | null>(null);
  const [paperSource, setPaperSource] = useState<'uploaded' | 'sample' | 'camera' | 'drawn'>('uploaded');
  const [paperName, setPaperName] = useState<string | null>(null);

  // Modal visibility states
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isGradebookOpen, setIsGradebookOpen] = useState(false);
  const [isStackTracerOpen, setIsStackTracerOpen] = useState(false);
  const [tracerInitialString, setTracerInitialString] = useState('{[()]}');

  // Submit image to server AI grading engine
  const handleGradeImage = async (imageDataUrl: string, mimeType: string) => {
    try {
      setIsGrading(true);
      setErrorMessage(null);

      const res = await fetch('/api/grade-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: mimeType || 'image/png',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to evaluate exam paper');
      }

      setEvaluation(data);

      // Record in session gradebook
      const score = data.score ?? 0;
      const category: 'perfect' | 'minor' | 'fatal' =
        score >= 95 ? 'perfect' : score > 40 ? 'minor' : 'fatal';

      const newSubmission: GradedSubmission = {
        id: `sub-${Date.now()}`,
        timestamp: Date.now(),
        student_name: data.student_name,
        student_email: data.student_email,
        score,
        is_correct: data.is_correct,
        feedback: data.feedback,
        transcribed_code: data.transcribed_code,
        category,
      };

      setGradedSubmissions((prev) => [newSubmission, ...prev]);
    } catch (err: any) {
      console.error('Grading error:', err);
      setErrorMessage(err.message || 'An error occurred during evaluation.');
    } finally {
      setIsGrading(false);
    }
  };

  // Re-evaluate edited code directly
  const handleReEvaluateCode = async (
    codeText: string,
    studentName: string,
    studentEmail: string
  ) => {
    try {
      setIsGrading(true);
      setErrorMessage(null);

      const res = await fetch('/api/grade-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeText,
          studentName,
          studentEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to re-evaluate code');
      }

      setEvaluation(data);

      const score = data.score ?? 0;
      const category: 'perfect' | 'minor' | 'fatal' =
        score >= 95 ? 'perfect' : score > 40 ? 'minor' : 'fatal';

      const newSubmission: GradedSubmission = {
        id: `sub-${Date.now()}`,
        timestamp: Date.now(),
        student_name: data.student_name,
        student_email: data.student_email,
        score,
        is_correct: data.is_correct,
        feedback: data.feedback,
        transcribed_code: data.transcribed_code,
        category,
      };

      setGradedSubmissions((prev) => [newSubmission, ...prev]);
    } catch (err: any) {
      console.error('Re-evaluation error:', err);
      setErrorMessage(err.message || 'Failed to re-evaluate code.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleSelectFromGradebook = (sub: GradedSubmission) => {
    setEvaluation({
      student_name: sub.student_name,
      student_email: sub.student_email,
      transcribed_code: sub.transcribed_code,
      score: sub.score,
      is_correct: sub.is_correct,
      feedback: sub.feedback,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Bar */}
      <Header
        onOpenRubric={() => setIsRubricOpen(true)}
        onOpenGradebook={() => setIsGradebookOpen(true)}
        gradedCount={gradedSubmissions.length}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
          {/* Left Column: Image Scanner / Uploader / Paper Gallery */}
          <div className="lg:col-span-6 flex flex-col">
            <ImageScanner
              onGradeImage={handleGradeImage}
              isGrading={isGrading}
              activeSampleId={activeSample?.id || null}
              onSelectSample={(sample) => {
                setActiveSample(sample);
                if (sample) {
                  setPaperSource('sample');
                  setPaperName(sample.student_name);
                }
              }}
              onSourceChange={(type, name) => {
                setPaperSource(type);
                setPaperName(name || null);
              }}
            />
          </div>

          {/* Right Column: AI Logic Evaluation View */}
          <div className="lg:col-span-6 flex flex-col">
            <EvaluationView
              evaluation={evaluation}
              isEvaluating={isGrading}
              onReEvaluateCode={handleReEvaluateCode}
              sourceType={paperSource}
              sourceName={paperName}
              onOpenStackTracer={(str) => {
                if (str) setTracerInitialString(str);
                setIsStackTracerOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>AutoGrade AI</span>
            <span aria-hidden="true">·</span>
            <span>Question 1: Valid Parentheses Logic Verification</span>
            <span aria-hidden="true">·</span>
            <span>Balanced Grading Rubric</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Strictly formatted JSON backend engine
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RubricInfoModal
        isOpen={isRubricOpen}
        onClose={() => setIsRubricOpen(false)}
      />

      <GradebookModal
        isOpen={isGradebookOpen}
        onClose={() => setIsGradebookOpen(false)}
        submissions={gradedSubmissions}
        onClearHistory={() => setGradedSubmissions([])}
        onSelectSubmission={handleSelectFromGradebook}
      />

      <StackTracerModal
        isOpen={isStackTracerOpen}
        onClose={() => setIsStackTracerOpen(false)}
        initialString={tracerInitialString}
      />
    </div>
  );
}
