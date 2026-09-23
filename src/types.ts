export interface EvaluationResult {
  student_name: string;
  student_email: string;
  transcribed_code: string;
  is_correct: boolean;
  score: number;
  feedback: string;
  detected_issues?: string[];
  positive_notes?: string[];
  test_cases?: TestCaseResult[];
  model_used?: string;
}

export interface TestCaseResult {
  input: string;
  expected: boolean;
  actual_passed: boolean;
  notes?: string;
}

export interface InteractiveTestResult {
  input: string;
  expected: boolean;
  actual: string;
  passed: boolean;
  trace: string;
}

export interface GradedSubmission {
  id: string;
  timestamp: number;
  student_name: string;
  student_email: string;
  score: number;
  is_correct: boolean;
  feedback: string;
  transcribed_code: string;
  image_preview?: string;
  category: 'fatal' | 'minor' | 'perfect';
}

export interface SampleExamPaper {
  id: string;
  name: string;
  student_name: string;
  student_email: string;
  description: string;
  tier: 'perfect' | 'minor' | 'fatal';
  expected_score_range: string;
  code: string;
  handwriting_style: 'alex' | 'jordan' | 'sam' | 'maya';
}
