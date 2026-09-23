export interface StandardTestCase {
  id: string;
  name: string;
  input: string;
  expected: boolean;
  explanation: string;
}

export const CANONICAL_TEST_CASES: StandardTestCase[] = [
  {
    id: 'tc-1',
    name: 'Simple Parentheses',
    input: '()',
    expected: true,
    explanation: 'Basic single matching pair of parentheses.',
  },
  {
    id: 'tc-2',
    name: 'Sequential Multi-bracket',
    input: '()[]{}',
    expected: true,
    explanation: 'Multiple valid consecutive matching pairs.',
  },
  {
    id: 'tc-3',
    name: 'Nested Matching',
    input: '{[]}',
    expected: true,
    explanation: 'Properly nested curly and square brackets.',
  },
  {
    id: 'tc-4',
    name: 'Mismatched Types',
    input: '(]',
    expected: false,
    explanation: 'Opening round bracket closed by square bracket.',
  },
  {
    id: 'tc-5',
    name: 'Improper Nesting Order',
    input: '([)]',
    expected: false,
    explanation: 'Interleaved brackets where inner bracket is not closed first (classic counter-algorithm failure).',
  },
  {
    id: 'tc-6',
    name: 'Premature Closing / Empty Pop',
    input: ']',
    expected: false,
    explanation: 'Closing bracket appears with no preceding open bracket; tests empty-stack safety.',
  },
  {
    id: 'tc-7',
    name: 'Unclosed Open Brackets',
    input: '((',
    expected: false,
    explanation: 'Open brackets remain on stack after iteration ends.',
  },
  {
    id: 'tc-8',
    name: 'Complex Balanced',
    input: '(([]){})',
    expected: true,
    explanation: 'Complex multi-level nesting with alternating types.',
  },
  {
    id: 'tc-9',
    name: 'Empty String',
    input: '',
    expected: true,
    explanation: 'Empty string contains no mismatched brackets and is valid by convention.',
  },
  {
    id: 'tc-10',
    name: 'Single Opening',
    input: '{',
    expected: false,
    explanation: 'Single unclosed opening bracket.',
  },
];

/**
 * Standard Python-equivalent execution tracer for Valid Parentheses logic.
 * Traces each step of the stack for interactive visual explanation.
 */
export interface StackStep {
  stepIndex: number;
  char: string;
  action: 'push' | 'match_pop' | 'mismatch' | 'empty_pop_error' | 'final_check';
  stackState: string[];
  description: string;
  isError?: boolean;
}

export function traceStackExecution(inputStr: string): { steps: StackStep[]; isValid: boolean } {
  const steps: StackStep[] = [];
  const stack: string[] = [];
  const mapping: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  if (inputStr.length === 0) {
    steps.push({
      stepIndex: 0,
      char: 'ε',
      action: 'final_check',
      stackState: [],
      description: 'Empty string provided. Stack is empty -> Valid (True).',
    });
    return { steps, isValid: true };
  }

  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];

    if (char in mapping) {
      if (stack.length === 0) {
        steps.push({
          stepIndex: i + 1,
          char,
          action: 'empty_pop_error',
          stackState: [],
          description: `Encountered closing '${char}' but stack is empty! No matching open bracket -> Invalid (False).`,
          isError: true,
        });
        return { steps, isValid: false };
      }

      const top = stack[stack.length - 1];
      if (top !== mapping[char]) {
        steps.push({
          stepIndex: i + 1,
          char,
          action: 'mismatch',
          stackState: [...stack],
          description: `Encountered '${char}', top of stack is '${top}'. Mismatch (expected '${mapping[char]}') -> Invalid (False).`,
          isError: true,
        });
        return { steps, isValid: false };
      }

      stack.pop();
      steps.push({
        stepIndex: i + 1,
        char,
        action: 'match_pop',
        stackState: [...stack],
        description: `Encountered '${char}', correctly matches '${top}'. Popped from stack.`,
      });
    } else if (['(', '{', '['].includes(char)) {
      stack.push(char);
      steps.push({
        stepIndex: i + 1,
        char,
        action: 'push',
        stackState: [...stack],
        description: `Encountered opening '${char}'. Pushed to stack.`,
      });
    }
  }

  const isFinalValid = stack.length === 0;
  steps.push({
    stepIndex: inputStr.length + 1,
    char: 'END',
    action: 'final_check',
    stackState: [...stack],
    description: isFinalValid
      ? 'All characters processed and stack is empty. String is completely valid!'
      : `String ended, but ${stack.length} unmatched open bracket(s) remain on stack: [${stack.join(', ')}] -> Invalid (False).`,
    isError: !isFinalValid,
  });

  return { steps, isValid: isFinalValid };
}
