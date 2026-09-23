import { SampleExamPaper } from '../types';

export const SAMPLE_EXAM_PAPERS: SampleExamPaper[] = [
  {
    id: 'sample-alex',
    name: 'Alex Rivera (Fully Working)',
    student_name: 'Alex Rivera',
    student_email: 'alex.rivera@university.edu',
    tier: 'perfect',
    expected_score_range: '95–100 pts',
    description: 'Flawless stack implementation with dictionary lookup and empty-stack guard.',
    handwriting_style: 'alex',
    code: `class Solution:
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
        return len(stack) == 0`,
  },
  {
    id: 'sample-jordan',
    name: 'Jordan Lee (Minor Flaw - Unchecked Pop)',
    student_name: 'Jordan Lee',
    student_email: 'jordan.lee@college.ac.uk',
    tier: 'minor',
    expected_score_range: '70–85 pts',
    description: 'Good stack logic, but calls stack.pop() directly without checking if stack is empty, causing IndexError on inputs starting with closing bracket.',
    handwriting_style: 'jordan',
    code: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        pairs = {')': '(', '}': '{', ']': '['}
        for c in s:
            if c in pairs:
                # Forgot empty check before pop
                top_elem = stack.pop()
                if top_elem != pairs[c]:
                    return False
            else:
                stack.append(c)
        return len(stack) == 0`,
  },
  {
    id: 'sample-maya',
    name: 'Maya Lin (Minor Edge Case - Unclosed Left)',
    student_name: 'Maya Lin',
    student_email: 'maya.lin@polytechnic.org',
    tier: 'minor',
    expected_score_range: '65–75 pts',
    description: 'Clean stack matching, but returns True at end instead of checking len(stack) == 0, failing unclosed brackets like "((".',
    handwriting_style: 'maya',
    code: `class Solution:
    def isValid(self, s: str) -> bool:
        stk = []
        close_to_open = {')': '(', ']': '[', '}': '{'}
        for ch in s:
            if ch in close_to_open:
                if stk and stk[-1] == close_to_open[ch]:
                    stk.pop()
                else:
                    return False
            else:
                stk.append(ch)
        # Bug: returns True unconditionally, fails on '(('
        return True`,
  },
  {
    id: 'sample-sam',
    name: 'Sam Patel (Fatal Logic Error - Counters)',
    student_name: 'Sam Patel',
    student_email: 'spatel@engineering.edu',
    tier: 'fatal',
    expected_score_range: '15–35 pts',
    description: 'Fatal algorithmic failure: used integer count variables instead of a LIFO stack. Fails interleaved brackets like "([)]".',
    handwriting_style: 'sam',
    code: `class Solution:
    def isValid(self, s: str) -> bool:
        # Fatal error: Counter approach fails on ordering like '([)]'
        round_count = 0
        curly_count = 0
        square_count = 0
        for c in s:
            if c == '(': round_count += 1
            elif c == ')': round_count -= 1
            elif c == '{': curly_count += 1
            elif c == '}': curly_count -= 1
            elif c == '[': square_count += 1
            elif c == ']': square_count -= 1
            if round_count < 0 or curly_count < 0 or square_count < 0:
                return False
        return round_count == 0 and curly_count == 0 and square_count == 0`,
  },
];

/**
 * Generates an authentic handwritten exam paper image using HTML Canvas.
 * Simulates lined college-ruled paper with blue lines, red margin, student header, and handwriting.
 */
export function generateHandwrittenPaperImage(paper: SampleExamPaper): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d')!;

    // 1. Paper background - subtle ivory/cream paper with subtle grain
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper grain noise
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      ctx.fillRect(rx, ry, 2, 2);
    }

    // 2. Horizontal college-ruled lines (soft blue)
    const lineHeight = 44;
    const headerTop = 90;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#c4daf1';

    for (let y = headerTop; y < canvas.height - 40; y += lineHeight) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(canvas.width - 30, y);
      ctx.stroke();
    }

    // 3. Vertical margin lines (classic red left margin)
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#e8a5a5';
    ctx.beginPath();
    ctx.moveTo(180, 0);
    ctx.lineTo(180, canvas.height);
    ctx.stroke();

    // Secondary faint margin guide
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#f5caca';
    ctx.beginPath();
    ctx.moveTo(185, 0);
    ctx.lineTo(185, canvas.height);
    ctx.stroke();

    // 4. University Header (Printed font)
    ctx.fillStyle = '#475569';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText('DEPARTMENT OF COMPUTER SCIENCE - EXAMINATION SCRIPT', 210, 52);
    ctx.font = '400 16px "Inter", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('CS201: Data Structures & Algorithms | Term Exam 2', 210, 78);

    // 5. Question 1 Prompt Banner
    ctx.fillStyle = '#1e293b';
    ctx.font = '700 20px "Inter", sans-serif';
    ctx.fillText('QUESTION 1: Valid Parentheses (LeetCode 20)', 210, 222);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 15px "Inter", sans-serif';
    ctx.fillText('Write a Python solution isValid(self, s: str) -> bool using standard stack logic.', 210, 246);

    // 6. Handwritten details
    // Select handwriting font family based on style
    const fontNames: Record<string, string> = {
      alex: '"Caveat", cursive',
      jordan: '"Kalam", cursive',
      maya: '"Caveat", cursive',
      sam: '"Kalam", cursive',
    };
    const handwrittenFont = fontNames[paper.handwriting_style] || '"Caveat", cursive';

    // Ink color - deep blue / graphite ballpoint
    const inkColors: Record<string, string> = {
      alex: '#1e3a8a', // royal blue ink
      jordan: '#0f172a', // black ballpoint
      maya: '#1d4ed8', // classic gel blue
      sam: '#1e293b', // slate ink
    };
    ctx.fillStyle = inkColors[paper.handwriting_style] || '#1e3a8a';

    // Line 1: Student Name
    ctx.font = `700 36px ${handwrittenFont}`;
    ctx.fillText(`Student Name: ${paper.student_name}`, 210, 132);

    // Line 2: Student Email
    ctx.font = `600 32px ${handwrittenFont}`;
    ctx.fillText(`Student Email: ${paper.student_email}`, 210, 176);

    // Code lines
    ctx.font = `600 31px ${handwrittenFont}`;
    const codeLines = paper.code.split('\n');

    let startY = 310;
    const codeLineSpacing = 44;

    codeLines.forEach((line) => {
      // Calculate indent spaces to pixels
      const leadingSpaces = line.search(/\S|$/);
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        const indentPx = leadingSpaces * 14;
        const textX = 210 + indentPx;

        // Slight natural handwriting baseline jitter (+/- 1.5px)
        const jitterY = (Math.random() - 0.5) * 2;
        ctx.fillText(trimmed, textX, startY + jitterY);
      }
      startY += codeLineSpacing;
    });

    // Student Signature / date at bottom
    ctx.font = `500 28px ${handwrittenFont}`;
    ctx.fillText(`Signed: ${paper.student_name}`, 210, 1420);
    ctx.font = '400 16px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Official Examination Script - For Automated Grading & Archive', 210, 1460);

    resolve(canvas.toDataURL('image/png', 0.95));
  });
}
