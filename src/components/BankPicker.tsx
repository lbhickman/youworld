import { useRef, useState } from "react";
import type { Bank, BankMeta } from "../types";
import * as store from "../storage";
import { buildLlmInstructions } from "../llmInstructions";
import { IconDoc, IconPlus, IconTrash, IconUpload } from "./Icons";
import InstructionsDialog from "./InstructionsDialog";

interface BackupFile {
  format: "youworld-backup";
  version: 1;
  bank: Bank;
  assets: store.AssetMap;
}

export default function BankPicker({
  index,
  setIndex,
  onOpen,
}: {
  index: BankMeta[];
  setIndex: (l: BankMeta[]) => void;
  onOpen: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  const createBank = async () => {
    const name = newName.trim() || `Question Bank ${index.length + 1}`;
    const bank: Bank = {
      id: store.uid(),
      name,
      createdAt: Date.now(),
      questions: [],
      qstate: {},
      tests: [],
      nextTestNumber: 1,
    };
    await store.saveBank(bank);
    const meta: BankMeta = { id: bank.id, name, createdAt: bank.createdAt, updatedAt: Date.now(), questionCount: 0 };
    const list = [...index, meta];
    await store.saveBankIndex(list);
    setIndex(list);
    setNewName("");
    onOpen(bank.id);
  };

  const rename = async (m: BankMeta) => {
    const name = prompt("Rename question bank:", m.name)?.trim();
    if (!name) return;
    const bank = await store.loadBank(m.id);
    if (bank) await store.saveBank({ ...bank, name });
    const list = index.map((x) => (x.id === m.id ? { ...x, name } : x));
    await store.saveBankIndex(list);
    setIndex(list);
  };

  const remove = async (m: BankMeta) => {
    if (!confirm(`Delete "${m.name}" and all of its questions and progress? This cannot be undone.\n\nTip: use Backup first if you might want it later.`)) return;
    await store.deleteBankFiles(m.id);
    const list = index.filter((x) => x.id !== m.id);
    await store.saveBankIndex(list);
    setIndex(list);
  };

  const backup = async (m: BankMeta) => {
    const bank = await store.loadBank(m.id);
    if (!bank) return;
    const data: BackupFile = { format: "youworld-backup", version: 1, bank, assets: await store.loadAssets(m.id) };
    const safe = m.name.replace(/[^\w\- ]+/g, "").trim() || "bank";
    await store.saveTextFileAs(`${safe}.youworld.json`, JSON.stringify(data), ["json"]);
  };

  const restore = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as BackupFile;
      if (data.format !== "youworld-backup" || !data.bank?.questions) throw new Error("Not a YouWorld backup file.");
      let bank = data.bank;
      if (index.some((m) => m.id === bank.id)) {
        if (!confirm(`A bank with this backup's identity ("${bank.name}") already exists. Restore it as a separate copy?`)) return;
        bank = { ...bank, id: store.uid(), name: bank.name + " (restored)" };
      }
      await store.saveBank(bank);
      await store.saveAssets(bank.id, data.assets || {});
      const list = [
        ...index,
        { id: bank.id, name: bank.name, createdAt: bank.createdAt, updatedAt: Date.now(), questionCount: bank.questions.length },
      ];
      await store.saveBankIndex(list);
      setIndex(list);
    } catch (e) {
      alert("Could not restore backup: " + (e as Error).message);
    }
  };

  return (
    <div className="picker">
      <header className="picker-head">
        <img src="/icon.png" alt="" className="picker-logo" />
        <div>
          <h1>YouWorld</h1>
          <p>Practice tests built from your own questions.</p>
        </div>
      </header>

      <main className="picker-main">
        <section className="card">
          <h2>Select a question bank</h2>
          {index.length === 0 && <p className="muted">No banks yet. Create your first one below.</p>}
          <ul className="bank-list">
            {[...index]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((m) => (
                <li key={m.id}>
                  <button className="bank-open" onClick={() => onOpen(m.id)}>
                    <span className="bank-name">{m.name}</span>
                    <span className="muted small">
                      {m.questionCount} question{m.questionCount === 1 ? "" : "s"} · last used{" "}
                      {new Date(m.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <div className="bank-actions">
                    <button className="link" onClick={() => rename(m)}>Rename</button>
                    <button className="link" onClick={() => backup(m)}>Backup</button>
                    <button className="link danger" onClick={() => remove(m)} title="Delete bank">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </li>
              ))}
          </ul>

          <form
            className="new-bank"
            onSubmit={(e) => {
              e.preventDefault();
              void createBank();
            }}
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New bank name (e.g. Step 1, Neuro Block, EEG Boards)"
            />
            <button className="btn primary" type="submit">
              <IconPlus size={16} /> Create bank
            </button>
          </form>
        </section>

        <section className="picker-side">
          <div className="card">
            <h3><IconDoc size={18} /> Turn your questions into a bank</h3>
            <p className="small">
              Save the formatting guide, give it to an AI assistant (ChatGPT, Claude, Gemini…) along with your
              practice exam, notes, or PDF, and import the .md file it produces.
            </p>
            <div className="row gap">
              <button className="btn" onClick={() => setShowInstructions(true)}>View guide</button>
              <button
                className="btn"
                onClick={() => store.saveTextFileAs("YouWorld-LLM-Instructions.md", buildLlmInstructions(), ["md", "txt"])}
              >
                Save as .md
              </button>
            </div>
          </div>
          <div className="card">
            <h3><IconUpload size={18} /> Restore a backup</h3>
            <p className="small">Load a bank (with progress) saved with "Backup", for example from another computer.</p>
            <button className="btn" onClick={() => restoreRef.current?.click()}>Choose backup file…</button>
            <input
              ref={restoreRef}
              type="file"
              accept=".json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restore(f);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </main>
      <footer className="picker-foot muted small">YouWorld is free, open-source software (MIT License).</footer>
      {showInstructions && <InstructionsDialog onClose={() => setShowInstructions(false)} />}
    </div>
  );
}
