import type { Bank, QStatus, Question, Test, TestSettings } from "./types";

export function statusOf(bank: Bank, qid: string): QStatus {
  const s = bank.qstate[qid];
  if (!s || !s.attempts.length) return "unused";
  const last = s.attempts[s.attempts.length - 1];
  if (last.selected === null) return "omitted";
  return last.correct ? "correct" : "incorrect";
}

export const isMarked = (bank: Bank, qid: string) => !!bank.qstate[qid]?.marked;

export function allTags(questions: Question[]): string[] {
  const set = new Set<string>();
  questions.forEach((q) => q.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function allSources(questions: Question[]): string[] {
  const set = new Set<string>();
  questions.forEach((q) => set.add(q.source || "(No source)"));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export const sourceOf = (q: Question) => q.source || "(No source)";
export const NO_TAG = "(Untagged)";
export const tagsOf = (q: Question) => (q.tags.length ? q.tags : [NO_TAG]);

/** Questions in any of the selected pools (union, e.g. Unused + Incorrect + Marked). */
export function poolFilter(bank: Bank, settings: Pick<TestSettings, "pools">) {
  return bank.questions.filter(
    (q) =>
      settings.pools.includes(statusOf(bank, q.id)) || (settings.pools.includes("marked") && isMarked(bank, q.id)),
  );
}

export function eligibleQuestions(bank: Bank, s: TestSettings): Question[] {
  return poolFilter(bank, s).filter((q) => {
    if (s.sources !== "all" && !s.sources.includes(sourceOf(q))) return false;
    if (s.tags !== "all" && !tagsOf(q).some((t) => (s.tags as string[]).includes(t))) return false;
    return true;
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Tally {
  total: number;
  correct: number;
  incorrect: number;
  omitted: number;
  unused: number;
}

export function tally(bank: Bank, qs: Question[]): Tally {
  const t: Tally = { total: qs.length, correct: 0, incorrect: 0, omitted: 0, unused: 0 };
  qs.forEach((q) => t[statusOf(bank, q.id)]++);
  return t;
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function testScore(test: Test, bank: Bank) {
  let correct = 0,
    incorrect = 0,
    omitted = 0;
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  for (const id of test.questionIds) {
    const item = test.items[id];
    const q = byId.get(id);
    if (!q || !item) continue;
    if (!item.submitted && test.status === "in-progress") continue;
    if (item.selected === null) omitted++;
    else if (item.selected === q.answer) correct++;
    else incorrect++;
  }
  return { correct, incorrect, omitted, total: test.questionIds.length };
}

export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}
