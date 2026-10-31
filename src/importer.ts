// Turns user-selected files (.md/.txt, images, folders, or a .zip) into bank questions.

import JSZip from "jszip";
import { fingerprint, hashString, parseQuestionFile, type ParseIssue } from "./parser";
import type { Bank, Question } from "./types";
import type { AssetMap } from "./storage";

const IMAGE_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

interface LooseFile {
  path: string; // relative path or name
  text?: string; // for question files
  bytes?: Uint8Array; // for images
}

export interface ImportPreview {
  fileNames: string[];
  newQuestions: Question[];
  duplicateCount: number;
  updatedQuestions: Question[]; // same id, content changed (explicit ids only)
  issues: (ParseIssue & { file: string })[];
  missingImages: string[];
  newAssets: AssetMap;
}

const extOf = (p: string) => (p.split(".").pop() || "").toLowerCase();
const baseName = (p: string) => p.split(/[\\/]/).pop()!.toLowerCase();

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

async function expandFiles(files: File[]): Promise<LooseFile[]> {
  const out: LooseFile[] = [];
  for (const f of files) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const ext = extOf(f.name);
    if (rel.split("/").some((part) => part.startsWith(".") || part === "__MACOSX")) continue;
    if (ext === "zip") {
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      const entries = Object.values(zip.files).filter((e) => !e.dir);
      for (const e of entries) {
        if (e.name.split("/").some((p) => p.startsWith(".") || p === "__MACOSX")) continue;
        const ex = extOf(e.name);
        if (ex === "md" || ex === "markdown" || ex === "txt") out.push({ path: e.name, text: await e.async("string") });
        else if (IMAGE_EXT[ex]) out.push({ path: e.name, bytes: await e.async("uint8array") });
      }
    } else if (ext === "md" || ext === "markdown" || ext === "txt") {
      out.push({ path: rel, text: await f.text() });
    } else if (IMAGE_EXT[ext]) {
      out.push({ path: rel, bytes: new Uint8Array(await f.arrayBuffer()) });
    }
  }
  return out;
}

const IMG_MD = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(\s+"[^"]*")?\s*\)/g;
const IMG_HTML = /(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi;

/** Replaces local image paths with asset:<hash> references, collecting the image data. */
function resolveImages(
  md: string,
  images: Map<string, LooseFile>,
  assets: AssetMap,
  missing: Set<string>,
): string {
  const resolve = (src: string): string => {
    if (/^(https?:|data:|asset:)/i.test(src)) return src;
    let decoded = src;
    try {
      decoded = decodeURIComponent(src);
    } catch {
      /* keep as is */
    }
    const file = images.get(decoded.toLowerCase().replace(/^\.\//, "")) || images.get(baseName(decoded));
    if (!file?.bytes) {
      missing.add(decoded);
      return src;
    }
    const ext = extOf(file.path);
    const dataUrl = bytesToDataUrl(file.bytes, IMAGE_EXT[ext] || "application/octet-stream");
    const key = hashString(dataUrl);
    assets[key] = dataUrl;
    return "asset:" + key;
  };
  return md
    .replace(IMG_MD, (_m, alt, src, title) => `![${alt}](${resolve(src)}${title || ""})`)
    .replace(IMG_HTML, (_m, pre, src, post) => pre + resolve(src) + post);
}

export async function buildImportPreview(files: File[], bank: Bank): Promise<ImportPreview> {
  const loose = await expandFiles(files);
  const images = new Map<string, LooseFile>();
  for (const f of loose.filter((x) => x.bytes)) {
    images.set(f.path.toLowerCase(), f);
    // Also index by path relative to any top folder and by bare file name.
    const parts = f.path.toLowerCase().split("/");
    for (let i = 1; i < parts.length; i++) images.set(parts.slice(i).join("/"), f);
    if (!images.has(baseName(f.path))) images.set(baseName(f.path), f);
  }

  const existing = new Map(bank.questions.map((q) => [q.id, q]));
  const seenThisImport = new Set<string>();
  const preview: ImportPreview = {
    fileNames: [],
    newQuestions: [],
    duplicateCount: 0,
    updatedQuestions: [],
    issues: [],
    missingImages: [],
    newAssets: {},
  };
  const missing = new Set<string>();
  const now = Date.now();

  for (const f of loose.filter((x) => x.text !== undefined)) {
    preview.fileNames.push(f.path);
    const { questions, issues } = parseQuestionFile(f.text!);
    preview.issues.push(...issues.map((i) => ({ ...i, file: f.path })));
    for (const pq of questions) {
      const id = fingerprint(pq);
      if (seenThisImport.has(id)) {
        preview.duplicateCount++;
        continue;
      }
      seenThisImport.add(id);
      const qMissing = new Set<string>();
      const fix = (s: string) => resolveImages(s, images, preview.newAssets, qMissing);
      const q: Question = {
        id,
        stem: fix(pq.stem),
        choices: pq.choices.map((c) => ({ label: c.label, text: fix(c.text) })),
        answer: pq.answer,
        explanation: fix(pq.explanation),
        objective: pq.objective ? fix(pq.objective) : undefined,
        tags: pq.tags,
        source: pq.source,
        importedAt: now,
        importBatch: f.path,
      };
      const old = existing.get(id);
      if (!old) {
        preview.newQuestions.push(q);
        qMissing.forEach((m) => missing.add(m));
      } else if (pq.explicitId && contentChanged(old, q)) {
        const merged = mergeEdited(old, q);
        preview.updatedQuestions.push(merged);
        const text = [merged.stem, merged.explanation, merged.objective || "", ...merged.choices.map((c) => c.text)].join("\n");
        qMissing.forEach((m) => text.includes(m) && missing.add(m));
      }
      else preview.duplicateCount++;
    }
  }
  preview.missingImages = Array.from(missing);
  return preview;
}

// Image paths are ignored when comparing, so re-importing a file without its
// images doesn't look like an edit.
const stripImgs = (s: string) => s.replace(IMG_MD, "![$1]()").replace(IMG_HTML, "$1$3");

function contentChanged(a: Question, b: Question) {
  const key = (q: Question) =>
    stripImgs(JSON.stringify([q.stem, q.choices, q.answer, q.explanation, q.objective || "", q.tags, q.source]));
  return key(a) !== key(b);
}

/** When an edited question is re-imported without its images, keep the images already stored. */
function carryImages(newText: string, oldText: string): string {
  const oldSrcs = Array.from(oldText.matchAll(IMG_MD)).map((m) => m[2]);
  let i = 0;
  return newText.replace(IMG_MD, (m, alt, src, title) => {
    const old = oldSrcs[i++];
    if (!/^(https?:|data:|asset:)/i.test(src) && old?.startsWith("asset:")) return `![${alt}](${old}${title || ""})`;
    return m;
  });
}

function mergeEdited(oldQ: Question, newQ: Question): Question {
  const byLabel = new Map(oldQ.choices.map((c) => [c.label, c.text]));
  return {
    ...newQ,
    importedAt: oldQ.importedAt,
    stem: carryImages(newQ.stem, oldQ.stem),
    explanation: carryImages(newQ.explanation, oldQ.explanation),
    objective: newQ.objective ? carryImages(newQ.objective, oldQ.objective || "") : undefined,
    choices: newQ.choices.map((c) => ({ ...c, text: carryImages(c.text, byLabel.get(c.label) || "") })),
  };
}

/** Applies a preview to a bank. Progress on existing questions is never touched. */
export function applyImport(bank: Bank, preview: ImportPreview, includeUpdates: boolean): Bank {
  let questions = [...bank.questions, ...preview.newQuestions];
  if (includeUpdates && preview.updatedQuestions.length) {
    const upd = new Map(preview.updatedQuestions.map((q) => [q.id, q]));
    questions = questions.map((q) => upd.get(q.id) || q);
  }
  return { ...bank, questions };
}
