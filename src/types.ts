export interface Choice {
  label: string; // "A", "B", ...
  text: string; // markdown
}

export interface Question {
  id: string; // stable fingerprint (explicit id or hash of content)
  stem: string; // markdown
  choices: Choice[];
  answer: string; // label of correct choice
  explanation: string; // markdown
  objective?: string; // markdown (educational objective / bottom line)
  tags: string[];
  source: string;
  importedAt: number;
  importBatch?: string; // file name it came from
}

export interface Attempt {
  testId: string;
  selected: string | null; // null = omitted
  correct: boolean;
  at: number;
  seconds: number;
}

export interface QuestionState {
  attempts: Attempt[];
  marked: boolean;
}

export type QStatus = "unused" | "correct" | "incorrect" | "omitted";

export interface TestItemState {
  selected: string | null;
  submitted: boolean; // locked in (tutor mode) or block ended
  seconds: number;
  marked: boolean;
}

export type PoolKey = QStatus | "marked";

export interface TestSettings {
  tutor: boolean;
  pools: PoolKey[];
  tags: string[] | "all";
  sources: string[] | "all";
}

export interface Test {
  id: string;
  number: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  questionIds: string[];
  items: Record<string, TestItemState>;
  currentIndex: number;
  elapsedSeconds: number;
  status: "in-progress" | "completed";
  settings: TestSettings;
}

export interface Bank {
  id: string;
  name: string;
  createdAt: number;
  questions: Question[];
  qstate: Record<string, QuestionState>;
  tests: Test[];
  nextTestNumber: number;
}

export interface BankMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  questionCount: number;
}

export interface LabRow {
  section: string;
  name: string;
  conventional: string;
  si: string;
}
