import { useMemo, useState } from "react";
import type { ShellProps } from "./BankShell";
import type { Question } from "../types";
import { isMarked, pct, sourceOf, tagsOf, tally, type Tally } from "../stats";
import Donut from "./Donut";

type SortKey = "name" | "total" | "used" | "pct";

export default function Performance({ bank, updateBank }: ShellProps) {
  const overall = tally(bank, bank.questions);
  const used = overall.total - overall.unused;
  const marked = bank.questions.filter((q) => isMarked(bank, q.id)).length;

  // Time and change stats from all attempts.
  const { avgSec, changedFromFirst } = useMemo(() => {
    let secs = 0,
      n = 0,
      improved = 0;
    for (const s of Object.values(bank.qstate)) {
      for (const a of s.attempts) {
        secs += a.seconds;
        n++;
      }
      if (s.attempts.length > 1 && !s.attempts[0].correct && s.attempts[s.attempts.length - 1].correct) improved++;
    }
    return { avgSec: n ? Math.round(secs / n) : 0, changedFromFirst: improved };
  }, [bank.qstate]);

  const groups = (keyFn: (q: Question) => string[]) => {
    const m = new Map<string, Question[]>();
    for (const q of bank.questions) for (const k of keyFn(q)) m.set(k, [...(m.get(k) || []), q]);
    return Array.from(m.entries()).map(([name, qs]) => ({ name, t: tally(bank, qs) }));
  };

  const resetProgress = () => {
    if (
      !confirm(
        "Reset all progress in this bank? Every question becomes Unused, marks are cleared, and all previous tests are deleted. Questions are kept.",
      )
    )
      return;
    updateBank((b) => ({ ...b, qstate: {}, tests: [], nextTestNumber: 1 }), true);
  };

  return (
    <div className="page">
      <div className="row between center-y">
        <h1 className="page-title">Performance</h1>
        <button className="btn danger-outline" onClick={resetProgress}>Reset bank progress</button>
      </div>

      <div className="two-col">
        <div className="card stats-card">
          <Donut
            segments={[
              { value: overall.correct, cls: "seg-ok" },
              { value: overall.incorrect, cls: "seg-bad" },
              { value: overall.omitted, cls: "seg-omit" },
            ]}
            label={`${pct(overall.correct, used)}%`}
            sub="Correct"
          />
          <div className="stat-list">
            <h4>Your Score</h4>
            <div><span className="dot ok" /> Total correct <strong>{overall.correct}</strong></div>
            <div><span className="dot bad" /> Total incorrect <strong>{overall.incorrect}</strong></div>
            <div><span className="dot omit" /> Total omitted <strong>{overall.omitted}</strong></div>
          </div>
        </div>
        <div className="card stats-card">
          <Donut
            segments={[
              { value: used, cls: "seg-used" },
              { value: overall.unused, cls: "seg-unused" },
            ]}
            label={`${pct(used, overall.total)}%`}
            sub="Used"
          />
          <div className="stat-list">
            <h4>QBank Usage</h4>
            <div>Used questions <strong>{used}</strong></div>
            <div>Unused questions <strong>{overall.unused}</strong></div>
            <div>Total questions <strong>{overall.total}</strong></div>
            <div>Marked <strong>{marked}</strong></div>
          </div>
        </div>
      </div>

      <div className="card row gap wrap kpis">
        <div><strong>{bank.tests.filter((t) => t.status === "completed").length}</strong><span>Tests completed</span></div>
        <div><strong>{bank.tests.filter((t) => t.status !== "completed").length}</strong><span>Tests suspended</span></div>
        <div><strong>{avgSec}s</strong><span>Avg time per answer</span></div>
        <div><strong>{changedFromFirst}</strong><span>Missed at first, now correct</span></div>
      </div>

      <BreakdownTable title="By Subject (tag)" rows={groups(tagsOf)} />
      <BreakdownTable title="By Source" rows={groups((q) => [sourceOf(q)])} />
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { name: string; t: Tally }[] }) {
  const [sort, setSort] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const val = (r: { name: string; t: Tally }) => {
    const usedN = r.t.total - r.t.unused;
    if (sort === "name") return r.name.toLowerCase();
    if (sort === "total") return r.t.total;
    if (sort === "used") return usedN;
    return usedN ? r.t.correct / usedN : -1;
  };
  const sorted = [...rows].sort((a, b) => {
    const x = val(a),
      y = val(b);
    const c = x < y ? -1 : x > y ? 1 : 0;
    return asc ? c : -c;
  });
  const head = (k: SortKey, label: string) => (
    <th
      className="sortable"
      onClick={() => {
        if (sort === k) setAsc(!asc);
        else {
          setSort(k);
          setAsc(k === "name");
        }
      }}
    >
      {label} {sort === k ? (asc ? "▲" : "▼") : ""}
    </th>
  );
  return (
    <section className="card flush">
      <h3 className="section-title pad">{title}</h3>
      <table className="grid-table">
        <thead>
          <tr>
            {head("name", "Name")}
            {head("total", "Questions")}
            {head("used", "Used")}
            <th>Correct</th>
            <th>Incorrect</th>
            <th>Omitted</th>
            {head("pct", "% Correct")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const usedN = r.t.total - r.t.unused;
            const p = pct(r.t.correct, usedN);
            return (
              <tr key={r.name}>
                <td><strong>{r.name}</strong></td>
                <td>{r.t.total}</td>
                <td>{usedN}</td>
                <td>{r.t.correct}</td>
                <td>{r.t.incorrect}</td>
                <td>{r.t.omitted}</td>
                <td>
                  {usedN ? (
                    <div className="bar-cell">
                      <div className="bar"><div className={"bar-fill " + (p >= 70 ? "ok" : p >= 50 ? "mid" : "bad")} style={{ width: p + "%" }} /></div>
                      <span>{p}%</span>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
