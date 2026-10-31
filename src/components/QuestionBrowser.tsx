import { useMemo, useState } from "react";
import type { ShellProps } from "./BankShell";
import { allSources, allTags, isMarked, sourceOf, statusOf } from "../stats";
import { Markdown } from "../markdown";
import { plain } from "./TestResults";
import { IconFlag, IconTrash } from "./Icons";

const PAGE = 50;

export default function QuestionBrowser({ bank, assets, updateBank }: ShellProps) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tags = useMemo(() => allTags(bank.questions), [bank.questions]);
  const sources = useMemo(() => allSources(bank.questions), [bank.questions]);

  const filtered = useMemo(() => {
    const qq = query.trim().toLowerCase();
    return bank.questions.filter((q) => {
      if (tag && !q.tags.includes(tag)) return false;
      if (source && sourceOf(q) !== source) return false;
      if (status === "marked" ? !isMarked(bank, q.id) : status && statusOf(bank, q.id) !== status) return false;
      if (qq && !(q.stem + " " + q.explanation + " " + q.choices.map((c) => c.text).join(" ") + " " + q.id).toLowerCase().includes(qq))
        return false;
      return true;
    });
  }, [bank, query, tag, source, status]);

  const shown = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const deleteSelected = () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} question(s) from this bank? Their progress will be removed too.`)) return;
    updateBank((b) => {
      const qstate = { ...b.qstate };
      selected.forEach((id) => delete qstate[id]);
      return {
        ...b,
        questions: b.questions.filter((q) => !selected.has(q.id)),
        qstate,
        tests: b.tests.map((t) => ({ ...t, questionIds: t.questionIds.filter((id) => !selected.has(id)) })),
      };
    }, true);
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="page">
      <h1 className="page-title">Question Library</h1>
      <div className="card row gap wrap filters">
        <input className="grow" placeholder="Search question text, choices, explanations, or ID…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        <select value={tag} onChange={(e) => { setTag(e.target.value); setPage(0); }}>
          <option value="">All tags</option>
          {tags.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Any status</option>
          <option value="unused">Unused</option>
          <option value="correct">Correct</option>
          <option value="incorrect">Incorrect</option>
          <option value="omitted">Omitted</option>
          <option value="marked">Marked</option>
        </select>
      </div>

      <div className="row between center-y">
        <span className="muted small">{filtered.length} question(s)</span>
        <div className="row gap center-y">
          {selected.size > 0 && (
            <button className="btn danger-outline" onClick={deleteSelected}>
              <IconTrash size={16} /> Delete {selected.size} selected
            </button>
          )}
          {pages > 1 && (
            <>
              <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
              <span className="small">Page {page + 1} of {pages}</span>
              <button className="btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</button>
            </>
          )}
        </div>
      </div>

      <div className="card flush">
        {shown.map((q) => {
          const st = statusOf(bank, q.id);
          return (
            <div key={q.id} className={"lib-row" + (open === q.id ? " open" : "")}>
              <div className="lib-head">
                <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} />
                <button className="lib-title" onClick={() => setOpen(open === q.id ? null : q.id)}>
                  <span className={"status-chip " + st}>{st}</span>
                  {isMarked(bank, q.id) && <span className="flag-inline"><IconFlag size={14} /></span>}
                  <span className="ellipsis">{plain(q.stem, 200)}</span>
                </button>
                <span className="small muted nowrap">{q.source}</span>
              </div>
              {open === q.id && (
                <div className="lib-body">
                  <Markdown text={q.stem} assets={assets} />
                  <ol type="A" className="lib-choices">
                    {q.choices.map((c) => (
                      <li key={c.label} className={c.label === q.answer ? "key" : ""}>
                        <Markdown inline text={c.text} assets={assets} />
                      </li>
                    ))}
                  </ol>
                  <h4>Explanation</h4>
                  <Markdown text={q.explanation || "_No explanation._"} assets={assets} />
                  {q.objective && (
                    <div className="objective">
                      <h4>Educational Objective</h4>
                      <Markdown text={q.objective} assets={assets} />
                    </div>
                  )}
                  <p className="tiny muted">
                    ID: {q.id} · Tags: {q.tags.join(", ") || "none"} · Imported {new Date(q.importedAt).toLocaleDateString()} from {q.importBatch || "unknown file"} · Attempts: {bank.qstate[q.id]?.attempts.length || 0}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {!shown.length && <p className="pad muted">No questions match.</p>}
      </div>
    </div>
  );
}
