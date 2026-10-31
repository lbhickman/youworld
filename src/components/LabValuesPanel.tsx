import { createContext, useContext, useMemo, useState } from "react";
import type { LabRow } from "../types";
import { DEFAULT_LABS, OFFICIAL_LABS_URL } from "../labValues";
import { openExternal } from "../storage";

export const LabsContext = createContext<LabRow[]>(DEFAULT_LABS);

export default function LabValuesPanel({ onClose }: { onClose: () => void }) {
  const labs = useContext(LabsContext);
  const sections = useMemo(() => Array.from(new Set(labs.map((r) => r.section))), [labs]);
  const [tab, setTab] = useState(sections[0] || "");
  const [query, setQuery] = useState("");
  const [si, setSi] = useState(false);

  const rows = query.trim()
    ? labs.filter((r) => (r.name + " " + r.section).toLowerCase().includes(query.trim().toLowerCase()))
    : labs.filter((r) => r.section === tab);

  return (
    <aside className="labs-panel">
      <div className="labs-head">
        <strong>Lab Values</strong>
        <button className="icon-btn light" onClick={onClose} aria-label="Close lab values">×</button>
      </div>
      <div className="labs-tools">
        <input placeholder="Search labs…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="small check">
          <input type="checkbox" checked={si} onChange={(e) => setSi(e.target.checked)} /> SI units
        </label>
      </div>
      {!query.trim() && (
        <div className="labs-tabs">
          {sections.map((s) => (
            <button key={s} className={s === tab ? "on" : ""} onClick={() => setTab(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="labs-table-wrap">
        <table className="labs-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>{si ? "SI reference range" : "Reference range"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.section + r.name + i}>
                <td>
                  {r.name}
                  {query.trim() && <div className="tiny muted">{r.section}</div>}
                </td>
                <td>{si ? r.si : r.conventional}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={2} className="muted">No matching labs.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="labs-foot tiny">
        Typical adult ranges; labs vary. Editable under Lab Values in the main menu.{" "}
        <button className="link tiny" onClick={() => openExternal(OFFICIAL_LABS_URL)}>
          Official USMLE materials
        </button>
      </div>
    </aside>
  );
}
