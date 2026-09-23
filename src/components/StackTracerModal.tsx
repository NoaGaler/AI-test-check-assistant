import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, ArrowRight, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { CANONICAL_TEST_CASES, traceStackExecution, StackStep } from '../utils/testRunner';

interface StackTracerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialString?: string;
}

export const StackTracerModal: React.FC<StackTracerModalProps> = ({
  isOpen,
  onClose,
  initialString = '{[()]}',
}) => {
  const [testString, setTestString] = useState(initialString);
  const [steps, setSteps] = useState<StackStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTestString(initialString);
      const res = traceStackExecution(initialString);
      setSteps(res.steps);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  }, [isOpen, initialString]);

  const handleUpdateString = (newStr: string) => {
    setTestString(newStr);
    const res = traceStackExecution(newStr);
    setSteps(res.steps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  if (!isOpen) return null;

  const currentStep: StackStep | undefined = steps[currentStepIndex];
  const isFinished = currentStepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span>Stack-Based Bracket Matching Visualizer</span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive LIFO stack trace demonstrating the expected solution logic
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar & Presets */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
              Test String:
            </label>
            <input
              type="text"
              value={testString}
              onChange={(e) => handleUpdateString(e.target.value)}
              placeholder="e.g. {[()]}"
              className="flex-1 font-mono text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:outline-indigo-600 focus:border-indigo-600"
            />
            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              title="Reset to beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px]">Presets:</span>
            {CANONICAL_TEST_CASES.slice(0, 6).map((tc) => (
              <button
                key={tc.id}
                onClick={() => handleUpdateString(tc.input)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  testString === tc.input
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                &quot;{tc.input}&quot;
              </button>
            ))}
          </div>
        </div>

        {/* Step-by-Step Visualization Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center space-y-6 bg-slate-50/50">
          {/* Characters string track */}
          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-400 font-medium">Input String:</span>
            <div className="flex items-center gap-1.5">
              {testString.split('').map((ch, idx) => {
                const isCurrent =
                  currentStep &&
                  currentStep.action !== 'final_check' &&
                  currentStep.stepIndex === idx + 1;
                const isProcessed =
                  currentStep && currentStep.stepIndex > idx + 1;

                return (
                  <div
                    key={idx}
                    className={`w-9 h-9 rounded-lg font-mono text-base font-bold flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110 shadow-sm'
                        : isProcessed
                        ? 'bg-slate-100 text-slate-400 border border-slate-200'
                        : 'bg-white text-slate-800 border border-slate-300'
                    }`}
                  >
                    {ch}
                  </div>
                );
              })}
              {testString.length === 0 && (
                <span className="text-xs text-slate-400 font-mono italic">
                  (Empty String &quot;&quot;)
                </span>
              )}
            </div>
          </div>

          {/* Visual LIFO Stack Representation */}
          <div className="flex flex-col items-center">
            <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
              LIFO Stack (Bottom to Top)
            </div>

            <div className="w-36 min-h-[140px] max-h-[180px] border-b-4 border-l-4 border-r-4 border-slate-400 rounded-b-lg p-2 flex flex-col-reverse items-center justify-start gap-1.5 bg-white/80 shadow-inner">
              {currentStep && currentStep.stackState.length > 0 ? (
                currentStep.stackState.map((stkChar, idx) => {
                  const isTop = idx === currentStep.stackState.length - 1;
                  return (
                    <div
                      key={idx}
                      className={`w-full py-1 text-center font-mono font-bold text-sm rounded shadow-xs border transition-all ${
                        isTop
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {stkChar} {isTop && <span className="text-[10px] text-indigo-600 font-normal">(top)</span>}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 my-auto italic">
                  Stack is empty
                </div>
              )}
            </div>
          </div>

          {/* Current Step Description Card */}
          {currentStep && (
            <div
              className={`w-full max-w-md p-3.5 rounded-xl border text-xs leading-relaxed transition-all ${
                currentStep.isError
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : isFinished
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              <div className="font-semibold mb-1 flex items-center justify-between">
                <span>
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                {currentStep.isError ? (
                  <span className="flex items-center gap-1 text-rose-700 font-bold">
                    <XCircle className="w-3.5 h-3.5" /> Validation Failed
                  </span>
                ) : isFinished ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Validation Complete
                  </span>
                ) : null}
              </div>
              <p>{currentStep.description}</p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Previous Step
            </button>
            <button
              onClick={() =>
                setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
              }
              disabled={currentStepIndex >= steps.length - 1}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Next Step
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors text-white ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              {isPlaying ? 'Pause' : 'Auto Play'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
