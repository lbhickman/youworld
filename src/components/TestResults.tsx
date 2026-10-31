import type { ShellProps } from "./BankShell";
import { fmtTime, pct, testScore } from "../stats";
import Donut from "./Donut";
import { IconCheck, IconX } from "./Icons";

export default function TestResults({ bank, updateBank, startTest, testId, back }: ShellProps & { testId: string; back: () => void }) {
  const test = bank.tests.find((t) => t.id === testId);
  if (!test) {
    return (
      <div className="page">
        <p>Test not found.</p>
        <button className="btn" onClick={back}>Back</button>
      </div>
    );
  }
  const s = testScore(test, bank);
  const qById = new Map(bank.questions.map((q) => [q.id, q]));
  const openAt = (i: number) => {
    updateBank((b) => ({ ...b, tests: b.tests.map((t) => (t.id === testId ? { ...t, currentIndex: i } : t)) }), true);
    startTest(testId);
  };
  const totalSec = test.questionIds.reduce((a, id) => a + (test.items[id]?.seconds || 0), 0);

  return (
    <div className="page">
      <div className="row between center-y">
        <div>
          <button className="link" onClick={back}>← Previous Tests</button>
          <h1 className="page-title">{test.name}: Results</h1>
        </div>
        <button className="btn primary" onClick={() => openAt(0)}>Review Test</button>
      </div>

      <div className="card stats-card">
        <Donut
          size={150}
          segments={[
            { value: s.correct, cls: "seg-ok" },
            { value: s.incorrect, cls: "seg-bad" },
            { value: s.omitted, cls: "seg-omit" },
          ]}
          label={`${pct(s.correct, s.total)}%`}
          sub="Correct"
        />
        <div className="stat-list">
          <div><span className="dot ok" /> Correct <strong>{s.correct}</strong></div>
          <div><span className="dot bad" /> Incorrect <strong>{s.incorrect}</strong></div>
          <div><span className="dot omit" /> Omitted <strong>{s.omitted}</strong></div>
        </div>
        <div className="stat-list">
          <div>Mode <strong>{test.settings.tutor ? "Tutor" : "Test"}</strong></div>
          <div>Total time <strong>{fmtTime(test.elapsedSeconds)}</strong></div>
          <div>Avg time / question <strong>{fmtTime(test.questionIds.length ? totalSec / test.questionIds.length : 0)}</strong></div>
        </div>
      </div>

      <div className="card flush">
        <table className="grid-table clickable">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th style={{ width: 40 }} />
              <th>Question</th>
              <th>Tags</th>
              <th>Source</th>
              <th>Your answer</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {test.questionIds.map((id, i) => {
              const q = qById.get(id);
              const it = test.items[id];
              if (!q || !it) return null;
              const ok = it.selected === q.answer;
              return (
                <tr key={id} onClick={() => openAt(i)}>
                  <td>{i + 1}</td>
                  <td>
                    {it.selected ? (
                      <span className={ok ? "res ok" : "res bad"}>{ok ? <IconCheck size={16} /> : <IconX size={16} />}</span>
                    ) : (
                      <span className="res omit">–</span>
                    )}
                  </td>
                  <td className="ellipsis-cell">{plain(q.stem)}</td>
                  <td className="small">{q.tags.join(", ")}</td>
                  <td className="small">{q.source}</td>
                  <td>{it.selected ? `${it.selected} (key ${q.answer})` : `Omitted (key ${q.answer})`}</td>
                  <td>{fmtTime(it.seconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function plain(md: string, n = 140) {
  const t = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[image]")
    .replace(/[#*_`>|$\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
