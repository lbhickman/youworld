import { useMemo, useState } from "react";
import type { PoolKey, Test, TestSettings } from "../types";
import { allSources, allTags, eligibleQuestions, isMarked, poolFilter, shuffle, sourceOf, statusOf, tagsOf } from "../stats";
import { uid } from "../storage";
import type { ShellProps } from "./BankShell";

const MAX_BLOCK = 100;

const POOLS: { key: PoolKey; label: string }[] = [
  { key: "unused", label: "Unused" },
  { key: "incorrect", label: "Incorrect" },
  { key: "marked", label: "Marked" },
  { key: "omitted", label: "Omitted" },
  { key: "correct", label: "Correct" },
];

export default function CreateTest({ bank, updateBank, startTest, goImport }: ShellProps & { goImport: () => void }) {
  const [tutor, setTutor] = useState(true);
  const [pools, setPools] = useState<PoolKey[]>(["unused"]);
  const [tagSel, setTagSel] = useState<Set<string> | "all">("all");
  const [srcSel, setSrcSel] = useState<Set<string> | "all">("all");
  const [count, setCount] = useState(20);
  const [name, setName] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const tags = useMemo(() => {
    const t = allTags(bank.questions);
    return bank.questions.some((q) => !q.tags.length) ? [...t, "(Untagged)"] : t;
  }, [bank.questions]);
  const sources = useMemo(() => allSources(bank.questions), [bank.questions]);

  const poolCounts = useMemo(() => {
    const c: Record<PoolKey, number> = { unused: 0, incorrect: 0, correct: 0, omitted: 0, marked: 0 };
    for (const q of bank.questions) {
      c[statusOf(bank, q.id)]++;
      if (isMarked(bank, q.id)) c.marked++;
    }
    return c;
  }, [bank]);

  const inPools = useMemo(() => poolFilter(bank, { pools }), [bank, pools]);

  // Counts shown next to each tag/source reflect the current pool and the other filter.
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of inPools) {
      if (srcSel !== "all" && !srcSel.has(sourceOf(q))) continue;
      for (const t of tagsOf(q)) m.set(t, (m.get(t) || 0) + 1);
    }
    return m;
  }, [inPools, srcSel]);
  const srcCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of inPools) m.set(sourceOf(q), (m.get(sourceOf(q)) || 0) + 1);
    return m;
  }, [inPools]);

  const settings: TestSettings = {
    tutor,
    pools,
    tags: tagSel === "all" ? "all" : Array.from(tagSel),
    sources: srcSel === "all" ? "all" : Array.from(srcSel),
  };
  const eligible = useMemo(() => eligibleQuestions(bank, settings), [bank, pools, tagSel, srcSel]); // eslint-disable-line
  const maxCount = Math.min(MAX_BLOCK, eligible.length);
  const finalCount = Math.max(0, Math.min(count, maxCount));

  const togglePool = (k: PoolKey) =>
    setPools((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const toggleIn = (sel: Set<string> | "all", all: string[], v: string): Set<string> | "all" => {
    const s = new Set(sel === "all" ? all : sel);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    return s.size === all.length ? "all" : s;
  };

  const create = () => {
    if (!finalCount) return;
    const picked = shuffle(eligible).slice(0, finalCount);
    const now = Date.now();
    const number = bank.nextTestNumber || bank.tests.length + 1;
    const test: Test = {
      id: uid(),
      number,
      name: name.trim() || `Test ${number}`,
      createdAt: now,
      updatedAt: now,
      questionIds: picked.map((q) => q.id),
      items: Object.fromEntries(
        picked.map((q) => [q.id, { selected: null, submitted: false, seconds: 0, marked: isMarked(bank, q.id) }]),
      ),
      currentIndex: 0,
      elapsedSeconds: 0,
      status: "in-progress",
      settings,
    };
    updateBank((b) => ({ ...b, tests: [...b.tests, test], nextTestNumber: number + 1 }), true);
    startTest(test.id);
  };

  if (!bank.questions.length) {
    return (
      <div className="page">
        <h1 className="page-title">Create Test</h1>
        <div className="card empty">
          <p>This bank has no questions yet.</p>
          <button className="btn primary" onClick={goImport}>Import questions</button>
        </div>
      </div>
    );
  }

  const shownTags = tags.filter((t) => t.toLowerCase().includes(tagFilter.toLowerCase()));
  const isSel = (sel: Set<string> | "all", v: string) => sel === "all" || sel.has(v);

  return (
    <div className="page">
      <h1 className="page-title">Create Test</h1>

      <section className="card">
        <h3 className="section-title">Test Mode</h3>
        <div className="row gap wrap">
          <label className={"seg" + (tutor ? " on" : "")}>
            <input type="radio" checked={tutor} onChange={() => setTutor(true)} />
            <span>
              <strong>Tutor</strong>
              <span className="small muted">See the answer and explanation after each question</span>
            </span>
          </label>
          <label className={"seg" + (!tutor ? " on" : "")}>
            <input type="radio" checked={!tutor} onChange={() => setTutor(false)} />
            <span>
              <strong>Test</strong>
              <span className="small muted">Review answers and explanations after finishing the block</span>
            </span>
          </label>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">Question Pool</h3>
        <div className="row gap wrap">
          {POOLS.map((p) => (
            <label key={p.key} className="check">
              <input type="checkbox" checked={pools.includes(p.key)} onChange={() => togglePool(p.key)} />
              {p.label} <span className="count">{poolCounts[p.key]}</span>
            </label>
          ))}
          <button
            className="link small"
            onClick={() => setPools(pools.length === POOLS.length ? ["unused"] : POOLS.map((p) => p.key))}
          >
            {pools.length === POOLS.length ? "Unused only" : "Select all"}
          </button>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="row between">
            <h3 className="section-title">
              <label className="check">
                <input
                  type="checkbox"
                  checked={tagSel === "all"}
                  ref={(el) => {
                    if (el) el.indeterminate = tagSel !== "all" && tagSel.size > 0;
                  }}
                  onChange={() => setTagSel(tagSel === "all" ? new Set() : "all")}
                />
                Subjects (tags)
              </label>
            </h3>
            {tags.length > 8 && (
              <input className="mini-search" placeholder="Filter…" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
            )}
          </div>
          <div className="check-grid">
            {shownTags.map((t) => (
              <label key={t} className={"check" + ((tagCounts.get(t) || 0) === 0 ? " dim" : "")}>
                <input type="checkbox" checked={isSel(tagSel, t)} onChange={() => setTagSel(toggleIn(tagSel, tags, t))} />
                <span className="ellipsis">{t}</span> <span className="count">{tagCounts.get(t) || 0}</span>
              </label>
            ))}
            {!tags.length && <p className="muted small">No tags in this bank.</p>}
          </div>
        </section>

        <section className="card">
          <h3 className="section-title">
            <label className="check">
              <input
                type="checkbox"
                checked={srcSel === "all"}
                ref={(el) => {
                  if (el) el.indeterminate = srcSel !== "all" && srcSel.size > 0;
                }}
                onChange={() => setSrcSel(srcSel === "all" ? new Set() : "all")}
              />
              Sources
            </label>
          </h3>
          <div className="check-grid single">
            {sources.map((s) => (
              <label key={s} className={"check" + ((srcCounts.get(s) || 0) === 0 ? " dim" : "")}>
                <input type="checkbox" checked={isSel(srcSel, s)} onChange={() => setSrcSel(toggleIn(srcSel, sources, s))} />
                <span className="ellipsis">{s}</span> <span className="count">{srcCounts.get(s) || 0}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <h3 className="section-title">Number of Questions</h3>
        <div className="row gap wrap center-y">
          <input
            type="number"
            className="num"
            min={1}
            max={maxCount || 1}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(MAX_BLOCK, Number(e.target.value) || 1)))}
          />
          <span className="muted">
            {eligible.length} available · max {maxCount} per block
          </span>
          <span className="spacer" />
          <input className="name-input" placeholder={`Test name (optional)`} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary big" disabled={!finalCount} onClick={create}>
            Generate Test{finalCount ? ` (${finalCount})` : ""}
          </button>
        </div>
        {!eligible.length && (
          <p className="warn small">No questions match these settings. Try adding more pools, subjects, or sources.</p>
        )}
      </section>
    </div>
  );
}
