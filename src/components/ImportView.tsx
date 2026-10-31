import { useRef, useState } from "react";
import type { ShellProps } from "./BankShell";
import type { AssetMap } from "../storage";
import { saveTextFileAs } from "../storage";
import { applyImport, buildImportPreview, type ImportPreview } from "../importer";
import { SAMPLE_QUESTION } from "../llmInstructions";
import { Markdown } from "../markdown";
import { IconUpload } from "./Icons";

export default function ImportView({
  bank,
  updateBank,
  addAssets,
  onDone,
  showGuide,
}: ShellProps & { addAssets: (a: AssetMap) => Promise<void>; onDone: () => void; showGuide: () => void }) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [applyUpdates, setApplyUpdates] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const handle = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const p = await buildImportPreview(files, bank);
      if (!p.fileNames.length) throw new Error("No .md or .txt question file was found in what you selected.");
      setPreview(p);
    } catch (e) {
      setError((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  // Folder drops: walk directory entries so images inside subfolders are included.
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const items = Array.from(e.dataTransfer.items || []);
    const entries = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    if (entries.some((en) => en.isDirectory)) {
      const out: File[] = [];
      const walk = async (en: FileSystemEntry, path: string): Promise<void> => {
        if (en.isFile) {
          const f = await new Promise<File>((res, rej) => (en as FileSystemFileEntry).file(res, rej));
          out.push(new File([f], path + f.name, { type: f.type }));
        } else if (en.isDirectory) {
          const reader = (en as FileSystemDirectoryEntry).createReader();
          let batch: FileSystemEntry[] = [];
          do {
            batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
            for (const child of batch) await walk(child, path + en.name + "/");
          } while (batch.length);
        }
      };
      for (const en of entries) await walk(en, "");
      // Preserve folder structure in the name for image path matching.
      void handle(out.map((f) => Object.defineProperty(f, "webkitRelativePath", { value: f.name })));
    } else {
      void handle(Array.from(e.dataTransfer.files));
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    await addAssets(preview.newAssets);
    updateBank((b) => applyImport(b, preview, applyUpdates), true);
    const n = preview.newQuestions.length;
    const u = applyUpdates ? preview.updatedQuestions.length : 0;
    setDone(`Imported ${n} new question${n === 1 ? "" : "s"}${u ? ` and updated ${u}` : ""}.`);
    setPreview(null);
  };

  return (
    <div className="page">
      <h1 className="page-title">Import Questions</h1>
      <p className="muted">
        Add questions from a YouWorld-formatted <code>.md</code> file. Include images by selecting them together with the
        file, choosing the whole folder, or importing a <code>.zip</code>. Re-importing a file only adds questions that
        are new, so your progress on existing questions is kept.
      </p>

      {done && (
        <div className="notice ok">
          {done} <button className="link" onClick={onDone}>Create a test →</button>
        </div>
      )}
      {error && <div className="notice bad">{error}</div>}

      {!preview && (
        <div
          className={"dropzone" + (over ? " over" : "")}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <IconUpload size={40} />
          <p><strong>Drag a .md file, a folder, or a .zip here</strong></p>
          <p className="muted small">or</p>
          <div className="row gap center">
            <button className="btn primary" disabled={busy} onClick={() => filesRef.current?.click()}>Choose files…</button>
            <button className="btn" disabled={busy} onClick={() => folderRef.current?.click()}>Choose folder…</button>
          </div>
          {busy && <p className="muted">Reading files…</p>}
          <input
            ref={filesRef}
            type="file"
            multiple
            hidden
            accept=".md,.markdown,.txt,.zip,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp"
            onChange={(e) => {
              void handle(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
          <input
            ref={folderRef}
            type="file"
            hidden
            // @ts-expect-error non-standard attribute supported by WebKit/Chromium
            webkitdirectory=""
            onChange={(e) => {
              void handle(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </div>
      )}

      {preview && (
        <div className="card">
          <h3 className="section-title">Ready to import</h3>
          <p className="small muted">From: {preview.fileNames.join(", ")}</p>
          <div className="row gap wrap kpis">
            <div><strong>{preview.newQuestions.length}</strong><span>New questions</span></div>
            <div><strong>{preview.duplicateCount}</strong><span>Already in bank (skipped)</span></div>
            <div><strong>{preview.updatedQuestions.length}</strong><span>Edited versions found</span></div>
            <div><strong>{Object.keys(preview.newAssets).length}</strong><span>Images</span></div>
            <div><strong className={preview.issues.length ? "bad-text" : ""}>{preview.issues.length}</strong><span>Problems</span></div>
          </div>

          {preview.updatedQuestions.length > 0 && (
            <label className="check">
              <input type="checkbox" checked={applyUpdates} onChange={(e) => setApplyUpdates(e.target.checked)} />
              Replace the text of {preview.updatedQuestions.length} question(s) whose ID matches but content changed (progress is kept)
            </label>
          )}

          {preview.missingImages.length > 0 && (
            <div className="notice warn">
              <strong>Images not found:</strong> {preview.missingImages.join(", ")}
              <div className="small">Select the image files along with the .md file (or import the folder/.zip) to include them. You can also import now and re-import later with images using question IDs.</div>
            </div>
          )}

          {preview.issues.length > 0 && (
            <div className="notice bad">
              <strong>These questions could not be read and will be skipped:</strong>
              <ul className="issues">
                {preview.issues.map((i, k) => (
                  <li key={k}>
                    {i.blockNumber ? `Question #${i.blockNumber}` : "File"} in {i.file}: {i.message}
                    <div className="tiny muted">{i.preview}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.newQuestions.length > 0 && (
            <details className="preview-list">
              <summary>Preview first question</summary>
              <div className="preview-q">
                <Markdown text={preview.newQuestions[0].stem} assets={{ ...preview.newAssets }} />
                <ol type="A">
                  {preview.newQuestions[0].choices.map((c) => (
                    <li key={c.label}>
                      <Markdown inline text={c.text} assets={preview.newAssets} />
                    </li>
                  ))}
                </ol>
                <p className="small">Answer: {preview.newQuestions[0].answer} · Tags: {preview.newQuestions[0].tags.join(", ") || "none"} · Source: {preview.newQuestions[0].source || "none"}</p>
              </div>
            </details>
          )}

          <div className="row gap end">
            <button className="btn" onClick={() => setPreview(null)}>Cancel</button>
            <button
              className="btn primary"
              disabled={!preview.newQuestions.length && !(applyUpdates && preview.updatedQuestions.length)}
              onClick={confirmImport}
            >
              Import {preview.newQuestions.length} question{preview.newQuestions.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <h3 className="section-title">Need questions in this format?</h3>
          <p className="small">
            Open the LLM Formatting Guide, save it, and give it to any AI assistant with your practice exam or notes. Ask it
            to output a YouWorld .md file.
          </p>
          <button className="btn" onClick={showGuide}>Open LLM Formatting Guide</button>
        </div>
        <div className="card">
          <h3 className="section-title">Sample file</h3>
          <p className="small">A one-question example showing every supported section.</p>
          <button className="btn" onClick={() => saveTextFileAs("youworld-sample.md", SAMPLE_QUESTION, ["md"])}>Save sample .md</button>
        </div>
      </div>
    </div>
  );
}
