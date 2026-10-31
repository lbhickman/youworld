import { useEffect, useState } from "react";
import type { LabRow } from "../types";
import { OFFICIAL_LABS_URL } from "../labValues";
import { openExternal } from "../storage";
import { IconPlus, IconTrash } from "./Icons";

export default function LabSettings({
  labs,
  updateLabs,
}: {
  labs: LabRow[];
  updateLabs: (rows: LabRow[] | null) => Promise<void>;
}) {
  const [rows, setRows] = useState<LabRow[]>(labs);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setRows(labs);
    setDirty(false);
  }, [labs]);

  const edit = (i: number, field: keyof LabRow, value: string) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
    setDirty(true);
  };

  return (
    <div className="page">
      <div className="row between center-y">
        <h1 className="page-title">Lab Values</h1>
        <div className="row gap">
          <button className="btn" onClick={() => openExternal(OFFICIAL_LABS_URL)}>Official USMLE materials ↗</button>
          <button
            className="btn"
            onClick={() => {
              if (confirm("Restore the default lab values? Your edits will be lost.")) void updateLabs(null);
            }}
          >
            Restore defaults
          </button>
          <button className="btn primary" disabled={!dirty} onClick={() => updateLabs(rows.filter((r) => r.name.trim()))}>
            Save changes
          </button>
        </div>
      </div>
      <p className="muted small">
        These reference ranges appear in the Lab Values panel during tests. Edit them to match your school's or exam's
        reference sheet. Rows with the same section name are grouped into one tab.
      </p>
      <div className="card flush">
        <table className="grid-table editable">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Section</th>
              <th style={{ width: "30%" }}>Test</th>
              <th>Reference range</th>
              <th>SI reference range</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {(["section", "name", "conventional", "si"] as const).map((f) => (
                  <td key={f}>
                    <input value={r[f]} onChange={(e) => edit(i, f, e.target.value)} />
                  </td>
                ))}
                <td>
                  <button
                    className="icon-btn"
                    title="Delete row"
                    onClick={() => {
                      setRows((x) => x.filter((_, j) => j !== i));
                      setDirty(true);
                    }}
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pad">
          <button
            className="btn"
            onClick={() => {
              setRows((x) => [...x, { section: x[x.length - 1]?.section || "Other", name: "", conventional: "", si: "" }]);
              setDirty(true);
            }}
          >
            <IconPlus size={16} /> Add row
          </button>
        </div>
      </div>
    </div>
  );
}
