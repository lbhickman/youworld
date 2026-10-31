import type { ShellProps } from "./BankShell";
import { pct, testScore } from "../stats";
import { IconTrash } from "./Icons";

export default function PreviousTests({ bank, updateBank, startTest, openResults }: ShellProps & { openResults: (id: string) => void }) {
  const tests = [...bank.tests].sort((a, b) => b.createdAt - a.createdAt);

  const resume = (id: string) => startTest(id);
  const review = (id: string) => {
    updateBank((b) => ({ ...b, tests: b.tests.map((t) => (t.id === id ? { ...t, currentIndex: 0 } : t)) }), true);
    startTest(id);
  };
  const remove = (id: string) => {
    if (!confirm("Delete this test from the list? Your answers on its questions stay counted in your performance.")) return;
    updateBank((b) => ({ ...b, tests: b.tests.filter((t) => t.id !== id) }), true);
  };

  return (
    <div className="page">
      <h1 className="page-title">Previous Tests</h1>
      {!tests.length ? (
        <div className="card empty"><p className="muted">No tests yet. Create one from "Create Test".</p></div>
      ) : (
        <div className="card flush">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Name</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => {
                const s = testScore(t, bank);
                const answered = s.correct + s.incorrect + s.omitted;
                return (
                  <tr key={t.id}>
                    <td>
                      <span className="score-pill">{answered ? pct(s.correct, t.status === "completed" ? s.total : answered) + "%" : "—"}</span>
                    </td>
                    <td><strong>{t.name}</strong></td>
                    <td>{new Date(t.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td>{t.settings.tutor ? "Tutor" : "Test"}</td>
                    <td>{t.questionIds.length}</td>
                    <td>{t.status === "completed" ? "Completed" : <span className="badge">Suspended</span>}</td>
                    <td className="actions">
                      {t.status === "completed" ? (
                        <>
                          <button className="link" onClick={() => review(t.id)}>Review</button>
                          <button className="link" onClick={() => openResults(t.id)}>Results</button>
                        </>
                      ) : (
                        <button className="link strong" onClick={() => resume(t.id)}>Resume</button>
                      )}
                      <button className="icon-btn" title="Delete" onClick={() => remove(t.id)}><IconTrash size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
