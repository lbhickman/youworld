import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attempt, Bank, Question, Test } from "../types";
import type { AssetMap } from "../storage";
import { Markdown } from "../markdown";
import { fmtTime } from "../stats";
import LabValuesPanel from "./LabValuesPanel";
import type { View } from "./BankShell";
import {
  IconCheck,
  IconExpand,
  IconFlag,
  IconFlask,
  IconFont,
  IconLeft,
  IconPause,
  IconRight,
  IconStop,
  IconX,
} from "./Icons";

const FONT_SIZES = [14, 16, 18, 20, 22];

function recordAttempt(b: Bank, testId: string, q: Question, selected: string | null, seconds: number): Bank {
  const prev = b.qstate[q.id] || { attempts: [], marked: false };
  if (prev.attempts.some((a) => a.testId === testId)) return b; // already recorded for this test
  const attempt: Attempt = { testId, selected, correct: selected === q.answer, at: Date.now(), seconds: Math.round(seconds) };
  return { ...b, qstate: { ...b.qstate, [q.id]: { ...prev, attempts: [...prev.attempts, attempt] } } };
}

export default function TestRunner({
  bank,
  assets,
  testId,
  updateBank,
  onExit,
}: {
  bank: Bank;
  assets: AssetMap;
  testId: string;
  updateBank: (fn: (b: Bank) => Bank, immediate?: boolean) => void;
  onExit: (goTo?: View) => void;
}) {
  const stored = bank.tests.find((t) => t.id === testId)!;
  const [test, setTest] = useState<Test>(stored);
  const testRef = useRef(test);
  testRef.current = test;
  const review = test.status === "completed";

  const qById = useMemo(() => new Map(bank.questions.map((q) => [q.id, q])), [bank.questions]);
  const ids = test.questionIds.filter((id) => qById.has(id));
  const idx = Math.min(test.currentIndex, ids.length - 1);
  const qid = ids[idx];
  const q = qById.get(qid);
  const item = test.items[qid];

  const [showLabs, setShowLabs] = useState(false);
  const [fontIdx, setFontIdx] = useState(() => Number(localStorage.getItem("yw-font") || 1));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("yw-font", String(fontIdx));
    } catch {
      /* ignore */
    }
  }, [fontIdx]);

  // Persist the test into the bank.
  const commit = useCallback(
    (t: Test, extra?: (b: Bank) => Bank, immediate = false) => {
      updateBank((b) => {
        const nb = { ...b, tests: b.tests.map((x) => (x.id === t.id ? { ...t, updatedAt: Date.now() } : x)) };
        return extra ? extra(nb) : nb;
      }, immediate);
    },
    [updateBank],
  );

  const change = (fn: (t: Test) => Test, extra?: (b: Bank) => Bank, immediate = false) => {
    const next = fn(testRef.current);
    testRef.current = next;
    setTest(next);
    commit(next, extra, immediate);
  };

  // Timers: block elapsed + time on the current question (only while answering).
  useEffect(() => {
    if (review) return;
    let ticks = 0;
    const iv = window.setInterval(() => {
      setTest((t) => {
        const id = t.questionIds[t.currentIndex];
        const it = t.items[id];
        const items = it && !it.submitted ? { ...t.items, [id]: { ...it, seconds: it.seconds + 1 } } : t.items;
        return { ...t, elapsedSeconds: t.elapsedSeconds + 1, items };
      });
      if (++ticks % 15 === 0) commit(testRef.current);
    }, 1000);
    return () => {
      window.clearInterval(iv);
      commit(testRef.current);
    };
  }, [review, commit]);

  const go = (i: number) => {
    if (i < 0 || i >= ids.length) return;
    change((t) => ({ ...t, currentIndex: i }));
    mainRef.current?.scrollTo({ top: 0 });
  };

  const select = (label: string) => {
    if (!q || item.submitted || review) return;
    change((t) => ({ ...t, items: { ...t.items, [qid]: { ...t.items[qid], selected: label } } }));
  };

  const submit = () => {
    if (!q || item.submitted || !item.selected) return;
    const sel = item.selected;
    const secs = item.seconds;
    change(
      (t) => ({ ...t, items: { ...t.items, [qid]: { ...t.items[qid], submitted: true } } }),
      (b) => recordAttempt(b, test.id, q, sel, secs),
      true,
    );
  };

  const toggleMark = () => {
    if (!q) return;
    const marked = !item.marked;
    change(
      (t) => ({ ...t, items: { ...t.items, [qid]: { ...t.items[qid], marked } } }),
      (b) => ({
        ...b,
        qstate: { ...b.qstate, [qid]: { attempts: b.qstate[qid]?.attempts || [], marked } },
      }),
    );
  };

  const endBlock = () => {
    const t0 = testRef.current;
    const done: Test = {
      ...t0,
      status: "completed",
      currentIndex: 0,
      items: Object.fromEntries(Object.entries(t0.items).map(([k, v]) => [k, { ...v, submitted: true }])),
    };
    testRef.current = done;
    setTest(done);
    commit(
      done,
      (b) => {
        let nb = b;
        for (const id of t0.questionIds) {
          const qq = qById.get(id);
          const it = t0.items[id];
          if (qq && it) nb = recordAttempt(nb, t0.id, qq, it.selected, it.seconds);
        }
        return nb;
      },
      true,
    );
    onExit(`results:${t0.id}`);
  };

  const suspend = () => {
    commit(testRef.current, undefined, true);
    onExit("previous");
  };

  const toggleFullscreen = async () => {
    try {
      if (isTauriWindow()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const w = getCurrentWindow();
        await w.setFullscreen(!(await w.isFullscreen()));
      } else if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* not supported */
    }
  };

  // Keyboard: ←/→ navigate, A–Z select, Enter submit, M mark.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Enter" && test.settings.tutor) submit();
      else if (/^[a-zA-Z]$/.test(e.key) && q) {
        const k = e.key.toUpperCase();
        if (q.choices.some((c) => c.label === k)) select(k);
        else if (k === "M") toggleMark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q || !item) {
    return (
      <div className="page">
        <p>The questions in this test are no longer in the bank.</p>
        <button className="btn" onClick={() => onExit("previous")}>Back</button>
      </div>
    );
  }

  const showAnswer = review || (test.settings.tutor && item.submitted);
  const answeredCount = ids.filter((id) => test.items[id]?.selected).length;

  // Your past attempt history on this question (excluding this test).
  const history = (bank.qstate[qid]?.attempts || []).filter((a) => a.testId !== test.id);

  return (
    <div className="exam" style={{ ["--exam-font" as string]: FONT_SIZES[fontIdx] + "px" }}>
      <header className="exam-top">
        <div className="exam-top-left">
          <div className="item-count">
            <strong>Item {idx + 1} of {ids.length}</strong>
            <span className="small">Question Id: {qid.replace(/^(id-|h-)/, "")}</span>
          </div>
          <button className={"top-btn mark" + (item.marked ? " on" : "")} onClick={toggleMark} title="Mark (M)">
            <IconFlag />
            <span>Mark</span>
          </button>
        </div>
        <div className="exam-top-center">
          <button className="top-btn" onClick={() => go(idx - 1)} disabled={idx === 0} title="Previous (←)">
            <IconLeft size={26} />
            <span>Previous</span>
          </button>
          <button className="top-btn" onClick={() => go(idx + 1)} disabled={idx === ids.length - 1} title="Next (→)">
            <IconRight size={26} />
            <span>Next</span>
          </button>
        </div>
        <div className="exam-top-right">
          <button className="top-btn" onClick={toggleFullscreen}>
            <IconExpand />
            <span>Full Screen</span>
          </button>
          <button className="top-btn" onClick={() => setFontIdx((fontIdx + 1) % FONT_SIZES.length)} title="Text size">
            <IconFont />
            <span>Text Size</span>
          </button>
          <button className={"top-btn" + (showLabs ? " on" : "")} onClick={() => setShowLabs(!showLabs)}>
            <IconFlask />
            <span>Lab Values</span>
          </button>
        </div>
      </header>

      <div className="exam-body">
        <nav className="qnav">
          {ids.map((id, i) => {
            const it = test.items[id];
            const qq = qById.get(id)!;
            const reveal = review || (test.settings.tutor && it.submitted);
            const right = it.selected === qq.answer;
            return (
              <button
                key={id}
                className={
                  "qnav-item" +
                  (i === idx ? " current" : "") +
                  (i % 2 ? " odd" : "") +
                  (!it.selected && !reveal ? " unanswered" : "")
                }
                onClick={() => go(i)}
              >
                <span className="qnav-dot" />
                <span className="qnav-num">{i + 1}</span>
                {it.marked && <span className="qnav-flag"><IconFlag size={13} /></span>}
                {reveal && (
                  <span className={"qnav-res " + (it.selected ? (right ? "ok" : "bad") : "omit")}>
                    {it.selected ? right ? <IconCheck size={14} /> : <IconX size={14} /> : "–"}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="exam-main-wrap">
          <div className="exam-main" ref={mainRef}>
            <div className="exam-content">
              <Markdown className="stem" text={q.stem} assets={assets} />

              <div className={"choices" + (showAnswer ? " revealed" : "")}>
                {q.choices.map((c) => {
                  const chosen = item.selected === c.label;
                  const correct = c.label === q.answer;
                  let cls = "choice";
                  if (chosen) cls += " chosen";
                  if (showAnswer && correct) cls += " correct";
                  if (showAnswer && chosen && !correct) cls += " wrong";
                  return (
                    <label key={c.label} className={cls}>
                      <span className="choice-mark">
                        {showAnswer && correct && <IconCheck size={18} />}
                        {showAnswer && chosen && !correct && <IconX size={18} />}
                      </span>
                      <input
                        type="radio"
                        name={"q-" + qid}
                        checked={chosen}
                        disabled={item.submitted || review}
                        onChange={() => select(c.label)}
                      />
                      <span className="choice-label">{c.label}.</span>
                      <Markdown className="choice-text" text={c.text} assets={assets} inline />
                    </label>
                  );
                })}
              </div>

              {test.settings.tutor && !item.submitted && !review && (
                <button className="btn submit" disabled={!item.selected} onClick={submit}>
                  Submit
                </button>
              )}

              {showAnswer && (
                <>
                  <div className={"result-bar " + (item.selected ? (item.selected === q.answer ? "ok" : "bad") : "omit")}>
                    <div className="result-main">
                      <strong>
                        {item.selected ? (item.selected === q.answer ? "Correct" : "Incorrect") : "Omitted"}
                      </strong>
                      <span className="small">Correct answer: {q.answer}</span>
                    </div>
                    <div className="result-stat">
                      <strong>{fmtTime(item.seconds)}</strong>
                      <span className="small">Time spent</span>
                    </div>
                    <div className="result-stat">
                      <strong>{history.length ? `${history.filter((a) => a.correct).length}/${history.length}` : "First try"}</strong>
                      <span className="small">Your prior attempts</span>
                    </div>
                    <div className="result-stat">
                      <strong className="ellipsis">{q.source || "No source"}</strong>
                      <span className="small">Source</span>
                    </div>
                  </div>

                  <section className="explanation">
                    <h3>Explanation</h3>
                    {q.explanation ? (
                      <Markdown text={q.explanation} assets={assets} />
                    ) : (
                      <p className="muted">No explanation was provided for this question.</p>
                    )}
                    {q.objective && (
                      <div className="objective">
                        <h4>Educational Objective</h4>
                        <Markdown text={q.objective} assets={assets} />
                      </div>
                    )}
                    {q.tags.length > 0 && (
                      <div className="tag-row">
                        {q.tags.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
          {showLabs && <LabValuesPanel onClose={() => setShowLabs(false)} />}
        </div>
      </div>

      <footer className="exam-bottom">
        <div className="exam-bottom-left">
          {review ? (
            <span>Reviewing: {test.name}</span>
          ) : (
            <>
              <span>Block Time Elapsed: {fmtTime(test.elapsedSeconds)}</span>
              <span className="small">
                {test.settings.tutor ? "Tutor" : "Test"} mode · {answeredCount}/{ids.length} answered
              </span>
            </>
          )}
        </div>
        <div className="exam-bottom-right">
          {review ? (
            <>
              <button className="bottom-btn" onClick={() => onExit(`results:${test.id}`)}>
                <IconStop />
                <span>Results</span>
              </button>
              <button className="bottom-btn" onClick={() => onExit("previous")}>
                <IconX />
                <span>Exit Review</span>
              </button>
            </>
          ) : (
            <>
              <button className="bottom-btn" onClick={suspend}>
                <IconPause />
                <span>Suspend</span>
              </button>
              <button className="bottom-btn" onClick={() => setConfirmEnd(true)}>
                <IconStop />
                <span>End Block</span>
              </button>
            </>
          )}
        </div>
      </footer>

      {confirmEnd && (
        <div className="modal-backdrop">
          <div className="modal small-modal">
            <h2>End this block?</h2>
            <p>
              {ids.length - answeredCount > 0
                ? `${ids.length - answeredCount} question(s) are unanswered and will be counted as omitted.`
                : "All questions have been answered."}
            </p>
            <div className="row gap end">
              <button className="btn" onClick={() => setConfirmEnd(false)}>Cancel</button>
              <button className="btn primary" onClick={endBlock}>End Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isTauriWindow() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
