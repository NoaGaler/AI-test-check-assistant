import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Allow base64 payload up to 25MB for high-res exam scans
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Primary grading model and automated fallback models
const PRIMARY_GRADING_MODEL = 'gemini-2.5-flash';
const FALLBACK_GRADING_MODELS = ['gemini-2.0-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview'];

/**
 * Checks if an error is a 404 (Model Not Found / deprecated), 429 (Quota Exceeded / Rate Limit),
 * or 503 (Service Unavailable / Overloaded) error that can be recovered with a fallback model.
 */
function isRetriableModelError(err: any): boolean {
  if (!err) return false;
  const status =
    err?.status ||
    err?.statusCode ||
    err?.code ||
    err?.error?.code ||
    err?.status_code ||
    err?.response?.status;

  if (
    status === 404 ||
    status === 429 ||
    status === 503 ||
    status === 'NOT_FOUND' ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'UNAVAILABLE'
  ) {
    return true;
  }

  const str = (
    (err?.message || '') +
    ' ' +
    (err?.statusText || '') +
    ' ' +
    (typeof err === 'string' ? err : JSON.stringify(err))
  ).toLowerCase();

  return (
    str.includes('404') ||
    str.includes('not found') ||
    str.includes('not_found') ||
    str.includes('no longer available') ||
    str.includes('429') ||
    str.includes('503') ||
    str.includes('quota') ||
    str.includes('resource_exhausted') ||
    str.includes('rate limit') ||
    str.includes('rate_limit') ||
    str.includes('unavailable') ||
    str.includes('high demand') ||
    str.includes('overloaded')
  );
}

interface GenerateContentResult {
  response: any;
  modelUsed: string;
  fallbacksAttempted: string[];
}

/**
 * Executes a Gemini request using gemini-2.5-flash as the primary model.
 * If a 404 (Model Not Found / unavailable), 429 (Quota Exceeded), or 503 error occurs,
 * automatically retries the request using fallback models (gemini-2.0-flash, gemini-3.6-flash).
 */
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
  fallbackModels?: string[];
}): Promise<GenerateContentResult> {
  const primary = params.primaryModel || PRIMARY_GRADING_MODEL;
  const fallbacks = params.fallbackModels || FALLBACK_GRADING_MODELS;
  const modelChain = [primary, ...fallbacks.filter((m) => m !== primary)];

  let lastError: any = null;
  const fallbacksAttempted: string[] = [];

  for (let i = 0; i < modelChain.length; i++) {
    const currentModel = modelChain[i];
    const isFallback = i > 0;

    if (isFallback) {
      fallbacksAttempted.push(currentModel);
      console.warn(
        `[Auto Fallback] Retrying grading request with fallback model: "${currentModel}" after error on previous model...`
      );
    }

    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: params.contents,
        config: params.config,
      });

      if (isFallback) {
        console.log(
          `[Auto Fallback Success] Successfully fulfilled grading request with model: "${currentModel}"`
        );
      }

      return {
        response,
        modelUsed: currentModel,
        fallbacksAttempted,
      };
    } catch (err: any) {
      lastError = err;
      const canFallback = isRetriableModelError(err);
      const errMsg = err?.message || String(err);

      console.error(
        `[Model Execution Error] Model "${currentModel}" failed (Can Fallback: ${canFallback}):`,
        errMsg
      );

      // If it's a 404, 429, or 503 error and fallback models remain in the chain, retry with the next model
      if (canFallback && i < modelChain.length - 1) {
        const nextModel = modelChain[i + 1];
        console.warn(
          `[Fallback Triggered] Recoverable error encountered on ${currentModel}. Automatically retrying with model ${nextModel}...`
        );
        // Brief pause before trying fallback model
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      // If not retriable, immediately rethrow
      if (!canFallback) {
        throw err;
      }
    }
  }

  throw lastError;
}

const SYSTEM_INSTRUCTION = `You are the AI backend engine for an automated exam grading application.
Your task is to analyze an image of a handwritten exam paper (or transcribed handwritten code), extract student details, verify code logic, and issue a fair evaluation.

### EXAM CONTEXT & EXPECTED SOLUTION
- Question 1: "Valid Parentheses" (LeetCode problem).
- Standard logic required: Stack-based bracket matching.
Expected reference logic:
\`\`\`python
class Solution:
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
        return len(stack) == 0
\`\`\`

### EVALUATION STEPS
1. OCR & Extraction:
- Line 1: Extract Student Name. If not discernible, provide best estimate or "Unknown Student".
- Line 2: Extract Student Email. If not discernible, provide best estimate or "unknown@student.edu".
- Subsequent lines: Transcribe the handwritten code for Question 1 faithfully into clean Python. Preserve the student's exact algorithm, variables, and structure.

2. Code Logic Verification:
- Trace the transcribed code mentally against all standard test cases and edge cases:
  * Matching pairs: "()", "()[]{}", "{[]}" -> True
  * Mismatched types: "(]" -> False
  * Improper nesting order: "([)]" -> False
  * Single closing bracket without opener: "]", "}" -> False
  * Unclosed open brackets at end: "(", "((", "(()" -> False
  * Empty string: "" -> True

3. Grading Standard (Balanced & Encouraging):
- Fatal/Critical logic errors (e.g. completely wrong data structure like counters instead of stack, completely failing logic, reversed mappings without push): 0–40 points.
- Minor syntax or structural issues (e.g. slight indentation ambiguity in handwriting, minor typos, missing empty-stack check before pop leading to IndexError on single closing bracket, or returning True instead of len(stack) == 0): 60–90 points.
- Fully working stack logic: 95–100 points.

Be constructive in tone. Avoid penalizing harshly for handwriting imperfections, but do not excuse fatal execution bugs.

Always provide the strictly required fields: student_name, student_email, transcribed_code, is_correct, score, feedback.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    student_name: {
      type: Type.STRING,
      description: 'The extracted student name from Line 1 of the paper.',
    },
    student_email: {
      type: Type.STRING,
      description: 'The extracted student email from Line 2 of the paper.',
    },
    transcribed_code: {
      type: Type.STRING,
      description: 'Faithfully transcribed Python code for Question 1.',
    },
    is_correct: {
      type: Type.BOOLEAN,
      description: 'Whether the code logic is fundamentally correct and solves the Valid Parentheses problem.',
    },
    score: {
      type: Type.NUMBER,
      description: 'Score out of 100 according to the balanced grading standard (0-40 fatal, 60-90 minor, 95-100 full).',
    },
    feedback: {
      type: Type.STRING,
      description: 'Constructive, balanced, and encouraging evaluation feedback detailing strengths, bugs, and guidance.',
    },
    detected_issues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific syntax or logic flaws detected during mental code tracing.',
    },
    positive_notes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific positive observations and correct patterns implemented by the student.',
    },
    test_cases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          input: { type: Type.STRING },
          expected: { type: Type.BOOLEAN },
          actual_passed: { type: Type.BOOLEAN },
          notes: { type: Type.STRING },
        },
        required: ['input', 'expected', 'actual_passed'],
      },
      description: 'Evaluation results across canonical LeetCode test cases.',
    },
  },
  required: ['student_name', 'student_email', 'transcribed_code', 'is_correct', 'score', 'feedback'],
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    primaryModel: PRIMARY_GRADING_MODEL,
    fallbackModels: FALLBACK_GRADING_MODELS,
  });
});

// Primary grading engine endpoint
app.post('/api/grade-exam', async (req: Request, res: Response) => {
  try {
    const { imageBase64, fileBase64, mimeType = 'image/png', codeText, studentName, studentEmail } = req.body;
    const documentData = fileBase64 || imageBase64;

    if (!documentData && !codeText) {
      return res.status(400).json({ error: 'Please provide either an exam document (image or PDF) or code to grade.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is available in the environment.',
      });
    }

    let contents: any;

    if (documentData) {
      // Robustly extract raw base64 data and detect mime type
      let cleanBase64 = documentData;
      let finalMimeType = mimeType || 'image/png';

      if (documentData.includes(';base64,')) {
        const parts = documentData.split(';base64,');
        cleanBase64 = parts[1];
        const mimeMatch = parts[0].match(/^data:([^;]+)/);
        if (mimeMatch && mimeMatch[1]) {
          finalMimeType = mimeMatch[1];
        }
      } else if (documentData.startsWith('data:')) {
        cleanBase64 = documentData.replace(/^data:[^;]+;base64,/, '');
      }

      // Normalise JPEG mime type if needed
      if (finalMimeType === 'image/jpg') {
        finalMimeType = 'image/jpeg';
      }

      const isPdf = finalMimeType === 'application/pdf';

      const filePart = {
        inlineData: {
          mimeType: finalMimeType,
          data: cleanBase64,
        },
      };

      const promptPart = {
        text: `Analyze this ${isPdf ? 'PDF document' : 'image'} of an exam submission paper for Question 1: "Valid Parentheses" (LeetCode 20).
1. Student Information: Extract the student's name (look for Line 1, "Name:", student name header; if not present, use a sensible name from context or "Exam Student") and email (look for Line 2, "Email:", or any email address on the paper; if not present, use "student@university.edu").
2. Code Transcription: Transcribe the handwritten or typed Python code faithfully, preserving variable names, indentation, and logic as written.
3. Code Logic Verification: Mentally trace the code execution on canonical brackets test cases: "()", "()[]{}", "(]", "([)]", "{[]}", "]", "((", and "".
4. Evaluate & Score: Apply the grading standard (LIFO stack correctness, empty stack check, pop guard). Formulate constructive feedback and return the strictly formatted JSON schema.`,
      };

      contents = { parts: [filePart, promptPart] };
    } else {
      // Code re-evaluation or text-based grading mode
      const promptText = `Evaluate the following Python submission for Question 1: "Valid Parentheses".
Student Name: ${studentName || 'Unknown Student'}
Student Email: ${studentEmail || 'unknown@student.edu'}

Student Transcribed Code:
\`\`\`python
${codeText}
\`\`\`

Mentally trace the code logic, verify syntax and stack matching behavior across all edge cases (nested brackets, unclosed brackets, premature closing brackets, empty string), and output the strictly formatted evaluation JSON.`;

      contents = { parts: [{ text: promptText }] };
    }

    const { response, modelUsed } = await generateContentWithFallback({
      primaryModel: PRIMARY_GRADING_MODEL,
      fallbackModels: FALLBACK_GRADING_MODELS,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // Low temperature for consistent grading standard
      },
    });

    const rawText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      // In case of any Markdown wrapper, extract the JSON block
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Failed to parse model response into JSON: ' + rawText);
      }
    }

    // Ensure score is a number between 0 and 100
    if (typeof parsed.score !== 'number') {
      parsed.score = Number(parsed.score) || 0;
    }
    parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));

    // Return the response containing the required structure
    return res.json({
      student_name: parsed.student_name || 'Unknown Student',
      student_email: parsed.student_email || 'unknown@student.edu',
      transcribed_code: parsed.transcribed_code || '',
      is_correct: Boolean(parsed.is_correct),
      score: parsed.score,
      feedback: parsed.feedback || '',
      detected_issues: parsed.detected_issues || [],
      positive_notes: parsed.positive_notes || [],
      test_cases: parsed.test_cases || [],
      model_used: modelUsed,
    });
  } catch (error: any) {
    console.error('Error during exam evaluation:', error);
    return res.status(500).json({
      error: error?.message || 'An error occurred while evaluating the exam paper.',
    });
  }
});

// Interactive Python simulator test runner endpoint for client validation
app.post('/api/run-tests', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required for test execution.' });
    }

    // Use Gemini with low temperature to accurately trace the execution of the student's code on the test suite
    const prompt = `You are an automated Python code test runner.
Execute the following student code against canonical LeetCode 20 "Valid Parentheses" test cases.
Trace the exact execution of the student code as written.

Student Code:
\`\`\`python
${code}
\`\`\`

Test cases to trace:
1. s = "()" -> Expected: true
2. s = "()[]{}" -> Expected: true
3. s = "(]" -> Expected: false
4. s = "([)]" -> Expected: false
5. s = "{[]}" -> Expected: true
6. s = "]" -> Expected: false (check if throws IndexError or returns False)
7. s = "((" -> Expected: false
8. s = "" -> Expected: true
9. s = "[(])" -> Expected: false
10. s = "(([]){})" -> Expected: true

Return a JSON array of objects with fields:
- input (string)
- expected (boolean)
- actual (boolean or "Error")
- passed (boolean)
- trace (string explaining step-by-step what the student code did)`;

    const testRunnerSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          input: { type: Type.STRING },
          expected: { type: Type.BOOLEAN },
          actual: { type: Type.STRING },
          passed: { type: Type.BOOLEAN },
          trace: { type: Type.STRING },
        },
        required: ['input', 'expected', 'actual', 'passed', 'trace'],
      },
    };

    const { response } = await generateContentWithFallback({
      primaryModel: PRIMARY_GRADING_MODEL,
      fallbackModels: FALLBACK_GRADING_MODELS,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: testRunnerSchema,
        temperature: 0,
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json({ results: parsed });
  } catch (error: any) {
    console.error('Test runner execution error:', error);
    res.status(500).json({ error: error?.message || 'Failed to run test suite.' });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`AutoGrade AI Engine running at http://localhost:${PORT}`);
  });
}

startServer();
