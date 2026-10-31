import { useMemo, useState } from "react";
import { buildLlmInstructions } from "../llmInstructions";
import { saveTextFileAs } from "../storage";
import { Markdown } from "../markdown";

export default function InstructionsDialog({ onClose }: { onClose: () => void }) {
  const text = useMemo(buildLlmInstructions, []);
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-head">
          <h2>LLM Formatting Instructions</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="small muted">
          Give this file to an AI assistant along with your questions (paste text or attach a PDF) and ask it to
          convert them. Then import the resulting .md file.
        </p>
        <div className="row gap">
          <button className="btn primary" onClick={() => saveTextFileAs("YouWorld-LLM-Instructions.md", text, ["md"])}>
            Save as .md
          </button>
          <button className="btn" onClick={() => saveTextFileAs("YouWorld-LLM-Instructions.txt", text, ["txt"])}>
            Save as .txt
          </button>
          <button className="btn" onClick={copy}>{copied ? "Copied!" : "Copy to clipboard"}</button>
          <span className="spacer" />
          <label className="small"><input type="checkbox" checked={raw} onChange={(e) => setRaw(e.target.checked)} /> Show raw text</label>
        </div>
        <div className="modal-body doc">
          {raw ? <pre className="raw">{text}</pre> : <Markdown text={text} assets={{}} />}
        </div>
      </div>
    </div>
  );
}
